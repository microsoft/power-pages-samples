export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}
