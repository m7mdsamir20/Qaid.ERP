/**
 * ═══════════════════════════════════════════════════════════════
 *  تعريف شكل "النشاط" (Activity Module)
 * ═══════════════════════════════════════════════════════════════
 *
 * كل نشاط في النظام (تجارة جملة / تجزئة / خدمات / مطاعم / مقاولات)
 * بيتوصف بملف واحد بيطبّق الواجهة دي. أي سلوك يخص نشاط معيّن
 * لازم يتحط هنا — مش شرط `if (businessType === '...')` متناثر في الصفحات.
 *
 * إزاي تضيف نشاط جديد:
 *   1. اعمل ملف جديد في src/modules/ يصدّر ActivityModule
 *   2. سجّله في src/modules/registry.ts
 *   خلاص. مفيش أي ملف تاني محتاج تعديل.
 */

export type ActivityKey =
    | 'TRADING'
    | 'RETAIL'
    | 'SERVICES'
    | 'RESTAURANTS'
    | 'CONTRACTING';

export interface ActivityModule {
    /** المفتاح المخزّن في Company.businessType (بحروف كابيتال) */
    key: ActivityKey;

    /** الاسم المعروض للعميل — نص خام، المستهلك هو اللي بينادي t() */
    label: string;

    /**
     * الـ featureKeys من navSections اللي النشاط ده بيشوفها.
     * أي قسم مش مذكور هنا → مخفي تماماً عن النشاط (سايدبار + راوت جارد).
     */
    sections: string[];

    /**
     * روابط (link.id) مخفية عن النشاط ده بالرغم إن قسمها ظاهر.
     * مثال: المقاولات بتشوف قسم "المبيعات" لكن من غير "مرتجع مبيعات".
     */
    hiddenPages: string[];

    /** إعادة تسمية عناوين الأقسام: featureKey → العنوان الجديد (نص خام) */
    sectionTitles: Record<string, string>;

    /** إعادة تسمية الروابط: link.id → الاسم الجديد (نص خام) */
    pageLabels: Record<string, string>;

    /**
     * الباقة الافتراضية اللي السوبر أدمن بيقترحها لما يختار النشاط ده.
     * دي طبقة *الاشتراك* — مستقلة عن `sections` (طبقة النشاط).
     * الصفحة بتظهر لما الاتنين يسمحوا بيها.
     */
    defaultModules: string[];

    /** فلاجز سلوكية خارج الـ navigation */
    flags: ActivityFlags;
}

export interface ActivityFlags {
    /** يظهر جرس الإشعارات في الهيدر؟ */
    notifications: boolean;
}
