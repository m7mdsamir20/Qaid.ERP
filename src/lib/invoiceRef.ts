/**
 * ═══════════════════════════════════════════════════════════════
 *  كود الفاتورة — المصدر الوحيد
 * ═══════════════════════════════════════════════════════════════
 *
 * الشكل: 3 حروف + شرطة + الرقم بـ 5 خانات  →  CON-00042
 * الحروف بتختلف حسب **نوع الفاتورة** و**نشاط الشركة**، وبتيجي من
 * invoicePrefixes في src/modules/.
 *
 * ⚠️ الكود ده بيتخزن في مرجع القيود المحاسبية وحركات المخزون.
 * عشان كده أي كود بيقرا مرجع محفوظ لازم يستخدم parseInvoiceRef —
 * اللي بيعرف البادئات الجديدة **والقديمة** مع بعض، وبيتعامل مع
 * المراجع القديمة اللي كانت من غير أصفار (SAL-42).
 */

import { ACTIVITY_LIST, getActivity } from '@/modules';

/** طول رقم الفاتورة بعد إضافة الأصفار */
const NUM_WIDTH = 5;

/** بيوحّد أسماء الأنواع المختلفة (prisma بيستخدم _ والطباعة بتستخدم -) */
function normalizeType(type: string): keyof InvoicePrefixMap | null {
    switch (type) {
        case 'sale': return 'sale';
        case 'sale_return':
        case 'sale-return': return 'saleReturn';
        case 'purchase': return 'purchase';
        case 'purchase_return':
        case 'purchase-return': return 'purchaseReturn';
        default: return null;
    }
}

interface InvoicePrefixMap {
    sale: string;
    saleReturn: string;
    purchase: string;
    purchaseReturn: string;
}

/**
 * كود الفاتورة الرسمي.
 *
 *   getInvoiceRef(42, 'sale', 'CONTRACTING')  →  'CON-00042'
 *   getInvoiceRef(7,  'sale', 'SERVICES')     →  'SRV-00007'
 *
 * @param invoiceNumber رقم الفاتورة الخام من الداتابيز
 * @param type          نوع الفاتورة
 * @param businessType  نشاط الشركة (بيتوحّد داخلياً، بيقبل الحروف الصغيرة)
 */
export function getInvoiceRef(
    invoiceNumber: number | string,
    type: string,
    businessType?: string | null,
): string {
    const num = String(invoiceNumber).padStart(NUM_WIDTH, '0');
    const key = normalizeType(type);
    if (!key) return `INV-${num}`;
    return `${getActivity(businessType).invoicePrefixes[key]}-${num}`;
}

/** سند قبض / صرف — مالهاش علاقة بالنشاط */
export function getVoucherRef(voucherNumber: number | string, type: string): string {
    const num = String(voucherNumber).padStart(NUM_WIDTH, '0');
    return `${type === 'receipt' ? 'RCP' : 'PMT'}-${num}`;
}

/* ═══════════════════════════════════════════════════════════════
   قراءة المراجع المحفوظة
   ═══════════════════════════════════════════════════════════════ */

/**
 * بادئات قديمة كانت بتتكتب قبل التوحيد — لازم نفضل نعرفها عشان
 * البيانات الموجودة في الداتابيز تفضل مقروءة.
 */
const LEGACY_PREFIXES: Record<string, keyof InvoicePrefixMap> = {
    SAL: 'sale',
    SRV: 'sale',        // كانت بتتكتب للبيع والمرتجع الخدمي مع بعض
    INV: 'sale',
    SLR: 'saleReturn',
    SRET: 'saleReturn', // الصيغة القديمة لمرتجع البيع
    'SRV-RET': 'saleReturn',
    PUR: 'purchase',
    PURCH: 'purchase',
    PRR: 'purchaseReturn',
    PRET: 'purchaseReturn',
};

/** كل البادئات المعروفة (كل الأنشطة + القديمة) → نوع الفاتورة */
function buildPrefixIndex(): Record<string, keyof InvoicePrefixMap> {
    const idx: Record<string, keyof InvoicePrefixMap> = { ...LEGACY_PREFIXES };
    for (const activity of ACTIVITY_LIST) {
        const p = activity.invoicePrefixes;
        idx[p.sale] = 'sale';
        idx[p.saleReturn] = 'saleReturn';
        idx[p.purchase] = 'purchase';
        idx[p.purchaseReturn] = 'purchaseReturn';
    }
    return idx;
}

const PREFIX_INDEX = buildPrefixIndex();

export interface ParsedInvoiceRef {
    /** البادئة زي ما هي في المرجع */
    prefix: string;
    /** نوع الفاتورة */
    kind: keyof InvoicePrefixMap;
    /** رقم الفاتورة كرقم */
    number: number;
    /** المرجع بالشكل الموحّد (بالأصفار) */
    normalized: string;
}

/**
 * بيفسّر مرجع محفوظ. بيرجع null لو المرجع مش مرجع فاتورة
 * (زي RCP- أو INST- أو POS-).
 *
 *   parseInvoiceRef('SAL-42')     → { prefix:'SAL', kind:'sale', number:42, normalized:'SAL-00042' }
 *   parseInvoiceRef('SRET-00007') → { prefix:'SRET', kind:'saleReturn', ... }
 *   parseInvoiceRef('RCP-00001')  → null
 */
export function parseInvoiceRef(ref?: string | null): ParsedInvoiceRef | null {
    if (!ref) return null;
    const m = /^([A-Z]+(?:-RET)?)-(\d+)$/.exec(ref.trim().toUpperCase());
    if (!m) return null;
    const [, prefix, digits] = m;
    const kind = PREFIX_INDEX[prefix];
    if (!kind) return null;
    const number = Number(digits);
    return { prefix, kind, number, normalized: `${prefix}-${digits.padStart(NUM_WIDTH, '0')}` };
}

/** هل المرجع ده بتاع فاتورة بيع (أو مرتجع بيع)؟ */
export function isSaleRef(ref?: string | null): boolean {
    const k = parseInvoiceRef(ref)?.kind;
    return k === 'sale' || k === 'saleReturn';
}

/** هل المرجع ده بتاع فاتورة شراء (أو مرتجع شراء)؟ */
export function isPurchaseRef(ref?: string | null): boolean {
    const k = parseInvoiceRef(ref)?.kind;
    return k === 'purchase' || k === 'purchaseReturn';
}

/**
 * بيرجّع المرجع بالأصفار لو كان مرجع فاتورة، وإلا بيرجّعه زي ما هو.
 * مفيدة لعرض البيانات القديمة اللي اتكتبت من غير أصفار.
 */
export function normalizeInvoiceRef(ref?: string | null): string {
    return parseInvoiceRef(ref)?.normalized ?? (ref ?? '');
}
