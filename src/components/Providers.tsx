"use client";

import { SessionProvider } from "next-auth/react";
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
    theme: 'dark',
    toggleTheme: () => { }
});

export const useTheme = () => useContext(ThemeContext);

export function Providers({ children, session }: { 
    children: React.ReactNode; 
    session?: any 
}) {
    // Forced Dark Mode - Removed Light Mode logic
    useEffect(() => {
        document.documentElement.removeAttribute('data-theme');

        // Global fix to allow page scroll while preventing number input value change
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
        <SessionProvider session={session}>
            <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: () => {} }}>
                {children}
            </ThemeContext.Provider>
        </SessionProvider>
    );
}
