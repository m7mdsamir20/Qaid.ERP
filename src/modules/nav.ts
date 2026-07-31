import { navSections } from '@/constants/navigation';
import type { ActivityModule } from './types';
import { activityHasSection, activityHasPage, activitySectionTitle, activityPageLabel } from './registry';

/**
 * ═══════════════════════════════════════════════════════════════
 *  شجرة القوائم بعد تطبيق النشاط
 * ═══════════════════════════════════════════════════════════════
 *
 * ده المصدر الوحيد لسؤال: "النشاط ده بيشوف إيه، والصفحات اسمها إيه عنده؟"
 *
 * بيستخدمه:
 *   - السايدبار (القائمة الجانبية)
 *   - تاب الصلاحيات في الإعدادات
 *   - صفحات السوبر أدمن (إنشاء/تعديل شركة)
 *
 * قبل كده كان كل واحد فيهم عنده نسخة من المنطق، وكانوا بيختلفوا —
 * فالسوبر أدمن يديك صلاحية صفحة والسايدبار مايعرضهاش، أو العكس.
 *
 * ⚠️ الملف ده بيستورد navSections اللي جواها أيقونات lucide، فممنوع
 * يتستورد من middleware.ts (Edge Runtime). عشان كده مش متصدّر من index.ts.
 */

export interface ActivityNavLink {
    id: string;
    href: string;
    /** الاسم بعد تطبيق مصطلحات النشاط */
    label: string;
    /** الاسم الأصلي قبل التخصيص — مفيد للعرض جنب المخصص */
    originalLabel: string;
    hasApprove?: boolean;
    hideFromSidebar?: boolean;
}

export interface ActivityNavSection {
    featureKey?: string;
    /** العنوان بعد تطبيق مصطلحات النشاط */
    title: string;
    originalTitle: string;
    icon: any;
    isStandalone?: boolean;
    href?: string;
    links: ActivityNavLink[];
}

/**
 * بيرجّع أقسام القوائم المتاحة للنشاط، بالأسماء المخصصة بتاعته،
 * وبعد استبعاد الصفحات المخفية عنه.
 *
 * @param includeHiddenFromSidebar صفحات عليها hideFromSidebar (زي "مشروع جديد").
 *        السايدبار بيستبعدها، وتاب الصلاحيات محتاجها عشان تتمنح صلاحيتها.
 */
export function buildNavForActivity(
    activity: ActivityModule,
    { includeHiddenFromSidebar = false }: { includeHiddenFromSidebar?: boolean } = {},
): ActivityNavSection[] {
    const out: ActivityNavSection[] = [];

    for (const section of navSections as any[]) {
        const featureKey: string | undefined = section.featureKey;
        if (!activityHasSection(activity, featureKey)) continue;

        const links: ActivityNavLink[] = (section.links || [])
            .filter((l: any) => activityHasPage(activity, featureKey, l.id))
            .filter((l: any) => includeHiddenFromSidebar || !l.hideFromSidebar)
            .map((l: any) => ({
                id: l.id,
                href: l.href,
                label: activityPageLabel(activity, l.id, l.label),
                originalLabel: l.label,
                hasApprove: l.hasApprove,
                hideFromSidebar: l.hideFromSidebar,
            }));

        if (!links.length && !section.isStandalone) continue;

        out.push({
            featureKey,
            title: activitySectionTitle(activity, featureKey, section.title),
            originalTitle: section.title,
            icon: section.icon,
            isStandalone: section.isStandalone,
            href: section.href,
            links,
        });
    }

    return out;
}

/**
 * كل الـ pageIds المتاحة للنشاط — مفيدة لبناء الباقة الافتراضية
 * أو للتحقق السريع.
 */
export function activityPageIds(activity: ActivityModule): string[] {
    return buildNavForActivity(activity, { includeHiddenFromSidebar: true })
        .flatMap(s => s.links.map(l => l.id));
}
