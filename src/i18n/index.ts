import en from './locales/en';
import zh from './locales/zh';

export type Language = 'en' | 'zh';

export interface I18n {
    locale: Language;
    t: (key: string) => string;
}

export class I18nManager {
    private static instance: I18nManager;
    private locale: Language;
    private messages: { [key: string]: any };

    private constructor() {
        this.locale = this.detectLocale();
        this.messages = {
            en,
            zh
        };
    }

    /**
     * 获取 I18nManager 的单例实例
     * 如果实例不存在则创建新实例，否则返回已有实例
     * 使用单例模式确保整个应用只有一个国际化管理器实例
     * @returns I18nManager 实例
     */
    public static getInstance(): I18nManager {
        if (!I18nManager.instance) {
            I18nManager.instance = new I18nManager();
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
