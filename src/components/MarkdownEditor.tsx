import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Type, Target, ChevronDown, Timer as TimerIcon, Play, Square, Calendar, AlignCenter, Search, X, ArrowUp, ArrowDown, Home, History, Save, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useI18n } from '../lib/i18n';
import { countWords } from '../lib/text-stats';
import { useFocusStore } from '../store/useFocusStore';
import { useFileStore, type FileStatus, type FileVersionSnapshot } from '../store/useFileStore';
import { useModalStore } from '../store/useModalStore';
import { useWritingStatsStore } from '../store/useWritingStatsStore';

interface MarkdownEditorProps {
    content: string;
    onChange: (content: string) => void;
    fileName: string;
    fileId: string;
}

export function MarkdownEditor({ content, onChange, fileName, fileId }: MarkdownEditorProps) {
    const [value, setValue] = useState(content);
    const [isTypewriterMode, setIsTypewriterMode] = useState(false);
    const [selectionStart, setSelectionStart] = useState(0);
    const [fileSearchQuery, setFileSearchQuery] = useState('');
    const [fileSearchCursor, setFileSearchCursor] = useState(0);
    const [isSnapshotPanelOpen, setIsSnapshotPanelOpen] = useState(false);
    const navigate = useNavigate();

    const { isFocusMode, timerActive, duration, startTime, startFocus, stopFocus } = useFocusStore();
    const { updateFileMetadata, createFileSnapshot, restoreFileSnapshot, deleteFileSnapshot, files } = useFileStore();
    const { showConfirm, showPrompt, showSelect } = useModalStore();
    const { locale, t } = useI18n();
    const recordWritingDelta = useWritingStatsStore((state) => state.recordWritingDelta);

    const editorViewportRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [currentTime, setCurrentTime] = useState(() => Date.now());

    const fileNode = files[fileId];
    const metadata = fileNode?.metadata;
    const snapshots = fileNode?.versionSnapshots || [];
    const displayedTimeLeft = timerActive ? timeLeft : '';

    // Timer Logic
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
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
        }
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [timerActive, startTime, duration, stopFocus]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 60_000);

        return () => clearInterval(interval);
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }
    }, [value]);

    const focusLines = getFocusLines(value);
    const activeLineIndex = getActiveLineIndex(focusLines, selectionStart);
    const fileSearchMatches = useMemo(
        () => getFileSearchMatches(value, fileSearchQuery),
        [fileSearchQuery, value]
    );
    const activeFileSearchIndex = fileSearchMatches.length > 0
        ? Math.min(fileSearchCursor, fileSearchMatches.length - 1)
        : -1;

    const syncEditorScrollToCaret = useCallback((force = false) => {
        if (!isTypewriterMode && !force) return;

        const mirror = mirrorRef.current;
        const viewport = editorViewportRef.current;
        if (!mirror || !viewport) return;

        const textarea = textareaRef.current;
        const caretPosition = textarea?.selectionStart ?? selectionStart;
        const currentValue = textarea?.value ?? value;
        const beforeCursor = currentValue.slice(0, caretPosition);
        const afterCursor = currentValue.slice(caretPosition);
        const marker = document.createElement('span');
        marker.textContent = '\u200b';
        marker.style.display = 'inline-block';
        marker.style.width = '1px';
        marker.style.height = '1em';
        marker.style.verticalAlign = 'baseline';

        mirror.replaceChildren(
            document.createTextNode(beforeCursor),
            marker,
            document.createTextNode(afterCursor)
        );

        const markerRect = marker.getBoundingClientRect();
        const viewportRect = viewport.getBoundingClientRect();
        const targetScrollTop = Math.max(
            0,
            viewport.scrollTop + markerRect.top + markerRect.height / 2 - viewportRect.top - viewport.clientHeight / 2
        );

        viewport.scrollTo({
            top: targetScrollTop,
            behavior: 'auto',
        });
    }, [isTypewriterMode, selectionStart, value]);

    useEffect(() => {
        syncEditorScrollToCaret();
    }, [syncEditorScrollToCaret]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const previousCount = countWords(value);
        const currentCount = countWords(newValue);

        setValue(newValue);
        setSelectionStart(e.target.selectionStart ?? 0);
        onChange(newValue);

        // Update word count in metadata
        if (metadata?.wordCount !== currentCount) {
            updateFileMetadata(fileId, { wordCount: currentCount });
        }
        if (currentCount > previousCount) {
            recordWritingDelta(currentCount - previousCount);
        }

        requestAnimationFrame(() => syncEditorScrollToCaret());
    };

    const handleSelectionSync = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
        setSelectionStart(event.currentTarget.selectionStart ?? 0);
        requestAnimationFrame(() => syncEditorScrollToCaret());
    };

    const selectSearchMatch = (match: SearchMatch | undefined) => {
        if (!match || !textareaRef.current) return;

        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(match.start, match.end);
        setSelectionStart(match.start);
        requestAnimationFrame(() => syncEditorScrollToCaret(true));
    };

    const handleFileSearchChange = (query: string) => {
        setFileSearchQuery(query);
        setFileSearchCursor(0);

        const [firstMatch] = getFileSearchMatches(value, query);
        requestAnimationFrame(() => selectSearchMatch(firstMatch));
    };

    const handleFileSearchStep = (direction: 'previous' | 'next') => {
        if (fileSearchMatches.length === 0) return;

        const nextIndex = direction === 'next'
            ? (activeFileSearchIndex + 1) % fileSearchMatches.length
            : (activeFileSearchIndex - 1 + fileSearchMatches.length) % fileSearchMatches.length;

        setFileSearchCursor(nextIndex);
        requestAnimationFrame(() => selectSearchMatch(fileSearchMatches[nextIndex]));
    };

    const clearFileSearch = () => {
        setFileSearchQuery('');
        setFileSearchCursor(0);
        textareaRef.current?.focus();
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
            showPrompt(t('editor.startFocus'), t('editor.focusDuration'), '25', (val) => {
                const min = parseInt(val, 10);
                if (!isNaN(min) && min > 0) {
                    startFocus(min);
                }
            });
        }
    };

    const handleStatusClick = () => {
        const options = [
            { id: 'brainstorming', label: `🟡 ${t('editor.statusBrainstorming')}` },
            { id: 'writing', label: `🔵 ${t('editor.statusWriting')}` },
            { id: 'completed', label: `🟢 ${t('editor.statusCompleted')}` }
        ];
        showSelect(t('editor.setStatus'), t('editor.chooseStatus'), options, (id) => {
            updateFileMetadata(fileId, { status: id as FileStatus });
        });
    };

    const handleSaveSnapshot = () => {
        const defaultTitle = `${t('snapshot.defaultTitle')} ${new Date().toLocaleString(locale, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })}`;

        showPrompt(t('snapshot.titlePrompt'), t('snapshot.titlePromptMessage'), defaultTitle, (title) => {
            createFileSnapshot(fileId, title, value);
            setIsSnapshotPanelOpen(true);
        });
    };

    const handleRestoreSnapshot = (snapshot: FileVersionSnapshot) => {
        showConfirm(
            t('snapshot.restoreTitle'),
            t('snapshot.restoreMessage', { title: snapshot.title }),
            () => {
                restoreFileSnapshot(fileId, snapshot.id);
                setValue(snapshot.content);
                setSelectionStart(0);
                requestAnimationFrame(() => {
                    textareaRef.current?.focus();
                    textareaRef.current?.setSelectionRange(0, 0);
                    syncEditorScrollToCaret(true);
                });
            }
        );
    };

    const handleDeleteSnapshot = (snapshot: FileVersionSnapshot) => {
        showConfirm(
            t('snapshot.deleteTitle'),
            t('snapshot.deleteMessage', { title: snapshot.title }),
            () => deleteFileSnapshot(fileId, snapshot.id)
        );
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
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                        title={t('editor.backDashboard')}
                    >
                        <Home size={16} />
                    </button>
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
                        {metadata?.status ? getStatusLabel(metadata.status, t) : t('editor.setStatus')}
                        <ChevronDown size={10} />
                    </button>

                    {/* Timer Display */}
                    {timerActive && (
                        <div className="flex items-center gap-2 text-accent-primary font-mono text-sm bg-accent-primary/10 px-3 py-1 rounded-md animate-pulse">
                            <TimerIcon size={14} />
                            <span>{displayedTimeLeft}</span>
                        </div>
                    )}
                </div>

                {/* Right: Stats & Controls */}
                <div className="flex items-center gap-4 text-gray-400">
                    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                        <Search size={13} className="text-gray-500" />
                        <input
                            value={fileSearchQuery}
                            onChange={(e) => handleFileSearchChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleFileSearchStep(e.shiftKey ? 'previous' : 'next');
                                }
                            }}
                            placeholder={t('editor.findInFile')}
                            className="w-24 bg-transparent text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none"
                        />
                        {fileSearchQuery && (
                            <span className="min-w-9 text-center text-[10px] text-gray-500">
                                {fileSearchMatches.length > 0 ? `${activeFileSearchIndex + 1}/${fileSearchMatches.length}` : '0/0'}
                            </span>
                        )}
                        <button
                            onClick={() => handleFileSearchStep('previous')}
                            disabled={fileSearchMatches.length === 0}
                            className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-30"
                            title={t('editor.previousMatch')}
                        >
                            <ArrowUp size={12} />
                        </button>
                        <button
                            onClick={() => handleFileSearchStep('next')}
                            disabled={fileSearchMatches.length === 0}
                            className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-30"
                            title={t('editor.nextMatch')}
                        >
                            <ArrowDown size={12} />
                        </button>
                        {fileSearchQuery && (
                            <button
                                onClick={clearFileSearch}
                                className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-300"
                                title={t('editor.clearSearch')}
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2 text-xs">
                        {target > 0 ? (
                            <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors" title={`${t('editor.target')}: ${target}`} onClick={() => {
                                showPrompt(t('editor.updateTarget'), t('editor.setNewWordTarget'), target.toString(), (val) => {
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
                                <span>{t('editor.words', { count: wordCount })}</span>
                            </div>
                        )}
                    </div>

                    {/* Deadline Remaining Days */}
                    {metadata?.deadline && (() => {
                        const daysLeft = Math.ceil((metadata.deadline - currentTime) / (1000 * 60 * 60 * 24));
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
                                        ? t('editor.overdue', { count: Math.abs(daysLeft) })
                                        : daysLeft === 0
                                            ? t('editor.dueToday')
                                            : t('editor.daysLeft', { count: daysLeft })
                                    }
                                </span>
                            </div>
                        );
                    })()}

                    {/* Goal Settings - More Prominent */}
                    <button
                        onClick={() => {
                            showSelect(t('editor.writingGoals'), t('editor.setWritingTargets'), [
                                { id: 'target', label: `📊 ${t('editor.wordTarget')} ${target > 0 ? `(${t('common.current')}: ${target})` : `(${t('common.notSet')})`}` },
                                { id: 'deadline', label: `📅 ${t('editor.deadline')} ${metadata?.deadline ? `(${new Date(metadata.deadline).toLocaleDateString(locale)})` : `(${t('common.notSet')})`}` },
                            ], (choice) => {
                                if (choice === 'target') {
                                    showPrompt(t('editor.setWordTarget'), t('editor.enterWordGoal'), target > 0 ? target.toString() : '500', (val) => {
                                        const num = parseInt(val, 10);
                                        if (!isNaN(num) && num > 0) updateFileMetadata(fileId, { targetWordCount: num });
                                    });
                                } else if (choice === 'deadline') {
                                    const { showDatePicker } = useModalStore.getState();
                                    showDatePicker(t('editor.setDeadline'), t('editor.chooseDeadline'),
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
                        <span>{(target > 0 || metadata?.deadline) ? t('editor.editGoals') : t('editor.setGoals')}</span>
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setIsSnapshotPanelOpen((isOpen) => !isOpen)}
                            className={cn(
                                "px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-2 border",
                                isSnapshotPanelOpen
                                    ? "border-amber-300/40 bg-amber-300/15 text-amber-100"
                                    : "border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                            )}
                            title={t('snapshot.panelTitle')}
                        >
                            <History size={13} />
                            <span className="font-semibold">{t('snapshot.button')}</span>
                        </button>

                        {isSnapshotPanelOpen && (
                            <div className="absolute right-0 top-10 z-[80] w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1e]/95 shadow-2xl backdrop-blur-xl">
                                <div className="border-b border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-serif text-lg font-semibold text-white">{t('snapshot.panelTitle')}</h3>
                                            <p className="mt-1 text-xs leading-relaxed text-gray-500">{t('snapshot.panelDescription')}</p>
                                        </div>
                                        <button
                                            onClick={() => setIsSnapshotPanelOpen(false)}
                                            className="rounded-md p-1 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleSaveSnapshot}
                                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300/15 px-3 py-2 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-300/25"
                                    >
                                        <Save size={14} />
                                        {t('snapshot.save')}
                                    </button>
                                </div>

                                <div className="max-h-96 space-y-2 overflow-y-auto p-3 custom-scrollbar">
                                    {snapshots.length > 0 ? (
                                        snapshots.map((snapshot) => (
                                            <div
                                                key={snapshot.id}
                                                className="rounded-2xl border border-white/10 bg-black/20 p-3"
                                            >
                                                <div className="mb-2 flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <h4 className="truncate text-sm font-semibold text-gray-200">{snapshot.title}</h4>
                                                        <p className="mt-1 text-[11px] text-gray-500">
                                                            {t('snapshot.savedAt')} {formatSnapshotTime(snapshot.createdAt, locale)} · {snapshot.wordCount.toLocaleString()} {t('common.words')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="line-clamp-2 text-xs leading-relaxed text-gray-500">
                                                    {getSnapshotPreview(snapshot.content, t('snapshot.previewEmpty'))}
                                                </p>
                                                <div className="mt-3 flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleRestoreSnapshot(snapshot)}
                                                        className="flex items-center gap-1 rounded-lg border border-accent-primary/20 bg-accent-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent-primary transition-colors hover:bg-accent-primary/20"
                                                    >
                                                        <RotateCcw size={12} />
                                                        {t('snapshot.restore')}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSnapshot(snapshot)}
                                                        className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                                                    >
                                                        <Trash2 size={12} />
                                                        {t('snapshot.delete')}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center">
                                            <History size={28} className="mx-auto mb-3 text-amber-200/70" />
                                            <p className="text-sm font-medium text-gray-300">{t('snapshot.empty')}</p>
                                            <p className="mt-2 text-xs leading-relaxed text-gray-600">{t('snapshot.emptyHint')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Focus Toggle */}
                    <button
                        onClick={handleFocusToggle}
                        className={cn(
                            "ml-2 p-2 rounded-md transition-colors flex items-center gap-2",
                            isFocusMode
                                ? "text-red-400 hover:bg-red-500/10"
                                : "text-accent-primary hover:bg-white/10"
                        )}
                        title={isFocusMode ? t('editor.stopFocus') : t('editor.startFocus')}
                    >
                        {isFocusMode ? <Square size={16} fill="currentColor" /> : <Play size={16} />}
                        <span className="text-xs font-semibold">{isFocusMode ? t('editor.stop') : t('editor.focus')}</span>
                    </button>

                    <button
                        onClick={() => {
                            setIsTypewriterMode((prev) => {
                                const next = !prev;
                                if (next) {
                                    requestAnimationFrame(() => syncEditorScrollToCaret(true));
                                }
                                return next;
                            });
                        }}
                        className={cn(
                            "p-2 rounded-md transition-colors flex items-center gap-2 border",
                            isTypewriterMode
                                ? "border-accent-secondary/40 bg-accent-secondary/15 text-accent-secondary"
                                : "border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                        )}
                        title={isTypewriterMode ? t('editor.disableTypewriter') : t('editor.enableTypewriter')}
                    >
                        <AlignCenter size={16} />
                        <span className="text-xs font-semibold">{t('editor.typewriter')}</span>
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div
                ref={editorViewportRef}
                className={cn(
                    "flex-1 overflow-y-auto px-8 py-8 md:px-20 lg:px-32 custom-scrollbar relative",
                    isTypewriterMode && "pt-[45vh] pb-[50vh]"
                )}
            >
                <div className="relative">
                    <div
                        ref={mirrorRef}
                        aria-hidden="true"
                        className={cn(
                            "invisible pointer-events-none absolute inset-0 whitespace-pre-wrap break-words overflow-hidden font-serif leading-relaxed",
                            isFocusMode ? "text-xl md:text-2xl mt-12" : "text-lg"
                        )}
                    />

                    {isFocusMode && (
                        <div
                            aria-hidden="true"
                            className={cn(
                                "absolute inset-0 pointer-events-none whitespace-pre-wrap break-words font-serif leading-relaxed",
                                isFocusMode ? "text-xl md:text-2xl mt-12" : "text-lg"
                            )}
                        >
                            {focusLines.map((line, index) => (
                                <React.Fragment key={`${line.start}-${line.end}-${index}`}>
                                    <span
                                        className={cn(
                                            "transition-colors duration-200",
                                            index === activeLineIndex ? "text-gray-200" : "text-gray-500/40"
                                        )}
                                    >
                                        {line.text || '\u00a0'}
                                    </span>
                                    {line.hasLineBreak && '\n'}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={handleChange}
                        onClick={handleSelectionSync}
                        onKeyUp={handleSelectionSync}
                        onSelect={handleSelectionSync}
                        placeholder={t('editor.placeholder')}
                        className={cn(
                            "w-full bg-transparent border-none focus:outline-none resize-none font-serif leading-relaxed selection:bg-accent-primary/30 overflow-hidden placeholder:text-gray-600",
                            isFocusMode ? "text-xl md:text-2xl mt-12 text-transparent caret-accent-primary relative z-10" : "text-lg text-gray-300",
                            isTypewriterMode && "relative z-10"
                        )}
                        style={{ minHeight: '80vh' }}
                        spellCheck={false}
                    />
                </div>
            </div>

            {/* Simple visual cue for focus mode if user moves mouse away from header */}
            {isFocusMode && (
                <div className="fixed bottom-6 right-6 flex flex-col items-end gap-1 opacity-20 hover:opacity-100 transition-opacity">
                    {timerActive && <span className="text-4xl font-mono text-gray-500">{displayedTimeLeft}</span>}
                    <span className="text-xs text-gray-600">
                        {isTypewriterMode ? t('editor.focusTypewriterActive') : t('editor.focusActive')}
                    </span>
                </div>
            )}
        </div>
    );
}

type FocusLine = {
    text: string;
    start: number;
    end: number;
    hasLineBreak: boolean;
};

type SearchMatch = {
    start: number;
    end: number;
};

function getFocusLines(text: string): FocusLine[] {
    if (!text) {
        return [{ text: '', start: 0, end: 0, hasLineBreak: false }];
    }

    const lines: FocusLine[] = [];
    let lineStart = 0;

    for (let i = 0; i < text.length; i += 1) {
        if (text[i] !== '\n') continue;

        lines.push({
            text: text.slice(lineStart, i),
            start: lineStart,
            end: i,
            hasLineBreak: true,
        });

        lineStart = i + 1;
    }

    lines.push({
        text: text.slice(lineStart),
        start: lineStart,
        end: text.length,
        hasLineBreak: false,
    });

    return lines;
}

function getActiveLineIndex(lines: FocusLine[], caretIndex: number): number {
    const lineIndex = lines.findIndex((line) => caretIndex >= line.start && caretIndex <= line.end);
    return lineIndex >= 0 ? lineIndex : lines.length - 1;
}

function getFileSearchMatches(text: string, query: string): SearchMatch[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];

    const normalizedText = text.toLowerCase();
    const matches: SearchMatch[] = [];
    let startIndex = 0;

    while (startIndex < normalizedText.length) {
        const matchIndex = normalizedText.indexOf(normalizedQuery, startIndex);
        if (matchIndex === -1) break;

        matches.push({
            start: matchIndex,
            end: matchIndex + normalizedQuery.length,
        });

        startIndex = matchIndex + normalizedQuery.length;
    }

    return matches;
}

function getStatusLabel(status: FileStatus, t: ReturnType<typeof useI18n>['t']): string {
    if (status === 'brainstorming') return t('editor.statusBrainstorming');
    if (status === 'writing') return t('editor.statusWriting');
    return t('editor.statusCompleted');
}

function formatSnapshotTime(timestamp: number, locale: string): string {
    return new Date(timestamp).toLocaleString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getSnapshotPreview(content: string, emptyText: string): string {
    const preview = content.trim().replace(/\s+/g, ' ');
    if (!preview) return emptyText;
    return preview.length > 140 ? `${preview.slice(0, 140)}...` : preview;
}
