import { useMemo, useState } from 'react';
import { useFileStore } from '../store/useFileStore';
import { useModalStore } from '../store/useModalStore';
import { useAppearanceStore } from '../store/useAppearanceStore';
import { cn } from '../lib/utils';
import {
    FileText,
    Folder,
    LibraryBig,
    Lightbulb,
    NotebookPen,
    Trophy,
    ChevronRight,
    ChevronDown,
    Plus,
    Search,
    Settings,
    Edit2,
    Trash2,
    FilePlus,
    FolderPlus,
    Move,
    Download,
    Home,
    X,
    Sun,
    Moon
} from 'lucide-react';
import { downloadFile } from '../lib/file-utils';
import { exportToZip } from '../lib/export-utils';
import { useI18n } from '../lib/i18n';
import { useNavigate } from 'react-router-dom';
import { ContextMenu, type ContextMenuAction } from './ui/ContextMenu';
import type { FileNode } from '../store/useFileStore';
import type { TreeNode } from '../store/useModalStore';

type SearchScope = 'all' | 'project' | 'folder' | 'file';

interface SearchResult {
    id: string;
    fileId: string;
    fileName: string;
    path: string;
    snippet: string;
    matchCount: number;
}

const SEARCH_SCOPE_LABELS: Record<SearchScope, string> = {
    all: 'All',
    project: 'Project',
    folder: 'Folder',
    file: 'File',
};

interface FileTreeItemProps {
    nodeId: string;
    level?: number;
    onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
    onDrop: (draggedId: string, targetId: string) => void;
}

