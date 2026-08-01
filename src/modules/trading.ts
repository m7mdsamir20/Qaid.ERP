import type { ActivityModule } from './types';
import { CORE_SECTIONS, CORE_MODULES, DEFAULT_FLAGS, DEFAULT_INVOICE_PREFIXES, EXCLUSIVE_PAGES, t_s } from './shared';

/**
 * 📦 نشاط تجارة الجملة
 *
 * النشاط الافتراضي للنظام — أي شركة من غير businessType بتتعامل كـ TRADING.
 * المميز فيه: مناديب المبيعات + التقسيط.
 */
const trading: ActivityModule = {
    key: 'TRADING',
    label: t_s('نشاط تجارة الجملة'),

    sections: [
        ...CORE_SECTIONS,
        'sales_reps',    // إدارة المناديب والتحصيلات والعمولات والأهداف
        'installments',  // خطط التقسيط والمستحقات والمتأخرات
    ],

    hiddenPages: [
        EXCLUSIVE_PAGES.coupons,
        EXCLUSIVE_PAGES.serviceCatalog,
        EXCLUSIVE_PAGES.restaurantReports,
        EXCLUSIVE_PAGES.servicesReports,
    ],

    sectionTitles: {},
    pageLabels: {},

    // بيستخدم المصطلحات الافتراضية (لغة التجارة) — شوف DEFAULT_TERMS
    terms: {},

    // تجارة الجملة — دي بادئات البيانات القديمة كلها، ممنوع تتغير
    invoicePrefixes: {
        ...DEFAULT_INVOICE_PREFIXES,
        sale: 'SAL',
        saleReturn: 'SLR',
    },

    defaultModules: [
        ...CORE_MODULES,
        'sales_reps',
        'installments',
        'partners',
        'fixed_assets',
    ],

    flags: { ...DEFAULT_FLAGS },
};

export default trading;
