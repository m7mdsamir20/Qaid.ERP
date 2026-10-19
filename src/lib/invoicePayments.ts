/**
 * المبلغ اللي اتدفع مع الفاتورة نفسها وقت إنشائها (نقدي / بنك)
 * ─────────────────────────────────────────────────────────────
 * invoice.paidAmount مش ينفع لوحده في كشف الحساب: سند القبض بيوزّع مبلغه على
 * فواتير العميل المفتوحة ويزوّد paidAmount بتاعها — فلو عرضنا paidAmount كدفعة
 * والسند كمان، الدفعة هتتحسب مرتين.
 *
 * فبنجيب المدفوع وقت الإنشاء من قيد الفاتورة نفسه: سطر الخزينة/البنك فيه.
 *   - مرتجع المبيعات: السندات مابتتوزعش عليه، فـ paidAmount = المسترد وقتها
 *   - فاتورة آجلة (credit) أو خطة تقسيط: مفيش دفع وقت الإنشاء
 *   - فاتورة نقدي/بنك من غير قيد: paidAmount (مالهاش سندات اتوزعت عليها غالباً)
 *   - فاتورة قديمة من غير طريقة دفع ولا قيد: مش معروف → 0
 */
import { roundMoney } from '@/lib/currency';

interface InvoiceForPayment {
    id: string;
    type: string;
    paidAmount: number;
    paymentMethod: string | null;
}

export async function getPaidAtCreation(db: any, companyId: string, invoices: InvoiceForPayment[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    const needJournal: InvoiceForPayment[] = [];

    for (const inv of invoices) {
        if (!(inv.paidAmount > 0)) result.set(inv.id, 0);
        else if (inv.type === 'sale_return') result.set(inv.id, inv.paidAmount);
        else if (inv.paymentMethod === 'credit' || inv.paymentMethod === 'installment_plan') result.set(inv.id, 0);
        else needJournal.push(inv);
    }
    if (needJournal.length === 0) return result;

    const [treasuries, entries] = await Promise.all([
        db.treasury.findMany({ where: { companyId, accountId: { not: null } }, select: { accountId: true } }),
        db.journalEntry.findMany({
            where: { companyId, referenceType: 'invoice', referenceId: { in: needJournal.map(i => i.id) } },
            select: { referenceId: true, lines: { select: { accountId: true, debit: true } } },
        }),
    ]);
    const treasuryAccounts = new Set(treasuries.map((t: any) => t.accountId));
    const paidByInvoice = new Map<string, number>();
    for (const e of entries) {
        const paid = e.lines.filter((l: any) => treasuryAccounts.has(l.accountId)).reduce((s: number, l: any) => s + l.debit, 0);
        paidByInvoice.set(e.referenceId, (paidByInvoice.get(e.referenceId) || 0) + paid);
    }

    for (const inv of needJournal) {
        const fromJournal = paidByInvoice.get(inv.id);
        const paid = fromJournal !== undefined ? fromJournal : (inv.paymentMethod ? inv.paidAmount : 0);
        result.set(inv.id, roundMoney(Math.min(paid, inv.paidAmount)));
    }
    return result;
}
