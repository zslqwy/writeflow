import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

import { createIndexedDBStorage } from '../lib/indexeddb-storage';

export interface JournalEntry {
    id: string;
    date: string;
    title: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}

interface JournalStore {
    entries: Record<string, JournalEntry>;
    createEntry: (date: string, title?: string) => string;
    updateEntry: (entryId: string, updates: Partial<Pick<JournalEntry, 'date' | 'title' | 'content'>>) => void;
    deleteEntry: (entryId: string) => void;
    importEntries: (entries: Record<string, JournalEntry>) => void;
}

export const useJournalStore = create<JournalStore>()(
    persist(
        (set) => ({
            entries: {},

            createEntry: (date, title) => {
                const id = uuidv4();
                const now = Date.now();
                const newEntry: JournalEntry = {
                    id,
                    date,
                    title: title || '未命名随记',
                    content: '',
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    entries: {
                        ...state.entries,
                        [id]: newEntry,
                    }
                }));

                return id;
            },

            updateEntry: (entryId, updates) => set((state) => {
                const entry = state.entries[entryId];
                if (!entry) return state;

                return {
                    entries: {
                        ...state.entries,
                        [entryId]: {
                            ...entry,
                            ...updates,
                            updatedAt: Date.now(),
                        }
                    }
                };
            }),

            deleteEntry: (entryId) => set((state) => {
                const entries = { ...state.entries };
                delete entries[entryId];
                return { entries };
            }),

            importEntries: (entries) => set({ entries }),
        }),
        {
            name: 'writeflow-journal',
            storage: createJSONStorage(() => createIndexedDBStorage()),
        }
    )
);
