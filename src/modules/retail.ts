import type { ActivityModule } from './types';
import { CORE_SECTIONS, CORE_MODULES, DEFAULT_FLAGS, DEFAULT_INVOICE_PREFIXES, EXCLUSIVE_PAGES, t_s } from './shared';

/**
 * 🛒 نشاط تجارة التجزئة
 *
 * بيع مباشر للمستهلك عن طريق الكاشير. المميز فيه: نقطة البيع + نقاط الولاء.
 * مفيش عروض أسعار ولا أوامر بيع — البيع فوري على الكاشير.
 */
const retail: ActivityModule = {
    key: 'RETAIL',
    label: t_s('نشاط تجارة التجزئة'),

    sections: [
        ...CORE_SECTIONS,
        'pos',      // شاشة الكاشير وسجل الطلبات
        'loyalty',  // نقاط الولاء والأرقام التسلسلية
    ],

    hiddenPages: [
        EXCLUSIVE_PAGES.coupons,
        EXCLUSIVE_PAGES.serviceCatalog,
        EXCLUSIVE_PAGES.restaurantReports,
        EXCLUSIVE_PAGES.servicesReports,
        EXCLUSIVE_PAGES.installmentReports,
        EXCLUSIVE_PAGES.salesRepsReports,
        '/settlements',   // تسوية الديون مش من نمط التجزئة
        '/quotations',    // البيع فوري — مفيش عروض أسعار
        '/sales-orders',  // البيع فوري — مفيش أوامر بيع
    ],

    sectionTitles: {},
    pageLabels: {},

    // بيستخدم المصطلحات الافتراضية (لغة التجارة) — شوف DEFAULT_TERMS
    terms: {},

    // ملاحظة: 'barcode' كان مدرج في الباقة القديمة للتجزئة لكن السايدبار
    // بيخفيه عن RETAIL — يعني كان بند ميّت في الباقة. اتشال للتوحيد.
    // بيستخدم البادئات الافتراضية: SAL للبيع و SLR للمرتجع
    invoicePrefixes: { ...DEFAULT_INVOICE_PREFIXES },

    defaultModules: [
        ...CORE_MODULES,
        'pos',
        'loyalty',
        'partners',
    ],

    flags: { ...DEFAULT_FLAGS },
};

export default retail;
