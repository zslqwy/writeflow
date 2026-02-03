import { useFileStore } from '../store/useFileStore';

import { cn } from '../lib/utils';
import {
    FileText,
    ChevronRight,
    ChevronDown,
    Plus,
    Search,
    Settings,
    LayoutDashboard,
    Lightbulb
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
const FileTreeItem = ({ nodeId, level = 0 }: { nodeId: string, level?: number }) => {
    const { files, expandedFolders, toggleFolder, openFile, activeFileId } = useFileStore();
    const node = files[nodeId];

    if (!node) return null;
    const isExpanded = expandedFolders.has(nodeId);
    const isActive = activeFileId === nodeId;
    const children = Object.values(files).filter(f => f.parentId === nodeId);
    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition-colors text-sm",
                    isActive ? "bg-accent-primary/20 text-accent-primary" : "hover:bg-white/5 text-gray-400 hover:text-gray-200",
                )}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={() => node.type === 'folder' ? toggleFolder(node.id) : openFile(node.id)}
            >
                <span className="opacity-70">
                    {node.type === 'folder' ? (
                        isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : <FileText size={14} />}
                </span>
                <span className="truncate">{node.name}</span>
            </div>

            {node.type === 'folder' && isExpanded && (
                <div>
                    {children.map(child => (
                        <FileTreeItem key={child.id} nodeId={child.id} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};
export function Sidebar() {
    const { files, createFile } = useFileStore();
    const rootNodes = Object.values(files).filter(f => f.parentId === null);
    return (
        <aside className="w-64 h-screen flex flex-col glass border-r border-white/5 bg-black/40">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/5">
                <h1 className="text-xl font-serif font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
                    ZenFlux
                </h1>
            </div>
            {/* Main Nav */}
            <nav className="p-2 space-y-1">
                <NavLink to="/" className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all",
                    isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                )}>
                    <LayoutDashboard size={18} />
                    Dashboard
                </NavLink>
                <NavLink to="/inspirations" className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all",
                    isActive ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                )}>
                    <Lightbulb size={18} />
                    Inspirations
                </NavLink>
            </nav>
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
                        onClick={() => createFile(null, 'New Folder', 'folder')}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <Plus size={14} />
                    </button>
                </div>

                <div className="space-y-0.5">
                    {rootNodes.map(node => (
                        <FileTreeItem key={node.id} nodeId={node.id} />
                    ))}
                </div>
            </div>
            {/* User / Settings */}
            <div className="p-3 border-t border-white/5">
                <button className="flex items-center gap-3 text-gray-400 hover:text-white w-full px-2 py-2 rounded-md hover:bg-white/5 transition-colors">
                    <Settings size={18} />
                    <span className="text-sm">Settings</span>
                </button>
            </div>
        </aside>
    );
}
