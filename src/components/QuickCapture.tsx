import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, FileText, FolderOpen, Globe2, LibraryBig, Lightbulb, Plus, X } from 'lucide-react';

import { getCollectionScopeTarget, getDefaultCollectionScope } from '../lib/collection-utils';
import { useI18n } from '../lib/i18n';
import { cn } from '../lib/utils';
import { useCollectionStore, type CollectionItemType, type CollectionScope } from '../store/useCollectionStore';
import { useFileStore } from '../store/useFileStore';

const SCOPE_OPTIONS: CollectionScope[] = ['global', 'project', 'file'];

export function QuickCapture() {
    const { createItem } = useCollectionStore();
    const { files, activeFileId } = useFileStore();
    const { t } = useI18n();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [itemType, setItemType] = useState<CollectionItemType>('inspiration');
    const [scope, setScope] = useState<CollectionScope>('global');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [saved, setSaved] = useState(false);

    const globalTarget = getCollectionScopeTarget(files, activeFileId, 'global', t('collection.scopeGlobal'));
    const projectTarget = getCollectionScopeTarget(files, activeFileId, 'project', t('collection.noProject'));
    const fileTarget = getCollectionScopeTarget(files, activeFileId, 'file', t('collection.noFile'));
    const scopeTargets: Record<CollectionScope, typeof globalTarget> = {
        global: globalTarget,
        project: projectTarget,
        file: fileTarget,
    };
    const activeTarget = scopeTargets[scope].available ? scopeTargets[scope] : globalTarget;
    const selectedScope = activeTarget.scope;

    useEffect(() => {
        if (!saved) return;

        const timeout = window.setTimeout(() => setSaved(false), 1600);
        return () => window.clearTimeout(timeout);
    }, [saved]);

    const handleOpen = () => {
        setScope(getDefaultCollectionScope(files, activeFileId));
        setIsOpen(true);
    };

    const handleSave = () => {
        const trimmedContent = content.trim();
        if (!trimmedContent) return;

        createItem({
            type: itemType,
            scope: activeTarget.scope,
            scopeId: activeTarget.scopeId,
            title: title.trim() || (itemType === 'material' ? t('collection.defaultMaterialTitle') : t('collection.defaultInspirationTitle')),
            content: trimmedContent,
        });
        setTitle('');
        setContent('');
        setSaved(true);
    };

    const handleOpenBoard = () => {
        navigate(itemType === 'material' ? '/materials' : '/inspirations');
        setIsOpen(false);
    };

    return (
        <>
            <button
                onClick={isOpen ? () => setIsOpen(false) : handleOpen}
                className={cn(
                    "fixed bottom-20 right-6 z-[210] rounded-full border border-white/10 p-3 shadow-lg backdrop-blur-xl transition-all duration-300",
                    isOpen
                        ? "bg-accent-primary text-white"
                        : "bg-[#1a1a1e]/90 text-gray-400 hover:bg-white/10 hover:text-white"
                )}
                title={t('layout.quickCapture')}
            >
                {isOpen ? <X size={20} /> : <Plus size={20} />}
            </button>

            {isOpen && (
                <section className="fixed bottom-36 right-6 z-[210] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-white/10 bg-[#141416]/95 shadow-2xl backdrop-blur-2xl">
                    <div className="relative border-b border-white/10 p-4">
                        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-accent-primary/20 blur-2xl" />
                        <div className="relative">
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-primary">{t('collection.quickTitle')}</p>
                            <h3 className="mt-1 font-serif text-2xl font-semibold text-white">{t('collection.quickSubtitle')}</h3>
                        </div>
                    </div>

                    <div className="space-y-4 p-4">
                        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-1">
                            <button
                                onClick={() => setItemType('inspiration')}
                                className={cn(
                                    "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                                    itemType === 'inspiration' ? "bg-accent-primary text-white" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <Lightbulb size={15} />
                                {t('collection.quickInspiration')}
                            </button>
                            <button
                                onClick={() => setItemType('material')}
                                className={cn(
                                    "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                                    itemType === 'material' ? "bg-amber-400 text-slate-950" : "text-gray-500 hover:text-white"
                                )}
                            >
                                <LibraryBig size={15} />
                                {t('collection.quickMaterial')}
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {SCOPE_OPTIONS.map((option) => {
                                const target = scopeTargets[option];
                                const ScopeIcon = getScopeIcon(option);

                                return (
                                    <button
                                        key={option}
                                        onClick={() => setScope(option)}
                                        disabled={!target.available}
                                        className={cn(
                                            "rounded-xl border px-2 py-2 text-left transition-all",
                                            selectedScope === option
                                                ? "border-accent-primary/50 bg-accent-primary/15 text-white"
                                                : "border-white/10 bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300",
                                            !target.available && "cursor-not-allowed opacity-40"
                                        )}
                                    >
                                        <span className="flex items-center gap-1 text-[11px] font-semibold">
                                            <ScopeIcon size={12} />
                                            {getScopeLabel(option, t)}
                                        </span>
                                        <span className="mt-1 block truncate text-[10px] text-gray-600">{target.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder={t('collection.titlePlaceholder')}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                        />
                        <textarea
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            placeholder={itemType === 'material' ? t('collection.materialPlaceholder') : t('collection.inspirationPlaceholder')}
                            className="min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed text-gray-200 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                        />

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSave}
                                disabled={!content.trim()}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {saved ? <Check size={16} /> : <Plus size={16} />}
                                {saved ? t('collection.quickSaved') : t('collection.quickSave')}
                            </button>
                            <button
                                onClick={handleOpenBoard}
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                {t('collection.quickOpenBoard')}
                            </button>
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}

function getScopeIcon(scope: CollectionScope) {
    if (scope === 'project') return FolderOpen;
    if (scope === 'file') return FileText;
    return Globe2;
}

function getScopeLabel(scope: CollectionScope, t: ReturnType<typeof useI18n>['t']): string {
    if (scope === 'project') return t('collection.scopeProject');
    if (scope === 'file') return t('collection.scopeFile');
    return t('collection.scopeGlobal');
}
