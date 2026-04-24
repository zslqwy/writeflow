import { useMemo, useState } from 'react';
import type { Dispatch, ElementType, SetStateAction } from 'react';
import {
    ArrowDown,
    ArrowUp,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Circle,
    FileText,
    Folder,
    Globe2,
    Link2,
    Map as MapIcon,
    Network,
    Plus,
    Search,
    Trash2,
    Users,
} from 'lucide-react';

import { useI18n } from '../lib/i18n';
import { cn } from '../lib/utils';
import {
    createEmptyCreativeProfile,
    getCreativeProfileKey,
    useCreativeSettingStore,
    type CreativeCharacter,
    type CreativeProfile,
    type CreativeScene,
    type CreativeScope,
    type CreativeSettingStore,
    type SceneStatus,
    type WorldCategory,
    type WorldEntry,
} from '../store/useCreativeSettingStore';
import { useFileStore, type FileNode } from '../store/useFileStore';
import { useModalStore } from '../store/useModalStore';

type CreativeTab = 'plot' | 'characters' | 'world';

interface CreativeTarget {
    key: string;
    scope: CreativeScope;
    scopeId: string;
    label: string;
    path: string;
}

interface CharacterRelationshipView {
    id: string;
    ownerCharacterId: string;
    counterpartCharacterId: string;
    counterpartName: string;
    type: string;
    note: string;
}

const SCENE_STATUS_OPTIONS: SceneStatus[] = ['seed', 'draft', 'locked'];
const WORLD_CATEGORY_OPTIONS: WorldCategory[] = ['place', 'rule', 'history', 'culture', 'object', 'other'];

