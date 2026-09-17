import type { User } from '../../generated/prisma/client';
import type { UserRepository } from '../repositories/user.repository';

export class ChildService {
  constructor(private readonly users: UserRepository) {}

  listForParent(parentId: string): Promise<User[]> {
    return this.users.findChildren(parentId);
  }

  findForParent(parentId: string, childId: string): Promise<User | null> {
    return this.users.findChild(parentId, childId);
  }
}
