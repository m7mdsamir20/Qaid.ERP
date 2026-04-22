'use client';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, OUTFIT, IS } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { AlertTriangle, Search, Trash2, Activity, Loader2, ArrowDownRight, Users, Calendar } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

interface DeductionRecord {
    id: string;
    employeeName: string;
    type: 'late' | 'penalty' | 'absence' | 'other';
    amount: number;
    reason: string;
    date: string;
}

interface ReportData {
    records: DeductionRecord[];
    totalAmount: number;
    totalCount: number;
}

const fmt = (n: number) => formatNumber(n);

const typeColors: Record<string, string> = {
    late: '#fb923c',
    penalty: '#ef4444',
    absence: '#f43f5e',
    other: '#64748b'
};

export default function EmployeesDeductionsPage() {
    const { lang, t } = useTranslation();

    const typeLabels: Record<string, string> = {
        late: t('تأخير'),
        penalty: t('جزاء إداري'),
        absence: t('غياب'),
        other: t('أخرى')
    };

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
            const res = await fetch('/api/reports/hr?type=deductions');
            if (res.ok) {
                const results = await res.json();
                setData(results);
            }
        } catch (error) {
            console.error('Failed to fetch deductions report:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(); }, []);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("سجل الخصومات والجزاءات الفترية")}
                    subtitle={t("تحليل مالي وإداري لجميع الخصومات المطبقة على الموظفين (تأخيرات، غياب، وجزاءات).")}
                    backTab="hr"
                    printTitle={t("سجل الخصومات والجزاءات الفترية")}
                />

                <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: t('إجمالي مبلغ الخصومات'), value: fmt(data?.totalAmount || 0), color: '#ef4444', icon: <ArrowDownRight size={18} /> },
                        { label: t('عدد الجزاءات المسجلة'), value: String(data?.totalCount || 0), color: '#fb923c', icon: <AlertTriangle size={18} /> },
                        { label: t('متوسط قيمة الخصم'), value: fmt((data?.totalAmount || 0) / (data?.totalCount || 1)), color: '#256af4', icon: <Activity size={18} /> },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: `${s.color}08`, border: `1px solid ${s.color}22`, borderRadius: '12px',
                            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div>
                                <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                <span style={{ fontSize: '18px', fontWeight: 900, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value} <small style={{ fontSize: '10px', color: C.textMuted }}>{i !== 1 ? getCurrencyName(currency) : t('جزاء')}</small></span>
                            </div>
                            <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                        </div>
                    ))}
                </div>

                <div className="no-print" style={{ position: 'relative', marginBottom: '20px' }}>
                    <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                    <input placeholder={t("ابحث باسم الموظف أو سبب الخصم...")} value={q} onChange={e => setQ(e.target.value)} style={{ ...IS, paddingInlineStart: '45px', height: '42px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }} />
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 size={40} className="animate-spin" style={{ color: C.primary }} /></div>
                ) : (
                    <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                    {[t('الموظف'), t('التاريخ'), t('نوع الخصم'), t('السبب'), t('القيمة')].map((h, i) => (
                                        <th key={i} style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 800, color: C.textSecondary,  fontFamily: CAIRO }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data?.records.filter(r => r.employeeName.includes(q) || r.reason.includes(q)).map((r) => (
                                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                                        <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{r.employeeName}</td>
                                        <td style={{ padding: '14px 20px', fontSize: '13px', color: C.textMuted, fontFamily: OUTFIT }}>{new Date(r.date).toLocaleDateString('en-GB')}</td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 900, color: typeColors[r.type], fontFamily: CAIRO }}>{typeLabels[r.type]}</span>
                                        </td>
                                        <td style={{ padding: '14px 20px', fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }}>{r.reason}</td>
                                        <td style={{ padding: '14px 20px',  fontSize: '14px', fontWeight: 600, color: '#ef4444', fontFamily: OUTFIT }}>-<Currency amount={r.amount} /></td>
                                    </tr>
                                ))}
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
            `}</style>
        </DashboardLayout>
    );
}

