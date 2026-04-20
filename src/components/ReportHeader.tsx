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
    const printDateStr = now.toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    const printTimeStr = now.toLocaleTimeString(isRtl ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' });

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
    const labelPeriod    = isRtl ? 'الفترة:'        : 'Period:';
    const labelAccount   = isRtl ? 'الحساب:'        : 'Account:';
    const labelCode      = isRtl ? 'الكود:'         : 'Code:';

    const html = `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<title>${reportTitle}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',sans-serif;direction:${dir};background:#fff;color:#000;font-size:11px;line-height:1.4}
.page{padding:8mm 10mm}

/* ── Header: logo only ── */
.rpt-header{display:flex;justify-content:center;align-items:center;padding-bottom:10px;border-bottom:2px solid #000;margin-bottom:10px}
.rpt-logo img{max-height:65px;max-width:140px;object-fit:contain}
.rpt-logo-text{font-size:18px;font-weight:900;color:#000;text-align:center}

/* ── Report info block ── */
.rpt-info{border:1px solid #ccc;border-radius:4px;padding:8px 12px;margin-bottom:10px;background:#f9f9f9}
.rpt-info-title{font-size:14px;font-weight:900;color:#000;text-align:center;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #ddd}
.rpt-info-rows{display:flex;flex-wrap:wrap;gap:4px 24px}
.rpt-info-row{display:flex;align-items:center;gap:4px;font-size:10.5px}
.rpt-info-lbl{font-weight:700;color:#444}
.rpt-info-val{color:#000;font-weight:600}

/* ── Stats (data-print-include) ── */
[data-print-include]{display:flex!important;flex-wrap:wrap;gap:8px;margin-bottom:10px}
[data-print-include]>*{flex:1;min-width:90px;padding:6px 10px!important;border:1px solid #ccc!important;border-radius:4px!important;background:#f9f9f9!important;text-align:center}
[data-print-include] *{color:#000!important;background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;margin:0!important}
[data-print-include] svg{display:none!important}

/* ── Table ── */
.table-wrap{margin-top:8px}
table{width:100%;border-collapse:collapse;border:1px solid #999;font-size:10.5px}
thead tr{background:#e8e8e8!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
th{padding:7px 9px;font-size:10px;font-weight:900;color:#000!important;text-align:center;border:1px solid #bbb;background:#e8e8e8!important;white-space:nowrap;line-height:1.3;-webkit-print-color-adjust:exact;print-color-adjust:exact}
th:first-child{text-align:${firstColAlign}}
tbody tr:nth-child(even){background:#f5f5f5!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
tbody tr:nth-child(odd){background:#fff}
td{padding:5px 9px;font-size:10.5px;color:#000;text-align:center;border:1px solid #ddd;vertical-align:middle;line-height:1.3;white-space:nowrap}
td:first-child{text-align:${firstColAlign};font-weight:600}
td span,td a,td div{color:inherit!important;background:transparent!important;border:none!important;padding:0!important;border-radius:0!important;font-size:inherit!important}
td strong,td b{font-weight:900}
td button{display:none!important}
td[data-type="debit"],td[data-type="credit"],td[data-type="balance"]{font-weight:800!important;color:#000!important}
tr.opening-balance td{background:#f0f0f0!important;font-weight:900!important;font-style:italic;border-top:1px solid #999!important;border-bottom:1px solid #999!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
tfoot tr{background:#e8e8e8!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
tfoot td{font-weight:900;font-size:11px;color:#000!important;background:#e8e8e8!important;border:1px solid #bbb;padding:6px 9px;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact}
tfoot td:first-child{text-align:${firstColAlign}}

@media print{
  @page{size:A4;margin:6mm 8mm}
  body{font-size:10px}
  .page{padding:0}
  th{font-size:9.5px!important;padding:5px 7px!important}
  td{font-size:9.5px!important;padding:4px 7px!important}
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
  <div class="rpt-logo">${logo ? `<img src="${logo}" alt=""/>` : `<div class="rpt-logo-text">${companyName}</div>`}</div>
</div>

<div class="rpt-info">
  <div class="rpt-info-title">${reportTitle}</div>
  <div class="rpt-info-rows">
    <div class="rpt-info-row"><span class="rpt-info-lbl">${labelPrintDate}</span><span class="rpt-info-val">${printDateStr} — ${printTimeStr}</span></div>
    ${dateRange ? `<div class="rpt-info-row"><span class="rpt-info-lbl">${labelPeriod}</span><span class="rpt-info-val">${dateRange}</span></div>` : ''}
    ${accountName ? `<div class="rpt-info-row"><span class="rpt-info-lbl">${labelAccount}</span><span class="rpt-info-val">${accountName}</span></div>` : ''}
    ${printCode ? `<div class="rpt-info-row"><span class="rpt-info-lbl">${labelCode}</span><span class="rpt-info-val">${printCode}</span></div>` : ''}
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
