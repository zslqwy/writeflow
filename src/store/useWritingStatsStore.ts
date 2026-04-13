import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { getLocalDateKey } from '../lib/date-utils';

export interface DailyWritingLog {
    date: string;
    words: number;
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
                    const nextWords = (existingLog?.words || 0) + wordsToAdd;
                    const reachedGoal = nextWords >= state.dailyTargetWords;

                    return {
                        logs: {
                            ...state.logs,
                            [date]: {
                                date,
                                words: nextWords,
                                updatedAt: Date.now(),
                                goalMetAt: existingLog?.goalMetAt || (reachedGoal ? Date.now() : undefined),
                            },
                        },
                    };
                });
            },

            importStats: (data) => set((state) => ({
                dailyTargetWords: data.dailyTargetWords || state.dailyTargetWords,
                logs: data.logs || state.logs,
            })),
        }),
        {
            name: 'writeflow-writing-stats',
        }
    )
);