export function CreativeSettings() {
    const { files, activeFileId } = useFileStore();
    const creativeStore = useCreativeSettingStore();
    const { showConfirm } = useModalStore();
    const { locale, t } = useI18n();
    const [selectedTargetKey, setSelectedTargetKey] = useState<string | null>(null);
    const [targetSearch, setTargetSearch] = useState('');
    const [activeTab, setActiveTab] = useState<CreativeTab>('plot');
    const [relationDraft, setRelationDraft] = useState({ sourceId: '', targetId: '', type: '', note: '' });
    const [creativeExpandedFolders, setCreativeExpandedFolders] = useState<Set<string>>(() => new Set(
        Object.values(files)
            .filter((node) => node.type === 'folder' && node.parentId === null)
            .map((node) => node.id)
    ));

    const rootNodes = useMemo(
        () => Object.values(files).filter((node) => node.parentId === null).sort(sortFileNodes),
        [files]
    );
    const targets = useMemo(
        () => Object.values(files).map((node) => createTargetFromNode(node, files)),
        [files]
    );
    const visibleNodeIds = useMemo(
        () => buildVisibleNodeSet(files, targetSearch),
        [files, targetSearch]
    );
    const preferredTarget = useMemo(
        () => getPreferredTarget(targets, activeFileId),
        [activeFileId, targets]
    );
    const selectedTarget = targets.find((target) => target.key === selectedTargetKey) || preferredTarget || targets[0] || null;
    const profile = selectedTarget
        ? creativeStore.profiles[selectedTarget.key] || createEmptyCreativeProfile(selectedTarget.scope, selectedTarget.scopeId)
        : null;
    const effectiveTab: CreativeTab = activeTab;
    const effectiveExpandedFolders = useMemo(
        () => getEffectiveExpandedFolders(files, creativeExpandedFolders, selectedTarget?.scopeId || null, targetSearch, visibleNodeIds),
        [files, creativeExpandedFolders, selectedTarget?.scopeId, targetSearch, visibleNodeIds]
    );
    const characterMap = useMemo(
        () => new globalThis.Map((profile?.characters || []).map((character) => [character.id, character])),
        [profile?.characters]
    );
    const characterRelationships = useMemo(
        () => getCharacterRelationships(profile?.characters || []),
        [profile?.characters]
    );
    const totalRelations = profile?.characters.reduce((count, character) => count + character.relations.length, 0) || 0;

    const handleProfileUpdate = (updates: Partial<Pick<CreativeProfile, 'premise' | 'outline'>>) => {
        if (!selectedTarget) return;
        creativeStore.updateProfile(selectedTarget.scope, selectedTarget.scopeId, updates);
    };

    const handleToggleCreativeFolder = (folderId: string) => {
        setCreativeExpandedFolders((current) => {
            const next = new Set(current);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    const handleAddScene = () => {
        if (!selectedTarget) return;
        creativeStore.addScene(selectedTarget.scope, selectedTarget.scopeId, t('creative.newScene'));
        setActiveTab('plot');
    };

    const handleAddCharacter = () => {
        if (!selectedTarget) return;
        creativeStore.addCharacter(selectedTarget.scope, selectedTarget.scopeId, t('creative.newCharacter'));
        setActiveTab('characters');
    };

    const handleAddWorldEntry = () => {
        if (!selectedTarget) return;
        creativeStore.addWorldEntry(selectedTarget.scope, selectedTarget.scopeId, t('creative.newWorldEntry'));
        setActiveTab('world');
    };

    const handleDeleteScene = (scene: CreativeScene) => {
        if (!selectedTarget) return;
        showConfirm(t('creative.deleteSceneTitle'), t('creative.deleteSceneMessage', { title: scene.title }), () => {
            creativeStore.deleteScene(selectedTarget.scope, selectedTarget.scopeId, scene.id);
        });
    };

    const handleDeleteCharacter = (character: CreativeCharacter) => {
        if (!selectedTarget) return;
        showConfirm(t('creative.deleteCharacterTitle'), t('creative.deleteCharacterMessage', { name: character.name }), () => {
            creativeStore.deleteCharacter(selectedTarget.scope, selectedTarget.scopeId, character.id);
        });
    };

    const handleDeleteWorldEntry = (entry: WorldEntry) => {
        if (!selectedTarget) return;
        showConfirm(t('creative.deleteWorldTitle'), t('creative.deleteWorldMessage', { title: entry.title }), () => {
            creativeStore.deleteWorldEntry(selectedTarget.scope, selectedTarget.scopeId, entry.id);
        });
    };

    const handleAddRelation = () => {
        if (!selectedTarget || !profile) return;

        const sourceId = relationDraft.sourceId || profile.characters[0]?.id || '';
        const targetId = relationDraft.targetId || profile.characters.find((character) => character.id !== sourceId)?.id || '';
        const relationId = creativeStore.addRelation(
            selectedTarget.scope,
            selectedTarget.scopeId,
            sourceId,
            targetId,
            relationDraft.type,
            relationDraft.note
        );

        if (relationId) {
            setRelationDraft({ sourceId, targetId: '', type: '', note: '' });
        }
    };

    if (!selectedTarget || !profile) {
        return (
            <div className="flex min-h-full items-center justify-center px-6">
                <div className="max-w-lg rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center glass">
                    <MapIcon size={42} className="mx-auto mb-4 text-accent-primary" />
                    <h2 className="font-serif text-3xl font-semibold text-white">{t('creative.emptyTitle')}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-gray-500">{t('creative.emptyDescription')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full px-6 pt-5 pb-8 md:px-10">
            <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
                <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 pt-5 pb-6 glass">
                    <div className="absolute -left-20 top-8 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
                    <div className="absolute -right-24 -top-20 h-60 w-60 rounded-full bg-accent-primary/15 blur-3xl" />
                    <div className="absolute bottom-0 right-12 h-px w-1/2 bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-accent-primary">
                                <MapIcon size={14} />
                                {t('creative.kicker')}
                            </p>
                            <h2 className="font-serif text-4xl font-bold text-white">{t('creative.title')}</h2>
                            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-400">{t('creative.description')}</p>
                        </div>

                        <div
                            className={cn(
                                "grid gap-3 rounded-3xl border border-white/10 bg-black/20 p-3",
                                "grid-cols-3"
                            )}
                        >
                            <StatCard label={t('creative.scenes')} value={profile.scenes.length} icon={BookOpen} />
                            <StatCard label={t('creative.characters')} value={profile.characters.length} icon={Users} />
                            <StatCard label={t('creative.world')} value={profile.worldEntries.length} icon={Globe2} />
                        </div>
                    </div>
                </header>

                <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <aside className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 glass">
                        <div className="mb-4">
                            <h3 className="font-serif text-2xl font-semibold text-white">{t('creative.contextBrowser')}</h3>
                            <p className="mt-1 text-xs leading-relaxed text-gray-500">{t('creative.contextHint')}</p>
                        </div>

                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-3 text-gray-500" size={15} />
                            <input
                                value={targetSearch}
                                onChange={(event) => setTargetSearch(event.target.value)}
                                placeholder={t('creative.searchContext')}
                                className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-gray-200 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                            />
                        </div>

                        <div className="max-h-[calc(100vh-310px)] overflow-y-auto pr-1 custom-scrollbar">
                            {rootNodes.some((node) => visibleNodeIds.has(node.id)) ? (
                                <div className="space-y-0.5">
                                    {rootNodes.map((node) => (
                                        <CreativeTreeItem
                                            key={node.id}
                                            nodeId={node.id}
                                            level={0}
                                            files={files}
                                            visibleNodeIds={visibleNodeIds}
                                            selectedKey={selectedTarget.key}
                                            profiles={creativeStore.profiles}
                                            expandedFolders={effectiveExpandedFolders}
                                            onToggleFolder={handleToggleCreativeFolder}
                                            onSelectTarget={(target) => setSelectedTargetKey(target.key)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-gray-500">
                                    {t('creative.noContextMatches')}
                                </div>
                            )}
                        </div>
                    </aside>

                    <main className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 glass">
                        <section className="mb-5 rounded-3xl border border-white/10 bg-black/20 p-5">
                            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
                                        {getScopeIcon(selectedTarget.scope)}
                                        {getScopeLabel(selectedTarget.scope, t)}
                                    </p>
                                    <h3 className="font-serif text-3xl font-semibold text-white">{selectedTarget.label}</h3>
                                    <p className="mt-1 text-sm text-gray-500">{selectedTarget.path || t('creative.rootContext')}</p>
                                </div>
                                <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-500">
                                    {t('creative.updated')} {formatDateTime(profile.updatedAt, locale)}
                                </p>
                            </div>

                            <div className="grid gap-3 lg:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('creative.premise')}</span>
                                    <textarea
                                        value={profile.premise}
                                        onChange={(event) => handleProfileUpdate({ premise: event.target.value })}
                                        placeholder={getPremisePlaceholder(selectedTarget.scope, t)}
                                        className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-gray-200 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">{t('creative.outline')}</span>
                                    <textarea
                                        value={profile.outline}
                                        onChange={(event) => handleProfileUpdate({ outline: event.target.value })}
                                        placeholder={getOutlinePlaceholder(selectedTarget.scope, t)}
                                        className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-gray-200 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                                    />
                                </label>
                            </div>
                        </section>

                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex rounded-2xl bg-white/5 p-1">
                                <TabButton active={effectiveTab === 'plot'} icon={BookOpen} label={t('creative.plotTab')} onClick={() => setActiveTab('plot')} />
                                <TabButton
                                    active={effectiveTab === 'characters'}
                                    icon={Users}
                                    label={t('creative.characterTab')}
                                    onClick={() => setActiveTab('characters')}
                                />
                                <TabButton
                                    active={effectiveTab === 'world'}
                                    icon={Globe2}
                                    label={t('creative.worldTab')}
                                    onClick={() => setActiveTab('world')}
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <ActionButton label={t('creative.addScene')} icon={BookOpen} onClick={handleAddScene} />
                                <ActionButton
                                    label={t('creative.addCharacter')}
                                    icon={Users}
                                    onClick={handleAddCharacter}
                                />
                                <ActionButton
                                    label={t('creative.addWorldEntry')}
                                    icon={Globe2}
                                    onClick={handleAddWorldEntry}
                                />
                            </div>
                        </div>

                        {effectiveTab === 'plot' && (
                            <PlotTimeline
                                profile={profile}
                                selectedTarget={selectedTarget}
                                characterMap={characterMap}
                                store={creativeStore}
                                onDeleteScene={handleDeleteScene}
                                t={t}
                            />
                        )}

                        {effectiveTab === 'characters' && (
                            <CharacterPanel
                                profile={profile}
                                selectedTarget={selectedTarget}
                                characterRelationships={characterRelationships}
                                relationDraft={relationDraft}
                                setRelationDraft={setRelationDraft}
                                store={creativeStore}
                                totalRelations={totalRelations}
                                onAddRelation={handleAddRelation}
                                onDeleteCharacter={handleDeleteCharacter}
                                t={t}
                            />
                        )}

                        {effectiveTab === 'world' && (
                            <WorldPanel
                                profile={profile}
                                selectedTarget={selectedTarget}
                                store={creativeStore}
                                onDeleteWorldEntry={handleDeleteWorldEntry}
                                t={t}
                            />
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

interface CreativeTreeItemProps {
    nodeId: string;
    level: number;
    files: Record<string, FileNode>;
    visibleNodeIds: Set<string>;
    selectedKey: string;
    profiles: Record<string, CreativeProfile>;
    expandedFolders: Set<string>;
    onToggleFolder: (folderId: string) => void;
    onSelectTarget: (target: CreativeTarget) => void;
}

function CreativeTreeItem({
    nodeId,
    level,
    files,
    visibleNodeIds,
    selectedKey,
    profiles,
    expandedFolders,
    onToggleFolder,
    onSelectTarget,
}: CreativeTreeItemProps) {
    if (!visibleNodeIds.has(nodeId)) return null;

    const node = files[nodeId];
    if (!node) return null;

    const target = createTargetFromNode(node, files);
    const isFolder = node.type === 'folder';
    const isExpanded = isFolder && expandedFolders.has(nodeId);
    const isSelected = selectedKey === target.key;
    const hasContent = hasProfileContent(profiles[target.key]);
    const children = Object.values(files).filter((item) => item.parentId === nodeId).sort(sortFileNodes);

    return (
        <div>
            <div className="flex items-center gap-1">
                {isFolder ? (
                    <button
                        onClick={() => onToggleFolder(nodeId)}
                        className="rounded-md p-1 text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
                        style={{ marginLeft: `${level * 12}px` }}
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : (
                    <span style={{ marginLeft: `${level * 12 + 24}px` }} />
                )}

                <button
                    onClick={() => onSelectTarget(target)}
                    className={cn(
                        "flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-left text-sm transition-all",
                        isSelected
                            ? "bg-accent-primary/15 text-white"
                            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    )}
                >
                    <span className="shrink-0 text-gray-500">{getScopeIcon(target.scope)}</span>
                    <span className="min-w-0 flex-1 truncate">{node.name}</span>
                    {hasContent ? <CheckCircle2 size={14} className="shrink-0 text-emerald-300" /> : <Circle size={12} className="shrink-0 text-gray-600" />}
                </button>
            </div>

            {isFolder && isExpanded && children.length > 0 && (
                <div>
                    {children.map((child) => (
                        <CreativeTreeItem
                            key={child.id}
                            nodeId={child.id}
                            level={level + 1}
                            files={files}
                            visibleNodeIds={visibleNodeIds}
                            selectedKey={selectedKey}
                            profiles={profiles}
                            expandedFolders={expandedFolders}
                            onToggleFolder={onToggleFolder}
                            onSelectTarget={onSelectTarget}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface PlotTimelineProps {
    profile: CreativeProfile;
    selectedTarget: CreativeTarget;
    characterMap: globalThis.Map<string, CreativeCharacter>;
    store: CreativeSettingStore;
    onDeleteScene: (scene: CreativeScene) => void;
    t: ReturnType<typeof useI18n>['t'];
}

function PlotTimeline({ profile, selectedTarget, characterMap, store, onDeleteScene, t }: PlotTimelineProps) {
    const scenes = [...profile.scenes].sort((a, b) => a.order - b.order);

    if (scenes.length === 0) {
        return (
            <EmptyPanel
                icon={BookOpen}
                title={t('creative.emptyScenesTitle')}
                description={t('creative.emptyScenesDescription')}
            />
        );
    }

    return (
        <section className="relative space-y-4 pl-5">
            <div className="absolute bottom-6 left-2 top-6 w-px bg-gradient-to-b from-accent-primary/60 via-white/10 to-transparent" />
            {scenes.map((scene, index) => (
                <article key={scene.id} className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="absolute -left-[1.55rem] top-6 flex h-7 w-7 items-center justify-center rounded-full border border-accent-primary/50 bg-[#111317] text-[10px] font-bold text-accent-primary shadow-[0_0_24px_rgba(6,182,212,0.22)]">
                        {index + 1}
                    </div>
                    <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_170px_170px]">
                            <input
                                value={scene.title}
                                onChange={(event) => store.updateScene(selectedTarget.scope, selectedTarget.scopeId, scene.id, { title: event.target.value })}
                                className="min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 font-serif text-xl font-semibold text-white focus:border-accent-primary/50 focus:outline-none"
                                placeholder={t('creative.sceneTitle')}
                            />
                            <input
                                value={scene.timeLabel}
                                onChange={(event) => store.updateScene(selectedTarget.scope, selectedTarget.scopeId, scene.id, { timeLabel: event.target.value })}
                                className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                                placeholder={t('creative.sceneTime')}
                            />
                            <input
                                value={scene.location}
                                onChange={(event) => store.updateScene(selectedTarget.scope, selectedTarget.scopeId, scene.id, { location: event.target.value })}
                                className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                                placeholder={t('creative.sceneLocation')}
                            />
                        </div>
                        <div className="flex shrink-0 gap-1">
                            <button
                                onClick={() => store.moveScene(selectedTarget.scope, selectedTarget.scopeId, scene.id, -1)}
                                disabled={index === 0}
                                className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                title={t('creative.moveUp')}
                            >
                                <ArrowUp size={15} />
                            </button>
                            <button
                                onClick={() => store.moveScene(selectedTarget.scope, selectedTarget.scopeId, scene.id, 1)}
                                disabled={index === scenes.length - 1}
                                className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                title={t('creative.moveDown')}
                            >
                                <ArrowDown size={15} />
                            </button>
                            <button
                                onClick={() => onDeleteScene(scene)}
                                className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
                                title={t('creative.deleteScene')}
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <select
                            value={scene.status}
                            onChange={(event) => store.updateScene(selectedTarget.scope, selectedTarget.scopeId, scene.id, { status: event.target.value as SceneStatus })}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300 focus:border-accent-primary/50 focus:outline-none"
                        >
                            {SCENE_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>{getSceneStatusLabel(status, t)}</option>
                            ))}
                        </select>
                        {scene.characterIds
                            .map((characterId) => characterMap.get(characterId))
                            .filter((character): character is CreativeCharacter => Boolean(character))
                            .map((character) => (
                                <button
                                    key={character.id}
                                    onClick={() => store.updateScene(selectedTarget.scope, selectedTarget.scopeId, scene.id, {
                                        characterIds: scene.characterIds.filter((id) => id !== character.id),
                                    })}
                                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-red-400/30 hover:text-red-300"
                                >
                                    {character.name}
                                </button>
                            ))}
                        <select
                            value=""
                            onChange={(event) => {
                                const characterId = event.target.value;
                                if (!characterId) return;
                                store.updateScene(selectedTarget.scope, selectedTarget.scopeId, scene.id, {
                                    characterIds: Array.from(new Set([...scene.characterIds, characterId])),
                                });
                            }}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400 focus:border-accent-primary/50 focus:outline-none"
                        >
                            <option value="">{t('creative.addCharacterToScene')}</option>
                            {profile.characters
                                .filter((character) => !scene.characterIds.includes(character.id))
                                .map((character) => (
                                    <option key={character.id} value={character.id}>{character.name}</option>
                                ))}
                        </select>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-3">
                        <LabeledTextarea
                            label={t('creative.sceneSummary')}
                            value={scene.summary}
                            placeholder={t('creative.sceneSummaryPlaceholder')}
                            onChange={(value) => store.updateScene(selectedTarget.scope, selectedTarget.scopeId, scene.id, { summary: value })}
                        />
                        <LabeledTextarea
                            label={t('creative.sceneConflict')}
                            value={scene.conflict}
                            placeholder={t('creative.sceneConflictPlaceholder')}
                            onChange={(value) => store.updateScene(selectedTarget.scope, selectedTarget.scopeId, scene.id, { conflict: value })}
                        />
                        <LabeledTextarea
                            label={t('creative.sceneOutcome')}
                            value={scene.outcome}
                            placeholder={t('creative.sceneOutcomePlaceholder')}
                            onChange={(value) => store.updateScene(selectedTarget.scope, selectedTarget.scopeId, scene.id, { outcome: value })}
                        />
                    </div>
                </article>
            ))}
        </section>
    );
}

interface CharacterPanelProps {
    profile: CreativeProfile;
    selectedTarget: CreativeTarget;
    characterRelationships: Record<string, CharacterRelationshipView[]>;
    relationDraft: { sourceId: string; targetId: string; type: string; note: string };
    setRelationDraft: Dispatch<SetStateAction<{ sourceId: string; targetId: string; type: string; note: string }>>;
    store: CreativeSettingStore;
    totalRelations: number;
    onAddRelation: () => void;
    onDeleteCharacter: (character: CreativeCharacter) => void;
    t: ReturnType<typeof useI18n>['t'];
}

function CharacterPanel({
    profile,
    selectedTarget,
    characterRelationships,
    relationDraft,
    setRelationDraft,
    store,
    totalRelations,
    onAddRelation,
    onDeleteCharacter,
    t,
}: CharacterPanelProps) {
    if (profile.characters.length === 0) {
        return (
            <EmptyPanel
                icon={Users}
                title={t('creative.emptyCharactersTitle')}
                description={t('creative.emptyCharactersDescription')}
            />
        );
    }

    const sourceId = relationDraft.sourceId || profile.characters[0]?.id || '';

    return (
        <section className="space-y-5">
            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
                <RelationshipList
                    characters={profile.characters}
                    relationshipMap={characterRelationships}
                    totalRelations={totalRelations}
                    t={t}
                />
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                        <Link2 size={16} className="text-accent-primary" />
                        {t('creative.addRelation')}
                    </div>
                    <div className="space-y-2">
                        <select
                            value={sourceId}
                            onChange={(event) => setRelationDraft((draft) => ({ ...draft, sourceId: event.target.value }))}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 focus:border-accent-primary/50 focus:outline-none"
                        >
                            {profile.characters.map((character) => (
                                <option key={character.id} value={character.id}>{character.name}</option>
                            ))}
                        </select>
                        <select
                            value={relationDraft.targetId}
                            onChange={(event) => setRelationDraft((draft) => ({ ...draft, targetId: event.target.value }))}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 focus:border-accent-primary/50 focus:outline-none"
                        >
                            <option value="">{t('creative.relationTarget')}</option>
                            {profile.characters
                                .filter((character) => character.id !== sourceId)
                                .map((character) => (
                                    <option key={character.id} value={character.id}>{character.name}</option>
                                ))}
                        </select>
                        <input
                            value={relationDraft.type}
                            onChange={(event) => setRelationDraft((draft) => ({ ...draft, type: event.target.value }))}
                            placeholder={t('creative.relationType')}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                        />
                        <textarea
                            value={relationDraft.note}
                            onChange={(event) => setRelationDraft((draft) => ({ ...draft, note: event.target.value }))}
                            placeholder={t('creative.relationNote')}
                            className="min-h-20 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                        />
                        <button
                            onClick={onAddRelation}
                            disabled={!relationDraft.type.trim() || profile.characters.length < 2}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Plus size={15} />
                            {t('creative.addRelation')}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                {profile.characters.map((character) => (
                    <CharacterCard
                        key={character.id}
                        character={character}
                        relationships={characterRelationships[character.id] || []}
                        selectedTarget={selectedTarget}
                        store={store}
                        onDelete={() => onDeleteCharacter(character)}
                        t={t}
                    />
                ))}
            </div>
        </section>
    );
}

interface CharacterCardProps {
    character: CreativeCharacter;
    relationships: CharacterRelationshipView[];
    selectedTarget: CreativeTarget;
    store: CreativeSettingStore;
    onDelete: () => void;
    t: ReturnType<typeof useI18n>['t'];
}

function CharacterCard({ character, relationships, selectedTarget, store, onDelete, t }: CharacterCardProps) {
    return (
        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-[minmax(0,1fr)_180px]">
                    <input
                        value={character.name}
                        onChange={(event) => store.updateCharacter(selectedTarget.scope, selectedTarget.scopeId, character.id, { name: event.target.value })}
                        className="min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 font-serif text-xl font-semibold text-white focus:border-accent-primary/50 focus:outline-none"
                        placeholder={t('creative.characterName')}
                    />
                    <input
                        value={character.role}
                        onChange={(event) => store.updateCharacter(selectedTarget.scope, selectedTarget.scopeId, character.id, { role: event.target.value })}
                        className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                        placeholder={t('creative.characterRole')}
                    />
                </div>
                <button
                    onClick={onDelete}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
                    title={t('creative.deleteCharacter')}
                >
                    <Trash2 size={15} />
                </button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <LabeledTextarea
                    label={t('creative.characterDescription')}
                    value={character.description}
                    placeholder={t('creative.characterDescriptionPlaceholder')}
                    onChange={(value) => store.updateCharacter(selectedTarget.scope, selectedTarget.scopeId, character.id, { description: value })}
                />
                <LabeledTextarea
                    label={t('creative.characterMotivation')}
                    value={character.motivation}
                    placeholder={t('creative.characterMotivationPlaceholder')}
                    onChange={(value) => store.updateCharacter(selectedTarget.scope, selectedTarget.scopeId, character.id, { motivation: value })}
                />
                <LabeledTextarea
                    label={t('creative.characterArc')}
                    value={character.arc}
                    placeholder={t('creative.characterArcPlaceholder')}
                    onChange={(value) => store.updateCharacter(selectedTarget.scope, selectedTarget.scopeId, character.id, { arc: value })}
                />
            </div>

            {character.relations.length > relationships.length + character.relations.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {relationships.map((relation) => (
                        <button
                            key={`${character.id}-${relation.id}-${relation.counterpartCharacterId}`}
                            onClick={() => store.deleteRelation(selectedTarget.scope, selectedTarget.scopeId, relation.ownerCharacterId, relation.id)}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400 transition-colors hover:border-red-400/30 hover:text-red-300"
                            title={t('creative.deleteRelation')}
                            >
                                {relation.counterpartName || t('creative.unknownCharacter')}
                                {' · '}
                                {relation.type}
                                {' · '}
                                {relation.type}
                            </button>
                        ))}
                </div>
            )}

            {relationships.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {relationships.map((relation) => (
                        <button
                            key={`${character.id}-${relation.id}-${relation.counterpartCharacterId}`}
                            onClick={() => store.deleteRelation(selectedTarget.scope, selectedTarget.scopeId, relation.ownerCharacterId, relation.id)}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400 transition-colors hover:border-red-400/30 hover:text-red-300"
                            title={t('creative.deleteRelation')}
                        >
                            {relation.counterpartName || t('creative.unknownCharacter')}
                            {' · '}
                            {relation.type}
                        </button>
                    ))}
                </div>
            )}
        </article>
    );
}

interface WorldPanelProps {
    profile: CreativeProfile;
    selectedTarget: CreativeTarget;
    store: CreativeSettingStore;
    onDeleteWorldEntry: (entry: WorldEntry) => void;
    t: ReturnType<typeof useI18n>['t'];
}

function WorldPanel({ profile, selectedTarget, store, onDeleteWorldEntry, t }: WorldPanelProps) {
    if (profile.worldEntries.length === 0) {
        return (
            <EmptyPanel
                icon={Globe2}
                title={t('creative.emptyWorldTitle')}
                description={t('creative.emptyWorldDescription')}
            />
        );
    }

    return (
        <section className="grid gap-4 xl:grid-cols-2">
            {profile.worldEntries.map((entry) => (
                <article key={entry.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-[minmax(0,1fr)_160px]">
                            <input
                                value={entry.title}
                                onChange={(event) => store.updateWorldEntry(selectedTarget.scope, selectedTarget.scopeId, entry.id, { title: event.target.value })}
                                className="min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 font-serif text-xl font-semibold text-white focus:border-accent-primary/50 focus:outline-none"
                                placeholder={t('creative.worldTitle')}
                            />
                            <select
                                value={entry.category}
                                onChange={(event) => store.updateWorldEntry(selectedTarget.scope, selectedTarget.scopeId, entry.id, { category: event.target.value as WorldCategory })}
                                className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-gray-200 focus:border-accent-primary/50 focus:outline-none"
                            >
                                {WORLD_CATEGORY_OPTIONS.map((category) => (
                                    <option key={category} value={category}>{getWorldCategoryLabel(category, t)}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => onDeleteWorldEntry(entry)}
                            className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
                            title={t('creative.deleteWorld')}
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                    <textarea
                        value={entry.content}
                        onChange={(event) => store.updateWorldEntry(selectedTarget.scope, selectedTarget.scopeId, entry.id, { content: event.target.value })}
                        placeholder={t('creative.worldContentPlaceholder')}
                        className="min-h-52 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-gray-300 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                    />
                </article>
            ))}
        </section>
    );
}

function RelationshipList({
    characters,
    relationshipMap,
    totalRelations,
    t,
}: {
    characters: CreativeCharacter[];
    relationshipMap: Record<string, CharacterRelationshipView[]>;
    totalRelations: number;
    t: ReturnType<typeof useI18n>['t'];
}) {
    return (
        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Network size={16} className="text-accent-primary" />
                    {t('creative.relationListTitle')}
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-gray-500">
                    {totalRelations} {t('creative.relations')}
                </span>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-gray-500">{t('creative.relationListDescription')}</p>

            {totalRelations > 0 ? (
                <div className="space-y-3">
                    {characters.map((character) => {
                        const relationships = relationshipMap[character.id] || [];

                        return (
                            <div key={character.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <h4 className="text-sm font-semibold text-gray-200">{character.name}</h4>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-gray-500">
                                        {relationships.length}
                                    </span>
                                </div>
                                {relationships.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {relationships.map((relation) => (
                                            <div
                                                key={`${character.id}-${relation.id}-${relation.counterpartCharacterId}`}
                                                className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-xs text-gray-400"
                                            >
                                                <span className="font-semibold text-gray-200">
                                                    {relation.counterpartName || t('creative.unknownCharacter')}
                                                </span>
                                                <span className="mx-2 text-gray-600">|</span>
                                                <span>{relation.type}</span>
                                                {relation.note && <p className="mt-1 text-gray-500">{relation.note}</p>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-600">{t('creative.noRelations')}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-gray-500">
                    {t('creative.noRelations')}
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: ElementType }) {
    return (
        <div className="min-w-24 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <Icon size={15} className="mb-2 text-accent-primary" />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        </div>
    );
}

function TabButton({
    active,
    disabled,
    icon: Icon,
    label,
    onClick,
}: {
    active: boolean;
    disabled?: boolean;
    icon: ElementType;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                active ? "bg-accent-primary text-white" : "text-gray-500 hover:text-white",
                disabled && "cursor-not-allowed opacity-40 hover:text-gray-500"
            )}
        >
            <Icon size={15} />
            {label}
        </button>
    );
}

function ActionButton({
    label,
    icon: Icon,
    disabled,
    onClick,
}: {
    label: string;
    icon: ElementType;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white",
                disabled && "cursor-not-allowed opacity-40 hover:bg-white/5 hover:text-gray-300"
            )}
        >
            <Icon size={15} />
            {label}
        </button>
    );
}

function LabeledTextarea({
    label,
    value,
    placeholder,
    onChange,
}: {
    label: string;
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="min-h-32 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-gray-300 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
            />
        </label>
    );
}

function EmptyPanel({ icon: Icon, title, description }: { icon: ElementType; title: string; description: string }) {
    return (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] text-center">
            <Icon size={40} className="mb-4 text-accent-primary" />
            <h3 className="font-serif text-2xl font-semibold text-white">{title}</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">{description}</p>
        </div>
    );
}

function createTargetFromNode(node: FileNode, files: Record<string, FileNode>): CreativeTarget {
    const scope: CreativeScope = node.type === 'file'
        ? 'file'
        : node.parentId === null
            ? 'project'
            : 'folder';

    return {
        key: getCreativeProfileKey(scope, node.id),
        scope,
        scopeId: node.id,
        label: node.name,
        path: getPathLabel(files, node.parentId),
    };
}

function getPreferredTarget(targets: CreativeTarget[], activeFileId: string | null): CreativeTarget | null {
    if (activeFileId) {
        return targets.find((target) => target.scope === 'file' && target.scopeId === activeFileId) || null;
    }

    return targets.find((target) => target.scope === 'project') || targets[0] || null;
}

function sortFileNodes(a: FileNode, b: FileNode): number {
    if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
}

function hasProfileContent(profile?: CreativeProfile): boolean {
    if (!profile) return false;

    return Boolean(
        profile.premise.trim()
        || profile.outline.trim()
        || profile.scenes.length
        || profile.characters.length
        || profile.worldEntries.length
    );
}

function getEffectiveExpandedFolders(
    files: Record<string, FileNode>,
    manualExpandedFolders: Set<string>,
    selectedNodeId: string | null,
    search: string,
    visibleNodeIds: Set<string>
): Set<string> {
    const next = new Set(manualExpandedFolders);

    let current: FileNode | null = selectedNodeId ? files[selectedNodeId] || null : null;
    while (current) {
        if (current.type === 'folder') {
            next.add(current.id);
        }
        current = current.parentId ? files[current.parentId] || null : null;
    }

    if (search.trim()) {
        Object.values(files).forEach((node) => {
            if (node.type === 'folder' && visibleNodeIds.has(node.id)) {
                next.add(node.id);
            }
        });
    }

    return next;
}

function getCharacterRelationships(characters: CreativeCharacter[]): Record<string, CharacterRelationshipView[]> {
    const nameById = new globalThis.Map(characters.map((character) => [character.id, character.name]));
    const relationshipMap: Record<string, CharacterRelationshipView[]> = Object.fromEntries(
        characters.map((character) => [character.id, [] as CharacterRelationshipView[]])
    );

    characters.forEach((character) => {
        character.relations.forEach((relation) => {
            relationshipMap[character.id]?.push({
                id: relation.id,
                ownerCharacterId: character.id,
                counterpartCharacterId: relation.targetCharacterId,
                counterpartName: nameById.get(relation.targetCharacterId) || '',
                type: relation.type,
                note: relation.note,
            });

            relationshipMap[relation.targetCharacterId]?.push({
                id: relation.id,
                ownerCharacterId: character.id,
                counterpartCharacterId: character.id,
                counterpartName: character.name,
                type: relation.type,
                note: relation.note,
            });
        });
    });

    Object.values(relationshipMap).forEach((relations) => {
        relations.sort((left, right) => (
            left.counterpartName.localeCompare(right.counterpartName)
            || left.type.localeCompare(right.type)
        ));
    });

    return relationshipMap;
}

function buildVisibleNodeSet(files: Record<string, FileNode>, search: string): Set<string> {
    const query = search.trim().toLowerCase();
    const nodes = Object.values(files);

    if (!query) {
        return new Set(nodes.map((node) => node.id));
    }

    const visible = new Set<string>();

    const addAncestors = (nodeId: string) => {
        let current: FileNode | null = files[nodeId] || null;
        while (current) {
            visible.add(current.id);
            current = current.parentId ? files[current.parentId] || null : null;
        }
    };

    const addDescendants = (nodeId: string) => {
        visible.add(nodeId);
        nodes.forEach((node) => {
            if (node.parentId === nodeId) {
                addDescendants(node.id);
            }
        });
    };

    nodes.forEach((node) => {
        if (node.name.toLowerCase().includes(query)) {
            addAncestors(node.id);
            if (node.type === 'folder') {
                addDescendants(node.id);
            }
        }
    });

    return visible;
}

function getPathLabel(files: Record<string, FileNode>, parentId: string | null): string {
    const parts: string[] = [];
    let current = parentId ? files[parentId] : null;

    while (current) {
        parts.unshift(current.name);
        current = current.parentId ? files[current.parentId] : null;
    }

    return parts.join(' / ');
}

function getScopeIcon(scope: CreativeScope) {
    if (scope === 'project') return <MapIcon size={14} />;
    if (scope === 'folder') return <Folder size={14} />;
    return <FileText size={14} />;
}

function getScopeLabel(scope: CreativeScope, t: ReturnType<typeof useI18n>['t']): string {
    if (scope === 'project') return t('creative.projectScope');
    if (scope === 'folder') return t('creative.folderScope');
    return t('creative.fileScope');
}

function getPremisePlaceholder(scope: CreativeScope, t: ReturnType<typeof useI18n>['t']): string {
    if (scope === 'project') return t('creative.projectPremisePlaceholder');
    if (scope === 'folder') return t('creative.folderPremisePlaceholder');
    return t('creative.filePremisePlaceholder');
}

function getOutlinePlaceholder(scope: CreativeScope, t: ReturnType<typeof useI18n>['t']): string {
    if (scope === 'project') return t('creative.projectOutlinePlaceholder');
    if (scope === 'folder') return t('creative.folderOutlinePlaceholder');
    return t('creative.fileOutlinePlaceholder');
}

function getSceneStatusLabel(status: SceneStatus, t: ReturnType<typeof useI18n>['t']): string {
    if (status === 'draft') return t('creative.statusDraft');
    if (status === 'locked') return t('creative.statusLocked');
    return t('creative.statusSeed');
}

function getWorldCategoryLabel(category: WorldCategory, t: ReturnType<typeof useI18n>['t']): string {
    if (category === 'rule') return t('creative.worldRule');
    if (category === 'history') return t('creative.worldHistory');
    if (category === 'culture') return t('creative.worldCulture');
    if (category === 'object') return t('creative.worldObject');
    if (category === 'other') return t('creative.worldOther');
    return t('creative.worldPlace');
}

function formatDateTime(timestamp: number, locale: string): string {
    return new Date(timestamp).toLocaleString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
