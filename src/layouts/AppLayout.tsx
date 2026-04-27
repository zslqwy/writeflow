import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useFocusStore } from '../store/useFocusStore';
import { useAppearanceStore } from '../store/useAppearanceStore';
import { useFileStore } from '../store/useFileStore';
import { useJournalStore } from '../store/useJournalStore';
import { useCollectionStore } from '../store/useCollectionStore';
import { useCreativeSettingStore } from '../store/useCreativeSettingStore';
import { useRoleplayStore } from '../store/useRoleplayStore';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import { PanelLeftClose, PanelLeft, Sparkles } from 'lucide-react';
import { AIAssistant } from '../components/AIAssistant';
import { QuickCapture } from '../components/QuickCapture';
import { SettingsModal } from '../components/ui/SettingsModal';
import { AISettingsModal } from '../components/ui/AISettingsModal';
import { useI18n } from '../lib/i18n';

export function AppLayout() {
    const { isFocusMode } = useFocusStore();
    const { themeMode } = useAppearanceStore();
    const { language, t } = useI18n();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
    const [contentStorageReady, setContentStorageReady] = useState(() => (
        useFileStore.persist.hasHydrated()
        && useJournalStore.persist.hasHydrated()
        && useCollectionStore.persist.hasHydrated()
        && useCreativeSettingStore.persist.hasHydrated()
        && useRoleplayStore.persist.hasHydrated()
    ));

    const isSidebarHidden = isFocusMode || sidebarCollapsed;

    useEffect(() => {
        const updateHydrationState = () => {
            setContentStorageReady(
                useFileStore.persist.hasHydrated()
                && useJournalStore.persist.hasHydrated()
                && useCollectionStore.persist.hasHydrated()
                && useCreativeSettingStore.persist.hasHydrated()
                && useRoleplayStore.persist.hasHydrated()
            );
        };
        const unsubscribeFileStore = useFileStore.persist.onFinishHydration(updateHydrationState);
        const unsubscribeJournalStore = useJournalStore.persist.onFinishHydration(updateHydrationState);
        const unsubscribeCollectionStore = useCollectionStore.persist.onFinishHydration(updateHydrationState);
        const unsubscribeCreativeSettingStore = useCreativeSettingStore.persist.onFinishHydration(updateHydrationState);
        const unsubscribeRoleplayStore = useRoleplayStore.persist.onFinishHydration(updateHydrationState);

        updateHydrationState();

        return () => {
            unsubscribeFileStore();
            unsubscribeJournalStore();
            unsubscribeCollectionStore();
            unsubscribeCreativeSettingStore();
            unsubscribeRoleplayStore();
        };
    }, []);

    useEffect(() => {
        document.documentElement.dataset.theme = themeMode;
    }, [themeMode]);

    useEffect(() => {
        document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    }, [language]);

    return (
        <div className="flex h-screen w-full overflow-hidden text-gray-200 font-sans selection:bg-accent-primary/30 selection:text-white">
            {/* Sidebar Container */}
            <div className={cn(
                "transition-all duration-500 ease-in-out overflow-hidden border-r border-white/5 flex-shrink-0",
                isSidebarHidden ? "w-0" : "w-64"
            )}>
                <div className="w-64 h-full">
                    <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
                </div>
            </div>

            {/* Sidebar Toggle Button */}
            <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={cn(
                    "fixed z-[200] bottom-4 p-2.5 rounded-full shadow-lg transition-all duration-300",
                    "bg-[#1a1a1e]/90 backdrop-blur-xl border border-white/10",
                    "text-gray-400 hover:text-white hover:bg-white/10",
                    isSidebarHidden ? "left-4" : "left-[15rem]"
                )}
                title={isSidebarHidden ? t('layout.showSidebar') : t('layout.hideSidebar')}
            >
                {isSidebarHidden ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>

            {/* AI Assistant Toggle Button */}
            <button
                onClick={() => setAiOpen(!aiOpen)}
                className={cn(
                    "fixed z-[200] bottom-4 right-6 p-3 rounded-full shadow-lg transition-all duration-300",
                    "border border-white/10",
                    aiOpen
                        ? "bg-accent-primary text-white"
                        : "bg-[#1a1a1e]/90 backdrop-blur-xl text-gray-400 hover:text-white hover:bg-white/10"
                )}
                title={t('layout.aiAssistant')}
            >
                <Sparkles size={20} />
            </button>

            {contentStorageReady && <QuickCapture />}

            <main className="flex-1 overflow-hidden relative flex flex-col">
                {contentStorageReady ? (
                    <div className="flex-1 overflow-auto">
                        <Outlet />
                    </div>
                ) : (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 text-center glass">
                            <Sparkles size={24} className="mx-auto mb-3 text-accent-primary" />
                            <p className="text-sm font-medium text-gray-200">{t('layout.loadingLibrary')}</p>
                            <p className="mt-1 text-xs text-gray-500">{t('layout.preparingStorage')}</p>
                        </div>
                    </div>
                )}
            </main>

            {/* AI Assistant Panel */}
            <AIAssistant
                isOpen={aiOpen}
                onClose={() => setAiOpen(false)}
                onOpenSettings={() => {
                    setAiSettingsOpen(true);
                }}
            />

            {/* System Settings Modal */}
            <SettingsModal
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
            />

            {/* AI Settings Modal */}
            <AISettingsModal
                isOpen={aiSettingsOpen}
                onClose={() => setAiSettingsOpen(false)}
            />
        </div>
    );
}
