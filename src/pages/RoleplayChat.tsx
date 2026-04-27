import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
    AlertTriangle,
    BookOpen,
    Bot,
    Globe2,
    MessageCircle,
    Plus,
    Send,
    Sparkles,
    Trash2,
    UserRound,
} from 'lucide-react';

import { useI18n } from '../lib/i18n';
import { cn } from '../lib/utils';
import { streamAIRequest, type AIMessage } from '../services/aiService';
import {
    getCreativeProfileKey,
    type CreativeCharacter,
    type CreativeProfile,
    type CreativeScope,
    type WorldCategory,
    useCreativeSettingStore,
} from '../store/useCreativeSettingStore';
import { useFileStore, type FileNode } from '../store/useFileStore';
import { useModalStore } from '../store/useModalStore';
import { useRoleplayStore, type RoleplayMessage, type RoleplaySession } from '../store/useRoleplayStore';
import { useSettingsStore } from '../store/useSettingsStore';

interface CharacterOption {
    key: string;
    profileKey: string;
    scope: CreativeScope;
    scopeId: string;
    targetLabel: string;
    targetPath: string;
    character: CreativeCharacter;
    profile: CreativeProfile;
}

interface ProfileContext {
    key: string;
    label: string;
    path: string;
    profile: CreativeProfile;
}

