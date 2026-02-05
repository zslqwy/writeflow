import { useState, useRef, useEffect, useCallback } from 'react';
import {
    X, Settings, Sparkles, Send, Copy, Check, RefreshCw, GripHorizontal,
    Wand2, CheckCircle, BookOpen, Tag, PenTool, Lightbulb, Zap, Search, FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { useSettingsStore } from '../store/useSettingsStore';
import { aiRequest, streamAIRequest, buildPrompt } from '../services/aiService';

interface AIAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenSettings: () => void;
    selectedText?: string;
    onInsertText?: (text: string) => void;
}

const QUICK_ACTIONS = [
    { id: 'polish', icon: Wand2, label: 'Polish', color: 'text-purple-400' },
    { id: 'check', icon: CheckCircle, label: 'Check', color: 'text-green-400' },
    { id: 'expand', icon: BookOpen, label: 'Expand', color: 'text-blue-400' },
    { id: 'name', icon: Tag, label: 'Name', color: 'text-yellow-400' },
    { id: 'draft', icon: PenTool, label: 'Draft', color: 'text-pink-400' },
    { id: 'suggest', icon: Lightbulb, label: 'Suggest', color: 'text-orange-400' },
    { id: 'inspire', icon: Zap, label: 'Inspire', color: 'text-cyan-400' },
    { id: 'research', icon: Search, label: 'Research', color: 'text-emerald-400' },
];

