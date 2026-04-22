'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, INTER, IS } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { Wallet, Search, Users, Activity, Loader2, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

interface AdvanceRecord {
    id: string;
    employeeName: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    status: 'paid' | 'active' | 'partial';
    lastPaymentDate: string | null;
}

interface ReportData {
    records: AdvanceRecord[];
    totalAdvances: number;
    totalRecovered: number;
    totalOutstanding: number;
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function EmployeesAdvancesPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');

    const sym = getCurrencyName(currency);
    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reports/hr?type=advances');
            if (res.ok) {
                const results = await res.json();
                setData(results);
            }
        } catch (error) {
            console.error('Failed to fetch advances report:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(); }, []);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير سلف ومديونيات الموظفين")}
                    subtitle={t("متابعة دقيقة لجميع السلف الممنوحة للموظفين، المبالغ المسددة، والأرصدة القائمة.")}
                    backTab="hr"
                    printTitle={t("تقرير سلف ومديونيات الموظفين")}
                />

                <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: t('إجمالي السلف الممنوحة'), value: fmt(data?.totalAdvances || 0), color: C.primary, icon: <Wallet size={18} /> },
                        { label: t('إجمالي المبالغ المستردة'), value: fmt(data?.totalRecovered || 0), color: '#10b981', icon: <ArrowUpRight size={18} /> },
                        { label: t('إجمالي الأرصدة القائمة'), value: fmt(data?.totalOutstanding || 0), color: '#ef4444', icon: <Activity size={18} /> },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: `${s.color}08`, border: `1px solid ${s.color}22`, borderRadius: '12px',
                            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div>
                                <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                <span style={{ fontSize: '18px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{s.value} <small style={{ fontSize: '10px', color: C.textMuted }}>{getCurrencyName(currency)}</small></span>
                            </div>
                            <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                        </div>
                    ))}
                </div>

                <div className="no-print" style={{ position: 'relative', marginBottom: '20px' }}>
                    <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                    <input placeholder={t("ابحث باسم الموظف...")} value={q} onChange={e => setQ(e.target.value)} style={{ ...IS, paddingInlineStart: '45px', height: '42px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }} />
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 size={40} className="animate-spin" style={{ color: C.primary }} /></div>
                ) : (
                    <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                    {[t('الموظف'), t('مبلغ السلفة'), t('المسدد'), t('المتبقي'), t('نسبة السداد'), t('الحالة')].map((h, i) => (
                                        <th key={i} style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 800, color: C.textSecondary, textAlign: i >= 1 && i <= 3 ? 'center' : 'right', fontFamily: CAIRO }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data?.records.filter(r => r.employeeName.includes(q)).map((r, idx) => {
                                    const pct = (r.paidAmount / r.totalAmount) * 100;
                                    return (
                                        <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                                            <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{r.employeeName}</td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 800, fontFamily: INTER }}>{fmt(r.totalAmount)} <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: '10px', marginInlineStart: '2px' }}>{sym}</span></td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 800, color: '#10b981', fontFamily: INTER }}>{fmt(r.paidAmount)} <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: '10px', marginInlineStart: '2px' }}>{sym}</span></td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 800, color: '#ef4444', fontFamily: INTER }}>{fmt(r.remainingAmount)} <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: '10px', marginInlineStart: '2px' }}>{sym}</span></td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', margin: '0 auto' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10b981' : C.primary }} />
                                                </div>
                                                <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4px', fontWeight: 700, color: C.textMuted }}>{Math.round(pct)}%</div>
                                            </td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{
                                                    fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '8px', border: '1px solid currentColor',
                                                    color: r.status === 'paid' ? '#10b981' : r.status === 'partial' ? '#f59e0b' : '#3b82f6',
                                                    background: r.status === 'paid' ? 'rgba(16,185,129,0.1)' : r.status === 'partial' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)'
                                                }}>
                                                    {r.status === 'paid' ? t('تم السداد') : r.status === 'partial' ? t('سداد جزئي') : t('نشطة')}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <style>{`
                input::-webkit-calendar-picker-indicator {
                    filter: invert(1) sepia(0) saturate(0) hue-rotate(0deg) brightness(0.7);
                    cursor: pointer;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}

