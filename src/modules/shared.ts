import type { ActivityModule } from './types';

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
