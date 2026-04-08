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
    ar: {}, // ar defaults to returning the key itself, which is already in Arabic
    en: {
        "الرئيسية": "Dashboard",
        "المبيعات": "Sales",
        "الأقساط": "Installments",
        "المشتريات": "Purchases",
        "إدارة المخزون": "Inventory",
        "الحسابات العامة": "Accounting",
        "الخزن والبنوك": "Treasury & Banks",
        "القيود": "Journal Entries",
        "الموارد البشرية": "Human Resources",
        "الشركاء": "Partners",
        "الأصول الثابتة": "Fixed Assets",
        "التقارير الإحصائية": "Statistical Reports",
        "إعدادات النظام": "System Settings",
        
        // Header specific
        "الإشعارات": "Notifications",
        "تحديد كـ مقروء": "Mark all as read",
        "لا توجد إشعارات جديدة": "No new notifications",
        "لكل الفروع": "All Branches",
        "كل الفروع": "All Branches",
        "الفروع المتاحة": "Available Branches",
        "تغيير كلمة المرور": "Change Password",
        "ملفي الشخصي": "My Profile",
        "مستخدم": "User",
        "تسجيل الخروج": "Logout",
        
        // Roles
        "مدير النظام": "System Admin",
        "مدير فرع": "Branch Manager",
        "محاسب": "Accountant",
        "مندوب مبيعات": "Sales Rep",
        "مسؤول مشتريات": "Procurement",
        "أمين مستودع": "Storekeeper",
        "موارد بشرية": "HR",
        "كاشير": "Cashier"
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
