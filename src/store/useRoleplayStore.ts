import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

import { createIndexedDBStorage } from '../lib/indexeddb-storage';
import type { CreativeScope } from './useCreativeSettingStore';

export type RoleplayMessageRole = 'user' | 'assistant';

export interface RoleplayMessage {
    id: string;
    role: RoleplayMessageRole;
    content: string;
    createdAt: number;
}

export interface RoleplaySession {
    id: string;
    profileKey: string;
    scope: CreativeScope;
    scopeId: string;
    characterId: string;
    characterName: string;
    title: string;
    contextNote: string;
    messages: RoleplayMessage[];
    createdAt: number;
    updatedAt: number;
}

type CreateRoleplaySessionInput = Pick<RoleplaySession, 'profileKey' | 'scope' | 'scopeId' | 'characterId' | 'characterName'> & {
    title?: string;
    contextNote?: string;
};

type UpdateRoleplaySessionInput = Partial<Pick<RoleplaySession, 'title' | 'contextNote' | 'characterName'>>;

interface RoleplayStore {
    sessions: Record<string, RoleplaySession>;
    activeSessionId: string | null;
    createSession: (input: CreateRoleplaySessionInput) => string;
    updateSession: (sessionId: string, updates: UpdateRoleplaySessionInput) => void;
    deleteSession: (sessionId: string) => void;
    setActiveSession: (sessionId: string | null) => void;
    addMessage: (sessionId: string, role: RoleplayMessageRole, content: string) => string | null;
    updateMessage: (sessionId: string, messageId: string, content: string) => void;
    clearMessages: (sessionId: string) => void;
    importSessions: (sessions: Record<string, RoleplaySession>, activeSessionId?: string | null) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isCreativeScope = (value: unknown): value is CreativeScope => {
    return value === 'project' || value === 'folder' || value === 'file';
};

const isRoleplayMessage = (value: unknown): value is RoleplayMessage => {
    return isRecord(value)
        && typeof value.id === 'string'
        && (value.role === 'user' || value.role === 'assistant')
        && typeof value.content === 'string'
        && typeof value.createdAt === 'number';
};

const isRoleplaySession = (value: unknown): value is RoleplaySession => {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.profileKey === 'string'
        && isCreativeScope(value.scope)
        && typeof value.scopeId === 'string'
        && typeof value.characterId === 'string'
        && typeof value.characterName === 'string'
        && typeof value.title === 'string'
        && typeof value.contextNote === 'string'
        && Array.isArray(value.messages)
        && value.messages.every(isRoleplayMessage)
        && typeof value.createdAt === 'number'
        && typeof value.updatedAt === 'number';
};

const normalizeSessions = (sessions: Record<string, RoleplaySession>): Record<string, RoleplaySession> => {
    return Object.fromEntries(
        Object.entries(sessions)
            .filter((entry): entry is [string, RoleplaySession] => isRoleplaySession(entry[1]))
            .map(([id, session]) => [
                id,
                {
                    ...session,
                    id,
                    title: session.title.trim() || session.characterName,
                    messages: [...session.messages].sort((a, b) => a.createdAt - b.createdAt),
                },
            ])
    );
};

const getMostRecentSessionId = (sessions: Record<string, RoleplaySession>): string | null => {
    return Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id || null;
};

export const useRoleplayStore = create<RoleplayStore>()(
    persist(
        (set) => ({
            sessions: {},
            activeSessionId: null,

            createSession: (input) => {
                const id = uuidv4();
                const now = Date.now();
                const title = input.title?.trim() || input.characterName;

                set((state) => ({
                    sessions: {
                        ...state.sessions,
                        [id]: {
                            id,
                            profileKey: input.profileKey,
                            scope: input.scope,
                            scopeId: input.scopeId,
                            characterId: input.characterId,
                            characterName: input.characterName,
                            title,
                            contextNote: input.contextNote?.trim() || '',
                            messages: [],
                            createdAt: now,
                            updatedAt: now,
                        },
                    },
                    activeSessionId: id,
                }));

                return id;
            },

            updateSession: (sessionId, updates) => set((state) => {
                const session = state.sessions[sessionId];
                if (!session) return state;

                return {
                    sessions: {
                        ...state.sessions,
                        [sessionId]: {
                            ...session,
                            ...updates,
                            title: updates.title?.trim() || session.title,
                            contextNote: updates.contextNote ?? session.contextNote,
                            updatedAt: Date.now(),
                        },
                    },
                };
            }),

            deleteSession: (sessionId) => set((state) => {
                const sessions = { ...state.sessions };
                delete sessions[sessionId];

                return {
                    sessions,
                    activeSessionId: state.activeSessionId === sessionId
                        ? getMostRecentSessionId(sessions)
                        : state.activeSessionId,
                };
            }),

            setActiveSession: (sessionId) => set((state) => ({
                activeSessionId: sessionId && state.sessions[sessionId] ? sessionId : null,
            })),

            addMessage: (sessionId, role, content) => {
                const messageId = uuidv4();
                const now = Date.now();

                set((state) => {
                    const session = state.sessions[sessionId];
                    if (!session) return state;

                    return {
                        sessions: {
                            ...state.sessions,
                            [sessionId]: {
                                ...session,
                                messages: [
                                    ...session.messages,
                                    {
                                        id: messageId,
                                        role,
                                        content,
                                        createdAt: now,
                                    },
                                ],
                                updatedAt: now,
                            },
                        },
                    };
                });

                return messageId;
            },

            updateMessage: (sessionId, messageId, content) => set((state) => {
                const session = state.sessions[sessionId];
                if (!session) return state;

                return {
                    sessions: {
                        ...state.sessions,
                        [sessionId]: {
                            ...session,
                            messages: session.messages.map((message) => message.id === messageId
                                ? { ...message, content }
                                : message
                            ),
                            updatedAt: Date.now(),
                        },
                    },
                };
            }),

            clearMessages: (sessionId) => set((state) => {
                const session = state.sessions[sessionId];
                if (!session) return state;

                return {
                    sessions: {
                        ...state.sessions,
                        [sessionId]: {
                            ...session,
                            messages: [],
                            updatedAt: Date.now(),
                        },
                    },
                };
            }),

            importSessions: (sessions, activeSessionId = null) => {
                const normalizedSessions = normalizeSessions(sessions);

                set({
                    sessions: normalizedSessions,
                    activeSessionId: activeSessionId && normalizedSessions[activeSessionId]
                        ? activeSessionId
                        : getMostRecentSessionId(normalizedSessions),
                });
            },
        }),
        {
            name: 'writeflow-roleplay',
            storage: createJSONStorage(() => createIndexedDBStorage()),
        }
    )
);
