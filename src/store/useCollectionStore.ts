import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

import { createIndexedDBStorage } from '../lib/indexeddb-storage';

export type CollectionItemType = 'inspiration' | 'material';
export type CollectionScope = 'global' | 'project' | 'file';
export type CollectionSourceType = 'manual' | 'text-file';

export interface CollectionItem {
    id: string;
    type: CollectionItemType;
    scope: CollectionScope;
    scopeId: string | null;
    title: string;
    content: string;
    sourceName?: string;
    sourceType: CollectionSourceType;
    createdAt: number;
    updatedAt: number;
}

type CreateCollectionItemInput = Pick<CollectionItem, 'type' | 'scope' | 'scopeId' | 'content'> & {
    title?: string;
    sourceName?: string;
    sourceType?: CollectionSourceType;
};

type UpdateCollectionItemInput = Partial<Pick<CollectionItem, 'title' | 'content' | 'scope' | 'scopeId' | 'sourceName' | 'sourceType'>>;

interface CollectionStore {
    items: Record<string, CollectionItem>;
    createItem: (input: CreateCollectionItemInput) => string;
    updateItem: (itemId: string, updates: UpdateCollectionItemInput) => void;
    deleteItem: (itemId: string) => void;
    importItems: (items: Record<string, CollectionItem>) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isCollectionItem = (value: unknown): value is CollectionItem => {
    return isRecord(value)
        && typeof value.id === 'string'
        && (value.type === 'inspiration' || value.type === 'material')
        && (value.scope === 'global' || value.scope === 'project' || value.scope === 'file')
        && (typeof value.scopeId === 'string' || value.scopeId === null)
        && typeof value.title === 'string'
        && typeof value.content === 'string'
        && typeof value.createdAt === 'number'
        && typeof value.updatedAt === 'number';
};

const normalizeItems = (items: Record<string, CollectionItem>): Record<string, CollectionItem> => {
    return Object.fromEntries(
        Object.entries(items)
            .filter((entry): entry is [string, CollectionItem] => isCollectionItem(entry[1]))
            .map(([id, item]) => [
                id,
                {
                    ...item,
                    id,
                    scopeId: item.scope === 'global' ? null : item.scopeId,
                    sourceType: item.sourceType === 'text-file' ? 'text-file' : 'manual',
                    title: item.title.trim() || getFallbackTitle(item.type),
                },
            ])
    );
};

const getFallbackTitle = (type: CollectionItemType): string => {
    return type === 'inspiration' ? 'Untitled Inspiration' : 'Untitled Material';
};

export const useCollectionStore = create<CollectionStore>()(
    persist(
        (set) => ({
            items: {},

            createItem: (input) => {
                const id = uuidv4();
                const now = Date.now();
                const item: CollectionItem = {
                    id,
                    type: input.type,
                    scope: input.scope,
                    scopeId: input.scope === 'global' ? null : input.scopeId,
                    title: input.title?.trim() || getFallbackTitle(input.type),
                    content: input.content,
                    sourceName: input.sourceName,
                    sourceType: input.sourceType || 'manual',
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    items: {
                        ...state.items,
                        [id]: item,
                    },
                }));

                return id;
            },

            updateItem: (itemId, updates) => set((state) => {
                const item = state.items[itemId];
                if (!item) return state;

                const nextScope = updates.scope ?? item.scope;
                const nextScopeId = nextScope === 'global' ? null : updates.scopeId ?? item.scopeId;

                return {
                    items: {
                        ...state.items,
                        [itemId]: {
                            ...item,
                            ...updates,
                            scope: nextScope,
                            scopeId: nextScopeId,
                            title: updates.title?.trim() || item.title,
                            sourceType: updates.sourceType || item.sourceType,
                            updatedAt: Date.now(),
                        },
                    },
                };
            }),

            deleteItem: (itemId) => set((state) => {
                const items = { ...state.items };
                delete items[itemId];
                return { items };
            }),

            importItems: (items) => set({ items: normalizeItems(items) }),
        }),
        {
            name: 'writeflow-collections',
            storage: createJSONStorage(() => createIndexedDBStorage()),
        }
    )
);
