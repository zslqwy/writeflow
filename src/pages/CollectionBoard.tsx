import { useMemo, useRef, useState } from 'react';
import {
    Clock,
    Edit3,
    FileText,
    FolderOpen,
    Globe2,
    LibraryBig,
    Lightbulb,
    Plus,
    Save,
    Trash2,
    Upload,
    X
} from 'lucide-react';

import { getCollectionScopeTarget } from '../lib/collection-utils';
import { readTextFile } from '../lib/file-utils';
import { useI18n } from '../lib/i18n';
import { cn } from '../lib/utils';
import { useCollectionStore, type CollectionItem, type CollectionItemType, type CollectionScope } from '../store/useCollectionStore';
import { useFileStore } from '../store/useFileStore';
import { useModalStore } from '../store/useModalStore';

interface CollectionBoardProps {
    itemType: CollectionItemType;
}

const SCOPE_OPTIONS: CollectionScope[] = ['global', 'project', 'file'];
const TEXT_FILE_ACCEPT = '.txt,.md,.markdown,.csv,.json,.log,text/plain,text/markdown,application/json';

export function CollectionBoard({ itemType }: CollectionBoardProps) {
    const { items, createItem, updateItem, deleteItem } = useCollectionStore();
    const { files, activeFileId } = useFileStore();
    const { showConfirm } = useModalStore();
    const { locale, t } = useI18n();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [scope, setScope] = useState<CollectionScope>('global');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const isMaterial = itemType === 'material';
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

    const scopedItems = useMemo(
        () => Object.values(items)
            .filter((item) => item.type === itemType && item.scope === activeTarget.scope && item.scopeId === activeTarget.scopeId)
            .sort((a, b) => b.updatedAt - a.updatedAt),
        [activeTarget.scope, activeTarget.scopeId, itemType, items]
    );

    const handleCreate = () => {
        const trimmedContent = content.trim();
        if (!trimmedContent) return;

        createItem({
            type: itemType,
            scope: activeTarget.scope,
            scopeId: activeTarget.scopeId,
            title: title.trim() || getDefaultTitle(itemType, t),
            content: trimmedContent,
        });
        setTitle('');
        setContent('');
    };

    const handleDelete = (item: CollectionItem) => {
        showConfirm(
            t('collection.deleteTitle'),
            t('collection.deleteMessage', { title: item.title }),
            () => deleteItem(item.id)
        );
    };

    const handleImportFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []);
        if (selectedFiles.length === 0) return;

        setIsImporting(true);
        try {
            const importedItems = await Promise.all(
                selectedFiles.map(async (file) => ({
                    file,
                    content: await readTextFile(file),
                }))
            );

            importedItems.forEach(({ file, content: fileContent }) => {
                createItem({
                    type: 'material',
                    scope: activeTarget.scope,
                    scopeId: activeTarget.scopeId,
                    title: stripTextExtension(file.name),
                    content: fileContent,
                    sourceName: file.name,
                    sourceType: 'text-file',
                });
            });
        } catch (error) {
            console.error('Failed to import material files:', error);
            alert(t('collection.fileImportError'));
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const Icon = isMaterial ? LibraryBig : Lightbulb;
    const accentClass = isMaterial ? 'text-amber-300' : 'text-accent-primary';

    return (
        <div className="min-h-full px-6 py-8 md:px-10">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 glass">
                    <div className={cn("absolute -right-16 -top-20 h-48 w-48 rounded-full blur-3xl", isMaterial ? "bg-amber-400/10" : "bg-accent-primary/10")} />
                    <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-accent-secondary/10 blur-3xl" />
                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className={cn("mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em]", accentClass)}>
                                <Icon size={14} />
                                {isMaterial ? t('collection.materialKicker') : t('collection.inspirationKicker')}
                            </p>
                            <h2 className="font-serif text-4xl font-bold text-white">
                                {isMaterial ? t('collection.materialTitle') : t('collection.inspirationTitle')}
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                                {isMaterial ? t('collection.materialDescription') : t('collection.inspirationDescription')}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{t('collection.currentScope')}</p>
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
                                                "flex min-w-24 flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left transition-all",
                                                selectedScope === option
                                                    ? "border-accent-primary/50 bg-accent-primary/15 text-white"
                                                    : "border-white/10 bg-white/[0.03] text-gray-400 hover:border-white/20 hover:bg-white/[0.06]",
                                                !target.available && "cursor-not-allowed opacity-40 hover:border-white/10 hover:bg-white/[0.03]"
                                            )}
                                        >
                                            <span className="flex items-center gap-1.5 text-xs font-semibold">
                                                <ScopeIcon size={13} />
                                                {getScopeLabel(option, t)}
                                            </span>
                                            <span className="max-w-28 truncate text-[10px] text-gray-500">{target.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                    <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 glass">
                        <div className="mb-5">
                            <h3 className="font-serif text-2xl font-semibold text-white">
                                {isMaterial ? t('collection.addMaterial') : t('collection.addInspiration')}
                            </h3>
                            <p className="mt-1 text-sm leading-relaxed text-gray-500">
                                {getScopeHint(activeTarget.scope, t)} <span className="text-gray-400">{activeTarget.label}</span>
                            </p>
                        </div>

                        <div className="space-y-3">
                            <input
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder={t('collection.titlePlaceholder')}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                            />
                            <textarea
                                value={content}
                                onChange={(event) => setContent(event.target.value)}
                                placeholder={isMaterial ? t('collection.materialPlaceholder') : t('collection.inspirationPlaceholder')}
                                className="min-h-52 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-gray-200 placeholder:text-gray-600 focus:border-accent-primary/50 focus:outline-none"
                            />
                            <button
                                onClick={handleCreate}
                                disabled={!content.trim()}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Plus size={16} />
                                {isMaterial ? t('collection.addMaterial') : t('collection.addInspiration')}
                            </button>
                        </div>

                        {isMaterial && (
                            <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/20 p-4">
                                <p className="mb-3 text-sm text-gray-400">{t('collection.importDescription')}</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept={TEXT_FILE_ACCEPT}
                                    onChange={handleImportFiles}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isImporting}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                                >
                                    <Upload size={16} />
                                    {isImporting ? t('collection.importing') : t('collection.importText')}
                                </button>
                            </div>
                        )}
                    </aside>

                    <main className="min-h-[620px] rounded-3xl border border-white/10 bg-white/[0.03] p-5 glass">
                        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">{getScopeLabel(activeTarget.scope, t)}</p>
                                <h3 className="mt-1 font-serif text-3xl font-semibold text-white">{activeTarget.label}</h3>
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-500">
                                {scopedItems.length} {t('common.entries')}
                            </div>
                        </div>

                        {scopedItems.length > 0 ? (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {scopedItems.map((item) => (
                                    <CollectionItemCard
                                        key={item.id}
                                        item={item}
                                        locale={locale}
                                        onUpdate={updateItem}
                                        onDelete={handleDelete}
                                        t={t}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex min-h-[480px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 text-center">
                                <Icon size={40} className={cn("mb-4", accentClass)} />
                                <h3 className="font-serif text-2xl font-semibold text-white">
                                    {isMaterial ? t('collection.emptyMaterialTitle') : t('collection.emptyInspirationTitle')}
                                </h3>
                                <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
                                    {t('collection.emptyDescription')}
                                </p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

interface CollectionItemCardProps {
    item: CollectionItem;
    locale: string;
    onUpdate: (itemId: string, updates: Partial<Pick<CollectionItem, 'title' | 'content'>>) => void;
    onDelete: (item: CollectionItem) => void;
    t: ReturnType<typeof useI18n>['t'];
}

function CollectionItemCard({ item, locale, onUpdate, onDelete, t }: CollectionItemCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draftTitle, setDraftTitle] = useState('');
    const [draftContent, setDraftContent] = useState('');

    const handleStartEditing = () => {
        setDraftTitle(item.title);
        setDraftContent(item.content);
        setIsEditing(true);
    };

    const handleSave = () => {
        onUpdate(item.id, {
            title: draftTitle,
            content: draftContent,
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setDraftTitle(item.title);
        setDraftContent(item.content);
        setIsEditing(false);
    };

    return (
        <article className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-white/20 hover:bg-white/[0.05]">
            {isEditing ? (
                <div className="space-y-3">
                    <input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-gray-200 focus:border-accent-primary/50 focus:outline-none"
                    />
                    <textarea
                        value={draftContent}
                        onChange={(event) => setDraftContent(event.target.value)}
                        className="min-h-44 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm leading-relaxed text-gray-300 focus:border-accent-primary/50 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <X size={13} />
                            {t('collection.cancelEdit')}
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-primary/80"
                        >
                            <Save size={13} />
                            {t('collection.saveChanges')}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h4 className="truncate text-base font-semibold text-gray-100">{item.title}</h4>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {t('collection.updated')} {formatDateTime(item.updatedAt, locale)}
                                </span>
                                {item.sourceName && (
                                    <span className="flex min-w-0 items-center gap-1">
                                        <FileText size={12} />
                                        <span className="truncate">{item.sourceName}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                            <button
                                onClick={handleStartEditing}
                                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                                title={t('collection.editItem')}
                            >
                                <Edit3 size={14} />
                            </button>
                            <button
                                onClick={() => onDelete(item)}
                                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                                title={t('collection.deleteItem')}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                    <p className="max-h-72 overflow-y-auto whitespace-pre-wrap pr-1 text-sm leading-relaxed text-gray-400 custom-scrollbar">
                        {item.content}
                    </p>
                </>
            )}
        </article>
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

function getScopeHint(scope: CollectionScope, t: ReturnType<typeof useI18n>['t']): string {
    if (scope === 'project') return t('collection.projectHint');
    if (scope === 'file') return t('collection.fileHint');
    return t('collection.globalHint');
}

function getDefaultTitle(itemType: CollectionItemType, t: ReturnType<typeof useI18n>['t']): string {
    return itemType === 'material' ? t('collection.defaultMaterialTitle') : t('collection.defaultInspirationTitle');
}

function stripTextExtension(fileName: string): string {
    return fileName.replace(/\.(txt|md|markdown|csv|json|log)$/i, '') || fileName;
}

function formatDateTime(timestamp: number, locale: string): string {
    return new Date(timestamp).toLocaleString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
