import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
export interface ContextMenuAction {
    label: string;
    icon?: React.ElementType;
    onClick: () => void;
    danger?: boolean;
}
interface ContextMenuProps {
    x: number;
    y: number;
    actions: ContextMenuAction[];
    onClose: () => void;
}
export function ContextMenu({ x, y, actions, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);
    // Adjust position if it goes off screen (basic)
    // detailed positioning logic usually requires measuring screen size

    return (
        <div
            ref={menuRef}
            className="fixed z-50 min-w-[160px] bg-[#1a1a1e]/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: y, left: x }}
        >
            {actions.map((action, index) => (
                <button
                    key={index}
                    onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                        onClose();
                    }}
                    className={cn(
                        "w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-white/10 transition-colors",
                        action.danger ? "text-red-400 hover:text-red-300" : "text-gray-200"
                    )}
                >
                    {action.icon && <action.icon size={14} className="opacity-70" />}
                    {action.label}
                </button>
            ))}
        </div>
    );
}
