'use client';
import { Currency } from '@/components/Currency';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { useSession } from 'next-auth/react';
import { Landmark, Scale, Sigma, TrendingUp, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';
import { C, CAIRO, OUTFIT, PAGE_BASE } from '@/constants/theme';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const fmt = (n: number) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

    useEffect(() => { fetchData(); }, []);

    const exportToPDF = () => window.print();
    const sym = getCurrencyName(currency);

    const isBalanced = data ? Math.abs(data.totalAssets - data.totalLiabilitiesAndEquities) < 0.01 : false;

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: '16px' }}>
                <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                <span style={{ fontWeight: 600, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري توليد التقارير التفصيلية...')}</span>
            </div>
        </DashboardLayout>
    );

    if (!data) return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader 
                    title={t("الميزانية العمومية التفصيلية")} 
                    subtitle={t("حدث خطأ أثناء محاولة جلب بيانات التقرير.")}
                    backTab="financial" 
                />
                <div style={{ padding: '60px', textAlign: 'start', background: C.card, borderRadius: '24px', border: `1px solid ${C.border}` }}>
                    <AlertCircle size={60} style={{ opacity: 0.2, marginBottom: '20px' }} />
                    <h3 style={{ fontFamily: CAIRO }}>{t('خطأ في تحميل البيانات')}</h3>
                </div>
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("الميزانية العمومية التفصيلية")}
                    subtitle={t("عرض شامل لموجودات الشركة (الأصول) والتزاماتها (الخصوم) وحقوق المساهمين.")}
                    backTab="financial"
                    
                    printTitle={t("الميزانية التفصيلية (Detailed Balance Sheet)")}
                />

                <div className="print-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                    {/* ASSETS SIDE */}
                    <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 24px', background: 'rgba(16, 185, 129, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981' }}>
                            <Landmark size={20} />
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, fontFamily: CAIRO }}>{t('الأصول (Assets)')}</h3>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                {data.assets.map((a) => (
                                    <tr key={a.code} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }}>
                                        <td style={{ padding: '12px 16px', borderInlineStart: `1px solid ${C.border}` }}><span style={{ fontSize: '11px', fontFamily: OUTFIT, color: C.textMuted, background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px' }}>{a.code}</span></td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{a.name}</td>
                                        <td style={{ padding: '12px 16px',  fontWeight: 600, color: C.textPrimary, fontSize: '14px', fontFamily: OUTFIT }}><Currency amount={a.balance} /></td>
                                    </tr>
                                ))}
                                <tr style={{ background: 'rgba(16, 185, 129, 0.08)', borderTop: `2px solid #10b98133` }}>
                                    <td colSpan={2} style={{ padding: '16px 24px', fontWeight: 900, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{t('إجمالي الأصول')}</td>
                                    <td style={{ padding: '16px 24px',  fontWeight: 950, color: '#10b981', fontSize: '14px', fontFamily: OUTFIT }}><Currency amount={data.totalAssets} /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* LIABILITIES & EQUITY SIDE */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Liabilities Table */}
                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', background: 'rgba(251, 113, 133, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px', color: '#fb7185' }}>
                                <Scale size={18} />
                                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 900, fontFamily: CAIRO }}>{t('الخصوم (Liabilities)')}</h3>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {data.liabilities.map((l) => (
                                        <tr key={l.code} style={{ borderBottom: `1px solid ${C.border}` }}>
                                            <td style={{ padding: '10px 16px', borderInlineStart: `1px solid ${C.border}` }}><span style={{ fontSize: '11px', fontFamily: OUTFIT, color: C.textMuted }}>{l.code}</span></td>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{l.name}</td>
                                            <td style={{ padding: '10px 16px',  fontWeight: 600, color: C.textPrimary, fontSize: '14px', fontFamily: OUTFIT }}><Currency amount={l.balance} /></td>
                                        </tr>
                                    ))}
                                    {data.liabilities.length === 0 && <tr><td colSpan={3} style={{ padding: '16px',  color: C.textMuted, fontSize: '13px', fontFamily: CAIRO }}>{t('لا توجد التزامات جارية')}</td></tr>}
                                    <tr style={{ background: 'rgba(251, 113, 133, 0.05)', borderTop: `1px solid #fb718533` }}>
                                        <td colSpan={2} style={{ padding: '12px 20px', fontWeight: 900, color: C.textSecondary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{t('إجمالي الخصوم')}</td>
                                        <td style={{ padding: '12px 20px',  fontWeight: 900, color: '#fb7185', fontSize: '14px', fontFamily: OUTFIT }}><Currency amount={data.totalLiabilities} /></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Equity Table */}
                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', background: 'rgba(37, 106, 244, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px', color: '#256af4' }}>
                                <Sigma size={18} />
                                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 900, fontFamily: CAIRO }}>{t('حقوق الملكية (Equity)')}</h3>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {data.equities.map((e) => (
                                        <tr key={e.code} style={{ borderBottom: `1px solid ${C.border}` }}>
                                            <td style={{ padding: '10px 16px', borderInlineStart: `1px solid ${C.border}` }}><span style={{ fontSize: '11px', fontFamily: OUTFIT, color: C.textMuted }}>{e.code}</span></td>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{e.name}</td>
                                            <td style={{ padding: '10px 16px',  fontWeight: 600, color: C.textPrimary, fontSize: '14px', fontFamily: OUTFIT }}><Currency amount={e.balance} /></td>
                                        </tr>
                                    ))}
                                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(37, 106, 244, 0.02)' }}>
                                        <td style={{ padding: '10px 16px', borderInlineStart: `1px solid ${C.border}` }}>—</td>
                                        <td style={{ padding: '10px 16px', fontSize: '13px', color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{t('صافي الربح / الخسارة')}</td>
                                        <td style={{ padding: '10px 16px',  fontWeight: 900, color: data.netIncome >= 0 ? '#10b981' : '#fb7185', fontSize: '14px', fontFamily: OUTFIT }}><Currency amount={data.netIncome} /></td>
                                    </tr>
                                    <tr style={{ background: 'rgba(37, 106, 244, 0.08)', borderTop: `1px solid #256af433` }}>
                                        <td colSpan={2} style={{ padding: '12px 20px', fontWeight: 900, color: C.textSecondary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{t('إجمالي حقوق الملكية')}</td>
                                        <td style={{ padding: '12px 20px',  fontWeight: 950, color: '#256af4', fontSize: '14px', fontFamily: OUTFIT }}><Currency amount={data.totalEquities} /></td>
                                    </tr>
                                </tbody>
                            </table>
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
                             <span style={{ fontSize: '13px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{t('إجمالي الخصوم وحقوق الملكية')}</span>
                             <span style={{ fontSize: '18px', fontWeight: 950, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={data.totalLiabilitiesAndEquities} /></span>
                        </div>
                    </div>
                </div>

                <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '24px', padding: '14px 18px', background: 'rgba(255, 255, 255, 0.01)', border: `1px solid ${C.border}`, borderRadius: '12px' }}>
                    <Info size={16} style={{ color: C.primary }} />
                    <p style={{ margin: 0, fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>
                        {t('الميزانية متزنة تفصيلياً:')} <span style={{ color: C.success, fontWeight: 800 }}>{t('الأصول')} ({fmt(data.totalAssets)})</span> = <span style={{ color: C.primary, fontWeight: 800 }}>{t('الخصوم وحقوق الملكية')} ({fmt(data.totalLiabilitiesAndEquities)})</span>
                    </p>
                </div>
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
                    th, td { font-size: 10px !important; padding: 6px 10px !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}

