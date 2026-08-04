/**
 * ═══════════════════════════════════════════════════════════════
 *  حالة سداد الفاتورة — المصدر الوحيد
 * ═══════════════════════════════════════════════════════════════
 *
 * المشكلة اللي بيحلها الملف ده:
 *
 * المبالغ متخزنة Float. سند القبض بيعمل:
 *     paidAmount += toApply
 *     remaining  -= toApply
 *
 * ومع الكسور العشرية، الجمع بيسيب فرق مجهري. مثال حقيقي:
 *     الإجمالي 1012.35، دفعتين 337.45 + 674.90
 *     paidAmount = 1012.3499999999999   ← أقل من الإجمالي بشعرة
 *     remaining  = 0                    ← وصلت صفر
 *
 * فالمقارنة الصارمة `paid >= total` بترجع false، والفاتورة بتظهر
 * «دفع جزئي» رغم إن المتبقي صفر ومفيش عليها حاجة.
 *
 * الحل: تسامح بقيمة أقل من أصغر وحدة نقدية. الرقم ده متسق مع
 * `remaining: { gt: 0.001 }` المستخدم أصلاً في api/vouchers.
 */

/** أقل من أصغر كسر نقدي (هللة/قرش) — أي فرق تحته مش حقيقي */
export const MONEY_EPSILON = 0.001;

export type PaymentState = 'paid' | 'partial' | 'unpaid';

/**
 * حالة سداد الفاتورة.
 *
 *   getPaymentState(1012.35, 1012.3499999999999)  →  'paid'
 *   getPaymentState(1000, 400)                    →  'partial'
 *   getPaymentState(1000, 0)                      →  'unpaid'
 */
export function getPaymentState(total: number, paid: number): PaymentState {
    const t = Number(total) || 0;
    const p = Number(paid) || 0;
    if (t > 0 && p >= t - MONEY_EPSILON) return 'paid';
    if (p > MONEY_EPSILON) return 'partial';
    return 'unpaid';
}

/** هل الفاتورة مسدّدة بالكامل؟ */
export function isFullyPaid(total: number, paid: number): boolean {
    return getPaymentState(total, paid) === 'paid';
}

/**
 * المتبقي الفعلي — بيصفّر الفروق المجهرية.
 * بيمنع ظهور «0.00» بالسالب أو «1e-13» في الشاشات.
 */
export function realRemaining(total: number, paid: number): number {
    const r = (Number(total) || 0) - (Number(paid) || 0);
    return Math.abs(r) < MONEY_EPSILON ? 0 : r;
}
