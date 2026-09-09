export interface LeisureCollection {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  itemIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LeisureCollectionCreateInput {
  name: string;
  description?: string | null;
  itemIds?: string[];
}

export type LeisureCollectionUpdateInput = Partial<Omit<LeisureCollectionCreateInput, 'itemIds'>>;
