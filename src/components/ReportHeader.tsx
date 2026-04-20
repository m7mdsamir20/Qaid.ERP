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
}

export default function ReportHeader({ title, subtitle, backTab, onExportExcel, onPrint, printTitle, printDate, printCode, accountName: manualAccountName }: ReportHeaderProps) {
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
    const labelAccount = isRtl ? 'الحساب:' : 'Account:';
    const labelCode = isRtl ? 'الكود:' : 'Code:';

    const html = `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<title>${reportTitle}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',sans-serif;direction:${dir};background:#fff;color:#000!important;font-size:10.5px;line-height:1.4;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{padding:8mm 10mm}

/* Force all elements to be black in print */
* { color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* ── Header: logo only ── */
.rpt-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:1px solid #ccc;margin-bottom:15px}
.rpt-logo img{max-height:70px;max-width:160px;object-fit:contain}
.rpt-logo-text{font-size:22px;font-weight:900;color:#000}

/* ── Report info block ── */
.rpt-info{border:1px solid #eee;border-radius:4px;padding:10px 15px;margin-bottom:15px;background:#f9f9f9}
.rpt-info-title{font-size:17px;font-weight:800;color:#000;text-align:center;margin-bottom:8px}
.rpt-info-rows{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px}
.rpt-info-row{display:flex;align-items:center;gap:8px;font-size:11px}
.rpt-info-lbl{font-weight:700;color:#555!important}
.rpt-info-val{color:#000!important;font-weight:700}

/* ── Stats (data-print-include) ── */
[data-print-include]{display:flex!important;flex-wrap:wrap;gap:10px;margin-bottom:15px}
[data-print-include]>*{flex:1;min-width:100px;padding:8px 12px!important;border:1px solid #eee!important;border-radius:4px!important;background:#fff!important;text-align:center}
[data-print-include] *{color:#000!important;background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;margin:0!important}
[data-print-include] svg{display:none!important}

/* ── Table ── */
.table-wrap{margin-top:10px}
table{width:100%;border-collapse:collapse;border:1px solid #ddd;font-size:10.5px;background:#fff!important}
thead tr{background:#f8f9fa!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
th{padding:8px 8px;font-size:10px;font-weight:800;color:#000!important;text-align:center;border:1px solid #ddd;background:#f8f9fa!important;white-space:nowrap;line-height:1.2;-webkit-print-color-adjust:exact;print-color-adjust:exact}
th:first-child{text-align:${firstColAlign}}
tbody tr{border-bottom: 1px solid #eee; background:#fff!important}
tbody tr:nth-child(any){background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
td{padding:6px 8px;font-size:10px;color:#000!important;text-align:center;border:1px solid #eee;vertical-align:middle;line-height:1.4;white-space:normal;overflow-wrap:break-word;word-break:break-word;background:#fff!important}
td:first-child{text-align:${firstColAlign};font-weight:700}
td span,td a,td div{font-size:inherit!important; color:#000!important}
td button{display:none!important}
td strong,td b{font-weight:800}
td span[style],td div[style]{-webkit-print-color-adjust:exact;print-color-adjust:exact; color:#000!important}
td[data-type="debit"],td[data-type="credit"],td[data-type="balance"]{font-weight:800!important}
tr.opening-balance td{background:#f8f9fa!important;font-weight:800!important;border-top:1px solid #ddd!important;border-bottom:1px solid #ddd!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
tfoot tr{background:#f8f9fa!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
tfoot td{font-weight:800;font-size:11px;color:#000!important;background:#f8f9fa!important;border:1px solid #ddd;padding:8px 8px;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}
tfoot td:first-child{text-align:${firstColAlign}}

@media print{
  @page{size:A4;margin:8mm 10mm}
  body{font-size:10px}
  .page{padding:0}
  th{padding:7px 5px!important}
  td{padding:5px 5px!important}
  thead{display:table-header-group}
  tfoot{display:table-footer-group}
  tbody tr{page-break-inside:avoid}
  table{page-break-inside:auto}
  [data-print-include]{page-break-inside:avoid}
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
    ${accountName ? `<div class="rpt-info-row"><span class="rpt-info-lbl">${labelAccount}</span><span class="rpt-info-val">${accountName}</span></div>` : ''}
    ${dateRange ? `<div class="rpt-info-row"><span class="rpt-info-lbl">${labelPeriod}</span><span class="rpt-info-val">${dateRange}</span></div>` : ''}
    <div class="rpt-info-row" style="margin-inline-start: auto;">
      <span class="rpt-info-lbl">${isRtl ? 'بتاريخ:' : 'Date:'}</span>
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
