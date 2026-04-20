'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { useSession } from 'next-auth/react';
import { PieChart, TrendingUp, TrendingDown, DollarSign, Loader2 } from 'lucide-react';
import { C, CAIRO, INTER, PAGE_BASE } from '@/constants/theme';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const fmt = (n: number) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface AccountLine {
    code: string;
    name: string;
    type: string;
    balance: number;
}

interface IncomeStatementData {
    revenues: AccountLine[];
    expenses: AccountLine[];
    totalRevenue: number;
    totalExpense: number;
    netIncome: number;
}

export default function IncomeStatementPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [data, setData] = useState<IncomeStatementData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reports/income-statement');
            if (res.ok) {
                setData(await res.json());
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handlePrint = () => window.print();
    const exportToPDF = () => window.print();
    const sym = getCurrencyName(currency);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("قائمة الدخل")}
                    subtitle={t("ملخص الإيرادات والمصروفات لتحديد صافي الربح أو الخسارة عن الفترة المالية.")}
                    backTab="financial"
                    
                />

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 600, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري توليد قائمة الدخل...')}</span>
                    </div>
                ) : !data || (data.revenues.length === 0 && data.expenses.length === 0) ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
                         <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PieChart size={40} style={{ opacity: 0.2, color: C.textMuted }} />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد بيانات متاحة')}</h3>
                        <p style={{ fontSize: '14px', color: C.textMuted, maxWidth: '400px', lineHeight: 1.6, fontFamily: CAIRO }}>{t('لم يتم تسجيل أي إيرادات أو مصروفات خلال السنة المالية الحالية')}</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                            {[
                                { label: t('إجمالي الإيرادات'), value: fmt(data.totalRevenue), color: '#10b981', icon: <TrendingUp size={18} /> },
                                { label: t('إجمالي المصروفات'), value: fmt(data.totalExpense), color: '#fb7185', icon: <TrendingDown size={18} /> },
                                { label: data.netIncome >= 0 ? t('صافي الربح') : t('صافي الخسارة'), value: fmt(data.netIncome), color: data.netIncome >= 0 ? '#10b981' : '#fb7185', icon: <DollarSign size={18} /> },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                                    padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}>
                                    <div style={{ textAlign: 'start' }}>
                                        <p className="stat-label" style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span className="stat-value" style={{ fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>{s.value}</span>
                                            <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                        </div>
                                    </div>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th colSpan={3} style={{ padding: '16px 24px', background: 'rgba(16, 185, 129, 0.05)', color: '#10b981', fontSize: '14px', fontWeight: 900, textAlign: 'start', borderBottom: `1px solid ${C.border}`, fontFamily: CAIRO }}>
                                            {t('تفصيل الإيرادات والمبيعات (Revenues)')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.revenues.map(rev => (
                                        <tr key={rev.code} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '14px 24px', width: '150px' }}><span style={{ fontFamily: INTER, fontSize: '11px', padding: '4px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: `1px solid ${C.border}`, color: C.textMuted }}>{rev.code}</span></td>
                                            <td style={{ padding: '14px 24px', fontWeight: 700, color: C.textSecondary, fontSize: '13px', fontFamily: CAIRO }}>{rev.name}</td>
                                            <td style={{ padding: '14px 24px', textAlign: 'start', fontWeight: 800, color: '#10b981', fontSize: '14px', fontFamily: INTER }}>{fmt(rev.balance)} <span style={{ fontFamily: CAIRO, fontSize: '10px', marginInlineStart: '2px' }}>{sym}</span></td>
                                        </tr>
                                    ))}
                                    {data.revenues.length === 0 && <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: C.textMuted, fontSize: '12px', fontFamily: CAIRO }}>{t('لا توجد حركات إيرادات مسجلة')}</td></tr>}
                                </tbody>

                                <thead>
                                    <tr>
                                        <th colSpan={3} style={{ padding: '16px 24px', background: 'rgba(251, 113, 133, 0.05)', color: '#fb7185', fontSize: '14px', fontWeight: 900, textAlign: 'start', borderBottom: `1px solid ${C.border}`, fontFamily: CAIRO }}>
                                            {t('تفصيل المصروفات والتكاليف (Expenses)')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.expenses.map(exp => (
                                        <tr key={exp.code} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '14px 24px', width: '150px' }}><span style={{ fontFamily: INTER, fontSize: '11px', padding: '4px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: `1px solid ${C.border}`, color: C.textMuted }}>{exp.code}</span></td>
                                            <td style={{ padding: '14px 24px', fontWeight: 700, color: C.textSecondary, fontSize: '13px', fontFamily: CAIRO }}>{exp.name}</td>
                                            <td style={{ padding: '14px 24px', textAlign: 'start', fontWeight: 800, color: '#fb7185', fontSize: '14px', fontFamily: INTER }}>{fmt(exp.balance)} <span style={{ fontFamily: CAIRO, fontSize: '10px', marginInlineStart: '2px' }}>{sym}</span></td>
                                        </tr>
                                    ))}
                                    {data.expenses.length === 0 && <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: C.textMuted, fontSize: '12px', fontFamily: CAIRO }}>{t('لا توجد حركات مصروفات مسجلة')}</td></tr>}
                                </tbody>

                                <tfoot style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
                                    <tr style={{ height: '60px' }}>
                                        <td colSpan={2} style={{ padding: '16px 24px', fontWeight: 950, fontSize: '14px', color: C.textPrimary, fontFamily: CAIRO }}>
                                            {t('نتيجة النشاط:')} <span style={{ color: data.netIncome >= 0 ? '#10b981' : '#fb7185' }}>{data.netIncome >= 0 ? t('صافي الربح') : t('صافي الخسارة')}</span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'start', fontWeight: 950, fontSize: '16px', color: data.netIncome >= 0 ? '#10b981' : '#fb7185', fontFamily: INTER }}>
                                            {fmt(data.netIncome)} <span style={{ fontSize: '12px', opacity: 0.8, fontFamily: CAIRO, marginInlineStart: '2px' }}>{getCurrencyName(currency)}</span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
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
                    .stat-value { font-size: 11px !important; color: #000 !important; }
                    .stat-label { font-size: 9px !important; color: #666 !important; }
                    .print-table-container { background: white !important; border: 1px solid #e2e8f0 !important; border-radius: 0 !important; }
                    th, td { border: 1px solid #e2e8f0 !important; color: #000 !important; background: #fff !important; }
                    th { font-size: 11px !important; }
                    td { font-size: 11px !important; padding: 8px 12px !important; }
                    tfoot td { background: #f1f5f9 !important; font-weight: 900 !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}

