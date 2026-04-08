"use client";

import { SessionProvider } from "next-auth/react";
import { createContext, useContext, useEffect, useState } from "react";
import { LanguageProvider } from "@/lib/i18n";

const ThemeContext = createContext({
    theme: 'dark',
    toggleTheme: () => { }
});

export const useTheme = () => useContext(ThemeContext);

export function Providers({ children }: {
    children: React.ReactNode;
}) {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        const saved = localStorage.getItem('erp_theme') as 'dark' | 'light' | null;
        if (saved) {
            setTheme(saved);
            document.documentElement.setAttribute('data-theme', saved);
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        const handleWheel = (e: WheelEvent) => {
            const el = document.activeElement as any;
            if (el && el.type === 'number') el.blur();
        };
        window.addEventListener('wheel', handleWheel, { passive: true });
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('erp_theme', next);
        document.documentElement.setAttribute('data-theme', next);
    };

    return (
        <SessionProvider refetchOnWindowFocus={false}>
            <LanguageProvider>
                <ThemeContext.Provider value={{ theme, toggleTheme }}>
                    {children}
                </ThemeContext.Provider>
            </LanguageProvider>
        </SessionProvider>
    );
}
