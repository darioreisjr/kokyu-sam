import {
  LeisureCollection,
  LeisureCollectionCreateInput,
  LeisureCollectionUpdateInput,
} from './leisure-collection.type';

export const LEISURE_COLLECTIONS_REPOSITORY = Symbol('LEISURE_COLLECTIONS_REPOSITORY');

export interface LeisureCollectionsRepository {
  findAll: (accessToken: string) => Promise<LeisureCollection[]>;
  findById: (accessToken: string, id: string) => Promise<LeisureCollection | null>;
  create: (
    accessToken: string,
    userId: string,
    input: LeisureCollectionCreateInput,
  ) => Promise<LeisureCollection>;
  update: (
    accessToken: string,
    id: string,
    patch: LeisureCollectionUpdateInput,
  ) => Promise<LeisureCollection | null>;
  delete: (accessToken: string, id: string) => Promise<void>;
  addItem: (
    accessToken: string,
    userId: string,
    collectionId: string,
    itemId: string,
  ) => Promise<LeisureCollection | null>;
  removeItem: (
    accessToken: string,
    collectionId: string,
    itemId: string,
  ) => Promise<LeisureCollection | null>;
}
