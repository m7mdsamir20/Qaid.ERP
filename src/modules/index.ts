/**
 * نقطة الدخول الوحيدة لنظام الأنشطة.
 * استورد من '@/modules' — مش من الملفات الداخلية مباشرة.
 */
export type { ActivityKey, ActivityModule, ActivityFlags, TermKey, InvoicePrefixes, InvoiceRefType, InvoiceTitle, InvoiceTitles } from './types';

export {
    ACTIVITIES,
    ACTIVITY_LIST,
    DEFAULT_ACTIVITY,
    getActivity,
    activityHasSection,
    activityHasPage,
    activitySectionTitle,
    activityPageLabel,
    getDefaultModules,
    term,
} from './registry';

export { CORE_SECTIONS, CORE_MODULES, DEFAULT_TERMS, DEFAULT_INVOICE_PREFIXES, DEFAULT_INVOICE_TITLES } from './shared';

// ⚠️ useActivity() مش متصدّر من هنا عن قصد — فيه 'use client' و useSession،
// والملف ده بيتستورد من middleware.ts اللي بيشتغل على Edge Runtime.
// في الكومبوننتس استورده مباشرة:  import { useActivity } from '@/modules/useActivity';

export {
    ruleForPath,
    isExemptPath,
    isPathAllowedForActivity,
} from './routes';
