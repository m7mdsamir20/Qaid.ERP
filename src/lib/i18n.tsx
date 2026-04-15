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
    ar: {}, // Arabic returns the key itself
    en: {
        // --- Global & Shared ---
        "الرئيسية": "Home",
        "لوحة التحكم": "Dashboard",
        "إغلاق": "Close",
        "حفظ": "Save",
        "إلغاء": "Cancel",
        "تعديل": "Edit",
        "حذف": "Delete",
        "تأكيد": "Confirm",
        "البحث": "Search",
        "جاري التحميل...": "Loading...",
        "عرض التفاصيل": "View Details",
        "الكل": "All",
        "نشط": "Active",
        "موقوف": "Suspended",
        "متوقف": "Stopped/Inactive",
        "متزن": "Balanced",
        "تم الحفظ بنجاح": "Saved successfully ✓",
        "فشل الحفظ": "Save failed",
        "فشل الحذف": "Delete failed",
        "أخرى": "Other",
        "الوحدة": "Unit",
        "القيمة": "Amount",
        "النوع": "Type",
        "رقم": "ID/No",
        "تاريخ": "Date",
        "من": "From",
        "إلى": "To",
        "مسح": "Clear",
        "إجراءات": "Actions",
        "إجراء": "Action",
        "عرض الكل": "View All",
        "مطلوب": "Required",
        "تراجع": "Back",
        "طباعة": "Print",
        "اختياري": "Optional",

        // --- Role Labels ---
        "مدير النظام": "System Admin",
        "مدير فرع": "Branch Manager",
        "محاسب": "Accountant",
        "مندوب مبيعات": "Sales Rep",
        "مسؤول مشتريات": "Procurement Officer",
        "أمين مستودع": "Storekeeper",
        "موارد بشرية": "HR Manager",
        "كاشير": "Cashier",
        "مستخدم": "User",

        // --- Sales & Purchases Lists ---
        "المبيعات": "Sales",
        "المشتريات": "Purchases",
        "مدفوعة": "Paid",
        "دفع جزئي": "Partial Payment",
        "غير مدفوعة": "Unpaid",
        "إصدار فاتورة خدمة": "Issue Service Invoice",
        "إضافة فاتورة": "Add Invoice",
        "رقم الفاتورة أو اسم العميل...": "Invoice No. or Customer Name...",
        "لا توجد نتائج بحث مطابقة": "No matching search results",
        "لا توجد فواتير خدمات": "No service invoices found",
        "لا توجد فواتير مبيعات": "No sales invoices found",
        "رقم الفاتورة": "Invoice No.",
        "التاريخ": "Date",
        "العميل": "Customer",
        "المورد": "Supplier",
        "الإجمالي": "Total",
        "المدفوع": "Paid",
        "المتبقي": "Remaining",
        "الحالة": "Status",

        // --- Auth & Onboarding ---
        "تسجيل الدخول": "Login",
        "دخول": "Secure Login",
        "إنشاء حساب": "Create Account",
        "إنشاء الحساب": "Register Account",
        "إنشاء حساب جديد": "Create New Account",
        "اسم المستخدم": "Username",
        "البريد الإلكتروني": "Email Address",
        "كلمة المرور": "Password",
        "تأكيد المرور": "Confirm Pass",
        "تأكيد كلمة المرور": "Confirm Password",
        "ليس لديك حساب؟": "Don't have an account?",
        "لديك حساب بالفعل؟": "Already have an account?",
        "جاري الدخول...": "Logging in...",
        "جاري الإنشاء...": "Creating...",
        "مرحباً بعودتك لنظامك السحابي": "Welcome back to your cloud system",
        "أهلاً بك مجدداً": "Welcome Back",
        "انضم إلينا اليوم": "Join Us Today",
        "الاسم الكامل": "Full Name",
        "رقم الهاتف": "Phone Number",
        "اسم الشركة / النشاط": "Company / Business Name",
        "نوع النشاط": "Business Type",
        "اختر نوع النشاط": "Select business type",
        "8 أحرف على الأقل": "8+ characters",
        "إعادة الكلمة": "Re-type password",
        "نشاط تجاري (جملة وتجزئة)": "Trading (Wholesale & Retail)",
        "نشاط خدمات (استشارات، صيانة، إلخ)": "Services (Consulting, Maintenance, etc.)",

        // --- Sidebar & Navigation ---
        "عروض الأسعار": "Quotations",
        "فواتير المبيعات": "Sales Invoices",
        "مرتجع مبيعات": "Sales Returns",
        "سندات القبض": "Receipt Vouchers",
        "العملاء": "Customers",
        "تسوية ديون (حوالة)": "Debt Settlement (Transfer)",
        "الأقساط": "Installments",
        "خطط التقسيط": "Installment Plans",
        "الأقساط المستحقة": "Due Installments",
        "المتأخرات": "Overdue",
        "فواتير المشتريات": "Purchase Invoices",
        "مرتجع مشتريات": "Purchase Returns",
        "سندات الصرف": "Payment Vouchers",
        "الموردين": "Suppliers",
        "إدارة المخزون": "Inventory Management",
        "الأصناف": "Items",
        "المخازن": "Warehouses",
        "جرد المخازن": "Stocktaking",
        "الحسابات العامة": "General Accounting",
        "شجرة الحسابات": "Chart of Accounts",
        "الأرصدة الافتتاحية": "Opening Balances",
        "الحسابات": "Accounts",
        "الموارد البشرية": "Human Resources",
        "الموظفين": "Employees",
        "مسير الرواتب": "Payroll",
        "الشركاء": "Partners",
        "بيانات الشركاء": "Partner Data",
        "حسابات الشركاء": "Partner Accounts",
        "توزيع الأرباح": "Profit Distribution",
        "رأس المال": "Capital",
        "الأصول الثابتة": "Fixed Assets",
        "التقارير الإحصائية": "Statistical Reports",
        "إعدادات النظام": "System Settings",

        // --- Header & Search ---
        "ابحث عن فاتورة، عميل أو صنف...": "Search for invoice, customer or item...",
        "ابحث عن فاتورة، عميل أو خدمة...": "Search for invoice, customer or service...",
        "تفعيل الوضع الفاتح": "Switch to Light Mode",
        "تفعيل الوضع الداكن": "Switch to Dark Mode",
        "تحديد كـ مقروء": "Mark all as read",
        "لا توجد إشعارات جديدة": "No new notifications",
        "ملفي الشخصي": "My Profile",
        "تغيير كلمة المرور": "Change Password",
        "تسجيل الخروج": "Logout",
        "كل الفروع": "All Branches",
        "الفروع المتاحة": "Available Branches",

        // --- Dashboard KPIs & Charts ---
        "صباح الخير": "Good Morning",
        "مساء الخير": "Good Afternoon",
        "مساء النور": "Good Evening",
        "مستحدم النظام": "System User",
        "إيرادات اليوم": "Today's Revenue",
        "عدد الخدمات": "Services Count",
        "عدد العملاء": "Customers Count",
        "صافي الأرباح": "Net Profits",
        "إجمالي المبيعات": "Total Sales",
        "إجمالي المشتريات": "Total Purchases",
        "صافي الربح": "Net Profit",
        "رصيد الخزينة": "Treasury Balance",
        "ذمم العملاء": "Receivables",
        "مبيعات اليوم": "Today's Sales",
        "نواقص المخزن": "Stock Shortage",
        "الوصول السريع": "Quick Access",
        "إيرادات الخدمات مقابل المصروفات": "Services Revenue vs Expenses",
        "المبيعات مقابل المشتريات": "Sales vs Purchases",
        "توزيع السيولة النقدية": "Cash Liquidity Distribution",
        "آخر الحركات المالية": "Recent Transactions",
        "أكبر مديونيات العملاء": "Top Customer Debts",
        "ذمم العملاء المستحقة": "Due Receivables",
        "إجمالي المطلوب تحصيله": "Total to be Collected",
        "تحديث الصفحة": "Refresh Page",

        // --- Settings Hub ---
        "الإعدادات العامة": "General Settings",
        "بيانات الشركة": "Company Data",
        "الفروع": "Branches",
        "الإشعارات": "Notifications",
        "الضريبة": "Tax & VAT",
        "المستخدمين والصلاحيات": "Users & Permissions",
        "الاشتراك والخطة": "Subscription & Plan",
        "قواعد البيانات": "Databases",
        "الدولة": "Country",
        "العملة الأساسية": "Base Currency",
        "المنطقة الزمنية": "Timezone",
        "نوع التقويم": "Calendar Type",
        "تنسيق التاريخ": "Date Format",
        "ميلادي": "Gregorian",
        "هجري": "Hijri",
        "العملة والمنطقة الزمنية وتنسيق التاريخ": "Currency, Timezone, and Date Format",
        "تغيير الدولة سيغيّر العملة والمنطقة الزمنية تلقائياً": "Changing country auto-updates currency & timezone",
        "بحث عن عملة...": "Search currency...",

        // --- Inventory / Items Page ---
        "الخدمات": "Services",
        "الخدمة": "Service",
        "صنف": "item",
        "تعريف الخدمات التي تقدمها المؤسسة وتحديد أسعارها": "Define your services and set prices",
        "إدارة قائمة المنتجات، تكود الأصناف، ومتابعة الأسعار والمخزون في كافة الفروع": "Manage product list, item coding, and track prices and stock",
        "إضافة خدمة جديدة": "Add New Service",
        "إضافة صنف جديد": "Add New Item",
        "إجمالي الأصناف": "Total Items",
        "قيمة المخزون": "Stock Value",
        "أصناف منخفضة": "Low Stock Items",
        "أصناف نفدت": "Out of Stock Items",
        "تنبيه": "Alert",
        "البحث في الأصناف منخفضة المخزون...": "Search low stock items...",
        "البحث في الأصناف التي نفدت...": "Search out of stock items...",
        "ابحث باسم الصنف أو كود المنتج...": "Search by item name or code...",
        "جميع المخازن": "All Warehouses",
        "جاري استخراج البيانات...": "Extracting data...",
        "لا توجد نتائج بحث تطابق استفسارك": "No items match your search",
        "لا توجد خدمات مسجلة حالياً": "No services currently recorded",
        "لا توجد أصناف مسجلة حالياً": "No items currently recorded",
        "الكود": "Code",
        "الباركود": "Barcode",
        "الكمية": "Quantity",
        "سعر التكلفة": "Cost Price",
        "سعر الخدمة": "Service Price",
        "سعر البيع": "Sell Price",
        "متوسط التكلفة": "Average Cost",
        "إجمالي التكلفة": "Total Cost",
        "قطعة": "Unit/Piece",
        "طباعة باركود": "Print Barcode",
        "تعديل بيانات الخدمة": "Edit Service Data",
        "تعديل بيانات الصنف": "Edit Item Data",
        "كود الخدمة": "Service Code",
        "كود الصنف": "Item Code",
        "الباركود الإضافي": "Additional Barcode",
        "سكان الباركود...": "Scan barcode...",
        "اسم الخدمة": "Service Name",
        "اسم الصنف": "Item Name",
        "مثال: استشارة قانونية": "e.g., Legal Consultation",
        "مثال: زيت موتر 5 لتر": "e.g., Engine Oil 5L",
        "اسم المنتج": "Product Name",
        "تصنيف الخدمة": "Service Category",
        "التصنيف": "Category",
        "اختر التصنيف...": "Select category...",
        "حالة الخدمة": "Service Status",
        "وحدة القياس": "Unit of Measure",
        "قطعة، كرتونة...": "Piece, Box...",
        "وصف الخدمة": "Service Description",
        "اكتب تفاصيل الخدمة هنا ليتم سحبها في الفاتورة...": "Write service details for invoice...",
        "حد الطلب": "Reorder Limit",
        "تنبيه نقص المخزون": "Low Stock Alert",
        "الرصيد الافتتاحي": "Opening Balance",
        "المخزن": "Warehouse",
        "اختر المخزن...": "Select warehouse...",
        "الكمية الافتتاحية": "Opening Quantity",
        "القيمة الإجمالية للمخزون": "Total Stock Value",
        "حفظ الخدمة": "Save Service",
        "إضافة الخدمة": "Add Service",
        "إضافة الصنف": "Add Item",
        "تأكيد حذف الصنف": "Confirm Item Deletion",
        "طباعة باركود الصنف": "Print Item Barcode",
        "عدد النسخ المراد طباعتها": "Number of copies",
        "طباعة الباركود": "Print Barcode",
        "إضافة تصنيف جديد": "Add New Category",
        "اسم التصنيف الجديد": "New Category Name",
        "مثال: زيوت، فلاتر...": "e.g., Oils, Filters...",
        "حفظ التصنيف": "Save Category",
        "إضافة وحدة قياس جديدة": "Add New Unit",
        "اسم الوحدة الجديدة": "New Unit Name",
        "مثال: لتر، جالون، طقم...": "e.g., Liter, Gallon, Set...",
        "حفظ الوحدة": "Save Unit",

        // --- HR / Employees Page ---
        "إدارة شؤون العاملين، العقود، والأقسام الإدارية": "Manage staff, contracts, and departments",
        "إضافة موظف": "Add Employee",
        "إجمالي الموظفين": "Total Employees",
        "موظفين نشطين": "Active Employees",
        "متوسط الأجور": "Average Wages",
        "تعيينات حديثة": "Recent Hires",
        "ابحث باسم الموظف أو الكود أو المنصب الوظيفي...": "Search by name, code or position...",
        "كل الأقسام": "All Departments",
        "كل الحالات": "All Statuses",
        "جاري استرجاع السجلات...": "Retrieving records...",
        "لم يتم العثور على موظفين تطابق البحث": "No employees found matches your search",
        "ابدأ بإضافة موظفين جدد لسجلك": "Start by adding new employees to your records",
        "المنصب والقسم": "Position & Dept",
        "صافي الراتب": "Net Salary",
        "تاريخ التعيين": "Join Date",
        "غير مصنف": "Uncategorized",
        "تأكيد حذف الموظف": "Confirm Employee Deletion",

        // --- Suppliers Page ---
        "إجمالي الموردين": "Total Suppliers",
        "إجمالي الدائنية (له عندنا)": "Total Credit (to them)",
        "إجمالي المديونية (عليه لنا)": "Total Debt (from them)",
        "له عندنا": "Credit (for him)",
        "عليه لنا": "Debit (upon him)",
        "مورد": "Supplier",
        "إدارة بيانات الموردين والمستحقات والشركات": "Manage supplier data, dues, and companies",
        "إضافة مورد": "Add Supplier",
        "ابحث باسم المورد أو رقم الهاتف...": "Search by supplier name or phone...",
        "لا يوجد موردين": "No suppliers found",
        "العنوان": "Address",
        "الرصيد الحالي": "Current Balance",
        "تعديل بيانات المورد": "Edit Supplier Data",
        "إضافة مورد جديد": "Add New Supplier",
        "نوع المورد": "Supplier Type",
        "فرد": "Individual",
        "شركة": "Company",
        "اسم الشركة": "Company Name",
        "مثال: شركة التوريدات العالمية": "e.g., Global Supplies Co.",
        "مثال: محمد أحمد": "e.g., Mohamed Ahmed",
        "المسؤول / جهة الاتصال": "Contact Person / Head",
        "مثال: محمد علي": "e.g., Mohamed Ali",
        "عليه (مدين)": "Debit (he owes)",
        "له (دائن)": "Credit (he is owed)",
        "إضافة المورد الآن": "Add Supplier Now",
        "تأكيد حذف المورد": "Confirm Supplier Deletion",
        "فشل في حذف المورد": "Failed to delete supplier",

        // --- Customers ---
        "إدارة بيانات العملاء والديون والمبيعات الآجلة": "Manage customers, debts, and credit sales",
        "إضافة عميل": "Add Customer",
        "إجمالي العملاء": "Total Customers",
        "إجمالي المديونية": "Total Debt",
        "مستحقات متأخرة": "Overdue Receivables",
        "عميل": "Customer",

        // --- Accounting & Reports Generic ---
        "دليل الحسابات": "Chart of Accounts",
        "شجرة": "Tree",
        "جدول": "Table",
        "أصول": "Assets",
        "خصوم": "Liabilities",
        "حقوق ملكية": "Equity",
        "مدين": "Debit",
        "دائن": "Credit",
        "كشف حساب": "Account Statement",
        "ميزان المراجعة": "Trial Balance",
        "قائمة الدخل": "Income Statement",
        "الميزانية العمومية": "Balance Sheet",
        "الأرباح والخسائر": "Profit & Loss",

        // --- Treasury & Bank ---
        "الخزينة": "Treasury",
        "البنك": "Bank",
        "رصيد النقدية": "Cash Balance",
        "إجمالي المقبوضات": "Total Receipts",
        "إجمالي المدفوعات": "Total Payments",

        // --- System Messages ---
        "جاري تحميل البيانات...": "Loading Data...",
        "حدث خطأ ما": "An error occurred",
        "لا توجد نتائج": "No results found",
        "حدث خطأ في الاتصال بالخادم، حاول مرة أخرى": "Connection error, please try again"
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
