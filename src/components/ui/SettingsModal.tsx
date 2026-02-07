import { X } from 'lucide-react';
import { DataSettings } from '../DataSettings';
import { cn } from '../../lib/utils';
import { useState } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    // Only need what's relevant for DataSettings or future system settings
    // DataSettings manages its own store interaction mostly.

    // We can still use tabs if we expect more system settings later (e.g. Appearance)
    const [activeTab, setActiveTab] = useState<'data'>('data');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-4xl h-[600px] bg-[#1a1a1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <h2 className="text-lg font-semibold text-white">Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-48 border-r border-white/5 bg-white/[0.02] py-4">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">System</div>
                        <button
                            onClick={() => setActiveTab('data')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors",
                                activeTab === 'data'
                                    ? "bg-accent-primary/10 text-accent-primary border-r-2 border-accent-primary"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <div className="text-lg">💾</div> Data & Backup
                        </button>
                        {/* Future: Appearance, Shortcuts, etc. */}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                        {activeTab === 'data' && <DataSettings />}
                    </div>
                </div>
            </div>
        </div>
    );
}
