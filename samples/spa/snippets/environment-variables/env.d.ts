/// <reference types="vite/client" />

declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
    readonly VITE_PUBLIC_TITLE?: string;
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_FEATURE_FLAG_EXPERIMENTAL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
