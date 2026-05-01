'use client';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, OUTFIT, IS } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { DollarSign, Search, Calendar, Wallet, ArrowUpRight, TrendingDown, Loader2, Users } from 'lucide-react';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

interface PayrollRecord {
    id: string;
    employeeName: string;
    basicSalary: number;
    allowances: number;
    deductions: number;
    netSalary: number;
}

interface ReportData {
    records: PayrollRecord[];
    summary: {
        totalSalaries: number;
        totalAllowances: number;
        totalDiscounts: number;
        netTotal: number;
    };
}

const fmt = (n: number) => formatNumber(n);

export default function PayrollStatementPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [q, setQ] = useState('');

    const sym = getCurrencyName(currency);
    const fetchReport = async () => {
        setLoading(true);
        try {
            const [yearStr, monthStr] = month.split('-');
            const res = await fetch(`/api/reports/hr?type=payroll-statement&month=${monthStr}&year=${yearStr}`);
            if (res.ok) {
                const results = await res.json();
                setData(results);
            } else {
                setData(null);
            }
        } catch (error) {
            console.error('Failed to fetch payroll report:', error);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(); }, [month]);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("كشف رواتب الموظفين التفصيلي")}
                    subtitle={t("مراجعة شاملة لمسيرات الرواتب، الحوافز، الاستقطاعات، وصافي المستحقات لفترة محددة.")}
                    backTab="hr"
                    printTitle={data && data.records.length > 0 ? t("مسير رواتب الموظفين") : undefined}
                    printDate={new Date(month + '-01').toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })}
                    printLabel={t('الشهر:')}
                />

                <div className="no-print" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('اختر الشهر:')}</span>
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                            style={{
                                ...IS, height: '42px', padding: '0 12px', textAlign: 'start',
                                borderRadius: '12px', border: `1px solid ${C.border}`,
                                background: C.card, color: C.textPrimary, fontSize: '13px',
                                fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                            }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 size={40} className="animate-spin" style={{ color: C.primary }} /></div>
                ) : !data || data.records.length === 0 ? (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <DollarSign size={60} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد مسيرات رواتب لهذا الشهر')}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>{t('تأكد من اختيار الشهر الصحيح أو ترحيل الرواتب أولاً.')}</p>
                    </div>
                ) : (
                    <>
                        <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: t('إجمالي الأجور الأساسية'), value: fmt(data.summary.totalSalaries), color: '#256af4', icon: <Users size={18} /> },
                                { label: t('إجمالي البدلات'), value: fmt(data.summary.totalAllowances), color: '#10b981', icon: <ArrowUpRight size={18} /> },
                                { label: t('إجمالي الاستقطاعات'), value: fmt(data.summary.totalDiscounts), color: '#f59e0b', icon: <TrendingDown size={18} /> },
                                { label: t('صافي المنصرف'), value: fmt(data.summary.netTotal), color: C.primary, icon: <Wallet size={18} /> },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}22`, borderRadius: '12px',
                                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}>
                                    <div>
                                        <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                            <span style={{ fontSize: '10px', color: C.textMuted }}>{getCurrencyName(currency)}</span>
                                        </div>
                                    </div>
                                    <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                                </div>
                            ))}
                        </div>

                        <div className="no-print" style={{ position: 'relative', marginBottom: '20px' }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                            <input placeholder={t("ابحث باسم الموظف...")} value={q} onChange={e => setQ(e.target.value)} style={{ ...IS, paddingInlineStart: '45px', height: '42px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }} />
                        </div>

                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        {[t('الموظف'), t('الراتب الأساسي'), t('البدلات'), t('الاستقطاعات'), t('الصافي')].map((h, i) => (
                                            <th key={i} style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: C.textSecondary,  fontFamily: CAIRO }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.records.filter(r => r.employeeName.includes(q)).map((r) => (
                                        <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                                            <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{r.employeeName}</td>
                                            <td style={{ padding: '14px 20px',  fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT }}><Currency amount={r.basicSalary} /></td>
                                            <td style={{ padding: '14px 20px',  fontSize: '13px', fontWeight: 600, color: '#10b981', fontFamily: OUTFIT }}>+<Currency amount={r.allowances} /></td>
                                            <td style={{ padding: '14px 20px',  fontSize: '13px', fontWeight: 600, color: '#ef4444', fontFamily: OUTFIT }}>-<Currency amount={r.deductions} /></td>
                                            <td style={{ padding: '14px 20px',  fontSize: '13px', fontWeight: 600, color: C.primary, fontFamily: OUTFIT }}><Currency amount={r.netSalary} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
                                    <tr>
                                        <td style={{ padding: '16px 20px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('الإجمالي')}</td>
                                        <td style={{ padding: '16px 20px',  fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={data.summary.totalSalaries} /></td>
                                        <td style={{ padding: '16px 20px',  fontWeight: 600, color: '#10b981', fontFamily: OUTFIT }}>+<Currency amount={data.summary.totalAllowances} /></td>
                                        <td style={{ padding: '16px 20px',  fontWeight: 600, color: '#ef4444', fontFamily: OUTFIT }}>-<Currency amount={data.summary.totalDiscounts} /></td>
                                        <td style={{ padding: '16px 20px',  fontWeight: 600, color: C.primary, fontFamily: OUTFIT }}><Currency amount={data.summary.netTotal} /></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
            </div>
            <style>{`
                input::-webkit-calendar-picker-indicator { filter: brightness(0) saturate(100%) invert(67%) sepia(43%) saturate(1042%) hue-rotate(186deg) brightness(103%) contrast(97%); cursor: pointer; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}

