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
    useEffect(() => {
        document.documentElement.removeAttribute('data-theme');

        const handleWheel = (e: WheelEvent) => {
            const el = document.activeElement as any;
            if (el && el.type === 'number') {
                el.blur();
            }
        };
        window.addEventListener('wheel', handleWheel, { passive: true });
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);

    return (
        <SessionProvider refetchOnWindowFocus={false}>
            <LanguageProvider>
                <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: () => {} }}>
                    {children}
                </ThemeContext.Provider>
            </LanguageProvider>
        </SessionProvider>
    );
}
