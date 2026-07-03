/// <reference types="react" />
/// <reference types="react-dom" />

declare global {
    interface ImportMetaEnv {
        readonly MODE: string;
        readonly BASE_URL: string;
        readonly DEV: boolean;
        readonly PROD: boolean;
    }
}

export { };
