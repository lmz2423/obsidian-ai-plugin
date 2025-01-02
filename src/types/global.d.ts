import type AIPlugin from '../main';

declare global {
    interface Window {
        aiPlugin?: AIPlugin;
    }
}

declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<{}, {}, any>;
    export default component;
}

export {}; 
