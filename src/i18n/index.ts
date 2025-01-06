import en from './locales/en';
import zh from './locales/zh';
import type { App } from 'obsidian';

export type Language = 'en' | 'zh';

export interface I18n {
    locale: Language;
    t: (key: string) => string;
}

export class I18nManager {
    private static instance: I18nManager;
    private app: App;
    private locale: Language;
    private messages: { [key: string]: any };

    private constructor(app: App) {
        this.app = app;
        this.locale = this.detectLocale();
        this.messages = {
            en,
            zh
        };
    }

    public static getInstance(app: App): I18nManager {
        if (!I18nManager.instance) {
            I18nManager.instance = new I18nManager(app);
        }
        return I18nManager.instance;
    }

    private detectLocale(): Language {
        const locale = window.localStorage.getItem('ai-plugin-locale') || 
                      navigator.language;
        return locale.toLowerCase().startsWith('zh') ? 'zh' : 'en';
    }

    public setLocale(locale: Language): void {
        this.locale = locale;
        window.localStorage.setItem('ai-plugin-locale', locale);
    }

    public t(key: string): string {
        const keys = key.split('.');
        let value = this.messages[this.locale];
        
        for (const k of keys) {
            if (value === undefined) break;
            value = value[k];
        }

        return value || key;
    }

    public getCurrentLocale(): Language {
        return this.locale;
    }
} 
