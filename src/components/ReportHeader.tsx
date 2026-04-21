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
  printLabel?: string;
  branchName?: string;
}

export default function ReportHeader({ title, subtitle, backTab, onExportExcel, onPrint, printTitle, printDate, accountName: manualAccountName, printLabel, branchName }: ReportHeaderProps) {
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
    const toWesternDigits = (s: string) => s.replace(/[٠-٩]/g, (d: string) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    const printDateStr = now.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const printTimeStr = toWesternDigits(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }));

    const isDateRange = printDate && (printDate.includes('من') || printDate.includes('إلى') || printDate.includes('/') || printDate.includes('-'));
    const accountName = manualAccountName || (printDate && !isDateRange ? printDate : '');
    const dateRange = isDateRange ? printDate : '';

    const allPrintable = Array.from(document.querySelectorAll('[data-print-include], .print-table-container'));
    const topLevelPrintable = allPrintable.filter(el => {
      let p = el.parentElement;
      while (p) {
        if (p.hasAttribute('data-print-include') || p.classList.contains('print-table-container')) return false;
        p = p.parentElement;
      }
      return true;
    });
    const stripStyles = (html: string) => html
      .replace(/ style="[^"]*"/g, '')
      .replace(/<svg[\s\S]*?<\/svg>/g, '')
      .replace(/<button[\s\S]*?<\/button>/g, '');

    // Rebuild [data-print-include] stat cards in daily-report KPI style
    const rebuildCards = (el: Element): string => {
      const cards = Array.from(el.children);
      const cardHTMLs = cards.map(card => {
        const getLeafTexts = (node: Element): string[] => {
          const results: string[] = [];
          node.childNodes.forEach(child => {
            if (child.nodeType === 3) {
              const t = child.textContent?.trim() || '';
              if (t) results.push(t);
            } else if (child.nodeType === 1) {
              results.push(...getLeafTexts(child as Element));
            }
          });
          return results;
        };
        const texts = getLeafTexts(card).filter(t => t !== '—');
        if (texts.length === 0) return '';
        const isNumeric = (s: string) => /^[\d,.\s٠-٩]+$/.test(s.replace(/[ر.سج.م\$د.إد.كر.قد.بر.عد.أ]/g, '').trim());
        const valueIdx = texts.findLastIndex(isNumeric);
        const valueTexts = valueIdx >= 0 ? texts.slice(valueIdx) : [];
        const labelTexts = texts.filter((_, i) => i < valueIdx);
        const label = (labelTexts.length ? labelTexts : texts.filter((_, i) => i !== valueIdx)).join(' ');
        const value = valueTexts.join(' ');
        return `<div style="flex:1;border:1px solid #bbb;border-radius:4px;padding:7px 10px;text-align:center;background:#f8f8f8;">
          <div style="font-size:8.5px;color:#555;font-weight:700;margin-bottom:4px;line-height:1.3">${label}</div>
          <div style="font-size:11px;font-weight:900;color:#000">${value}</div>
        </div>`;
      }).filter(Boolean);
      return `<div style="display:flex;gap:8px;margin-bottom:14px">${cardHTMLs.join('')}</div>`;
    };

    const includeHTML = topLevelPrintable.map(el => {
      if (el.hasAttribute('data-print-include')) return rebuildCards(el);
      return stripStyles(el.outerHTML);
    }).join('');

    const dir = isRtl ? 'rtl' : 'ltr';
    const firstColAlign = isRtl ? 'right' : 'left';
    const labelPeriod = isRtl ? 'الفترة:' : 'Period:';
    const labelAccount = printLabel || (isRtl ? 'تاريخ التقرير:' : 'Report Date:');
    const labelBranch = isRtl ? 'الفرع:' : 'Branch:';

    const metaItems = [
      accountName ? `<span>${labelAccount} <b>${accountName}</b></span>` : '',
      dateRange   ? `<span>${labelPeriod} <b>${dateRange}</b></span>` : '',
      branchName  ? `<span>${labelBranch} <b>${branchName}</b></span>` : '',
      `<span>${isRtl ? 'طُبع:' : 'Printed:'} <b>${printDateStr} — ${printTimeStr}</b></span>`,
    ].filter(Boolean).join('');

    const html = `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<title>${reportTitle}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;color:#000!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Cairo',sans-serif;direction:${dir};font-size:11px;line-height:1.5}
.page{padding:8mm 12mm}

/* ── Header ── */
.rpt-header{display:grid;grid-template-columns:130px 1fr 130px;align-items:center;padding-bottom:10px;border-bottom:2px solid #000;margin-bottom:14px;direction:ltr}
.rpt-logo img{max-height:60px;max-width:120px;object-fit:contain}
.rpt-logo-text{font-size:16px;font-weight:900}
.rpt-title-block{text-align:center;direction:${dir}}
.rpt-title{font-size:17px;font-weight:900;margin-bottom:6px}
.rpt-meta{font-size:10.5px;display:flex;justify-content:center;gap:20px;flex-wrap:wrap}
.rpt-meta span{display:flex;align-items:center;gap:4px}
.rpt-meta b{font-weight:800}

/* ── Stats cards (rebuilt via JS, CSS here is fallback only) ── */
[data-print-include] svg,.no-print{display:none!important}
.print-table-container{display:block!important;margin-bottom:16px;border:1px solid #bbb!important;border-radius:4px!important;overflow:hidden!important}

/* ── Tables ── */
table{width:100%;border-collapse:collapse;font-size:11px;table-layout:auto}
thead tr{background:#e0e0e0!important}
thead tr *{background:#e0e0e0!important}
th{padding:9px 8px;font-size:11px;font-weight:800;text-align:center;border:1px solid #bbb;white-space:nowrap}
th:first-child{text-align:${firstColAlign}}
th:last-child{}
tbody tr{border-bottom:1px solid #ddd}
tbody tr:nth-child(even){background:#fafafa!important}
tbody tr:nth-child(even) *{background:transparent!important}
td{padding:7px 8px;font-size:11px;text-align:center;border:1px solid #ddd;vertical-align:middle;line-height:1.5;white-space:nowrap}
td:first-child{text-align:${firstColAlign}}
td:last-child{}
td span,td a,td div{font-size:inherit!important;display:inline!important;white-space:nowrap;background:transparent!important;border:none!important;padding:0!important;border-radius:0!important}
td button{display:none!important}
td[data-type="debit"],td[data-type="credit"],td[data-type="balance"]{font-family:'Inter',sans-serif;min-width:65px;white-space:nowrap!important}
tr.opening-balance td{background:#f0f0f0!important;font-weight:700!important;border-top:1px solid #bbb!important;border-bottom:1px solid #bbb!important}
tfoot tr{background:#e0e0e0!important}
tfoot tr *{background:#e0e0e0!important}
tfoot td{font-weight:800;font-size:11.5px;border:1px solid #bbb;padding:8px 7px;white-space:nowrap}
tfoot td:first-child{text-align:${firstColAlign}}

@media print{
  @page{size:A4;margin:6mm 10mm}
  .page{padding:0}
}
</style>
</head>
<body>
<div class="page">

<div class="rpt-header">
  <div class="rpt-logo">
    ${logo ? `<img src="${logo}" alt=""/>` : `<div class="rpt-logo-text">${companyName}</div>`}
  </div>
  <div class="rpt-title-block">
    <div class="rpt-title">${reportTitle}</div>
    <div class="rpt-meta">${metaItems}</div>
  </div>
  <div></div>
</div>

${includeHTML}

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
