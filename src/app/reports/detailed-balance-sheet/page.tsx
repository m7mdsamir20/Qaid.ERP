'use client';
import { formatNumber } from '@/lib/currency';
import ContentSkeleton from '@/components/ContentSkeleton';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { Currency } from '@/components/Currency';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { useSession } from 'next-auth/react';
import { Landmark, Scale, Sigma, AlertCircle, Info } from 'lucide-react';
import { C, CAIRO, OUTFIT, PAGE_BASE } from '@/constants/theme';
import { printReportDirectly, downloadReportPDF } from '@/lib/printDirectly';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = {
        'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$',
        'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ'
    };
    return map[code] || code;
};

interface BalanceSheetRow {
    code: string;
    name: string;
    balance: number;
}

interface BalanceSheetData {
    assets: BalanceSheetRow[];
    liabilities: BalanceSheetRow[];
    equities: BalanceSheetRow[];
    totalAssets: number;
    totalLiabilities: number;
    totalEquities: number;
    totalLiabilitiesAndEquities: number;
    netIncome: number;
}

export default function DetailedBalanceSheetPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [data, setData] = useState<BalanceSheetData | null>(null);
    const [loading, setLoading] = useState(true);
    const [company, setCompany] = useState<any>({});

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reports/balance-sheet');
            if (res.ok) {
                const d = await res.json();
                if (!d.error) setData(d);
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetch('/api/company')
            .then(r => r.json())
            .then(d => { if (d && !d.error) setCompany(d); })
            .catch(() => {});
    }, []);

    const isBalanced = data ? Math.abs(data.totalAssets - data.totalLiabilitiesAndEquities) < 0.01 : false;

    const buildDetailedBalanceSheetHTML = () => {
        if (!data) return '';
        const dir = isRtl ? 'rtl' : 'ltr';
        const fAlign = isRtl ? 'right' : 'left';
        const now = new Date();
        const toWD = (s: string) => s.replace(/[\u0660-\u0669]/g, (d: string) => String(t("٠١٢٣٤٥٦٧٨٩").indexOf(d)));
        const printDate = now.toLocaleDateString('en-ZA');
        const printTime = toWD(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }));
        const logo = company.logo || company.companyLogo || '';
        const companyName = company.companyName || company.name || '';
        const sym = t(getCurrencyName(currency));

        const assetsRowsHTML = data.assets.length === 0
            ? `<tr><td colspan="3" style="padding:6px 8px;text-align:${fAlign};color:#000;">${t('لا توجد أصول مسجلة')}</td></tr>`
            : data.assets.map(a => `<tr>
                <td style="padding:4px 6px;font-size:9.5px;border:1px solid #ddd;text-align:center">${a.code}</td>
                <td style="padding:4px 6px;font-size:10px;font-weight:600;border:1px solid #ddd;text-align:${fAlign}">${a.name}</td>
                <td style="padding:4px 6px;font-size:10px;font-weight:700;border:1px solid #ddd;text-align:center">${formatNumber(a.balance)} <span style="font-family:Cairo,sans-serif;font-size:8.5px">${sym}</span></td>
            </tr>`).join('');

        const assetsFooter = `
            <tr style="background:#e0e0e0;border-top:2px solid #bbb">
                <td colspan="2" style="padding:5px 6px;font-weight:700;font-size:10.5px;border:1px solid #ccc;text-align:${fAlign};color:#000">${t('إجمالي الأصول')}</td>
                <td style="padding:5px 6px;font-weight:950;font-size:11px;border:1px solid #ccc;text-align:center;color:#000">${formatNumber(data.totalAssets)} <span style="font-family:Cairo,sans-serif;font-size:9px">${sym}</span></td>
            </tr>`;

        const liabilitiesRowsHTML = data.liabilities.length === 0
            ? `<tr><td colspan="3" style="padding:6px 8px;text-align:${fAlign};color:#000;">${t('لا توجد التزامات جارية')}</td></tr>`
            : data.liabilities.map(a => `<tr>
                <td style="padding:4px 6px;font-size:9.5px;border:1px solid #ddd;text-align:center">${a.code}</td>
                <td style="padding:4px 6px;font-size:10px;font-weight:600;border:1px solid #ddd;text-align:${fAlign}">${a.name}</td>
                <td style="padding:4px 6px;font-size:10px;font-weight:700;border:1px solid #ddd;text-align:center">${formatNumber(a.balance)} <span style="font-family:Cairo,sans-serif;font-size:8.5px">${sym}</span></td>
            </tr>`).join('');

        const liabilitiesFooter = `
            <tr style="background:#e0e0e0;border-top:1px solid #bbb">
                <td colspan="2" style="padding:5px 6px;font-weight:700;font-size:10.5px;border:1px solid #ccc;text-align:${fAlign};color:#000">${t('إجمالي الخصوم')}</td>
                <td style="padding:5px 6px;font-weight:900;font-size:11px;border:1px solid #ccc;text-align:center;color:#000">${formatNumber(data.totalLiabilities)} <span style="font-family:Cairo,sans-serif;font-size:9px">${sym}</span></td>
            </tr>`;

        const equitiesRowsHTML = [
            ...data.equities,
            { code: '—', name: t('صافي الربح / الخسارة'), balance: data.netIncome }
        ].map(a => {
            const isNetIncome = a.code === '—';
            const valColor = '#000';
            return `<tr>
                <td style="padding:4px 6px;font-size:9.5px;border:1px solid #ddd;text-align:center">${a.code}</td>
                <td style="padding:4px 6px;font-size:10px;font-weight:600;border:1px solid #ddd;text-align:${fAlign};color:${isNetIncome ? '#000' : '#555'}">${a.name}</td>
                <td style="padding:4px 6px;font-size:10px;font-weight:700;border:1px solid #ddd;text-align:center;color:${valColor}">${formatNumber(a.balance)} <span style="font-family:Cairo,sans-serif;font-size:8.5px">${sym}</span></td>
            </tr>`;
        }).join('');

        const equitiesFooter = `
            <tr style="background:#e0e0e0;border-top:1px solid #bbb">
                <td colspan="2" style="padding:5px 6px;font-weight:700;font-size:10.5px;border:1px solid #ccc;text-align:${fAlign};color:#000">${t('إجمالي حقوق الملكية')}</td>
                <td style="padding:5px 6px;font-weight:950;font-size:11px;border:1px solid #ccc;text-align:center;color:#000">${formatNumber(data.totalEquities)} <span style="font-family:Cairo,sans-serif;font-size:9px">${sym}</span></td>
            </tr>`;

        const renderTableCard = (title: string, color: string, headerBg: string, borderColor: string, rowsHtml: string, footerHtml: string) => `
            <div style="border:1px solid ${borderColor};border-radius:4px;overflow:hidden;margin-bottom:8px;background:#fff">
                <div style="padding:5px 10px;background:${headerBg};border-bottom:1px solid ${borderColor};font-weight:700;font-size:11px;color:${color};text-align:${fAlign}">${title}</div>
                <table style="width:100%;border-collapse:collapse">
                    <thead><tr style="background:#f5f5f5">
                        <th style="padding:4px 6px;font-size:9px;font-weight:700;border:1px solid ${borderColor};width:80px;text-align:center">${t('كود الحساب')}</th>
                        <th style="padding:4px 6px;font-size:9px;font-weight:700;border:1px solid ${borderColor};text-align:${fAlign}">${t('اسم الحساب')}</th>
                        <th style="padding:4px 6px;font-size:9px;font-weight:700;border:1px solid ${borderColor};width:120px;text-align:center">${t('الرصيد')}</th>
                    </tr></thead>
                    <tbody>${rowsHtml}</tbody>
                    <tfoot>${footerHtml}</tfoot>
                </table>
            </div>`;

        return `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<title>${t('الميزانية العمومية التفصيلية')}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Cairo',sans-serif;direction:${dir};font-size:10px;line-height:1.4}
.page{padding:4mm 6mm;width:100%;margin:0 auto}
.rpt-header{display:grid;grid-template-columns:130px 1fr 130px;align-items:center;padding-bottom:4px;border-bottom:2px solid #000;margin-bottom:6px;direction:ltr}
.rpt-logo img{max-height:45px;max-width:120px;object-fit:contain}
.rpt-logo-text{font-size:14px;font-weight:900;color:#000}
.rpt-title-block{text-align:center;direction:${dir}}
.rpt-title{font-size:15px;font-weight:900;color:#000;margin-bottom:2px}
.rpt-meta{font-size:9.5px;color:#000;display:flex;justify-content:center;gap:20px;flex-wrap:wrap}
.rpt-meta b{color:#000;font-weight:800}
@media print{
  @page{size:A4 landscape;margin:4mm 6mm}
  body{
    background: #fff !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    display: block !important;
  }
  .page{
    padding:0 !important;
    width: 95% !important;
    max-width: 285mm !important;
    margin: 0 auto !important;
    display: block !important;
  }
}
</style>
</head>
<body>
<div class="page">
<div class="rpt-header">
  <div class="rpt-logo">${logo ? `<img src="${logo}" alt=""/>` : `<div class="rpt-logo-text">${companyName}</div>`}</div>
  <div class="rpt-title-block">
    <div class="rpt-title">${t('الميزانية العمومية التفصيلية')}</div>
    <div class="rpt-meta">
      <span>${isRtl ? t("طُبع:") : 'Printed:'} <b>${printDate} — ${printTime}</b></span>
    </div>
  </div>
  <div></div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start">
  <div>
    ${renderTableCard(t('الأصول'), '#000', '#f0f0f0', '#bbb', assetsRowsHTML, assetsFooter)}
  </div>
  <div style="display:flex;flex-direction:column;gap:8px">
    ${renderTableCard(t('الخصوم'), '#000', '#f0f0f0', '#bbb', liabilitiesRowsHTML, liabilitiesFooter)}
    ${renderTableCard(t('حقوق الملكية'), '#000', '#f0f0f0', '#bbb', equitiesRowsHTML, equitiesFooter)}
    
    <div style="padding:8px 12px;background:#e0e0e0;border:1.5px solid #bbb;border-radius:4px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:11px;font-weight:700;color:#000">${t('إجمالي الخصوم وحقوق الملكية')}</span>
      <span style="font-size:12.5px;font-weight:900;color:#000">${formatNumber(data.totalLiabilitiesAndEquities)} <span style="font-family:Cairo,sans-serif;font-size:9.5px">${sym}</span></span>
    </div>
  </div>
</div>

<div style="margin-top:8px;padding:6px 10px;background:#f9f9f9;border:1px solid #ccc;border-radius:4px;display:flex;align-items:center">
  <span style="font-size:10.5px;color:#000;font-weight:700">
    ${isBalanced 
      ? `<span style="color:#000;font-weight:900">✓ ${t('الميزانية متزنة تفصيلياً: الأصول = الخصوم وحقوق الملكية')}</span>` 
      : `<span style="color:#000;font-weight:900">✗ ${t('الميزانية غير متزنة تفصيلياً')}</span>`
    }
    <span style="font-weight:normal;color:#555!important;margin-inline-start:10px">
      (${t('الأصول')}: ${formatNumber(data.totalAssets)} ${sym} | ${t('الخصوم وحقوق الملكية')}: ${formatNumber(data.totalLiabilitiesAndEquities)} ${sym})
    </span>
  </span>
</div>

</div>
</body>
</html>`;
    };

    const handlePrint = () => {
        const html = buildDetailedBalanceSheetHTML();
        if (!html) return;
        printReportDirectly(html, t('الميزانية العمومية التفصيلية'));
    };

    const handleDownloadPDF = async () => {
        const html = buildDetailedBalanceSheetHTML();
        if (!html) return;
        await downloadReportPDF(html, t('الميزانية العمومية التفصيلية'), { silent: true });
    };

    if (loading) { return <DashboardLayout><ContentSkeleton /></DashboardLayout>; }

    if (!data) return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader 
                    title={t("الميزانية العمومية التفصيلية")} 
                    subtitle={t("حدث خطأ أثناء محاولة جلب بيانات التقرير.")}
                    backTab="financial" 
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', textAlign: 'center', background: C.card, borderRadius: '24px', border: `1px solid ${C.border}` }}>
                    <AlertCircle size={60} style={{ opacity: 0.2, marginBottom: '20px' }} />
                    <h3 style={{ fontFamily: CAIRO }}>{t('خطأ في تحميل البيانات')}</h3>
                </div>
            </div>
        </DashboardLayout>
    );

    // Assets Table columns
    const assetsColumns: TableColumn[] = [
        {
            header: t('كود الحساب'),
            cell: (row: BalanceSheetRow) => (
                <span className="notranslate" translate="no" style={{ fontSize: '11px', fontFamily: OUTFIT, color: C.textSecondary, background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px' }}>{row.code}</span>
            ),
            style: { width: '100px' }
        },
        {
            header: t('اسم الحساب'),
            cell: (row: BalanceSheetRow) => row.name,
            style: { fontFamily: CAIRO, fontSize: '13px', fontWeight: 600, color: C.textSecondary }
        },
        {
            header: t('الرصيد'),
            type: 'number' as const,
            cell: (row: BalanceSheetRow) => <Currency amount={row.balance} />,
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: C.textPrimary, textAlign: 'center' } as React.CSSProperties
        }
    ];

    const assetsFooter = (
        <tr style={{ background: 'rgba(16, 185, 129, 0.08)', borderTop: `2px solid #10b98133` }}>
            <td colSpan={2} style={{ padding: '16px 24px', fontWeight: 600, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}>{t('إجمالي الأصول')}</td>
            <td style={{ padding: '16px 24px', fontWeight: 950, color: '#10b981', fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={data.totalAssets} /></td>
        </tr>
    );

    // Liabilities Table columns
    const liabilitiesColumns: TableColumn[] = [
        {
            header: t('كود الحساب'),
            cell: (row: BalanceSheetRow) => (
                <span className="notranslate" translate="no" style={{ fontSize: '11px', fontFamily: OUTFIT, color: C.textSecondary }}>{row.code}</span>
            ),
            style: { width: '100px' }
        },
        {
            header: t('اسم الحساب'),
            cell: (row: BalanceSheetRow) => row.name,
            style: { fontFamily: CAIRO, fontSize: '13px', fontWeight: 600, color: C.textSecondary }
        },
        {
            header: t('الرصيد'),
            type: 'number' as const,
            cell: (row: BalanceSheetRow) => <Currency amount={row.balance} />,
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: C.textPrimary, textAlign: 'center' } as React.CSSProperties
        }
    ];

    const liabilitiesFooter = (
        <tr style={{ background: 'rgba(251, 113, 133, 0.05)', borderTop: `1px solid #fb718533` }}>
            <td colSpan={2} style={{ padding: '12px 20px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي الخصوم')}</td>
            <td style={{ padding: '12px 20px', fontWeight: 600, color: '#fb7185', fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={data.totalLiabilities} /></td>
        </tr>
    );

    // Equities Table columns & virtual row
    const equitiesData: (BalanceSheetRow & { isNetIncome?: boolean })[] = [
        ...data.equities,
        {
            code: '—',
            name: t('صافي الربح / الخسارة'),
            balance: data.netIncome,
            isNetIncome: true
        }
    ];

    const equitiesColumns: TableColumn[] = [
        {
            header: t('كود الحساب'),
            cell: (row: any) => <span className="notranslate" translate="no">{row.code}</span>,
            style: { width: '100px' }
        },
        {
            header: t('اسم الحساب'),
            cell: (row: any) => (
                <span style={{ color: row.isNetIncome ? C.textPrimary : C.textSecondary }}>
                    {row.name}
                </span>
            ),
            style: { fontFamily: CAIRO, fontSize: '13px', fontWeight: 600 }
        },
        {
            header: t('الرصيد'),
            type: 'number' as const,
            cell: (row: any) => (
                <Currency 
                    amount={row.balance} 
                    style={row.isNetIncome ? { color: row.balance >= 0 ? '#10b981' : '#fb7185' } : undefined} 
                />
            ),
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: C.textPrimary, textAlign: 'center' } as React.CSSProperties
        }
    ];

    const equitiesFooter = (
        <tr style={{ background: 'rgba(37, 106, 244, 0.08)', borderTop: `1px solid #256af433` }}>
            <td colSpan={2} style={{ padding: '12px 20px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي حقوق الملكية')}</td>
            <td style={{ padding: '12px 20px', fontWeight: 950, color: '#256af4', fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={data.totalEquities} /></td>
        </tr>
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("الميزانية العمومية التفصيلية")}
                    subtitle={t("عرض شامل لموجودات الشركة (الأصول) والتزاماتها (الخصوم) وحقوق المساهمين.")}
                    backTab="financial"
                    printTitle={t("الميزانية التفصيلية")}
                    onPrint={handlePrint}
                    onExportPdf={handleDownloadPDF}
                />

                <div className="print-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                    {/* ASSETS SIDE */}
                    <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 24px', background: 'rgba(16, 185, 129, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981' }}>
                            <Landmark size={20} />
                            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('الأصول')}</h3>
                        </div>
                        <DataTable
                            columns={assetsColumns}
                            data={data.assets}
                            emptyIcon={Landmark}
                            emptyMessage={t('لا توجد أصول مسجلة')}
                            footer={assetsFooter}
                        />
                    </div>

                    {/* LIABILITIES & EQUITY SIDE */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Liabilities Table */}
                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', background: 'rgba(251, 113, 133, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px', color: '#fb7185' }}>
                                <Scale size={18} />
                                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('الخصوم')}</h3>
                            </div>
                            <DataTable
                                columns={liabilitiesColumns}
                                data={data.liabilities}
                                emptyIcon={Scale}
                                emptyMessage={t('لا توجد التزامات جارية')}
                                footer={liabilitiesFooter}
                            />
                        </div>

                        {/* Equity Table */}
                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', background: 'rgba(37, 106, 244, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px', color: '#256af4' }}>
                                <Sigma size={18} />
                                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('حقوق الملكية')}</h3>
                            </div>
                            <DataTable
                                columns={equitiesColumns}
                                data={equitiesData}
                                emptyIcon={Sigma}
                                emptyMessage={t('لا توجد حقوق ملكية مسجلة')}
                                rowStyle={(row) => row.isNetIncome ? { background: 'rgba(37, 106, 244, 0.02)' } : {}}
                                footer={equitiesFooter}
                            />
                        </div>

                        {/* Grand Total Row */}
                        <div style={{
                            padding: '16px 24px',
                            background: isBalanced ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            borderRadius: '16px',
                            border: `1.5px solid ${isBalanced ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                             <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('إجمالي الخصوم وحقوق الملكية')}</span>
                             <span style={{ fontSize: '18px', fontWeight: 950, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={data.totalLiabilitiesAndEquities} /></span>
                        </div>
                    </div>
                </div>

                <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '24px', padding: '14px 18px', background: 'rgba(255, 255, 255, 0.01)', border: `1px solid ${C.border}`, borderRadius: '12px' }}>
                    <Info size={16} style={{ color: C.primary }} />
                    <p style={{ margin: 0, fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>
                        {t('الميزانية متزنة تفصيلياً:')} <span style={{ color: C.success, fontWeight: 600 }}>{t('الأصول')} ({data.totalAssets > 0 ? formatNumber(data.totalAssets) : '0.00'})</span> = <span style={{ color: C.primary, fontWeight: 600 }}>{t('الخصوم وحقوق الملكية')} ({data.totalLiabilitiesAndEquities > 0 ? formatNumber(data.totalLiabilitiesAndEquities) : '0.00'})</span>
                    </p>
                </div>
            </div>

            <style>{`
                .print-only { display: none; }
                @media print {
                    .print-only { display: block !important; }
                    .no-print { display: none !important; }
                    .print-main-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 20px !important; }
                    .print-table-container { background: white !important; border: 1px solid #e2e8f0 !important; border-radius: 0 !important; }
                    div { background: #fff !important; border-color: #e2e8f0 !important; }
                    div, span, h2, h3, p, small { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}
