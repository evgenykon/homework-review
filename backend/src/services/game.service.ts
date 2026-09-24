import type { GameAttemptStatus, User } from '../../generated/prisma/client';
import type {
  AttemptWithAnswers,
  GameRepository,
  GameWithWords,
  WordInput,
} from '../repositories/game.repository';
import type { ChatService } from './chat.service';
import type { ChatSessionService } from './chat-session.service';
import type { RealtimeService } from './realtime.service';

export type GameMeta = {
  id: string;
  name: string;
  wordCount: number;
  round: number;
  attemptsLeft: number;
  lastAttemptId: string | null;
  createdAt: string;
  updatedAt: string;
  attempt: { id: string; taskType: number; status: GameAttemptStatus } | null;
};

export type GameTask = {
  attempt: { id: string; taskType: number; status: GameAttemptStatus };
  words: { id: string; word: string; answer?: string; hint?: string }[];
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
    private readonly sessions: ChatSessionService,
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
        const attempt = await this.games.findLatestAttempt(game.id, game.round);
        const attemptsUsed = await this.games.countAttemptsByRound(game.id, game.round);
        const lastAttemptId = await this.games.findLastAttemptId(game.id);

        return {
          id: game.id,
          name: game.name,
          wordCount: game.words.length,
          round: game.round,
          attemptsLeft: Math.max(0, game.maxAttempts - attemptsUsed),
          lastAttemptId,
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

  async startAttempt(game: GameWithWords, user: User): Promise<GameTask | null> {
    const latest = await this.games.findLatestAttempt(game.id, game.round);

    if (latest && latest.status !== 'CHECKED') {
      return this.buildTask(game, latest);
    }

    if (game.words.length === 0) {
      return null;
    }

    // Ребёнок может рестартить сам, пока не закончатся варианты (попытки) раунда.
    const attemptsUsed = await this.games.countAttemptsByRound(game.id, game.round);

    if (attemptsUsed >= game.maxAttempts) {
      return null;
    }

    const taskType = this.pickTaskType(game.lastTaskType);
    const attempt = await this.games.createAttempt(game.id, taskType, game.round);
    await this.games.updateLastTaskType(game.id, taskType);

    if (attemptsUsed === 0) {
      await this.chat.createMessage(game.sessionId, user.id, `Ребёнок начал игру «${game.name}»`, true);
    }

    this.realtime.broadcastToSession(game.sessionId, { type: 'game:changed', gameId: game.id });

    return this.buildTask(game, attempt);
  }

  async getAttempt(game: GameWithWords): Promise<GameTask | null> {
    const attempt = await this.games.findLatestAttempt(game.id, game.round);
    return attempt ? this.buildTask(game, attempt) : null;
  }

  async getAttemptById(game: GameWithWords, attemptId: string): Promise<GameTask | null> {
    const attempt = await this.games.findAttemptById(attemptId);

    if (!attempt || attempt.gameId !== game.id) {
      return null;
    }

    return this.buildTask(game, attempt);
  }

  async submitAttempt(
    game: GameWithWords,
    user: User,
    answers: SubmitInput[],
  ): Promise<GameTask | null> {
    const attempt = await this.games.findLatestAttempt(game.id, game.round);

    if (!attempt || attempt.status !== 'ACTIVE') {
      return null;
    }

    const validWordIds = new Set(game.words.map((word) => word.id));
    const filtered = answers.filter((answer) => validWordIds.has(answer.wordId));

    await this.games.saveAnswers(attempt.id, filtered);

    // Проверка происходит автоматически сразу после отправки.
    const byWord = new Map(game.words.map((word) => [word.id, word.answer]));
    const results = filtered.map((answer) => ({
      wordId: answer.wordId,
      correct: normalize(answer.value) === normalize(byWord.get(answer.wordId) ?? ''),
    }));
    await this.games.markAnswersCorrect(attempt.id, results);
    await this.games.setAttemptStatus(attempt.id, 'CHECKED');

    const correct = results.filter((result) => result.correct).length;
    await this.sessions.setStatus(game.sessionId, 'APPROVED');

    // Каждое решение публикуется в чате как кликабельная ссылка на результат.
    await this.chat.createMessage(
      game.sessionId,
      user.id,
      `Ребёнок отправил ответ в игре «${game.name}» — результат: ${correct} из ${results.length}`,
      true,
      JSON.stringify({ type: 'game-result', gameId: game.id, attemptId: attempt.id }),
    );
    this.realtime.broadcastToSession(game.sessionId, { type: 'game:changed', gameId: game.id });

    const updated = await this.games.findLatestAttempt(game.id, game.round);
    return updated ? this.buildTask(game, updated) : null;
  }

  // Родитель перезапускает игру: начинается новый раунд. Старые попытки
  // остаются (ссылки с результатами открываются), но для ребёнка не считаются.
  async restart(game: GameWithWords, user: User): Promise<void> {
    await this.games.incrementRound(game.id);
    await this.sessions.setStatus(game.sessionId, 'PENDING');
    await this.chat.createMessage(game.sessionId, user.id, `Игра «${game.name}» перезапущена`, true);
    this.realtime.broadcastToSession(game.sessionId, { type: 'game:changed', gameId: game.id });
  }

  private pickTaskType(exclude: number | null | undefined): number {
    const candidates = [1, 2, 3, 4, 5].filter((type) => type !== exclude);
    return candidates[Math.floor(Math.random() * candidates.length)]!;
  }

  private buildTask(game: GameWithWords, attempt: AttemptWithAnswers): GameTask {
    return {
      attempt: { id: attempt.id, taskType: attempt.taskType, status: attempt.status },
      words: game.words.map((word) => ({
        id: word.id,
        word: word.word,
        answer: attempt.status === 'CHECKED' ? word.answer : undefined,
        hint: attempt.taskType === 2 ? maskWord(word.answer) : undefined,
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
      round: game.round,
      attemptsLeft: game.maxAttempts,
      lastAttemptId: null,
      createdAt: game.createdAt.toISOString(),
      updatedAt: game.updatedAt.toISOString(),
      attempt: null,
    };
  }
}
