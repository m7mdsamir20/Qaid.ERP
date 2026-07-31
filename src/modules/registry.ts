import type { ActivityKey, ActivityModule, TermKey } from './types';
import { DEFAULT_TERMS } from './shared';

import trading from './trading';
import retail from './retail';
import services from './services';
import restaurants from './restaurants';
import contracting from './contracting';

/**
 * ═══════════════════════════════════════════════════════════════
 *  سجل الأنشطة — المصدر الوحيد للحقيقة
 * ═══════════════════════════════════════════════════════════════
 *
 * أي سؤال بالشكل "هل النشاط ده بيشوف الصفحة دي؟" أو "الصفحة دي اسمها
 * إيه عند النشاط ده؟" بيتجاوب من هنا — مش بـ if متناثر في الصفحات.
 *
 * لإضافة نشاط سادس: اعمل ملف زي الملفات دي واضفه للـ object تحت. بس.
 */
export const ACTIVITIES: Record<ActivityKey, ActivityModule> = {
    TRADING: trading,
    RETAIL: retail,
    SERVICES: services,
    RESTAURANTS: restaurants,
    CONTRACTING: contracting,
};

/** النشاط اللي بيتستخدم لو الشركة مالهاش businessType أو القيمة غير معروفة */
export const DEFAULT_ACTIVITY: ActivityKey = 'TRADING';

/** كل الأنشطة كمصفوفة — للقوائم المنسدلة في التسجيل والسوبر أدمن */
export const ACTIVITY_LIST: ActivityModule[] = Object.values(ACTIVITIES);

/**
 * بيحوّل أي قيمة businessType (من الـ session أو الداتابيز) لموديول نشاط.
 * بيتحمّل الحروف الصغيرة والقيم الفاضية والقيم الغلط — بيرجع TRADING دايماً كـ fallback.
 */
export function getActivity(businessType?: string | null): ActivityModule {
    const key = String(businessType || '').toUpperCase() as ActivityKey;
    return ACTIVITIES[key] || ACTIVITIES[DEFAULT_ACTIVITY];
}

/** هل القسم ده (featureKey) متاح للنشاط؟ */
export function activityHasSection(
    activity: ActivityModule,
    featureKey?: string,
): boolean {
    if (!featureKey) return true;
    return activity.sections.includes(featureKey);
}

/**
 * هل الصفحة دي متاحة للنشاط؟
 * بتفحص القسم والصفحة مع بعض — عشان ما يحصلش إن السايدبار يعرض
 * لينك والراوت جارد يرفضه (اللي كان بيحصل قبل التوحيد).
 */
export function activityHasPage(
    activity: ActivityModule,
    featureKey: string | undefined,
    pageId: string,
): boolean {
    if (!featureKey || featureKey === 'dashboard' || pageId === '/') return true;
    if (!activityHasSection(activity, featureKey)) return false;
    return !activity.hiddenPages.includes(pageId);
}

/** عنوان القسم بعد تطبيق تسميات النشاط (نص خام — نادِ t() عليه) */
export function activitySectionTitle(
    activity: ActivityModule,
    featureKey: string | undefined,
    fallback: string,
): string {
    if (!featureKey) return fallback;
    return activity.sectionTitles[featureKey] ?? fallback;
}

/** اسم الرابط بعد تطبيق تسميات النشاط (نص خام — نادِ t() عليه) */
export function activityPageLabel(
    activity: ActivityModule,
    pageId: string,
    fallback: string,
): string {
    return activity.pageLabels[pageId] ?? fallback;
}

/** الباقة الافتراضية للنشاط — بيستخدمها السوبر أدمن عند إنشاء/تعديل شركة */
export function getDefaultModules(businessType?: string | null): string[] {
    return getActivity(businessType).defaultModules;
}

/**
 * المصطلح حسب النشاط — نص خام، نادِ t() عليه في الصفحة.
 *
 *   term(activity, 'customer')  →  'العميل'  أو  'صاحب المشروع'
 */
export function term(activity: ActivityModule, key: TermKey): string {
    return activity.terms[key] ?? DEFAULT_TERMS[key];
}

/**
 * بادئة كود فاتورة البيع للنشاط ('SRV' للخدمات، undefined للباقي).
 * بيستخدمها getInvoiceRef عشان الكود يبقى واحد في الشاشة والطباعة والقيود.
 */
export function getSalePrefix(businessType?: string | null): string | undefined {
    return getActivity(businessType).salePrefix;
}
