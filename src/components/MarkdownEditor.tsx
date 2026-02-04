import React, { useState, useEffect, useRef } from 'react';
import { Type, Target, ChevronDown, Timer as TimerIcon, Play, Square, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFocusStore } from '../store/useFocusStore';
import { useFileStore, type FileStatus } from '../store/useFileStore';
import { useModalStore } from '../store/useModalStore';

interface MarkdownEditorProps {
    content: string;
    onChange: (content: string) => void;
    fileName: string;
    fileId: string;
}

export function MarkdownEditor({ content, onChange, fileName, fileId }: MarkdownEditorProps) {
    const [value, setValue] = useState(content);
    // Local zen mode state is now redundant if we purely use global focus store,
    // but maybe user wants "UI Zen" without "Timer Focus". 
    // For now, let's link the expand button to the global Focus Mode for consistency as requested.
    // actually, let's keep local "zen" (hides UI) separate or sync? 
    // Requirement said: "Writing can set duration to enter countdown, sidebar hidden".
    // Let's make the previous "Zen Mode" toggler start the Focus Mode setup.

    const { isFocusMode, timerActive, duration, startTime, startFocus, stopFocus } = useFocusStore();
    const { updateFileMetadata, files } = useFileStore();
    const { showPrompt, showSelect } = useModalStore();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');

    const fileNode = files[fileId];
    const metadata = fileNode?.metadata;

    // Timer Logic
    useEffect(() => {
        let interval: any;
        if (timerActive && startTime) {
            interval = setInterval(() => {
                const now = Date.now();
                const elapsedSec = Math.floor((now - startTime) / 1000);
                const totalSec = duration * 60;
                const remaining = totalSec - elapsedSec;

                if (remaining <= 0) {
                    stopFocus();
                    setTimeLeft('00:00');
                    // Play sound?
                } else {
                    const m = Math.floor(remaining / 60);
                    const s = remaining % 60;
                    setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
                }
            }, 1000);
        } else {
            setTimeLeft('');
        }
        return () => clearInterval(interval);
    }, [timerActive, startTime, duration, stopFocus]);

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

        // Update word count in metadata
        const currentCount = countWords(newValue);
        if (metadata?.wordCount !== currentCount) {
            updateFileMetadata(fileId, { wordCount: currentCount });
        }
    };

    // Word count logic for mixed Chinese/English text
    // Chinese characters count as 1 word each, English words separated by spaces
    const countWords = (text: string): number => {
        if (!text.trim()) return 0;

        // Count Chinese characters (CJK range)
        const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;

        // Remove Chinese characters and count remaining words (English/other)
        const nonChinese = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ');
        const englishWords = nonChinese.trim().split(/\s+/).filter(w => w.length > 0).length;

        return chineseChars + englishWords;
    };

    const wordCount = countWords(value);

    // Progress Calculation
    const target = metadata?.targetWordCount || 0;
    const progress = target > 0 ? Math.min(100, Math.round((wordCount / target) * 100)) : 0;

    const handleFocusToggle = () => {
        if (isFocusMode) {
            stopFocus();
        } else {
            // Ask for duration
            showPrompt('Start Focus Session', 'Enter duration in minutes:', '25', (val) => {
                const min = parseInt(val, 10);
                if (!isNaN(min) && min > 0) {
                    startFocus(min);
                }
            });
        }
    };

    const handleStatusClick = () => {
        const options = [
            { id: 'brainstorming', label: '🟡 Brainstorming' },
            { id: 'writing', label: '🔵 Writing' },
            { id: 'completed', label: '🟢 Completed' }
        ];
        showSelect('Set Status', 'Choose file status:', options, (id) => {
            updateFileMetadata(fileId, { status: id as FileStatus });
        });
    };

    return (
        <div className={cn(
            "flex flex-col h-full relative transition-all duration-700",
            isFocusMode ? "bg-[#131316]" : ""
        )}>

            {/* Toolbar - Fades out in Focus Mode, hover to see */}
            <div className={cn(
                "flex items-center justify-between px-8 py-4 border-b border-white/5 transition-opacity duration-500",
                isFocusMode ? "opacity-0 hover:opacity-100 absolute top-0 left-0 right-0 z-50 bg-[#131316]/95 backdrop-blur-md" : "opacity-100"
            )}>
                {/* Left: Title & Status */}
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-serif font-bold text-gray-200">{fileName}</h1>
                    <button
                        onClick={handleStatusClick}
                        className={cn(
                            "text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors",
                            metadata?.status === 'brainstorming' && "bg-yellow-500/20 text-yellow-200 hover:bg-yellow-500/30",
                            metadata?.status === 'writing' && "bg-blue-500/20 text-blue-200 hover:bg-blue-500/30",
                            metadata?.status === 'completed' && "bg-green-500/20 text-green-200 hover:bg-green-500/30",
                            !metadata?.status && "bg-white/5 text-gray-500"
                        )}
                    >
                        {metadata?.status ? metadata.status.charAt(0).toUpperCase() + metadata.status.slice(1) : 'Set Status'}
                        <ChevronDown size={10} />
                    </button>

                    {/* Timer Display */}
                    {timerActive && (
                        <div className="flex items-center gap-2 text-accent-primary font-mono text-sm bg-accent-primary/10 px-3 py-1 rounded-md animate-pulse">
                            <TimerIcon size={14} />
                            <span>{timeLeft}</span>
                        </div>
                    )}
                </div>

                {/* Right: Stats & Controls */}
                <div className="flex items-center gap-4 text-gray-400">
                    {/* Progress */}
                    <div className="flex items-center gap-2 text-xs">
                        {target > 0 ? (
                            <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors" title={`Target: ${target}`} onClick={() => {
                                showPrompt('Update Target', 'Set new word count target:', target.toString(), (val) => {
                                    const num = parseInt(val, 10);
                                    if (!isNaN(num)) updateFileMetadata(fileId, { targetWordCount: num });
                                });
                            }}>
                                <Target size={14} />
                                <span className={progress >= 100 ? "text-green-400" : ""}>
                                    {wordCount} / {target} ({progress}%)
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Type size={14} />
                                <span>{wordCount} words</span>
                            </div>
                        )}
                    </div>

                    {/* Deadline Remaining Days */}
                    {metadata?.deadline && (() => {
                        const now = Date.now();
                        const daysLeft = Math.ceil((metadata.deadline - now) / (1000 * 60 * 60 * 24));
                        return (
                            <div className={cn(
                                "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
                                daysLeft < 0 ? "bg-red-500/10 text-red-400" :
                                    daysLeft <= 3 ? "bg-orange-500/10 text-orange-400" :
                                        "bg-white/5 text-gray-400"
                            )}>
                                <Calendar size={12} />
                                <span>
                                    {daysLeft < 0
                                        ? `Overdue ${Math.abs(daysLeft)}d`
                                        : daysLeft === 0
                                            ? 'Due today'
                                            : `${daysLeft}d left`
                                    }
                                </span>
                            </div>
                        );
                    })()}

                    {/* Goal Settings - More Prominent */}
                    <button
                        onClick={() => {
                            showSelect('Writing Goals', 'Set your writing targets:', [
                                { id: 'target', label: `📊 Word Target ${target > 0 ? `(Current: ${target})` : '(Not set)'}` },
                                { id: 'deadline', label: `📅 Deadline ${metadata?.deadline ? `(${new Date(metadata.deadline).toLocaleDateString()})` : '(Not set)'}` },
                            ], (choice) => {
                                if (choice === 'target') {
                                    showPrompt('Set Word Target', 'Enter your word count goal:', target > 0 ? target.toString() : '500', (val) => {
                                        const num = parseInt(val, 10);
                                        if (!isNaN(num) && num > 0) updateFileMetadata(fileId, { targetWordCount: num });
                                    });
                                } else if (choice === 'deadline') {
                                    const { showDatePicker } = useModalStore.getState();
                                    showDatePicker('Set Deadline', 'Choose your deadline date:',
                                        metadata?.deadline ? new Date(metadata.deadline).toISOString().split('T')[0] : null,
                                        (date) => {
                                            updateFileMetadata(fileId, { deadline: date.getTime() });
                                        });
                                }
                            });
                        }}
                        className={cn(
                            "px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-2 border",
                            (target > 0 || metadata?.deadline)
                                ? "border-accent-primary/30 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20"
                                : "border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                        )}
                    >
                        <Target size={12} />
                        <span>{(target > 0 || metadata?.deadline) ? "Edit Goals" : "Set Goals"}</span>
                    </button>

                    {/* Focus Toggle */}
                    <button
                        onClick={handleFocusToggle}
                        className={cn(
                            "ml-2 p-2 rounded-md transition-colors flex items-center gap-2",
                            isFocusMode
                                ? "text-red-400 hover:bg-red-500/10"
                                : "text-accent-primary hover:bg-white/10"
                        )}
                        title={isFocusMode ? "Stop Focus Session" : "Start Focus Session"}
                    >
                        {isFocusMode ? <Square size={16} fill="currentColor" /> : <Play size={16} />}
                        <span className="text-xs font-semibold">{isFocusMode ? "Stop" : "Focus"}</span>
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
                        isFocusMode ? "text-xl md:text-2xl mt-12" : "text-lg"
                    )}
                    style={{ minHeight: '80vh' }}
                    spellCheck={false}
                />
            </div>

            {/* Simple visual cue for focus mode if user moves mouse away from header */}
            {isFocusMode && (
                <div className="fixed bottom-6 right-6 flex flex-col items-end gap-1 opacity-20 hover:opacity-100 transition-opacity">
                    {timerActive && <span className="text-4xl font-mono text-gray-500">{timeLeft}</span>}
                    <span className="text-xs text-gray-600">Focus Mode Active</span>
                </div>
            )}
        </div>
    );
}