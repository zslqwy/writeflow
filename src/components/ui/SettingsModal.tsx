import { Database, Languages, X } from 'lucide-react';
import { DataSettings } from '../DataSettings';
import { LanguageSettings } from '../LanguageSettings';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../lib/utils';
import { useState } from 'react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<'general' | 'data'>('general');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-4xl h-[600px] bg-[#1a1a1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <h2 className="text-lg font-semibold text-white">{t('settings.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-48 border-r border-white/5 bg-white/[0.02] py-4">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">{t('settings.system')}</div>
                        <button
                            onClick={() => setActiveTab('general')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors",
                                activeTab === 'general'
                                    ? "bg-accent-primary/10 text-accent-primary border-r-2 border-accent-primary"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Languages size={17} /> {t('settings.general')}
                        </button>
                        <button
                            onClick={() => setActiveTab('data')}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors",
                                activeTab === 'data'
                                    ? "bg-accent-primary/10 text-accent-primary border-r-2 border-accent-primary"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Database size={17} /> {t('settings.data')}
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                        {activeTab === 'general' && <LanguageSettings />}
                        {activeTab === 'data' && <DataSettings />}
                    </div>
                </div>
            </div>
        </div>
    );
}
