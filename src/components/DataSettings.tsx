import { useRef } from 'react';
import { useFileStore } from '../store/useFileStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useModalStore } from '../store/useModalStore';
import { downloadFile, readJsonFile } from '../lib/file-utils';
import { Download, Upload, Trash2, FileJson, AlertTriangle } from 'lucide-react';

export function DataSettings() {
    const fileStore = useFileStore();
    const settingsStore = useSettingsStore();
    const { showConfirm } = useModalStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBackup = () => {
        const data = {
            version: 1,
            timestamp: Date.now(),
            files: fileStore.files,
            settings: {
                modelConfigs: settingsStore.modelConfigs,
                promptTemplates: settingsStore.promptTemplates,
                chatHistory: settingsStore.chatHistory,
            }
        };

        const dateStr = new Date().toISOString().split('T')[0];
        downloadFile(JSON.stringify(data, null, 2), `writeflow-backup-${dateStr}.json`, 'json');
    };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await readJsonFile(file);

            // Basic validation
            if (!data.files || !data.settings) {
                throw new Error('Invalid backup file format');
            }

            showConfirm(
                'Restore Backup',
                'This will overwrite all current data. Are you sure you want to continue?',
                () => {
                    fileStore.importData({ files: data.files });
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
                    Data Backup & Restore
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-white/5 rounded-lg bg-white/[0.02]">
                        <h4 className="font-medium text-gray-200 mb-2">Backup</h4>
                        <p className="text-sm text-gray-500 mb-4">
                            Save all your files, settings, and chats to a local JSON file.
                        </p>
                        <button
                            onClick={handleBackup}
                            className="flex items-center gap-2 px-4 py-2 bg-accent-primary/20 text-accent-primary rounded-md hover:bg-accent-primary/30 transition-colors text-sm font-medium"
                        >
                            <Download size={16} />
                            Download Backup
                        </button>
                    </div>

                    <div className="p-4 border border-white/5 rounded-lg bg-white/[0.02]">
                        <h4 className="font-medium text-gray-200 mb-2">Restore</h4>
                        <p className="text-sm text-gray-500 mb-4">
                            Restore from a previously saved JSON backup file.
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
                            Upload Backup
                        </button>
                    </div>
                </div>
            </div>

            <div className="border border-red-500/20 rounded-lg p-6 bg-red-500/5">
                <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Danger Zone
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                    Permanently delete all data. This action cannot be undone.
                </p>
                <button
                    onClick={() => {
                        showConfirm(
                            'Clear All Data',
                            'Are you ABSOLUTELY sure? This will delete ALL files and settings locally.',
                            () => {
                                localStorage.clear();
                                window.location.reload();
                            }
                        );
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors text-sm font-medium border border-red-500/20"
                >
                    <Trash2 size={16} />
                    Reset All Data
                </button>
            </div>
        </div>
    );
}
