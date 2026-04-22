"use client";

import { SessionProvider } from 'next-auth/react';
import { createContext, useContext, useEffect, useState } from 'react';
import { LanguageProvider } from '@/lib/i18n';

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
        // Find existing theme from DOM (set by our head script) or localStorage
        const existingTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const savedTheme = (localStorage.getItem('erp-theme') as 'dark' | 'light') || existingTheme;
        
        setTheme(savedTheme);
        if (savedTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        const handleWheel = (e: WheelEvent) => {
            const el = document.activeElement as any;
            if (el && el.type === 'number') {
                el.blur();
            }
        };
        window.addEventListener('wheel', handleWheel, { passive: true });
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('erp-theme', newTheme);
        if (newTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
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
