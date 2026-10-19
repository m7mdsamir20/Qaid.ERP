/**
 * حركات خطط التقسيط في كشف حساب العميل
 * ─────────────────────────────────────
 * الخطة بتعمل فاتورة بيع مخفية (paymentMethod = installment_plan) — الفاتورة دي
 * مابتظهرش في الكشف، لأن الخطة نفسها هي اللي بتتعرض (وإلا المبلغ يتحسب مرتين).
 *
 * أثر الخطة على رصيد العميل:
 *   + قيمة العقد كاملة (السعر شامل الضريبة + الفوائد)
 *   − الدفعة المقدمة
 *   − الأقساط المحصّلة → دي بتطلع سندات قبض، فبتظهر في الكشف لوحدها
 *   ± فرق التكييش (خصم فوائد أو رسوم سداد معجل) — مسجّل في الأقساط نفسها
 *   − الأقساط الملغاة لو الخطة اتلغت
 */
import { roundMoney } from '@/lib/currency';

export interface PlanEntry {
    id: string;
    date: Date;
    type: string;
    ref: string;
    description: string;
    debit: number;
    credit: number;
}

export const SETTLE_NOTE_TAG = '(تكييش)';

export function getInstallmentPlanEntries(plans: any[]): PlanEntry[] {
    const entries: PlanEntry[] = [];
    for (const p of plans) {
        const ref = `PLN-${String(p.planNumber).padStart(5, '0')}`;
        const installments: any[] = p.installments || [];

        entries.push({
            id: p.id,
            date: p.startDate,
            type: 'خطة تقسيط',
            ref,
            description: `فتح خطة تقسيط: ${p.productName || '—'}`,
            debit: roundMoney(p.grandTotal + p.downPayment),
            credit: 0,
        });

        if (p.downPayment > 0) {
            entries.push({
                id: `${p.id}-down`, date: p.startDate, type: 'دفعة مقدمة', ref,
                description: 'دفعة مقدمة لخطة التقسيط', debit: 0, credit: roundMoney(p.downPayment),
            });
        }

        // التكييش: الفرق بين قيمة الأقساط والمدفوع فعلاً فيها
        const settled = installments.filter(i => i.status === 'paid' && (i.notes || '').includes(SETTLE_NOTE_TAG));
        if (settled.length > 0) {
            const adj = roundMoney(settled.reduce((s, i) => s + i.amount - i.paidAmount, 0));
            const date = settled.reduce((d: Date, i) => (i.paidAt && i.paidAt > d ? i.paidAt : d), settled[0].paidAt || p.updatedAt);
            if (adj !== 0) {
                entries.push({
                    id: `${p.id}-settle`, date, ref,
                    type: adj > 0 ? 'خصم سداد معجل' : 'رسوم سداد معجل',
                    description: adj > 0 ? 'خصم الفوائد المتبقية عند تكييش الخطة' : 'رسوم سداد معجل للخطة',
                    debit: adj < 0 ? -adj : 0,
                    credit: adj > 0 ? adj : 0,
                });
            }
        }

        if (p.status === 'cancelled') {
            const reversed = roundMoney(installments.filter(i => i.status === 'cancelled').reduce((s, i) => s + i.amount - i.paidAmount, 0));
            if (reversed > 0) {
                entries.push({
                    id: `${p.id}-cancel`, date: p.updatedAt, type: 'إلغاء خطة تقسيط', ref,
                    description: 'إلغاء الأقساط المتبقية', debit: 0, credit: reversed,
                });
            }
        }
    }
    return entries;
}

/** فواتير البيع المخفية بتاعة خطط التقسيط — مابتتعرضش في كشف الحساب */
export function getPlanInvoiceIds(plans: any[]): Set<string> {
    return new Set(plans.map(p => p.invoiceId).filter(Boolean));
}
