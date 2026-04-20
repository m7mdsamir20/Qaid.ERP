import { getCurrencySymbol, formatMoney } from './currency';

export interface CompanyInfo {
    name?: string;
    nameEn?: string;
    phone?: string;
    currency?: string;
    countryCode?: string;
// ... (rest of interface continues)
    email?: string;
    taxNumber?: string;
    commercialRegister?: string;
    addressRegion?: string;
    addressCity?: string;
    addressDistrict?: string;
    addressStreet?: string;
    website?: string;
    logo?: string;
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
        region: isBilingual ? 'المنطقة / Region' : 'المنطقة',
        city: isBilingual ? 'المدينة / City' : 'المدينة',
        district: isBilingual ? 'الحي / District' : 'الحي',
        street: isBilingual ? 'الشارع / Street' : 'الشارع',
    };
    const co = {
        name: company.name || 'اسم الشركة',
        nameEn: company.nameEn || '',
        addrLines: [
            company.addressRegion ? { label: addrLabels.region, value: company.addressRegion } : null,
            company.addressCity ? { label: addrLabels.city, value: company.addressCity } : null,
            company.addressDistrict ? { label: addrLabels.district, value: company.addressDistrict } : null,
            company.addressStreet ? { label: addrLabels.street, value: company.addressStreet } : null,
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

    // Try all possible ways to find the party name and details
    const party = isSale
        ? (invoice.customer || invoice.supplier || invoice.Contact || null)
        : (invoice.supplier || invoice.customer || invoice.Contact || null);

    const partyName = party?.name || (isSale ? 'عميل نقدي' : 'مورد نقدي');
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
    const tableBorder = '1px solid #999';
    const cellBorder = '1px solid #999';
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
.page{width:100%; max-width: 850px; min-height: 282mm; margin:0 auto;padding:var(--page-padding);display:flex;flex-direction:column; background: #fff;}
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
.co-name-en{font-size:${isA5 ? '8.5px' : '9.5px'};color:#444;line-height:1.4;margin-bottom:1px}
.co-line{font-size:${isA5 ? '8.5px' : '9.5px'};color:#444;line-height:1.4}
.header-center{flex:1;text-align:center}
.inv-title{font-size:var(--title-font);font-weight:900;color:#111;background:#f5f5f5;padding:2px 14px;border-radius:6px;display:inline-block;border:1px solid #ccc}
.inv-title-en{font-size:${isA5 ? '9px' : '11px'};font-weight:700;color:#555;margin-top:1px;font-family:sans-serif}
.inv-num{font-size:${isA5 ? '9.5px' : '11px'};color:#333;margin-top:2px;font-family:monospace;font-weight:700}
.logo-block{flex:1;text-align:left}
.logo-block img{max-height:var(--logo-h);max-width:130px;object-fit:contain}

/* ── TABLES ── */
.info-wrap{display:flex;gap:${isA5 ? '5px' : '8px'};margin-top:${isA5 ? '2px' : '6px'};margin-bottom:5px}
.info-box{flex:1;border:1px solid #333;border-radius:4px;overflow:hidden;background:#fff}
.info-title{background:#f5f5f5;padding:${isA5 ? '2px 6px' : '3px 8px'};font-weight:900;font-size:${isA5 ? '9px' : '10px'};border-bottom:1px solid #333}
.info-body{padding:${isA5 ? '2px 6px' : '4px 8px'}; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 15px;}
.info-row{font-size:${isA5 ? '8.5px' : '9.5px'};margin-bottom:${isA5 ? '0px' : '1px'};display:flex;gap:4px}
.ik{color:#666;min-width:${isA5 ? '55px' : '70px'};flex-shrink:0}
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
                     <div style="font-size:10px; color:#444; margin-top:3px;">${co.addrLines.map(a => a.value).join(' - ')}</div>
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
            <div class="info-row"><span class="ik">${blInline(partyLabel, partyLabelEn)}:</span><span class="iv">${partyName}</span></div>
            ${party?.phone ? `<div class="info-row"><span class="ik">${blInline('الهاتف', 'Phone')}:</span><span class="iv">${party.phone}</span></div>` : ''}
            ${(() => {
            const parts = [party?.addressRegion, party?.addressCity, party?.addressDistrict, party?.addressStreet].filter(Boolean) as string[];
            if (!parts.length) return '';
            if (!isBilingual) return `<div class="info-row"><span class="ik">العنوان:</span><span class="iv">${parts.join('، ')}</span></div>`;
            return ([
                party?.addressRegion ? { label: blInline('المنطقة', 'Region'), value: party.addressRegion } : null,
                party?.addressCity ? { label: blInline('المدينة', 'City'), value: party.addressCity } : null,
                party?.addressDistrict ? { label: blInline('الحي', 'District'), value: party.addressDistrict } : null,
                party?.addressStreet ? { label: blInline('الشارع', 'Street'), value: party.addressStreet } : null,
            ].filter(Boolean) as { label: string; value: string }[]).map(a => `<div class="info-row"><span class="ik">${a.label}:</span><span class="iv">${a.value}</span></div>`).join('');
        })()}
            ${party?.taxNumber ? `<div class="info-row"><span class="ik">${blInline('الرقم الضريبي', 'VAT No.')}:</span><span class="iv">${party.taxNumber}</span></div>` : ''}
            ${party?.commercialRegister ? `<div class="info-row"><span class="ik">${blInline('السجل التجاري', 'C.R.')}:</span><span class="iv">${party.commercialRegister}</span></div>` : ''}
        </div>
    </div>


</div>

<table style="margin-top: 0px;">
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
    ${isSaudi ? `
    <div style="width: 100%; text-align: left; margin-top: 10px; clear: both; display: block;">
        <table style="width: 340px; display: inline-table; border-collapse: collapse; border: 1.5px solid #333; background: #fff;">
            <tbody>
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">الإجمالي غير شامل الضريبة</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Total (Excluding VAT)</div>
                    </td>
                    <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px; width: 120px;">${subtotal.toLocaleString('en-US')} ${sym}</td>
                </tr>
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">مجموع الخصومات</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Total Discounts</div>
                    </td>
                    <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px;">${discount.toLocaleString('en-US')} ${sym}</td>
                </tr>
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">الإجمالي الخاضع للضريبة</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Total Taxable Amount</div>
                    </td>
                    <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px;">${(subtotal - discount).toLocaleString('en-US')} ${sym}</td>
                </tr>
                ${(() => {
                    const displayTax = invoiceTaxAmount > 0 ? invoiceTaxAmount
                        : parseFloat(lines.reduce((acc: number, l: any) => acc + (Number(l.quantity || 0) * Number(l.price || 0) * invoiceTaxRate / 100), 0).toFixed(2));
                    return `
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">مجموع ضريبة القيمة المضافة ${invoiceTaxRate > 0 ? `(${invoiceTaxRate}%)` : ''}</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Total VAT</div>
                    </td>
                    <td style="text-align:center; font-weight:900; border: 1px solid #ccc; padding: 6px;">${displayTax.toLocaleString('en-US')} ${sym}</td>
                </tr>`;
                })()}
                <tr style="background:#f0f0f0; border-top: 1.5px solid #111;">
                    <td style="text-align:right; border: 1px solid #ccc; padding: 8px;">
                        <div style="font-weight:900; color:#111;">إجمالي المبلغ المستحق</div>
                        <div style="font-weight:900; color:#444; font-size:90%; font-family: sans-serif;">Total Amount Due</div>
                    </td>
                    <td style="text-align:center; font-weight:950; font-size:14px; color:#111; border: 1px solid #ccc; padding: 8px;">${total.toLocaleString('en-US')} ${sym}</td>
                </tr>
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">المبلغ المدفوع</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Amount Paid</div>
                    </td>
                    <td style="text-align:center; font-weight:900; color:#111; border: 1px solid #ccc; padding: 6px;">${paid.toLocaleString('en-US')} ${sym}</td>
                </tr>
                <tr>
                    <td style="text-align:right; border: 1px solid #ccc; padding: 6px;">
                        <div style="font-weight:700;">المتبقي المستحق</div>
                        <div style="color:#555; font-size:90%; font-family: sans-serif;">Remaining Amount</div>
                    </td>
                    <td style="text-align:center; font-weight:900; color:#111; border: 1px solid #ccc; padding: 6px;">${remaining.toLocaleString('en-US')} ${sym}</td>
                </tr>
            </tbody>
        </table>
    </div>
    ` : `
    <!-- Summary Section (For EG and others) -->
    <div style="width: 100%; text-align: left; margin-top: 8px; clear: both; display: block;">
        <div style="width: 320px; display: inline-block; vertical-align: top;">
            ${(() => {
            const showDiscount = discount > 0;
            const showTax = invoiceTaxRate > 0 || invoiceTaxAmount > 0;

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
                <table style="width:100%; border-collapse:collapse; border: 1px solid #111; font-size: 13px;">
                    <tbody>
                        <tr style="height: 30px;">
                            <td style="width:60%; text-align:right; font-weight:500; border: 1px solid #999; padding: 2px 10px; color: #444;">الإجمالي قبل الخصم والضريبة</td>
                            <td style="width:40%; text-align:left; font-weight:700; border: 1px solid #999; padding: 2px 10px;">${subtotal.toLocaleString('en-US')} ${sym}</td>
                        </tr>
                        ${showDiscount ? `<tr style="height: 30px;"><td style="text-align:right; font-weight:500; border: 1px solid #999; padding: 2px 10px; color: #444;">الخصم</td><td style="text-align:left; font-weight:700; border: 1px solid #999; padding: 2px 10px; color: #d32f2f;">${discount.toLocaleString('en-US')} ${sym}</td></tr>` : ''}
                        ${showTax ? `<tr style="height: 30px;"><td style="text-align:right; font-weight:500; border: 1px solid #999; padding: 2px 10px; color: #444;">إجمالي الضريبة</td><td style="text-align:left; font-weight:700; border: 1px solid #999; padding: 2px 10px;">${displayTax.toLocaleString('en-US')} ${sym}</td></tr>` : ''}
                        <tr style="background:#f2f2f2; height: 30px;"><td style="text-align:right; font-weight:900; border: 1px solid #111; padding: 2px 10px; color: #000;">إجمالي الفاتورة</td><td style="text-align:left; font-weight:900; border: 1px solid #111; padding: 2px 10px; color: #000;">${total.toLocaleString('en-US')} ${sym}</td></tr>
                        <tr style="height: 30px;"><td style="text-align:right; font-weight:500; border: 1px solid #999; padding: 2px 10px; color: #444;">المبلغ المدفوع</td><td style="text-align:left; font-weight:700; border: 1px solid #999; padding: 2px 10px;">${paid.toLocaleString('en-US')} ${sym}</td></tr>
                        <tr style="height: 30px;"><td style="text-align:right; font-weight:500; border: 1px solid #999; padding: 2px 10px; color: #444;">المبلغ المتبقي</td><td style="text-align:left; font-weight:700; border: 1px solid #999; padding: 2px 10px;">${remaining.toLocaleString('en-US')} ${sym}</td></tr>
                        ${(partyBalance !== null || invoice.customerPrevBalance !== null || invoice.supplierPrevBalance !== null) ? `
                        <tr style="height: 30px;"><td style="text-align:right; font-weight:500; border: 1px solid #999; padding: 2px 10px; color: #444;">الرصيد السابق لـ ${partyLabel}</td><td style="text-align:left; font-weight:700; border: 1px solid #999; padding: 2px 10px;">${formatBal(prevBal)}</td></tr>
                        <tr style="height: 30px;"><td style="text-align:right; font-weight:500; border: 1px solid #999; padding: 2px 10px; color: #444;">صافي تأثير الفاتورة</td><td style="text-align:left; font-weight:700; border: 1px solid #999; padding: 2px 10px; direction: ltr;">${effect > 0 ? '+' : ''}${effect.toLocaleString('en-US')} ${sym}</td></tr>
                        <tr style="background:#f2f2f2; height: 30px;"><td style="text-align:right; font-weight:900; border: 1px solid #111; padding: 2px 10px; color: #000;">إجمالي رصيد ${partyLabel} الحالي</td><td style="text-align:left; font-weight:900; border: 1px solid #111; padding: 2px 10px; color: #000;">${formatBal(finalBal)}</td></tr>
                        ` : ''}
                    </tbody>
                </table>`;
        })()}
        </div>
    </div>
    `}

    <!-- Final Footer (Signatures) - Applies to both Saudi and regular -->
    <div class="footer" style="margin-top: auto; padding-top: 30px; border-top: none; width: 100%;">
        <div class="footer-inner" style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
            <div style="text-align: center; width: 220px;">
                <div style="font-weight: 900; font-size: 10.5px; margin-bottom: 25px; color: #000;">${blInline('توقيع المستلم', 'Recipient Signature')}</div>
                <div style="border-top: 1.5px solid #111; padding-top: 5px; font-size: 8.5px; color: #444; font-weight: 600;">${blInline('الاسم والتوقيع', 'Name & Signature')}</div>
            </div>
            <div style="text-align: center; color: #aaa; font-size: 9.5px; margin-bottom: 5px; font-weight: 600;">
                شكراً لتعاملكم معنا
            </div>
            <div style="text-align: center; width: 220px;">
                <div style="font-weight: 900; font-size: 10.5px; margin-bottom: 25px; color: #000;">${blInline('توقيع المسؤول', 'Authorized Signature')}</div>
                <div style="border-top: 1.5px solid #111; padding-top: 5px; font-size: 8.5px; color: #444; font-weight: 600;">${blInline('الختم والتوقيع', 'Stamp & Signature')}</div>
            </div>
        </div>
    </div>
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


export function generateThermalVoucherHTML(voucher: any, type: VoucherType, company: CompanyInfo = {}, options: { noAutoPrint?: boolean; isA5?: boolean } = {}): string {
    const sym = getCurrencySymbol(company.currency || 'EGP');
    const country = (company.countryCode || 'EG').toUpperCase();
    const isBilingual = country !== 'EG';
    const isA5 = options.isA5 || false;

    const co = {
        name: company.name || 'اسم الشركة',
        nameEn: company.nameEn || '',
        addr: [company.addressRegion, company.addressCity, company.addressDistrict, company.addressStreet].filter(Boolean).join(' - '),
        phone: company.phone || '',
        logo: company.logo || '',
        tax: company.taxNumber || '',
    };

    const isReceipt = type === 'receipt';
    const title = isReceipt ? 'سند قبض' : 'سند صرف';
    const titleEn = isReceipt ? 'Receipt Voucher' : 'Payment Voucher';
    const vNum = String(voucher.voucherNumber || 1).padStart(5, '0');
    const date = new Date(voucher.date || new Date()).toLocaleDateString('en-GB');

    const bl = (ar: string, en: string) => isBilingual ? `${ar}<br><span style="font-size:100%;color:#555;font-family:sans-serif">${en}</span>` : ar;
    const blInline = (ar: string, en: string) => isBilingual ? `${ar} / <span style="font-size:100%;font-family:sans-serif">${en}</span>` : ar;

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>${title} - ${vNum}</title>
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
    .page{width:100%; max-width: 850px; min-height: 282mm; margin:0 auto;padding:var(--page-padding);display:flex;flex-direction:column; background: #fff;}
    
    .header{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:2px solid #111;margin-bottom:20px}
    .co-block{flex:1;text-align:right}
    .co-name{font-size:var(--header-name);font-weight:900;color:#111;margin-bottom:1px}
    .co-line{font-size:${isA5 ? '8.5px' : '10px'};color:#444;line-height:1.4}
    .header-center{flex:1;text-align:center}
    .inv-title{font-size:var(--title-font);font-weight:900;color:#111;background:#f5f5f5;padding:2px 14px;border-radius:6px;display:inline-block;border:1px solid #ccc}
    .inv-num{font-size:${isA5 ? '10px' : '13px'};color:#333;font-family:monospace;font-weight:700;margin-top:6px}
    .logo-block{flex:1;text-align:left}
    .logo-block img{max-height:var(--logo-h);max-width:150px;object-fit:contain}
    
    .amount-box{margin-top:20px;border:2px solid #111;padding:15px;border-radius:10px;text-align:center;background:#fcfcfc}
    .amount-label{font-size:12px;font-weight:900;margin-bottom:5px}
    .amount-val{font-size:24px;font-weight:900;color:#111;font-family:monospace}
    
    .info-wrap{margin-top:20px;border:1px solid #333;border-radius:8px;overflow:hidden}
    .info-row{display:flex;border-bottom:1px solid #333}
    .info-row:last-child{border-bottom:none}
    .ik{width:${isA5 ? '130px' : '180px'};background:#f5f5f5;padding:10px;font-weight:900;border-left:1px solid #333; font-size:${isA5 ? '9px' : '10.5px'}}
    .iv{flex:1;padding:10px;font-weight:800; font-size:${isA5 ? '9.5px' : '11.5px'}}
    
    .footer{margin-top: auto; padding-top: 30px; border-top: none; width: 100%;}
    .footer-inner{display:flex;justify-content:space-between;align-items:flex-end; width: 100%;}
    .sig-box{text-align:center;width:${isA5 ? '120px' : '220px'}}
    .sig-label{font-size:10.5px;font-weight:900;color:#000;margin-bottom:25px}
    .sig-line{border-top:1.5px solid #111;padding-top:5px;font-size:8.5px;color:#444;font-weight:600}

    @media screen { .page { min-height: 100vh; } }
    @media print {
        @page { size: ${isA5 ? 'A5 portrait' : 'A4 portrait'}; margin: 5mm; }
        body { background: #fff; -webkit-print-color-adjust: exact; }
        .page { min-height: auto !important; width: 100% !important; max-width: none !important; padding: 0 !important; margin: 0 !important; box-shadow: none; }
    }
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="co-block">
            <div class="co-name">${co.name}</div>
            <div class="co-line">${co.addr}</div>
            ${co.phone ? `<div class="co-line">الهاتف: ${co.phone}</div>` : ''}
            ${co.tax ? `<div class="co-line">رقم ضريبي: ${co.tax}</div>` : ''}
        </div>
        <div class="header-center">
            <div class="inv-title">${blInline(title, titleEn)}</div>
            <div class="inv-num">VCH-${vNum}</div>
            <div style="font-size:11px; color:#555; margin-top:2px;">${date}</div>
        </div>
        <div class="logo-block">
            ${co.logo ? `<img src="${co.logo}" alt=""/>` : ''}
        </div>
    </div>

    <div class="amount-box">
        <div class="amount-label">${blInline('المبلغ', 'Amount')}</div>
        <div class="amount-val">${Number(voucher.amount).toLocaleString()} ${sym}</div>
    </div>

    <div class="info-wrap">
        <div class="info-row"><div class="ik">${blInline(isReceipt ? 'استلمنا من السيد' : 'صرف بـأمر السيد', isReceipt ? 'Received From' : 'Payable To')}</div><div class="iv">${voucher.customer?.name || voucher.supplier?.name || '—'}</div></div>
        <div class="info-row"><div class="ik">${blInline('طريقة الدفع', 'Payment method')}</div><div class="iv">${blInline(voucher.paymentType === 'bank' ? 'تحويل بنكي' : 'نقداً', voucher.paymentType === 'bank' ? 'Bank Transfer' : 'Cash')}</div></div>
        <div class="info-row"><div class="ik">${blInline('وذلك عن / البيان', 'Being For / Desc.')}</div><div class="iv">${voucher.description || '—'}</div></div>
        ${voucher.treasury ? `<div class="info-row"><div class="ik">${blInline('الحساب المتأثر', 'Account')}</div><div class="iv">${voucher.treasury.name}</div></div>` : ''}
    </div>

    <div class="footer">
        <div class="footer-inner">
            <div class="sig-box">
                <div class="sig-label">${blInline('توقيع المقر بما فيه', 'Signature')}</div>
                <div class="sig-line">${blInline('الاسم والتوقيع', 'Name & Signature')}</div>
            </div>
            <div style="text-align: center; color: #aaa; font-size: 9.5px; margin-bottom: 5px; font-weight: 600;">
                شكراً لتعاملكم معنا
            </div>
            <div class="sig-box">
                <div class="sig-label">${blInline('توقيع المحاسب', 'Authorized')}</div>
                <div class="sig-line">${blInline('الختم والتوقيع', 'Stamp & Signature')}</div>
            </div>
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
        region: isBilingual ? 'المنطقة / Region' : 'المنطقة',
        city: isBilingual ? 'المدينة / City' : 'المدينة',
        district: isBilingual ? 'الحي / District' : 'الحي',
        street: isBilingual ? 'الشارع / Street' : 'الشارع',
    };
    const co = {
        name: company.name || 'اسم الشركة',
        nameEn: company.nameEn || '',
        addrLines: [
            company.addressRegion ? { label: qAddrLabels.region, value: company.addressRegion } : null,
            company.addressCity ? { label: qAddrLabels.city, value: company.addressCity } : null,
            company.addressDistrict ? { label: qAddrLabels.district, value: company.addressDistrict } : null,
            company.addressStreet ? { label: qAddrLabels.street, value: company.addressStreet } : null,
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
.co-name{font-size:var(--header-name);font-weight:900;color:#111;margin-bottom:1px}
.co-name-en{font-size:10px;color:#444;line-height:1.4;margin-bottom:1px}
.co-line{font-size:10px;color:#444;line-height:1.4}
.header-center{flex:1;text-align:center}
.inv-title{font-size:17px;font-weight:900;color:#111;background:#f5f5f5;padding:2px 14px;border-radius:6px;display:inline-block;border:1px solid #ccc}
.inv-title-en{font-size:11px;font-weight:700;color:#555;margin-top:1px;font-family:sans-serif}
.inv-num{font-size:11px;color:#333;margin-top:2px;font-family:monospace;font-weight:700}
.logo-block{flex:1;text-align:left}
.logo-block img{max-height:80px;max-width:150px;object-fit:contain}
.info-wrap{display:flex;gap:8px;margin-top:6px;margin-bottom:5px}
.info-box{flex:1;border:1px solid #333;border-radius:4px;overflow:hidden;background:#fff}
.info-title{background:#f5f5f5;padding:3px 8px;font-weight:900;font-size:10px;border-bottom:1px solid #333}
.info-body{padding:4px 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 15px;}
.info-row{font-size:9.5px;margin-bottom:1px;display:flex;gap:4px}
.ik{color:#666;min-width:70px;flex-shrink:0}
.iv{color:#111;font-weight:800}
table{width:100%;border-collapse:collapse;border:1px solid #999;margin-top:5px}
thead{background:#f0f0f0}
thead th{padding:4px 3px;font-size:10px;font-weight:900;color:#111;text-align:center;border:1px solid #999;white-space:nowrap}
tbody td{padding:3px 4px;font-size:10px;color:#1a1a1a;text-align:center;border:1px solid #999;vertical-align:middle;white-space:nowrap}
.summary-wrap{width: 100%; text-align: left; margin-top: 8px; clear: both;}
.totals{width: 310px; display: inline-block; text-align: right; border: 1px solid #999; border-radius: 0; overflow: hidden}
.t-row{display:flex;justify-content:space-between;padding:2px 10px;border-bottom:1px solid #999;font-size:13px; height: 30px; align-items: center;}
.t-main{background:#f2f2f2;color:#111;font-weight:900;border-bottom:1px solid #999}
.notes{margin-top:10px;padding:8px 10px;border:1px dashed #ccc;border-radius:8px;font-size:10.5px}
.footer{margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc;}
.footer-inner{display:flex;justify-content:space-between;align-items:flex-end}
.sig-box{text-align:center;min-width:130px}
.sig-label{font-size:9.5px;font-weight:800;color:#333;margin-bottom:22px}
.sig-line{font-size:9.5px;font-weight:800; color: #555}
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
                     <div style="font-size:10px; color:#444; margin-top:3px;">${co.addrLines.map(a => a.value).join(' - ')}</div>
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
            <div class="inv-num" style="margin-top:6px; font-size:13px;">QUO-${quoNum}</div>
            <div style="font-size:11px; color:#555; margin-top:2px;">${date}</div>
        </div>
        <div class="logo-block">
            ${co.logo ? `<img src="${co.logo}" alt=""/>` : ''}
        </div>
    </div>

    <div class="info-wrap">
        <div class="info-box">
            <div class="info-title">${blInline('بيانات العميل', 'Customer Info')}</div>
            <div class="info-body">
                <div class="info-row"><span class="ik">${blInline('العميل', 'Customer')}:</span><span class="iv">${quotation.customer?.name || 'عميل نقدي'}</span></div>
                ${quotation.customer?.phone ? `<div class="info-row"><span class="ik">${blInline('الهاتف', 'Phone')}:</span><span class="iv">${quotation.customer.phone}</span></div>` : ''}
                ${quotation.customer?.taxNumber ? `<div class="info-row"><span class="ik">${blInline('الرقم الضريبي', 'VAT No.')}:</span><span class="iv">${quotation.customer.taxNumber}</span></div>` : ''}
                ${(() => {
            const parts = [quotation.customer?.addressRegion, quotation.customer?.addressCity, quotation.customer?.addressDistrict, quotation.customer?.addressStreet].filter(Boolean) as string[];
            if (!parts.length) return '';
            return `<div class="info-row"><span class="ik">${blInline('العنوان', 'Address')}:</span><span class="iv">${parts.join('، ')}</span></div>`;
        })()}
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:5%">${bl('م', '#')}</th>
                <th style="width:35%;text-align:right">${company.businessType?.toUpperCase() === 'SERVICES' ? bl('الخدمة', 'Service') : bl('الصنف', 'Item')}</th>
                <th style="width:8%">${bl('الوحدة', 'Unit')}</th>
                <th style="width:8%">${bl('الكمية', 'Qty')}</th>
                <th style="width:12%">${bl('السعر', 'Price')}</th>
                ${Number(quotation.taxRate || 0) > 0 ? `
                    <th style="width:8%">${bl('نسبة الضريبة', 'Tax %')}</th>
                    <th style="width:10%">${bl('قيمة الضريبة', 'Tax Amt')}</th>
                ` : ''}
                <th style="width:15%">${bl('الإجمالي', 'Total')}</th>
            </tr>
        </thead>
        <tbody>
            ${lines.map((l: any, i: number) => {
            const lineTaxRate = Number(l.taxRate || 0) || Number(quotation.taxRate || 0);
            const lineBase = Number(l.quantity || 0) * Number(l.price || 0);
            const lineTaxAmt = (lineBase * lineTaxRate) / 100;
            // الحساب الصحيح: السعر الأساسي + مبلغ الضريبة
            const lineTotal = lineBase + lineTaxAmt;

            return `
            <tr>
                <td>${i + 1}</td>
                <td style="text-align:right">
                    <div style="font-weight:800">${l.item?.name || l.itemName || ''}</div>
                    ${l.description ? `<div style="font-size:10px;color:#444;margin-top:2px">${l.description}</div>` : ''}
                </td>
                <td>${l.item?.unit?.name || l.unit?.name || l.unit || '—'}</td>
                <td><strong>${Number(l.quantity).toLocaleString('en-US')}</strong></td>
                <td>${Number(l.price).toLocaleString('en-US')} ${sym}</td>
                ${Number(quotation.taxRate || 0) > 0 ? `
                    <td>${lineTaxRate}%</td>
                    <td>${lineTaxAmt.toLocaleString('en-US')} ${sym}</td>
                ` : ''}
                <td><strong>${lineTotal.toLocaleString('en-US')} ${sym}</strong></td>
            </tr>`;
        }).join('')}
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

    <div class="footer" style="margin-top: auto; padding-top: 30px; border-top: none; width: 100%;">
        <div class="footer-inner" style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%;">
            <div style="text-align: center; width: 220px;">
                <div style="font-weight: 900; font-size: 10.5px; margin-bottom: 25px; color: #000;">${blInline('توقيع المستلم', 'Recipient Signature')}</div>
                <div style="border-top: 1.5px solid #111; padding-top: 5px; font-size: 8.5px; color: #444; font-weight: 600;">${blInline('الاسم والتوقيع', 'Name & Signature')}</div>
            </div>
            <div style="text-align: center; color: #aaa; font-size: 9.5px; margin-bottom: 5px; font-weight: 600;">
                شكراً لتعاملكم معنا
            </div>
            <div style="text-align: center; width: 220px;">
                <div style="font-weight: 900; font-size: 10.5px; margin-bottom: 25px; color: #000;">${blInline('توقيع المسؤول', 'Authorized Signature')}</div>
                <div style="border-top: 1.5px solid #111; padding-top: 5px; font-size: 8.5px; color: #444; font-weight: 600;">${blInline('الختم والتوقيع', 'Stamp & Signature')}</div>
            </div>
        </div>
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

// ═══════════════════════════════════════════════
//  A4 INSTALLMENT PLAN (جدول أقساط)
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
//  A4 INSTALLMENT PLAN (جدول أقساط)
// ═══════════════════════════════════════════════
export function generateInstallmentPlanHTML(plan: any, company: CompanyInfo = {}, options: { noAutoPrint?: boolean; isA5?: boolean } = {}): string {
    const sym = getCurrencySymbol(company.currency || 'EGP');
    const country = (company.countryCode || 'EG').toUpperCase();
    const isBilingual = country !== 'EG';
    const isA5 = options.isA5 || false;

    const co = {
        name: company.name || 'اسم الشركة',
        nameEn: company.nameEn || '',
        addr: [company.addressRegion, company.addressCity, company.addressDistrict, company.addressStreet].filter(Boolean).join(' - '),
        phone: company.phone || '',
        logo: company.logo || '',
        tax: company.taxNumber || '',
    };

    const date = new Date(plan.startDate || new Date()).toLocaleDateString('en-GB');
    const planNum = String(plan.planNumber || 1).padStart(4, '0');

    const bl = (ar: string, en: string) => isBilingual ? `${ar}<br><span style="font-size:100%;color:#555;font-family:sans-serif">${en}</span>` : ar;
    const blInline = (ar: string, en: string) => isBilingual ? `${ar} / <span style="font-size:100%;font-family:sans-serif">${en}</span>` : ar;

    const statusMap: Record<string, string> = {
        paid: 'مدفوع',
        partial: 'جزئي',
        pending: 'قادم',
        overdue: 'متأخر',
        cancelled: 'ملغى'
    };

    const tableBorder = '1.5px solid #111';
    const cellBorder = '1px solid #999';

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>جدول أقساط - ${planNum}</title>
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
    .page{width:100%; max-width: 850px; min-height: 282mm; margin:0 auto;padding:var(--page-padding);display:flex;flex-direction:column; background: #fff;}
    
    .header{display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;border-bottom:2px solid #111;margin-bottom:0px}
    .co-block{flex:1;text-align:right}
    .co-name{font-size:var(--header-name);font-weight:900;color:#111;margin-bottom:1px}
    .co-line{font-size:${isA5 ? '8.5px' : '10px'};color:#444;line-height:1.4}
    .header-center{flex:1;text-align:center}
    .inv-title{font-size:var(--title-font);font-weight:900;color:#111;background:#f5f5f5;padding:2px 14px;border-radius:6px;display:inline-block;border:1px solid #ccc}
    .inv-num{font-size:${isA5 ? '10px' : '13px'};color:#333;font-family:monospace;font-weight:700;margin-top:6px}
    .logo-block{flex:1;text-align:left}
    .logo-block img{max-height:var(--logo-h);max-width:150px;object-fit:contain}
    
    .info-wrap{display:flex;gap:${isA5 ? '5px' : '8px'};margin-top:${isA5 ? '2px' : '6px'};margin-bottom:5px}
    .info-box{flex:1;border:1px solid #333;border-radius:4px;overflow:hidden;background:#fff}
    .info-title{background:#f5f5f5;padding:${isA5 ? '2px 6px' : '3px 8px'};font-weight:900;font-size:${isA5 ? '9px' : '10px'};border-bottom:1px solid #333}
    .info-body{padding:${isA5 ? '2px 6px' : '4px 8px'}; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 15px;}
    .info-row{font-size:${isA5 ? '8.5px' : '9.5px'};margin-bottom:${isA5 ? '0px' : '1px'};display:flex;gap:4px}
    .ik{color:#666;min-width:${isA5 ? '60px' : '80px'}; flex-shrink: 0;}
    .iv{color:#111;font-weight:800}
    
    table{width:100%;border-collapse:collapse;border:${tableBorder};margin-top:6px}
    thead th{background:#f0f0f0;padding:${isA5 ? '4px' : '6px'};font-size:${isA5 ? '8.5px' : '10px'};font-weight:900;border:${cellBorder}; color:#000}
    tbody td{padding:${isA5 ? '3px' : '5px'};font-size:${isA5 ? '8.5px' : '10px'};border:${cellBorder};text-align:center;font-weight:700; color:#111}
    .status-paid{color:#10b981} .status-overdue{color:#ef4444}
    
    .footer{margin-top: auto; padding-top: 30px; border-top: none; width: 100%;}
    .footer-inner{display:flex;justify-content:space-between;align-items:flex-end; width: 100%;}
    .sig-box{text-align:center;width:${isA5 ? '150px' : '220px'}}
    .sig-label{font-size:${isA5 ? '9px' : '10.5px'};font-weight:900;color:#000;margin-bottom:${isA5 ? '15px' : '25px'}}
    .sig-line{border-top:1.5px solid #111;padding-top:5px;font-size:${isA5 ? '8px' : '8.5px'};color:#444;font-weight:600}

    @media screen { .page { min-height: 100vh; } }
    @media print {
        @page { 
            size: ${isA5 ? 'A5 portrait' : 'A4 portrait'}; 
            margin: 5mm; 
        }
        body { background: #fff; -webkit-print-color-adjust: exact; }
        .page { 
            min-height: auto !important; 
            width: 100% !important; 
            max-width: none !important; 
            padding: 0 !important; 
            margin: 0 !important;
            box-shadow: none;
        }
    }
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="co-block">
            <div class="co-name">${co.name}</div>
            <div class="co-line">${co.addr}</div>
            ${co.phone ? `<div class="co-line">الهاتف: ${co.phone}</div>` : ''}
            ${co.tax ? `<div class="co-line">رقم ضريبي: ${co.tax}</div>` : ''}
        </div>
        <div class="header-center">
            <div class="inv-title">${blInline('جدول استحقاق الأقساط', 'Installment Schedule')}</div>
            <div class="inv-num">PLAN-${planNum}</div>
            <div style="font-size:11px; color:#555; margin-top:2px;">${date}</div>
        </div>
        <div class="logo-block">
            ${co.logo ? `<img src="${co.logo}" alt=""/>` : ''}
        </div>
    </div>

    <div class="info-wrap">
        <div class="info-box">
            <div class="info-title">${blInline('بيانات العميل والعقد', 'Contract Details')}</div>
            <div class="info-body">
                <div class="info-row"><span class="ik">${blInline('العميل', 'Customer')}:</span><span class="iv">${plan.customer?.name}</span></div>
                <div class="info-row"><span class="ik">${blInline('المنتج', 'Product')}:</span><span class="iv">${plan.productName}</span></div>
                <div class="info-row"><span class="ik">${blInline('إجمالي المبلغ', 'Grand Total')}:</span><span class="iv">${(plan.grandTotal || 0).toLocaleString()} ${sym}</span></div>
                <div class="info-row"><span class="ik">${blInline('مبلغ القسط', 'Monthly')}:</span><span class="iv">${(plan.installmentAmount || 0).toLocaleString()} ${sym}</span></div>
            </div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width:15%">${bl('كود القسط', 'Inst. Code')}</th>
                <th style="width:15%">${bl('تاريخ الاستحقاق', 'Due Date')}</th>
                <th style="width:15%">${bl('مبلغ القسط', 'Amount')}</th>
                <th style="width:15%">${bl('المدفوع', 'Paid')}</th>
                <th style="width:15%">${bl('المتبقي', 'Remaining')}</th>
                <th style="width:25%">${bl('الحالة', 'Status')}</th>
            </tr>
        </thead>
        <tbody>
            ${(plan.installments || []).map((i: any) => {
        const isOverdue = i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.dueDate) < new Date();
        const statusTxt = isOverdue ? 'متأخر' : (statusMap[i.status] || i.status);
        const statusClass = isOverdue ? 'status-overdue' : (i.status === 'paid' ? 'status-paid' : '');
        const instCode = `INST-${planNum}-${String(i.installmentNo).padStart(2, '0')}`;

        return `
            <tr>
                <td style="font-family:monospace; color:#5286ed;">${instCode}</td>
                <td style="font-family:sans-serif">${new Date(i.dueDate).toLocaleDateString('en-GB')}</td>
                <td>${Number(i.amount).toLocaleString()} ${sym}</td>
                <td>${Number(i.paidAmount || 0).toLocaleString()} ${sym}</td>
                <td>${Number(i.remaining || 0).toLocaleString()} ${sym}</td>
                <td class="${statusClass}">${statusTxt}</td>
            </tr>`;
    }).join('')}
        </tbody>
    </table>

    <div class="footer">
        <div class="footer-inner">
            <div class="sig-box">
                <div class="sig-label">${blInline('توقيع العميل', 'Customer Signature')}</div>
                <div class="sig-line">${blInline('الاسم والتوقيع', 'Name & Signature')}</div>
            </div>
            <div style="text-align: center; color: #aaa; font-size: 9.5px; margin-bottom: 5px; font-weight: 600;">
                شكراً لتعاملكم معنا
            </div>
            <div class="sig-box">
                <div class="sig-label">${blInline('توقيع المسؤول', 'Authorized Signature')}</div>
                <div class="sig-line">${blInline('الختم والتوقيع', 'Stamp & Signature')}</div>
            </div>
        </div>
    </div>
</div>
${options.noAutoPrint ? '' : '<script>window.onload=()=>setTimeout(()=>window.print(),400);</script>'}
</body>
</html>`;
}

// ═══════════════════════════════════════════════
//  GENERAL REPORTS (المحرك الموحد للتقارير)
// ═══════════════════════════════════════════════
export function generateReportHTML(
    title: string,
    content: string,
    company: CompanyInfo = {},
    options: { 
        noAutoPrint?: boolean; 
        isA5?: boolean; 
        subtitle?: string;
        dateFrom?: string;
        dateTo?: string;
        generatedBy?: string;
        lang?: 'ar' | 'en';
        metadata?: Array<{ label: string; value: string | number }>;
        summary?: Array<{ label: string; value: string | number; isTotal?: boolean }>;
    } = {}
): string {
    const lang = options.lang || 'ar';
    const currencyCode = company.currency || 'EGP';
    const sym = getCurrencySymbol(currencyCode, lang);
    const isA5 = options.isA5 || false;
    const isBilingual = (company.countryCode || 'EG').toUpperCase() !== 'EG';

    const co = {
        name: company.name || 'اسم الشركة',
        nameEn: company.nameEn || '',
        addr: [company.addressRegion, company.addressCity, company.addressDistrict, company.addressStreet].filter(Boolean).join(' - '),
        phone: company.phone || '',
        logo: company.logo || '',
    };

    const blInline = (ar: string, en: string) => isBilingual ? `${ar} / <span style="font-size:100%;font-family:sans-serif">${en}</span>` : ar;

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root {
        --base-font: ${isA5 ? '9px' : '11px'};
        --header-name: ${isA5 ? '16px' : '22px'};
        --title-font: ${isA5 ? '13px' : '18px'};
        --logo-h: ${isA5 ? '45px' : '85px'};
    }
    body{font-family:'Cairo',sans-serif;color:#111;font-size:var(--base-font);background:#fff;direction:rtl}
    .page{width:100%; max-width: 900px; min-height: 282mm; margin:0 auto;padding:6mm 10mm;display:flex;flex-direction:column; background: #fff;}
    
    /* Header Section */
    .header{display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:3px solid #111;margin-bottom:15px}
    .co-block{flex:1;text-align:right}
    .co-name{font-size:var(--header-name);font-weight:900;color:#111;margin-bottom:2px}
    .co-line{font-size:${isA5 ? '8.5px' : '10.5px'};color:#444;line-height:1.4}
    .header-center{flex:1.2;text-align:center}
    .report-title{font-size:var(--title-font);font-weight:900;color:#111;background:#f8f9fa;padding:4px 25px;border-radius:10px;display:inline-block;border:1.5px solid #111;box-shadow: 0 4px 0 #111}
    .report-dates{font-size:9.5px;color:#333;font-weight:700;margin-top:10px}
    .logo-block{flex:1;text-align:left}
    .logo-block img{max-height:var(--logo-h);max-width:160px;object-fit:contain}
    
    /* Metadata Section */
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; border: 1.5px solid #111; border-radius: 8px; overflow: hidden; }
    .meta-item { display: flex; align-items: center; border-bottom: 1px solid #eee; }
    .meta-item:last-child, .meta-item:nth-last-child(2) { border-bottom: none; }
    .meta-label { width: 140px; background: #f8f9fa; padding: 6px 12px; font-weight: 900; font-size: 10px; color: #444; border-left: 1.5px solid #111; }
    .meta-value { padding: 6px 12px; font-weight: 700; font-size: 11px; flex: 1; }

    /* Content Area */
    .report-content { flex: 1; }
    table{width:100%;border-collapse:collapse;border:2px solid #111;margin-top:10px}
    thead th{background:#f0f1f3;padding:10px;font-size:10px;font-weight:900;border:1.5px solid #111; color:#000; text-align:center; white-space:nowrap}
    tbody td{padding:8px 10px;font-size:10.5px;border:1px solid #111;text-align:center;font-weight:700; color:#111}
    tbody tr:nth-child(even){background:#fcfcfc}
    
    /* Summary Section */
    .summary-section { margin-top: 20px; width: 100%; display: flex; flex-direction: column; align-items: flex-start; }
    .summary-table { width: 320px; margin-right: auto; margin-left: 0; border: 2px solid #111; border-radius: 8px; overflow: hidden; background: #fff; }
    .summary-row { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { padding: 8px 15px; font-weight: 900; background: #f8f9fa; flex: 1; text-align: right; }
    .summary-value { padding: 8px 15px; font-weight: 900; text-align: left; min-width: 120px; font-family: monospace; font-size: 12px; border-right: 1.5px solid #111; }
    .summary-total { background: #111 !important; color: #fff !important; }
    .summary-total .summary-value { border-right-color: #444; }

    .footer{margin-top: 30px; padding-top: 15px; width: 100%; font-size: 9px; color: #666; text-align: center; border-top: 1px dotted #ccc; display: flex; justify-content: space-between; align-items: center;}
    .footer span { font-weight: 700; }

    @media print {
        @page { size: auto; margin: 4mm 6mm; }
        body { background: #fff; -webkit-print-color-adjust: exact; }
        .page { width: 100% !important; max-width: none !important; padding: 0 !important; margin: 0 !important; min-height: 0 !important; }
        thead { display: table-header-group; }
    }
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="co-block">
            <div class="co-name">${co.name}</div>
            <div class="co-line">${co.addr}</div>
            ${co.phone ? `<div class="co-line">الهاتف: ${co.phone}</div>` : ''}
        </div>
        <div class="header-center">
            <div class="report-title">${title}</div>
            <div class="report-dates">${options.dateFrom ? `من: ${options.dateFrom}` : ''} ${options.dateTo ? ` إلى: ${options.dateTo}` : ''}</div>
            ${options.subtitle ? `<div class="report-subtitle">${options.subtitle}</div>` : ''}
        </div>
        <div class="logo-block">
            ${co.logo ? `<img src="${co.logo}" alt=""/>` : ''}
        </div>
    </div>

    ${(options.metadata && options.metadata.length > 0) ? `
    <div class="meta-grid">
        ${options.metadata.map(m => `
        <div class="meta-item">
            <div class="meta-label">${m.label}</div>
            <div class="meta-value">${m.value}</div>
        </div>`).join('')}
    </div>` : ''}

    <div class="report-content">
        ${content}
    </div>

    ${(options.summary && options.summary.length > 0) ? `
    <div class="summary-section">
        <div class="summary-table">
            ${options.summary.map(s => `
            <div class="summary-row ${s.isTotal ? 'summary-total' : ''}">
                <div class="summary-label">${s.label}</div>
                <div class="summary-value">${typeof s.value === 'number' ? formatMoney(s.value, currencyCode, lang) : s.value}</div>
            </div>`).join('')}
        </div>
    </div>` : ''}

    <div class="footer">
        <div>طُبع بواسطة نظام الـ ERP | <span>${options.generatedBy || 'النظام'}</span></div>
        <div>تاريخ الطباعة: <span>${new Date().toLocaleString('ar-EG')}</span></div>
        <div>صفحة 1 من 1</div>
    </div>
</div>
${options.noAutoPrint ? '' : '<script>window.onload=()=>setTimeout(()=>window.print(),550);</script>'}
</body>
</html>`;
}

export function printInstallmentPlan(plan: any, company: CompanyInfo = {}) {
    const html = generateInstallmentPlanHTML(plan, company);
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
}
