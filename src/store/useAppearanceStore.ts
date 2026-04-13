import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';

interface AppearanceState {
    themeMode: ThemeMode;
    setThemeMode: (themeMode: ThemeMode) => void;
    toggleThemeMode: () => void;
}

export const useAppearanceStore = create<AppearanceState>()(
    persist(
        (set) => ({
            themeMode: 'dark',
            setThemeMode: (themeMode) => set({ themeMode }),
            toggleThemeMode: () => set((state) => ({
                themeMode: state.themeMode === 'dark' ? 'light' : 'dark'
            })),
        }),
        {
            name: 'writeflow-appearance',
        }
    )
);
