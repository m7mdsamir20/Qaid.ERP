'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';

import type { ActivityModule, TermKey } from './types';
import { getActivity, term } from './registry';

export interface UseActivityResult {
    /** موديول النشاط الكامل — للحالات اللي محتاجة تفاصيل */
    activity: ActivityModule;

    /**
     * المصطلح حسب النشاط — نص خام، لازم تنادي t() عليه:
     *   {t(term('customer'))}   →  'العميل'  أو  'صاحب المشروع'
     */
    term: (key: TermKey) => string;

    /** مفتاح النشاط — المقارنة بيه type-safe، TypeScript هيمسك أي غلطة إملائية */
    key: ActivityModule['key'];

    isTrading: boolean;
    isRetail: boolean;
    isServices: boolean;
    isRestaurants: boolean;
    isContracting: boolean;
}

/**
 * الطريقة **الوحيدة** لقراءة نشاط المستخدم في أي كومبوننت.
 *
 * قبل كده كان كل ملف بيقراها بطريقته — بعضهم بـ `?.toUpperCase()` وبعضهم
 * من غيرها. وده باگ حقيقي لأن الافتراضي في الداتابيز حروف صغيرة
 * ("trading")، فمقارنة زي `businessType === 'TRADING'` كانت بتفشل.
 * getActivity() بيوحّد الحروف وبيرجع TRADING لو القيمة فاضية أو غلط.
 */
export function useActivity(): UseActivityResult {
    const { data: session } = useSession();
    const businessType = (session?.user as { businessType?: string | null } | undefined)?.businessType;

    return useMemo(() => {
        const activity = getActivity(businessType);
        return {
            activity,
            term: (key: TermKey) => term(activity, key),
            key: activity.key,
            isTrading: activity.key === 'TRADING',
            isRetail: activity.key === 'RETAIL',
            isServices: activity.key === 'SERVICES',
            isRestaurants: activity.key === 'RESTAURANTS',
            isContracting: activity.key === 'CONTRACTING',
        };
    }, [businessType]);
}
