import { Module } from '@nestjs/common';
import { LeisureItemsController } from './leisure-items.controller';
import { LeisureItemsService } from './leisure-items.service';
import { SupabaseLeisureItemsRepository } from './leisure-items.repository';
import { LEISURE_ITEMS_REPOSITORY } from './types/leisure-items-repository.interface';
import { LeisurePlanController } from './leisure-plan.controller';
import { LeisurePlanService } from './leisure-plan.service';
import { SupabaseLeisurePlanRepository } from './leisure-plan.repository';
import { LEISURE_PLAN_REPOSITORY } from './types/leisure-plan-repository.interface';
import { LeisureHistoryController } from './leisure-history.controller';
import { LeisureHistoryService } from './leisure-history.service';
import { SupabaseLeisureHistoryRepository } from './leisure-history.repository';
import { LEISURE_HISTORY_REPOSITORY } from './types/leisure-history-repository.interface';
import { LeisureNotesController } from './leisure-notes.controller';
import { LeisureNotesService } from './leisure-notes.service';
import { SupabaseLeisureNotesRepository } from './leisure-notes.repository';
import { LEISURE_NOTES_REPOSITORY } from './types/leisure-notes-repository.interface';
import { LeisureCollectionsController } from './leisure-collections.controller';
import { LeisureCollectionsService } from './leisure-collections.service';
import { SupabaseLeisureCollectionsRepository } from './leisure-collections.repository';
import { LEISURE_COLLECTIONS_REPOSITORY } from './types/leisure-collections-repository.interface';
import { LeisureSummaryController } from './leisure-summary.controller';
import { LeisureSummaryService } from './leisure-summary.service';
import { SupabaseLeisureSummaryRepository } from './leisure-summary.repository';
import { LEISURE_SUMMARY_REPOSITORY } from './types/leisure-summary-repository.interface';

/**
 * One module for the whole Tempo Livre domain (items/plan/history/notes/
 * collections/summary) rather than one module per sub-resource - they
 * share the same authorization model (auth.uid() = user_id RLS) and are
 * always deployed/versioned together. Each sub-resource still keeps its
 * own thin controller + service + repository trio, same as a standalone
 * module would (see docs/architecture.md - "Modular Monolith").
 */
@Module({
  controllers: [
    LeisureItemsController,
    LeisurePlanController,
    LeisureHistoryController,
    LeisureNotesController,
    LeisureCollectionsController,
    LeisureSummaryController,
  ],
  providers: [
    LeisureItemsService,
    { provide: LEISURE_ITEMS_REPOSITORY, useClass: SupabaseLeisureItemsRepository },
    LeisurePlanService,
    { provide: LEISURE_PLAN_REPOSITORY, useClass: SupabaseLeisurePlanRepository },
    LeisureHistoryService,
    { provide: LEISURE_HISTORY_REPOSITORY, useClass: SupabaseLeisureHistoryRepository },
    LeisureNotesService,
    { provide: LEISURE_NOTES_REPOSITORY, useClass: SupabaseLeisureNotesRepository },
    LeisureCollectionsService,
    { provide: LEISURE_COLLECTIONS_REPOSITORY, useClass: SupabaseLeisureCollectionsRepository },
    LeisureSummaryService,
    { provide: LEISURE_SUMMARY_REPOSITORY, useClass: SupabaseLeisureSummaryRepository },
  ],
})
export class LeisureModule {}
