import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/types/authenticated-user.type';
import { LeisureCollectionNotFoundError } from '../../common/errors/app.error';
import {
  LeisureCollection,
  LeisureCollectionCreateInput,
  LeisureCollectionUpdateInput,
} from './types/leisure-collection.type';
import {
  LEISURE_COLLECTIONS_REPOSITORY,
  LeisureCollectionsRepository,
} from './types/leisure-collections-repository.interface';

@Injectable()
export class LeisureCollectionsService {
  constructor(
    @Inject(LEISURE_COLLECTIONS_REPOSITORY)
    private readonly repository: LeisureCollectionsRepository,
  ) {}

  findAll(user: AuthenticatedUser): Promise<LeisureCollection[]> {
    return this.repository.findAll(user.accessToken);
  }

  async findById(user: AuthenticatedUser, id: string): Promise<LeisureCollection> {
    const collection = await this.repository.findById(user.accessToken, id);
    if (!collection) throw new LeisureCollectionNotFoundError();
    return collection;
  }

  create(user: AuthenticatedUser, input: LeisureCollectionCreateInput): Promise<LeisureCollection> {
    return this.repository.create(user.accessToken, user.id, input);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    patch: LeisureCollectionUpdateInput,
  ): Promise<LeisureCollection> {
    const updated = await this.repository.update(user.accessToken, id, patch);
    if (!updated) throw new LeisureCollectionNotFoundError();
    return updated;
  }

  async delete(user: AuthenticatedUser, id: string): Promise<void> {
    await this.repository.delete(user.accessToken, id);
  }

  async addItem(
    user: AuthenticatedUser,
    collectionId: string,
    itemId: string,
  ): Promise<LeisureCollection> {
    const updated = await this.repository.addItem(user.accessToken, user.id, collectionId, itemId);
    if (!updated) throw new LeisureCollectionNotFoundError();
    return updated;
  }

  async removeItem(
    user: AuthenticatedUser,
    collectionId: string,
    itemId: string,
  ): Promise<LeisureCollection> {
    const updated = await this.repository.removeItem(user.accessToken, collectionId, itemId);
    if (!updated) throw new LeisureCollectionNotFoundError();
    return updated;
  }
}