export function AIAssistant({ isOpen, onClose, onOpenSettings, selectedText, onInsertText }: AIAssistantProps) {
    const { modelConfigs, activeModelId, setActiveModel, promptTemplates, addChatMessage } = useSettingsStore();
    const [input, setInput] = useState('');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);
    const resultRef = useRef<HTMLDivElement>(null);

    // Connected models (those with valid config and enabled)
    const connectedModels = modelConfigs.filter(m => m.enabled);

    // Ensure active model is enabled
    useEffect(() => {
        if (isOpen && connectedModels.length > 0) {
            const isActiveEnabled = connectedModels.some(m => m.id === activeModelId);
            if (!isActiveEnabled) {
                setActiveModel(connectedModels[0].id);
            }
        }
    }, [isOpen, connectedModels, activeModelId, setActiveModel]);

    // Draggable state - use top/left for better control
    const [position, setPosition] = useState({ top: 100, left: window.innerWidth - 420 });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{ startX: number; startY: number; initialTop: number; initialLeft: number } | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Get custom templates (those starting with 'custom-')
    const customTemplates = promptTemplates.filter(t => t.id.startsWith('custom-'));

    // Auto-scroll result
    useEffect(() => {
        if (resultRef.current) {
            resultRef.current.scrollTop = resultRef.current.scrollHeight;
        }
    }, [result]);

    // Reset when closed
    useEffect(() => {
        if (!isOpen) {
            setResult('');
            setError('');
            setActiveAction(null);
            setShowTemplates(false);
        }
    }, [isOpen]);

    // Use selected text
    useEffect(() => {
        if (selectedText && isOpen) {
            setInput(selectedText);
        }
    }, [selectedText, isOpen]);

    // Drag handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialTop: position.top,
            initialLeft: position.left
        };
    }, [position]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !dragRef.current) return;

            const deltaX = e.clientX - dragRef.current.startX;
            const deltaY = e.clientY - dragRef.current.startY;

            // Keep panel within viewport
            const newTop = Math.max(0, Math.min(window.innerHeight - 200, dragRef.current.initialTop + deltaY));
            const newLeft = Math.max(0, Math.min(window.innerWidth - 400, dragRef.current.initialLeft + deltaX));

            setPosition({ top: newTop, left: newLeft });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            dragRef.current = null;
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const checkConfig = () => {
        const activeModel = modelConfigs.find(m => m.id === activeModelId);
        if (!activeModel) return 'No active model selected.';
        if (!activeModel.apiKey) return 'API Key not configured for active model.';
        return null;
    };

    const handleAction = async (actionId: string) => {
        const configError = checkConfig();
        if (configError) {
            setError(configError);
            return;
        }

        const textToProcess = input || selectedText || '';
        if (!textToProcess.trim()) {
            setError('Please enter or select some text first.');
            return;
        }

        setIsLoading(true);
        setError('');
        setResult('');
        setActiveAction(actionId);
        setShowTemplates(false);

        await aiRequest(actionId, textToProcess, {
            onToken: (token) => setResult(prev => prev + token),
            onComplete: (fullText) => {
                setIsLoading(false);
                addChatMessage({ action: actionId, input: textToProcess, output: fullText });
            },
            onError: (err) => {
                setError(err.message);
                setIsLoading(false);
            }
        });
    };

    const handleCustomTemplate = async (templateId: string) => {
        const configError = checkConfig();
        if (configError) {
            setError(configError);
            return;
        }

        const textToProcess = input || selectedText || '';
        if (!textToProcess.trim()) {
            setError('Please enter or select some text first.');
            return;
        }

        const template = promptTemplates.find(t => t.id === templateId);
        if (!template) {
            setError('Template not found.');
            return;
        }

        setIsLoading(true);
        setError('');
        setResult('');
        setActiveAction(templateId);
        setShowTemplates(false);

        const prompt = buildPrompt(template.prompt, textToProcess);

        await streamAIRequest(
            [
                { role: 'system', content: 'You are a helpful writing assistant.' },
                { role: 'user', content: prompt }
            ],
            {
                onToken: (token) => setResult(prev => prev + token),
                onComplete: () => setIsLoading(false),
                onError: (err) => {
                    setError(err.message);
                    setIsLoading(false);
                }
            }
        );
    };

    const handleCustomRequest = async () => {
        const configError = checkConfig();
        if (configError) {
            setError(configError);
            return;
        }

        if (!input.trim()) {
            setError('Please enter your request.');
            return;
        }

        setIsLoading(true);
        setError('');
        setResult('');
        setActiveAction('custom');

        await streamAIRequest(
            [
                { role: 'system', content: 'You are a helpful writing assistant.' },
                { role: 'user', content: input }
            ],
            {
                onToken: (token) => setResult(prev => prev + token),
                onComplete: () => setIsLoading(false),
                onError: (err) => {
                    setError(err.message);
                    setIsLoading(false);
                }
            }
        );
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInsert = () => {
        if (result && onInsertText) {
            onInsertText(result);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            ref={panelRef}
            className="fixed z-[100] w-96 bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{
                top: position.top,
                left: position.left,
                maxHeight: 'min(600px, calc(100vh - 100px))'
            }}
        >
            {/* Header - Draggable */}
            <div
                onMouseDown={handleMouseDown}
                className={cn(
                    "flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10",
                    isDragging ? "cursor-grabbing" : "cursor-grab"
                )}
            >
                <div className="flex items-center gap-2">
                    <GripHorizontal size={14} className="text-gray-500" />
                    <Sparkles size={18} className="text-accent-primary" />
                    <span className="font-medium text-white">AI Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Model Selector */}
                    {connectedModels.length > 0 && (
                        <select
                            value={activeModelId || ''}
                            onChange={(e) => setActiveModel(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-accent-primary/50 max-w-[120px]"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {connectedModels.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={onOpenSettings}
                        className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                        title="Settings"
                    >
                        <Settings size={16} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="p-3 border-b border-white/5">
                <div className="grid grid-cols-4 gap-2">
                    {QUICK_ACTIONS.map(action => (
                        <button
                            key={action.id}
                            onClick={() => handleAction(action.id)}
                            disabled={isLoading}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                                "hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed",
                                activeAction === action.id && isLoading && "bg-white/10"
                            )}
                        >
                            <action.icon size={18} className={action.color} />
                            <span className="text-xs text-gray-300">{action.label}</span>
                        </button>
                    ))}
                </div>

                {/* Custom Templates Toggle */}
                {customTemplates.length > 0 && (
                    <button
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="w-full mt-2 flex items-center justify-center gap-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                    >
                        <FileText size={14} />
                        {showTemplates ? 'Hide' : 'Show'} Custom Templates ({customTemplates.length})
                    </button>
                )}

                {/* Custom Templates List */}
                {showTemplates && customTemplates.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                        {customTemplates.map(template => (
                            <button
                                key={template.id}
                                onClick={() => handleCustomTemplate(template.id)}
                                disabled={isLoading}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
                            >
                                <span>{template.icon || '📋'}</span>
                                <span>{template.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-3 border-b border-white/5">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Enter text or describe what you need..."
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none focus:border-accent-primary/50 resize-none custom-scrollbar"
                    />
                    <button
                        onClick={handleCustomRequest}
                        disabled={isLoading || !input.trim()}
                        className="absolute bottom-2 right-2 p-1.5 text-accent-primary hover:bg-accent-primary/20 rounded-md transition-colors disabled:opacity-50"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>

            {/* Result Area */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-[120px]">
                {error && (
                    <div className="px-4 py-2 bg-red-500/10 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {(result || isLoading) && (
                    <div
                        ref={resultRef}
                        className="flex-1 px-4 py-3 text-sm text-gray-200 overflow-y-auto custom-scrollbar prose prose-invert prose-sm max-w-none dark:prose-invert"
                    >
                        <ReactMarkdown
                            components={{
                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                code: ({ node, className, children, ...props }) => {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return match ? (
                                        <code className={className} {...props}>
                                            {children}
                                        </code>
                                    ) : (
                                        <code className="bg-white/10 rounded px-1 py-0.5" {...props}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {result}
                        </ReactMarkdown>
                        {isLoading && (
                            <span className="inline-block w-2 h-4 bg-accent-primary/70 animate-pulse ml-0.5" />
                        )}
                    </div>
                )}

                {!result && !isLoading && !error && (
                    <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                        Select an action or enter a custom request
                    </div>
                )}
            </div>

            {/* Actions */}
            {result && !isLoading && (
                <div className="flex items-center gap-2 p-3 border-t border-white/5">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                        onClick={() => handleAction(activeAction || 'polish')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                    >
                        <RefreshCw size={14} />
                        Regenerate
                    </button>
                    {onInsertText && (
                        <button
                            onClick={handleInsert}
                            className="ml-auto px-3 py-1.5 text-xs bg-accent-primary hover:bg-accent-primary/80 text-white rounded-md transition-colors"
                        >
                            Insert
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