const FileTreeItem = ({ nodeId, level = 0, onContextMenu, onDrop }: FileTreeItemProps) => {
    const { files, expandedFolders, toggleFolder, openFile, activeFileId } = useFileStore();
    const navigate = useNavigate();
    const node = files[nodeId];
    const [isDragOver, setIsDragOver] = useState(false);

    if (!node) return null;

    const isExpanded = expandedFolders.has(nodeId);
    const isActive = activeFileId === nodeId;
    const children = Object.values(files).filter(f => f.parentId === nodeId);

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', nodeId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (node.type === 'folder') {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setIsDragOver(true);
        }
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId && draggedId !== nodeId && node.type === 'folder') {
            onDrop(draggedId, nodeId);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'brainstorming': return 'bg-yellow-500/50';
            case 'writing': return 'bg-blue-500/50';
            case 'completed': return 'bg-green-500/50';
            default: return null;
        }
    };

    return (
        <div>
            <div
                draggable
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition-all text-sm group",
                    isActive ? "bg-accent-primary/20 text-accent-primary" : "hover:bg-white/5 text-gray-400 hover:text-gray-200",
                    isDragOver && "bg-accent-primary/30 border border-accent-primary/50"
                )}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (node.type === 'folder') {
                        toggleFolder(node.id);
                    } else {
                        openFile(node.id);
                        navigate(`/editor/${node.id}`);
                    }
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenu(e, nodeId);
                }}
            >
                <span className="opacity-70">
                    {node.type === 'folder' ? (
                        isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : <FileText size={14} />}
                </span>
                <span className="truncate flex-1">{node.name}</span>

                {node.type === 'file' && node.metadata?.status && (
                    <div className={cn(
                        "w-1.5 h-1.5 rounded-full ml-auto opacity-70",
                        getStatusColor(node.metadata.status)
                    )} title={node.metadata.status} />
                )}
            </div>

            {node.type === 'folder' && isExpanded && (
                <div>
                    {children.map(child => (
                        <FileTreeItem
                            key={child.id}
                            nodeId={child.id}
                            level={level + 1}
                            onContextMenu={onContextMenu}
                            onDrop={onDrop}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export function Sidebar({ onOpenSettings }: { onOpenSettings?: () => void }) {
    const { files, activeFileId, createFile, openFile, deleteFile, renameFile, moveFile } = useFileStore();
    const { showConfirm, showPrompt, showSelect } = useModalStore();
    const { themeMode, toggleThemeMode } = useAppearanceStore();
    const { t } = useI18n();
    const navigate = useNavigate();
    const rootNodes = Object.values(files).filter(f => f.parentId === null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchScope, setSearchScope] = useState<SearchScope>('all');

    // Context Menu State
    const [menu, setMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null);

    const handleContextMenu = (e: React.MouseEvent, nodeId: string) => {
        setMenu({ x: e.clientX, y: e.clientY, nodeId });
    };

    const handleCloseMenu = () => setMenu(null);

    const activeNode = activeFileId ? files[activeFileId] : null;
    const activeFolderId = activeNode?.type === 'folder' ? activeNode.id : activeNode?.parentId ?? null;
    const activeProjectId = activeNode ? getProjectRootId(files, activeNode.id) : null;
    const effectiveSearchScope = getEffectiveSearchScope(searchScope, activeFileId, activeFolderId, activeProjectId);
    const searchResults = useMemo(
        () => getSearchResults(files, searchQuery, effectiveSearchScope, activeFileId, activeFolderId, activeProjectId, t('sidebar.matchedTitle')),
        [activeFileId, activeFolderId, activeProjectId, effectiveSearchScope, files, searchQuery, t]
    );
    const searchScopeLabels: Record<SearchScope, string> = {
        all: t('sidebar.scopeAll'),
        project: t('sidebar.scopeProject'),
        folder: t('sidebar.scopeFolder'),
        file: t('sidebar.scopeFile'),
    };

    const handleOpenSearchResult = (fileId: string) => {
        openFile(fileId);
        navigate(`/editor/${fileId}`);
    };

    const handleDrop = (draggedId: string, targetId: string) => {
        // ... existing drag drop logic ...
        // Prevent dropping into itself or its children
        const draggedNode = files[draggedId];
        if (!draggedNode) return;

        // Check if target is a descendant of dragged (would cause loop)
        let current: FileNode | undefined = files[targetId];
        while (current) {
            if (current.id === draggedId) return; // Can't drop into own descendant
            current = current.parentId ? files[current.parentId] : undefined;
        }

        moveFile(draggedId, targetId);
    };

    // Build recursive tree data for "Move to" modal
    const getFolderTreeData = (excludeId: string) => {
        const buildTree = (parentId: string | null): TreeNode[] => {
            return Object.values(files)
                .filter(f => f.type === 'folder' && f.parentId === parentId && f.id !== excludeId)
                .map(f => ({
                    id: f.id,
                    label: f.name,
                    children: buildTree(f.id)
                }));
        };

        return [
            { id: 'root', label: t('sidebar.root'), children: buildTree(null) } // Root is special case
        ];
    };

    // Generate actions based on selected node
    const getMenuActions = (): ContextMenuAction[] => {
        if (!menu || !menu.nodeId) return [];
        const node = files[menu.nodeId];
        if (!node) return [];

        const actions: ContextMenuAction[] = [];

        if (node.type === 'folder') {
            actions.push(
                {
                    label: t('sidebar.newFile'),
                    icon: FilePlus,
                    onClick: () => {
                        showPrompt(t('sidebar.newFile'), t('sidebar.fileNamePrompt'), t('common.untitled'), (name) => {
                            const id = createFile(node.id, name, 'file');
                            openFile(id);
                            navigate(`/editor/${id}`);
                        });
                    }
                },
                {
                    label: t('sidebar.newFolder'),
                    icon: FolderPlus,
                    onClick: () => {
                        showPrompt(t('sidebar.newFolder'), t('sidebar.folderNamePrompt'), t('sidebar.newFolder'), (name) => {
                            createFile(node.id, name, 'folder');
                        });
                    }
                },
                {
                    label: t('sidebar.exportZip'),
                    icon: Download,
                    onClick: () => {
                        exportToZip(node, files);
                    }
                }
            );
        }

        actions.push(
            {
                label: t('sidebar.rename'),
                icon: Edit2,
                onClick: () => {
                    showPrompt(t('sidebar.rename'), t('sidebar.fileNamePrompt'), node.name, (newName) => {
                        renameFile(node.id, newName);
                    });
                }
            },
            {
                label: t('sidebar.moveTo'),
                icon: Move,
                onClick: () => {
                    const treeData = getFolderTreeData(node.id);
                    const { showTreeSelect } = useModalStore.getState();

                    showTreeSelect(t('sidebar.moveTo'), `${t('sidebar.moveTo')} "${node.name}":`, treeData, (targetId) => {
                        moveFile(node.id, targetId === 'root' ? null : targetId);
                    });
                }
            }
        );

        if (node.type === 'file') {
            actions.push({
                label: t('sidebar.export'),
                icon: Download,
                onClick: () => {
                    const { showSelect } = useModalStore.getState();
                    showSelect(
                        t('sidebar.exportFile'),
                        t('sidebar.exportFormat'),
                        [
                            { id: 'markdown', label: t('sidebar.markdown') },
                            { id: 'text', label: t('sidebar.plainText') }
                        ],
                        (formatId) => {
                            const content = node.content || '';
                            const extension = formatId === 'markdown' ? 'md' : 'txt';
                            const type = formatId === 'markdown' ? 'markdown' : 'text';
                            downloadFile(content, `${node.name}.${extension}`, type as 'markdown' | 'text');
                        }
                    );
                }
            });
        }

        actions.push({
            label: t('sidebar.delete'),
            icon: Trash2,
            danger: true,
            onClick: () => {
                showConfirm(t('sidebar.delete'), `${t('sidebar.deleteConfirmPrefix')} "${node.name}"${t('sidebar.deleteConfirmSuffix')}`, () => {
                    deleteFile(node.id);
                    navigate('/');
                });
            }
        });

        return actions;
    };

    return (
        <aside className="w-64 h-screen flex flex-col glass border-r border-white/5 bg-black/40 relative" onContextMenu={(e) => e.preventDefault()}>
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/5">
                <button
                    onClick={() => navigate('/')}
                    className="group flex items-center gap-2 text-left"
                    title="Back to Dashboard"
                >
                    <Home size={16} className="text-gray-500 transition-colors group-hover:text-accent-primary" />
                    <h1 className="text-xl font-serif font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
                        WriteFlow
                    </h1>
                </button>
            </div>

            {/* ... Middle content ... */}

            <div className="border-b border-white/5 px-3 py-2">
                <button
                    onClick={() => navigate('/journal')}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                    <NotebookPen size={16} className="text-accent-secondary" />
                    <span>{t('nav.journal')}</span>
                </button>
                <button
                    onClick={() => navigate('/trophies')}
                    className="mt-1 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                    <Trophy size={16} className="text-amber-300" />
                    <span>{t('nav.trophies')}</span>
                </button>
                <button
                    onClick={() => navigate('/inspirations')}
                    className="mt-1 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                    <Lightbulb size={16} className="text-accent-primary" />
                    <span>{t('nav.inspirations')}</span>
                </button>
                <button
                    onClick={() => navigate('/materials')}
                    className="mt-1 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                    <LibraryBig size={16} className="text-amber-300" />
                    <span>{t('nav.materials')}</span>
                </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-white/5">
                <div className="relative mb-2">
                    <Search className="absolute left-2 top-2.5 text-gray-500" size={14} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('sidebar.searchPlaceholder')}
                        className="w-full bg-white/5 border border-white/5 rounded-md py-1.5 pl-8 pr-3 text-sm text-gray-300 focus:outline-none focus:bg-white/10 transition-colors"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-2 text-gray-500 hover:text-gray-300"
                            title={t('sidebar.clearSearch')}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-4 gap-1">
                    {(Object.keys(SEARCH_SCOPE_LABELS) as SearchScope[]).map((scope) => {
                        const disabled = (scope === 'file' && !activeFileId)
                            || (scope === 'folder' && !activeFolderId)
                            || (scope === 'project' && !activeProjectId);

                        return (
                            <button
                                key={scope}
                                onClick={() => setSearchScope(scope)}
                                disabled={disabled}
                                className={cn(
                                    "rounded-md px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                                    searchScope === scope
                                        ? "bg-accent-primary/20 text-accent-primary"
                                        : "bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300",
                                    disabled && "cursor-not-allowed opacity-30 hover:bg-white/5 hover:text-gray-500"
                                )}
                            >
                                {searchScopeLabels[scope]}
                            </button>
                        );
                    })}
                </div>
                {searchQuery.trim() && (
                    <div className="mt-3 max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                        {searchResults.length > 0 ? (
                            searchResults.map((result) => (
                                <button
                                    key={result.id}
                                    onClick={() => handleOpenSearchResult(result.fileId)}
                                    className="w-full rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2 text-left transition-colors hover:border-accent-primary/30 hover:bg-accent-primary/10"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-gray-200">
                                            <FileText size={12} className="shrink-0 text-accent-primary" />
                                            <span className="truncate">{result.fileName}</span>
                                        </span>
                                        <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-400">
                                            {result.matchCount}
                                        </span>
                                    </div>
                                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-gray-500">{result.snippet}</p>
                                    {result.path && (
                                        <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-600">
                                            <Folder size={10} />
                                            <span className="truncate">{result.path}</span>
                                        </p>
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-gray-500">
                                {t('sidebar.noMatches')}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* File Tree */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('nav.storage')}</span>
                    <button
                        onClick={() => {
                            // Create a simple selection modal for File vs Folder
                            showSelect(t('sidebar.createNew'), t('sidebar.createQuestion'),
                                [
                                    { id: 'folder', label: `📁 ${t('sidebar.newFolder')}` },
                                    { id: 'file', label: `📄 ${t('sidebar.newFile')}` }
                                ],
                                (type) => {
                                    if (type === 'folder') {
                                        showPrompt(t('sidebar.newFolder'), t('sidebar.folderNamePrompt'), t('sidebar.newFolder'), (name) => {
                                            createFile(null, name, 'folder');
                                        });
                                    } else {
                                        showPrompt(t('sidebar.newFile'), t('sidebar.fileNamePrompt'), t('common.untitled'), (name) => {
                                            const id = createFile(null, name, 'file');
                                            openFile(id);
                                            navigate(`/editor/${id}`);
                                        });
                                    }
                                }
                            );
                        }}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <Plus size={14} />
                    </button>
                </div>

                <div className="space-y-0.5">
                    {rootNodes.map(node => (
                        <FileTreeItem
                            key={node.id}
                            nodeId={node.id}
                            onContextMenu={handleContextMenu}
                            onDrop={handleDrop}
                        />
                    ))}
                </div>
            </div>

            {/* User / Settings */}
            <div className="p-3 border-t border-white/5">
                <button
                    onClick={toggleThemeMode}
                    className="mb-1 flex items-center justify-between text-gray-400 hover:text-white w-full px-2 py-2 rounded-md hover:bg-white/5 transition-colors"
                    title={t('nav.theme')}
                >
                    <span className="flex items-center gap-3">
                        {themeMode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                        <span className="text-sm">{t('nav.theme')}</span>
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        {themeMode === 'dark' ? t('nav.dark') : t('nav.light')}
                    </span>
                </button>
                <button
                    onClick={onOpenSettings}
                    className="flex items-center gap-3 text-gray-400 hover:text-white w-full px-2 py-2 rounded-md hover:bg-white/5 transition-colors"
                >
                    <Settings size={18} />
                    <span className="text-sm">{t('nav.settings')}</span>
                </button>
            </div>

            {/* Render Context Menu */}
            {menu && (
                <ContextMenu
                    x={menu.x}
                    y={menu.y}
                    actions={getMenuActions()}
                    onClose={handleCloseMenu}
                />
            )}
        </aside>
    );
}

function getEffectiveSearchScope(
    scope: SearchScope,
    activeFileId: string | null,
    activeFolderId: string | null,
    activeProjectId: string | null
): SearchScope {
    if (scope === 'file' && !activeFileId) return 'all';
    if (scope === 'folder' && !activeFolderId) return 'all';
    if (scope === 'project' && !activeProjectId) return 'all';
    return scope;
}

function getSearchResults(
    files: Record<string, FileNode>,
    query: string,
    scope: SearchScope,
    activeFileId: string | null,
    activeFolderId: string | null,
    activeProjectId: string | null,
    matchedTitleLabel: string
): SearchResult[] {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const scopeIds = getScopedFileIds(files, scope, activeFileId, activeFolderId, activeProjectId);

    return Object.values(files)
        .filter((file) => file.type === 'file' && scopeIds.has(file.id))
        .map((file) => {
            const content = file.content || '';
            const matchCount = getMatchCount(file.name, trimmedQuery) + getMatchCount(content, trimmedQuery);

            if (matchCount === 0) return null;

            return {
                id: `${file.id}-${trimmedQuery}`,
                fileId: file.id,
                fileName: file.name,
                path: getPathLabel(files, file.parentId),
                snippet: getSearchSnippet(file.name, content, trimmedQuery, matchedTitleLabel),
                matchCount,
            };
        })
        .filter((result): result is SearchResult => Boolean(result))
        .sort((a, b) => b.matchCount - a.matchCount || a.fileName.localeCompare(b.fileName));
}

function getScopedFileIds(
    files: Record<string, FileNode>,
    scope: SearchScope,
    activeFileId: string | null,
    activeFolderId: string | null,
    activeProjectId: string | null
): Set<string> {
    if (scope === 'file' && activeFileId) {
        return new Set([activeFileId]);
    }

    if (scope === 'folder' && activeFolderId) {
        return getDescendantFileIds(files, activeFolderId);
    }

    if (scope === 'project' && activeProjectId) {
        return getDescendantFileIds(files, activeProjectId);
    }

    return new Set(Object.values(files).filter((file) => file.type === 'file').map((file) => file.id));
}

function getDescendantFileIds(files: Record<string, FileNode>, rootId: string): Set<string> {
    const ids = new Set<string>();
    const stack = [rootId];

    while (stack.length > 0) {
        const currentId = stack.pop();
        if (!currentId) continue;

        const current = files[currentId];
        if (current?.type === 'file') {
            ids.add(current.id);
        }

        Object.values(files).forEach((file) => {
            if (file.parentId === currentId) {
                stack.push(file.id);
            }
        });
    }

    return ids;
}

function getProjectRootId(files: Record<string, FileNode>, nodeId: string): string | null {
    let current = files[nodeId];
    if (!current) return null;

    while (current.parentId) {
        const parent = files[current.parentId];
        if (!parent) break;
        current = parent;
    }

    return current.id;
}

function getMatchCount(text: string, query: string): number {
    if (!text || !query) return 0;
    return text.toLowerCase().split(query.toLowerCase()).length - 1;
}

function getSearchSnippet(fileName: string, content: string, query: string, matchedTitleLabel: string): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerContent.indexOf(lowerQuery);

    if (matchIndex === -1) {
        return `${matchedTitleLabel}: ${fileName}`;
    }

    const start = Math.max(0, matchIndex - 36);
    const end = Math.min(content.length, matchIndex + query.length + 72);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < content.length ? '...' : '';

    return `${prefix}${content.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

function getPathLabel(files: Record<string, FileNode>, parentId: string | null): string {
    const parts: string[] = [];
    let current = parentId ? files[parentId] : null;

    while (current) {
        parts.unshift(current.name);
        current = current.parentId ? files[current.parentId] : null;
    }

    return parts.join(' / ');
}
