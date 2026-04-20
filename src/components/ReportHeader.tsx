import { ArrowRight, ArrowLeft, Printer, FileSpreadsheet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import React from 'react';
import { THEME, C, CAIRO } from '@/constants/theme';
import { useSession } from 'next-auth/react';

interface ReportHeaderProps {
  title: string;
  subtitle: string;
  backTab?: string;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  onPrint?: () => void;
  data?: any;
  printTitle?: string;
  printDate?: string;
  printCode?: string;
  accountName?: string;
  branchName?: string;
}

export default function ReportHeader({ title, subtitle, backTab, onExportExcel, onPrint, printTitle, printDate, printCode, accountName: manualAccountName, branchName }: ReportHeaderProps) {
  const router = useRouter();
  const { lang, t } = useTranslation();
  const isRtl = lang === 'ar';
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
    const companyName = co.companyName || co.name || '';
    const logo = co.logo || co.companyLogo || '';
    const reportTitle = printTitle || title;
    const now = new Date();
    // التاريخ: أرقام إنجليزية فقط بتنسيق DD/MM/YYYY
    const printDateStr = now.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
    // الوقت: أرقام إنجليزية مع احتفاظ الصباح/المساء بالعربي
    const printTimeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true, numberingSystem: 'latn' });

    const isDateRange = printDate && (printDate.includes('من') || printDate.includes('إلى') || printDate.includes('/') || printDate.includes('-'));
    const accountName = manualAccountName || (printDate && !isDateRange ? printDate : '');
    const dateRange = isDateRange ? printDate : '';

    const includeEls = Array.from(document.querySelectorAll('[data-print-include]'));
    const includeHTML = includeEls.map(el => el.outerHTML).join('');
    const tables = Array.from(document.querySelectorAll('table'));
    const tablesHTML = tables.map(tbl => tbl.outerHTML).join('');

    const dir = isRtl ? 'rtl' : 'ltr';
    const firstColAlign = isRtl ? 'right' : 'left';
    const labelPrintDate = isRtl ? 'تاريخ الطباعة:' : 'Print Date:';
    const labelPeriod = isRtl ? 'الفترة:' : 'Period:';
    const labelAccount = isRtl ? 'تاريخ التقرير:' : 'Report Date:';
    const labelCode = isRtl ? 'الكود:' : 'Code:';
    const labelBranch = isRtl ? 'الفرع:' : 'Branch:';

    const html = `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<title>${reportTitle}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo', 'Inter', sans-serif;direction:${dir};background:#fff;color:#000!important;font-size:9.5px;line-height:1.2;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{padding:5mm 8mm}

/* Force all elements to be black in print */
* { color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* ── Header ── */
.rpt-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid #ddd;margin-bottom:10px}
.rpt-logo img{max-height:60px;max-width:140px;object-fit:contain}
.rpt-logo-text{font-size:18px;font-weight:900;color:#000}

/* ── Report info block ── */
.rpt-info{border:1px solid #eee;border-radius:4px;padding:8px 12px;margin-bottom:10px;background:#fcfcfc}
.rpt-info-title{font-size:15px;font-weight:800;color:#000;text-align:center;margin-bottom:5px}
.rpt-info-rows{display:flex;flex-wrap:nowrap;justify-content:space-between;align-items:center;gap:15px}
.rpt-info-row{display:flex;align-items:center;gap:5px;font-size:9.5px;white-space:nowrap}
.rpt-info-lbl{font-weight:700;color:#666!important}
.rpt-info-val{color:#000!important;font-weight:600;font-family:'Inter', sans-serif}

/* ── Stats ── */
[data-print-include], .print-table-container{background:#fff!important;color:#000!important;border:1.5px solid #eee!important;border-radius:8px!important;margin-bottom:15px;page-break-inside:avoid}
[data-print-include]{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:10px!important}
[data-print-include]>div{padding:10px!important;text-align:center;border:1px solid #f0f0f0!important;border-radius:6px!important}
.print-table-container{display:block!important;padding:15px!important}
.print-table-container div{display:flex!important;justify-content:space-between;align-items:center;margin-bottom:5px}
.print-table-container h3{font-size:12px!important;border-bottom:1px solid #eee!important;padding-bottom:5px!important;margin-bottom:12px!important}
[data-print-include] svg, .no-print{display:none!important}

/* ── Table ── */
.table-wrap{margin-top:5px}
table{width:100%;border-collapse:collapse;border:1px solid #ccc;font-size:9px;background:#fff!important;table-layout:auto}
thead tr{background:#f8f9fa!important}
th{padding:5px 4px;font-size:8.5px;font-weight:800;color:#000!important;text-align:center;border:1px solid #ccc;background:#f8f9fa!important;white-space:nowrap;line-height:1}
th:first-child{text-align:${firstColAlign}}
tbody tr{border-bottom: 1px solid #eee; background:#fff!important}
td{padding:3px 4px;font-size:8px;color:#000!important;text-align:center;border:1px solid #eee;vertical-align:middle;line-height:1.1;white-space:normal;background:#fff!important}
td:first-child, td:nth-child(2), td[data-type="debit"], td[data-type="credit"], td[data-type="balance"]{white-space:nowrap!important}
td:first-child{text-align:${firstColAlign}}
td span,td a,td div{font-size:inherit!important; color:#000!important; display:inline-block; white-space:nowrap}
td small{font-size:6.5px!important; opacity:0.8; margin-inline-start:1px}
td button{display:none!important}
td strong,td b{font-weight:500}
td[data-type="debit"],td[data-type="credit"],td[data-type="balance"]{font-family:'Inter', sans-serif; font-weight:400!important; min-width:55px; font-size:7.8px!important}
tr.opening-balance td{background:#f8f9fa!important;font-weight:600!important;border-top:1px solid #ccc!important;border-bottom:1px solid #ccc!important}
tfoot tr{background:#f8f9fa!important}
tfoot td{font-weight:600;font-size:8.5px;color:#000!important;background:#f8f9fa!important;border:1px solid #ccc;padding:4px 4px;white-space:nowrap}
tfoot td:first-child{text-align:${firstColAlign}}

@media print{
  @page{size:A4;margin:5mm 6mm}
  body{font-size:8.5px}
  .page{padding:0}
  th{padding:4px 2px!important}
  td{padding:3px 2px!important}
}
</style>
</head>
<body>
<div class="page">

<div class="rpt-header">
  <div style="flex:1.2; text-align:start">
    <!-- Right side (start) - Empty or Metadata -->
  </div>
  <div style="flex:1 auto; text-align:center">
      <div class="rpt-info-title" style="margin:0; padding:0; font-size:19px;">${reportTitle}</div>
  </div>
  <div style="flex:1.2; text-align:end">
    <!-- Left side (end) - Logo -->
    <div class="rpt-logo">
      ${logo ? `<img src="${logo}" alt=""/>` : `<div class="rpt-logo-text">${companyName}</div>`}
    </div>
  </div>
</div>

<div class="rpt-info">
  <div class="rpt-info-rows">
    ${branchName ? `<div class="rpt-info-row"><span class="rpt-info-lbl">${labelBranch}</span><span class="rpt-info-val">${branchName}</span></div>` : ''}
    ${accountName ? `<div class="rpt-info-row"><span class="rpt-info-lbl">${labelAccount}</span><span class="rpt-info-val">${accountName}</span></div>` : ''}
    ${dateRange ? `<div class="rpt-info-row"><span class="rpt-info-lbl">${labelPeriod}</span><span class="rpt-info-val">${dateRange}</span></div>` : ''}
    <div class="rpt-info-row" style="margin-inline-start: auto;">
      <span class="rpt-info-lbl">${isRtl ? 'تاريخ وتوقيت الطباعة:' : 'Print Timestamp:'}</span>
      <span class="rpt-info-val">${printDateStr} — ${printTimeStr}</span>
    </div>
  </div>
</div>

${includeHTML}

<div class="table-wrap">${tablesHTML}</div>

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
              width: '38px', height: '38px', borderRadius: '12px', background: C.inputBg,
              border: `1px solid ${C.border}`, color: C.textSecondary,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = C.textPrimary; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.inputBg; e.currentTarget.style.color = C.textSecondary; }}
            title={t("رجوع")}
          >
            {isRtl ? <ArrowRight size={22} /> : <ArrowLeft size={22} />}
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
            onClick={onPrint || openCleanPrintWindow}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 16px',
              borderRadius: '10px', background: C.primary, color: '#fff',
              border: 'none', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s', fontFamily: CAIRO,
              boxShadow: `0 4px 12px ${C.primary}30`
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.primaryHover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
          >
            <Printer size={15} /> طباعة
          </button>
        </div>
      </div>
    </div>
  );
}
