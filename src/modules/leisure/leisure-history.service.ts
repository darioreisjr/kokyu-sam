import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/types/authenticated-user.type';
import {
  LeisureHistoryFilter,
  LeisureLogEntry,
  LeisureLogEntryCreateInput,
} from './types/leisure-log-entry.type';
import {
  LEISURE_HISTORY_REPOSITORY,
  LeisureHistoryRepository,
} from './types/leisure-history-repository.interface';

@Injectable()
export class LeisureHistoryService {
  constructor(
    @Inject(LEISURE_HISTORY_REPOSITORY)
    private readonly repository: LeisureHistoryRepository,
  ) {}

  findAll(user: AuthenticatedUser, filter: LeisureHistoryFilter): Promise<LeisureLogEntry[]> {
    return this.repository.findAll(user.accessToken, filter);
  }

  create(user: AuthenticatedUser, input: LeisureLogEntryCreateInput): Promise<LeisureLogEntry> {
    return this.repository.create(user.accessToken, user.id, input);
  }
}
