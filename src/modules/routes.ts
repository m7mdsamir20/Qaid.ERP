import type { ActivityModule } from './types';
import { activityHasPage } from './registry';

/**
 * ═══════════════════════════════════════════════════════════════
 *  خريطة المسارات → الأقسام
 * ═══════════════════════════════════════════════════════════════
 *
 * الملف ده بيربط أي URL بالقسم (featureKey) والصفحة (pageId) اللي بيتبعهم،
 * عشان الـ middleware يقدر يمنع الدخول على مستوى السيرفر — مش إخفاء
 * بصري في السايدبار بس.
 *
 * ⚠️ مقصود إنه مايستوردش من '@/constants/navigation' لأن الملف ده بيستورد
 * أيقونات lucide-react، والـ middleware بيشتغل على Edge Runtime.
 * هنا داتا خام بس.
 *
 * أي مسار **مش** موجود في الخريطة دي بيتسمح بيه (fail-open) — يعني
 * إضافة صفحة جديدة مش هتتقفل بالغلط. المسارات الحساسة بس هي اللي متسجلة.
 */

interface RouteRule {
    /** الـ featureKey من navSections */
    featureKey: string;
    /** الـ link.id المقابل — بيتفحص ضد hiddenPages بتاعة النشاط */
    pageId?: string;
}

/**
 * المطابقة بأطول بادئة: '/reports/installments' بتغلب '/reports'،
 * و '/restaurant/reports' بتغلب '/restaurant'.
 */
const ROUTE_RULES: Record<string, RouteRule> = {
    // ── المطاعم ─────────────────────────────────────────────
    '/pos': { featureKey: 'pos', pageId: '/pos' },
    '/tables': { featureKey: 'tables', pageId: '/tables' },
    '/shifts': { featureKey: 'tables', pageId: '/shifts' },
    '/kds': { featureKey: 'kitchen', pageId: '/kds' },
    '/kitchen': { featureKey: 'kitchen', pageId: '/kds' },
    '/modifiers': { featureKey: 'kitchen', pageId: '/modifiers' },
    '/delivery': { featureKey: 'delivery', pageId: '/delivery' },
    '/restaurant/drivers': { featureKey: 'delivery', pageId: '/restaurant/drivers' },
    '/barcode': { featureKey: 'barcode', pageId: '/barcode' },
    '/restaurant/reports': { featureKey: 'reports', pageId: 'reports-restaurant' },
    '/reports/kitchen-consumption': { featureKey: 'reports', pageId: 'reports-restaurant' },
    '/reports/kitchen-waste': { featureKey: 'reports', pageId: 'reports-restaurant' },
    '/reports/recipes-report': { featureKey: 'reports', pageId: 'reports-restaurant' },
    '/reports/shift-sales': { featureKey: 'reports', pageId: 'reports-restaurant' },

    // ── المقاولات ───────────────────────────────────────────
    '/projects': { featureKey: 'projects', pageId: '/projects' },
    '/progress-bills': { featureKey: 'projects', pageId: '/progress-bills' },
    '/subcontractors': { featureKey: 'subcontractors', pageId: '/subcontractors' },
    '/sub-contracts': { featureKey: 'subcontractors', pageId: '/sub-contracts' },
    '/material-requests': { featureKey: 'site_management', pageId: '/material-requests' },
    '/daily-site-reports': { featureKey: 'site_management', pageId: '/daily-site-reports' },

    // ── الخدمات ─────────────────────────────────────────────
    '/service-contracts': { featureKey: 'services', pageId: '/service-contracts' },
    '/work-orders': { featureKey: 'services', pageId: '/work-orders' },
    '/service-catalog': { featureKey: 'inventory', pageId: '/service-catalog' },
    '/reports/service-contracts-report': { featureKey: 'services', pageId: '/service-contracts' },
    '/reports/work-orders-report': { featureKey: 'services', pageId: '/work-orders' },

    // ── التجزئة ─────────────────────────────────────────────
    '/loyalty': { featureKey: 'loyalty', pageId: '/loyalty' },
    '/serial-numbers': { featureKey: 'loyalty', pageId: '/serial-numbers' },

    // ── تجارة الجملة ────────────────────────────────────────
    '/sales-reps': { featureKey: 'sales_reps', pageId: '/sales-reps' },
    '/sales/representatives': { featureKey: 'sales_reps', pageId: '/sales-reps' },
    '/reports/sales-representatives': { featureKey: 'sales_reps', pageId: '/sales-reps' },
    '/reports/sales-reps-collections': { featureKey: 'sales_reps', pageId: '/sales-reps/collections' },
    '/reports/sales-reps-commissions': { featureKey: 'sales_reps', pageId: '/sales-reps/commissions' },
    '/reports/sales-reps-targets': { featureKey: 'sales_reps', pageId: '/sales-reps/targets' },
    '/reports/sales-reps-performance': { featureKey: 'sales_reps', pageId: '/sales-reps' },
    '/installments': { featureKey: 'installments', pageId: '/installments' },
    '/due-installments': { featureKey: 'installments', pageId: '/due-installments' },
    '/overdue-installments': { featureKey: 'installments', pageId: '/overdue-installments' },
    '/reports/installments': { featureKey: 'reports', pageId: 'reports-installments' },

    // ── صفحات مشتركة مخفية عن أنشطة معينة ───────────────────
    '/quotations': { featureKey: 'sales', pageId: '/quotations' },
    '/sales-orders': { featureKey: 'sales', pageId: '/sales-orders' },
    '/sales': { featureKey: 'sales', pageId: '/sales' },
    '/sale-returns': { featureKey: 'sales', pageId: '/sale-returns' },
    '/receipts': { featureKey: 'sales', pageId: '/receipts' },
    '/coupons': { featureKey: 'sales', pageId: '/coupons' },
    '/settlements': { featureKey: 'treasury', pageId: '/settlements' },
};

/** مسارات بتتخطى فحص النشاط تماماً */
const EXEMPT_PREFIXES = [
    '/api',
    '/login',
    '/register',
    '/verify',
    '/unauthorized',
    '/super-admin',
    '/profile',
    '/settings',
    '/print',
    '/menu',      // منيو الـ QR — بيتفتح من العميل مش من موظف
    '/_next',
];

/** البادئات مرتبة من الأطول للأقصر عشان المطابقة تكون دقيقة */
const SORTED_PREFIXES = Object.keys(ROUTE_RULES).sort((a, b) => b.length - a.length);

/** بيرجع قاعدة المسار لو متسجل، أو undefined لو مش معروف */
export function ruleForPath(pathname: string): RouteRule | undefined {
    for (const prefix of SORTED_PREFIXES) {
        if (pathname === prefix || pathname.startsWith(prefix + '/')) {
            return ROUTE_RULES[prefix];
        }
    }
    return undefined;
}

/** هل المسار ده مستثنى من فحص النشاط؟ */
export function isExemptPath(pathname: string): boolean {
    return EXEMPT_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * الفحص الأساسي: هل النشاط ده مسموح له يفتح المسار ده؟
 * المسارات غير المعروفة بترجع true.
 */
export function isPathAllowedForActivity(
    activity: ActivityModule,
    pathname: string,
): boolean {
    if (isExemptPath(pathname)) return true;
    const rule = ruleForPath(pathname);
    if (!rule) return true;
    return activityHasPage(activity, rule.featureKey, rule.pageId ?? pathname);
}
