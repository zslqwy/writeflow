import { useSettingsStore } from '../store/useSettingsStore';

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIStreamCallbacks {
    onToken?: (token: string) => void;
    onComplete?: (fullText: string) => void;
    onError?: (error: Error) => void;
}

// Build prompt from template
export function buildPrompt(templatePrompt: string, text: string): string {
    return templatePrompt.replace('{text}', text);
}

// Get active model config
function getActiveModelConfig() {
    const state = useSettingsStore.getState();
    const activeModel = state.modelConfigs.find(m => m.id === state.activeModelId);
    if (!activeModel) {
        throw new Error('No active model configured. Please add a model in Settings.');
    }
    if (!activeModel.apiKey) {
        throw new Error('API Key not configured. Please set it in Settings.');
    }
    return activeModel;
}

// Make streaming AI request
export async function streamAIRequest(
    messages: AIMessage[],
    callbacks: AIStreamCallbacks
): Promise<void> {
    try {
        const config = getActiveModelConfig();

        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages,
                stream: true
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `API Error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const json = JSON.parse(data);
                        const token = json.choices?.[0]?.delta?.content || '';
                        if (token) {
                            fullText += token;
                            callbacks.onToken?.(token);
                        }
                    } catch {
                        // Skip invalid JSON
                    }
                }
            }
        }

        callbacks.onComplete?.(fullText);
    } catch (error) {
        callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
}

// Quick helper for template-based requests
export async function aiRequest(
    templateId: string,
    text: string,
    callbacks: AIStreamCallbacks
): Promise<void> {
    const { promptTemplates } = useSettingsStore.getState();
    const template = promptTemplates.find(t => t.id === templateId);

    if (!template) {
        callbacks.onError?.(new Error(`Template "${templateId}" not found`));
        return;
    }

    const prompt = buildPrompt(template.prompt, text);

    await streamAIRequest(
        [
            { role: 'system', content: 'You are a helpful writing assistant.' },
            { role: 'user', content: prompt }
        ],
        callbacks
    );
}

// Test API connection for a specific model config
export async function testModelConnection(modelId: string): Promise<{ success: boolean; message: string }> {
    const { modelConfigs, setModelConnected } = useSettingsStore.getState();
    const config = modelConfigs.find(m => m.id === modelId);

    if (!config) {
        return { success: false, message: 'Model not found' };
    }

    if (!config.apiKey) {
        return { success: false, message: 'API Key not set' };
    }

    try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5
            })
        });

        if (response.ok) {
            setModelConnected(modelId, true);
            return { success: true, message: 'Connected!' };
        } else {
            const error = await response.json().catch(() => ({}));
            setModelConnected(modelId, false);
            return { success: false, message: error.error?.message || `Error: ${response.status}` };
        }
    } catch (error) {
        setModelConnected(modelId, false);
        return { success: false, message: String(error) };
    }
}
