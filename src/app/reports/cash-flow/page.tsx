'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { 
    TrendingUp, TrendingDown, Activity, Search, 
    Loader2, DollarSign 
} from 'lucide-react';
import { C, CAIRO, INTER, PAGE_BASE, IS } from '@/constants/theme';

interface MoneyLog {
    id: string;
    voucherNumber: number;
    type: 'receipt' | 'payment';
    date: string;
    party: string;
    treasury: string;
    amount: number;
    paymentType: string;
    description: string;
}

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const fmt = (n: number) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CashFlowReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [data, setData] = useState<MoneyLog[]>([]);
    const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, netFlow: 0, flowByDate: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [q, setQ] = useState('');

    useEffect(() => {
        fetch('/api/reports/cash-flow')
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(d => {
                if (d.error) throw new Error(d.error);
                setData(d.vouchers || []);
                setStats({
                    totalIncome: d.totalIncome || 0,
                    totalExpense: d.totalExpense || 0,
                    netFlow: d.netFlow || 0,
                    flowByDate: d.flowByDate || []
                });
            })
            .catch(() => setError(t('فشل تحميل بيانات التدفق النقدي')))
            .finally(() => setLoading(false));
    }, []);

    const filtered = data.filter(v => 
        (v.party || '').includes(q) || 
        (v.treasury || '').includes(q) || 
        (v.description || '').includes(q)
    );

    const exportToPDF = () => window.print();
    const sym = getCurrencyName(currency);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("قائمة التدفق النقدي")}
                    subtitle={t("تحليل السيولة النقدية الواردة والمنصرفة عبر كافة الخزن والتحويلات البنكية.")}
                    backTab="financial"
                    
                />

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', marginBottom: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                        <span style={{ fontSize: '16px' }}>⚠️</span>{error}
                        <button onClick={() => setError('')} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
                    </div>
                )}

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 600, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري تحليل التدفقات النقدية...')}</span>
                    </div>
                ) : (
                    <>

                        {/* KPI Cards */}
                        <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: t('إجمالي المقبوضات'), value: fmt(stats.totalIncome), color: '#10b981', icon: <TrendingUp size={18} /> },
                                { label: t('إجمالي المدفوعات'), value: fmt(stats.totalExpense), color: '#fb7185', icon: <TrendingDown size={18} /> },
                                { label: t('صافي التدفق'), value: fmt(stats.netFlow), color: stats.netFlow >= 0 ? '#10b981' : '#fb7185', icon: <DollarSign size={18} /> },
                                { label: t('عدد الحركات'), value: data.length.toString(), color: '#3b82f6', icon: <Activity size={18} /> },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}>
                                    <div style={{ textAlign: 'start'}}>
                                        <p className="stat-label" style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span className="stat-value" style={{ fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>{s.value}</span>
                                            {i < 3 && <span style={{ fontSize: '10px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>}
                                        </div>
                                    </div>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── Search Bar (Fard - Expanded) ── */}
                        <div className="no-print" style={{ position: 'relative', marginBottom: '24px' }}>
                            <Search size={16} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 1 }} />
                            <input
                                placeholder={t("ابحث بالخزينة، الطرف الآخر، أو البيان...")}
                                value={q} onChange={e => setQ(e.target.value)}
                                style={{ 
                                    ...IS,
                                    width: '100%', 
                                    height: '42px', 
                                    paddingInlineStart: '44px',
                                    paddingInlineEnd: '14px',
                                    borderRadius: '12px', 
                                    border: `1px solid ${C.border}`, 
                                    background: C.card, 
                                    color: C.textPrimary, 
                                    fontSize: '13.5px', 
                                    outline: 'none', 
                                    fontFamily: CAIRO 
                                }}
                            />
                        </div>

                        {/* Table */}
                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        {[t('التاريخ'), t('النوع'), t('الخزينة'), t('الطرف الآخر'), t('البيان'), t('المبلغ')].map((h, i) => (
                                            <th key={i} style={{
                                                padding: '16px 20px',
                                                fontSize: '12px',
                                                fontWeight: 800,
                                                color: C.textSecondary,
                                                textAlign: 'start',
                                                fontFamily: CAIRO,
                                                borderBottom: `1px solid ${C.border}`
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={6} style={{ padding: '60px', textAlign: 'start', color: C.textMuted, fontSize: '13px', fontFamily: CAIRO }}>{t('لم يتم العثور على حركات نقدية تطابق البحث')}</td></tr>
                                    ) : filtered.map((v, i) => (
                                        <tr key={v.id} 
                                            style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.2s', background: i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }} 
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} 
                                            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                            <td style={{ padding: '14px 20px', fontSize: '13px', color: C.textMuted, fontFamily: INTER, textAlign: 'start'}}>{new Date(v.date).toLocaleDateString('en-GB')}</td>
                                            <td style={{ padding: '14px 20px', textAlign: 'start'}}>
                                                <span style={{
                                                    padding: '3px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 900, fontFamily: CAIRO,
                                                    background: v.type === 'receipt' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 113, 133, 0.1)',
                                                    color: v.type === 'receipt' ? '#10b981' : '#fb7185'
                                                }}>
                                                    {v.type === 'receipt' ? t('قبض +') : t('صرف -')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO, textAlign: 'start'}}>{v.treasury}</td>
                                            <td style={{ padding: '14px 20px', fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO, fontWeight: 600, textAlign: 'start'}}>{v.party}</td>
                                            <td style={{ padding: '14px 20px', fontSize: '13px', color: C.textMuted, fontFamily: CAIRO, textAlign: 'start'}}>{v.description || '—'}</td>
                                            <td style={{ padding: '14px 20px', textAlign: 'start', fontWeight: 950, color: v.type === 'receipt' ? '#10b981' : '#fb7185', fontSize: '14px', fontFamily: INTER }}>
                                                {fmt(v.amount)} <span style={{ fontFamily: CAIRO, fontSize: '11px', marginInlineStart: '2px', color: C.textMuted }}>{sym}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
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
                    div { background: #fff !important; border-color: #e2e8f0 !important; }
                    div, span, h2, h3, p, small { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; border: 1px solid #e2e8f0 !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}

