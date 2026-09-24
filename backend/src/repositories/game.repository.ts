import type {
  Game,
  GameAnswer,
  GameAttempt,
  GameWord,
  PrismaClient,
} from '../../generated/prisma/client';

export type GameWithWords = Game & { words: GameWord[] };
export type AttemptWithAnswers = GameAttempt & {
  answers: (GameAnswer & { word: GameWord })[];
};

export type WordInput = {
  word: string;
  answer: string;
};

export class GameRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findBySession(sessionId: string): Promise<GameWithWords[]> {
    return this.prisma.game.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      include: { words: { orderBy: { position: 'asc' } } },
    });
  }

  findById(id: string): Promise<GameWithWords | null> {
    return this.prisma.game.findUnique({
      where: { id },
      include: { words: { orderBy: { position: 'asc' } } },
    });
  }

  create(sessionId: string, name: string, words: WordInput[]): Promise<GameWithWords> {
    return this.prisma.game.create({
      data: {
        sessionId,
        name,
        words: {
          create: words.map((item, position) => ({
            word: item.word.trim(),
            answer: item.answer.trim(),
            position,
          })),
        },
      },
      include: { words: { orderBy: { position: 'asc' } } },
    });
  }

  async update(id: string, name: string, words: WordInput[]): Promise<GameWithWords> {
    await this.prisma.gameWord.deleteMany({ where: { gameId: id } });

    return this.prisma.game.update({
      where: { id },
      data: {
        name,
        words: {
          create: words.map((item, position) => ({
            word: item.word.trim(),
            answer: item.answer.trim(),
            position,
          })),
        },
      },
      include: { words: { orderBy: { position: 'asc' } } },
    });
  }

  delete(id: string): Promise<Game> {
    return this.prisma.game.delete({ where: { id } });
  }

  findLatestAttempt(gameId: string): Promise<AttemptWithAnswers | null> {
    return this.prisma.gameAttempt.findFirst({
      where: { gameId },
      orderBy: { createdAt: 'desc' },
      include: { answers: { include: { word: true } } },
    });
  }

  createAttempt(gameId: string, taskType: number): Promise<AttemptWithAnswers> {
    return this.prisma.gameAttempt.create({
      data: { gameId, taskType },
      include: { answers: { include: { word: true } } },
    });
  }

  async saveAnswers(attemptId: string, answers: { wordId: string; value: string }[]): Promise<void> {
    await this.prisma.gameAnswer.deleteMany({ where: { attemptId } });

    if (answers.length > 0) {
      await this.prisma.gameAnswer.createMany({
        data: answers.map((answer) => ({
          attemptId,
          wordId: answer.wordId,
          value: answer.value.trim(),
        })),
      });
    }
  }

  async setAttemptStatus(attemptId: string, status: 'ACTIVE' | 'SUBMITTED' | 'CHECKED'): Promise<void> {
    await this.prisma.gameAttempt.update({ where: { id: attemptId }, data: { status } });
  }

  async markAnswersCorrect(
    attemptId: string,
    results: { wordId: string; correct: boolean }[],
  ): Promise<void> {
    for (const result of results) {
      await this.prisma.gameAnswer.updateMany({
        where: { attemptId, wordId: result.wordId },
        data: { correct: result.correct },
      });
    }
  }

  async deleteAttempts(gameId: string): Promise<void> {
    await this.prisma.gameAttempt.deleteMany({ where: { gameId } });
  }
}
