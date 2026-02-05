import { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Plus, Trash2, Edit2, Save, Wifi, Server } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useSettingsStore, MODEL_PRESETS, DEFAULT_TEMPLATE_IDS, type PromptTemplate } from '../../store/useSettingsStore';
import { testModelConnection } from '../../services/aiService';
import { cn } from '../../lib/utils';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const {
        modelConfigs, activeModelId, promptTemplates, chatHistory,
        addModelConfig, updateModelConfig, deleteModelConfig, setModelEnabled,
        addTemplate, updateTemplate, deleteTemplate, resetTemplates, clearChatHistory
    } = useSettingsStore();

    const [activeTab, setActiveTab] = useState<'models' | 'templates' | 'history'>('models');

    // Model state
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');

    // Template state
    const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
    const [newTemplate, setNewTemplate] = useState({ name: '', prompt: '', icon: '📋' });

    // Initialize selection
    useEffect(() => {
        if (isOpen && modelConfigs.length > 0 && !selectedModelId) {
            setSelectedModelId(activeModelId || modelConfigs[0].id);
        }
    }, [isOpen, modelConfigs, activeModelId]);

    if (!isOpen) return null;

    const handleTestModel = async (id: string) => {
        setTestStatus('testing');
        const result = await testModelConnection(id);
        setTestStatus(result.success ? 'success' : 'error');
        setTestMessage(result.message);
        setTimeout(() => setTestStatus('idle'), 3000);
    };

    const handleClearHistory = () => {
        if (confirm('Are you sure you want to clear all chat history?')) {
            clearChatHistory();
        }
    };

    const handleAddModel = () => {
        const preset = MODEL_PRESETS['deepseek'];
        addModelConfig({
            name: 'New Model',
            provider: 'DeepSeek',
            baseUrl: preset.baseUrl,
            apiKey: '',
            model: preset.models[0],
            enabled: true
        });
    };

    const activeModelConfig = modelConfigs.find(m => m.id === selectedModelId);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-4xl h-[600px] bg-[#1a1a1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <h2 className="text-lg font-semibold text-white">AI Assistant Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-48 border-r border-white/5 bg-white/[0.02]">
                        <button
                            onClick={() => setActiveTab('models')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                                activeTab === 'models' ? "bg-accent-primary/10 text-accent-primary border-r-2 border-accent-primary" : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Server size={18} /> Models
                        </button>
                        <button
                            onClick={() => setActiveTab('templates')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                                activeTab === 'templates' ? "bg-accent-primary/10 text-accent-primary border-r-2 border-accent-primary" : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Edit2 size={18} /> Templates
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                                activeTab === 'history' ? "bg-accent-primary/10 text-accent-primary border-r-2 border-accent-primary" : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <div className="text-lg">🕒</div> History
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex overflow-hidden">
                        {activeTab === 'models' && (
                            <div className="flex-1 flex">
                                {/* Model List - Flat */}
                                <div className="w-64 border-r border-white/5 p-4 overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center justify-between mb-4 px-2">
                                        <h3 className="text-sm font-medium text-gray-400">Configured Models</h3>
                                        <button
                                            onClick={handleAddModel}
                                            className="p-1 text-accent-primary hover:bg-accent-primary/10 rounded transition-colors"
                                            title="Add New Model"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {modelConfigs.map(config => (
                                            <div
                                                key={config.id}
                                                className={cn(
                                                    "group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border",
                                                    selectedModelId === config.id
                                                        ? "bg-accent-primary/10 border-accent-primary/50"
                                                        : "bg-transparent border-transparent hover:bg-white/5"
                                                )}
                                                onClick={() => setSelectedModelId(config.id)}
                                            >
                                                {/* Toggle */}
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setModelEnabled(config.id, !config.enabled);
                                                    }}
                                                    className={cn(
                                                        "w-8 h-4 rounded-full relative transition-colors flex-shrink-0 cursor-pointer",
                                                        config.enabled ? "bg-accent-primary" : "bg-gray-700"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm",
                                                        config.enabled ? "left-4.5" : "left-0.5"
                                                    )} />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <div className={cn(
                                                            "text-sm font-medium truncate",
                                                            selectedModelId === config.id ? "text-white" : "text-gray-300"
                                                        )}>
                                                            {config.name}
                                                        </div>
                                                        {config.isConnected && <Wifi size={10} className="text-green-400 flex-shrink-0" />}
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-[10px] text-gray-500 truncate">{config.model}</div>
                                                        <div className="text-[10px] text-gray-600 truncate opacity-0 group-hover:opacity-100">{config.provider}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {modelConfigs.length === 0 && (
                                            <div className="text-xs text-gray-600 px-2 italic py-2">No models configured</div>
                                        )}
                                    </div>
                                </div>

                                {/* Model Details */}
                                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                    {activeModelConfig ? (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                                <div>
                                                    <h3 className="text-lg font-medium text-white">{activeModelConfig.name}</h3>
                                                    <p className="text-sm text-gray-500">{activeModelConfig.provider}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Are you sure you want to delete this model configuration?')) {
                                                                deleteModelConfig(activeModelConfig.id);
                                                                setSelectedModelId(null);
                                                            }
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                        title="Delete Configuration"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Name</label>
                                                    <input
                                                        type="text"
                                                        value={activeModelConfig.name}
                                                        onChange={(e) => updateModelConfig(activeModelConfig.id, { name: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-primary/50"
                                                    />
                                                </div>

                                                {/* Provider Preset Selector Removed - Provider is fixed on creation */}

                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Base URL</label>
                                                    <input
                                                        type="text"
                                                        value={activeModelConfig.baseUrl}
                                                        onChange={(e) => updateModelConfig(activeModelConfig.id, { baseUrl: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-primary/50"
                                                    />
                                                </div>



                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">API Key</label>
                                                    <input
                                                        type="password"
                                                        value={activeModelConfig.apiKey}
                                                        onChange={(e) => updateModelConfig(activeModelConfig.id, { apiKey: e.target.value })}
                                                        placeholder="sk-..."
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-primary/50"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm text-gray-400 mb-1">Model Name</label>
                                                    <input
                                                        type="text"
                                                        value={activeModelConfig.model}
                                                        onChange={(e) => updateModelConfig(activeModelConfig.id, { model: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent-primary/50"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">e.g., gpt-4o, deepseek-chat</p>
                                                </div>

                                                <div className="pt-4 border-t border-white/5">
                                                    <button
                                                        onClick={() => handleTestModel(activeModelConfig.id)}
                                                        disabled={testStatus === 'testing' || !activeModelConfig.apiKey}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors disabled:opacity-50"
                                                    >
                                                        {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                                                        {activeModelConfig.isConnected && <Wifi size={14} className="text-green-400" />}
                                                    </button>
                                                    {testMessage && (
                                                        <p className={cn(
                                                            "mt-2 text-sm flex items-center gap-1",
                                                            testStatus === 'success' || (testStatus === 'idle' && activeModelConfig.isConnected) ? "text-green-400" : "text-red-400"
                                                        )}>
                                                            {testStatus === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                                                            {testMessage}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-500">
                                            Select a model to configure
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'templates' && (
                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-medium text-white">Prompt Templates</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={resetTemplates}
                                            className="px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-400/10 rounded-lg border border-orange-400/20 transition-colors"
                                        >
                                            Reset Defaults
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {promptTemplates.map((t) => (
                                        <TemplateItem
                                            key={t.id}
                                            template={t}
                                            isEditing={editingTemplate === t.id}
                                            onEdit={() => setEditingTemplate(t.id)}
                                            onSave={(updates) => {
                                                updateTemplate(t.id, updates);
                                                setEditingTemplate(null);
                                            }}
                                            onCancel={() => setEditingTemplate(null)}
                                            onDelete={() => deleteTemplate(t.id)}
                                        />
                                    ))}
                                </div>

                                {/* Add New Template */}
                                <div className="border-t border-white/5 pt-6 mt-6">
                                    <h4 className="text-sm font-medium text-gray-300 mb-3">Add New Template</h4>
                                    <div className="space-y-4 bg-white/5 p-4 rounded-lg border border-white/5">
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                value={newTemplate.icon}
                                                onChange={(e) => setNewTemplate({ ...newTemplate, icon: e.target.value })}
                                                className="w-12 bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-center text-sm focus:outline-none"
                                                placeholder="📋"
                                            />
                                            <input
                                                type="text"
                                                value={newTemplate.name}
                                                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                                placeholder="Template Name"
                                                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                                            />
                                        </div>
                                        <textarea
                                            value={newTemplate.prompt}
                                            onChange={(e) => setNewTemplate({ ...newTemplate, prompt: e.target.value })}
                                            placeholder="Enter prompt template... Use {text} as placeholder for selected text."
                                            rows={3}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none"
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => {
                                                    if (newTemplate.name && newTemplate.prompt) {
                                                        addTemplate(newTemplate);
                                                        setNewTemplate({ name: '', prompt: '', icon: '📋' });
                                                    }
                                                }}
                                                disabled={!newTemplate.name || !newTemplate.prompt}
                                                className="flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-primary/80 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                <Plus size={16} /> Add Template
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-medium text-white">Chat History</h3>
                                    {chatHistory.length > 0 && (
                                        <button
                                            onClick={handleClearHistory}
                                            className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 rounded-lg border border-red-400/20 transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>

                                {chatHistory.length === 0 ? (
                                    <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
                                        No chat history yet.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {chatHistory.slice().reverse().map((msg) => (
                                            <div key={msg.id} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                                                <div className="flex items-center justify-between text-xs text-gray-500">
                                                    <span className="uppercase font-medium tracking-wider">{msg.action}</span>
                                                    <span>{new Date(msg.timestamp).toLocaleString()}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs text-gray-400 font-medium">Input:</p>
                                                    <p className="text-sm text-gray-300 line-clamp-2">{msg.input}</p>
                                                </div>
                                                <div className="space-y-1 pt-2 border-t border-white/5">
                                                    <p className="text-xs text-accent-primary font-medium">AI Response:</p>
                                                    <div className="text-sm text-gray-200 prose prose-invert prose-sm max-w-none dark:prose-invert">
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
                                                            {msg.output}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Template Item Component
function TemplateItem({
    template,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    onDelete
}: {
    template: PromptTemplate;
    isEditing: boolean;
    onEdit: () => void;
    onSave: (updates: Partial<PromptTemplate>) => void;
    onCancel: () => void;
    onDelete: () => void;
}) {
    const [localName, setLocalName] = useState(template.name);
    const [localPrompt, setLocalPrompt] = useState(template.prompt);
    const [localIcon, setLocalIcon] = useState(template.icon || '📋');

    useEffect(() => {
        setLocalName(template.name);
        setLocalPrompt(template.prompt);
        setLocalIcon(template.icon || '📋');
    }, [template, isEditing]);

    const isDefault = DEFAULT_TEMPLATE_IDS.includes(template.id);

    if (isEditing) {
        return (
            <div className="bg-white/5 rounded-lg p-4 space-y-3 border border-white/10">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={localIcon}
                        onChange={(e) => setLocalIcon(e.target.value)}
                        className="w-12 bg-black/30 border border-white/10 rounded px-2 py-1 text-center text-sm"
                    />
                    <input
                        type="text"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        disabled={isDefault}
                        className={cn(
                            "flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-sm",
                            isDefault && "opacity-50 cursor-not-allowed"
                        )}
                        title={isDefault ? "Default template names cannot be changed" : ""}
                    />
                </div>
                <textarea
                    value={localPrompt}
                    onChange={(e) => setLocalPrompt(e.target.value)}
                    rows={3}
                    className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-sm resize-none"
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="px-3 py-1.5 text-gray-400 hover:text-white text-xs">Cancel</button>
                    <button
                        onClick={() => onSave({ name: localName, prompt: localPrompt, icon: localIcon })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary hover:bg-accent-primary/80 text-white text-xs rounded transition-colors"
                    >
                        <Save size={12} /> Save
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4 bg-white/5 border border-white/5 hover:border-white/10 rounded-lg p-4 group transition-all">
            <span className="text-xl">{template.icon}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-200">{template.name}</p>
                    {isDefault && <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">Default</span>}
                </div>
                <p className="text-xs text-gray-500 truncate">{template.prompt}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                    <Edit2 size={14} />
                </button>
                {!isDefault && (
                    <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded transition-colors">
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}
