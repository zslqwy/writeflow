import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, Clock, Type } from 'lucide-react';
import { cn } from '../lib/utils';
interface MarkdownEditorProps {
    content: string;
    onChange: (content: string) => void;
    fileName: string;
}
export function MarkdownEditor({ content, onChange, fileName }: MarkdownEditorProps) {
    const [value, setValue] = useState(content);
    const [zenMode, setZenMode] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Update local state when prop changes (file switch)
    useEffect(() => {
        setValue(content);
    }, [content]);
    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }
    }, [value]);
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        onChange(newValue);
    };
    const wordCount = value.trim().split(/\s+/).filter(w => w.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200);
    const toggleZenMode = () => {
        setZenMode(!zenMode);
    };
    return (
        <div className={cn("flex flex-col h-full relative transition-all duration-700", zenMode ? "bg-[#0a0a0c]" : "")}>

            {/* Toolbar - Fades out in Zen Mode */}
            <div className={cn(
                "flex items-center justify-between px-8 py-4 border-b border-white/5 transition-opacity duration-500",
                zenMode ? "opacity-0 hover:opacity-100 absolute top-0 left-0 right-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-md" : "opacity-100"
            )}>
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-serif font-bold text-gray-200">{fileName}</h1>
                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Writing</span>
                </div>

                <div className="flex items-center gap-4 text-gray-400">
                    <div className="flex items-center gap-2 text-xs">
                        <Type size={14} />
                        <span>{wordCount} words</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs border-l border-white/10 pl-4">
                        <Clock size={14} />
                        <span>{readingTime} min read</span>
                    </div>

                    <button
                        onClick={toggleZenMode}
                        className="ml-4 p-2 hover:bg-white/10 rounded-md transition-colors text-accent-primary"
                        title={zenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
                    >
                        {zenMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </div>
            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto px-8 py-8 md:px-20 lg:px-32 custom-scrollbar">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleChange}
                    placeholder="Start writing..."
                    className={cn(
                        "w-full bg-transparent border-none focus:outline-none resize-none text-gray-300 font-serif leading-relaxed selection:bg-accent-primary/30",
                        zenMode ? "text-xl md:text-2xl mt-12" : "text-lg"
                    )}
                    style={{ minHeight: '80vh' }}
                    spellCheck={false}
                />
            </div>
            {/* Zen Mode Overlay helper */}
            {zenMode && (
                <div className="fixed bottom-6 right-6 text-gray-600 text-xs opacity-20 hover:opacity-100 transition-opacity">
                    Zen Mode Active. Hover top to exit.
                </div>
            )}
        </div>
    );
}