import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export type FileType = 'file' | 'folder';
export type FileStatus = 'brainstorming' | 'writing' | 'completed';

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
                set((state) => ({
                    files: {
                        ...state.files,
                        [fileId]: { ...state.files[fileId], name: newName, updatedAt: Date.now() }
                    }
                }));
            },

            moveFile: (fileId, newParentId) => {
                set((state) => ({
                    files: {
                        ...state.files,
                        [fileId]: { ...state.files[fileId], parentId: newParentId, updatedAt: Date.now() }
                    }
                }));
            },

            openFile: (fileId) => set({ activeFileId: fileId }),

            toggleFolder: (folderId) => set((state) => {
                const newExpanded = new Set(state.expandedFolders);
                if (newExpanded.has(folderId)) {
                    newExpanded.delete(folderId);
                } else {
                    newExpanded.add(folderId);
                }
                return { expandedFolders: newExpanded };
            }),

            updateFileContent: (fileId, content) => set((state) => ({
                files: {
                    ...state.files,
                    [fileId]: { ...state.files[fileId], content, updatedAt: Date.now() }
                }
            })),

            updateFileMetadata: (fileId, metadata) => set((state) => ({
                files: {
                    ...state.files,
                    [fileId]: {
                        ...state.files[fileId],
                        metadata: { ...state.files[fileId].metadata!, ...metadata },
                        updatedAt: Date.now()
                    }
                }
            })),

            importData: (data) => set((state) => ({
                files: data.files || state.files,
                activeFileId: data.activeFileId ?? state.activeFileId,
                expandedFolders: data.expandedFolders
                    ? new Set(data.expandedFolders)
                    : state.expandedFolders
            }))
        }),
        {
            name: 'zenflux-storage',
            storage: createJSONStorage(() => localStorage),
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
