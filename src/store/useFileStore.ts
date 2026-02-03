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
}

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
                    delete newFiles[fileId];

                    // Basic recursive delete for children
                    Object.values(state.files).forEach(f => {
                        if (f.parentId === fileId) {
                            delete newFiles[f.id];
                        }
                    });

                    return { files: newFiles };
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
            }))
        }),
        {
            name: 'zenflux-storage',
            storage: createJSONStorage(() => localStorage),
            // Need to handle Set serialization for expandedFolders since local storage doesn't support Set
            partialize: (state) => ({
                files: state.files,
                activeFileId: state.activeFileId,
            }),
        }
    )
);
