/**
 * نقطة الدخول الوحيدة لنظام الأنشطة.
 * استورد من '@/modules' — مش من الملفات الداخلية مباشرة.
 */
export type { ActivityKey, ActivityModule, ActivityFlags } from './types';

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
} from './registry';

export { CORE_SECTIONS, CORE_MODULES } from './shared';

export {
    ruleForPath,
    isExemptPath,
    isPathAllowedForActivity,
} from './routes';
