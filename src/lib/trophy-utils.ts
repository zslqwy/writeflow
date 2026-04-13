import { addLocalDays, getLocalDateKey, parseLocalDateKey, startOfLocalDay } from './date-utils';
import type { Language } from '../store/useLanguageStore';
import type { DailyWritingLog } from '../store/useWritingStatsStore';

export interface TrophyMilestone {
    days: number;
    label: string;
    title: string;
    description: string;
    labelEn: string;
    titleEn: string;
    descriptionEn: string;
    gradient: string;
}

export interface TrophyWallEntry {
    id: string;
    sequence: number;
    startDate: string;
    endDate: string;
    earnedAt: string;
    levelReachedAt: string;
    days: number;
    level: TrophyMilestone;
    nextLevel?: TrophyMilestone;
    status: 'active' | 'sealed' | 'maxed';
}

export interface NextTrophyTarget {
    milestone: TrophyMilestone;
    remainingDays: number;
}

type StreakRange = {
    startDate: string;
    endDate: string;
    days: number;
    isOpen: boolean;
};

export const TROPHY_MILESTONES: TrophyMilestone[] = [
    {
        days: 3,
        label: '青铜杯',
        title: '初燃',
        description: '连续三天抵达书桌，火已经点起来了。',
        labelEn: 'Bronze Cup',
        titleEn: 'First Flame',
        descriptionEn: 'Three straight days at the desk. The fire has started.',
        gradient: 'from-orange-900/60 via-amber-700/40 to-yellow-500/50',
    },
    {
        days: 7,
        label: '银杯',
        title: '一周回声',
        description: '一整周没有让故事断线，这很不容易。',
        labelEn: 'Silver Cup',
        titleEn: 'Weeklong Echo',
        descriptionEn: 'A full week without letting the story go quiet.',
        gradient: 'from-slate-500/60 via-zinc-300/40 to-white/50',
    },
    {
        days: 14,
        label: '金杯',
        title: '双周长明',
        description: '习惯开始长出骨架，灵感有了落脚的地方。',
        labelEn: 'Gold Cup',
        titleEn: 'Fourteen-Day Lantern',
        descriptionEn: 'The habit has grown a spine, and inspiration has somewhere to land.',
        gradient: 'from-yellow-700/70 via-amber-300/60 to-yellow-100/60',
    },
    {
        days: 30,
        label: '长跑杯',
        title: '月轨',
        description: '一个月的节律被你握住了，作品也会记得。',
        labelEn: 'Endurance Cup',
        titleEn: 'Moon Track',
        descriptionEn: 'A month-long rhythm is now in your hands, and the work will remember.',
        gradient: 'from-cyan-900/70 via-cyan-400/40 to-emerald-200/50',
    },
    {
        days: 60,
        label: '史诗杯',
        title: '群星远征',
        description: '六十天的连续写作，已经像一场真正的远征。',
        labelEn: 'Epic Cup',
        titleEn: 'Starward Expedition',
        descriptionEn: 'Sixty days of continuous writing has become a true expedition.',
        gradient: 'from-indigo-900/80 via-fuchsia-500/45 to-amber-200/60',
    },
];

const FIRST_TROPHY_DAYS = TROPHY_MILESTONES[0].days;
const MAX_TROPHY_DAYS = TROPHY_MILESTONES[TROPHY_MILESTONES.length - 1].days;

export function isWritingLogComplete(log: DailyWritingLog | undefined, fallbackTarget: number): boolean {
    if (!log) return false;
    if (log.goalMetAt) return true;

    const target = log.targetWords || fallbackTarget;
    return target > 0 && log.words >= target;
}

export function getCurrentStreak(
    logs: Record<string, DailyWritingLog>,
    fallbackTarget: number,
    now = new Date()
): number {
    if (fallbackTarget <= 0) return 0;

    const today = startOfLocalDay(now);
    const todayKey = getLocalDateKey(today);
    const todayComplete = isWritingLogComplete(logs[todayKey], fallbackTarget);
    let cursor = todayComplete ? today : addLocalDays(today, -1);
    let streak = 0;

    while (isWritingLogComplete(logs[getLocalDateKey(cursor)], fallbackTarget)) {
        streak += 1;
        cursor = addLocalDays(cursor, -1);
    }

    return streak;
}

