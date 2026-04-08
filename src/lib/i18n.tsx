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
        "إجراء": "Action",

        // Settings 
        "الإعدادات الشاملة للمؤسسة": "Comprehensive Organization Settings",
        "إدارة بيانات المنشأة، المستخدمين ونظام الصلاحيات العام وفترات العمل المالية": "Manage facility data, users, general permission systems, and financial periods",
        "بيانات الشركة": "Company Profile",
        "الإعدادات العامة": "General Settings",
        "الفروع": "Branches",
        "الضريبة": "Tax",
        "المستخدمين والصلاحيات": "Users & Permissions",
        "الاشتراك والخطة": "Subscription & Plan",
        "قواعد البيانات": "Databases",
        "جاري تحميل الإعدادات...": "Loading Settings...",

        // Customers
        "العملاء": "Customers",
        "إدارة بيانات العملاء والشركات والمستحقات": "Manage customers, companies, and dues data",
        "إضافة عميل": "Add Customer",
        "عميل": "Customer",
        "مديونيات العملاء": "Customer Debts",
        "أرصدة مقدمة": "Advance Balances",
        "الكل": "All",
        "المدينين": "Debtors",
        "الدائنين": "Creditors",
        "الرصيد الحالي": "Current Balance",
        "نوع العميل": "Customer Type",
        "فرد": "Individual",
        "شركة": "Company",
        "اسم العميل / الشركة": "Customer / Company Name",
        "مثال: أحمد محمد التاجر": "Example: Ahmed Mohamed",
        "الرقم الضريبي": "Tax Number",
        "السجل التجاري": "Commercial Register",
        "اسم العميل": "Customer Name",
        "ادخل اسم العميل": "Enter customer name",
        "رقم الهاتف": "Phone Number",
        "العنوان": "Address",
        "المدينة، المنطقة": "City, Region",
        "الحد الائتماني المسموح (اختياري)": "Allowed Credit Limit (Optional)",
        "الرصيد الافتتاحي (عند بداية التعامل)": "Opening Balance (At Start)",
        "عليه (مدين)": "Owes (Debit)",
        "له (دائن)": "Owed (Credit)",
        "تأكيد حذف العميل": "Confirm Customer Deletion",
        "له عندنا": "Owed to them",
        "عليه لنا": "Owes us",
        "متزن": "Balanced",
        "تعديل بيانات العميل": "Edit Customer Data",
        "إضافة عميل جديد": "Add New Customer",
        "جاري الحفظ...": "Saving...",
        "حفظ التغييرات": "Save Changes",
        "إضافة العميل الآن": "Add Customer Now",
        "إلغاء": "Cancel",
        "ابحث باسم العميل أو رقم الهاتف...": "Search by customer name or phone...",
        "لا يوجد عملاء مضافين حالياً": "No customers currently added",
        "يرجى اختيار المخزن أولاً": "Please select a warehouse first",
        "يرجى اختيار العميل أولاً": "Please select a customer first",
        "يرجى اختيار الخدمة": "Please select a service",
        "الكمية؟": "Quantity?",
        "السعر؟": "Price?",
        "ليس لديك رصيد من هذا الصنف": "You don't have stock for this item",
        "المتاح": "Available",
        "تجاوز المتاح": "Exceeded available limit",
        "يرجى إضافة صنف واحد على الأقل للفاتورة": "Please add at least one item to the invoice",
        "خطأ: الصنف": "Error: Item",
        "لم يعد متوفراً بالكمية المطلوبة. المتاح:": "is no longer available in the requested quantity. Available:",
        "أدخل المبلغ": "Enter amount",
        "اختر الخزينة...": "Select Treasury...",
        "اختر البنك...": "Select Bank...",
        "فشل الحفظ": "Save Failed",
        "خطأ في الاتصال": "Connection Error",
        "فاتورة خدمة جديدة": "New Service Invoice",
        "فاتورة مبيعات جديدة": "New Sales Invoice",
        "إصدار فاتورة لخدمة مقدمة وتحصيل قيمتها": "Issue an invoice for a provided service and collect its value",
        "إنشاء فاتورة مبيعات جديدة وحفظها في النظام": "Create a new sales invoice and save it in the system",
        "يرجى تحديد فرع أولاً": "Please select a branch first",
        "أنت حالياً على وضع \"كل الفروع\" — اختر فرعاً محدداً من القائمة المنسدلة في الأعلى قبل إنشاء الفاتورة": "You are currently in All Branches mode — select a specific branch from the drop-down list above before creating the invoice",
        "بيانات الفاتورة": "Invoice Data",
        "ابحث واختر...": "Search and select...",
        "مورد": "Supplier",
        "له عندنا:": "We owe him:",
        "عليه لنا:": "He owes us:",
        "رصيده الحالي: صفر": "Current balance: Zero",
        "مخزن الصرف": "Dispatch Warehouse",
        "اختر المكان...": "Select Location...",
        "تاريخ الفاتورة": "Invoice Date",
        "تاريخ الاستحقاق": "Due Date",
        "اضافة الاصناف": "Add Items",
        "اسم الخدمة": "Service Name",
        "الصنف": "Item",
        "(اختر الفرع أولاً)": "(Select branch first)",
        "متاح:": "Available:",
        "اختر الخدمة...": "Select Service...",
        "اختر الصنف...": "Select Item...",
        "السعر (يُكتب يدوي)": "Price (Manual entry)",
        "الضريبة %": "Tax %",
        "الوصف (يتم سحبه تلقائياً ويمكن التعديل)": "Description (auto-fetched, editable)",
        "اكتب وصف الخدمة التفصيلي هنا...": "Write detailed service description here...",
        "الخدمة / الوصف التفصيلي": "Service / Detailed Description",
        "السعر": "Price",
        "الوحدة": "Unit",
        "لا توجد بنود مضافة": "No items added",
        "المرفقات": "Attachments",
        "رفع ملفات": "Upload Files",
        "ملفات مدرجة": "Files Included",
        "ملاحظات": "Notes",
        "أدخل أي ملاحظات هنا...": "Enter any notes here...",
        "ملخص الفاتورة": "Invoice Summary",
        "الخصم": "Discount",
        "(مشمولة)": "(Inclusive)",
        "(مضافة)": "(Added)",
        "صافي الفاتورة": "Net Invoice",
        "التحصيل والسداد": "Collection and Payment",
        "طريقة الدفع": "Payment Method",
        "كاش": "Cash",
        "بنكي": "Bank",
        "آجل": "Credit",
        "المبلغ المدفوع": "Paid Amount",
        "الخزينة المستلمة": "Receiving Treasury",
        "الحساب البنكي": "Bank Account",
        "متبقي:": "Remaining:",
        "زيادة:": "Excess:",
        "تم السداد بالكامل ✓": "Fully Paid ✓",
        "رصيد دائن": "Credit Balance",
        "حفظ الفاتورة": "Save Invoice",
        "حفظ وطباعة الفاتورة": "Save and Print Invoice",
        "إضافة مورد جديد": "Add New Supplier",
        "فشل في الإضافة": "Adding Failed",
        "الاسم": "Name",
        "اسم العميل...": "Customer Name...",
        "اسم المورد...": "Supplier Name...",
        "رقم الجوال": "Mobile Number",
        "حفظ": "Save",
        "فاتورة مشتريات جديدة": "New Purchase Invoice",
        "تسجيل مشتريات جديدة وتوريد المخازن وتحديث حسابات الموردين": "Record new purchases, supply warehouses, and update supplier accounts",
        "مورد جديد": "New Supplier",
        "مخزن الاستلام": "Receiving Warehouse",
        "التكلفة": "Cost"
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
