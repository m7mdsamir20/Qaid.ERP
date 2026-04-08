'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ar' | 'en';

interface LanguageContextType {
    lang: Language;
    t: (key: string) => string;
    toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const dictionaries = {
    ar: {
        // عام
        "welcome": "مرحباً",
        "search_placeholder": "ابحث عن فاتورة، عميل أو صنف...",
        "search_services": "ابحث عن فاتورة، عميل أو خدمة...",
        "notifications": "الإشعارات",
        "mark_all_read": "تحديد كـ مقروء",
        "no_notifications": "لا توجد إشعارات جديدة",
        "branches": "الفروع المتاحة",
        "all_branches": "كل الفروع",
        "my_profile": "ملفي الشخصي",
        "change_password": "تغيير كلمة المرور",
        "logout": "تسجيل الخروج",
        // القائمة الجانبية (أمثلة مبدئية)
        "dashboard": "لوحة القيادة",
        "sales": "المبيعات",
        "purchases": "المشتريات",
        "inventory": "المخزون",
        "accounting": "الحسابات",
        "reports": "التقارير",
        "settings": "الإعدادات"
    },
    en: {
        // General
        "welcome": "Welcome",
        "search_placeholder": "Search invoice, customer, or item...",
        "search_services": "Search invoice, customer, or service...",
        "notifications": "Notifications",
        "mark_all_read": "Mark all as read",
        "no_notifications": "No new notifications",
        "branches": "Available Branches",
        "all_branches": "All Branches",
        "my_profile": "My Profile",
        "change_password": "Change Password",
        "logout": "Logout",
        // Sidebar
        "dashboard": "Dashboard",
        "sales": "Sales",
        "purchases": "Purchases",
        "inventory": "Inventory",
        "accounting": "Accounting",
        "reports": "Reports",
        "settings": "Settings"
    }
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [lang, setLang] = useState<Language>('ar');

    useEffect(() => {
        const savedLang = localStorage.getItem('erp_lang') as Language;
        if (savedLang === 'en' || savedLang === 'ar') {
            setLang(savedLang);
            document.documentElement.dir = savedLang === 'en' ? 'ltr' : 'rtl';
            document.documentElement.lang = savedLang;
        }
    }, []);

    const toggleLang = () => {
        const newLang = lang === 'ar' ? 'en' : 'ar';
        setLang(newLang);
        localStorage.setItem('erp_lang', newLang);
        document.documentElement.dir = newLang === 'en' ? 'ltr' : 'rtl';
        document.documentElement.lang = newLang;
        // Optionally refresh page or let React reactivity handle UI
        window.location.reload(); 
    };

    const t = (key: string): string => {
        const dictionary = dictionaries[lang];
        // @ts-ignore
        return dictionary[key] || key;
    };

    return (
        <LanguageContext.Provider value={{ lang, t, toggleLang }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }
    return context;
};
