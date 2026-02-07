import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useFocusStore } from '../store/useFocusStore';
import { cn } from '../lib/utils';
import { useState } from 'react';
import { PanelLeftClose, PanelLeft, Sparkles } from 'lucide-react';
import { AIAssistant } from '../components/AIAssistant';
import { SettingsModal } from '../components/ui/SettingsModal';
import { AISettingsModal } from '../components/ui/AISettingsModal';

export function AppLayout() {
    const { isFocusMode } = useFocusStore();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

    const isSidebarHidden = isFocusMode || sidebarCollapsed;

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
                title={isSidebarHidden ? "Show Sidebar" : "Hide Sidebar"}
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
                title="AI Assistant"
            >
                <Sparkles size={20} />
            </button>

            <main className="flex-1 overflow-hidden relative flex flex-col">
                <div className="flex-1 overflow-auto">
                    <Outlet />
                </div>
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
