'use client';
import { Currency } from '@/components/Currency';
import { formatNumber } from '@/lib/currency';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { useSession } from 'next-auth/react';
import { Calendar, RefreshCw, ShoppingCart, ArrowDownRight, ArrowUpRight, Activity, Landmark, Wallet, Loader2, BarChart3 } from 'lucide-react';
import { C, CAIRO, PAGE_BASE, OUTFIT, SEARCH_STYLE } from '@/constants/theme';
import { CompanyInfo } from '@/lib/printInvoices';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const fmt = (n: number) => formatNumber(n);

interface BranchOption {
    id: string;
    name: string;
}

interface TreasuryBalance {
    type: string;
    name: string;
    balance: number;
}

interface DailyReportData {
    totalSales: number;
    salesCount: number;
    receipts: number;
    payments: number;
    saleReturnsTotal: number;
    totalPurchases: number;
    purchaseReturnsTotal: number;
    totalCashBalance: number;
    totalBankBalance: number;
    treasuries: TreasuryBalance[];
}

export default function DailyReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState<DailyReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [company, setCompany] = useState<CompanyInfo>({});

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
        fetch('/api/settings').then(r => r.json()).then(d => setCompany(d.company || {})).catch(() => { });
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ date });
            if (branchId && branchId !== 'all') params.set('branchId', branchId);
            const res = await fetch(`/api/reports/daily-report?${params}`);
            if (res.ok) setData(await res.json());
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchReport(); }, [date, branchId]);

    const branchName = Array.isArray(branches) ? (branches.find(b => b.id === branchId)?.name || (branchId === 'all' ? t('كل الفروع') : '')) : '';
    const printDate = new Date(date).toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const sym = getCurrencyName(currency);
    const dir = isRtl ? 'rtl' : 'ltr';
    const fAlign = isRtl ? 'right' : 'left';
    const bAlign = isRtl ? 'left' : 'right';

    const handlePrint = () => {
        if (!data) return;
        const logo = (company as any)?.logo || (company as any)?.companyLogo || '';
        const companyName = (company as any)?.companyName || (company as any)?.name || '';
        const now = new Date();
        const toWesternDigits = (s: string) => s.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
        const nowStr = toWesternDigits(now.toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' }));
        const nowTime = toWesternDigits(now.toLocaleTimeString(isRtl ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' }));

        const kpis = [
            { label: t('إجمالي مبيعات اليوم'), value: fmt(data.totalSales) },
            { label: t('إجمالي المقبوضات'), value: fmt(data.receipts) },
            { label: t('إجمالي المدفوعات'), value: fmt(data.payments) },
            { label: t('صافي التدفق اليومي'), value: fmt(data.receipts - data.payments) },
        ];

        const kpiHTML = kpis.map(k => `
            <div style="flex:1;border:1px solid #bbb;border-radius:4px;padding:10px 12px;text-align:center;background:#f8f8f8;">
                <div style="font-size:10px;color:#555;font-weight:700;margin-bottom:6px;">${k.label}</div>
                <div style="font-size:13px;font-weight:900;color:#000;">${k.value} <span style="font-size:11px;font-weight:600;color:#000;">${sym}</span></div>
            </div>`).join('');

        const anaRow = (label: string, value: number, isTotal = false) => `
            <tr style="${isTotal ? 'background:#f5f5f5;' : ''}">
                <td style="padding:7px 8px;font-size:${isTotal ? '12' : '11'}px;font-weight:${isTotal ? 800 : 600};color:#000;text-align:${fAlign};border-bottom:1px solid #ddd;">${label}</td>
                <td style="padding:7px 8px;font-size:${isTotal ? '12' : '11'}px;font-weight:${isTotal ? 900 : 700};color:#000;text-align:${fAlign};border-bottom:1px solid #ddd;">${fmt(value)} <span style="font-size:10px;font-weight:600;color:#000;">${sym}</span></td>
            </tr>`;

        const treasuryRows = (data.treasuries || []).map(tr => `
            <tr>
                <td style="padding:7px 8px;font-size:11px;font-weight:600;color:#000;text-align:${fAlign};border-bottom:1px solid #ddd;">${tr.name} <span style="font-size:9.5px;color:#555;">(${tr.type === 'bank' ? (isRtl ? 'بنك' : 'Bank') : (isRtl ? 'خزينة' : 'Cash')})</span></td>
                <td style="padding:7px 8px;font-size:11px;font-weight:800;color:#000;text-align:${fAlign};border-bottom:1px solid #ddd;">${fmt(tr.balance)} <span style="font-size:10px;font-weight:600;color:#000;">${sym}</span></td>
            </tr>`).join('');

        const html = `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<title>${t('التقرير اليومي للمبيعات والتحصيلات')}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',sans-serif;direction:${dir};background:#fff;color:#000;font-size:11px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{padding:8mm 12mm}
.rpt-header{display:grid;grid-template-columns:130px 1fr 130px;align-items:center;padding-bottom:10px;border-bottom:2px solid #000;margin-bottom:12px;direction:ltr}
.rpt-logo img{max-height:60px;max-width:120px;object-fit:contain}
.rpt-logo-text{font-size:16px;font-weight:900;color:#000}
.rpt-title-block{text-align:center;direction:${dir}}
.rpt-title{font-size:15px;font-weight:900;color:#000;margin-bottom:6px}
.rpt-meta{font-size:10px;color:#000;display:flex;justify-content:center;gap:20px;flex-wrap:wrap}
.rpt-meta span{display:flex;align-items:center;gap:4px}
.rpt-meta b{color:#000;font-weight:800}
.kpi-row{display:flex;gap:8px;margin-bottom:14px}
.section-title{font-size:12px;font-weight:900;color:#000;padding:7px 10px;background:#f0f0f0;border:1px solid #ccc;border-radius:4px 4px 0 0;margin-bottom:0}
.section-wrap{border:1px solid #ccc;border-radius:0 0 6px 6px;overflow:hidden;margin-bottom:14px}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:0}
.two-col .col-divider{border-inline-end:1px solid #ddd}
table{width:100%;border-collapse:collapse}
.summary-row td:first-child{font-weight:900;font-size:12px}
.summary-row td:last-child{font-size:14px;font-weight:900}
.footer{margin-top:14px;padding-top:8px;border-top:1px solid #ccc;font-size:9.5px;color:#000;display:flex;justify-content:space-between}
@media print{
  @page{size:A4;margin:6mm 10mm}
  .page{padding:0}
  body{font-size:10.5px}
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
    <div class="rpt-title">${t('التقرير اليومي للمبيعات والتحصيلات')}</div>
    <div class="rpt-meta">
      <span>${isRtl ? 'تاريخ التقرير:' : 'Report Date:'} <b>${printDate}</b></span>
      ${branchName ? `<span>${isRtl ? 'الفرع:' : 'Branch:'} <b>${branchName}</b></span>` : ''}
      <span>${isRtl ? 'طُبع:' : 'Printed:'} <b>${nowStr} — ${nowTime}</b></span>
    </div>
  </div>
  <div></div>
</div>

<!-- KPI Cards -->
<div class="kpi-row">${kpiHTML}</div>

<!-- Commercial Analysis -->
<div class="section-title">${t('التحليل التجاري التفصيلي')}</div>
<div class="section-wrap">
  <div class="two-col">
    <div class="col-divider" style="padding:4px 8px">
      <table>
        <thead><tr><td colspan="2" style="padding:8px 6px;font-size:11px;font-weight:900;color:#000;border-bottom:1px solid #ddd;">${t('المبيعات')}</td></tr></thead>
        <tbody>
          ${anaRow(t('إجمالي قيمة المبيعات'), data.totalSales)}
          ${anaRow(t('المرتجعات الواردة') + ' (-)', data.saleReturnsTotal)}
          ${anaRow(t('صافي المبيعات'), data.totalSales - data.saleReturnsTotal, true)}
          ${anaRow(t('إجمالي المقبوضات'), data.receipts)}
          ${anaRow(t('عدد الفواتير'), data.salesCount)}
        </tbody>
      </table>
    </div>
    <div style="padding:4px 8px">
      <table>
        <thead><tr><td colspan="2" style="padding:8px 6px;font-size:11px;font-weight:900;color:#000;border-bottom:1px solid #ddd;">${t('المشتريات')}</td></tr></thead>
        <tbody>
          ${anaRow(t('إجمالي قيمة المشتريات'), data.totalPurchases)}
          ${anaRow(t('المرتجعات الصادرة') + ' (-)', data.purchaseReturnsTotal)}
          ${anaRow(t('صافي المشتريات'), data.totalPurchases - data.purchaseReturnsTotal, true)}
          ${anaRow(t('إجمالي المدفوعات'), data.payments)}
          ${anaRow(t('صافي التدفق اليومي'), data.receipts - data.payments, true)}
        </tbody>
      </table>
    </div>
  </div>
</div>

<!-- Treasuries & Banks -->
<div class="section-title">${t('أرصدة السيولة الحالية (الخزائن والبنوك)')}</div>
<div class="section-wrap">
  <table>
    <tbody>
      ${treasuryRows}
      <tr style="background:#f5f5f5;border-top:2px solid #999;">
        <td style="padding:10px 6px;font-size:12px;font-weight:900;text-align:${fAlign};">${isRtl ? 'إجمالي السيولة' : 'Total Liquidity'}</td>
        <td style="padding:10px 6px;font-size:14px;font-weight:900;color:#000;text-align:${bAlign};">${fmt(data.totalCashBalance + data.totalBankBalance)} <span style="font-size:11px;color:#000;">${sym}</span></td>
      </tr>
    </tbody>
  </table>
</div>


</div>
</body>
</html>`;

        sessionStorage.setItem('print_report_html', html);
        sessionStorage.setItem('print_report_title', t('التقرير اليومي للمبيعات والتحصيلات'));
        window.open('/print/report', '_blank');
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("التقرير اليومي للمبيعات والتحصيلات")}
                    subtitle={t("ملخص شامل لكافة العمليات المالية والتجارية التي تمت خلال اليوم.")}
                    backTab="financial"
                    branchName={branchName}
                    printDate={printDate}
                    onPrint={handlePrint}
                />

                <div className="no-print report-filter-bar" style={{ ...SEARCH_STYLE.container, marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="date-filter-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: '200px' }}>
                        <span className="date-label-desktop" style={{ color: C.textMuted, fontSize: '12px', fontFamily: CAIRO }}>{t('التاريخ')}</span>
                        <div className="date-input-wrapper" style={{ flex: 1 }}>
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t('التاريخ')}</span>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                style={{
                                    width: '100%', height: '36px', padding: '0 12px', textAlign: 'start', direction: 'inherit',
                                    borderRadius: '8px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textSecondary, fontSize: '13px',
                                    fontWeight: 500, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                    </div>

                    <div className="branch-filter-wrapper" style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 2, flexWrap: 'wrap' }}>
                        {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <CustomSelect
                                    value={branchId}
                                    onChange={v => setBranchId(v)}
                                    hideSearch
                                    placeholder={t("كل الفروع")}
                                    options={[
                                        { value: 'all', label: t('كل الفروع') },
                                        ...branches.map((b) => ({ value: b.id, label: b.name }))
                                    ]}
                                />
                            </div>
                        )}
                        <button onClick={fetchReport} className="update-btn" style={{
                            height: '36px', padding: '0 20px', borderRadius: '8px',
                            background: C.primary, color: '#fff', border: 'none',
                            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO,
                            justifyContent: 'center', whiteSpace: 'nowrap'
                        }}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t('تحديث العرض')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', flexDirection: 'column', gap: '16px', color: '#475569' }}>
                        <Loader2 size={42} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                        <span style={{ fontWeight: 600, fontFamily: CAIRO }}>{t('جاري استخراج وتحليل البيانات اليومية...')}</span>
                    </div>
                ) : data && (
                    <>
                        {/* Summary Cards */}
                        <div data-print-include className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: t('إجمالي مبيعات اليوم'), value: data.totalSales, color: '#256af4', icon: <ShoppingCart size={18} /> },
                                { label: t('إجمالي المقبوضات'), value: data.receipts, color: '#10b981', icon: <ArrowDownRight size={18} /> },
                                { label: t('إجمالي المدفوعات'), value: data.payments, color: '#fb7185', icon: <ArrowUpRight size={18} /> },
                                { label: t('صافي التدفق اليومي'), value: data.receipts - data.payments, color: (data.receipts - data.payments) >= 0 ? '#10b981' : '#fb7185', icon: <Activity size={18} /> },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                    padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s', position: 'relative'
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = `${s.color}15`}
                                    onMouseLeave={e => e.currentTarget.style.background = `${s.color}08`}
                                >
                                    <div style={{ textAlign: 'start' }}>
                                        <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 6px', whiteSpace: 'nowrap', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <Currency amount={s.value} style={{ fontSize: '16px', color: C.textPrimary }} />
                                        </div>
                                    </div>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="report-grid responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
                            <div className="mobile-stack" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Commercial Analysis Table */}
                                <div data-print-include className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', padding: '24px' }}>
                                    <h3 style={{ fontSize: '13.5px', fontWeight: 600, color: C.textPrimary, marginBottom: '20px', borderBottom: `1px solid ${C.border}`, paddingBottom: '12px', fontFamily: CAIRO }}>
                                        {t('التحليل التجاري التفصيلي')}
                                    </h3>
                                    <div className="inner-report-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ padding: '12px 0', color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO, borderBottom: `1px solid ${C.border}44` }}>{t('إجمالي قيمة المبيعات')}</td>
                                                    <td style={{ padding: '12px 0', color: C.textPrimary, fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT, borderBottom: `1px solid ${C.border}44` }}><Currency amount={data.totalSales} /></td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '12px 0', color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO, borderBottom: `1px solid ${C.border}44` }}>{t('المرتجعات الواردة')} (-)</td>
                                                    <td style={{ padding: '12px 0', color: '#fb7185', fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT, borderBottom: `1px solid ${C.border}44` }}><Currency amount={data.saleReturnsTotal} /></td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '15px 0', color: C.textPrimary, fontWeight: 700, fontSize: '13px', fontFamily: CAIRO, }}>{t('صافي المبيعات')}</td>
                                                    <td style={{ padding: '15px 0', color: '#256af4', fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT, }}><Currency amount={data.totalSales - data.saleReturnsTotal} /></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ padding: '12px 0', color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO, borderBottom: `1px solid ${C.border}44` }}>{t('إجمالي قيمة المشتريات')}</td>
                                                    <td style={{ padding: '12px 0', color: C.textPrimary, fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT, borderBottom: `1px solid ${C.border}44` }}><Currency amount={data.totalPurchases} /></td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '12px 0', color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO, borderBottom: `1px solid ${C.border}44` }}>{t('المرتجعات الصادرة')} (-)</td>
                                                    <td style={{ padding: '12px 0', color: '#10b981', fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT, borderBottom: `1px solid ${C.border}44` }}><Currency amount={data.purchaseReturnsTotal} /></td>
                                                </tr>
                                                <tr>
                                                    <td style={{ padding: '15px 0', color: C.textPrimary, fontWeight: 700, fontSize: '13px', fontFamily: CAIRO, }}>{t('صافي المشتريات')}</td>
                                                    <td style={{ padding: '15px 0', color: '#f59e0b', fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT, }}><Currency amount={data.totalPurchases - data.purchaseReturnsTotal} /></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Liquidity Table */}
                                <div data-print-include className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', padding: '24px' }}>
                                    <h3 style={{ fontSize: '13.5px', fontWeight: 600, color: C.textPrimary, marginBottom: '20px', borderBottom: `1px solid ${C.border}`, paddingBottom: '12px', fontFamily: CAIRO }}>
                                        {t('أرصدة السيولة الحالية (الخزائن والبنوك)')}
                                    </h3>
                                    <div className="inner-report-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        {(data?.treasuries || []).map((tArr: any, i: number) => (
                                            <div key={i} style={{ padding: '16px', borderRadius: '10px', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: 28, height: 28, borderRadius: '8px', background: tArr.type === 'bank' ? 'rgba(37, 106, 244, 0.1)' : 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {tArr.type === 'bank' ? <Landmark size={15} color="#256af4" /> : <Wallet size={15} color="#10b981" />}
                                                    </div>
                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{tArr.name}</span>
                                                </div>
                                                <div style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={tArr.balance} /></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="sidebar-report no-print" style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ padding: '24px', background: 'linear-gradient(145deg, #1e1b4b, #312e81)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                                    <h4 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600, marginBottom: '20px', fontFamily: CAIRO }}>{t('إجمالي السيولة النقدية المتاحة')}</h4>
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ fontSize: '28px', fontWeight: 950, color: '#fff', fontFamily: OUTFIT }}><Currency amount={data.totalCashBalance + data.totalBankBalance} /></div>
                                    </div>
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#c7d2fe', fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{t('النقدية في الخزائن')}</span>
                                            <span style={{ color: '#fff', fontWeight: 600, fontSize: '12px', fontFamily: OUTFIT }}>{fmt(data.totalCashBalance)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#c7d2fe', fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{t('الأرصدة البنكية')}</span>
                                            <span style={{ color: '#fff', fontWeight: 600, fontSize: '12px', fontFamily: OUTFIT }}>{fmt(data.totalBankBalance)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ padding: '20px', background: C.card, borderRadius: '16px', border: `1px solid ${C.border}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: C.primary }}>
                                        <Activity size={18} />
                                        <span style={{ fontWeight: 600, fontSize: '12px', fontFamily: CAIRO }}>{t('دليل التقرير اليومي')}</span>
                                    </div>
                                    <p style={{ fontSize: '11px', color: C.textMuted, lineHeight: 1.6, margin: 0, fontFamily: CAIRO }}>
                                        {t('يقدم هذا التقرير قراءة شاملة للمركز النقدي المنفذ خلال اليوم التاريخ المختار. تعتمد الأرقام على الحركات المالية المسجلة فعلياً.')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            
        </DashboardLayout>
    );
}
