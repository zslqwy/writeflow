import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

import { createIndexedDBStorage } from '../lib/indexeddb-storage';
import { countWords } from '../lib/text-stats';

export type FileType = 'file' | 'folder';
export type FileStatus = 'brainstorming' | 'writing' | 'completed';

export interface FileVersionSnapshot {
    id: string;
    fileId: string;
    title: string;
    content: string;
    wordCount: number;
    createdAt: number;
}

export interface FileNode {
    id: string;
    type: FileType;
    parentId: string | null;
    name: string;
    content?: string;
    createdAt: number;
    updatedAt: number;
    metadata?: {
        wordCount: number;
        status: FileStatus;
        targetWordCount?: number;
        deadline?: number;
    };
    versionSnapshots?: FileVersionSnapshot[];
}

interface FileStore {
    files: Record<string, FileNode>;
    activeFileId: string | null;
    expandedFolders: Set<string>;

    // Actions
    createFile: (parentId: string | null, name: string, type: FileType) => string;
    deleteFile: (fileId: string) => void;
    renameFile: (fileId: string, newName: string) => void;
    moveFile: (fileId: string, newParentId: string | null) => void;
    openFile: (fileId: string) => void;
    toggleFolder: (folderId: string) => void;
    updateFileContent: (fileId: string, content: string) => void;
    updateFileMetadata: (fileId: string, metadata: Partial<FileNode['metadata']>) => void;
    createFileSnapshot: (fileId: string, title?: string, content?: string) => string | null;
    restoreFileSnapshot: (fileId: string, snapshotId: string) => void;
    deleteFileSnapshot: (fileId: string, snapshotId: string) => void;
    importData: (data: Partial<FileStore>) => void;
}

type PersistedFileStore = {
    files: Record<string, FileNode>;
    activeFileId: string | null;
    expandedFolders: string[];
};

const getDescendantIds = (files: Record<string, FileNode>, fileId: string): string[] => {
    const descendantIds: string[] = [];
    const stack = [fileId];

    while (stack.length > 0) {
        const currentId = stack.pop();
        if (!currentId) continue;

        descendantIds.push(currentId);

        Object.values(files).forEach((file) => {
            if (file.parentId === currentId) {
                stack.push(file.id);
            }
        });
    }

    return descendantIds;
};

const getValidExpandedFolders = (files: Record<string, FileNode>, expandedFolders: Iterable<string>): Set<string> => {
    return new Set(
        [...expandedFolders].filter((id) => files[id]?.type === 'folder')
    );
};

