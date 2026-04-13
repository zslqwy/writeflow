import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar, CheckCircle2, FileText, Flame, Settings2, Target, Trophy } from 'lucide-react';

import { addLocalDays, getLocalDateKey, parseLocalDateKey, startOfLocalDay } from '../lib/date-utils';
import { cn } from '../lib/utils';
import { useFileStore } from '../store/useFileStore';
import { useModalStore } from '../store/useModalStore';
import { useWritingStatsStore, type DailyWritingLog } from '../store/useWritingStatsStore';

const HEATMAP_DAY_COUNT = 112;
const TROPHY_MILESTONES = [
    { days: 3, label: '青铜杯' },
    { days: 7, label: '银杯' },
    { days: 14, label: '金杯' },
    { days: 30, label: '长跑杯' },
    { days: 60, label: '史诗杯' },
];

type HeatmapDay = {
    date: string;
    words: number;
    level: number;
    isToday: boolean;
};

export function Dashboard() {
    const { files, openFile } = useFileStore();
    const { showPrompt } = useModalStore();
    const { dailyTargetWords, logs, setDailyTargetWords } = useWritingStatsStore();
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 60_000);

        return () => clearInterval(interval);
    }, []);

    const fileList = useMemo(() => Object.values(files).filter(f => f.type === 'file'), [files]);
    const totalWords = fileList.reduce((acc, f) => acc + (f.metadata?.wordCount || 0), 0);
    const fileCount = fileList.length;
    const activePlans = fileList.filter(f =>
        (f.metadata?.targetWordCount || f.metadata?.deadline) &&
        f.metadata?.status !== 'completed'
    );

    const todayKey = useMemo(() => getLocalDateKey(new Date(currentTime)), [currentTime]);
    const todayWords = logs[todayKey]?.words || 0;
    const dailyProgress = getProgress(todayWords, dailyTargetWords);
    const todayComplete = todayWords >= dailyTargetWords;
    const currentStreak = useMemo(
        () => getCurrentStreak(logs, dailyTargetWords, new Date(currentTime)),
        [dailyTargetWords, logs, currentTime]
    );
    const longestStreak = useMemo(
        () => getLongestStreak(logs, dailyTargetWords),
        [dailyTargetWords, logs]
    );
    const heatmapDays = useMemo(
        () => getHeatmapDays(logs, dailyTargetWords, new Date(currentTime)),
        [dailyTargetWords, logs, currentTime]
    );
    const nextTrophy = TROPHY_MILESTONES.find((trophy) => trophy.days > currentStreak);
    const totalLoggedWords = useMemo(
        () => Object.values(logs).reduce((total, log) => total + log.words, 0),
        [logs]
    );

    const getDaysRemaining = (deadline?: number) => {
        if (!deadline) return null;
        const diff = deadline - currentTime;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const handleOpenFile = (id: string) => {
        openFile(id);
        navigate(`/editor/${id}`);
    };

    const handleTargetEdit = () => {
        showPrompt('Daily Writing Target', 'Set your daily word target:', dailyTargetWords.toString(), (value) => {
            const nextTarget = Number.parseInt(value, 10);
            if (!Number.isNaN(nextTarget) && nextTarget > 0) {
                setDailyTargetWords(nextTarget);
            }
        });
    };

    return (
        <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
            <header className="mb-12">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-accent-primary">WriteFlow Studio</p>
                <h2 className="text-4xl font-serif font-bold text-white mb-2">Good evening, Writer.</h2>
                <p className="text-gray-400">今天写下的每一个字，都会在这里留下痕迹。</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <div className="p-6 rounded-2xl glass hover:bg-white/5 transition-colors cursor-default group relative overflow-hidden">
                    <div className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-accent-primary/20 blur-2xl" />
                    <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-accent-primary transition-colors">今日目标</h3>
                            <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary">
                                <Target size={14} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-white">
                            {todayWords.toLocaleString()}
                            <span className="text-sm font-normal text-gray-500"> / {dailyTargetWords.toLocaleString()}</span>
                        </p>
                        <div className="w-full bg-white/5 h-1.5 mt-4 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full transition-all duration-500", todayComplete ? "bg-green-400" : "bg-accent-primary")}
                                style={{ width: `${dailyProgress}%` }}
                            />
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                            <span className={todayComplete ? "text-green-400" : "text-gray-500"}>
                                {todayComplete ? '今日已打卡' : `还差 ${Math.max(dailyTargetWords - todayWords, 0).toLocaleString()} 字`}
                            </span>
                            <button
                                onClick={handleTargetEdit}
                                className="flex items-center gap-1 text-gray-500 transition-colors hover:text-white"
                            >
                                <Settings2 size={12} />
                                调整
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6 rounded-2xl glass hover:bg-white/5 transition-colors cursor-default group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-orange-300 transition-colors">连续打卡</h3>
                        <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-300">
                            <Flame size={14} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">
                        {currentStreak}
                        <span className="text-sm font-normal text-gray-500"> days</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">最长连续 {longestStreak} 天</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {TROPHY_MILESTONES.map((trophy) => {
                            const earned = currentStreak >= trophy.days;

                            return (
                                <span
                                    key={trophy.days}
                                    className={cn(
                                        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors",
                                        earned
                                            ? "border-amber-300/40 bg-amber-300/15 text-amber-200"
                                            : "border-white/5 bg-white/[0.03] text-gray-600"
                                    )}
                                >
                                    <Trophy size={10} />
                                    {trophy.label}
                                </span>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 rounded-2xl glass hover:bg-white/5 transition-colors cursor-default group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-accent-secondary transition-colors">Total Words</h3>
                        <div className="w-8 h-8 rounded-full bg-accent-secondary/20 flex items-center justify-center text-accent-secondary">
                            <FileText size={14} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{totalWords.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">Across {fileCount} documents</p>
                </div>

                <div className="p-6 rounded-2xl glass hover:bg-white/5 transition-colors cursor-default group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-green-400 transition-colors">Active Plans</h3>
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                            <Calendar size={14} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{activePlans.length}</p>
                    <p className="text-xs text-gray-500 mt-2">Projects in progress</p>
                </div>
            </div>

            <section className="mb-12 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 glass">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent-primary">
                            <CheckCircle2 size={14} />
                            Writing Heatmap
                        </div>
                        <h3 className="font-serif text-2xl font-bold text-white">近 16 周写作热力图</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            已记录 {totalLoggedWords.toLocaleString()} 个新增字数；达到每日目标后会自动算作一次打卡。
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-400">
                        {nextTrophy
                            ? `距离「${nextTrophy.label}」还差 ${nextTrophy.days - currentStreak} 天`
                            : '奖杯墙已全部点亮'}
                    </div>
                </div>

                <div className="overflow-x-auto pb-2 custom-scrollbar">
                    <div
                        className="grid grid-flow-col grid-rows-7 gap-1"
                        style={{ gridTemplateColumns: `repeat(${Math.ceil(heatmapDays.length / 7)}, minmax(12px, 12px))` }}
                    >
                        {heatmapDays.map((day) => (
                            <div
                                key={day.date}
                                title={`${formatDateLabel(day.date)}: ${day.words.toLocaleString()} words`}
                                className={cn(
                                    "h-3 w-3 rounded-[3px] border transition-transform hover:scale-125",
                                    getHeatmapCellClass(day.level),
                                    day.isToday && "ring-1 ring-white/70 ring-offset-2 ring-offset-[var(--color-bg-base)]"
                                )}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4 text-xs text-gray-600">
                    <span>Less</span>
                    <div className="flex items-center gap-1">
                        {[0, 1, 2, 3, 4].map((level) => (
                            <span
                                key={level}
                                className={cn("h-3 w-3 rounded-[3px] border", getHeatmapCellClass(level))}
                            />
                        ))}
                    </div>
                    <span>More</span>
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
                        Active Writing Plans
                    </h3>
                </div>

                {activePlans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activePlans.map(file => {
                            const progress = getProgress(file.metadata?.wordCount || 0, file.metadata?.targetWordCount);
                            const daysLeft = getDaysRemaining(file.metadata?.deadline);

                            return (
                                <div
                                    key={file.id}
                                    onClick={() => handleOpenFile(file.id)}
                                    className="p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/5 rounded-lg text-accent-primary">
                                                <FileText size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-200 group-hover:text-white transition-colors">{file.name}</h4>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                    {file.metadata?.status && (
                                                        <span className={cn(
                                                            "px-1.5 py-0.5 rounded-full capitalize",
                                                            file.metadata.status === 'writing' && "bg-blue-500/10 text-blue-400",
                                                            file.metadata.status === 'brainstorming' && "bg-yellow-500/10 text-yellow-400",
                                                            file.metadata.status === 'completed' && "bg-green-500/10 text-green-400"
                                                        )}>
                                                            {file.metadata.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {daysLeft !== null && (
                                            <div className={cn(
                                                "text-xs px-2 py-1 rounded-md border",
                                                daysLeft < 0 ? "border-red-500/20 bg-red-500/10 text-red-400" :
                                                    daysLeft <= 3 ? "border-orange-500/20 bg-orange-500/10 text-orange-400" :
                                                        "border-white/5 bg-white/5 text-gray-400"
                                            )}>
                                                {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                                            </div>
                                        )}
                                    </div>

                                    {file.metadata?.targetWordCount ? (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>Progress</span>
                                                <span>{file.metadata.wordCount} / {file.metadata.targetWordCount} ({progress}%)</span>
                                            </div>
                                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full transition-all duration-500",
                                                        progress >= 100 ? "bg-green-500" : "bg-accent-primary"
                                                    )}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-4 text-xs text-gray-500">
                                            {file.metadata?.wordCount} words written
                                        </div>
                                    )}

                                    <div className="absolute bottom-4 right-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                        <ArrowRight size={16} className="text-white" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                        <p className="text-gray-500 mb-2">No active plans.</p>
                        <p className="text-sm text-gray-600">Set a target or deadline for your files to see them here.</p>
                    </div>
                )}
            </section>
        </div>
    )
}

function getProgress(current: number, target?: number) {
    if (!target || target === 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
}

function getDayWords(logs: Record<string, DailyWritingLog>, date: Date): number {
    return logs[getLocalDateKey(date)]?.words || 0;
}

function getCurrentStreak(logs: Record<string, DailyWritingLog>, target: number, now: Date): number {
    if (target <= 0) return 0;

    const today = startOfLocalDay(now);
    const todayComplete = getDayWords(logs, today) >= target;
    let cursor = todayComplete ? today : addLocalDays(today, -1);
    let streak = 0;

    while (getDayWords(logs, cursor) >= target) {
        streak += 1;
        cursor = addLocalDays(cursor, -1);
    }

    return streak;
}

function getLongestStreak(logs: Record<string, DailyWritingLog>, target: number): number {
    if (target <= 0) return 0;

    const completedDates = Object.values(logs)
        .filter((log) => log.words >= target)
        .map((log) => log.date)
        .sort((a, b) => a.localeCompare(b));
    let longest = 0;
    let current = 0;
    let previousDate: Date | null = null;

    completedDates.forEach((dateKey) => {
        const date = parseLocalDateKey(dateKey);
        const isConsecutive = previousDate
            ? getLocalDateKey(addLocalDays(previousDate, 1)) === dateKey
            : false;

        current = isConsecutive ? current + 1 : 1;
        longest = Math.max(longest, current);
        previousDate = date;
    });

    return longest;
}

function getHeatmapDays(logs: Record<string, DailyWritingLog>, target: number, now: Date): HeatmapDay[] {
    const today = startOfLocalDay(now);

    return Array.from({ length: HEATMAP_DAY_COUNT }, (_, index) => {
        const date = addLocalDays(today, index - HEATMAP_DAY_COUNT + 1);
        const dateKey = getLocalDateKey(date);
        const words = logs[dateKey]?.words || 0;

        return {
            date: dateKey,
            words,
            level: getHeatmapLevel(words, target),
            isToday: dateKey === getLocalDateKey(today),
        };
    });
}

function getHeatmapLevel(words: number, target: number): number {
    if (words <= 0) return 0;
    if (target <= 0) return Math.min(4, Math.ceil(words / 250));

    const ratio = words / target;
    if (ratio >= 1) return 4;
    if (ratio >= 0.75) return 3;
    if (ratio >= 0.35) return 2;
    return 1;
}

function getHeatmapCellClass(level: number): string {
    if (level >= 4) return 'border-green-300/40 bg-green-400/80 shadow-[0_0_12px_rgba(74,222,128,0.35)]';
    if (level === 3) return 'border-accent-secondary/40 bg-accent-secondary/60';
    if (level === 2) return 'border-accent-primary/30 bg-accent-primary/40';
    if (level === 1) return 'border-accent-primary/20 bg-accent-primary/20';
    return 'border-white/5 bg-white/[0.04]';
}

function formatDateLabel(dateKey: string): string {
    return parseLocalDateKey(dateKey).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    });
}
