'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    BarChart3, Printer, Loader2, Search, User, 
    FileText, CheckCircle2, AlertTriangle, ArrowRight 
} from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { THEME, C, PAGE_BASE, CAIRO, INTER } from '@/constants/theme';

const fmt  = (d: string) => new Date(d).toLocaleDateString('en-GB');
const fmtN = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });


const LS: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px'
};

interface CustomerOption {
    id: string;
    name: string;
    balance?: number;
}

interface StatementInstallment {
    id: string;
    installmentNo: number;
    dueDate: string;
    amount: number;
    paidAmount?: number;
    remaining?: number;
    status?: string;
}

interface StatementPlan {
    id: string;
    planNumber: number;
    productName?: string | null;
    grandTotal: number;
    installments?: StatementInstallment[];
}

interface StatementSummary {
    totalPlans: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
}

interface CustomerStatementData {
    summary?: StatementSummary;
    plans?: StatementPlan[];
}

export default function CustomerStatementReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    return (
        <React.Suspense fallback={
            <DashboardLayout>
                <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: C.primary }} />
                </div>
            </DashboardLayout>
        }>
            <CustomerStatementReportContent />
        </React.Suspense>
    );
}

function CustomerStatementReportContent() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const router = useRouter();
    const searchParams = useSearchParams();
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [data,      setData]      = useState<CustomerStatementData | null>(null);
    const [loading,   setLoading]   = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(searchParams.get('customerId') || '');

    useEffect(() => {
        fetch('/api/customers').then(r => r.json()).then(setCustomers).catch(() => {});
    }, []);

    useEffect(() => {
        if (selectedCustomer) fetchReport();
    }, [selectedCustomer]);

    const fetchReport = async () => {
        if (!selectedCustomer) return;
        setLoading(true);
        setData(null);
        try {
            const url = `/api/installments/reports?type=customer&customerId=${selectedCustomer}`;
            const res = await fetch(url);
            if (res.ok) setData(await res.json());
        } finally { setLoading(false); }
    };

    return (
        <DashboardLayout>
        <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
            <style>{`
                input[type='date']::-webkit-calendar-picker-indicator { filter: brightness(0) saturate(100%) invert(67%) sepia(43%) saturate(1042%) hue-rotate(186deg) brightness(103%) contrast(97%); cursor: pointer; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <ReportHeader
                title={t("كشف حساب أقساط عميل")}
                subtitle={t("تقرير تفصيلي بجميع خطط التقسيط، الدفعات المسددة، والمبالغ المتبقية لعميل محدد")}
                backTab="installments"
                printTitle={data && (data.plans?.length || 0) > 0 ? t("كشف حساب أقساط عميل") : undefined}
            />

            <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO, whiteSpace: 'nowrap' }}>{t('اختر العميل:')}</span>
                <div style={{ flex: '1', minWidth: '220px', maxWidth: '420px' }}>
                    <CustomSelect
                        value={selectedCustomer}
                        onChange={setSelectedCustomer}
                        options={[{ value: '', label: `-- ${t('اختر العميل الباحث عنه')} --` }, ...customers.map(c => ({ value: c.id, label: c.name }))]}
                        placeholder={t("ابحث عن العميل...")}
                        style={{
                            width: '100%', height: '42px', padding: '0 15px',
                            borderRadius: '12px', border: `1px solid ${C.border}`,
                            background: C.card, color: C.textPrimary, fontSize: '13px',
                            fontFamily: CAIRO, fontWeight: 500
                        }}
                    />
                </div>
                <button onClick={fetchReport} disabled={loading || !selectedCustomer} style={{
                    height: '42px', padding: '0 24px', borderRadius: '12px',
                    background: C.primary, color: '#fff', border: 'none',
                    fontSize: '13.5px', fontWeight: 800, cursor: !selectedCustomer ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontFamily: CAIRO,
                    boxShadow: '0 4px 12px rgba(37,99,235,0.2)', opacity: !selectedCustomer ? 0.6 : 1
                }}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    {t('عرض كشف الحساب')}
                </button>
            </div>

            <div style={{ minHeight: '300px' }}>
                {loading && (
                    <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <p style={{ color: C.textSecondary, fontSize: '14px', fontWeight: 500, fontFamily: CAIRO }}>{t('جاري جلب البيانات وتحليلها...')}</p>
                    </div>
                )}

                {!loading && !data && (
                    <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px', opacity: 0.5 }}>
                        <FileText size={60} style={{ color: C.textMuted }} />
                        <p style={{ color: C.textMuted, fontSize: '14px', fontWeight: 500, fontFamily: CAIRO }}>{t('اختر العميل المعني لعرض تفاصيل حسابه')}</p>
                    </div>
                )}

                {!loading && data && (
                    <div className="report-content" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        {/* ── KPI Cards (Fixed Assets Style) ── */}
                        <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: t('عدد خطط التقسيط'), value: data.summary?.totalPlans, icon: <FileText size={18} />, color: '#818cf8' },
                                { label: t('إجمالي التعاقدات'), value: fmtN(data.summary?.totalAmount || 0), icon: <BarChart3 size={18} />, color: '#6366f1' },
                                { label: t('إجمالي المسدد'), value: fmtN(data.summary?.totalPaid || 0), icon: <CheckCircle2 size={18} />, color: '#10b981' },
                                { label: t('الرصيد المتبقي'), value: fmtN(data.summary?.totalRemaining || 0), icon: <AlertTriangle size={18} />, color: '#f59e0b' },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}>
                                    <div style={{ textAlign: 'start'}}>
                                        <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '15px', fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>{s.value}</span>
                                            {i !== 0 && <span style={{ fontSize: '10px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>}
                                        </div>
                                    </div>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="print-table-container">
                        {(data.plans || []).map((plan) => (
                            <div key={plan.id} style={{ background: 'rgba(255, 255, 255, 0.01)', border: `1px solid ${C.border}`, borderRadius: '24px', marginBottom: '24px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                                <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '32px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', fontWeight: 600, color: C.textMuted, fontFamily: CAIRO, marginBottom: '4px' }}>{t('رقم الخطة')}</div>
                                        <div style={{ fontSize: '14px', fontWeight: 900, color: C.primary, fontFamily: INTER }}>PLAN-{String(plan.planNumber || 0).padStart(4, '0')}</div>
                                    </div>
                                    <div style={{ width: 1, height: 32, background: C.border }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '10px', fontWeight: 600, color: C.textMuted, fontFamily: CAIRO, marginBottom: '4px' }}>{t('المنتج')}</div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{plan.productName || t('منتج عام')}</div>
                                    </div>
                                    <div style={{ width: 1, height: 32, background: C.border }} />
                                    <div style={{ textAlign: 'start'}}>
                                        <div style={{ fontSize: '10px', fontWeight: 600, color: C.textMuted, fontFamily: CAIRO, marginBottom: '4px' }}>{t('إجمالي الخطة')}</div>
                                        <div style={{ fontSize: '14px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>
                                            {fmtN(plan.grandTotal)} <span style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                        </div>
                                    </div>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            {[t('م'), t('الاستحقاق'), t('المبلغ'), t('المدفوع'), t('المتبقي'), t('الحالة')].map((h, i) => (
                                                <th key={i} style={{ padding: '12px 16px', textAlign: 'start', fontSize: '12px', fontWeight: 700, color: C.textMuted, fontFamily: CAIRO }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(plan.installments || []).map((inst) => (
                                            <tr key={inst.id} style={{ borderTop: `1px solid ${C.border}`, transition: 'background 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '12px 16px', color: '#818cf8', fontWeight: 600, fontSize: '13px', fontFamily: INTER }}>{inst.installmentNo}</td>
                                                <td style={{ padding: '12px 16px', color: C.textSecondary, fontSize: '13px', fontFamily: INTER }}>{fmt(inst.dueDate)}</td>
                                                <td style={{ padding: '12px 16px', fontWeight: 700, color: C.textPrimary, fontSize: '14px', fontFamily: INTER }}>
                                                    {fmtN(inst.amount)} <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                                </td>
                                                <td style={{ padding: '12px 16px', color: '#34d399', fontWeight: 700, fontSize: '14px', fontFamily: INTER }}>
                                                    {fmtN(inst.paidAmount || 0)} <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                                </td>
                                                <td style={{ padding: '12px 16px', color: '#f59e0b', fontWeight: 700, fontSize: '14px', fontFamily: INTER }}>
                                                    {fmtN(inst.remaining || 0)} <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '20px', background: inst.status === 'paid' ? 'rgba(52,211,153,0.1)' : 'rgba(245,158,11,0.1)', color: inst.status === 'paid' ? '#34d399' : '#f59e0b', fontWeight: 800, fontFamily: CAIRO, border: inst.status === 'paid' ? '1px solid rgba(52,211,153,0.1)' : '1px solid rgba(245,158,11,0.1)' }}>
                                                        {inst.status === 'paid' ? t('مدفوع') : t('غير مسدد')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
        </DashboardLayout>
    );
}

