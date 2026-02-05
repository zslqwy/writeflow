import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Store version for migrations
const STORE_VERSION = 2;

// Model configuration
export interface ModelConfig {
    id: string;
    name: string;
    provider: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    isConnected: boolean; // Successfully tested
    enabled: boolean; // User enabled for dropdown
}

// Default model presets
export const MODEL_PRESETS = {
    'chatgpt': {
        name: 'ChatGPT',
        provider: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-5.1', 'gpt-4o']
    },
    'deepseek': {
        name: 'DeepSeek',
        provider: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        models: ['deepseek-chat', 'deepseek-reasoner']
    },
    'moonshot': {
        name: 'Moonshot',
        provider: 'Moonshot',
        baseUrl: 'https://api.moonshot.cn/v1',
        models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']
    }
} as const;

// Default template IDs that cannot be deleted
export const DEFAULT_TEMPLATE_IDS = ['polish', 'check', 'expand', 'name', 'draft', 'suggest', 'inspire', 'research'];

export interface PromptTemplate {
    id: string;
    name: string;
    prompt: string;
    icon?: string;
}

export interface ChatMessage {
    id: string;
    action: string;
    input: string;
    output: string;
    timestamp: number;
}

interface SettingsState {
    // Version for migration
    version: number;

    // Model Configurations
    modelConfigs: ModelConfig[];
    activeModelId: string | null;

    // Prompt Templates
    promptTemplates: PromptTemplate[];

    // Chat History
    chatHistory: ChatMessage[];

    // Actions - Models
    addModelConfig: (config: Omit<ModelConfig, 'id' | 'isConnected'>) => void;
    updateModelConfig: (id: string, updates: Partial<ModelConfig>) => void;
    deleteModelConfig: (id: string) => void;
    setActiveModel: (id: string) => void;
    setModelConnected: (id: string, connected: boolean) => void;
    setModelEnabled: (id: string, enabled: boolean) => void;

    // Actions - Templates
    addTemplate: (template: Omit<PromptTemplate, 'id'>) => void;
    updateTemplate: (id: string, updates: Partial<PromptTemplate>) => void;
    deleteTemplate: (id: string) => void;
    resetTemplates: () => void;

    // Actions - Chat
    addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
    clearChatHistory: () => void;

    // Helpers
    getActiveModel: () => ModelConfig | null;
}

const defaultTemplates: PromptTemplate[] = [
    {
        id: 'polish',
        name: 'Polish',
        prompt: '请润色并改进以下文本，使其更加流畅优雅，同时保留原意：\n\n{{text}}',
        icon: '📝'
    },
    {
        id: 'check',
        name: 'Check',
        prompt: '请检查以下文本的语法、逻辑和一致性问题，并提供改进建议：\n\n{{text}}',
        icon: '✅'
    },
    {
        id: 'expand',
        name: 'Expand',
        prompt: '请扩写以下内容，增加更多细节和描述，使其更加丰富：\n\n{{text}}',
        icon: '📖'
    },
    {
        id: 'name',
        name: 'Name',
        prompt: '根据以下描述，请生成5个合适的名称（可以是角色名、地名、书名等）：\n\n{{text}}',
        icon: '🏷️'
    },
    {
        id: 'draft',
        name: 'Draft',
        prompt: '请根据以下要求创建一个草稿：\n\n{{text}}',
        icon: '✍️'
    },
    {
        id: 'suggest',
        name: 'Suggest',
        prompt: '请针对以下内容提供写作建议和改进方向：\n\n{{text}}',
        icon: '💡'
    },
    {
        id: 'inspire',
        name: 'Inspire',
        prompt: '基于以下主题或关键词，请提供创意灵感和写作思路：\n\n{{text}}',
        icon: '✨'
    },
    {
        id: 'research',
        name: 'Research',
        prompt: '请针对以下主题研究并整理相关资料：\n\n{{text}}',
        icon: '🔍'
    }
];

// Default model configs
const defaultModelConfigs: ModelConfig[] = [
    {
        id: 'default-deepseek',
        name: 'DeepSeek Chat',
        provider: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        apiKey: '',
        model: 'deepseek-chat',
        isConnected: false,
        enabled: true
    }
];

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            version: STORE_VERSION,
            modelConfigs: defaultModelConfigs,
            activeModelId: 'default-deepseek',
            promptTemplates: defaultTemplates,
            chatHistory: [],

            // Model actions
            addModelConfig: (config) => set((state) => ({
                modelConfigs: [
                    ...state.modelConfigs,
                    { ...config, id: `model-${Date.now()}`, isConnected: false, enabled: true }
                ]
            })),

            updateModelConfig: (id, updates) => set((state) => ({
                modelConfigs: state.modelConfigs.map(m =>
                    m.id === id ? { ...m, ...updates } : m
                )
            })),

            deleteModelConfig: (id) => set((state) => ({
                modelConfigs: state.modelConfigs.filter(m => m.id !== id),
                activeModelId: state.activeModelId === id
                    ? (state.modelConfigs[0]?.id || null)
                    : state.activeModelId
            })),

            setActiveModel: (id) => set({ activeModelId: id }),

            setModelConnected: (id, connected) => set((state) => ({
                modelConfigs: state.modelConfigs.map(m =>
                    m.id === id ? { ...m, isConnected: connected } : m
                )
            })),

            setModelEnabled: (id, enabled) => set((state) => ({
                modelConfigs: state.modelConfigs.map(m =>
                    m.id === id ? { ...m, enabled } : m
                )
            })),

            // Template actions
            addTemplate: (template) => set((state) => ({
                promptTemplates: [
                    ...state.promptTemplates,
                    { ...template, id: `custom-${Date.now()}` }
                ]
            })),

            updateTemplate: (id, updates) => set((state) => ({
                promptTemplates: state.promptTemplates.map(t =>
                    t.id === id ? { ...t, ...updates } : t
                )
            })),

            deleteTemplate: (id) => set((state) => ({
                promptTemplates: state.promptTemplates.filter(t => t.id !== id)
            })),

            resetTemplates: () => set((state) => {
                const customTemplates = state.promptTemplates.filter(t => !DEFAULT_TEMPLATE_IDS.includes(t.id));
                return {
                    promptTemplates: [...defaultTemplates, ...customTemplates]
                };
            }),

            // Chat actions
            addChatMessage: (message) => set((state) => ({
                chatHistory: [
                    ...state.chatHistory,
                    { ...message, id: `msg-${Date.now()}`, timestamp: Date.now() }
                ]
            })),

            clearChatHistory: () => set({ chatHistory: [] }),

            // Helpers
            getActiveModel: () => {
                const state = get();
                return state.modelConfigs.find(m => m.id === state.activeModelId) || null;
            }
        }),
        {
            name: 'writeflow-settings-v2',
            // Migration: reset templates on version change
            onRehydrateStorage: () => (state) => {
                if (state && state.version !== STORE_VERSION) {
                    // Version mismatch - reset to defaults
                    state.promptTemplates = defaultTemplates;
                    state.version = STORE_VERSION;
                }
            }
        }
    )
);
