import type { PrismaClient, User, UserType } from '../../generated/prisma/client';

export type CreateUserData = {
  name: string;
  type: UserType;
  photoUrl?: string | null;
  age?: number | null;
  parentId?: string | null;
};

export type UpdateUserData = Partial<CreateUserData>;

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByIdWithRelations(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { parent: true, children: true },
    });
  }

  findChildren(parentId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { parentId, type: 'child' },
      orderBy: { createdAt: 'asc' },
    });
  }

  findChild(parentId: string, childId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id: childId, parentId, type: 'child' },
    });
  }

  async unlinkChild(parentId: string, childId: string): Promise<boolean> {
    const result = await this.prisma.user.updateMany({
      where: { id: childId, parentId, type: 'child' },
      data: { parentId: null },
    });

    return result.count > 0;
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }
}