const getFileMetadata = (
    file: FileNode,
    updates: Partial<FileNode['metadata']> = {}
): NonNullable<FileNode['metadata']> => ({
    status: updates.status ?? file.metadata?.status ?? 'brainstorming',
    wordCount: updates.wordCount ?? file.metadata?.wordCount ?? 0,
    targetWordCount: updates.targetWordCount ?? file.metadata?.targetWordCount,
    deadline: updates.deadline ?? file.metadata?.deadline,
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isFileNode = (value: unknown): value is FileNode => {
    return isRecord(value)
        && typeof value.id === 'string'
        && (value.type === 'file' || value.type === 'folder')
        && (typeof value.parentId === 'string' || value.parentId === null)
        && typeof value.name === 'string'
        && typeof value.createdAt === 'number'
        && typeof value.updatedAt === 'number';
};

const isVersionSnapshot = (value: unknown): value is FileVersionSnapshot => {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.fileId === 'string'
        && typeof value.title === 'string'
        && typeof value.content === 'string'
        && typeof value.wordCount === 'number'
        && typeof value.createdAt === 'number';
};

const normalizeVersionSnapshots = (fileId: string, snapshots: unknown): FileVersionSnapshot[] | undefined => {
    if (!Array.isArray(snapshots)) return undefined;

    return snapshots
        .filter(isVersionSnapshot)
        .map((snapshot) => ({
            ...snapshot,
            fileId,
            wordCount: Number.isFinite(snapshot.wordCount) ? snapshot.wordCount : countWords(snapshot.content),
        }))
        .sort((a, b) => b.createdAt - a.createdAt);
};

const normalizeImportedFiles = (
    files: Record<string, FileNode>,
    fallbackFiles: Record<string, FileNode>
): Record<string, FileNode> => {
    const validEntries = Object.entries(files).filter((entry): entry is [string, FileNode] => isFileNode(entry[1]));
    if (validEntries.length === 0) return fallbackFiles;

    const nextFiles = Object.fromEntries(validEntries);

    return Object.fromEntries(
        validEntries.map(([id, file]) => {
            const parent = file.parentId ? nextFiles[file.parentId] : null;
            const parentId = parent?.type === 'folder' ? parent.id : null;

            if (file.type === 'folder') {
                return [
                    id,
                    {
                        id,
                        type: file.type,
                        parentId,
                        name: file.name,
                        createdAt: file.createdAt,
                        updatedAt: file.updatedAt,
                    },
                ];
            }

            return [
                id,
                {
                    ...file,
                    id,
                    parentId,
                    content: typeof file.content === 'string' ? file.content : '',
                    metadata: getFileMetadata(file),
                    versionSnapshots: normalizeVersionSnapshots(id, file.versionSnapshots),
                },
            ];
        })
    );
};

const INITIAL_MOCK_FILES: Record<string, FileNode> = {
    'root-1': {
        id: 'root-1',
        type: 'folder',
        parentId: null,
        name: 'My Novel',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    'file-1': {
        id: 'file-1',
        type: 'file',
        parentId: 'root-1',
        name: 'Chapter 1: The Beginning',
        content: '# Chapter 1\n\nIt was a dark and stormy night...',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {
            status: 'writing',
            wordCount: 120,
        }
    },
};

export const useFileStore = create<FileStore>()(
    persist(
        (set) => ({
            files: INITIAL_MOCK_FILES,
            activeFileId: null,
            expandedFolders: new Set(['root-1']),

            createFile: (parentId, name, type) => {
                const id = uuidv4();
                const newNode: FileNode = {
                    id,
                    type,
                    parentId,
                    name,
                    content: type === 'file' ? '' : undefined,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    metadata: type === 'file' ? { status: 'brainstorming', wordCount: 0 } : undefined
                };

                set((state) => ({
                    files: { ...state.files, [id]: newNode },
                    expandedFolders: type === 'folder' ? new Set([...state.expandedFolders, id]) : state.expandedFolders
                }));
                return id;
            },

            deleteFile: (fileId) => {
                set((state) => {
                    const newFiles = { ...state.files };
                    const idsToDelete = new Set(getDescendantIds(state.files, fileId));

                    idsToDelete.forEach((id) => {
                        delete newFiles[id];
                    });

                    return {
                        files: newFiles,
                        activeFileId: state.activeFileId && idsToDelete.has(state.activeFileId)
                            ? null
                            : state.activeFileId,
                        expandedFolders: new Set(
                            [...state.expandedFolders].filter((id) => !idsToDelete.has(id))
                        )
                    };
                });
            },

            renameFile: (fileId, newName) => {
                set((state) => {
                    const file = state.files[fileId];
                    if (!file) return state;

                    return {
                        files: {
                            ...state.files,
                            [fileId]: { ...file, name: newName, updatedAt: Date.now() }
                        }
                    };
                });
            },

            moveFile: (fileId, newParentId) => {
                set((state) => {
                    const file = state.files[fileId];
                    if (!file) return state;

                    return {
                        files: {
                            ...state.files,
                            [fileId]: { ...file, parentId: newParentId, updatedAt: Date.now() }
                        }
                    };
                });
            },

            openFile: (fileId) => set((state) => ({
                activeFileId: state.files[fileId]?.type === 'file' ? fileId : state.activeFileId
            })),

            toggleFolder: (folderId) => set((state) => {
                const newExpanded = new Set(state.expandedFolders);
                if (newExpanded.has(folderId)) {
                    newExpanded.delete(folderId);
                } else {
                    newExpanded.add(folderId);
                }
                return { expandedFolders: newExpanded };
            }),

            updateFileContent: (fileId, content) => set((state) => {
                const file = state.files[fileId];
                if (!file || file.type !== 'file') return state;

                return {
                    files: {
                        ...state.files,
                        [fileId]: { ...file, content, updatedAt: Date.now() }
                    }
                };
            }),

            updateFileMetadata: (fileId, metadata) => set((state) => {
                const file = state.files[fileId];
                if (!file || file.type !== 'file') return state;

                return {
                    files: {
                        ...state.files,
                        [fileId]: {
                            ...file,
                            metadata: getFileMetadata(file, metadata),
                            updatedAt: Date.now()
                        }
                    }
                };
            }),

            createFileSnapshot: (fileId, title, content) => {
                let createdSnapshotId: string | null = null;

                set((state) => {
                    const file = state.files[fileId];
                    if (!file || file.type !== 'file') return state;

                    const snapshotId = uuidv4();
                    const snapshotContent = content ?? file.content ?? '';
                    const now = Date.now();
                    const snapshot: FileVersionSnapshot = {
                        id: snapshotId,
                        fileId,
                        title: title?.trim() || 'Snapshot',
                        content: snapshotContent,
                        wordCount: countWords(snapshotContent),
                        createdAt: now,
                    };
                    createdSnapshotId = snapshotId;

                    return {
                        files: {
                            ...state.files,
                            [fileId]: {
                                ...file,
                                versionSnapshots: [snapshot, ...(file.versionSnapshots || [])],
                            },
                        },
                    };
                });

                return createdSnapshotId;
            },

            restoreFileSnapshot: (fileId, snapshotId) => set((state) => {
                const file = state.files[fileId];
                const snapshot = file?.versionSnapshots?.find((item) => item.id === snapshotId);
                if (!file || file.type !== 'file' || !snapshot) return state;

                return {
                    files: {
                        ...state.files,
                        [fileId]: {
                            ...file,
                            content: snapshot.content,
                            metadata: getFileMetadata(file, { wordCount: snapshot.wordCount }),
                            updatedAt: Date.now(),
                        },
                    },
                };
            }),

            deleteFileSnapshot: (fileId, snapshotId) => set((state) => {
                const file = state.files[fileId];
                if (!file || file.type !== 'file') return state;

                return {
                    files: {
                        ...state.files,
                        [fileId]: {
                            ...file,
                            versionSnapshots: (file.versionSnapshots || []).filter((snapshot) => snapshot.id !== snapshotId),
                        },
                    },
                };
            }),

            importData: (data) => set((state) => {
                const nextFiles = data.files
                    ? normalizeImportedFiles(data.files, state.files)
                    : state.files;
                const nextActiveFileId = data.activeFileId && nextFiles[data.activeFileId]?.type === 'file'
                    ? data.activeFileId
                    : state.activeFileId && nextFiles[state.activeFileId]?.type === 'file'
                        ? state.activeFileId
                        : null;

                return {
                    files: nextFiles,
                    activeFileId: nextActiveFileId,
                    expandedFolders: getValidExpandedFolders(
                        nextFiles,
                        data.expandedFolders ?? state.expandedFolders
                    ),
                };
            })
        }),
        {
            name: 'zenflux-storage',
            storage: createJSONStorage(() => createIndexedDBStorage()),
            partialize: (state): PersistedFileStore => ({
                files: state.files,
                activeFileId: state.activeFileId,
                expandedFolders: Array.from(state.expandedFolders),
            }),
            merge: (persistedState, currentState) => {
                const typedPersistedState = persistedState as Partial<PersistedFileStore>;

                return {
                    ...currentState,
                    ...typedPersistedState,
                    expandedFolders: new Set(
                        typedPersistedState.expandedFolders ?? Array.from(currentState.expandedFolders)
                    )
                };
            },
        }
    )
);
