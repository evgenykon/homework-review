import type { GameAttemptStatus, User } from '../../generated/prisma/client';
import type {
  AttemptWithAnswers,
  GameRepository,
  GameWithWords,
  WordInput,
} from '../repositories/game.repository';
import type { ChatService } from './chat.service';
import type { RealtimeService } from './realtime.service';

export type GameMeta = {
  id: string;
  name: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  attempt: { id: string; taskType: number; status: GameAttemptStatus } | null;
};

export type GameTask = {
  attempt: { id: string; taskType: number; status: GameAttemptStatus };
  words: { id: string; word: string; answer?: string }[];
  options: string[];
  answers: { wordId: string; value: string; correct?: boolean }[];
};

export type SubmitInput = { wordId: string; value: string };

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }

  return result;
}

function maskWord(word: string): string {
  const chars = word.split('');

  if (chars.length <= 1) {
    return word;
  }

  const maskable = chars
    .map((_, index) => index)
    .filter((index) => index > 0);

  const count = Math.max(1, Math.floor(maskable.length * 0.4));
  const chosen = shuffle(maskable).slice(0, count);

  for (const index of chosen) {
    chars[index] = '_';
  }

  return chars.join('');
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export class GameService {
  constructor(
    private readonly games: GameRepository,
    private readonly realtime: RealtimeService,
    private readonly chat: ChatService,
  ) {}

  byId(id: string): Promise<GameWithWords | null> {
    return this.games.findById(id);
  }

  getDetail(game: GameWithWords): { id: string; name: string; words: { id: string; word: string; answer: string }[] } {
    return {
      id: game.id,
      name: game.name,
      words: game.words.map((word) => ({
        id: word.id,
        word: word.word,
        answer: word.answer,
      })),
    };
  }

  async list(sessionId: string): Promise<GameMeta[]> {
    const games = await this.games.findBySession(sessionId);

    return Promise.all(
      games.map(async (game) => {
        const attempt = await this.games.findLatestAttempt(game.id);

        return {
          id: game.id,
          name: game.name,
          wordCount: game.words.length,
          createdAt: game.createdAt.toISOString(),
          updatedAt: game.updatedAt.toISOString(),
          attempt: attempt ? { id: attempt.id, taskType: attempt.taskType, status: attempt.status } : null,
        };
      }),
    );
  }

  async create(sessionId: string, user: User, name: string, words: WordInput[]): Promise<GameMeta> {
    const game = await this.games.create(sessionId, name, words);
    this.realtime.broadcastToSession(sessionId, { type: 'game:changed', gameId: game.id });
    return this.toMeta(game);
  }

  async update(game: GameWithWords, name: string, words: WordInput[]): Promise<GameMeta> {
    const updated = await this.games.update(game.id, name, words);

    // При изменении содержимого игры сбрасываем все предыдущие попытки ребёнка.
    await this.games.deleteAttempts(game.id);
    this.realtime.broadcastToSession(game.sessionId, { type: 'game:changed', gameId: game.id });

    return this.toMeta(updated);
  }

  async remove(game: GameWithWords): Promise<void> {
    await this.games.delete(game.id);
    this.realtime.broadcastToSession(game.sessionId, { type: 'game:changed', gameId: game.id });
  }

  async startAttempt(game: GameWithWords): Promise<GameTask | null> {
    const latest = await this.games.findLatestAttempt(game.id);

    if (latest && latest.status !== 'CHECKED') {
      return this.buildTask(game, latest);
    }

    if (game.words.length === 0) {
      return null;
    }

    const taskType = Math.floor(Math.random() * 5) + 1;
    const attempt = await this.games.createAttempt(game.id, taskType);
    this.realtime.broadcastToSession(game.sessionId, { type: 'game:changed', gameId: game.id });

    return this.buildTask(game, attempt);
  }

  async getAttempt(game: GameWithWords): Promise<GameTask | null> {
    const attempt = await this.games.findLatestAttempt(game.id);
    return attempt ? this.buildTask(game, attempt) : null;
  }

  async submitAttempt(
    game: GameWithWords,
    user: User,
    answers: SubmitInput[],
  ): Promise<GameTask | null> {
    const attempt = await this.games.findLatestAttempt(game.id);

    if (!attempt || attempt.status !== 'ACTIVE') {
      return null;
    }

    const validWordIds = new Set(game.words.map((word) => word.id));
    const filtered = answers.filter((answer) => validWordIds.has(answer.wordId));

    await this.games.saveAnswers(attempt.id, filtered);
    await this.games.setAttemptStatus(attempt.id, 'SUBMITTED');
    await this.chat.createMessage(
      game.sessionId,
      user.id,
      `Ответ в игре «${game.name}» отправлен на проверку`,
      true,
    );
    this.realtime.broadcastToSession(game.sessionId, { type: 'game:changed', gameId: game.id });

    const updated = await this.games.findLatestAttempt(game.id);
    return updated ? this.buildTask(game, updated) : null;
  }

  async checkAttempt(game: GameWithWords): Promise<GameTask | null> {
    const attempt = await this.games.findLatestAttempt(game.id);

    if (!attempt || attempt.status !== 'SUBMITTED') {
      return null;
    }

    const byWord = new Map(game.words.map((word) => [word.id, word.answer]));
    const results = attempt.answers.map((answer) => ({
      wordId: answer.wordId,
      correct: normalize(answer.value) === normalize(byWord.get(answer.wordId) ?? ''),
    }));

    await this.games.markAnswersCorrect(attempt.id, results);
    await this.games.setAttemptStatus(attempt.id, 'CHECKED');
    this.realtime.broadcastToSession(game.sessionId, { type: 'game:changed', gameId: game.id });

    const updated = await this.games.findLatestAttempt(game.id);
    return updated ? this.buildTask(game, updated) : null;
  }

  async restart(game: GameWithWords): Promise<GameTask | null> {
    const latest = await this.games.findLatestAttempt(game.id);

    if (latest) {
      await this.games.deleteAttempt(latest.id);
    }

    return this.startAttempt(game);
  }

  private buildTask(game: GameWithWords, attempt: AttemptWithAnswers): GameTask {
    return {
      attempt: { id: attempt.id, taskType: attempt.taskType, status: attempt.status },
      words: game.words.map((word) => ({
        id: word.id,
        word: attempt.taskType === 2 ? maskWord(word.word) : word.word,
        answer: attempt.status === 'CHECKED' ? word.answer : undefined,
      })),
      options:
        attempt.taskType >= 3
          ? shuffle(game.words.map((word) => word.answer))
          : [],
      answers: attempt.answers.map((answer) => ({
        wordId: answer.wordId,
        value: answer.value,
        correct: attempt.status === 'CHECKED' ? answer.correct : undefined,
      })),
    };
  }

  private toMeta(game: GameWithWords): GameMeta {
    return {
      id: game.id,
      name: game.name,
      wordCount: game.words.length,
      createdAt: game.createdAt.toISOString(),
      updatedAt: game.updatedAt.toISOString(),
      attempt: null,
    };
  }
}
