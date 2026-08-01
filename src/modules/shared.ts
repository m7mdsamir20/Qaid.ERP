import type { ActivityModule, TermKey, InvoicePrefixes } from './types';

/** مُعلِّم ثابت للترجمة — بيخلي scripts/extract-translations.js يلقط النصوص دي */
export const t_s = (s: string) => s;

/**
 * الأقسام المشتركة بين كل الأنشطة (الـ 80% من النظام).
 * دي مش بتتكرر لكل نشاط — كل نشاط بيبني عليها بالـ spread.
 */
export const CORE_SECTIONS = [
    'dashboard',
    'sales',
    'purchases',
    'inventory',
    'accounting',
    'treasury',
    'hr',
    'partners',
    'fixed_assets',
    'reports',
    'activity_log',
    'settings',
] as const;

/**
 * صفحات خاصة بنشاط واحد بعينه — أي نشاط تاني بيخفيها.
 * موجودة هنا عشان ما نكررش نفس السطر في كل ملف نشاط.
 */
export const EXCLUSIVE_PAGES = {
    /** كتالوج الخدمات → SERVICES بس */
    serviceCatalog: '/service-catalog',
    /** تقارير المطعم → RESTAURANTS بس */
    restaurantReports: 'reports-restaurant',
    /** تقارير الخدمات → SERVICES بس */
    servicesReports: 'reports-services',
    /** تقارير الأقساط → الأنشطة اللي عندها قسم أقساط بس */
    installmentReports: 'reports-installments',
    /** تقارير المناديب → TRADING بس (نفس شرط قسم مناديب المبيعات) */
    salesRepsReports: 'reports-sales_reps',
    /** كوبونات الخصم → RESTAURANTS بس */
    coupons: '/coupons',
} as const;

/** الباقة الأساسية اللي بتتباع لكل الأنشطة */
export const CORE_MODULES = [
    'sales',
    'purchases',
    'inventory',
    'accounting',
    'treasury',
    'hr',
    'reports',
] as const;

/** القيم الافتراضية لأي نشاط — بتتعمل override في الملف نفسه لو محتاج */
export const DEFAULT_FLAGS: ActivityModule['flags'] = {
    notifications: true,
};

/**
 * بادئات أكواد الفواتير الافتراضية (لغة تجارة الجملة).
 * دي البادئات اللي البيانات القديمة كلها متخزنة بيها — ممنوع تتغير
 * لـ TRADING عشان ما نكسرش الربط مع القيود الموجودة.
 */
export const DEFAULT_INVOICE_PREFIXES: InvoicePrefixes = {
    sale: 'SAL',
    saleReturn: 'SLR',
    purchase: 'PUR',
    purchaseReturn: 'PRR',
};

/**
 * المصطلحات الافتراضية (لغة التجارة والتجزئة).
 * أي نشاط ما بيغيّرش مصطلح بياخد القيمة دي.
 */
export const DEFAULT_TERMS: Record<TermKey, string> = {
    customer: t_s('العميل'),
    customers: t_s('العملاء'),
    customerCash: t_s('عميل نقدي'),

    item: t_s('الصنف'),
    items: t_s('الأصناف'),
    itemCategory: t_s('التصنيف'),
    itemCategories: t_s('التصنيفات'),

    warehouse: t_s('المخزن'),
    warehouses: t_s('المخازن'),

    invoice: t_s('الفاتورة'),
    invoices: t_s('الفواتير'),
    invoiceNumber: t_s('رقم الفاتورة'),
};
