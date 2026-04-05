import { getCurrencySymbol } from './currency';

export interface CompanyInfo {
    name?: string;
    nameEn?: string;
    phone?: string;
    email?: string;
    taxNumber?: string;
    commercialRegister?: string;
    address?: string;
    logo?: string;
    currency?: string;
    branchName?: string;
}

type InvoiceType = 'sale' | 'purchase' | 'sale-return' | 'purchase-return';
type VoucherType = 'receipt' | 'payment';

const TITLES: Record<InvoiceType, string> = {
    'sale': 'فاتورة مبيعات',
    'purchase': 'فاتورة مشتريات',
    'sale-return': 'مرتجع مبيعات',
    'purchase-return': 'مرتجع مشتريات',
};

const PREFIXES: Record<InvoiceType, string> = {
    'sale': 'SAL',
    'purchase': 'PUR',
    'sale-return': 'SLR',
    'purchase-return': 'PRR',
};

// ═══════════════════════════════════════════════
//  A4 INVOICE (مبيعات / مشتريات / مرتجعات)
// ═══════════════════════════════════════════════
export function printA4Invoice(
    invoice: any,
    type: InvoiceType,
    company: CompanyInfo = {},
    options: {
        terms?: string;
        showSignature?: boolean;
        showStamp?: boolean;
        partyBalance?: number; // رصيد العميل/المورد بعد الفاتورة
    } = {}
) {
    const sym = getCurrencySymbol(company.currency || 'EGP');
    const co = {
        name: company.name || 'اسم الشركة',
        addr: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        tax: company.taxNumber || '',
        cr: company.commercialRegister || '',
        logo: company.logo || '',
        branch: company.branchName || '',
    };

    const title = TITLES[type];
    const prefix = PREFIXES[type];
    const isReturn = type.includes('return');
    const isSale = type === 'sale' || type === 'sale-return';

    const party = isSale ? (invoice.customer || null) : (invoice.supplier || null);
    const partyLabel = isSale ? 'العميل' : 'المورد';

    const lines = invoice.lines || [];
    const subtotal = lines.reduce((s: number, l: any) => s + Number(l.total || 0), 0);
    const discount = Number(invoice.discount || 0);
    const total = Number(invoice.total || subtotal - discount);
    const paid = Number(invoice.paidAmount || 0);
    const remaining = Math.max(0, total - paid);
    const partyBalance = options.partyBalance ?? null;

    const date = new Date(invoice.date || new Date())
        .toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    const invoiceNum = String(invoice.invoiceNumber || 1).padStart(5, '0');

    // تحديد ما إذا كان النشاط خدمياً بناءً على وجود أوصاف في البنود
    const isServicesLine = lines.some((l: any) => l.description || (l.item?.businessType?.toUpperCase() === 'SERVICES'));

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>${title} - ${prefix}-${invoiceNum}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#111;font-size:12px;background:#fff;direction:rtl}
.page{width:100%;min-height:100vh;margin:0 auto;padding:10mm 12mm;display:flex;flex-direction:column;gap:12px}

/* ── HEADER ── */
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid #111;margin-bottom:2px}
.co-name{font-size:20px;font-weight:900;color:#111}
.co-line{font-size:11px;color:#444;line-height:1.8}
.header-center{text-align:center;flex:1}
.inv-title{font-size:24px;font-weight:900;color:#111}
.inv-num{font-size:13px;color:#555;margin-top:4px;font-family:monospace;font-weight:700}
.inv-date{font-size:11px;color:#666;margin-top:4px}
.logo-block img{max-height:75px;max-width:90px;object-fit:contain}
.logo-letter{width:72px;height:72px;border-radius:12px;background:#f5f5f5;border:1.5px solid #e0e0e0;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900}

/* ── TABLES ── */
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.info-box{border:1px solid #e0e0e0;border-radius:6px;overflow:hidden}
.info-head{background:#f8f8f8;padding:7px 12px;font-size:10px;font-weight:800;border-bottom:1px solid #e0e0e0}
.info-body{padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.info-row{font-size:11px}
.ik{color:#888;min-width:90px;display:inline-block}
.iv{color:#1a1a1a;font-weight:700}

.section-title{font-size:11px;font-weight:900;padding-bottom:4px;border-bottom:2px solid #111;margin-bottom:6px;margin-top:4px}
table{width:100%;border-collapse:collapse;border:1px solid #d0d0d0;border-radius:6px;overflow:hidden}
thead{background:#1a1a1a}
thead th{padding:9px 12px;font-size:10px;font-weight:700;color:#fff;text-align:center;border-right:1px solid #333}
tbody td{padding:8px 12px;font-size:11px;color:#1a1a1a;text-align:center;border-right:1px solid #ebebeb;vertical-align:middle}
.item-name{font-weight:700;font-size:12px}

.bottom-wrap{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-top:10px}
.totals{min-width:270px;border:1px solid #d0d0d0;border-radius:6px;overflow:hidden}
.t-row{display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #ebebeb;font-size:11px}
.t-main{background:#1a1a1a;color:#fff;font-weight:900}
.t-main .tl{color:#fff}

.footer{margin-top:auto;padding-top:14px;border-top:2px solid #1a1a1a}
.footer-inner{display:flex;justify-content:space-between;align-items:flex-end}
.sig-box{text-align:center;min-width:140px}
.sig-label{font-size:10px;color:#888;margin-bottom:30px}
.sig-line{border-top:1px solid #999;padding-top:5px;font-size:10px}
</style>
</head>
<body>
<div class="page">
<div class="header">
    <div class="co-block">
        <div class="co-name">${co.name}</div>
        ${co.addr  ? `<div class="co-line">📍 ${co.addr}</div>` : ''}
        ${co.phone ? `<div class="co-line">📞 ${co.phone}</div>` : ''}
        ${co.tax    ? `<div class="co-line">الرقم الضريبي: <strong>${co.tax}</strong></div>` : ''}
    </div>
    <div class="header-center">
        <div class="inv-title">${title}</div>
        <div class="inv-num">${prefix}-${invoiceNum}</div>
        <div class="inv-date">${date}</div>
    </div>
    <div class="logo-block">
        ${co.logo ? `<img src="${co.logo}" alt=""/>` : ''}
    </div>
</div>

<div class="info-grid">
    <div class="info-box">
        <div class="info-head">بيانات ${partyLabel}</div>
        <div class="info-body">
            <div class="info-row"><span class="ik">الاسم:</span><span class="iv">${party?.name || '— عميل نقدي'}</span></div>
            ${party?.phone ? `<div class="info-row"><span class="ik">الهاتف:</span><span class="iv">${party.phone}</span></div>` : ''}
        </div>
    </div>
    <div class="info-box">
        <div class="info-head">بيانات الفاتورة</div>
        <div class="info-body">
            <div class="info-row"><span class="ik">رقم الفاتورة:</span><span class="iv">${prefix}-${invoiceNum}</span></div>
            <div class="info-row"><span class="ik">التاريخ:</span><span class="iv">${date}</span></div>
        </div>
    </div>
</div>

<div class="section-title">بنود الفاتورة</div>
<table>
    <thead>
        <tr>
            <th style="width:5%">#</th>
            <th style="width:45%;text-align:right">${isServicesLine ? 'الخدمة / الوصف' : 'الصنف'}</th>
            ${!isServicesLine ? '<th style="width:10%">الوحدة</th>' : ''}
            <th style="width:10%">الكمية</th>
            <th style="width:10%">السعر</th>
            ${lines.some((l: any) => (l.taxAmount || 0) > 0) ? '<th style="width:10%">الضريبة</th>' : ''}
            <th style="width:10%">الإجمالي</th>
        </tr>
    </thead>
    <tbody>
        ${lines.map((l: any, i: number) => {
            const unit = l.item?.unit?.name || l.unit?.name || l.unit || '—';
            const name = l.item?.name || l.itemName || '';
            const desc = l.description || '';
            const taxAmount = Number(l.taxAmount || 0);
            return `<tr>
                <td>${i + 1}</td>
                <td style="text-align:right">
                    <div class="item-name">${name}</div>
                    ${desc ? `<div style="font-size:10px;color:#666;margin-top:2px">${desc}</div>` : ''}
                </td>
                ${!isServicesLine ? `<td>${unit}</td>` : ''}
                <td><strong>${Number(l.quantity).toLocaleString()}</strong></td>
                <td>${Number(l.price).toLocaleString()} ${sym}</td>
                ${lines.some((lx: any) => (lx.taxAmount || 0) > 0) ? `<td>${taxAmount > 0 ? taxAmount.toLocaleString() + ' ' + sym : '—'}</td>` : ''}
                <td><strong>${Number(l.total).toLocaleString()} ${sym}</strong></td>
            </tr>`;
        }).join('')}
    </tbody>
</table>

<div class="bottom-wrap">
    <div style="flex:1;border:1px dashed #ccc;padding:10px;font-size:11px;color:#555">
        <strong>ملاحظات: </strong>${invoice.notes || ''}
    </div>
    <div class="totals">
        <div class="t-row t-main">
            <span>صافي الفاتورة</span>
            <span>${total.toLocaleString()} ${sym}</span>
        </div>
        <div class="t-row">
            <span>المدفوع</span>
            <span>${paid.toLocaleString()} ${sym}</span>
        </div>
        <div class="t-row">
            <span>المتبقي</span>
            <span>${remaining.toLocaleString()} ${sym}</span>
        </div>
    </div>
</div>

<div class="footer">
    <div class="footer-inner">
        <div class="sig-box">
            <div class="sig-label">توقيع ${partyLabel}</div>
            <div class="sig-line">الاسم والتوقيع</div>
        </div>
        <div style="text-align:center;font-size:10px;color:#666">
            شكراً لتعاملكم معنا
        </div>
        <div class="sig-box">
            <div class="sig-label">توقيع المسؤول</div>
            <div class="sig-line">الختم والتوقيع</div>
        </div>
    </div>
</div>
</div>
<script>window.onload=()=>window.print();</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
}

export function printThermalVoucher(voucher: any, type: VoucherType, company: CompanyInfo = {}) {
    // ... thermal logic omitted for brevity, but you can keep it as is if needed ...
}

export function printSaleInvoice(inv: any, cust: any, num: number, form: any, co: CompanyInfo = {}) {
    printA4Invoice({ ...inv, customer: cust, invoiceNumber: num, notes: inv.notes || form.notes }, 'sale', co);
}

export function printReturnInvoice(inv: any, cust: any, num: number, form: any, co: CompanyInfo = {}) {
    printA4Invoice({ ...inv, customer: cust, invoiceNumber: num, notes: inv.notes || form.notes }, 'sale-return', co);
}

export function printPurchaseInvoice(inv: any, supp: any, num: number, form: any, co: CompanyInfo = {}) {
    printA4Invoice({ ...inv, supplier: supp, invoiceNumber: num, notes: inv.notes || form.notes }, 'purchase', co);
}

export function printInvoice(inv: any, type: InvoiceType, sym: string = 'ج.م') {
    printA4Invoice(inv, type, { currency: sym === 'ج.م' ? 'EGP' : 'USD' });
}

// ═══════════════════════════════════════════════
//  A4 QUOTATION (عرض سعر)
// ═══════════════════════════════════════════════
export function printQuotation(
    quotation: any,
    company: CompanyInfo = {},
    options: {
        terms?: string;
        showSignature?: boolean;
        showStamp?: boolean;
    } = {}
) {
    const sym = getCurrencySymbol(company.currency || 'EGP');
    const co = {
        name: company.name || 'اسم الشركة',
        addr: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        tax: company.taxNumber || '',
        cr: company.commercialRegister || '',
        logo: company.logo || '',
    };

    const title = 'عرض سعر';
    const lines = quotation.lines || [];
    const subtotal = Number(quotation.subtotal || 0);
    const taxAmt = Number(quotation.taxAmount || 0);
    const total = Number(quotation.total || subtotal + taxAmt);
    const date = new Date(quotation.date || new Date())
        .toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    const quoNum = String(quotation.quotationNumber || 1).padStart(5, '0');

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>عرض سعر - ${quoNum}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#111;font-size:12px;background:#fff;direction:rtl}
.page{width:100%;min-height:100vh;margin:0 auto;padding:10mm 15mm;display:flex;flex-direction:column;gap:20px}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:15px;border-bottom:3px solid #111;margin-bottom:10px}
.co-name{font-size:24px;font-weight:900;color:#111}
.co-line{font-size:11px;color:#444;line-height:1.8}
.header-center{text-align:center;flex:1}
.inv-title{font-size:32px;font-weight:900;color:#111;letter-spacing:1px}
.inv-num{font-size:14px;color:#333;margin-top:6px;font-family:monospace;font-weight:700}
.info-row{display:flex;justify-content:space-between;gap:40px;margin-bottom:15px}
.info-box{flex:1;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;padding:12px}
.info-label{font-size:11px;color:#6b7280;margin-bottom:4px;font-weight:700}
.info-val{font-size:14px;font-weight:700;color:#111}
table{width:100%;border-collapse:collapse;margin-bottom:20px;table-layout:fixed}
th{background:#111;color:#fff;padding:12px;text-align:center;font-size:12px;font-weight:700}
td{padding:12px;border:1px solid #e5e7eb;text-align:center;font-size:13px;word-break:break-word}
.item-num{width:40px}
.item-name{width:auto;text-align:right;font-weight:700}
.summary{display:flex;justify-content:flex-end;margin-top:auto}
.summary-table{width:280px;border-top:2px solid #111}
.sum-row{display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #e5e7eb}
.sum-row.final{background:#111;color:#fff;border-bottom:none;margin-top:4px}
.notes{margin-top:30px;padding:15px;border:1px dashed #d1d5db;border-radius:8px;font-size:11px;line-height:1.6}
.footer{margin-top:40px;text-align:center;font-size:10px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:10px}
@media print{.no-print{display:none}}
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="header-right" style="width: 250px">
            <h1 class="co-name">${co.name}</h1>
            <p class="co-line">${co.addr}</p>
            <p class="co-line">${co.phone} - ${co.email}</p>
            ${co.tax ? `<p class="co-line">الرقم الضريبي: ${co.tax}</p>` : ''}
        </div>
        <div class="header-center">
            <h2 class="inv-title">${title}</h2>
            <div class="inv-num">QR-${quoNum}</div>
            <div style="font-size:11px;color:#666;margin-top:8px">صادر في: ${date}</div>
        </div>
        <div class="header-left" style="width: 150px; text-align: left">
            ${co.logo ? `<img src="${co.logo}" style="max-height: 70px; max-width: 150px">` : ''}
        </div>
    </div>

    <div class="info-row">
        <div class="info-box">
            <div class="info-label">معلومات العميل</div>
            <div class="info-val">${quotation.customer?.name || 'عميل نقدي'}</div>
            <div style="font-size: 11px; color: #4b5563; margin-top:2px">${quotation.customer?.phone || ''}</div>
            <div style="font-size: 11px; color: #4b5563; margin-top:2px">${quotation.customer?.address || ''}</div>
        </div>
        <div class="info-box" style="flex: 0.5">
            <div class="info-label">حالة العرض</div>
            <div class="info-val" style="color: #256af4">قيد الدراسة</div>
            <div class="info-label" style="margin-top:8px">رقم التواصل</div>
            <div class="info-val">${co.phone}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th class="item-num">#</th>
                <th class="item-name">الخدمة / الصنف</th>
                <th style="width: 70px">الكمية</th>
                <th style="width: 100px">السعر</th>
                <th style="width: 100px">الإجمالي</th>
            </tr>
        </thead>
        <tbody>
            ${lines.map((l: any, i: number) => `
            <tr>
                <td>${i + 1}</td>
                <td class="item-name">
                    ${l.itemName}
                    ${l.description ? `<div style="font-size:10px;color:#666;font-weight:400">${l.description}</div>` : ''}
                </td>
                <td>${l.quantity} ${l.unit || ''}</td>
                <td>${Number(l.price).toLocaleString()}</td>
                <td>${Number(l.total).toLocaleString()}</td>
            </tr>`).join('')}
        </tbody>
    </table>

    <div class="summary">
        <div class="summary-table">
            <div class="sum-row">
                <span>المجموع الفرعي:</span>
                <span style="font-weight:700">${subtotal.toLocaleString()} ${sym}</span>
            </div>
            ${quotation.discount > 0 ? `
            <div class="sum-row">
                <span>الخصم:</span>
                <span style="font-weight:700">${Number(quotation.discount).toLocaleString()} ${sym}</span>
            </div>` : ''}
            ${taxAmt > 0 ? `
            <div class="sum-row">
                <span>الضريبة (${quotation.taxRate}%):</span>
                <span style="font-weight:700">${taxAmt.toLocaleString()} ${sym}</span>
            </div>` : ''}
            <div class="sum-row final">
                <span style="font-size:15px">الإجمالي النهائي:</span>
                <span style="font-size:18px;font-weight:900">${total.toLocaleString()} ${sym}</span>
            </div>
        </div>
    </div>

    ${options.terms || quotation.notes ? `
    <div class="notes">
        <div style="font-weight:800;text-decoration:underline;margin-bottom:8px">ملاحظات وشروط إضافية:</div>
        <div>${options.terms || quotation.notes}</div>
    </div>` : ''}

    <div style="margin-top: 40px; display: flex; justify-content: space-between; padding: 0 40px">
        <div style="text-align: center">
            <div style="font-weight: 700; margin-bottom: 40px">ختم الشركة</div>
            <div style="width: 100px; height: 1px; border-bottom: 2px solid #eee"></div>
        </div>
        <div style="text-align: center">
            <div style="font-weight: 700; margin-bottom: 40px">توقيع المسؤول</div>
            <div style="width: 100px; height: 1px; border-bottom: 2px solid #eee"></div>
        </div>
    </div>

    <div class="footer">
        هذا المستند يعتبر عرض سعر أولي وغير ملزم للطرفين إلا بعد تحويله لفاتورة رسمية أو عقد معتمد.
    </div>
</div>

<script>
    window.onload = () => {
        window.print();
        setTimeout(() => window.close(), 500);
    };
</script>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (printWin) {
        printWin.document.write(html);
        printWin.document.close();
    }
}
