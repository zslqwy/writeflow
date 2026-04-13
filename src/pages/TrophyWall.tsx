import { useMemo } from 'react';
import { CalendarDays, CheckCircle2, Clock, Flame, Sparkles, Trophy } from 'lucide-react';

import { getLocalDateKey, parseLocalDateKey } from '../lib/date-utils';
import { useI18n } from '../lib/i18n';
import {
    getCurrentStreak,
    getNextTrophyTargetForStreak,
    getTrophyMilestoneText,
    getTrophyWallEntries,
    TROPHY_MILESTONES,
    type TrophyWallEntry,
} from '../lib/trophy-utils';
import { cn } from '../lib/utils';
import { useWritingStatsStore } from '../store/useWritingStatsStore';

export function TrophyWall() {
    const { dailyTargetWords, logs } = useWritingStatsStore();
    const { language, locale, t } = useI18n();
    const trophies = useMemo(
        () => getTrophyWallEntries(logs, dailyTargetWords),
        [dailyTargetWords, logs]
    );
    const currentStreak = useMemo(
        () => getCurrentStreak(logs, dailyTargetWords),
        [dailyTargetWords, logs]
    );
    const nextTarget = getNextTrophyTargetForStreak(currentStreak);
    const nextTargetText = getTrophyMilestoneText(nextTarget.milestone, language);
    const activeTrophy = trophies.find((trophy) => trophy.status === 'active');
    const maxedCount = trophies.filter((trophy) => trophy.status === 'maxed').length;
    const sealedCount = trophies.filter((trophy) => trophy.status !== 'active').length;
    const totalTrophyDays = trophies.reduce((total, trophy) => total + trophy.days, 0);

    return (
        <div className="min-h-full px-6 py-8 md:px-10">
            <div className="mx-auto flex max-w-7xl flex-col gap-8">
                <header className="relative overflow-hidden rounded-[2rem] border border-amber-200/10 bg-white/[0.03] p-7 glass">
                    <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
                    <div className="absolute bottom-0 left-1/4 h-40 w-72 rounded-full bg-accent-secondary/15 blur-3xl" />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-amber-200">
                                <Sparkles size={14} />
                                {t('trophy.cabinet')}
                            </p>
                            <h2 className="font-serif text-4xl font-bold text-white md:text-5xl">{t('trophy.wallTitle')}</h2>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400">
                                {t('trophy.heroDescription')}
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
                            <MetricCard label={t('trophy.currentStreak')} value={`${currentStreak} ${t('common.days')}`} icon={Flame} tone="text-orange-300" />
                            <MetricCard label={t('trophy.collected')} value={`${trophies.length}`} icon={Trophy} tone="text-amber-200" />
                            <MetricCard label={t('trophy.maxLevel')} value={`${maxedCount}`} icon={CheckCircle2} tone="text-green-300" />
                        </div>
                    </div>
                </header>

                <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 glass">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h3 className="font-serif text-2xl font-semibold text-white">{t('trophy.currentStatus')}</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    {t('trophy.currentStatusHint', { name: nextTargetText.label, count: nextTarget.remainingDays })}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-amber-200/20 bg-amber-200/10 p-3 text-amber-100">
                                <Trophy size={24} />
                            </div>
                        </div>

                        {activeTrophy ? (
                            <div className="mt-5 rounded-2xl border border-amber-200/15 bg-black/20 p-4">
                                <div className="mb-3 flex items-center justify-between text-sm">
                                    <span className="font-semibold text-gray-200">
                                        {t('trophy.upgrading')}：{getTrophyMilestoneText(activeTrophy.level, language).label} · {getTrophyMilestoneText(activeTrophy.level, language).title}
                                    </span>
                                    <span className="text-gray-500">{t('trophy.consecutiveDays', { count: activeTrophy.days })}</span>
                                </div>
                                <p className="mb-4 text-xs text-gray-500">
                                    {t('trophy.activeRange', { start: formatDate(activeTrophy.startDate, locale) })}
                                </p>
                                <TrophyProgress trophy={activeTrophy} language={language} t={t} />
                            </div>
                        ) : (
                            <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                                {t('trophy.noActive', { count: TROPHY_MILESTONES[0].days })}
                            </div>
                        )}
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 glass">
                        <h3 className="font-serif text-2xl font-semibold text-white">{t('trophy.stats')}</h3>
                        <div className="mt-5 grid grid-cols-3 gap-3">
                            <SmallStat label={t('trophy.sealed')} value={sealedCount} />
                            <SmallStat label={t('trophy.maxed')} value={maxedCount} />
                            <SmallStat label={t('trophy.totalDays')} value={totalTrophyDays} />
                        </div>
                        <p className="mt-5 text-sm leading-relaxed text-gray-500">
                            {t('trophy.repeatHint')}
                        </p>
                    </div>
                </section>

                <section>
                    <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h3 className="font-serif text-2xl font-semibold text-white">{t('trophy.sortTitle')}</h3>
                            <p className="mt-1 text-sm text-gray-500">{t('trophy.sortHint')}</p>
                        </div>
                    </div>

                    {trophies.length > 0 ? (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {trophies.map((trophy) => (
                                <TrophyCard key={trophy.id} trophy={trophy} language={language} locale={locale} t={t} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center glass">
                            <Trophy size={40} className="mx-auto mb-4 text-amber-200/70" />
                            <h3 className="font-serif text-2xl font-semibold text-white">{t('trophy.emptyTitle')}</h3>
                            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-500">
                                {t('trophy.emptyDescription', { count: TROPHY_MILESTONES[0].days })}
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function TrophyCard({
    trophy,
    language,
    locale,
    t,
}: {
    trophy: TrophyWallEntry;
    language: 'zh' | 'en';
    locale: string;
    t: ReturnType<typeof useI18n>['t'];
}) {
    const trophyText = getTrophyMilestoneText(trophy.level, language);
    const displayEndDate = trophy.status === 'active' ? getLocalDateKey() : trophy.endDate;
    const statusLabels: Record<TrophyWallEntry['status'], string> = {
        active: t('trophy.statusActive'),
        sealed: t('trophy.statusSealed'),
        maxed: t('trophy.statusMaxed'),
    };

    return (
        <article className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 transition-all hover:-translate-y-1 hover:border-amber-200/30 glass">
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-25 transition-opacity group-hover:opacity-40", trophy.level.gradient)} />
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />

            <div className="relative">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <span className={cn(
                        "rounded-full border px-3 py-1 text-xs font-semibold",
                        trophy.status === 'active' && "border-amber-200/40 bg-amber-200/15 text-amber-100",
                        trophy.status === 'sealed' && "border-white/10 bg-black/20 text-gray-300",
                        trophy.status === 'maxed' && "border-green-300/40 bg-green-300/15 text-green-200"
                    )}>
                        {statusLabels[trophy.status]}
                    </span>
                    <span className="text-xs text-gray-500">{t('trophy.number')} {trophy.sequence}</span>
                </div>

                <div className="mb-5 flex items-center gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] border border-amber-100/20 bg-black/20 text-amber-100 shadow-[0_20px_60px_rgba(245,158,11,0.18)]">
                        <Trophy size={38} />
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-serif text-2xl font-bold text-white">{trophyText.label}</h4>
                        <p className="mt-1 text-sm text-amber-100/80">{trophyText.title}</p>
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">{trophyText.description}</p>
                    </div>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3 text-xs">
                    <InfoPill icon={Flame} label={t('trophy.consecutive')} value={t('trophy.consecutiveDays', { count: trophy.days })} />
                    <InfoPill icon={CalendarDays} label={t('trophy.earned')} value={formatDate(trophy.earnedAt, locale)} />
                    <InfoPill icon={Clock} label={t('trophy.upgraded')} value={formatDate(trophy.levelReachedAt, locale)} />
                    <InfoPill icon={CalendarDays} label={t('trophy.period')} value={formatRange(trophy.startDate, displayEndDate, locale)} />
                </div>

                <TrophyProgress trophy={trophy} language={language} t={t} />
            </div>
        </article>
    );
}

function TrophyProgress({
    trophy,
    language,
    t,
}: {
    trophy: TrophyWallEntry;
    language: 'zh' | 'en';
    t: ReturnType<typeof useI18n>['t'];
}) {
    const nextLevel = trophy.nextLevel;
    const nextLevelText = nextLevel ? getTrophyMilestoneText(nextLevel, language) : null;
    const progress = nextLevel
        ? Math.min(100, Math.round(((trophy.days - trophy.level.days) / (nextLevel.days - trophy.level.days)) * 100))
        : 100;

    return (
        <div>
            <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                <span>{nextLevelText ? t('trophy.nextLevel', { name: nextLevelText.label }) : t('trophy.maxReached')}</span>
                <span>{nextLevel ? `${trophy.days}/${nextLevel.days} ${t('common.days')}` : `${trophy.days} ${t('common.days')}`}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-200 to-green-300 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="mt-3 flex justify-between gap-1">
                {TROPHY_MILESTONES.map((milestone) => (
                    <div
                        key={milestone.days}
                        className={cn(
                            "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-center text-[10px]",
                            trophy.days >= milestone.days
                                ? "border-amber-200/30 bg-amber-200/10 text-amber-100"
                                : "border-white/5 bg-black/20 text-gray-600"
                        )}
                    >
                        <Trophy size={11} />
                        <span className="truncate">{milestone.days}d</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MetricCard({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string;
    value: string;
    icon: typeof Trophy;
    tone: string;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10", tone)}>
                <Icon size={18} />
            </div>
            <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-white">{value}</p>
        </div>
    );
}

function SmallStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="mt-1 text-xs text-gray-500">{label}</p>
        </div>
    );
}

function InfoPill({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Trophy;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
            <div className="mb-1 flex items-center gap-1.5 text-gray-500">
                <Icon size={12} />
                <span>{label}</span>
            </div>
            <p className="truncate font-medium text-gray-200">{value}</p>
        </div>
    );
}

function formatDate(dateKey: string, locale: string): string {
    return parseLocalDateKey(dateKey).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
    });
}

function formatRange(startDate: string, endDate: string, locale: string): string {
    if (startDate === endDate) return formatDate(startDate, locale);
    return `${formatDate(startDate, locale)} - ${formatDate(endDate, locale)}`;
}
