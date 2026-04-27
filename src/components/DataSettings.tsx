import { useRef } from 'react';
import { useFileStore } from '../store/useFileStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useJournalStore } from '../store/useJournalStore';
import { useWritingStatsStore } from '../store/useWritingStatsStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useCollectionStore } from '../store/useCollectionStore';
import { useCreativeSettingStore } from '../store/useCreativeSettingStore';
import { useRoleplayStore } from '../store/useRoleplayStore';
import { useAppearanceStore } from '../store/useAppearanceStore';
import { useModalStore } from '../store/useModalStore';
import { getLocalDateKey } from '../lib/date-utils';
import { clearIndexedDBPersistence } from '../lib/indexeddb-storage';
import { useI18n } from '../lib/i18n';
import { downloadFile, readJsonFile } from '../lib/file-utils';
import { Download, Upload, Trash2, FileJson, AlertTriangle } from 'lucide-react';

interface BackupData {
    version: number;
    timestamp: number;
    files: ReturnType<typeof useFileStore.getState>['files'];
    journal?: {
        entries: ReturnType<typeof useJournalStore.getState>['entries'];
    };
    writingStats?: {
        dailyTargetWords: ReturnType<typeof useWritingStatsStore.getState>['dailyTargetWords'];
        logs: ReturnType<typeof useWritingStatsStore.getState>['logs'];
    };
    collections?: {
        items: ReturnType<typeof useCollectionStore.getState>['items'];
    };
    creativeSettings?: {
        profiles: ReturnType<typeof useCreativeSettingStore.getState>['profiles'];
    };
    roleplay?: {
        sessions: ReturnType<typeof useRoleplayStore.getState>['sessions'];
        activeSessionId: ReturnType<typeof useRoleplayStore.getState>['activeSessionId'];
    };
    language?: ReturnType<typeof useLanguageStore.getState>['language'];
    appearance?: {
        themeMode: ReturnType<typeof useAppearanceStore.getState>['themeMode'];
    };
    settings: {
        modelConfigs: ReturnType<typeof useSettingsStore.getState>['modelConfigs'];
        promptTemplates: ReturnType<typeof useSettingsStore.getState>['promptTemplates'];
        chatHistory: ReturnType<typeof useSettingsStore.getState>['chatHistory'];
    };
}

const isBackupData = (value: unknown): value is BackupData => {
    return isRecord(value)
        && 'files' in value
        && isRecord(value.files)
        && 'settings' in value
        && isRecord(value.settings);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export function DataSettings() {
    const fileStore = useFileStore();
    const settingsStore = useSettingsStore();
    const journalStore = useJournalStore();
    const writingStatsStore = useWritingStatsStore();
    const languageStore = useLanguageStore();
    const collectionStore = useCollectionStore();
    const creativeSettingStore = useCreativeSettingStore();
    const roleplayStore = useRoleplayStore();
    const appearanceStore = useAppearanceStore();
    const { showConfirm } = useModalStore();
    const { t } = useI18n();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBackup = () => {
        const data = {
            version: 1,
            timestamp: Date.now(),
            files: fileStore.files,
            journal: {
                entries: journalStore.entries,
            },
            writingStats: {
                dailyTargetWords: writingStatsStore.dailyTargetWords,
                logs: writingStatsStore.logs,
            },
            collections: {
                items: collectionStore.items,
            },
            creativeSettings: {
                profiles: creativeSettingStore.profiles,
            },
            roleplay: {
                sessions: roleplayStore.sessions,
                activeSessionId: roleplayStore.activeSessionId,
            },
            language: languageStore.language,
            appearance: {
                themeMode: appearanceStore.themeMode,
            },
            settings: {
                modelConfigs: settingsStore.modelConfigs,
                promptTemplates: settingsStore.promptTemplates,
                chatHistory: settingsStore.chatHistory,
            }
        };

        const dateStr = getLocalDateKey();
        downloadFile(JSON.stringify(data, null, 2), `writeflow-backup-${dateStr}.json`, 'json');
    };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await readJsonFile(file);

            // Basic validation
            if (!isBackupData(data)) {
                throw new Error('Invalid backup file format');
            }

            showConfirm(
                t('data.restoreTitle'),
                t('data.restoreConfirm'),
                () => {
                    fileStore.importData({ files: data.files });
                    if (data.journal?.entries) {
                        journalStore.importEntries(data.journal.entries);
                    }
                    if (data.writingStats) {
                        writingStatsStore.importStats(data.writingStats);
                    }
                    if (data.collections?.items) {
                        collectionStore.importItems(data.collections.items);
                    }
                    if (data.creativeSettings?.profiles) {
                        creativeSettingStore.importProfiles(data.creativeSettings.profiles);
                    }
                    if (data.roleplay?.sessions) {
                        roleplayStore.importSessions(data.roleplay.sessions, data.roleplay.activeSessionId);
                    }
                    if (data.language === 'zh' || data.language === 'en') {
                        languageStore.setLanguage(data.language);
                    }
                    if (data.appearance?.themeMode === 'dark' || data.appearance?.themeMode === 'light') {
                        appearanceStore.setThemeMode(data.appearance.themeMode);
                    }
                    settingsStore.importSettings(data.settings);
                    // Force reload to ensure everything is fresh? Or just let React handle updates.
                    // React should handle it since stores notify listeners.
                }
            );
        } catch (error) {
            console.error('Failed to restore backup:', error);
            alert('Failed to restore backup. Invalid file format.');
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-6">
            <div className="border border-white/10 rounded-lg p-6 bg-white/5">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileJson className="text-accent-primary" size={20} />
                    {t('data.title')}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-white/5 rounded-lg bg-white/[0.02]">
                        <h4 className="font-medium text-gray-200 mb-2">{t('data.backup')}</h4>
                        <p className="text-sm text-gray-500 mb-4">
                            {t('data.backupDescription')}
                        </p>
                        <button
                            onClick={handleBackup}
                            className="flex items-center gap-2 px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-md hover:bg-accent-primary/30 transition-colors text-sm font-medium"
                        >
                            <Download size={16} />
                            {t('data.downloadBackup')}
                        </button>
                    </div>

                    <div className="p-4 border border-white/5 rounded-lg bg-white/[0.02]">
                        <h4 className="font-medium text-gray-200 mb-2">{t('data.restore')}</h4>
                        <p className="text-sm text-gray-500 mb-4">
                            {t('data.restoreDescription')}
                        </p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleRestore}
                            accept=".json"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-md hover:bg-white/15 transition-colors text-sm font-medium"
                        >
                            <Upload size={16} />
                            {t('data.uploadBackup')}
                        </button>
                    </div>
                </div>
            </div>

            <div className="border border-red-500/20 rounded-lg p-6 bg-red-500/5">
                <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    {t('data.dangerZone')}
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                    {t('data.dangerDescription')}
                </p>
                <button
                    onClick={() => {
                        showConfirm(
                            t('data.clearTitle'),
                            t('data.clearConfirm'),
                            () => {
                                localStorage.clear();
                                void clearIndexedDBPersistence().finally(() => {
                                    window.location.reload();
                                });
                            }
                        );
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors text-sm font-medium border border-red-500/20"
                >
                    <Trash2 size={16} />
                    {t('data.resetAllData')}
                </button>
            </div>
        </div>
    );
}
