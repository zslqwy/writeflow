import type { CollectionScope } from '../store/useCollectionStore';
import type { FileNode } from '../store/useFileStore';

export interface CollectionScopeTarget {
    scope: CollectionScope;
    scopeId: string | null;
    label: string;
    available: boolean;
}

export function getCollectionScopeTarget(
    files: Record<string, FileNode>,
    activeFileId: string | null,
    scope: CollectionScope,
    fallbackLabel: string
): CollectionScopeTarget {
    if (scope === 'global') {
        return {
            scope,
            scopeId: null,
            label: fallbackLabel,
            available: true,
        };
    }

    if (scope === 'file') {
        const activeFile = activeFileId ? files[activeFileId] : null;

        return {
            scope,
            scopeId: activeFile?.type === 'file' ? activeFile.id : null,
            label: activeFile?.type === 'file' ? activeFile.name : fallbackLabel,
            available: activeFile?.type === 'file',
        };
    }

    const project = activeFileId ? getProjectRootFolder(files, activeFileId) : null;

    return {
        scope,
        scopeId: project?.id ?? null,
        label: project?.name ?? fallbackLabel,
        available: Boolean(project),
    };
}

export function getDefaultCollectionScope(files: Record<string, FileNode>, activeFileId: string | null): CollectionScope {
    if (activeFileId && files[activeFileId]?.type === 'file') {
        return 'file';
    }

    return 'global';
}

export function getProjectRootFolder(files: Record<string, FileNode>, nodeId: string): FileNode | null {
    let current = files[nodeId];
    if (!current) return null;

    let topFolder: FileNode | null = current.type === 'folder' ? current : null;

    while (current.parentId) {
        const parent = files[current.parentId];
        if (!parent) break;
        current = parent;
        if (current.type === 'folder') {
            topFolder = current;
        }
    }

    return topFolder;
}
