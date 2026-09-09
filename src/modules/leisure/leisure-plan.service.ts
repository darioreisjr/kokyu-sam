import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/types/authenticated-user.type';
import { LeisurePlanEntryNotFoundError } from '../../common/errors/app.error';
import {
  LeisurePlanEntry,
  LeisurePlanEntryCreateInput,
  LeisurePlanEntryUpdateInput,
} from './types/leisure-plan-entry.type';
import {
  LEISURE_PLAN_REPOSITORY,
  LeisurePlanRepository,
} from './types/leisure-plan-repository.interface';

@Injectable()
export class LeisurePlanService {
  constructor(
    @Inject(LEISURE_PLAN_REPOSITORY)
    private readonly repository: LeisurePlanRepository,
  ) {}

  findByDateRange(
    user: AuthenticatedUser,
    startDate: string,
    endDate: string,
  ): Promise<LeisurePlanEntry[]> {
    return this.repository.findByDateRange(user.accessToken, startDate, endDate);
  }

  create(user: AuthenticatedUser, input: LeisurePlanEntryCreateInput): Promise<LeisurePlanEntry> {
    return this.repository.create(user.accessToken, user.id, input);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    patch: LeisurePlanEntryUpdateInput,
  ): Promise<LeisurePlanEntry> {
    const updated = await this.repository.update(user.accessToken, id, patch);
    if (!updated) throw new LeisurePlanEntryNotFoundError();
    return updated;
  }

  async delete(user: AuthenticatedUser, id: string): Promise<void> {
    await this.repository.delete(user.accessToken, id);
  }

  complete(user: AuthenticatedUser, id: string): Promise<LeisurePlanEntry> {
    return this.update(user, id, { completed: true });
  }
}
