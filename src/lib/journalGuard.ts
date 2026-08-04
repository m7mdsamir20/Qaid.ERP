/**
 * ═══════════════════════════════════════════════════════════════
 *  حارس توازن القيود
 * ═══════════════════════════════════════════════════════════════
 *
 * القيد اليدوي في api/journal-entries بيرفض أي قيد مدينه ≠ دائنه.
 * لكن القيود **التلقائية** اللي بتتولد مع الفواتير ماكانش عليها أي
 * تحقق — الحماية الوحيدة كانت `journalLines.length >= 2` وهي بتعدّ
 * السطور مش بتوزنها.
 *
 * إزاي كان بيحصل خلل:
 * سطور القيد بتتبني بشروط منفصلة —
 *     مدين: الخزينة   لو (paid > 0 && فيه حساب خزينة)
 *     مدين: الذمم     لو (remaining > 0 && فيه حساب ذمم)
 *     دائن: الإيراد   دايماً
 * فلو حساب الذمم ناقص من شجرة الحسابات، الطرف المدين بيتشال
 * والدائن بيتسجل → قيد ناقص طرف → ميزان المراجعة ما بيتوازنش،
 * والفاتورة بتتحفظ بصمت من غير ما حد يعرف.
 *
 * الحل: نرفض القيد المختل ونوقف العملية كلها. الفاتورة جوه
 * transaction، فالرفض بيلغي كل حاجة — أحسن بكتير من فاتورة
 * محفوظة بدفاتر مكسورة.
 */

/** نفس التسامح المستخدم في القيد اليدوي */
const BALANCE_EPSILON = 0.001;

export interface JournalLineInput {
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
}

export class UnbalancedJournalError extends Error {
    constructor(
        public readonly totalDebit: number,
        public readonly totalCredit: number,
        public readonly context: string,
    ) {
        const diff = (totalDebit - totalCredit).toFixed(2);
        super(
            `تعذّر إتمام العملية: القيد المحاسبي غير متوازن (${context}). ` +
            `المدين ${totalDebit.toFixed(2)} والدائن ${totalCredit.toFixed(2)} — الفرق ${diff}. ` +
            `السبب الأغلب حساب ناقص من شجرة الحسابات. راجع: حساب الذمم (1121)، ` +
            `حساب الإيراد (4100 للمبيعات / 4200 للخدمات)، وحساب الخزينة المختارة.`
        );
        this.name = 'UnbalancedJournalError';
    }
}

/**
 * بيتأكد إن القيد متوازن قبل الحفظ، وبيرمي خطأ واضح لو مش متوازن.
 *
 * @param lines   سطور القيد
 * @param context وصف مختصر يظهر في رسالة الخطأ (مثلاً "فاتورة مبيعات SAL-00042")
 * @returns true لو القيد صالح للحفظ، false لو مفيش سطور كفاية (مش خطأ)
 */
export function assertBalanced(lines: JournalLineInput[], context: string): boolean {
    // أقل من سطرين = مفيش قيد أصلاً، مش حالة خطأ
    if (!lines || lines.length < 2) return false;

    const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > BALANCE_EPSILON) {
        throw new UnbalancedJournalError(totalDebit, totalCredit, context);
    }

    return true;
}
