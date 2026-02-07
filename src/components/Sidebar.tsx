import { useState } from 'react';
import { useFileStore } from '../store/useFileStore';
import { useModalStore } from '../store/useModalStore';
import { cn } from '../lib/utils';
import {
    FileText,
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
    Download
} from 'lucide-react';
import { downloadFile } from '../lib/file-utils';
import { exportToZip } from '../lib/export-utils';
import { useNavigate } from 'react-router-dom';
import { ContextMenu, type ContextMenuAction } from './ui/ContextMenu';

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
    const { files, createFile, openFile, deleteFile, renameFile, moveFile } = useFileStore();
    const { showConfirm, showPrompt, showSelect } = useModalStore();
    const navigate = useNavigate();
    const rootNodes = Object.values(files).filter(f => f.parentId === null);

    // Context Menu State
    const [menu, setMenu] = useState<{ x: number; y: number; nodeId: string | null } | null>(null);

    const handleContextMenu = (e: React.MouseEvent, nodeId: string) => {
        setMenu({ x: e.clientX, y: e.clientY, nodeId });
    };

    const handleCloseMenu = () => setMenu(null);

    const handleDrop = (draggedId: string, targetId: string) => {
        // ... existing drag drop logic ...
        // Prevent dropping into itself or its children
        const draggedNode = files[draggedId];
        if (!draggedNode) return;

        // Check if target is a descendant of dragged (would cause loop)
        let current = files[targetId];
        while (current) {
            if (current.id === draggedId) return; // Can't drop into own descendant
            current = current.parentId ? files[current.parentId] : null as any;
        }

        moveFile(draggedId, targetId);
    };

    // Build recursive tree data for "Move to" modal
    const getFolderTreeData = (excludeId: string) => {
        const buildTree = (parentId: string | null): any[] => {
            return Object.values(files)
                .filter(f => f.type === 'folder' && f.parentId === parentId && f.id !== excludeId)
                .map(f => ({
                    id: f.id,
                    label: f.name,
                    children: buildTree(f.id)
                }));
        };

        return [
            { id: 'root', label: 'Root (Top Level)', children: buildTree(null) } // Root is special case
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
                    label: 'New File',
                    icon: FilePlus,
                    onClick: () => {
                        showPrompt('New File', 'Enter file name:', 'Untitled', (name) => {
                            const id = createFile(node.id, name, 'file');
                            openFile(id);
                            navigate(`/editor/${id}`);
                        });
                    }
                },
                {
                    label: 'New Folder',
                    icon: FolderPlus,
                    onClick: () => {
                        showPrompt('New Folder', 'Enter folder name:', 'New Folder', (name) => {
                            createFile(node.id, name, 'folder');
                        });
                    }
                },
                {
                    label: 'Export (ZIP)',
                    icon: Download,
                    onClick: () => {
                        exportToZip(node, files);
                    }
                }
            );
        }

        actions.push(
            {
                label: 'Rename',
                icon: Edit2,
                onClick: () => {
                    showPrompt('Rename', 'Enter new name:', node.name, (newName) => {
                        renameFile(node.id, newName);
                    });
                }
            },
            {
                label: 'Move to...',
                icon: Move,
                onClick: () => {
                    const treeData = getFolderTreeData(node.id);
                    const { showTreeSelect } = useModalStore.getState();

                    showTreeSelect('Move to', `Select destination for "${node.name}":`, treeData, (targetId) => {
                        moveFile(node.id, targetId === 'root' ? null : targetId);
                    });
                }
            }
        );

        if (node.type === 'file') {
            actions.push({
                label: 'Export...',
                icon: Download,
                onClick: () => {
                    const { showSelect } = useModalStore.getState();
                    showSelect(
                        'Export File',
                        'Select export format:',
                        [
                            { id: 'markdown', label: 'Markdown (.md)' },
                            { id: 'text', label: 'Plain Text (.txt)' }
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
            label: 'Delete',
            icon: Trash2,
            danger: true,
            onClick: () => {
                showConfirm('Delete', `Are you sure you want to delete "${node.name}"?`, () => {
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
                <h1 className="text-xl font-serif font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
                    WriteFlow
                </h1>
            </div>

            {/* ... Middle content ... */}

            {/* Search */}
            <div className="px-3 py-2">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 text-gray-500" size={14} />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full bg-white/5 border border-white/5 rounded-md py-1.5 pl-8 pr-3 text-sm text-gray-300 focus:outline-none focus:bg-white/10 transition-colors"
                    />
                </div>
            </div>

            {/* File Tree */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                <div className="flex items-center justify-between px-2 mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Storage</span>
                    <button
                        onClick={() => {
                            // Create a simple selection modal for File vs Folder
                            showSelect('Create New', 'What would you like to create?',
                                [
                                    { id: 'folder', label: '📁 New Folder' },
                                    { id: 'file', label: '📄 New File' }
                                ],
                                (type) => {
                                    if (type === 'folder') {
                                        showPrompt('New Folder', 'Enter folder name:', 'New Folder', (name) => {
                                            createFile(null, name, 'folder');
                                        });
                                    } else {
                                        showPrompt('New File', 'Enter file name:', 'Untitled', (name) => {
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
                    onClick={onOpenSettings}
                    className="flex items-center gap-3 text-gray-400 hover:text-white w-full px-2 py-2 rounded-md hover:bg-white/5 transition-colors"
                >
                    <Settings size={18} />
                    <span className="text-sm">Settings</span>
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
