import { create } from 'zustand';

interface FocusStore {
    isFocusMode: boolean;
    timerActive: boolean;
    duration: number; // in minutes
    startTime: number | null; // timestamp

    startFocus: (duration: number) => void;
    stopFocus: () => void;
    toggleSidebar: () => void; // Independent toggle if needed, or tied to focus mode
    setFocusMode: (isActive: boolean) => void;
}

export const useFocusStore = create<FocusStore>((set) => ({
    isFocusMode: false,
    timerActive: false,
    duration: 25,
    startTime: null,

    startFocus: (duration) => set({
        isFocusMode: true,
        timerActive: true,
        duration,
        startTime: Date.now()
    }),

    stopFocus: () => set({
        isFocusMode: false,
        timerActive: false,
        startTime: null
    }),

    toggleSidebar: () => set((state) => ({ isFocusMode: !state.isFocusMode })),

    setFocusMode: (isActive) => set({ isFocusMode: isActive }),
}));
