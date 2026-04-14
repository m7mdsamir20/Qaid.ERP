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
.page{padding:8mm 10mm}

/* ── هيدر ── */
.rpt-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2.5px solid #111;margin-bottom:16px;gap:8px}
.rpt-co{flex:1;text-align:right}
.rpt-co-name{font-size:18px;font-weight:900;color:#111;margin-bottom:2px}
.rpt-co-en{font-size:14px;font-weight:700;color:#555;margin-bottom:2px;font-family:sans-serif}
.rpt-co-line{font-size:11px;color:#444;line-height:1.7}
.rpt-center{flex:1.2;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px}
.rpt-title-box{border:1.5px solid #ccc;padding:7px 24px;border-radius:8px;background:#f5f5f5}
.rpt-title{font-size:18px;font-weight:900;color:#111}
.rpt-account{font-size:13px;font-weight:800;color:#333;margin-top:2px}
.rpt-date{font-size:11px;color:#666;font-weight:600}
.rpt-logo{flex:1;text-align:left}
.rpt-logo img{max-height:80px;max-width:150px;object-fit:contain}

/* ── كروت الإحصاء ── */
[data-print-include]{display:flex!important;flex-wrap:wrap;gap:8px;margin-bottom:14px}
[data-print-include]>*{flex:1;min-width:100px;padding:8px 12px!important;border:1px solid #ddd!important;border-radius:8px!important;background:#fafafa!important}
[data-print-include] *{color:#111!important;background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;margin:0!important}
[data-print-include] svg{display:none!important}

/* ── جدول ── */
table{width:100%;border-collapse:collapse;border:2px solid #333;margin-bottom:16px}
thead tr{background:#e8e8e8!important}
th{padding:9px 12px;font-size:11.5px;font-weight:900;color:#111;text-align:center;border:1.5px solid #555;background:#e8e8e8;white-space:nowrap}
tbody tr:nth-child(even){background:#f9f9f9}
tbody tr:nth-child(odd){background:#fff}
td{padding:8px 12px;font-size:12px;color:#111;text-align:center;border:1px solid #bbb;vertical-align:middle;line-height:1.5}
td:first-child,th:first-child{text-align:right}
tfoot tr{background:#efefef!important}
tfoot td{font-weight:900;font-size:12px;color:#111;background:#efefef!important;border:1.5px solid #555;padding:9px 12px}
/* تنظيف spans داخل الخلايا */
td span,td a{color:inherit!important;background:transparent!important;border:none!important;padding:0!important;font-weight:inherit!important;border-radius:0!important}
td strong{font-weight:900}
/* أرقام مالية */
td[data-type="debit"],td.text-green-600,td.text-emerald-600{color:#15803d!important;font-weight:800!important}
td[data-type="credit"],td.text-red-600{color:#dc2626!important;font-weight:800!important}
td[data-type="balance"]{font-weight:900!important}
/* صف الرصيد الافتتاحي والإجماليات */
tr.opening-balance td,tr.totals-row td{background:#f0f4ff!important;font-weight:900!important;border:1.5px solid #888!important}

@media print{
    @page{size:auto;margin:8mm 10mm}
    body{font-size:11px}
    .page{padding:0}
    thead{display:table-header-group}
    tfoot{display:table-footer-group}
    tr{page-break-inside:avoid}
    table{page-break-inside:auto}
}
</style>
</head>
<body>
<div class="page">
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
        ${accountName ? `<div class="rpt-account">${accountName}</div>` : ''}
        ${printCode ? `<div class="rpt-date">${printCode}</div>` : ''}
        <div class="rpt-date">${dateRange}</div>
    </div>
    <div class="rpt-logo">
        ${logo ? `<img src="${logo}" alt=""/>` : ''}
    </div>
</div>

${includeHTML}
${tablesHTML}
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
                        onClick={onExportPdf || openCleanPrintWindow}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 16px',
                            borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '12px', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s', fontFamily: CAIRO
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.transform = 'none'; }}
                    >
                        <FileDown size={15} /> حفظ PDF
                    </button>
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
