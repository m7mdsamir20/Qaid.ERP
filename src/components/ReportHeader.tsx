import { ArrowRight, Printer, FileSpreadsheet, FileDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { THEME, C, CAIRO, INTER } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import { formatAddressForInvoice } from '@/lib/addressConfig';

interface ReportHeaderProps {
    title: string;
    subtitle: string;
    backTab?: string;
    onExportExcel?: () => void;
    onExportPdf?: () => void;
    data?: any;
    printTitle?: string;
    printDate?: string;
    printCode?: string;
}

export default function ReportHeader({ title, subtitle, backTab, onExportExcel, onExportPdf, printTitle, printDate, printCode }: ReportHeaderProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [co, setCo] = React.useState<any>((session?.user as any) || {});

    React.useEffect(() => {
        fetch('/api/company')
            .then(res => res.json())
            .then(d => { if (d && !d.error) setCo(d); })
            .catch(() => { });
    }, []);

    const handleBack = () => {
        if (backTab) router.push(`/reports?tab=${backTab}`);
        else router.push('/reports');
    };

    const openCleanPrintWindow = () => {
        // ── بيانات الشركة ──
        const companyName = co.companyName || co.name || '';
        const companyNameEn = co.nameEn || '';
        const phone = co.phone || '';
        const taxNumber = co.taxNumber || '';
        const cr = co.commercialRegister || '';
        const logo = co.logo || co.companyLogo || '';
        const countryCode = (co.countryCode || 'EG').toUpperCase();

        // العنوان: نجرب الـ split fields أولاً ثم نرجع للـ address القديم
        let addrLine = '';
        if (co.addressRegion || co.addressCity || co.addressDistrict || co.addressStreet) {
            const parts = [co.addressRegion, co.addressCity, co.addressDistrict, co.addressStreet].filter(Boolean);
            addrLine = parts.join('، ');
        } else {
            const lines = formatAddressForInvoice(co.address, countryCode);
            addrLine = lines.join('، ');
        }

        const reportTitle = printTitle || title;
        const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

        // printDate أحياناً بيكون اسم عميل/مورد وأحياناً فترة زمنية
        const isDateRange = printDate && (printDate.includes('من') || printDate.includes('إلى') || printDate.includes('/') || printDate.includes('-'));
        const accountName = printDate && !isDateRange ? printDate : '';
        const dateRange = isDateRange ? printDate : today;

        // ── استخراج المحتوى ──
        const includeEls = Array.from(document.querySelectorAll('[data-print-include]'));
        const includeHTML = includeEls.map(el => el.outerHTML).join('');
        const tables = Array.from(document.querySelectorAll('table'));
        const tablesHTML = tables.map(tbl => tbl.outerHTML).join('');

        const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>${reportTitle}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',sans-serif;direction:rtl;background:#fff;color:#111;font-size:12px}
.page{padding:10mm 12mm}

/* ══════════════════════════════
   هيدر الشركة
══════════════════════════════ */
.rpt-header{
  display:flex;justify-content:space-between;align-items:flex-start;
  padding-bottom:14px;border-bottom:3px solid #7a8699;margin-bottom:0;gap:12px
}
.rpt-co{flex:1;text-align:right}
.rpt-co-name{font-size:20px;font-weight:900;color:#111;margin-bottom:3px}
.rpt-co-en{font-size:15px;font-weight:700;color:#555;font-family:sans-serif;margin-bottom:3px}
.rpt-co-line{font-size:11px;color:#444;line-height:1.8}
.rpt-center{flex:1.4;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.rpt-title-box{border:2px solid #111;padding:8px 28px;border-radius:10px;background:#f5f5f5}
.rpt-title{font-size:20px;font-weight:900;color:#111;white-space:nowrap}
.rpt-date{font-size:11.5px;color:#555;font-weight:600}
.rpt-logo{flex:1;text-align:left}
.rpt-logo img{max-height:85px;max-width:160px;object-fit:contain}

/* ══════════════════════════════
   بطاقة معلومات الحساب / العميل
══════════════════════════════ */
.account-card{
  display:flex;align-items:center;gap:0;
  border:2px solid #7a8699;border-radius:0;
  margin:12px 0;overflow:hidden
}
.account-card-label{
  background:#7a8699;color:#fff;font-weight:900;font-size:12px;
  padding:10px 18px;white-space:nowrap;writing-mode:horizontal-tb;
  display:flex;align-items:center;gap:6px
}
.account-card-name{
  font-size:15px;font-weight:900;color:#111;padding:10px 20px;flex:1
}
.account-card-meta{
  font-size:11px;color:#555;font-weight:600;padding:10px 20px;
  border-right:1px solid #ddd;text-align:center
}

/* ══════════════════════════════
   كروت الإحصاء
══════════════════════════════ */
.stats-row{display:flex;gap:10px;margin:12px 0}
.stat-card{
  flex:1;border:1.5px solid #ddd;border-radius:8px;
  padding:10px 14px;background:#fafafa;text-align:center
}
.stat-card *{color:#111!important;background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;margin:0!important}
.stat-card svg{display:none!important}
[data-print-include]{display:flex!important;flex-wrap:wrap;gap:10px;margin:12px 0 0}
[data-print-include]>*{flex:1;min-width:100px;padding:10px 14px!important;border:1.5px solid #ddd!important;border-radius:8px!important;background:#fafafa!important;text-align:center}
[data-print-include] *{color:#111!important;background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;margin:0!important}
[data-print-include] svg{display:none!important}

/* ══════════════════════════════
   الجدول
══════════════════════════════ */
.table-wrap{margin-top:14px}
table{width:100%;border-collapse:collapse;border:2px solid #7a8699}
/* رأس الجدول */
thead tr{background:#7a8699!important}
th{
  padding:7px 10px;font-size:10.5px;font-weight:900;
  color:#fff!important;text-align:center;
  border-left:1px solid #909aaa;border-right:1px solid #909aaa;
  background:#7a8699!important;white-space:nowrap;line-height:1.3
}
th:first-child{text-align:right;border-right:none}
th:last-child{border-left:none}
/* صفوف الجدول */
tbody tr:nth-child(even){background:#f7f7f7}
tbody tr:nth-child(odd){background:#fff}
tbody tr:hover{background:#eef2ff}
td{
  padding:6px 10px;font-size:11px;color:#111;
  text-align:center;border:1px solid #ccc;
  vertical-align:middle;line-height:1.3;white-space:nowrap
}
td:first-child{text-align:right;font-weight:600;border-right:2px solid #999}
/* تنظيف العناصر الداخلية */
td span,td a,td div{
  color:inherit!important;background:transparent!important;
  border:none!important;padding:0!important;
  border-radius:0!important;font-size:inherit!important
}
td strong,td b{font-weight:900}
td button{display:none!important}
/* أرقام مالية */
td[data-type="debit"]{color:#166534!important;font-weight:800!important}
td[data-type="credit"]{color:#991b1b!important;font-weight:800!important}
td[data-type="balance"]{font-weight:900!important;color:#111!important}
/* صف الرصيد الافتتاحي */
tr.opening-balance td{
  background:#fffbeb!important;font-weight:900!important;
  font-style:italic;border-top:2px solid #d97706!important;
  border-bottom:2px solid #d97706!important
}
/* الـ tfoot - إجمالي */
tfoot tr{background:#7a8699!important}
tfoot td{
  font-weight:900;font-size:11.5px;
  color:#fff!important;background:#7a8699!important;
  border:1px solid #909aaa;padding:8px 10px;white-space:nowrap
}
tfoot td:first-child{text-align:right;border-right:2px solid #909aaa}

/* ══════════════════════════════
   طباعة
══════════════════════════════ */
@media print{
  @page{size:auto;margin:6mm 8mm}
  body{font-size:10px}
  th{font-size:10px!important;padding:6px 8px!important}
  td{font-size:10px!important;padding:5px 8px!important}
  .page{padding:0}
  thead{display:table-header-group}
  tfoot{display:table-footer-group}
  tbody tr{page-break-inside:avoid}
  table{page-break-inside:auto;border:2px solid #222!important}
  th{background:#7a8699!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;color:#fff!important}
  tfoot tr{background:#7a8699!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  tfoot td{color:#fff!important;background:#7a8699!important}
  thead tr{background:#7a8699!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
</head>
<body>
<div class="page">

<!-- هيدر الشركة -->
<div class="rpt-header">
  <div class="rpt-co">
    <div class="rpt-co-name">${companyName}</div>
    ${companyNameEn ? `<div class="rpt-co-en">${companyNameEn}</div>` : ''}
    ${addrLine ? `<div class="rpt-co-line">${addrLine}</div>` : ''}
    ${phone ? `<div class="rpt-co-line">${phone}</div>` : ''}
    ${taxNumber ? `<div class="rpt-co-line">الرقم الضريبي: <strong>${taxNumber}</strong></div>` : ''}
    ${cr ? `<div class="rpt-co-line">السجل التجاري: <strong>${cr}</strong></div>` : ''}
  </div>
  <div class="rpt-center">
    <div class="rpt-title-box">
      <div class="rpt-title">${reportTitle}</div>
    </div>
    ${printCode ? `<div class="rpt-date">${printCode}</div>` : ''}
  </div>
  <div class="rpt-logo">
    ${logo ? `<img src="${logo}" alt=""/>` : ''}
  </div>
</div>

<!-- بطاقة اسم العميل / المورد / الحساب -->
${accountName ? `
<div class="account-card">
  <div class="account-card-label">&#9664; الاسم</div>
  <div class="account-card-name">${accountName}</div>
  <div class="account-card-meta">${dateRange}</div>
</div>` : ''}

<!-- كروت الإحصاء -->
${includeHTML}

<!-- الجداول -->
<div class="table-wrap">
${tablesHTML}
</div>

</div>
</body>
</html>`;

        sessionStorage.setItem('print_report_html', html);
        sessionStorage.setItem('print_report_title', reportTitle);
        window.open('/print/report', '_blank');
    };

    return (
        <div style={{ marginBottom: THEME.header.mb }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
                    <button
                        onClick={handleBack}
                        style={{
                            width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${C.border}`, color: C.textSecondary,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        title="رجوع"
                    >
                        <ArrowRight size={22} />
                    </button>
                    <div>
                        <h1 className="page-title" style={{ fontSize: THEME.header.titleSize, fontWeight: 600, margin: 0, color: C.textPrimary, textAlign: 'start', fontFamily: CAIRO }}>{title}</h1>
                        <p className="page-subtitle" style={{ fontSize: THEME.header.subSize, color: C.textMuted, margin: '2px 0 0', fontWeight: 400, textAlign: 'start', fontFamily: CAIRO }}>{subtitle}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {onExportExcel && (
                        <button
                            onClick={onExportExcel}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 16px',
                                borderRadius: '10px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e',
                                border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: '12px', fontWeight: 700,
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)'; e.currentTarget.style.transform = 'none'; }}
                        >
                            <FileSpreadsheet size={15} /> تحميل Excel
                        </button>
                    )}

                    <button
                        onClick={openCleanPrintWindow}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 16px',
                            borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc',
                            border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '12px', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s', fontFamily: CAIRO
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.transform = 'none'; }}
                    >
                        <Printer size={15} /> طباعة
                    </button>
                </div>
            </div>
        </div>
    );
}
