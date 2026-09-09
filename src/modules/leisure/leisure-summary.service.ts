import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/types/authenticated-user.type';
import { LeisureSummary } from './types/leisure-summary.type';
import {
  LEISURE_SUMMARY_REPOSITORY,
  LeisureSummaryRepository,
} from './types/leisure-summary-repository.interface';

@Injectable()
export class LeisureSummaryService {
  constructor(
    @Inject(LEISURE_SUMMARY_REPOSITORY)
    private readonly repository: LeisureSummaryRepository,
  ) {}

  getSummary(user: AuthenticatedUser, date: string): Promise<LeisureSummary> {
    return this.repository.getSummary(user.accessToken, date);
  }
}