export function getLongestStreak(
    logs: Record<string, DailyWritingLog>,
    fallbackTarget: number
): number {
    const completedDates = getCompletedDateKeys(logs, fallbackTarget);
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

export function getTrophyWallEntries(
    logs: Record<string, DailyWritingLog>,
    fallbackTarget: number,
    now = new Date()
): TrophyWallEntry[] {
    const ranges = getStreakRanges(logs, fallbackTarget, now);
    const entries: TrophyWallEntry[] = [];

    ranges.forEach((range) => {
        const rangeStartDate = parseLocalDateKey(range.startDate);
        let consumedDays = 0;

        while (consumedDays < range.days) {
            const cycleDays = Math.min(MAX_TROPHY_DAYS, range.days - consumedDays);
            if (cycleDays < FIRST_TROPHY_DAYS) break;

            const cycleStart = addLocalDays(rangeStartDate, consumedDays);
            const cycleEnd = addLocalDays(cycleStart, cycleDays - 1);
            const level = getTrophyLevel(cycleDays);
            const levelIndex = TROPHY_MILESTONES.findIndex((milestone) => milestone.days === level.days);
            const isLastCycleInOpenRange = range.isOpen && consumedDays + cycleDays === range.days;
            const status = cycleDays >= MAX_TROPHY_DAYS
                ? 'maxed'
                : isLastCycleInOpenRange ? 'active' : 'sealed';

            entries.push({
                id: `${getLocalDateKey(cycleStart)}-${getLocalDateKey(cycleEnd)}-${entries.length + 1}`,
                sequence: entries.length + 1,
                startDate: getLocalDateKey(cycleStart),
                endDate: getLocalDateKey(cycleEnd),
                earnedAt: getLocalDateKey(addLocalDays(cycleStart, FIRST_TROPHY_DAYS - 1)),
                levelReachedAt: getLocalDateKey(addLocalDays(cycleStart, level.days - 1)),
                days: cycleDays,
                level,
                nextLevel: TROPHY_MILESTONES[levelIndex + 1],
                status,
            });

            consumedDays += cycleDays;
        }
    });

    return entries.sort((a, b) => b.earnedAt.localeCompare(a.earnedAt));
}

export function getNextTrophyTargetForStreak(streak: number): NextTrophyTarget {
    const cycleDays = streak % MAX_TROPHY_DAYS;
    const normalizedCycleDays = streak > 0 && cycleDays === 0 ? 0 : cycleDays;
    const milestone = TROPHY_MILESTONES.find((item) => item.days > normalizedCycleDays) || TROPHY_MILESTONES[0];

    return {
        milestone,
        remainingDays: milestone.days - normalizedCycleDays,
    };
}

export function getTrophyMilestoneText(milestone: TrophyMilestone, language: Language) {
    return {
        label: language === 'zh' ? milestone.label : milestone.labelEn,
        title: language === 'zh' ? milestone.title : milestone.titleEn,
        description: language === 'zh' ? milestone.description : milestone.descriptionEn,
    };
}

function getCompletedDateKeys(
    logs: Record<string, DailyWritingLog>,
    fallbackTarget: number
): string[] {
    return Object.values(logs)
        .filter((log) => isWritingLogComplete(log, fallbackTarget))
        .map((log) => log.date)
        .sort((a, b) => a.localeCompare(b));
}

function getStreakRanges(
    logs: Record<string, DailyWritingLog>,
    fallbackTarget: number,
    now: Date
): StreakRange[] {
    const completedDates = getCompletedDateKeys(logs, fallbackTarget);
    const ranges: Omit<StreakRange, 'isOpen'>[] = [];

    completedDates.forEach((dateKey) => {
        const previousRange = ranges[ranges.length - 1];
        const isConsecutive = previousRange
            ? getLocalDateKey(addLocalDays(parseLocalDateKey(previousRange.endDate), 1)) === dateKey
            : false;

        if (previousRange && isConsecutive) {
            previousRange.endDate = dateKey;
            previousRange.days += 1;
            return;
        }

        ranges.push({
            startDate: dateKey,
            endDate: dateKey,
            days: 1,
        });
    });

    const today = startOfLocalDay(now);
    const lastOpenDate = getLocalDateKey(addLocalDays(today, -1));
    const todayKey = getLocalDateKey(today);

    return ranges.map((range) => ({
        ...range,
        isOpen: range.endDate === todayKey || range.endDate === lastOpenDate,
    }));
}

function getTrophyLevel(days: number): TrophyMilestone {
    return TROPHY_MILESTONES.reduce((best, milestone) => (
        days >= milestone.days ? milestone : best
    ), TROPHY_MILESTONES[0]);
}
