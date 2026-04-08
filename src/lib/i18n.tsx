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
        "كاشير": "Cashier",
        
        // Dashboard Home
        "الوصول السريع": "Quick Access",
        "المبيعات مقابل المشتريات": "Sales vs Purchases",
        "توزيع السيولة النقدية": "Cash Distribution",
        "آخر الحركات المالية": "Recent Transactions",
        "أكبر مديونيات العملاء": "Top Customer Debts",
        "إجمالي المبيعات": "Total Sales",
        "إجمالي المشتريات": "Total Purchases",
        "صافي الربح": "Net Profit",
        "رصيد الخزينة": "Treasury Balance",
        "ذمم العملاء": "Customer Debts",
        "مبيعات اليوم": "Today's Sales",
        "نواقص المخزن": "Low Stock Items",
        "فاتورة مبيعات": "Sales Invoice",
        "فاتورة مشتريات": "Purchase Invoice",
        "سند قبض": "Receipt Voucher",
        "سند صرف": "Payment Voucher",
        "الأصناف": "Items",
        "شجرة الحسابات": "Chart of Accounts",
        "إيرادات الخدمات مقابل المصروفات": "Services Revenue vs Expenses",
        "إيرادات اليوم": "Today's Revenue",
        "عدد الخدمات": "Number of Services",
        "عدد العملاء": "Number of Customers",
        "المصروفات": "Expenses",
        "صافي الأرباح": "Net Profits",
        
        "مستخدم النظام": "System User",
        "صباح الخير": "Good Morning",
        "مساء الخير": "Good Afternoon",
        "مساء النور": "Good Evening",
        "اليوم": "Today",
        "هذا الأسبوع": "This Week",
        "هذا الشهر": "This Month",
        "التاريخ والطرف": "Date & Party",
        "القيمة": "Value",
        "النوع": "Type",
        "رقم": "Number",
        
        // Sales / Tables
        "فواتير الخدمات": "Services Invoices",
        "سجل الخدمات المقدمة للعملاء وتحصيل الرسوم": "Services rendered records and fee collections",
        "سجل فواتير المبيعات وحالات التحصيل الفعلية": "Sales invoices and actual collection records",
        "إصدار فاتورة خدمة": "Issue Service Bill",
        "إضافة فاتورة": "Add Invoice",
        "رقم الفاتورة أو اسم العميل...": "Invoice Number or Customer Name...",
        "من": "From",
        "إلى": "To",
        "مسح": "Clear",
        "لا توجد نتائج بحث مطابقة": "No matching search results",
        "لا توجد فواتير خدمات": "No services bills found",
        "لا توجد فواتير مبيعات": "No sales invoices found",
        "عميل نقدي": "Cash Customer",
        "رقم الفاتورة": "Invoice Number",
        "التاريخ": "Date",
        "العميل": "Customer",
        "الإجمالي": "Total",
        "المدفوع": "Paid",
        "المتبقي": "Remaining",
        "الحالة": "Status",
        "إجراءات": "Actions",
        "مدفوعة": "Paid",
        "دفع جزئي": "Partial",
        "غير مدفوعة": "Unpaid",
        
        // Purchases
        "رقم الفاتورة أو اسم المورد...": "Invoice Number or Supplier Name...",
        "لا توجد فواتير مشتريات": "No purchase invoices found",
        "المورد": "Supplier",
        
        // Items / Inventory
        "الخدمات": "Services",
        "تعريف الخدمات التي تقدمها المؤسسة وتحديد أسعارها": "Define organization's services and set their prices",
        "إدارة قائمة المنتجات، تكود الأصناف، ومتابعة الأسعار والمخزون في كافة الفروع": "Manage product catalog, code items, and track prices and inventory across all branches",
        "إضافة خدمة جديدة": "Add New Service",
        "إضافة صنف جديد": "Add New Item",
        "إجمالي الأصناف": "Total Items",
        "صنف": "Item",
        "قيمة المخزون": "Inventory Value",
        "أصناف منخفضة": "Low Stock",
        "تنبيه": "Alert",
        "أصناف نفدت": "Out of Stock",
        "البحث في الأصناف منخفضة المخزون...": "Search in low stock items...",
        "البحث في الأصناف التي نفدت...": "Search in out of stock items...",
        "ابحث باسم الصنف أو كود المنتج...": "Search by item name or product code...",
        "عرض الكل": "View All",
        "الكود": "Code",
        "الباركود": "Barcode",
        "الخدمة": "Service",
        "الكمية": "Quantity",
        "سعر التكلفة": "Cost Price",
        "سعر الخدمة": "Service Price",
        "سعر البيع": "Sell Price",
        "متوسط التكلفة": "Avg Cost",
        "إجمالي التكلفة": "Total Cost",
        "إجراء": "Action"
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
