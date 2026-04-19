import { getCurrencySymbol } from './currency';


export interface CompanyInfo {
    name?: string;
    nameEn?: string;
    phone?: string;
    email?: string;
    taxNumber?: string;
    commercialRegister?: string;
    addressRegion?: string;
    addressCity?: string;
    addressDistrict?: string;
    addressStreet?: string;
    website?: string;
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
export function generateA4HTML(
    invoice: any,
    type: InvoiceType,
    company: CompanyInfo = {},
    options: {
        terms?: string;
        showSignature?: boolean;
        showStamp?: boolean;
        partyBalance?: number;
        forDownload?: boolean; // إذا true لا يتم تشغيل window.print تلقائياً
        noAutoPrint?: boolean; // لصفحات الطباعة المستقلة
    } = {}
): string {
    const sym = getCurrencySymbol(company.currency || 'EGP');
    const country = (company.countryCode || 'EG').toUpperCase();
    const isSaudi = country === 'SA';
    const isBilingual = country !== 'EG'; // كل الدول العربية ماعدا مصر
    const addrLabels = {
        region:   isBilingual ? 'المنطقة / Region'  : 'المنطقة',
        city:     isBilingual ? 'المدينة / City'     : 'المدينة',
        district: isBilingual ? 'الحي / District'    : 'الحي',
        street:   isBilingual ? 'الشارع / Street'    : 'الشارع',
    };
    const co = {
        name: company.name || 'اسم الشركة',
        nameEn: company.nameEn || '',
        addrLines: [
            company.addressRegion   ? { label: addrLabels.region,   value: company.addressRegion }   : null,
            company.addressCity     ? { label: addrLabels.city,     value: company.addressCity }     : null,
            company.addressDistrict ? { label: addrLabels.district, value: company.addressDistrict } : null,
            company.addressStreet   ? { label: addrLabels.street,   value: company.addressStreet }   : null,
        ].filter(Boolean) as { label: string; value: string }[],
        phone: company.phone || '',
        email: company.email || '',
        tax: company.taxNumber || '',
        cr: company.commercialRegister || '',
        website: company.website || '',
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

    const tableStyle = 'bordered'; // Hardcoded default
    const tableBorder = '1.5px solid #333';
    const cellBorder = '1px solid #666';
    const rowBorder = 'none';

    const isA5 = false; // Default A4
    const paperW = '210mm';
    const paperH = 'auto';

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>${title} - ${prefix}-${invoiceNum} (v2)</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root {
    --base-font: ${isA5 ? '9px' : '11px'};
    --header-name: ${isA5 ? '16px' : '21px'};
    --title-font: ${isA5 ? '13px' : '17px'};
    --logo-h: ${isA5 ? '45px' : '75px'};
    --page-padding: ${isA5 ? '3mm 5mm' : '4mm 8mm'};
}
body{font-family:'Cairo',sans-serif;color:#111;font-size:var(--base-font);background:#fff;direction:rtl}
.page{width:100%; max-width: 850px; min-height: ${paperH}; margin:0 auto;padding:var(--page-padding);display:flex;flex-direction:column;gap:${isA5 ? '3px' : '5px'}; background: #fff;}
@media print {
    @page { 
        size: ${isA5 ? 'A5 portrait' : 'A4 portrait'}; 
        margin: 5mm; 
    }
    body { background: #fff; -webkit-print-color-adjust: exact; }
    .page { 
        box-shadow: none; 
        margin: 0; 
        width: 100% !important; 
        max-width: none !important; 
        padding: 0 !important;
        min-height: auto !important;
    }
}

/* ── HEADER ── */
.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;border-bottom:2px solid #111;margin-bottom:0px}
.co-block{flex:1;text-align:right}
.co-name{font-size:var(--header-name);font-weight:900;color:#111;margin-bottom:1px}
.co-name-en{font-size:${isA5 ? '11px' : '13px'};font-weight:700;color:#555;margin-bottom:1px;font-family:sans-serif}
.co-line{font-size:${isA5 ? '8.5px' : '9.5px'};color:#444;line-height:1.4}
.header-center{flex:1;text-align:center}
.inv-title{font-size:var(--title-font);font-weight:900;color:#111;background:#f5f5f5;padding:2px 14px;border-radius:6px;display:inline-block;border:1px solid #ccc}
.inv-title-en{font-size:${isA5 ? '9px' : '11px'};font-weight:700;color:#555;margin-top:1px;font-family:sans-serif}
.inv-num{font-size:${isA5 ? '9.5px' : '11px'};color:#333;margin-top:2px;font-family:monospace;font-weight:700}
.logo-block{flex:1;text-align:left}
.logo-block img{max-height:var(--logo-h);max-width:130px;object-fit:contain}

/* ── TABLES ── */
.info-wrap{display:flex;gap:${isA5 ? '6px' : '10px'};margin-top:${isA5 ? '3px' : '8px'}}
.info-box{flex:1;border:1px solid #333;border-radius:6px;overflow:hidden;background:#fff}
.info-title{background:#f0f0f0;padding:${isA5 ? '2px 8px' : '5px 10px'};font-weight:900;font-size:${isA5 ? '9.5px' : '10.5px'};border-bottom:1px solid #333}
.info-body{padding:${isA5 ? '3px 8px' : '6px 10px'}}
.info-row{font-size:${isA5 ? '9px' : '10.5px'};margin-bottom:${isA5 ? '1px' : '3px'};display:flex;gap:4px}
.ik{color:#666;min-width:${isA5 ? '60px' : '80px'};flex-shrink:0}
.iv{color:#111;font-weight:800}

table{width:100%;border-collapse:collapse;border:${tableBorder}}
thead{background:#f0f0f0; color: #111;}
thead th{padding:${isA5 ? '2px 3px' : '4px 3px'};font-size:${isA5 ? '8.5px' : '10px'};font-weight:900;color:#111;text-align:center;border:${tableBorder};line-height:1.1;white-space:nowrap}
tbody td{padding:${isA5 ? '2px 3px' : '3px 4px'};font-size:${isA5 ? '8.5px' : '10px'};color:#1a1a1a;text-align:center;border-left:${cellBorder};border-right:${cellBorder};vertical-align:middle;white-space:nowrap}
tbody tr{border-bottom:${rowBorder}; background: #fff;}
tbody tr:nth-child(even){background: #fff;}
.item-name{font-weight:800;font-size:10px}

.bottom-wrap{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;margin-top:3px}
.totals{min-width:${isA5 ? '180px' : '260px'};border:1px solid #333;border-radius:6px;overflow:hidden;background:#fff}
.t-row{display:flex;justify-content:space-between;padding:${isA5 ? '2px 6px' : '4px 10px'};border-bottom:1px solid #ddd;font-size:${isA5 ? '8.5px' : '10px'}}
.t-main{background:#f0f0f0;color:#111;font-weight:900;border-bottom:1px solid #333;font-size:${isA5 ? '10px' : '12px'}}
.t-subtotal{background:#f9fafb;color:#111;font-weight:700}

.footer{margin-top:5px;padding-top:4px;border-top:1px dashed #ccc}
.footer-inner{display:flex;justify-content:space-between;align-items:flex-end}
.sig-box{text-align:center;min-width:${isA5 ? '100px' : '130px'}}
.sig-label{font-size:${isA5 ? '8.5px' : '9.5px'};font-weight:800;color:#333;margin-bottom:${isA5 ? '15px' : '22px'}}
.sig-line{border-top:1px solid #111;padding-top:2px;font-size:${isA5 ? '8.5px' : '9.5px'};font-weight:800}
.qr-box{text-align:center;padding:4px}
.qr-box canvas{display:block;margin:0 auto}
.qr-label{font-size:10px;color:#666;margin-top:2px}
.en-sub{font-size:100%;color:#555;font-family:sans-serif}
@media screen{.page{min-height:100vh}}
</style>
</head>
<body>
<div class="page">
<div class="header">
    <div class="logo-block" style="flex:1.2; text-align:right">
        ${isSaudi 
            ? (co.logo ? `<img src="${co.logo}" style="max-height:80px; max-width:150px; object-fit:contain" alt=""/>` : `<span style="font-size:16px;font-weight:900;">${co.name}</span>`)
            : (country === 'EG' 
                ? `<div style="text-align:right;">
                     <div style="font-size:22px; font-weight:900; color:#000;">${co.name}</div>
                     <div style="font-size:13px; color:#333; margin-top:4px; font-weight:700;">${co.addrLines.map(a => a.value).join(' - ')}</div>
                     ${co.phone ? `<div style="font-size:11px; color:#555; margin-top:2px;">الهاتف: ${co.phone}</div>` : ''}
                     ${co.tax ? `<div style="font-size:11px; color:#555;">رقم ضريبي: ${co.tax}</div>` : ''}
                     ${co.cr ? `<div style="font-size:11px; color:#555;">سجل تجاري: ${co.cr}</div>` : ''}
                   </div>`
                : `<div style="font-size:16px; font-weight:900; margin-bottom:4px; color:#111;">${co.name}</div>
                   <div style="font-size:11px; color:#444; margin-bottom:2px;">${co.addrLines.map(a => a.value).join(' - ')}</div>
                   <div style="font-size:11px; color:#444;">
                      ${co.phone ? `الهاتف: &rlm;${co.phone}` : ''}
                      ${co.tax ? ` ${co.phone ? '| ' : ''}رقم ضريبي: &rlm;${co.tax}` : ''}
                      ${co.cr ? ` ${(co.phone || co.tax) ? '| ' : ''}سجل تجاري: &rlm;${co.cr}` : ''}
                   </div>`
              )
        }
    </div>
    <div class="header-center" style="flex:1; text-align:center">
        <div class="inv-title">${!isTrading || isServicesLine ? (isSale ? 'فاتورة خدمات' : 'فاتورة مشتريات خدمات') : title}</div>
        ${isBilingual ? `<div class="inv-title-en">${!isTrading || isServicesLine ? (isSale ? 'Service Invoice' : 'Purchase Service Invoice') : titleEn}</div>` : ''}
        ${isSaudi ? `<div style="font-size:10px;color:#888;margin-top:2px">فاتورة ضريبية مبسطة / Simplified Tax Invoice</div>` : ''}
        <div class="inv-num" style="margin-top:6px; font-size:13px;">${isServicesLine ? 'SRV' : prefix}-${invoiceNum}</div>
        <div style="font-size:11px; color:#555; margin-top:2px;">${date}</div>
    </div>
    <div class="co-block" style="flex:1.2; text-align:left">
        ${isSaudi 
            ? `<img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(zatcaQR)}" style="width:80px;height:80px;display:inline-block;" alt="ZATCA QR" />`
            : (co.logo ? `<img src="${co.logo}" style="max-height:80px; max-width:150px; object-fit:contain" alt=""/>` : '')
        }
    </div>
</div>

<div class="info-wrap">
    <!-- بيانات البائع -->
    ${isSaudi ? `
    <div class="info-box">
        <div class="info-title">${blInline('بيانات البائع', 'Seller Info')}</div>
        <div class="info-body">
            <div class="info-row"><span class="ik">${blInline('الشركة', 'Company')}:</span><span class="iv">${co.name}${co.nameEn ? ` / ${co.nameEn}` : ''}</span></div>
            ${isBilingual
                ? co.addrLines.map(a => `<div class="info-row"><span class="ik">${a.label}:</span><span class="iv">${a.value}</span></div>`).join('')
                : co.addrLines.length > 0 ? `<div class="info-row"><span class="ik">العنوان:</span><span class="iv">${co.addrLines.map(a => a.value).join('، ')}</span></div>` : ''
            }
            ${co.phone ? `<div class="info-row"><span class="ik">${blInline('الهاتف', 'Phone')}:</span><span class="iv">&rlm;${co.phone}</span></div>` : ''}
            ${co.tax ? `<div class="info-row"><span class="ik">${blInline('الرقم الضريبي', 'VAT No')}:</span><span class="iv">&rlm;${co.tax}</span></div>` : ''}
            ${co.cr ? `<div class="info-row"><span class="ik">${blInline('السجل التجاري', 'C.R')}:</span><span class="iv">&rlm;${co.cr}</span></div>` : ''}
        </div>
    </div>
    ` : ''}

    <!-- بيانات الطرف -->
    <div class="info-box">
        <div class="info-title">${blInline('بيانات ' + partyLabel, partyLabelEn + ' Info')}</div>
        <div class="info-body">
            <div class="info-row"><span class="ik">${blInline(partyLabel, partyLabelEn)}:</span><span class="iv">${party?.name || (isSale ? '— عميل نقدي' : '— مورد نقدي')}</span></div>
            ${party?.phone ? `<div class="info-row"><span class="ik">${blInline('الهاتف', 'Phone')}:</span><span class="iv">${party.phone}</span></div>` : ''}
            ${(() => {
                const parts = [party?.addressRegion, party?.addressCity, party?.addressDistrict, party?.addressStreet].filter(Boolean) as string[];
                if (!parts.length) return '';
                if (!isBilingual) return `<div class="info-row"><span class="ik">العنوان:</span><span class="iv">${parts.join('، ')}</span></div>`;
                return ([
                    party?.addressRegion   ? { label: blInline('المنطقة','Region'),   value: party.addressRegion }   : null,
                    party?.addressCity     ? { label: blInline('المدينة','City'),      value: party.addressCity }     : null,
                    party?.addressDistrict ? { label: blInline('الحي','District'),     value: party.addressDistrict } : null,
                    party?.addressStreet   ? { label: blInline('الشارع','Street'),     value: party.addressStreet }   : null,
                ].filter(Boolean) as {label:string;value:string}[]).map(a => `<div class="info-row"><span class="ik">${a.label}:</span><span class="iv">${a.value}</span></div>`).join('');
            })()}
            ${party?.taxNumber ? `<div class="info-row"><span class="ik">${blInline('الرقم الضريبي', 'VAT No.')}:</span><span class="iv">${party.taxNumber}</span></div>` : ''}
            ${party?.commercialRegister ? `<div class="info-row"><span class="ik">${blInline('السجل التجاري', 'C.R.')}:</span><span class="iv">${party.commercialRegister}</span></div>` : ''}
        </div>
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
            ` : ''}
            ${invoiceTaxRate > 0 ? `
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
                <td><strong>${qty.toLocaleString('en-US')}</strong></td>
                <td>${price.toLocaleString('en-US')} ${sym}</td>
                ${invoiceTaxRate > 0 ? `
                    <td>${lineTaxRate}%</td>
                ` : ''}
                ${invoiceTaxRate > 0 ? `
                    <td>${lineTaxAmount.toLocaleString('en-US')} ${sym}</td>
                ` : ''}
                <td><strong>${lineTotal.toLocaleString('en-US')} ${sym}</strong></td>
            </tr>`;
    }).join('')}
    </tbody>
</table>

<div class="bottom-wrap" style="flex-direction: column; gap: 0;">
    ${(() => {
        const cleanNotes = (invoice.notes || '').replace(/\(تم التحويل من عرض سعر رقم: \d+\)/g, '').trim();
        if (!cleanNotes) return '';
        return `
    <div style="border:1.5px solid #ccc;padding:10px;font-size:11px;color:#555;border-radius:8px;margin-bottom:10px; width:100%">
        <strong>${blInline('ملاحظات', 'Notes')}: </strong>${cleanNotes}
    </div>`;
    })()}
    
    <!-- Totals Table -->
    ${isSaudi ? `
    <table style="width:100%; border-collapse:collapse; margin-top:10px; border: 1.5px solid #333;">
        <tbody>
            <tr>
                <td style="width:40%; text-align:right; font-weight:700; border: 1px solid #ccc; padding: 6px;">الإجمالي غير شامل الضريبة</td>
                <td style="width:20%; text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px;">${subtotal.toLocaleString('en-US')} ${sym}</td>
                <td style="width:40%; text-align:left; color:#555; border: 1px solid #ccc; padding: 6px;">Total (Excluding VAT)</td>
            </tr>
            <tr>
                <td style="text-align:right; font-weight:700; border: 1px solid #ccc; padding: 6px;">مجموع الخصومات</td>
                <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px;">${discount.toLocaleString('en-US')} ${sym}</td>
                <td style="text-align:left; color:#555; border: 1px solid #ccc; padding: 6px;">Total Discounts</td>
            </tr>
            <tr>
                <td style="text-align:right; font-weight:700; border: 1px solid #ccc; padding: 6px;">الإجمالي الخاضع للضريبة</td>
                <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px;">${(subtotal - discount).toLocaleString('en-US')} ${sym}</td>
                <td style="text-align:left; color:#555; border: 1px solid #ccc; padding: 6px;">Total Taxable Amount</td>
            </tr>
            ${(() => {
                const displayTax = invoiceTaxAmount > 0 ? invoiceTaxAmount
                    : parseFloat(lines.reduce((acc: number, l: any) => acc + (Number(l.quantity || 0) * Number(l.price || 0) * invoiceTaxRate / 100), 0).toFixed(2));
                return `
            <tr>
                <td style="text-align:right; font-weight:700; border: 1px solid #ccc; padding: 6px;">
                    مجموع ضريبة القيمة المضافة ${invoiceTaxRate > 0 ? `(${invoiceTaxRate}%)` : ''}
                </td>
                <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px;">\${displayTax.toLocaleString('en-US')} \${sym}</td>
                <td style="text-align:left; color:#555; border: 1px solid #ccc; padding: 6px;">Total VAT</td>
            </tr>`;
            })()}
            <tr style="background:#f0f0f0; border-top: 1.5px solid #111;">
                <td style="text-align:right; font-weight:900; color:#111; padding: 8px;">إجمالي المبلغ المستحق</td>
                <td style="text-align:center; font-weight:900; font-size:14px; color:#111; padding: 8px;">${total.toLocaleString('en-US')} ${sym}</td>
                <td style="text-align:left; font-weight:900; color:#111; padding: 8px;">Total Amount Due</td>
            </tr>
            <tr>
                <td style="text-align:right; font-weight:700; border: 1px solid #ccc; padding: 6px;">المبلغ المدفوع</td>
                <td style="text-align:center; font-weight:900; color:#111; border: 1px solid #ccc; padding: 6px;">${paid.toLocaleString('en-US')} ${sym}</td>
                <td style="text-align:left; color:#555; border: 1px solid #ccc; padding: 6px;">Amount Paid</td>
            </tr>
            <tr>
                <td style="text-align:right; font-weight:700; border: 1px solid #ccc; padding: 6px;">المتبقي المستحق</td>
                <td style="text-align:center; font-weight:900; color:#111; border: 1px solid #ccc; padding: 6px;">${remaining.toLocaleString('en-US')} ${sym}</td>
                <td style="text-align:left; color:#555; border: 1px solid #ccc; padding: 6px;">Remaining Amount</td>
            </tr>
        </tbody>
    </table>
    ` : (() => {
        const isSale = type === 'sale' || type === 'sale-return';
        const showDiscount = discount > 0;
        const showTax = invoiceTaxRate > 0 || invoiceTaxAmount > 0;
        
        // Dynamic balance calculation
        const prevBal = isSale 
            ? (invoice.customerPrevBalance ?? (Number(partyBalance) - (total - paid))) 
            : (invoice.supplierPrevBalance ?? (Number(partyBalance) - (paid - total)));
            
        const finalBal = isSale 
            ? (invoice.customerNewBalance ?? Number(partyBalance))
            : (invoice.supplierNewBalance ?? Number(partyBalance));

        const effect = total - paid;
        
        const formatBal = (val: number) => {
            const abs = Math.abs(val).toLocaleString('en-US');
            const suffix = isSale ? (val > 0 ? ' (عليه)' : val < 0 ? ' (له)' : '') : (val < 0 ? ' (له)' : val > 0 ? ' (لنا)' : '');
            return `${abs} ${sym}${suffix}`;
        };

        const displayTax = invoiceTaxAmount > 0 ? invoiceTaxAmount
            : parseFloat(lines.reduce((acc: number, l: any) => acc + (Number(l.quantity || 0) * Number(l.price || 0) * invoiceTaxRate / 100), 0).toFixed(2));

        return `
    <div style="display: flex; justify-content: flex-start; margin-top: 20px;">
        <div style="width: 320px;">
            <table style="width:100%; border-collapse:collapse; border: 1.5px solid #333; font-size: 13px;">
                <tbody>
                    <!-- Subtotal Entry -->
                    <tr style="height: 32px;">
                        <td style="width:60%; text-align:right; font-weight:500; border: 1px solid #ccc; padding: 4px 10px; color: #555;">الإجمالي قبل الخصم والضريبة</td>
                        <td style="width:40%; text-align:left; font-weight:700; border: 1px solid #ccc; padding: 4px 10px;">${subtotal.toLocaleString('en-US')} ${sym}</td>
                    </tr>

                    <!-- Optional Discount -->
                    ${showDiscount ? `
                    <tr style="height: 32px;">
                        <td style="text-align:right; font-weight:500; border: 1px solid #ccc; padding: 4px 10px; color: #555;">الخصم</td>
                        <td style="text-align:left; font-weight:700; border: 1px solid #ccc; padding: 4px 10px; color: #d32f2f;">${discount.toLocaleString('en-US')} ${sym}</td>
                    </tr>` : ''}

                    <!-- Optional Tax -->
                    ${showTax ? `
                    <tr style="height: 32px;">
                        <td style="text-align:right; font-weight:500; border: 1px solid #ccc; padding: 4px 10px; color: #555;">إجمالي الضريبة ${invoiceTaxRate > 0 ? `(${invoiceTaxRate}%)` : ''}</td>
                        <td style="text-align:left; font-weight:700; border: 1px solid #ccc; padding: 4px 10px;">${displayTax.toLocaleString('en-US')} ${sym}</td>
                    </tr>` : ''}

                    <!-- Total Invoice (Important Row) -->
                    <tr style="background:#f2f2f2; height: 35px; border: 1.5px solid #333;">
                        <td style="text-align:right; font-weight:900; padding: 6px 10px; color: #000;">إجمالي الفاتورة</td>
                        <td style="text-align:left; font-weight:900; font-size:15px; padding: 6px 10px; color: #000;">${total.toLocaleString('en-US')} ${sym}</td>
                    </tr>

                    <!-- Paid Entry -->
                    <tr style="height: 32px;">
                        <td style="text-align:right; font-weight:500; border: 1px solid #ccc; padding: 4px 10px; color: #555;">المبلغ المدفوع</td>
                        <td style="text-align:left; font-weight:700; border: 1px solid #ccc; padding: 4px 10px; color: #2e7d32;">${paid.toLocaleString('en-US')} ${sym}</td>
                    </tr>

                    <!-- Remaining Entry -->
                    <tr style="height: 32px;">
                        <td style="text-align:right; font-weight:500; border: 1px solid #ccc; padding: 4px 10px; color: #555;">المبلغ المتبقي</td>
                        <td style="text-align:left; font-weight:700; border: 1px solid #ccc; padding: 4px 10px; color: ${remaining > 0 ? '#d32f2f' : '#2e7d32'};">${remaining.toLocaleString('en-US')} ${sym}</td>
                    </tr>

                    <!-- Optional Balance Section -->
                    ${(partyBalance !== null || invoice.customerPrevBalance !== null || invoice.supplierPrevBalance !== null) ? `
                    <tr style="height: 32px;">
                        <td style="text-align:right; font-weight:500; border: 1px solid #ccc; padding: 4px 10px; color: #555;">الرصيد السابق لـ ${partyLabel}</td>
                        <td style="text-align:left; font-weight:700; border: 1px solid #ccc; padding: 4px 10px;">${formatBal(prevBal)}</td>
                    </tr>
                    <tr style="height: 32px;">
                        <td style="text-align:right; font-weight:500; border: 1px solid #ccc; padding: 4px 10px; color: #555;">صافي تأثير الفاتورة</td>
                        <td style="text-align:left; font-weight:700; border: 1px solid #ccc; padding: 4px 10px; direction: ltr;">${effect > 0 ? '+' : ''}${effect.toLocaleString('en-US')} ${sym}</td>
                    </tr>
                    <tr style="background:#f2f2f2; height: 35px; border: 1.5px solid #333;">
                        <td style="text-align:right; font-weight:900; padding: 6px 10px; color: #000;">إجمالي رصيد ${partyLabel} الحالي</td>
                        <td style="text-align:left; font-weight:900; font-size:15px; padding: 6px 10px; color: #000;">${formatBal(finalBal)}</td>
                    </tr>
                    ` : ''}
                </tbody>
            </table>
        </div>
    </div>
    `;
    })()}
</div>
${options.noAutoPrint ? '' : (isSaudi ? `
<script>
window.onload = () => { setTimeout(() => window.print(), 500); };
</script>` : '<script>window.onload=()=>setTimeout(()=>window.print(),400);</script>')}
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


export function generateThermalVoucherHTML(voucher: any, type: VoucherType, company: CompanyInfo = {}, options: { noAutoPrint?: boolean } = {}): string {
    const sym = getCurrencySymbol(company.currency || 'EGP');
    const country = (company.countryCode || 'EG').toUpperCase();
    const isBilingual = country !== 'EG';
    const isReceipt = type === 'receipt';
    const title = isReceipt ? 'سند قبض' : 'سند صرف';
    const titleEn = isReceipt ? 'Receipt Voucher' : 'Payment Voucher';
    const vNum = String(voucher.voucherNumber || 1).padStart(5, '0');
    const prefix = isReceipt ? 'RCV' : 'PAY';
    const date = new Date(voucher.date || new Date()).toLocaleDateString('en-GB');
    const amount = Number(voucher.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const partyName = voucher.customer?.name || voucher.supplier?.name || '—';
    const treasuryName = voucher.treasury?.name || '';
    const paymentType = voucher.paymentType === 'bank' ? 'تحويل بنكي' : 'نقداً';

    const blInline = (ar: string, en: string) => isBilingual ? `${ar} / <span style="font-family:sans-serif">${en}</span>` : ar;

    const addrLines = [
        company.addressRegion   ? `${isBilingual ? 'المنطقة / Region' : 'المنطقة'}: ${company.addressRegion}` : null,
        company.addressCity     ? `${isBilingual ? 'المدينة / City'   : 'المدينة'}: ${company.addressCity}`   : null,
    ].filter(Boolean) as string[];

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>${title} - ${prefix}-${vNum}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',sans-serif;color:#111;font-size:13px;background:#fff;direction:rtl}
.page{padding:12mm 15mm;display:flex;flex-direction:column;gap:16px}
.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:2.5px solid #111}
.co-block{flex:1}
.co-name{font-size:20px;font-weight:900;color:#111}
.co-name-en{font-size:15px;font-weight:700;color:#555;font-family:sans-serif}
.co-line{font-size:11px;color:#444;line-height:1.6}
.title-block{flex:1;text-align:center}
.v-title{font-size:24px;font-weight:900;background:#f5f5f5;border:2px solid #ccc;border-radius:10px;padding:6px 24px;display:inline-block}
.v-title-en{font-size:14px;color:#555;font-family:sans-serif;margin-top:3px}
.v-num{font-size:13px;color:#333;font-family:monospace;font-weight:700;margin-top:5px}
.logo-block{flex:1;text-align:left}
.logo-block img{max-height:75px;max-width:150px;object-fit:contain}
.details-box{border:1.5px solid #333;border-radius:10px;overflow:hidden}
.details-title{background:#f0f0f0;padding:7px 16px;font-weight:900;font-size:12px;border-bottom:1px solid #ccc}
.details-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
.d-row{display:flex;gap:8px;padding:9px 16px;border-bottom:1px solid #eee;font-size:13px}
.d-row:last-child{border-bottom:none}
.d-label{color:#666;min-width:110px;flex-shrink:0}
.d-value{font-weight:800;color:#111}
.amount-section{border:2px solid #111;border-radius:10px;padding:16px 24px;text-align:center;background:#f9fafb}
.amount-label{font-size:13px;color:#555;margin-bottom:6px}
.amount-value{font-size:28px;font-weight:900;color:#111}
.sigs{display:flex;justify-content:space-between;margin-top:8px;padding-top:16px;border-top:1px dashed #ccc}
.sig-box{text-align:center;min-width:160px}
.sig-label{font-size:12px;font-weight:800;color:#333;margin-bottom:36px}
.sig-line{border-top:1px solid #555;padding-top:5px;font-size:11px;color:#555}
@media screen{.page{min-height:100vh}}
@media print{@page{size:auto;margin:6mm 8mm}html,body{width:100%}.page{min-height:0 !important;width:100%;padding:0}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="co-block">
      <div style="text-align:right">
        ${country === 'EG' 
          ? `<div style="text-align:right;">
               <div style="font-size:22px; font-weight:900; color:#000;">${company.name || ''}</div>
               <div style="font-size:13px; color:#333; margin-top:4px; font-weight:700;">
                  ${[company.addressRegion, company.addressCity, company.addressDistrict, company.addressStreet].filter(Boolean).join(' - ')}
               </div>
               ${company.phone ? `<div style="font-size:11px; color:#555; margin-top:2px;">الهاتف: ${company.phone}</div>` : ''}
               ${company.taxNumber ? `<div style="font-size:11px; color:#555;">رقم ضريبي: ${company.taxNumber}</div>` : ''}
               ${company.commercialRegister ? `<div style="font-size:11px; color:#555;">سجل تجاري: ${company.commercialRegister}</div>` : ''}
             </div>`
          : `<div>
               <span class="co-name">${company.name || ''}</span>${`${company.nameEn ? `<span style="color:#999;font-size:13px;margin:0 4px">/</span><span class="co-name-en">${company.nameEn}</span>` : ''}`}
             </div>
             <div class="co-line">
               ${[company.addressRegion, company.addressCity, company.addressDistrict, company.addressStreet].filter(Boolean).join(' - ')}
             </div>
             <div class="co-line">
               ${company.phone ? `الهاتف: ${company.phone}` : ''}
               ${company.taxNumber ? ` ${company.phone ? '| ' : ''}${blInline('الرقم الضريبي','VAT No.')}: <strong>${company.taxNumber}</strong>` : ''}
             </div>`
        }
      </div>
    </div>
    <div class="title-block">
      <div class="v-title">${title}</div>
      ${isBilingual ? `<div class="v-title-en">${titleEn}</div>` : ''}
      <div class="v-num">${prefix}-${vNum}</div>
    </div>
    <div class="logo-block">
      ${company.logo ? `<img src="${company.logo}" alt=""/>` : ''}
    </div>
  </div>

  <div class="details-box">
    <div class="details-title">${blInline('بيانات السند','Voucher Details')}</div>
    <div class="details-grid">
      <div class="d-row"><span class="d-label">${blInline(isReceipt ? 'استلمنا من' : 'صرفنا لـ', isReceipt ? 'Received From' : 'Paid To')}:</span><span class="d-value">${partyName}</span></div>
      <div class="d-row"><span class="d-label">${blInline('التاريخ','Date')}:</span><span class="d-value">${date}</span></div>
      <div class="d-row"><span class="d-label">${blInline('طريقة الدفع','Payment')}:</span><span class="d-value">${paymentType}</span></div>
      ${treasuryName ? `<div class="d-row"><span class="d-label">${blInline('الخزينة','Treasury')}:</span><span class="d-value">${treasuryName}</span></div>` : ''}
      ${voucher.description ? `<div class="d-row" style="grid-column:span 2"><span class="d-label">${blInline('البيان','Description')}:</span><span class="d-value">${voucher.description}</span></div>` : ''}
    </div>
  </div>

  <div class="amount-section">
    <div class="amount-label">${blInline(isReceipt ? 'المبلغ المستلم' : 'المبلغ المصروف', isReceipt ? 'Amount Received' : 'Amount Paid')}</div>
    <div class="amount-value">${amount} ${sym}</div>
  </div>

  <div class="sigs">
    <div class="sig-box">
      <div class="sig-label">${blInline('توقيع المستلم','Receiver Signature')}</div>
      <div class="sig-line">${blInline('الاسم والتوقيع','Name & Signature')}</div>
    </div>
    <div style="text-align:center;font-size:11px;color:#999;align-self:flex-end">
      ${blInline('شكراً لتعاملكم معنا','Thank you for your business')}
    </div>
    <div class="sig-box">
      <div class="sig-label">${blInline('توقيع المسؤول','Authorized Signature')}</div>
      <div class="sig-line">${blInline('الختم والتوقيع','Stamp & Signature')}</div>
    </div>
  </div>
</div>
${options.noAutoPrint ? '' : '<script>window.onload=()=>setTimeout(()=>window.print(),400);</script>'}
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
export function generateQuotationHTML(
    quotation: any,
    company: CompanyInfo = {},
    options: {
        terms?: string;
        noAutoPrint?: boolean;
    } = {}
): string {
    const sym = getCurrencySymbol(company.currency || 'EGP');
    const country = (company.countryCode || 'EG').toUpperCase();
    const isBilingual = country !== 'EG';
    
    const qAddrLabels = {
        region:   isBilingual ? 'المنطقة / Region'  : 'المنطقة',
        city:     isBilingual ? 'المدينة / City'     : 'المدينة',
        district: isBilingual ? 'الحي / District'    : 'الحي',
        street:   isBilingual ? 'الشارع / Street'    : 'الشارع',
    };
    const co = {
        name: company.name || 'اسم الشركة',
        nameEn: company.nameEn || '',
        addrLines: [
            company.addressRegion   ? { label: qAddrLabels.region,   value: company.addressRegion }   : null,
            company.addressCity     ? { label: qAddrLabels.city,     value: company.addressCity }     : null,
            company.addressDistrict ? { label: qAddrLabels.district, value: company.addressDistrict } : null,
            company.addressStreet   ? { label: qAddrLabels.street,   value: company.addressStreet }   : null,
        ].filter(Boolean) as { label: string; value: string }[],
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
body{font-family:'Cairo',sans-serif;color:#111;font-size:11px;background:#fff;direction:rtl}
.page{width:100%;margin:0 auto;padding:4mm 8mm;display:flex;flex-direction:column;gap:5px}
.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;border-bottom:2px solid #111;margin-bottom:0px}
.co-block{flex:1;text-align:right}
.co-name{font-size:16px;font-weight:900;color:#111;margin-bottom:2px}
.co-name-en{font-size:13px;font-weight:700;color:#555;margin-bottom:2px;font-family:sans-serif}
.co-line{font-size:10px;color:#444;line-height:1.6}
.header-center{flex:1;text-align:center}
.inv-title{font-size:16px;font-weight:900;color:#111;background:#f5f5f5;padding:3px 15px;border-radius:8px;display:inline-block;border:1.5px solid #ccc}
.inv-title-en{font-size:12px;font-weight:700;color:#555;margin-top:2px;font-family:sans-serif}
.inv-num{font-size:11px;color:#333;margin-top:3px;font-family:monospace;font-weight:700}
.logo-block{flex:1;text-align:left}
.logo-block img{max-height:80px;max-width:150px;object-fit:contain}
.info-section{border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-top:8px;display:grid;grid-template-columns:1fr 1fr}
.info-col{padding:6px 10px}
.info-col:first-child{border-left:1px solid #e0e0e0}
.info-row{font-size:10.5px;margin-bottom:3px}
.ik{color:#777;min-width:80px;display:inline-block}
.iv{color:#111;font-weight:800}
table{width:100%;border-collapse:collapse;border:1.5px solid #333;margin-top:5px}
thead{background:#f0f0f0}
thead th{padding:4px 3px;font-size:10px;font-weight:900;color:#111;text-align:center;border:1.5px solid #333;white-space:nowrap}
tbody td{padding:3px 4px;font-size:10px;color:#1a1a1a;text-align:center;border:1px solid #666;vertical-align:middle;white-space:nowrap}
.summary-wrap{display:flex;justify-content:flex-end;margin-top:8px}
.totals{min-width:260px;border:1.5px solid #333;border-radius:8px;overflow:hidden}
.t-row{display:flex;justify-content:space-between;padding:4px 10px;border-bottom:1px solid #ddd;font-size:11px}
.t-main{background:#f0f0f0;color:#111;font-weight:900;border-bottom:1px solid #333}
.notes{margin-top:10px;padding:8px 10px;border:1px dashed #ccc;border-radius:8px;font-size:10.5px}
.footer{margin-top:8px;padding-top:8px;text-align:center;font-size:10px;color:#666}
@media screen{.page{min-height:100vh}}
@media print{@page{size:auto;margin:6mm 8mm}html,body{width:100%}.page{min-height:0 !important;width:100%;padding:0}}
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="co-block">
            <div style="text-align:right">
              ${country === 'EG' 
                ? `<div style="text-align:right;">
                     <div style="font-size:22px; font-weight:900; color:#000;">${co.name}</div>
                     <div style="font-size:13px; color:#333; margin-top:4px; font-weight:700;">
                        ${co.addrLines.map(a => a.value).join(' - ')}
                     </div>
                     ${co.phone ? `<div style="font-size:11px; color:#555; margin-top:2px;">الهاتف: ${co.phone}</div>` : ''}
                     ${co.tax ? `<div style="font-size:11px; color:#555;">رقم ضريبي: ${co.tax}</div>` : ''}
                     ${co.cr ? `<div style="font-size:11px; color:#555;">سجل تجاري: ${co.cr}</div>` : ''}
                   </div>`
                : `<div>
                     <span class="co-name">${co.name}</span>${co.nameEn ? `<span style="color:#999;font-size:13px;margin:0 4px">/</span><span class="co-name-en">${co.nameEn}</span>` : ''}
                   </div>
                   <div class="co-line">${co.addrLines.map(a => a.value).join(' - ')}</div>
                   <div class="co-line">
                       ${co.phone ? `الهاتف: ${co.phone}` : ''}
                       ${co.tax ? ` ${co.phone ? '| ' : ''}${blInline('الرقم الضريبي', 'VAT No.')}: <strong>${co.tax}</strong>` : ''}
                   </div>`
              }
            </div>
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
                <td><strong>${Number(l.quantity).toLocaleString('en-US')}</strong></td>
                <td>${Number(l.price).toLocaleString('en-US')} ${sym}</td>
                <td><strong>${Number(l.total).toLocaleString('en-US')} ${sym}</strong></td>
            </tr>`).join('')}
        </tbody>
    </table>

    <div class="summary-wrap">
        <div class="totals">
            <div class="t-row">
                <span>${blInline('المجموع الفرعي', 'Subtotal')}:</span>
                <span>${subtotal.toLocaleString('en-US')} ${sym}</span>
            </div>
            ${Number(quotation.discount || 0) > 0 ? `
            <div class="t-row">
                <span>${blInline('الخصم', 'Discount')}:</span>
                <span>${Number(quotation.discount).toLocaleString('en-US')} ${sym}</span>
            </div>` : ''}
            ${taxAmt > 0 ? `
            <div class="t-row">
                <span>${blInline('الضريبة', 'VAT')} (${quotation.taxRate}%):</span>
                <span>${taxAmt.toLocaleString('en-US')} ${sym}</span>
            </div>` : ''}
            <div class="t-row t-main">
                <span>${blInline('الإجمالي النهائي', 'Total')}:</span>
                <span>${total.toLocaleString('en-US')} ${sym}</span>
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
${options.noAutoPrint ? '' : '<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500);};</script>'}
</body>
</html>`;

    return html;
}

export function printQuotation(
    quotation: any,
    company: CompanyInfo = {},
    options: { terms?: string } = {}
) {
    const html = generateQuotationHTML(quotation, company, options);
    const printWin = window.open('', '_blank');
    if (printWin) {
        printWin.document.write(html);
        printWin.document.close();
    }
}
