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
        // ── بناء header الشركة ──
        const companyName = co.companyName || co.name || '';
        const companyNameEn = co.nameEn || '';
        const phone = co.phone || '';
        const taxNumber = co.taxNumber || '';
        const cr = co.commercialRegister || '';
        const logo = co.logo || co.companyLogo || '';
        const countryCode = co.countryCode || 'EG';
        const addrLines = formatAddressForInvoice(co.address, countryCode);
        const reportTitle = printTitle || title;
        const reportDate = printDate || new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

        // ── استخراج المحتوى من الـ DOM ──
        // 1) كروت الإحصاءات (print-include)
        const includeEls = Array.from(document.querySelectorAll('[data-print-include]'));
        const includeHTML = includeEls.map(el => el.outerHTML).join('');

        // 2) الجداول - نسخ نظيفة
        const tables = Array.from(document.querySelectorAll('table'));
        const tablesHTML = tables.map(tbl => {
            // نسخة من الجدول بدون inline colors
            return tbl.outerHTML;
        }).join('');

        const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>${reportTitle}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',sans-serif;direction:rtl;background:#fff;color:#111;padding:8mm 10mm;font-size:12px}

/* ── رأس التقرير ── */
.rpt-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2px solid #111;margin-bottom:18px}
.rpt-co{flex:1;text-align:right}
.rpt-co-name{font-size:18px;font-weight:900;color:#111;margin-bottom:3px}
.rpt-co-en{font-size:14px;font-weight:700;color:#555;margin-bottom:3px;font-family:sans-serif}
.rpt-co-line{font-size:10.5px;color:#444;line-height:1.6}
.rpt-center{flex:1;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.rpt-title-box{border:1.5px solid #ccc;padding:8px 30px;border-radius:10px;background:#f9f9f9;display:inline-block}
.rpt-title{font-size:18px;font-weight:900;color:#111}
.rpt-date{font-size:12px;color:#555;font-weight:700}
.rpt-logo{flex:1;display:flex;justify-content:flex-start;align-items:flex-start}
.rpt-logo img{max-height:80px;max-width:140px;object-fit:contain}

/* ── كروت الإحصاء ── */
[data-print-include]{display:flex!important;flex-wrap:wrap;gap:10px;margin-bottom:18px}
[data-print-include]>div{flex:1;min-width:120px;padding:10px 14px!important;border:1px solid #e0e0e0!important;border-radius:10px!important;background:#fff!important;color:#111!important}
[data-print-include] span,[data-print-include] p,[data-print-include] div{color:#111!important;background:transparent!important;border:none!important;box-shadow:none!important}

/* ── الجدول ── */
table{width:100%;border-collapse:collapse;border:1.5px solid #333;margin-top:0}
thead{background:#f0f0f0}
thead tr{background:#f0f0f0!important}
th{padding:8px 10px;font-size:11px;font-weight:900;color:#111;text-align:center;border:1px solid #999;background:#f0f0f0}
td{padding:7px 10px;font-size:11.5px;color:#111;text-align:center;border:1px solid #ccc;background:#fff}
tfoot tr{background:#f5f5f5}
tfoot td{font-weight:900;color:#111;background:#f5f5f5;border:1.5px solid #333}
/* إزالة خلفيات الـ badge spans */
td span{background:transparent!important;border:none!important;padding:0!important;color:#111!important;font-weight:700!important}
/* تلوين الأرقام المالية */
td[data-type="debit"]{color:#15803d!important;font-weight:900!important}
td[data-type="credit"]{color:#dc2626!important;font-weight:900!important}
td[data-type="balance"]{font-weight:900!important}

@media print{
    @page{margin:6mm 8mm;size:A4}
    body{padding:0}
    thead{display:table-header-group}
    tr{page-break-inside:avoid}
}
</style>
</head>
<body>

<div class="rpt-header">
    <div class="rpt-co">
        <div class="rpt-co-name">${companyName}</div>
        ${companyNameEn ? `<div class="rpt-co-en">${companyNameEn}</div>` : ''}
        ${addrLines.map(l => `<div class="rpt-co-line">${l}</div>`).join('')}
        ${phone ? `<div class="rpt-co-line">${phone}</div>` : ''}
        ${taxNumber ? `<div class="rpt-co-line">الرقم الضريبي: <strong>${taxNumber}</strong></div>` : ''}
        ${cr ? `<div class="rpt-co-line">السجل التجاري: <strong>${cr}</strong></div>` : ''}
    </div>
    <div class="rpt-center">
        <div class="rpt-title-box">
            <div class="rpt-title">${reportTitle}</div>
        </div>
        ${printCode ? `<div class="rpt-date">${printCode}</div>` : ''}
        <div class="rpt-date">${reportDate}</div>
    </div>
    <div class="rpt-logo">
        ${logo ? `<img src="${logo}" alt="logo"/>` : ''}
    </div>
</div>

${includeHTML}
${tablesHTML}

</body>
</html>`;

        const win = window.open('', '_blank', 'width=1000,height=750');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => { win.print(); }, 900);
        }
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
