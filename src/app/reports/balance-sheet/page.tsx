'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { useSession } from 'next-auth/react';
import { Landmark, Scale, Sigma, TrendingUp, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { C, CAIRO, INTER, PAGE_BASE } from '@/constants/theme';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': t('ج.م'), 'SAR': t('ر.س'), 'AED': t('د.إ'), 'USD': '$', 'KWD': t('د.ك'), 'QAR': t('ر.ق'), 'BHD': t('د.ب'), 'OMR': t('ر.ع'), 'JOD': t('د.أ') };
    return map[code] || code;
};

const fmt = (n: number) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reports/balance-sheet');
            if (res.ok) {
                setData(await res.json());
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const exportToPDF = () => window.print();

    const isBalanced = data ? Math.abs(data.totalAssets - data.totalLiabilitiesAndEquities) < 0.01 : false;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("المركز المالي (Balance Sheet)")}
                    subtitle={t("يعرض الموقف المالي للشركة من حيث الأصول، الخصوم، وحقوق الملكية في تاريخ محدد.")}
                    backTab="financial"
                    
                />

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 600, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري توليد المركز المالي...')}</span>
                    </div>
                ) : !data || (data.assets.length === 0 && data.liabilities.length === 0 && data.equities.length === 0) ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
                         <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Scale size={40} style={{ opacity: 0.2, color: C.textMuted }} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد أرصدة متاحة')}</h3>
                        <p style={{ fontSize: '14px', color: C.textMuted, maxWidth: '400px', lineHeight: 1.6, fontFamily: CAIRO }}>{t('المشروع بانتظار استكمال القيد الافتتاحي أو ترحيل الحركات التأسيسية')}</p>
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
                                <span style={{ fontSize: '13px', fontWeight: 800, color: isBalanced ? C.success : C.danger, fontFamily: CAIRO }}>
                                    {isBalanced ? t('معادلة المركز المالي متزنة') : t('يوجد خلل في توازن المركز المالي')}
                                </span>
                            </div>
                            <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>
                                {t('الأصول = الخصوم + حقوق الملكية')}
                            </div>
                        </div>

                        <div className="print-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'stretch' }}>
                            {/* Assets Column */}
                            <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '20px 24px', background: 'rgba(59, 130, 246, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '12px', color: '#3b82f6' }}>
                                    <Landmark size={20} />
                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, fontFamily: CAIRO }}>{t('الأصول (Assets)')}</h3>
                                </div>
                                <div style={{ padding: '16px', flex: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {data.assets.map(a => (
                                            <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '10px', fontFamily: INTER, color: C.textMuted, background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px' }}>{a.code}</span>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{a.name}</span>
                                                </div>
                                                <span style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>{fmt(a.balance)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ padding: '20px 24px', background: 'rgba(59, 130, 246, 0.08)', borderTop: `2px solid #3b82f633`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{t('إجمالي الأصول')}</span>
                                    <span style={{ fontSize: '16px', fontWeight: 950, color: '#3b82f6', fontFamily: INTER }}>{fmt(data.totalAssets)} <small style={{fontSize: '10px', opacity: 0.7}}>{getCurrencyName(currency)}</small></span>
                                </div>
                            </div>

                            {/* Right Column: Liabilities & Equities */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Liabilities */}
                                <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px' }}>
                                    <div style={{ padding: '16px 20px', background: 'rgba(251, 113, 133, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '12px', color: '#fb7185' }}>
                                        <Scale size={18} />
                                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 900, fontFamily: CAIRO }}>{t('الخصوم (Liabilities)')}</h3>
                                    </div>
                                    <div style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {data.liabilities.map(l => (
                                                <div key={l.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{l.name}</span>
                                                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>{fmt(l.balance)}</span>
                                                </div>
                                            ))}
                                            {data.liabilities.length === 0 && <div style={{ padding: '12px', textAlign: 'center', color: C.textMuted, fontSize: '11px', fontFamily: CAIRO }}>{t('لا توجد التزامات')}</div>}
                                        </div>
                                    </div>
                                    <div style={{ padding: '14px 20px', background: 'rgba(251, 113, 133, 0.05)', borderTop: `1px solid #fb718533`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي الخصوم')}</span>
                                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#fb7185', fontFamily: INTER }}>{fmt(data.totalLiabilities)}</span>
                                    </div>
                                </div>

                                {/* Equities */}
                                <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px' }}>
                                    <div style={{ padding: '16px 20px', background: 'rgba(16, 185, 129, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '12px', color: '#10b981' }}>
                                        <Sigma size={18} />
                                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 900, fontFamily: CAIRO }}>{t('حقوق الملكية (Equity)')}</h3>
                                    </div>
                                    <div style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {data.equities.map(e => (
                                                <div key={e.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{e.name}</span>
                                                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>{fmt(e.balance)}</span>
                                                </div>
                                            ))}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid #3b82f633', marginTop: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <TrendingUp size={14} color="#3b82f6" />
                                                    <span style={{ fontWeight: 800, color: C.textPrimary, fontSize: '11px', fontFamily: CAIRO }}>{t('صافي دخل الفترة')}</span>
                                                </div>
                                                <span style={{ fontWeight: 900, color: data.netIncome >= 0 ? '#10b981' : '#fb7185', fontSize: '12px', fontFamily: INTER }}>{fmt(data.netIncome)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '14px 20px', background: 'rgba(16, 185, 129, 0.05)', borderTop: `1px solid #10b98133`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي حقوق الملكية')}</span>
                                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#10b981', fontFamily: INTER }}>{fmt(data.totalEquities)}</span>
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
                                <p style={{ fontSize: '12px', color: C.textMuted, marginBottom: '4px', fontWeight: 600, fontFamily: CAIRO }}>{t('إجمالي الخصوم وحقوق الملكية')}</p>
                                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 950, color: C.textPrimary, fontFamily: INTER }}>{fmt(data.totalLiabilitiesAndEquities)} <small style={{fontSize: '14px'}}>{getCurrencyName(currency)}</small></h2>
                            </div>
                            <div className="no-print" style={{ textAlign: 'end' }}>
                                <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px', fontFamily: CAIRO }}>{t('فرق التوازن')}</div>
                                <div style={{ fontWeight: 800, color: isBalanced ? C.success : C.danger, fontSize: '13px', fontFamily: INTER }}>{fmt(Math.abs(data.totalAssets - data.totalLiabilitiesAndEquities))}</div>
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

