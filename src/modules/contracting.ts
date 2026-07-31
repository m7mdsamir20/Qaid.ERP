import type { ActivityModule } from './types';
import { CORE_SECTIONS, CORE_MODULES, DEFAULT_FLAGS, EXCLUSIVE_PAGES, t_s } from './shared';

/**
 * 🏗️ نشاط المقاولات والإنشاءات
 *
 * الشغل بيتنظّم حول المشاريع مش الفواتير: مستخلصات، عقود باطن،
 * طلبات مواد، وتقارير موقع يومية. العميل = صاحب المشروع.
 */
const contracting: ActivityModule = {
    key: 'CONTRACTING',
    label: t_s('مقاولات وإنشاءات'),

    sections: [
        ...CORE_SECTIONS,
        'projects',         // قائمة المشاريع والمستخلصات
        'subcontractors',   // مقاولين الباطن وعقودهم
        'site_management',  // طلبات المواد والتقارير اليومية
    ],

    hiddenPages: [
        EXCLUSIVE_PAGES.coupons,
        EXCLUSIVE_PAGES.serviceCatalog,
        EXCLUSIVE_PAGES.restaurantReports,
        EXCLUSIVE_PAGES.servicesReports,
        EXCLUSIVE_PAGES.installmentReports,
        '/sale-returns',  // الأعمال المنفّذة ما بترجّعش
        '/settlements',
    ],

    sectionTitles: {
        sales: t_s('الأعمال والمبيعات'),
        inventory: t_s('المخازن والمواد'),
    },

    pageLabels: {
        '/sales': t_s('فواتير الأعمال والخدمات'),
        '/customers': t_s('العملاء / أصحاب المشاريع'),
        '/items': t_s('المواد والبنود'),
        '/categories': t_s('تصنيفات المواد والبنود'),
        '/warehouses': t_s('المخازن والمواقع'),
        'reports-sales-purchases': t_s('الأعمال والمبيعات والمشتريات'),
        'reports-inventory': t_s('تقارير المواد والمواقع'),
        'reports-partners': t_s('أصحاب المشاريع والموردين'),
    },

    defaultModules: [
        ...CORE_MODULES,
        'projects',
        'subcontractors',
        'site_management',
    ],

    flags: { ...DEFAULT_FLAGS },
};

export default contracting;
