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
    const printDateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    let printTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    // Convert AM/PM to ص/م for cultural alignment
    printTimeStr = printTimeStr.toLowerCase().replace('am', isRtl ? 'ص' : 'AM').replace('pm', isRtl ? 'م' : 'PM');

    const isDateRange = printDate && (printDate.includes('من') || printDate.includes('إلى') || printDate.includes('/') || printDate.includes('-'));
    const accountName = manualAccountName || (printDate && !isDateRange ? printDate : '');
    const dateRange = isDateRange ? printDate : '';

    const dir = isRtl ? 'rtl' : 'ltr';
    const firstColAlign = isRtl ? 'right' : 'left';
    const lastColAlign = isRtl ? 'right' : 'left';
    const labelPrintDate = isRtl ? 'التاريخ:' : 'Date:';
    const labelPeriod = isRtl ? 'الفترة:' : 'Period:';
    const labelAccount = isRtl ? 'الحساب:' : 'Account:';
    const labelCode = isRtl ? 'الكود:' : 'Code:';
    
    // Currency Detection & Processing
    const symbols = ['ج.م', 'ر.س', 'د.إ', '$', 'د.ك', 'ر.ق', 'د.ب', 'ر.ع', 'د.أ', 'EGP', 'SAR', 'AED', 'USD'];
    const currencySym = co.currencySymbol || co.currency || (isRtl ? 'ر.س' : 'SAR');

    const includeEls = Array.from(document.querySelectorAll('[data-print-include]'));
    const includeHTML = includeEls.map(el => {
        const cards = Array.from(el.children).map(child => {
            const label = child.querySelector('.stat-label')?.textContent || child.querySelector('span:first-child')?.textContent || '';
            const valueRaw = (child.querySelector('.stat-value')?.textContent || child.querySelector('span:last-child')?.textContent || '').trim();
            // Check if value already has currency
            const hasCurrency = /[a-zA-Z\u0600-\u06FF]/.test(valueRaw);
            const valueFinal = hasCurrency ? valueRaw : `${valueRaw} ${currencySym}`;
            return `<div class="stat-card"><span class="lbl">${label}</span><span class="val">${valueFinal}</span></div>`;
        }).join('');
        return `<div class="rpt-stats">${cards}</div>`;
    }).join('');

    const processedTablesHTML = Array.from(document.querySelectorAll('table')).map(originalTbl => {
        const tbl = originalTbl.cloneNode(true) as HTMLTableElement;
        Array.from(tbl.querySelectorAll('tr')).forEach(row => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            cells.forEach((cell, idx) => {
                const text = (cell.textContent || '').trim();
                const isHeader = cell.tagName === 'TH';
                
                // Only add currency if it's a number and doesn't already have symbols or letters
                const hasLetters = /[a-zA-Z\u0600-\u06FF]/.test(text);
                const isNumeric = /^-?\d+/.test(text.replace(/,/g, ''));

                if (!isHeader && isNumeric && !hasLetters && idx >= 4) {
                    cell.innerHTML = `<span style="font-weight:700">${text}</span> <small style="font-size:8px; opacity:0.8">${currencySym}</small>`;
                }
            });
        });
        return tbl.outerHTML;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<title>${reportTitle}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',sans-serif;direction:${dir};background:#fff;color:#000!important;font-size:10px;line-height:1.3;-webkit-print-color-adjust:exact;print-color-adjust:exact}
/* ── Page ── */
.page{padding:5mm 8mm}

/* ── Header: Premium Invoice Style ── */
.rpt-header { 
    display: flex; 
    justify-content: space-between; 
    align-items: flex-end; 
    padding-bottom: 8px; 
    border-bottom: 2px solid #000; 
    margin-bottom: 12px; 
}
.rpt-logo img { max-height: 55px; max-width: 160px; object-fit: contain; }
.rpt-logo-text { font-size: 20px; font-weight: 900; }

.rpt-box { 
    background: #fbfbfb; 
    border: 1px solid #ddd; 
    border-radius: 6px; 
    padding: 8px 12px; 
    margin-bottom: 12px; 
}
.rpt-title { 
    font-size: 15px; 
    font-weight: 950; 
    display: block; 
    margin-bottom: 6px; 
    border-bottom: 1px solid #eee;
    padding-bottom: 4px;
}
.rpt-grid { 
    display: grid; 
    grid-template-columns: repeat(3, 1fr); 
    gap: 8px 15px; 
}
.rpt-item { display: flex; flex-direction: column; gap: 1px; }
.rpt-lbl { font-size: 7.5px; font-weight: 800; color: #555; text-transform: uppercase; }
.rpt-val { font-size: 10px; font-weight: 900; color: #000; }

/* ── Stats Summary ── */
.rpt-stats { 
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px; 
    margin-bottom: 12px; 
}
.stat-card { 
    border: 1px solid #ccc; 
    background: #fff; 
    padding: 6px; 
    border-radius: 4px; 
    text-align: center;
}
.stat-card .lbl { font-size: 8.5px; font-weight: 800; color: #666; margin-bottom: 2px; display: block; }
.stat-card .val { font-size: 11px; font-weight: 900; color: #000; }

/* ── Table ── */
table { width: 100%; border-collapse: collapse; margin-top: 5px; }
th { 
    background: #eee !important; 
    border: 1px solid #000; 
    padding: 8px 5px; 
    font-size: 10px; 
    font-weight: 900; 
    text-align: center;
}
td { 
    border: 1px solid #bbb; 
    padding: 5px 7px; 
    font-size: 10.5px; 
    text-align: center;
    vertical-align: middle;
}
tr.opening-balance td { background: #f5f5f5 !important; font-weight: 900; text-decoration: underline; }
tfoot tr { background: #eee !important; }
tfoot td { border: 1px solid #000; font-weight: 950; font-size: 12px; }

@media print {
    @page { size: A4; margin: 5mm; }
    .page { padding: 0; }
    .no-print { display: none !important; }
}
</style>
</head>
<body>
<div class="page">

<div class="rpt-header">
  <div class="rpt-logo">
    ${logo ? `<img src="${logo}" alt=""/>` : `<div class="rpt-logo-text">${companyName}</div>`}
  </div>
</div>

<div class="rpt-box">
  <span class="rpt-title">${reportTitle}</span>
  <div class="rpt-grid">
     <div class="rpt-item">
        <span class="rpt-lbl">${labelAccount}</span>
        <span class="rpt-val">${accountName || '—'}</span>
     </div>
     <div class="rpt-item">
        <span class="rpt-lbl">${labelPrintDate}</span>
        <span class="rpt-val" style="direction: ltr;">${printDateStr} — ${printTimeStr}</span>
     </div>
     <div class="rpt-item">
        <span class="rpt-lbl">${labelPeriod}</span>
        <span class="rpt-val">${dateRange || '—'}</span>
     </div>
     ${printCode ? `<div class="rpt-item"><span class="rpt-lbl">${labelCode}</span><span class="rpt-val">${printCode}</span></div>` : ''}
  </div>
</div>

${includeHTML}

<div class="table-wrap">${processedTablesHTML}</div>

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
