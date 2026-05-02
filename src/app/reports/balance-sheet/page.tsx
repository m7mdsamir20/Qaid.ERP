'use client';
import TableSkeleton from '@/components/TableSkeleton';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { useSession } from 'next-auth/react';
import { Landmark, Scale, Sigma, TrendingUp, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { C, CAIRO, OUTFIT, PAGE_BASE } from '@/constants/theme';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const fmt = (n: number) => formatNumber(n);

interface AccountLine {
    code: string;
    name: string;
    type: string;
    balance: number;
}

interface BalanceSheetData {
    assets: AccountLine[];
    liabilities: AccountLine[];
    equities: AccountLine[];
    netIncome: number;
    totalAssets: number;
    totalLiabilities: number;
    totalEquities: number;
    totalLiabilitiesAndEquities: number;
}

export default function BalanceSheetPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [data, setData] = useState<BalanceSheetData | null>(null);
    const [loading, setLoading] = useState(true);
    const [company, setCompany] = useState<any>({});
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        fetch('/api/company').then(r => r.json()).then(d => { if (d && !d.error) setCompany(d); }).catch(() => {});
        fetch('/api/branches').then(r => r.json()).then(d => { if (Array.isArray(d)) setBranches(d); }).catch(() => {});
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (branchId && branchId !== 'all') params.set('branchId', branchId);
            const res = await fetch(`/api/reports/balance-sheet?${params}`);
            if (res.ok) {
                setData(await res.json());
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [branchId]);

    const sym = getCurrencyName(currency);
    const isBalanced = data ? Math.abs(data.totalAssets - data.totalLiabilitiesAndEquities) < 0.01 : false;

    const handlePrint = () => {
        if (!data) return;
        const dir = isRtl ? 'rtl' : 'ltr';
        const fAlign = isRtl ? 'right' : 'left';
        const bAlign = isRtl ? 'left' : 'right';
        const now = new Date();
        const toWD = (s: string) => s.replace(/[٠-٩]/g, (d: string) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
        const printDate = now.toLocaleDateString('en-GB');
        const printTime = toWD(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }));
        const logo = company.logo || company.companyLogo || '';
        const companyName = company.companyName || company.name || '';

        const rowsHTML = (items: AccountLine[], emptyMsg: string) => items.length === 0
            ? `<tr><td colspan="3" style="padding:10px;text-align:${fAlign};color:#888;">${emptyMsg}</td></tr>`
            : items.map(a => `<tr>
                <td style="padding:8px 10px;font-size:11px;border:1px solid #ddd;text-align:${fAlign}">${a.name}</td>
                <td style="padding:8px 10px;font-size:10px;border:1px solid #ddd;text-align:${fAlign};color:#888">${a.code}</td>
                <td style="padding:8px 10px;font-size:11px;font-weight:700;border:1px solid #ddd;text-align:${fAlign}">${fmt(a.balance)} <span style="font-family:Cairo,sans-serif;font-size:9px">${sym}</span></td>
            </tr>`).join('');

        const totalRow = (label: string, value: number) => `
            <tr style="background:#e8e8e8">
                <td colspan="2" style="padding:9px 10px;font-size:12px;font-weight:900;border:1px solid #bbb;text-align:${fAlign}">${label}</td>
                <td style="padding:9px 10px;font-size:13px;font-weight:900;border:1px solid #bbb;text-align:${fAlign}">${fmt(value)} <span style="font-family:Cairo,sans-serif;font-size:10px">${sym}</span></td>
            </tr>`;

        const sectionTable = (title: string, items: AccountLine[], totalLabel: string, total: number, emptyMsg: string) => `
            <div style="margin-bottom:16px">
                <div style="background:#e8e8e8;padding:8px 12px;font-size:13px;font-weight:900;border:1px solid #bbb;border-bottom:none;text-align:${fAlign}">${title}</div>
                <table style="width:100%;border-collapse:collapse">
                    <thead><tr style="background:#f0f0f0">
                        <th style="padding:7px 10px;font-size:11px;font-weight:800;border:1px solid #bbb;text-align:${fAlign}">${isRtl ? 'الحساب' : 'Account'}</th>
                        <th style="padding:7px 10px;font-size:11px;font-weight:800;border:1px solid #bbb;text-align:${fAlign}">${isRtl ? 'الكود' : 'Code'}</th>
                        <th style="padding:7px 10px;font-size:11px;font-weight:800;border:1px solid #bbb;text-align:${fAlign}">${isRtl ? 'الرصيد' : 'Balance'}</th>
                    </tr></thead>
                    <tbody>${rowsHTML(items, emptyMsg)}${totalRow(totalLabel, total)}</tbody>
                </table>
            </div>`;

        const html = `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${dir}">
<head><meta charset="UTF-8"/>
<title>${t('المركز المالي')}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;color:#000!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Cairo',sans-serif;direction:${dir};font-size:11px;line-height:1.5}
.page{padding:8mm 12mm}
.rpt-header{display:grid;grid-template-columns:130px 1fr 130px;align-items:center;padding-bottom:10px;border-bottom:2px solid #000;margin-bottom:14px;direction:ltr}
.rpt-logo img{max-height:60px;max-width:120px;object-fit:contain}
.rpt-logo-text{font-size:16px;font-weight:900}
.rpt-title-block{text-align:center;direction:${dir}}
.rpt-title{font-size:17px;font-weight:900;margin-bottom:6px}
.rpt-meta{font-size:10.5px;display:flex;justify-content:center;gap:20px;flex-wrap:wrap}
.rpt-meta b{font-weight:800}
thead tr{background:#f0f0f0!important}
thead tr *{background:#f0f0f0!important}
tfoot tr,tr[style*="e8e8e8"]{background:#e8e8e8!important}
tfoot tr *,tr[style*="e8e8e8"] *{background:#e8e8e8!important}
@media print{@page{size:A4;margin:6mm 10mm}.page{padding:0}}
</style></head>
<body><div class="page">
<div class="rpt-header">
  <div class="rpt-logo">${logo ? `<img src="${logo}" alt=""/>` : `<div class="rpt-logo-text">${companyName}</div>`}</div>
  <div class="rpt-title-block">
    <div class="rpt-title">${t('المركز المالي (Balance Sheet)')}</div>
    <div class="rpt-meta"><span>${isRtl ? 'طُبع:' : 'Printed:'} <b>${printDate} — ${printTime}</b></span></div>
  </div>
  <div></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
  <div>${sectionTable(t('الأصول (Assets)'), data.assets, t('إجمالي الأصول'), data.totalAssets, t('لا توجد أصول'))}</div>
  <div>
    ${sectionTable(t('الخصوم (Liabilities)'), data.liabilities, t('إجمالي الخصوم'), data.totalLiabilities, t('لا توجد خصوم'))}
    ${sectionTable(t('حقوق الملكية (Equity)'), [...data.equities, { code: '—', name: t('صافي دخل الفترة'), type: '', balance: data.netIncome }], t('إجمالي حقوق الملكية'), data.totalEquities, t('لا توجد حقوق ملكية'))}
  </div>
</div>
<div style="margin-top:12px;padding:12px 16px;background:#f0f0f0!important;border:2px solid #bbb;display:flex;justify-content:space-between;align-items:center">
  <span style="font-size:13px;font-weight:900">${t('إجمالي الخصوم + حقوق الملكية')}</span>
  <span style="font-size:15px;font-weight:900">${fmt(data.totalLiabilitiesAndEquities)} <span style="font-family:Cairo,sans-serif;font-size:11px">${sym}</span></span>
</div>
</div></body></html>`;
        sessionStorage.setItem('print_report_html', html);
        sessionStorage.setItem('print_report_title', t('المركز المالي'));
        window.open('/print/report', '_blank');
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("المركز المالي (Balance Sheet)")}
                    subtitle={t("يعرض الموقف المالي للشركة من حيث الأصول، الخصوم، وحقوق الملكية في تاريخ محدد.")}
                    backTab="financial"
                    onPrint={handlePrint}
                />

                {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                    <div className="no-print" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center' }}>
                        <div style={{ minWidth: '220px' }}>
                            <CustomSelect
                                value={branchId}
                                onChange={(v: string) => setBranchId(v)}
                                placeholder={t('كل الفروع')}
                                hideSearch
                                style={{ background: C.card, border: `1px solid ${C.border}` }}
                                options={[
                                    { value: 'all', label: t('كل الفروع') },
                                    ...branches.map((b) => ({ value: b.id, label: b.name }))
                                ]}
                            />
                        </div>
                    </div>
                )}

                {loading ? ( <TableSkeleton /> ) : !data || (data.assets.length === 0 && data.liabilities.length === 0 && data.equities.length === 0) ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '20px', textAlign: 'center'}}>
                         <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Scale size={40} style={{ opacity: 0.2, color: C.textSecondary }} />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد أرصدة متاحة')}</h3>
                        <p style={{ fontSize: '13px', color: C.textSecondary, maxWidth: '400px', lineHeight: 1.6, fontFamily: CAIRO }}>{t('المشروع بانتظار استكمال القيد الافتتاحي أو ترحيل الحركات التأسيسية')}</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        

                        {/* Balance Verification Banner */}
                        <div className="no-print" style={{ 
                            padding: '12px 20px', 
                            background: isBalanced ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            border: `1px solid ${isBalanced ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {isBalanced ? <CheckCircle2 size={18} color={C.success} /> : <AlertCircle size={18} color={C.danger} />}
                                <span style={{ fontSize: '13px', fontWeight: 600, color: isBalanced ? C.success : C.danger, fontFamily: CAIRO }}>
                                    {isBalanced ? t('معادلة المركز المالي متزنة') : t('يوجد خلل في توازن المركز المالي')}
                                </span>
                            </div>
                            <div style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>
                                {t('الأصول = الخصوم + حقوق الملكية')}
                            </div>
                        </div>

                        <div className="print-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'stretch' }}>
                            {/* Assets Column */}
                            <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '20px 24px', background: 'rgba(37, 106, 244, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '12px', color: '#256af4' }}>
                                    <Landmark size={20} />
                                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('الأصول (Assets)')}</h3>
                                </div>
                                <div style={{ padding: '16px', flex: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {data.assets.map(a => (
                                            <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '10px', fontFamily: OUTFIT, color: C.textSecondary, background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px' }}>{a.code}</span>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{a.name}</span>
                                                </div>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={a.balance} /></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ padding: '20px 24px', background: 'rgba(37, 106, 244, 0.08)', borderTop: `2px solid #256af433`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('إجمالي الأصول')}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 950, color: '#256af4', fontFamily: OUTFIT }}><Currency amount={data.totalAssets} /></span>
                                </div>
                            </div>

                            {/* Right Column: Liabilities & Equities */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Liabilities */}
                                <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px' }}>
                                    <div style={{ padding: '16px 20px',  background: 'rgba(251, 113, 133, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '12px', color: '#fb7185' }}>
                                        <Scale size={18} />
                                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('الخصوم (Liabilities)')}</h3>
                                    </div>
                                    <div style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {data.liabilities.map(l => (
                                                <div key={l.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{l.name}</span>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={l.balance} /></span>
                                                </div>
                                            ))}
                                            {data.liabilities.length === 0 && <div style={{ padding: '12px', textAlign: 'center', color: C.textMuted, fontSize: '11px', fontFamily: CAIRO }}>{t('لا توجد التزامات')}</div>}
                                        </div>
                                    </div>
                                    <div style={{ padding: '14px 20px',  background: 'rgba(251, 113, 133, 0.05)', borderTop: `1px solid #fb718533`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي الخصوم')}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#fb7185', fontFamily: OUTFIT }}><Currency amount={data.totalLiabilities} /></span>
                                    </div>
                                </div>

                                {/* Equities */}
                                <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px' }}>
                                    <div style={{ padding: '16px 20px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '12px', color: '#10b981' }}>
                                        <Sigma size={18} />
                                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('حقوق الملكية (Equity)')}</h3>
                                    </div>
                                    <div style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {data.equities.map(e => (
                                                <div key={e.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{e.name}</span>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{fmt(e.balance)}</span>
                                                </div>
                                            ))}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(37, 106, 244, 0.05)', borderRadius: '8px', border: '1px solid #256af433', marginTop: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <TrendingUp size={14} color="#256af4" />
                                                    <span style={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}>{t('صافي دخل الفترة')}</span>
                                                </div>
                                                <span style={{ fontWeight: 600, color: data.netIncome >= 0 ? '#10b981' : '#fb7185', fontSize: '13px', fontFamily: OUTFIT }}><Currency amount={data.netIncome} /></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '14px 20px',  background: 'rgba(16, 185, 129, 0.05)', borderTop: `1px solid #10b98133`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي حقوق الملكية')}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', fontFamily: OUTFIT }}><Currency amount={data.totalEquities} /></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Grand Total Row */}
                        <div style={{
                            padding: '24px 32px',
                            background: isBalanced ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            borderRadius: '16px',
                            border: `1px solid ${isBalanced ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <p style={{ fontSize: '12px', color: C.textSecondary, marginBottom: '4px', fontWeight: 600, fontFamily: CAIRO }}>{t('إجمالي الخصوم وحقوق الملكية')}</p>
                                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 950, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={data.totalLiabilitiesAndEquities} /></h2>
                            </div>
                            <div className="no-print" style={{ textAlign: 'center'}}>
                                <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '4px', fontFamily: CAIRO }}>{t('فرق التوازن')}</div>
                                <div style={{ fontWeight: 600, color: isBalanced ? C.success : C.danger, fontSize: '13px', fontFamily: OUTFIT }}><Currency amount={Math.abs(data.totalAssets - data.totalLiabilitiesAndEquities)} /></div>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                .print-only { display: none; }
                @media print {
                    .print-only { display: block !important; }
                    .no-print { display: none !important; }
                    .print-main-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 20px !important; }
                    .print-table-container { background: white !important; border: 1px solid #e2e8f0 !important; border-radius: 0 !important; }
                    div { background: #fff !important; border-color: #e2e8f0 !important; }
                    div, span, h2, h3, p, small { color: #000 !important; }
                    .stat-value { font-size: 11px !important; color: #000 !important; }
                    .stat-label { font-size: 9px !important; color: #666 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}

