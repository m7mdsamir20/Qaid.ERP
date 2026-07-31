import type { ActivityModule } from './types';
import { CORE_SECTIONS, CORE_MODULES, DEFAULT_FLAGS, EXCLUSIVE_PAGES, t_s } from './shared';

/**
 * 🍽️ نشاط المطاعم والكافيهات
 *
 * البيع كله بيمر من الكاشير والطاولات، مش من دورة الفواتير العادية.
 * عشان كده قسم "المبيعات" بيتقلّص لـ العملاء + الكوبونات بس،
 * والمخزون بيتسمى "المنيو".
 */
const restaurants: ActivityModule = {
    key: 'RESTAURANTS',
    label: t_s('مطاعم وكافيهات'),

    sections: [
        ...CORE_SECTIONS,
        'pos',       // شاشة الكاشير وسجل الطلبات
        'tables',    // خريطة الطاولات والورديات
        'kitchen',   // شاشة المطبخ (KDS) والإضافات
        'delivery',  // طلبات التوصيل والسائقين وتطبيقات التوصيل
        'barcode',   // QR الطاولات
    ],

    hiddenPages: [
        EXCLUSIVE_PAGES.serviceCatalog,
        EXCLUSIVE_PAGES.servicesReports,
        EXCLUSIVE_PAGES.installmentReports,
        '/settlements',
        // دورة الفواتير التقليدية مستبدلة بالكاشير
        '/quotations',
        '/sales-orders',
        '/sales',
        '/sale-returns',
        '/receipts',
    ],

    sectionTitles: {
        sales: t_s('العملاء والتسويق'),
        inventory: t_s('المنيو والمخزون'),
        purchases: t_s('المشتريات والموردين'),
    },

    pageLabels: {
        '/categories': t_s('تصنيفات المنيو'),
        '/items': t_s('أصناف المنيو'),
        '/warehouses': t_s('المخازن والمستودعات'),
        'reports-sales-purchases': t_s('تقارير الكاشير والمبيعات'),
        'reports-inventory': t_s('تقارير المخزون والمنيو'),
    },

    // ملاحظة: 'loyalty' كان مدرج في الباقة القديمة للمطاعم لكن السايدبار
    // بيخفيه عن أي نشاط غير RETAIL — يعني كان بند ميّت. اتشال للتوحيد.
    defaultModules: [
        ...CORE_MODULES,
        'pos',
        'tables',
        'kitchen',
        'delivery',
        'barcode',
    ],

    flags: { ...DEFAULT_FLAGS },
};

export default restaurants;
