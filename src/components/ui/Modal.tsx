import { useState, useEffect, useRef } from 'react';
import { useModalStore, type TreeNode } from '../../store/useModalStore';
import { X, ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { cn } from '../../lib/utils';

// Helper component for recursive tree rendering
const TreeItem = ({ node, onSelect, selectedId, level = 0 }: { node: TreeNode, onSelect: (id: string) => void, selectedId: string | null, level?: number }) => {
    const [isExpanded, setIsExpanded] = useState(true); // Default expanded for easier navigation
    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="select-none">
            <div
                className={cn(
                    "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors text-sm",
                    selectedId === node.id ? "bg-accent-primary/20 text-accent-primary" : "hover:bg-white/5 text-gray-300"
                )}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={() => onSelect(node.id)}
            >
                <div
                    className="p-0.5 rounded-sm hover:bg-white/10"
                    onClick={(e) => {
                        if (hasChildren) {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }
                    }}
                >
                    {hasChildren ? (
                        isExpanded ? <ChevronDown size={14} className="opacity-70" /> : <ChevronRight size={14} className="opacity-70" />
                    ) : <span className="w-[14px] inline-block" />}
                </div>

                <Folder size={14} className="text-accent-primary opacity-80" />
                <span>{node.label}</span>
            </div>

            {hasChildren && isExpanded && (
                <div>
                    {node.children!.map(child => (
                        <TreeItem
                            key={child.id}
                            node={child}
                            onSelect={onSelect}
                            selectedId={selectedId}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export function Modal() {
    const { modal } = useModalStore();
    const [inputValue, setInputValue] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (modal.type === 'prompt' && modal.defaultValue !== undefined) {
            setInputValue(modal.defaultValue);
        }
        // Reset selection when modal opens/changes
        setSelectedId(null);
    }, [modal.type, modal.defaultValue, modal.treeData]);

    useEffect(() => {
        if (modal.type === 'prompt' && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [modal.type]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                modal.onCancel?.();
            }
            if (e.key === 'Enter') {
                if (modal.type === 'prompt') {
                    modal.onConfirm?.(inputValue);
                } else if (modal.type === 'confirm') {
                    modal.onConfirm?.();
                } else if (modal.type === 'tree-select' && selectedId) {
                    modal.onConfirm?.(selectedId);
                }
            }
        };
        if (modal.type) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [modal, inputValue, selectedId]);

    if (!modal.type) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => modal.onCancel?.()}
            />

            {/* Modal */}
            <div
                ref={modalRef}
                className="relative z-10 w-full max-w-md mx-4 bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h3 className="text-lg font-semibold text-white">{modal.title}</h3>
                    <button
                        onClick={() => modal.onCancel?.()}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-gray-300 text-sm mb-4">{modal.message}</p>

                    {modal.type === 'prompt' && (
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-primary/50 transition-colors"
                            placeholder="Enter value..."
                        />
                    )}

                    {modal.type === 'select' && modal.options && (
                        <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                            {modal.options.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => modal.onConfirm?.(option.id)}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-white/10 rounded-md transition-colors"
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {modal.type === 'tree-select' && modal.treeData && (
                        <div className="border border-white/5 rounded-lg bg-black/20 overflow-hidden">
                            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                                {modal.treeData.map(node => (
                                    <TreeItem
                                        key={node.id}
                                        node={node}
                                        onSelect={setSelectedId}
                                        selectedId={selectedId}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {modal.type !== 'select' && (
                    <div className="flex justify-end gap-2 p-4 border-t border-white/5">
                        <button
                            onClick={() => modal.onCancel?.()}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={modal.type === 'tree-select' && !selectedId}
                            onClick={() => {
                                if (modal.type === 'prompt') modal.onConfirm?.(inputValue);
                                else if (modal.type === 'tree-select') modal.onConfirm?.(selectedId);
                                else modal.onConfirm?.();
                            }}
                            className={cn(
                                "px-4 py-2 text-sm text-white rounded-lg transition-colors",
                                (modal.type === 'tree-select' && !selectedId)
                                    ? "bg-white/5 text-gray-500 cursor-not-allowed"
                                    : "bg-accent-primary hover:bg-accent-primary/80"
                            )}
                        >
                            Confirm
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
