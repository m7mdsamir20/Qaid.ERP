import { getCurrencySymbol } from './currency';
import { formatAddressForInvoice } from './addressConfig';

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
    countryCode?: string;
    branchName?: string;
    businessType?: string;
}

type InvoiceType = 'sale' | 'purchase' | 'sale-return' | 'purchase-return';
type VoucherType = 'receipt' | 'payment';

const TITLES: Record<InvoiceType, string> = {
    'sale': 'فاتورة مبيعات',
    'purchase': 'فاتورة مشتريات',
    'sale-return': 'مرتجع مبيعات',
    'purchase-return': 'مرتجع مشتريات',
};

const TITLES_EN: Record<InvoiceType, string> = {
    'sale': 'Sales Invoice',
    'purchase': 'Purchase Invoice',
    'sale-return': 'Sales Return',
    'purchase-return': 'Purchase Return',
};

const PREFIXES: Record<InvoiceType, string> = {
    'sale': 'SAL',
    'purchase': 'PUR',
    'sale-return': 'SLR',
    'purchase-return': 'PRR',
};

// ═══════════════════════════════════════════════
//  ZATCA QR Code TLV Generator (Saudi Arabia)
// ═══════════════════════════════════════════════
function generateZatcaTLV(sellerName: string, vatNumber: string, timestamp: string, totalWithVat: string, vatAmount: string): string {
    const encoder = new TextEncoder();
    const tlvBuffers: Uint8Array[] = [];
    const values = [sellerName, vatNumber, timestamp, totalWithVat, vatAmount];
    values.forEach((val, idx) => {
        const tag = idx + 1;
        const encoded = encoder.encode(val);
        const len = encoded.length;
        const buf = new Uint8Array(2 + len);
        buf[0] = tag;
        buf[1] = len;
        buf.set(encoded, 2);
        tlvBuffers.push(buf);
    });
    const totalLen = tlvBuffers.reduce((s, b) => s + b.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    tlvBuffers.forEach(buf => { result.set(buf, offset); offset += buf.length; });
    // Convert to base64
    let binary = '';
    result.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
}

// ═══════════════════════════════════════════════
//  A4 INVOICE (مبيعات / مشتريات / مرتجعات)
// ═══════════════════════════════════════════════
function generateA4HTML(
    invoice: any,
    type: InvoiceType,
    company: CompanyInfo = {},
    options: {
        terms?: string;
        showSignature?: boolean;
        showStamp?: boolean;
        partyBalance?: number;
        forDownload?: boolean; // إذا true لا يتم تشغيل window.print تلقائياً
    } = {}
): string {
    const sym = getCurrencySymbol(company.currency || 'EGP');
    const country = (company.countryCode || 'EG').toUpperCase();
    const isSaudi = country === 'SA';
    const isBilingual = country !== 'EG'; // كل الدول العربية ماعدا مصر
    const co = {
        name: company.name || 'اسم الشركة',
        nameEn: company.nameEn || '',
        addrLines: formatAddressForInvoice(company.address, company.countryCode || 'EG'),
        phone: company.phone || '',
        email: company.email || '',
        tax: company.taxNumber || '',
        cr: company.commercialRegister || '',
        logo: company.logo || '',
        branch: company.branchName || '',
    };

    const title = TITLES[type];
    const titleEn = TITLES_EN[type];
    const prefix = PREFIXES[type];
    const isReturn = type.includes('return');
    const isSale = type === 'sale' || type === 'sale-return';
    const isTrading = company.businessType?.toUpperCase() === 'TRADING';

    const party = isSale ? (invoice.customer || null) : (invoice.supplier || null);
    const partyLabel = isSale ? 'العميل' : 'المورد';
    const partyLabelEn = isSale ? 'Customer' : 'Supplier';

    // Ensure lines is always an array and try to find it in common properties
    const rawLines = invoice.lines || invoice.InvoiceLine || invoice.items || [];
    const lines = Array.isArray(rawLines) ? rawLines : [];

    // Recalculate subtotal from lines to be sure
    const subtotal = lines.reduce((s: number, l: any) => s + Number(l.total || (Number(l.quantity || 0) * Number(l.price || 0)) || 0), 0);
    const discount = Number(invoice.discount || 0);
    const total = Number(invoice.total || subtotal - discount);
    const paid = Number(invoice.paidAmount || 0);
    const remaining = Math.max(0, total - paid);
    const partyBalance = options.partyBalance ?? null;

    const invoiceDate = new Date(invoice.date || new Date());
    const date = invoiceDate.toLocaleDateString('en-GB');
    const dateEn = '';
    const dateISO = invoiceDate.toISOString();

    const invoiceNum = String(invoice.invoiceNumber || 1).padStart(5, '0');

    // تحديد ما إذا كان النشاط خدمياً
    const isServicesLine = company.businessType?.toUpperCase() === 'SERVICES' || lines.some((l: any) => l.description || (l.item?.businessType?.toUpperCase() === 'SERVICES'));

    // ضريبة على مستوى الفاتورة
    const invoiceTaxRate = Number(invoice.taxRate || 0);
    const invoiceTaxAmount = Number(invoice.taxAmount || 0);
    const taxInclusive = invoice.taxInclusive || false;

    // ZATCA QR Code for Saudi Arabia
    const totalTaxAmount = invoiceTaxAmount > 0 ? invoiceTaxAmount
        : parseFloat(lines.reduce((acc: number, l: any) => acc + (Number(l.quantity || 0) * Number(l.price || 0) * invoiceTaxRate / 100), 0).toFixed(2));
    const zatcaQR = isSaudi ? generateZatcaTLV(
        co.name,
        co.tax || '000000000000000',
        dateISO,
        total.toFixed(2),
        totalTaxAmount.toFixed(2)
    ) : '';

    // Bilingual helper
    const bl = (ar: string, en: string) => isBilingual ? `${ar}<br><span style="font-size:100%;color:#555;font-family:sans-serif">${en}</span>` : ar;
    const blInline = (ar: string, en: string) => isBilingual ? `${ar} / <span style="font-size:100%;font-family:sans-serif">${en}</span>` : ar;

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>${title} - ${prefix}-${invoiceNum}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',sans-serif;color:#111;font-size:12px;background:#fff;direction:rtl}
.page{width:100%;min-height:100vh;margin:0 auto;padding:5mm 10mm;display:flex;flex-direction:column;gap:8px}

/* ── HEADER ── */
.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:2px solid #111;margin-bottom:0px}
.co-block{flex:1;text-align:right}
.co-name{font-size:18px;font-weight:900;color:#111;margin-bottom:2px}
.co-name-en{font-size:16px;font-weight:700;color:#555;margin-bottom:2px;font-family:sans-serif}
.co-line{font-size:10.5px;color:#444;line-height:1.5}
.header-center{flex:1;text-align:center}
.inv-title{font-size:20px;font-weight:900;color:#111;background:#f5f5f5;padding:4px 20px;border-radius:8px;display:inline-block;border:1.5px solid #ccc}
.inv-title-en{font-size:16px;font-weight:700;color:#555;margin-top:2px;font-family:sans-serif}
.inv-num{font-size:13px;color:#333;margin-top:4px;font-family:monospace;font-weight:700}
.logo-block{flex:1;text-align:left}
.logo-block img{max-height:70px;max-width:140px;object-fit:contain}

/* ── TABLES ── */
.info-section{border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.02);display:grid;grid-template-columns:1fr 1fr}
.info-col{padding:8px 12px}
.info-col:first-child{border-left:1px solid #e0e0e0}
.info-row{font-size:11.5px;margin-bottom:4px}
.ik{color:#777;min-width:90px;display:inline-block}
.iv{color:#111;font-weight:800}

table{width:100%;border-collapse:collapse;border:1.5px solid #333}
thead{background:#f0f0f0}
thead th{padding:6px 8px;font-size:11px;font-weight:900;color:#111;text-align:center;border:1.5px solid #333;line-height:1.4}
tbody td{padding:5px 8px;font-size:12px;color:#1a1a1a;text-align:center;border:1px solid #666;vertical-align:middle}
.item-name{font-weight:800;font-size:12px}

.bottom-wrap{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-top:10px}
.totals{min-width:280px;border:1.5px solid #333;border-radius:8px;overflow:hidden;background:#fff}
.t-row{display:flex;justify-content:space-between;padding:5px 12px;border-bottom:1px solid #444;font-size:11.5px}
.t-main{background:#f0f0f0;color:#111;font-weight:900;border-bottom:1px solid #333}
.t-subtotal{background:#f9fafb;color:#111;font-weight:700}

.footer{margin-top:auto;padding-top:10px;border-top:1px dashed #ccc}
.footer-inner{display:flex;justify-content:space-between;align-items:flex-end}
.sig-box{text-align:center;min-width:140px}
.sig-label{font-size:11px;font-weight:800;color:#333;margin-bottom:30px}
.sig-line{border-top:1px solid #111;padding-top:4px;font-size:11px;font-weight:800}
.qr-box{text-align:center;padding:4px}
.qr-box canvas{display:block;margin:0 auto}
.qr-label{font-size:10px;color:#666;margin-top:2px}
.en-sub{font-size:100%;color:#555;font-family:sans-serif}
</style>
</head>
<body>
<div class="page">
<div class="header">
    <div class="co-block">
        <div class="co-name">${co.name}</div>
        ${isBilingual && co.nameEn ? `<div class="co-name-en">${co.nameEn}</div>` : ''}
        ${co.addrLines.map(l => `<div class="co-line">${l}</div>`).join('')}
        ${co.phone ? `<div class="co-line">${co.phone}</div>` : ''}
        ${co.tax ? `<div class="co-line">${blInline('الرقم الضريبي', 'VAT No.')}: <strong>${co.tax}</strong></div>` : ''}
        ${co.cr ? `<div class="co-line">${blInline('السجل التجاري', 'C.R.')}: <strong>${co.cr}</strong></div>` : ''}
    </div>
    <div class="header-center">
        <div class="inv-title">${!isTrading || isServicesLine ? (isSale ? 'فاتورة خدمات' : 'فاتورة مشتريات خدمات') : title}</div>
        ${isBilingual ? `<div class="inv-title-en">${!isTrading || isServicesLine ? (isSale ? 'Service Invoice' : 'Purchase Service Invoice') : titleEn}</div>` : ''}
        ${isSaudi ? `<div style="font-size:10px;color:#888;margin-top:2px">فاتورة ضريبية مبسطة / Simplified Tax Invoice</div>` : ''}
        <div class="inv-num">${isServicesLine ? 'SRV' : prefix}-${invoiceNum}</div>
    </div>
    <div class="logo-block">
        ${co.logo ? `<img src="${co.logo}" alt=""/>` : ''}
    </div>
</div>

<div class="info-section">
    <div style="grid-column: span 2; background: #f8f9fa; padding: 6px 18px; border-bottom: 1px solid #e0e0e0; font-weight: 900; font-size: 11px">${blInline('بيانات الفاتورة', 'Invoice Details')}</div>
    <div class="info-col">
        <div class="info-row"><span class="ik">${blInline('بيانات ' + partyLabel, partyLabelEn + ' Info')}:</span><span class="iv">${party?.name || (isSale ? '— عميل نقدي' : '— مورد نقدي')}</span></div>
        ${party?.phone ? `<div class="info-row"><span class="ik">${blInline('الهاتف', 'Phone')}:</span><span class="iv">${party.phone}</span></div>` : ''}
        ${(() => { const lines = formatAddressForInvoice(party?.address, company.countryCode || 'EG'); return lines.map(l => `<div class="info-row"><span class="iv">${l}</span></div>`).join(''); })()}
    </div>
    <div class="info-col">
        <div class="info-row"><span class="ik">${blInline('رقم الفاتورة', 'Invoice No.')}:</span><span class="iv">${isServicesLine ? 'SRV' : prefix}-${invoiceNum}</span></div>
        <div class="info-row"><span class="ik">${blInline('التاريخ', 'Date')}:</span><span class="iv">${date}</span></div>
        ${invoice.dueDate ? `<div class="info-row"><span class="ik">${blInline('تاريخ الاستحقاق', 'Due Date')}:</span><span class="iv">${new Date(invoice.dueDate).toLocaleDateString('en-GB')}</span></div>` : ''}
        ${party?.taxNumber ? `<div class="info-row"><span class="ik">${blInline('الرقم الضريبي', 'VAT No.')}:</span><span class="iv">${party.taxNumber}</span></div>` : ''}
        ${party?.commercialRegister ? `<div class="info-row"><span class="ik">${blInline('السجل التجاري', 'C.R.')}:</span><span class="iv">${party.commercialRegister}</span></div>` : ''}
    </div>
</div>

<table>
    <thead>
        <tr>
            <th style="width:5%">${bl('م', '#')}</th>
            <th style="width:45%;text-align:right">${isServicesLine ? bl('الخدمة / الوصف', 'Service / Description') : bl('الصنف', 'Item')}</th>
            ${!isServicesLine ? `<th style="width:10%">${bl('الوحدة', 'Unit')}</th>` : ''}
            <th style="width:10%">${bl('الكمية', 'Qty')}</th>
            <th style="width:10%">${bl('السعر', 'Price')}</th>
            ${invoiceTaxRate > 0 ? `
                <th style="width:8%">${bl('نسبة الضريبة', 'Tax %')}</th>
                <th style="width:10%">${bl('قيمة الضريبة', 'Tax Amt')}</th>
            ` : ''}
            <th style="width:10%">${bl('الإجمالي', 'Total')}</th>
        </tr>
    </thead>
    <tbody>
        ${lines.length === 0 ? '<tr><td colspan="10" style="padding:20px;color:#999">لا توجد بنود في هذه الفاتورة</td></tr>' : lines.map((l: any, i: number) => {
        const unit = l.item?.unit?.name || l.unit?.name || l.unit || '—';
        const name = l.item?.name || l.itemName || l.name || 'صنف غير معروف';
        const desc = l.description || '';
        const qty = Number(l.quantity || 0);
        const price = Number(l.price || 0);
        const lineBase = qty * price;
        // per-line tax: use line's own taxAmount if set, otherwise distribute invoice tax rate
        const lineTaxRate = Number(l.taxRate || 0) || invoiceTaxRate;
        const lineTaxAmount = Number(l.taxAmount || 0) || (taxInclusive ? 0 : parseFloat((lineBase * lineTaxRate / 100).toFixed(2)));
        const lineTotal = taxInclusive ? lineBase : lineBase + lineTaxAmount;

        return `<tr>
                <td>${i + 1}</td>
                <td style="text-align:right">
                    <div class="item-name">${name}</div>
                    ${desc ? `<div style="font-size:11px;color:#444;margin-top:2px;font-weight:700">${desc}</div>` : ''}
                </td>
                ${!isServicesLine ? `<td>${unit}</td>` : ''}
                <td><strong>${qty.toLocaleString()}</strong></td>
                <td>${price.toLocaleString()} ${sym}</td>
                ${invoiceTaxRate > 0 ? `
                    <td>${lineTaxRate}%</td>
                    <td>${lineTaxAmount.toLocaleString()} ${sym}</td>
                ` : ''}
                <td><strong>${lineTotal.toLocaleString()} ${sym}</strong></td>
            </tr>`;
    }).join('')}
    </tbody>
</table>

<div class="bottom-wrap">
    <div style="flex:1">
        ${invoice.notes ? `
        <div style="border:1.5px solid #ccc;padding:10px;font-size:11px;color:#555;border-radius:8px;margin-top:10px">
            <strong>${blInline('ملاحظات', 'Notes')}: </strong>${invoice.notes}
        </div>` : ''}
        ${isSaudi ? `<div class="qr-box" style="margin-top:12px">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(zatcaQR)}" style="width:120px;height:120px;margin:0 auto;display:block;" alt="ZATCA QR" />
            <div class="qr-label">${blInline('رمز الفاتورة الضريبية', 'Tax Invoice QR Code')}</div>
        </div>` : ''}
    </div>
    
    <div class="totals">
        ${(discount > 0 || lines.some((l: any) => (l.taxAmount || 0) > 0)) ? `
        <div class="t-row">
            <span>${bl('الإجمالي (قبل الخصم)', 'Subtotal')}</span>
            <span>${subtotal.toLocaleString()} ${sym}</span>
        </div>` : ''}
        
        ${discount > 0 ? `
        <div class="t-row">
            <span>${bl('الخصم', 'Discount')}</span>
            <span>-${discount.toLocaleString()} ${sym}</span>
        </div>` : ''}

        ${invoiceTaxAmount > 0 || (invoiceTaxRate > 0 && !taxInclusive) ? (() => {
            const displayTax = invoiceTaxAmount > 0 ? invoiceTaxAmount
                : parseFloat(lines.reduce((acc: number, l: any) => acc + (Number(l.quantity || 0) * Number(l.price || 0) * invoiceTaxRate / 100), 0).toFixed(2));
            return `
        <div class="t-row" style="background:#fffbe6;font-weight:800">
            <span>${bl('إجمالي الضريبة', 'Total VAT')} (${invoiceTaxRate}%)</span>
            <span>${displayTax.toLocaleString()} ${sym}</span>
        </div>`;
        })() : ''}

        ${partyBalance !== null ? (() => {
            const currentTransaction = isSale ? (total - paid) : (paid - total);
            const oldBalance = Number(partyBalance) - currentTransaction;
            const formatBal = (val: number) => {
                const abs = Math.abs(val).toLocaleString();
                const suffix = isSale
                    ? (val > 0 ? ' (عليه)' : val < 0 ? ' (له)' : '')
                    : (val < 0 ? ' (له)' : val > 0 ? ' (لنا)' : '');
                return `${abs} ${sym}${suffix}`;
            };
            return `
            <div class="t-row t-subtotal">
                <span>${bl('الرصيد السابق لـ ' + partyLabel, 'Previous Balance')}</span>
                <span>${formatBal(oldBalance)}</span>
            </div>`;
        })() : ''}

        <div class="t-main t-row">
            <span>${bl('صافي هذه الفاتورة', 'Net Invoice')}</span>
            <span>${total.toLocaleString()} ${sym}</span>
        </div>
        <div class="t-row">
            <span>${bl('المبلغ المدفوع حالياً', 'Amount Paid')}</span>
            <span>${paid.toLocaleString()} ${sym}</span>
        </div>
        <div class="t-row">
            <span>${bl('متبقي من هذه الفاتورة', 'Remaining')}</span>
            <span>${remaining.toLocaleString()} ${sym}</span>
        </div>

        ${partyBalance !== null ? (() => {
            const formatBal = (val: number) => {
                const abs = Math.abs(val).toLocaleString();
                const suffix = isSale
                    ? (val > 0 ? ' (عليه)' : val < 0 ? ' (له)' : '')
                    : (val < 0 ? ' (له)' : val > 0 ? ' (لنا)' : '');
                return `${abs} ${sym}${suffix}`;
            };
            return `
            <div class="t-row t-main" style="border-top: 1.5px solid #888; border-bottom: none">
                <span>${bl('إجمالي رصيد ' + partyLabel + ' نهائياً', 'Total ' + partyLabelEn + ' Balance')}</span>
                <span>${formatBal(Number(partyBalance))}</span>
            </div>`;
        })() : ''}
    </div>
</div>

<div class="footer">
    <div class="footer-inner">
        <div class="sig-box">
            <div class="sig-label">${bl('توقيع ' + partyLabel, partyLabelEn + ' Signature')}</div>
            <div class="sig-line">${bl('الاسم والتوقيع', 'Name & Signature')}</div>
        </div>
        <div style="text-align:center;font-size:10px;color:#666">
            ${blInline('شكراً لتعاملكم معنا', 'Thank you for your business')}
        </div>
        <div class="sig-box">
            <div class="sig-label">${bl('توقيع المسؤول', 'Authorized Signature')}</div>
            <div class="sig-line">${bl('الختم والتوقيع', 'Stamp & Signature')}</div>
        </div>
    </div>
</div>
</div>
${isSaudi ? `
<script>
window.onload = () => { setTimeout(() => window.print(), 500); };
</script>` : '<script>window.onload=()=>setTimeout(()=>window.print(),400);</script>'}
</body>
</html>`;

    return html;
}

// ── Print (opens new tab + auto-print) ──────────────────────────────────────
export function printA4Invoice(
    invoice: any,
    type: InvoiceType,
    company: CompanyInfo = {},
    options: { terms?: string; showSignature?: boolean; showStamp?: boolean; partyBalance?: number } = {}
) {
    const html = generateA4HTML(invoice, type, company, options);
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
}


function generateThermalVoucherHTML(voucher: any, type: VoucherType, company: CompanyInfo = {}): string {
    const sym = getCurrencySymbol(company.currency || 'EGP');
    const isReceipt = type === 'receipt';
    const title = isReceipt ? 'سند قبض' : 'سند صرف';
    const titleEn = isReceipt ? 'Receipt Voucher' : 'Payment Voucher';
    const vNum = String(voucher.voucherNumber || 1).padStart(5, '0');
    const date = new Date(voucher.date || new Date()).toLocaleDateString('en-GB');
    const amount = Number(voucher.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const partyName = voucher.customer?.name || voucher.supplier?.name || '—';
    const treasuryName = voucher.treasury?.name || '';
    const paymentType = voucher.paymentType === 'bank' ? 'تحويل بنكي' : 'نقداً';
    const coName = company.name || '';
    const coPhone = company.phone || '';

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Cairo',sans-serif; background:#fff; color:#111; width:80mm; padding:6mm; }
  .header { text-align:center; border-bottom:2px solid #111; padding-bottom:8px; margin-bottom:8px; }
  .co-name { font-size:15px; font-weight:800; }
  .co-phone { font-size:11px; color:#555; margin-top:2px; }
  .title { font-size:16px; font-weight:800; margin:8px 0 2px; text-align:center; }
  .title-en { font-size:11px; color:#666; text-align:center; margin-bottom:8px; }
  .vnum { font-size:12px; font-weight:700; color:#333; text-align:center; margin-bottom:8px; }
  .row { display:flex; justify-content:space-between; font-size:12px; padding:5px 0; border-bottom:1px dashed #ccc; }
  .row .label { color:#555; }
  .row .value { font-weight:700; }
  .amount-row { font-size:16px; font-weight:800; padding:10px 0; text-align:center; border-top:2px solid #111; margin-top:6px; }
  .footer { text-align:center; font-size:10px; color:#888; margin-top:10px; padding-top:6px; border-top:1px dashed #ccc; }
  @media print { @page { size:80mm auto; margin:0; } body { width:80mm; } }
</style>
</head>
<body>
  <div class="header">
    ${coName ? `<div class="co-name">${coName}</div>` : ''}
    ${coPhone ? `<div class="co-phone">${coPhone}</div>` : ''}
  </div>
  <div class="title">${title}</div>
  <div class="title-en">${titleEn}</div>
  <div class="vnum">#${vNum} — ${date}</div>
  <div class="row"><span class="label">${isReceipt ? 'استلمنا من' : 'صرفنا لـ'}</span><span class="value">${partyName}</span></div>
  ${treasuryName ? `<div class="row"><span class="label">الخزينة</span><span class="value">${treasuryName}</span></div>` : ''}
  <div class="row"><span class="label">طريقة الدفع</span><span class="value">${paymentType}</span></div>
  ${voucher.description ? `<div class="row"><span class="label">البيان</span><span class="value">${voucher.description}</span></div>` : ''}
  <div class="amount-row">${amount} ${sym}</div>
  <div class="footer">شكراً لتعاملكم معنا</div>
<script>window.onload=()=>setTimeout(()=>window.print(),400);</script>
</body>
</html>`;
}

export function printThermalVoucher(voucher: any, type: VoucherType, company: CompanyInfo = {}) {
    const html = generateThermalVoucherHTML(voucher, type, company);
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
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
    } = {}
) {
    const sym = getCurrencySymbol(company.currency || 'EGP');
    const country = (company.countryCode || 'EG').toUpperCase();
    const isBilingual = country !== 'EG';
    
    const co = {
        name: company.name || 'اسم الشركة',
        nameEn: company.nameEn || '',
        addrLines: formatAddressForInvoice(company.address, company.countryCode || 'EG'),
        phone: company.phone || '',
        email: company.email || '',
        tax: company.taxNumber || '',
        cr: company.commercialRegister || '',
        logo: company.logo || '',
        branch: company.branchName || '',
    };

    const title = 'عرض سعر';
    const titleEn = 'Price Quotation';
    const lines = quotation.lines || [];
    const subtotal = Number(quotation.subtotal || 0);
    const taxAmt = Number(quotation.taxAmount || 0);
    const total = Number(quotation.total || subtotal + taxAmt);
    const date = new Date(quotation.date || new Date()).toLocaleDateString('en-GB');
    const quoNum = String(quotation.quotationNumber || 1).padStart(5, '0');

    const bl = (ar: string, en: string) => isBilingual ? `${ar}<br><span style="font-size:100%;color:#555;font-family:sans-serif">${en}</span>` : ar;
    const blInline = (ar: string, en: string) => isBilingual ? `${ar} / <span style="font-size:100%;font-family:sans-serif">${en}</span>` : ar;

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>عرض سعر - ${quoNum}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',sans-serif;color:#111;font-size:12px;background:#fff;direction:rtl}
.page{width:100%;min-height:100vh;margin:0 auto;padding:5mm 10mm;display:flex;flex-direction:column;gap:8px}
.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:2px solid #111;margin-bottom:0px}
.co-block{flex:1;text-align:right}
.co-name{font-size:18px;font-weight:900;color:#111;margin-bottom:2px}
.co-name-en{font-size:16px;font-weight:700;color:#555;margin-bottom:2px;font-family:sans-serif}
.co-line{font-size:10.5px;color:#444;line-height:1.5}
.header-center{flex:1;text-align:center}
.inv-title{font-size:20px;font-weight:900;color:#111;background:#f5f5f5;padding:4px 20px;border-radius:8px;display:inline-block;border:1.5px solid #ccc}
.inv-title-en{font-size:16px;font-weight:700;color:#555;margin-top:2px;font-family:sans-serif}
.inv-num{font-size:13px;color:#333;margin-top:4px;font-family:monospace;font-weight:700}
.logo-block{flex:1;text-align:left}
.logo-block img{max-height:70px;max-width:140px;object-fit:contain}
.info-section{border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-top:10px;display:grid;grid-template-columns:1fr 1fr}
.info-col{padding:8px 12px}
.info-col:first-child{border-left:1px solid #e0e0e0}
.info-row{font-size:11.5px;margin-bottom:4px}
.ik{color:#777;min-width:90px;display:inline-block}
.iv{color:#111;font-weight:800}
table{width:100%;border-collapse:collapse;border:1.5px solid #333;margin-top:10px}
thead{background:#f0f0f0}
thead th{padding:6px 8px;font-size:11px;font-weight:900;color:#111;text-align:center;border:1.5px solid #333}
tbody td{padding:5px 8px;font-size:12px;color:#1a1a1a;text-align:center;border:1px solid #666;vertical-align:middle}
.summary-wrap{display:flex;justify-content:flex-end;margin-top:10px}
.totals{min-width:280px;border:1.5px solid #333;border-radius:8px;overflow:hidden}
.t-row{display:flex;justify-content:space-between;padding:5px 12px;border-bottom:1px solid #444;font-size:11.5px}
.t-main{background:#f0f0f0;color:#111;font-weight:900;border-bottom:1px solid #333}
.notes{margin-top:15px;padding:12px;border:1px dashed #ccc;border-radius:8px;font-size:11px}
.footer{margin-top:auto;padding-top:10px;text-align:center;font-size:10px;color:#666}
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="co-block">
            <div class="co-name">${co.name}</div>
            ${isBilingual && co.nameEn ? `<div class="co-name-en">${co.nameEn}</div>` : ''}
            ${co.addrLines.map(l => `<div class="co-line">${l}</div>`).join('')}
            ${co.phone ? `<div class="co-line">${co.phone}</div>` : ''}
            ${co.tax ? `<div class="co-line">${blInline('الرقم الضريبي', 'VAT No.')}: <strong>${co.tax}</strong></div>` : ''}
        </div>
        <div class="header-center">
            <div class="inv-title">${title}</div>
            ${isBilingual ? `<div class="inv-title-en">${titleEn}</div>` : ''}
            <div class="inv-num">QUO-${quoNum}</div>
        </div>
        <div class="logo-block">
            ${co.logo ? `<img src="${co.logo}" alt=""/>` : ''}
        </div>
    </div>

    <div class="info-section">
        <div class="info-col">
            <div class="info-row"><span class="ik">${blInline('العميل', 'Customer')}:</span><span class="iv">${quotation.customer?.name || 'عميل نقدي'}</span></div>
            <div class="info-row"><span class="ik">${blInline('الهاتف', 'Phone')}:</span><span class="iv">${quotation.customer?.phone || '—'}</span></div>
        </div>
        <div class="info-col">
            <div class="info-row"><span class="ik">${blInline('تاريخ العرض', 'Quo. Date')}:</span><span class="iv">${date}</span></div>
            <div class="info-row"><span class="ik">${blInline('رقم العرض', 'Quo. No.')}:</span><span class="iv">QUO-${quoNum}</span></div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:5%">${bl('م', '#')}</th>
                <th style="width:50%;text-align:right">${company.businessType?.toUpperCase() === 'SERVICES' ? bl('الخدمة', 'Service') : bl('الصنف', 'Item')}</th>
                <th style="width:10%">${bl('الكمية', 'Qty')}</th>
                <th style="width:15%">${bl('السعر', 'Price')}</th>
                <th style="width:20%">${bl('الإجمالي', 'Total')}</th>
            </tr>
        </thead>
        <tbody>
            ${lines.map((l: any, i: number) => `
            <tr>
                <td>${i + 1}</td>
                <td style="text-align:right">
                    <div style="font-weight:800">${l.item?.name || l.itemName || ''}</div>
                    ${l.description ? `<div style="font-size:10px;color:#444;margin-top:2px">${l.description}</div>` : ''}
                </td>
                <td><strong>${l.quantity}</strong></td>
                <td>${Number(l.price).toLocaleString()} ${sym}</td>
                <td><strong>${Number(l.total).toLocaleString()} ${sym}</strong></td>
            </tr>`).join('')}
        </tbody>
    </table>

    <div class="summary-wrap">
        <div class="totals">
            <div class="t-row">
                <span>${blInline('المجموع الفرعي', 'Subtotal')}:</span>
                <span>${subtotal.toLocaleString()} ${sym}</span>
            </div>
            ${Number(quotation.discount || 0) > 0 ? `
            <div class="t-row">
                <span>${blInline('الخصم', 'Discount')}:</span>
                <span>${Number(quotation.discount).toLocaleString()} ${sym}</span>
            </div>` : ''}
            ${taxAmt > 0 ? `
            <div class="t-row">
                <span>${blInline('الضريبة', 'VAT')} (${quotation.taxRate}%):</span>
                <span>${taxAmt.toLocaleString()} ${sym}</span>
            </div>` : ''}
            <div class="t-row t-main">
                <span>${blInline('الإجمالي النهائي', 'Total')}:</span>
                <span>${total.toLocaleString()} ${sym}</span>
            </div>
        </div>
    </div>

    ${options.terms || quotation.notes ? `
    <div class="notes">
        <div style="font-weight:800;text-decoration:underline;margin-bottom:8px">${blInline('ملاحظات وشروط إضافية', 'Additional Terms')}:</div>
        <div>${options.terms || quotation.notes}</div>
    </div>` : ''}

    <div style="margin-top: 40px; display: flex; justify-content: space-between; padding: 0 40px">
        <div style="text-align: center">
            <div style="font-size:11px; font-weight: 800; margin-bottom: 40px">${blInline('ختم الشركة', 'Company Stamp')}</div>
            <div style="width: 100px; height: 1px; border-bottom: 2px solid #eee"></div>
        </div>
        <div style="text-align: center">
            <div style="font-size:11px; font-weight: 800; margin-bottom: 40px">${blInline('توقيع المسؤول', 'Authorized Signature')}</div>
            <div style="width: 100px; height: 1px; border-bottom: 2px solid #eee"></div>
        </div>
    </div>

    <div class="footer">
        هذا المستند يعتبر عرض سعر أولي وغير ملزم للطرفين إلا بعد تحويله لفاتورة رسمية أو عقد معتمد.
    </div>
</div>
<script>
    window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };
</script>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (printWin) {
        printWin.document.write(html);
        printWin.document.close();
    }
}
