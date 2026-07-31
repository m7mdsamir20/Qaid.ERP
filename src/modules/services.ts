import type { ActivityModule } from './types';
import { CORE_SECTIONS, CORE_MODULES, DEFAULT_FLAGS, EXCLUSIVE_PAGES, t_s } from './shared';

/**
 * 🔧 نشاط الخدمات (استشارات، صيانة، إلخ)
 *
 * بيبيع وقت وخدمات مش بضاعة. عشان كده شاشات المخزون بتتسمى بأسماء
 * الخدمات، وبيتضاف عليها عقود الخدمة وأوامر العمل.
 */
const services: ActivityModule = {
    key: 'SERVICES',
    label: t_s('نشاط خدمات (استشارات، صيانة، إلخ)'),

    sections: [
        ...CORE_SECTIONS,
        'services',  // عقود الخدمة وأوامر العمل
    ],

    hiddenPages: [
        EXCLUSIVE_PAGES.coupons,
        EXCLUSIVE_PAGES.restaurantReports,
        EXCLUSIVE_PAGES.installmentReports,
        // ملحوظة: /service-catalog و reports-services ظاهرين هنا عمداً
    ],

    sectionTitles: {
        sales: t_s('فواتير الخدمات'),
        inventory: t_s('الخدمات'),
    },

    pageLabels: {
        '/sales': t_s('فواتير الخدمات'),
        '/sale-returns': t_s('إلغاء خدمات / مرتجع'),
        '/categories': t_s('تصنيفات الخدمات'),
        '/items': t_s('قائمة الخدمات'),
        '/warehouses': t_s('مخازن الخدمات'),
        '/stocktakings': t_s('جرد الخدمات'),
        '/warehouse-transfers': t_s('تحويل المخزون'),
        // /units و /service-catalog أسماءهم الأصلية مناسبة للخدمات أصلاً
    },

    terms: {
        item: t_s('الخدمة'),
        items: t_s('الخدمات'),
        itemCategory: t_s('تصنيف الخدمات'),
        itemCategories: t_s('تصنيفات الخدمات'),
        warehouse: t_s('مخزن الخدمات'),
        warehouses: t_s('مخازن الخدمات'),
        invoice: t_s('فاتورة الخدمة'),
        invoices: t_s('فواتير الخدمات'),
    },

    // فواتير الخدمات بتاخد كود SRV بدل SAL — ده بيتكتب في مرجع القيود كمان
    salePrefix: 'SRV',

    defaultModules: [
        ...CORE_MODULES,
        'services',
        'partners',
    ],

    flags: {
        ...DEFAULT_FLAGS,
        // نشاط الخدمات مالوش إشعارات مخزون/أقساط، فالجرس مخفي
        notifications: false,
    },
};

export default services;
