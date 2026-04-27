import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getLocalDateKey } from '../lib/date-utils';

export interface DailyWritingLog {
    date: string;
    words: number;
    targetWords?: number;
    updatedAt: number;
    goalMetAt?: number;
}

interface WritingStatsState {
    dailyTargetWords: number;
    logs: Record<string, DailyWritingLog>;
    setDailyTargetWords: (target: number) => void;
    recordWritingDelta: (delta: number, date?: string) => void;
    importStats: (data: Partial<Pick<WritingStatsState, 'dailyTargetWords' | 'logs'>>) => void;
}

const DEFAULT_DAILY_TARGET = 500;

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isDailyWritingLog = (value: unknown): value is DailyWritingLog => {
    return isRecord(value)
        && typeof value.date === 'string'
        && typeof value.words === 'number'
        && Number.isFinite(value.words)
        && typeof value.updatedAt === 'number'
        && Number.isFinite(value.updatedAt)
        && (value.targetWords === undefined || typeof value.targetWords === 'number')
        && (value.goalMetAt === undefined || typeof value.goalMetAt === 'number');
};

const normalizeLogs = (logs: Record<string, DailyWritingLog>): Record<string, DailyWritingLog> => {
    return Object.fromEntries(
        Object.entries(logs)
            .filter((entry): entry is [string, DailyWritingLog] => isDailyWritingLog(entry[1]))
            .map(([date, log]) => [
                date,
                {
                    ...log,
                    date,
                    words: Math.max(0, Math.round(log.words)),
                    targetWords: log.targetWords ? Math.max(1, Math.round(log.targetWords)) : undefined,
                },
            ])
    );
};

export const useWritingStatsStore = create<WritingStatsState>()(
    persist(
        (set) => ({
            dailyTargetWords: DEFAULT_DAILY_TARGET,
            logs: {},

            setDailyTargetWords: (target) => set({
                dailyTargetWords: Math.max(1, Math.round(target)),
            }),

            recordWritingDelta: (delta, date = getLocalDateKey()) => {
                const wordsToAdd = Math.max(0, Math.round(delta));
                if (wordsToAdd === 0) return;

                set((state) => {
                    const existingLog = state.logs[date];
                    const targetWords = existingLog?.targetWords || state.dailyTargetWords;
                    const nextWords = (existingLog?.words || 0) + wordsToAdd;
                    const reachedGoal = nextWords >= targetWords;

                    return {
                        logs: {
                            ...state.logs,
                            [date]: {
                                date,
                                words: nextWords,
                                targetWords,
                                updatedAt: Date.now(),
                                goalMetAt: existingLog?.goalMetAt || (reachedGoal ? Date.now() : undefined),
                            },
                        },
                    };
                });
            },

            importStats: (data) => set((state) => ({
                dailyTargetWords: typeof data.dailyTargetWords === 'number' && Number.isFinite(data.dailyTargetWords)
                    ? Math.max(1, Math.round(data.dailyTargetWords))
                    : state.dailyTargetWords,
                logs: data.logs ? normalizeLogs(data.logs) : state.logs,
            })),
        }),
        {
            name: 'writeflow-writing-stats',
        }
    )
);
