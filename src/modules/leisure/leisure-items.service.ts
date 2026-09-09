import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/types/authenticated-user.type';
import {
  LeisureItemDetailsInvalidError,
  LeisureItemNotFoundError,
} from '../../common/errors/app.error';
import { LEISURE_ITEM_DETAILS_SCHEMAS } from './schemas/leisure-item-details.schemas';
import { LeisureItem, LeisureItemListFilter } from './types/leisure-item.type';
import {
  LEISURE_ITEMS_REPOSITORY,
  LeisureCoverUploadTarget,
  LeisureItemsRepository,
} from './types/leisure-items-repository.interface';
import {
  CoverUploadUrlBody,
  ReclassifyLeisureItemBody,
  UpdateLeisureItemProgressBody,
  extensionForCoverMimeType,
} from './schemas/leisure-item.schemas';
import { LeisureItemCreateInput, LeisureItemUpdateInput } from './types/leisure-item.type';

@Injectable()
export class LeisureItemsService {
  constructor(
    @Inject(LEISURE_ITEMS_REPOSITORY)
    private readonly repository: LeisureItemsRepository,
  ) {}

  findAll(user: AuthenticatedUser, filter: LeisureItemListFilter): Promise<LeisureItem[]> {
    return this.repository.findAll(user.accessToken, filter);
  }

  async findById(user: AuthenticatedUser, id: string): Promise<LeisureItem> {
    const item = await this.repository.findById(user.accessToken, id);
    if (!item) throw new LeisureItemNotFoundError();
    return item;
  }

  create(user: AuthenticatedUser, input: LeisureItemCreateInput): Promise<LeisureItem> {
    return this.repository.create(user.accessToken, user.id, input);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    patch: LeisureItemUpdateInput,
  ): Promise<LeisureItem> {
    const updated = await this.repository.update(user.accessToken, id, patch);
    if (!updated) throw new LeisureItemNotFoundError();
    return updated;
  }

  async delete(user: AuthenticatedUser, id: string): Promise<void> {
    await this.repository.delete(user.accessToken, id);
  }

  async toggleFavorite(user: AuthenticatedUser, id: string): Promise<LeisureItem> {
    const current = await this.findById(user, id);
    return this.update(user, id, { favorite: !current.favorite });
  }

  async archive(user: AuthenticatedUser, id: string): Promise<LeisureItem> {
    return this.update(user, id, { status: 'archived' });
  }

  /**
   * Merges `body.progress` into the item's own type-specific `details`
   * slice (e.g. `{ currentPage: 155 }` for a book) - never touches base
   * fields. Re-validates the merged slice against the item's current type
   * before persisting, so an invalid progress patch never corrupts `details`.
   */
  async updateProgress(
    user: AuthenticatedUser,
    id: string,
    body: UpdateLeisureItemProgressBody,
  ): Promise<LeisureItem> {
    const current = await this.findById(user, id);
    const merged = { ...current.details, ...body.progress };

    const schema = LEISURE_ITEM_DETAILS_SCHEMAS[current.type];
    const result = schema.safeParse(merged);
    if (!result.success) {
      throw new LeisureItemDetailsInvalidError();
    }

    return this.update(user, id, { details: merged });
  }

  /**
   * "Organizar" a Quick Capture item - swaps type + details slice in one
   * atomic patch, without touching id/history. A thin, explicit wrapper
   * over `update` so callers never need to know a reclassify is "just" a
   * patch with `type` + `details`.
   */
  reclassify(
    user: AuthenticatedUser,
    id: string,
    body: ReclassifyLeisureItemBody,
  ): Promise<LeisureItem> {
    return this.update(user, id, { type: body.type, details: body.details });
  }

  createCoverUploadUrl(
    user: AuthenticatedUser,
    body: CoverUploadUrlBody,
  ): Promise<LeisureCoverUploadTarget> {
    const extension = extensionForCoverMimeType(body.contentType);
    return this.repository.createCoverUploadUrl(user.accessToken, user.id, extension);
  }
}
