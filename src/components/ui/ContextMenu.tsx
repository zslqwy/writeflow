import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    const position = useMemo(() => {
        const estimatedWidth = 170;
        const estimatedHeight = actions.length * 38 + 8;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = x;
        let top = y;

        if (left + estimatedWidth > viewportWidth) {
            left = viewportWidth - estimatedWidth - 10;
        }

        if (top + estimatedHeight > viewportHeight) {
            top = viewportHeight - estimatedHeight - 10;
        }

        return {
            left: Math.max(10, left),
            top: Math.max(10, top),
        };
    }, [actions.length, x, y]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Use Portal to render menu at document.body level (outside any overflow:hidden containers)
    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[9999] min-w-[160px] bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: position.top, left: position.left }}
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
        </div>,
        document.body
    );
}