export function RoleplayChat() {
    const { files } = useFileStore();
    const { profiles } = useCreativeSettingStore();
    const roleplayStore = useRoleplayStore();
    const { modelConfigs, activeModelId, setActiveModel } = useSettingsStore();
    const { showConfirm } = useModalStore();
    const { locale, t } = useI18n();
    const [selectedOptionKey, setSelectedOptionKey] = useState('');
    const [newContextNote, setNewContextNote] = useState('');
    const [draft, setDraft] = useState('');
    const [streamingText, setStreamingText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const enabledModels = useMemo(
        () => modelConfigs.filter((model) => model.enabled),
        [modelConfigs]
    );
    const characterOptions = useMemo(
        () => getCharacterOptions(profiles, files),
        [files, profiles]
    );
    const sessions = useMemo(
        () => Object.values(roleplayStore.sessions).sort((a, b) => b.updatedAt - a.updatedAt),
        [roleplayStore.sessions]
    );
    const activeSession = roleplayStore.activeSessionId
        ? roleplayStore.sessions[roleplayStore.activeSessionId] || sessions[0] || null
        : sessions[0] || null;
    const selectedOption = characterOptions.find((option) => option.key === selectedOptionKey) || characterOptions[0] || null;
    const activeProfile = activeSession ? profiles[activeSession.profileKey] || null : null;
    const activeCharacter = activeProfile?.characters.find((character) => character.id === activeSession?.characterId) || null;
    const contextChain = useMemo(
        () => activeSession ? getProfileContextChain(files, profiles, activeSession) : [],
        [activeSession, files, profiles]
    );

    useEffect(() => {
        if (!roleplayStore.activeSessionId && sessions[0]) {
            roleplayStore.setActiveSession(sessions[0].id);
        }
    }, [roleplayStore, sessions]);

    useEffect(() => {
        if (enabledModels.length > 0 && activeModelId && !enabledModels.some((model) => model.id === activeModelId)) {
            setActiveModel(enabledModels[0].id);
        }
    }, [activeModelId, enabledModels, setActiveModel]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [activeSession?.messages, streamingText]);

    const handleCreateSession = () => {
        if (!selectedOption) return;

        const sessionId = roleplayStore.createSession({
            profileKey: selectedOption.profileKey,
            scope: selectedOption.scope,
            scopeId: selectedOption.scopeId,
            characterId: selectedOption.character.id,
            characterName: selectedOption.character.name,
            title: `${selectedOption.character.name} - ${selectedOption.targetLabel}`,
            contextNote: newContextNote,
        });

        roleplayStore.setActiveSession(sessionId);
        setNewContextNote('');
        setError('');
    };

    const handleDeleteSession = (session: RoleplaySession) => {
        showConfirm(t('roleplay.deleteSessionTitle'), t('roleplay.deleteSessionMessage', { title: session.title }), () => {
            roleplayStore.deleteSession(session.id);
        });
    };

    const handleSend = async () => {
        if (!activeSession || !activeProfile || !activeCharacter || isSending) return;

        const configError = getModelConfigError(modelConfigs, activeModelId, t);
        if (configError) {
            setError(configError);
            return;
        }

        const content = draft.trim();
        if (!content) return;

        const pendingUserMessage: RoleplayMessage = {
            id: 'pending-user',
            role: 'user',
            content,
            createdAt: Date.now(),
        };
        const systemPrompt = buildRoleplaySystemPrompt({
            session: activeSession,
            character: activeCharacter,
            activeProfile,
            contextChain,
            files,
            t,
        });
        const aiMessages = buildConversationMessages(systemPrompt, [...activeSession.messages, pendingUserMessage]);

        roleplayStore.addMessage(activeSession.id, 'user', content);
        setDraft('');
        setError('');
        setStreamingText('');
        setIsSending(true);

        await streamAIRequest(aiMessages, {
            onToken: (token) => setStreamingText((current) => current + token),
            onComplete: (fullText) => {
                roleplayStore.addMessage(activeSession.id, 'assistant', fullText.trim());
                setStreamingText('');
                setIsSending(false);
            },
            onError: (requestError) => {
                setError(requestError.message);
                setStreamingText('');
                setIsSending(false);
            },
        });
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            void handleSend();
        }
    };

    if (characterOptions.length === 0) {
        return (
            <div className="flex min-h-full items-center justify-center px-6">
                <div className="max-w-xl rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center glass">
                    <Bot size={42} className="mx-auto mb-4 text-accent-primary" />
                    <h2 className="font-serif text-3xl font-semibold text-white">{t('roleplay.emptyTitle')}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-gray-500">{t('roleplay.emptyDescription')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full px-6 py-6 md:px-10">
            <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
                <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-5 glass">
                    <div className="absolute -left-24 top-4 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
                    <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
                    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-accent-primary">
                                <MessageCircle size={14} />
                                {t('roleplay.kicker')}
                            </p>
                            <h2 className="font-serif text-4xl font-bold text-white">{t('roleplay.title')}</h2>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-400">{t('roleplay.description')}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 rounded-3xl border border-white/10 bg-black/20 p-3">
                            <StatPill label={t('roleplay.characters')} value={characterOptions.length} icon={UserRound} />
                            <StatPill label={t('roleplay.sessions')} value={sessions.length} icon={MessageCircle} />
                            <StatPill label={t('roleplay.contexts')} value={Object.keys(profiles).length} icon={BookOpen} />
                        </div>
                    </div>
                </header>

                <div className="grid min-h-[calc(100vh-230px)] gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <aside className="flex min-h-0 flex-col rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 glass">
                        <section className="rounded-3xl border border-white/10 bg-black/20 p-4">
                            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                                <Plus size={16} className="text-accent-primary" />
                                {t('roleplay.newSession')}
                            </div>
                            <div className="space-y-3">
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        {t('roleplay.character')}
                                    </span>
                                    <select
                                        value={selectedOption?.key || ''}
                                        onChange={(event) => setSelectedOptionKey(event.target.value)}
                                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-gray-200 focus:border-accent-primary/50 focus:outline-none"
                                    >
                                        {characterOptions.map((option) => (
                                            <option key={option.key} value={option.key}>
                                                {option.character.name} - {option.targetLabel}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        {t('roleplay.contextNote')}
                                    </span>
                                    <textarea
                                        value={newContextNote}
                                        onChange={(event) => setNewContextNote(event.target.value)}
                                        placeholder={t('roleplay.contextPlaceholder')}
                                        className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm leading-relaxed text-gray-200 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                                    />
                                </label>
                                <button
                                    onClick={handleCreateSession}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80"
                                >
                                    <Plus size={16} />
                                    {t('roleplay.startSession')}
                                </button>
                            </div>
                        </section>

                        <section className="mt-4 flex min-h-0 flex-1 flex-col">
                            <div className="mb-3 flex items-center justify-between gap-3 px-1">
                                <h3 className="font-serif text-2xl font-semibold text-white">{t('roleplay.sessionList')}</h3>
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-gray-500">
                                    {sessions.length}
                                </span>
                            </div>
                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                                {sessions.length > 0 ? (
                                    sessions.map((session) => (
                                        <button
                                            key={session.id}
                                            onClick={() => roleplayStore.setActiveSession(session.id)}
                                            className={cn(
                                                "group w-full rounded-2xl border px-3 py-3 text-left transition-colors",
                                                activeSession?.id === session.id
                                                    ? "border-accent-primary/40 bg-accent-primary/10"
                                                    : "border-white/10 bg-white/[0.03] hover:bg-white/5"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-white">{session.title}</p>
                                                    <p className="mt-1 truncate text-xs text-gray-500">{getTargetDisplay(files, session)}</p>
                                                </div>
                                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-gray-500">
                                                    {session.messages.length}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between gap-2">
                                                <p className="text-[10px] text-gray-600">{formatDateTime(session.updatedAt, locale)}</p>
                                                <span
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleDeleteSession(session);
                                                    }}
                                                    className="rounded-lg p-1 text-gray-600 opacity-0 transition-colors hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                                                    title={t('roleplay.deleteSession')}
                                                >
                                                    <Trash2 size={13} />
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-gray-500">
                                        {t('roleplay.noSessions')}
                                    </div>
                                )}
                            </div>
                        </section>
                    </aside>

                    <main className="flex min-h-0 flex-col rounded-[2rem] border border-white/10 bg-white/[0.03] glass">
                        {activeSession && activeCharacter && activeProfile ? (
                            <>
                                <div className="border-b border-white/10 p-5">
                                    <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
                                        <div className="min-w-0">
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <span className="rounded-full border border-accent-primary/30 bg-accent-primary/10 px-3 py-1 text-xs font-semibold text-accent-primary">
                                                    {activeCharacter.name}
                                                </span>
                                                {activeCharacter.role && (
                                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400">
                                                        {activeCharacter.role}
                                                    </span>
                                                )}
                                            </div>
                                            <input
                                                value={activeSession.title}
                                                onChange={(event) => roleplayStore.updateSession(activeSession.id, { title: event.target.value })}
                                                className="w-full rounded-2xl border border-transparent bg-transparent font-serif text-3xl font-semibold text-white outline-none transition-colors focus:border-white/10 focus:bg-black/20 focus:px-3 focus:py-1.5"
                                            />
                                            <p className="mt-1 text-sm text-gray-500">{getTargetDisplay(files, activeSession)}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {enabledModels.length > 0 && (
                                                <select
                                                    value={activeModelId || ''}
                                                    onChange={(event) => setActiveModel(event.target.value)}
                                                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300 focus:border-accent-primary/50 focus:outline-none"
                                                >
                                                    {enabledModels.map((model) => (
                                                        <option key={model.id} value={model.id}>{model.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                            <button
                                                onClick={() => roleplayStore.clearMessages(activeSession.id)}
                                                disabled={isSending || activeSession.messages.length === 0}
                                                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                <Trash2 size={14} />
                                                {t('roleplay.clearMessages')}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                                        <textarea
                                            value={activeSession.contextNote}
                                            onChange={(event) => roleplayStore.updateSession(activeSession.id, { contextNote: event.target.value })}
                                            placeholder={t('roleplay.sessionContextPlaceholder')}
                                            className="min-h-20 resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-relaxed text-gray-300 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                                        />
                                        <ContextSummary
                                            contextChain={contextChain}
                                            character={activeCharacter}
                                            t={t}
                                        />
                                    </div>
                                </div>

                                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 custom-scrollbar">
                                    {activeSession.messages.length === 0 && !isSending ? (
                                        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] text-center">
                                            <Sparkles size={38} className="mb-4 text-accent-primary" />
                                            <h3 className="font-serif text-2xl font-semibold text-white">{t('roleplay.readyTitle')}</h3>
                                            <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">{t('roleplay.readyDescription')}</p>
                                        </div>
                                    ) : (
                                        activeSession.messages.map((message) => (
                                            <ChatBubble
                                                key={message.id}
                                                message={message}
                                                characterName={activeCharacter.name}
                                                t={t}
                                            />
                                        ))
                                    )}
                                    {isSending && (
                                        <div className="flex justify-start">
                                            <div className="max-w-[78%] rounded-3xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-gray-200">
                                                <p className="mb-1 text-xs font-semibold text-accent-primary">{activeCharacter.name}</p>
                                                <p className="whitespace-pre-wrap">
                                                    {streamingText}
                                                    <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-accent-primary/70 align-middle" />
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {error && (
                                    <div className="border-t border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-300">
                                        {error}
                                    </div>
                                )}

                                <div className="border-t border-white/10 p-4">
                                    <div className="relative">
                                        <textarea
                                            value={draft}
                                            onChange={(event) => setDraft(event.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder={t('roleplay.inputPlaceholder', { name: activeCharacter.name })}
                                            className="min-h-24 w-full resize-none rounded-3xl border border-white/10 bg-black/30 px-4 py-3 pr-14 text-sm leading-relaxed text-gray-200 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                                        />
                                        <button
                                            onClick={() => void handleSend()}
                                            disabled={isSending || !draft.trim()}
                                            className="absolute bottom-3 right-3 rounded-2xl bg-accent-primary p-3 text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
                                            title={t('roleplay.send')}
                                        >
                                            <Send size={18} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center p-8">
                                <div className="max-w-md rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                                    <AlertTriangle size={36} className="mx-auto mb-3 text-amber-300" />
                                    <h3 className="font-serif text-2xl font-semibold text-white">{t('roleplay.missingCharacterTitle')}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-gray-500">{t('roleplay.missingCharacterDescription')}</p>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

function StatPill({ label, value, icon: Icon }: { label: string; value: number; icon: typeof UserRound }) {
    return (
        <div className="min-w-24 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <Icon size={15} className="mb-2 text-accent-primary" />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        </div>
    );
}

function ContextSummary({
    contextChain,
    character,
    t,
}: {
    contextChain: ProfileContext[];
    character: CreativeCharacter;
    t: ReturnType<typeof useI18n>['t'];
}) {
    const worldCount = contextChain.reduce((count, item) => count + item.profile.worldEntries.length, 0);
    const sceneCount = contextChain.reduce((count, item) => count + item.profile.scenes.length, 0);

    return (
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
            <SmallContextStat icon={BookOpen} label={t('roleplay.sceneContext')} value={sceneCount} />
            <SmallContextStat icon={Globe2} label={t('roleplay.worldContext')} value={worldCount} />
            <SmallContextStat icon={UserRound} label={t('roleplay.relationContext')} value={character.relations.length} />
        </div>
    );
}

function SmallContextStat({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: number }) {
    return (
        <div className="rounded-xl bg-white/[0.03] px-2 py-2 text-center">
            <Icon size={14} className="mx-auto mb-1 text-accent-primary" />
            <p className="text-sm font-semibold text-white">{value}</p>
            <p className="truncate text-[10px] text-gray-500">{label}</p>
        </div>
    );
}

function ChatBubble({
    message,
    characterName,
    t,
}: {
    message: RoleplayMessage;
    characterName: string;
    t: ReturnType<typeof useI18n>['t'];
}) {
    const isUser = message.role === 'user';

    return (
        <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[78%] rounded-3xl px-4 py-3 text-sm leading-relaxed",
                    isUser
                        ? "rounded-tr-md bg-accent-primary text-white"
                        : "rounded-tl-md border border-white/10 bg-white/[0.04] text-gray-200"
                )}
            >
                <p className={cn("mb-1 text-xs font-semibold", isUser ? "text-white/70" : "text-accent-primary")}>
                    {isUser ? t('roleplay.you') : characterName}
                </p>
                <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
        </div>
    );
}

function getCharacterOptions(
    profiles: Record<string, CreativeProfile>,
    files: Record<string, FileNode>
): CharacterOption[] {
    return Object.entries(profiles)
        .flatMap(([profileKey, profile]) => {
            const targetLabel = getNodeLabel(files, profile.scopeId);
            const targetPath = getPathLabel(files, profile.scopeId);

            return profile.characters.map((character) => ({
                key: `${profileKey}:${character.id}`,
                profileKey,
                scope: profile.scope,
                scopeId: profile.scopeId,
                targetLabel,
                targetPath,
                character,
                profile,
            }));
        })
        .sort((a, b) => a.targetLabel.localeCompare(b.targetLabel) || a.character.name.localeCompare(b.character.name));
}

function getProfileContextChain(
    files: Record<string, FileNode>,
    profiles: Record<string, CreativeProfile>,
    session: RoleplaySession
): ProfileContext[] {
    const nodes = getNodeChain(files, session.scopeId);
    const chain = nodes
        .map((node) => {
            const scope = getScopeFromNode(node);
            const key = getCreativeProfileKey(scope, node.id);
            const profile = profiles[key];
            if (!profile) return null;

            return {
                key,
                label: node.name,
                path: getPathLabel(files, node.id),
                profile,
            };
        })
        .filter((item): item is ProfileContext => Boolean(item));

    if (!chain.some((item) => item.key === session.profileKey) && profiles[session.profileKey]) {
        chain.push({
            key: session.profileKey,
            label: getNodeLabel(files, session.scopeId),
            path: getPathLabel(files, session.scopeId),
            profile: profiles[session.profileKey],
        });
    }

    return chain;
}

function buildRoleplaySystemPrompt({
    session,
    character,
    activeProfile,
    contextChain,
    files,
    t,
}: {
    session: RoleplaySession;
    character: CreativeCharacter;
    activeProfile: CreativeProfile;
    contextChain: ProfileContext[];
    files: Record<string, FileNode>;
    t: ReturnType<typeof useI18n>['t'];
}): string {
    const relationshipLines = getRelationshipLines(activeProfile, character);
    const contextBlocks = contextChain.map((context) => formatProfileContext(context, character.id, t)).filter(Boolean);
    const manuscriptExcerpt = getManuscriptExcerpt(files, session.scopeId);

    return [
        t('roleplay.systemIntro', { name: character.name }),
        '',
        t('roleplay.systemRules'),
        '',
        `[${t('roleplay.characterProfile')}]
${formatCharacter(character)}`,
        relationshipLines.length > 0
            ? `[${t('roleplay.relationships')}]\n${relationshipLines.join('\n')}`
            : '',
        contextBlocks.length > 0
            ? `[${t('roleplay.storyContext')}]\n${contextBlocks.join('\n\n')}`
            : '',
        session.contextNote.trim()
            ? `[${t('roleplay.sessionContext')}]\n${limitText(session.contextNote.trim(), 1200)}`
            : '',
        manuscriptExcerpt
            ? `[${t('roleplay.manuscriptExcerpt')}]\n${manuscriptExcerpt}`
            : '',
    ].filter(Boolean).join('\n\n');
}

function buildConversationMessages(systemPrompt: string, messages: RoleplayMessage[]): AIMessage[] {
    return [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-20).map((message): AIMessage => ({
            role: message.role,
            content: message.content,
        })),
    ];
}

function formatProfileContext(
    context: ProfileContext,
    selectedCharacterId: string,
    t: ReturnType<typeof useI18n>['t']
): string {
    const profile = context.profile;
    const scenes = profile.scenes
        .filter((scene) => scene.characterIds.length === 0 || scene.characterIds.includes(selectedCharacterId))
        .sort((a, b) => a.order - b.order)
        .slice(0, 8)
        .map((scene) => `- ${scene.title}${scene.timeLabel ? ` / ${scene.timeLabel}` : ''}${scene.location ? ` / ${scene.location}` : ''}: ${limitText([
            scene.summary,
            scene.conflict ? `${t('creative.sceneConflict')}: ${scene.conflict}` : '',
            scene.outcome ? `${t('creative.sceneOutcome')}: ${scene.outcome}` : '',
        ].filter(Boolean).join(' '), 420)}`);
    const worldEntries = profile.worldEntries
        .slice(0, 10)
        .map((entry) => `- [${getWorldCategoryLabel(entry.category, t)}] ${entry.title}: ${limitText(entry.content, 360)}`);
    const otherCharacters = profile.characters
        .filter((character) => character.id !== selectedCharacterId)
        .slice(0, 8)
        .map((character) => `- ${character.name}${character.role ? ` (${character.role})` : ''}: ${limitText(character.description || character.motivation || character.arc, 260)}`);

    return [
        `## ${context.label}${context.path ? ` (${context.path})` : ''}`,
        profile.premise.trim() ? `${t('creative.premise')}: ${limitText(profile.premise.trim(), 900)}` : '',
        profile.outline.trim() ? `${t('creative.outline')}: ${limitText(profile.outline.trim(), 1200)}` : '',
        scenes.length > 0 ? `${t('creative.scenes')}:\n${scenes.join('\n')}` : '',
        worldEntries.length > 0 ? `${t('creative.world')}:\n${worldEntries.join('\n')}` : '',
        otherCharacters.length > 0 ? `${t('creative.characters')}:\n${otherCharacters.join('\n')}` : '',
    ].filter(Boolean).join('\n');
}

function formatCharacter(character: CreativeCharacter): string {
    return [
        `Name: ${character.name}`,
        character.role ? `Role: ${character.role}` : '',
        character.description ? `Profile: ${limitText(character.description, 1000)}` : '',
        character.motivation ? `Motivation: ${limitText(character.motivation, 800)}` : '',
        character.arc ? `Arc: ${limitText(character.arc, 800)}` : '',
    ].filter(Boolean).join('\n');
}

function getRelationshipLines(profile: CreativeProfile, character: CreativeCharacter): string[] {
    const nameById = new globalThis.Map(profile.characters.map((item) => [item.id, item.name]));
    const outgoing = character.relations.map((relation) => (
        `- ${nameById.get(relation.targetCharacterId) || 'Unknown'}: ${relation.type}${relation.note ? ` (${relation.note})` : ''}`
    ));
    const incoming = profile.characters
        .filter((item) => item.id !== character.id)
        .flatMap((item) => item.relations
            .filter((relation) => relation.targetCharacterId === character.id)
            .map((relation) => `- ${item.name}: ${relation.type}${relation.note ? ` (${relation.note})` : ''}`)
        );

    return [...outgoing, ...incoming];
}

function getManuscriptExcerpt(files: Record<string, FileNode>, scopeId: string): string {
    const node = files[scopeId];
    if (node?.type !== 'file' || !node.content?.trim()) return '';
    return limitText(node.content.trim(), 3000);
}

function getModelConfigError(
    modelConfigs: ReturnType<typeof useSettingsStore.getState>['modelConfigs'],
    activeModelId: string | null,
    t: ReturnType<typeof useI18n>['t']
): string {
    const activeModel = modelConfigs.find((model) => model.id === activeModelId);
    if (!activeModel) return t('roleplay.noActiveModel');
    if (!activeModel.apiKey) return t('roleplay.noApiKey');
    return '';
}

function getNodeChain(files: Record<string, FileNode>, nodeId: string): FileNode[] {
    const chain: FileNode[] = [];
    let current: FileNode | undefined = files[nodeId];

    while (current) {
        chain.unshift(current);
        current = current.parentId ? files[current.parentId] : undefined;
    }

    return chain;
}

function getTargetDisplay(files: Record<string, FileNode>, session: RoleplaySession): string {
    const label = getNodeLabel(files, session.scopeId);
    const path = getPathLabel(files, session.scopeId);
    return path ? `${path} / ${label}` : label;
}

function getNodeLabel(files: Record<string, FileNode>, nodeId: string): string {
    return files[nodeId]?.name || nodeId;
}

function getPathLabel(files: Record<string, FileNode>, nodeId: string): string {
    const node = files[nodeId];
    const parts: string[] = [];
    let current = node?.parentId ? files[node.parentId] : null;

    while (current) {
        parts.unshift(current.name);
        current = current.parentId ? files[current.parentId] : null;
    }

    return parts.join(' / ');
}

function getScopeFromNode(node: FileNode): CreativeScope {
    if (node.type === 'file') return 'file';
    return node.parentId === null ? 'project' : 'folder';
}

function getWorldCategoryLabel(category: WorldCategory, t: ReturnType<typeof useI18n>['t']): string {
    if (category === 'rule') return t('creative.worldRule');
    if (category === 'history') return t('creative.worldHistory');
    if (category === 'culture') return t('creative.worldCulture');
    if (category === 'object') return t('creative.worldObject');
    if (category === 'other') return t('creative.worldOther');
    return t('creative.worldPlace');
}

function limitText(text: string, maxLength: number): string {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength)}...`;
}

function formatDateTime(timestamp: number, locale: string): string {
    return new Date(timestamp).toLocaleString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
