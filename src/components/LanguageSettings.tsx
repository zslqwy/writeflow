import { Check, Languages } from 'lucide-react';

import { useI18n } from '../lib/i18n';
import { cn } from '../lib/utils';
import { useLanguageStore, type Language } from '../store/useLanguageStore';

const LANGUAGE_OPTIONS: { id: Language; labelKey: 'settings.languageZh' | 'settings.languageEn'; descriptionKey: 'settings.languageZhDescription' | 'settings.languageEnDescription' }[] = [
    {
        id: 'zh',
        labelKey: 'settings.languageZh',
        descriptionKey: 'settings.languageZhDescription',
    },
    {
        id: 'en',
        labelKey: 'settings.languageEn',
        descriptionKey: 'settings.languageEnDescription',
    },
];

export function LanguageSettings() {
    const { language, t } = useI18n();
    const setLanguage = useLanguageStore((state) => state.setLanguage);

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="mb-5 flex items-start gap-3">
                    <div className="rounded-xl bg-accent-primary/15 p-2 text-accent-primary">
                        <Languages size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">{t('settings.languageTitle')}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-gray-500">{t('settings.languageDescription')}</p>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    {LANGUAGE_OPTIONS.map((option) => {
                        const selected = language === option.id;

                        return (
                            <button
                                key={option.id}
                                onClick={() => setLanguage(option.id)}
                                className={cn(
                                    "rounded-2xl border p-4 text-left transition-all",
                                    selected
                                        ? "border-accent-primary/50 bg-accent-primary/10"
                                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                                )}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-base font-semibold text-white">{t(option.labelKey)}</span>
                                    {selected && (
                                        <span className="rounded-full bg-accent-primary/20 p-1 text-accent-primary">
                                            <Check size={14} />
                                        </span>
                                    )}
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-gray-500">{t(option.descriptionKey)}</p>
                            </button>
                        );
                    })}
                </div>

                <p className="mt-5 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-relaxed text-gray-500">
                    {t('settings.languageNote')}
                </p>
            </section>
        </div>
    );
}
