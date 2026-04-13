import { useMemo, useState } from 'react';
import { CalendarDays, Clock, Edit3, Plus, Trash2 } from 'lucide-react';

import { getLocalDateKey } from '../lib/date-utils';
import { useI18n } from '../lib/i18n';
import { countWords } from '../lib/text-stats';
import { cn } from '../lib/utils';
import { useJournalStore, type JournalEntry } from '../store/useJournalStore';
import { useModalStore } from '../store/useModalStore';
import { useWritingStatsStore } from '../store/useWritingStatsStore';

interface JournalGroup {
    date: string;
    entries: JournalEntry[];
}

export function Journal() {
    const { entries, createEntry, updateEntry, deleteEntry } = useJournalStore();
    const { showConfirm } = useModalStore();
    const { locale, t } = useI18n();
    const recordWritingDelta = useWritingStatsStore((state) => state.recordWritingDelta);
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [draftDate, setDraftDate] = useState(getLocalDateKey);

    const entryList = useMemo(
        () => Object.values(entries).sort((a, b) => b.updatedAt - a.updatedAt),
        [entries]
    );
    const groupedEntries = useMemo(() => groupEntriesByDate(entryList), [entryList]);
    const selectedEntry = selectedEntryId ? entries[selectedEntryId] : null;
    const activeEntry = selectedEntry || entryList[0] || null;

    const handleCreateEntry = () => {
        const id = createEntry(draftDate, `${t('journal.unnamed')} ${formatShortTime(new Date(), locale)}`);
        setSelectedEntryId(id);
    };

    const handleDeleteEntry = (entry: JournalEntry) => {
        showConfirm(t('journal.deleteTitle'), t('journal.deleteMessage', { title: entry.title || t('journal.unnamed') }), () => {
            deleteEntry(entry.id);
            setSelectedEntryId(null);
        });
    };

    const handleContentChange = (entry: JournalEntry, content: string) => {
        const previousCount = countWords(entry.content);
        const nextCount = countWords(content);

        updateEntry(entry.id, { content });
        if (nextCount > previousCount) {
            recordWritingDelta(nextCount - previousCount);
        }
    };

    return (
        <div className="min-h-full px-6 py-8 md:px-10">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 glass">
                    <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent-primary/10 blur-3xl" />
                    <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-accent-secondary/10 blur-3xl" />
                    <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent-primary">
                                <Edit3 size={14} />
                                {t('journal.kicker')}
                            </p>
                            <h2 className="font-serif text-4xl font-bold text-white">{t('journal.title')}</h2>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">
                                {t('journal.description')}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 md:min-w-72">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t('journal.createForDate')}</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={draftDate}
                                    onChange={(event) => setDraftDate(event.target.value)}
                                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-primary/50"
                                />
                                <button
                                    onClick={handleCreateEntry}
                                    className="flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80"
                                >
                                    <Plus size={16} />
                                    {t('journal.new')}
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                    <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 glass">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-200">{t('journal.byDate')}</h3>
                                <p className="text-xs text-gray-500">{entryList.length} {t('common.entries')}</p>
                            </div>
                            <CalendarDays size={18} className="text-accent-primary" />
                        </div>

                        {groupedEntries.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
                                <p className="text-sm text-gray-500">{t('journal.noEntries')}</p>
                                <p className="mt-2 text-xs text-gray-600">{t('journal.startHint')}</p>
                            </div>
                        ) : (
                            <div className="max-h-[calc(100vh-310px)] space-y-4 overflow-y-auto pr-1 custom-scrollbar">
                                {groupedEntries.map((group) => (
                                    <section key={group.date}>
                                        <div className="sticky top-0 z-10 mb-2 rounded-full border border-white/10 bg-[#1a1a1e]/90 px-3 py-1.5 text-xs font-semibold text-gray-400 backdrop-blur-md">
                                            {formatDateLabel(group.date, locale)}
                                        </div>
                                        <div className="space-y-2">
                                            {group.entries.map((entry) => (
                                                <button
                                                    key={entry.id}
                                                    onClick={() => setSelectedEntryId(entry.id)}
                                                    className={cn(
                                                        "w-full rounded-2xl border px-3 py-3 text-left transition-all",
                                                        activeEntry?.id === entry.id
                                                            ? "border-accent-primary/50 bg-accent-primary/10"
                                                            : "border-white/5 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <h4 className="truncate text-sm font-semibold text-gray-200">{entry.title || t('journal.unnamed')}</h4>
                                                        <span className="shrink-0 text-[10px] text-gray-500">{formatShortTime(new Date(entry.updatedAt), locale)}</span>
                                                    </div>
                                                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">
                                                        {entry.content.trim() || t('journal.blank')}
                                                    </p>
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )}
                    </aside>

                    <main className="min-h-[560px] rounded-3xl border border-white/10 bg-white/[0.03] p-5 glass">
                        {activeEntry ? (
                            <div className="flex h-full flex-col gap-4">
                                <div className="flex flex-col gap-3 border-b border-white/5 pb-4 md:flex-row md:items-center md:justify-between">
                                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                                        <input
                                            value={activeEntry.title}
                                            onChange={(event) => updateEntry(activeEntry.id, { title: event.target.value })}
                                            className="w-full bg-transparent font-serif text-3xl font-bold text-white focus:outline-none"
                                            placeholder={t('journal.titlePlaceholder')}
                                        />
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                            <label className="flex items-center gap-2">
                                                <CalendarDays size={14} />
                                                <input
                                                    type="date"
                                                    value={activeEntry.date}
                                                    onChange={(event) => updateEntry(activeEntry.id, { date: event.target.value })}
                                                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-accent-primary/50"
                                                />
                                            </label>
                                            <span className="flex items-center gap-1">
                                                <Clock size={13} />
                                                {t('journal.updated')} {formatShortDateTime(activeEntry.updatedAt, locale)}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDeleteEntry(activeEntry)}
                                        className="self-start rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
                                        title={t('journal.deleteEntry')}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <textarea
                                    value={activeEntry.content}
                                    onChange={(event) => handleContentChange(activeEntry, event.target.value)}
                                    placeholder={t('journal.textPlaceholder')}
                                    className="min-h-[420px] flex-1 resize-none bg-transparent font-serif text-lg leading-relaxed text-gray-300 placeholder:text-gray-600 focus:outline-none"
                                    spellCheck={false}
                                />
                            </div>
                        ) : (
                            <div className="flex h-full min-h-[500px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 text-center">
                                <Edit3 size={36} className="mb-4 text-accent-primary" />
                                <h3 className="font-serif text-2xl font-semibold text-white">{t('journal.firstTitle')}</h3>
                                <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
                                    {t('journal.firstDescription')}
                                </p>
                                <button
                                    onClick={handleCreateEntry}
                                    className="mt-6 flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80"
                                >
                                    <Plus size={16} />
                                    {t('journal.newEntry')}
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

function groupEntriesByDate(entries: JournalEntry[]): JournalGroup[] {
    const groups = new Map<string, JournalEntry[]>();

    entries.forEach((entry) => {
        const group = groups.get(entry.date) || [];
        group.push(entry);
        groups.set(entry.date, group);
    });

    return Array.from(groups.entries())
        .map(([date, groupEntries]) => ({
            date,
            entries: groupEntries.sort((a, b) => b.updatedAt - a.updatedAt),
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
}

function formatDateLabel(date: string, locale: string): string {
    const parsedDate = new Date(`${date}T00:00:00`);
    return parsedDate.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    });
}

function formatShortTime(date: Date, locale: string): string {
    return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatShortDateTime(timestamp: number, locale: string): string {
    return new Date(timestamp).toLocaleString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
