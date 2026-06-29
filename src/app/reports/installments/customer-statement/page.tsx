'use client';
import TableSkeleton from '@/components/TableSkeleton';
import { formatNumber } from '@/lib/currency';
import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, Search, User, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { C, PAGE_BASE, CAIRO, OUTFIT } from '@/constants/theme';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';

const fmt  = (d: string) => new Date(d).toLocaleDateString('en-ZA');
const fmtN = (n: number) => formatNumber(n);

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
    return (
        <React.Suspense fallback={
            <DashboardLayout>
                <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="animate-spin" style={{ fontSize: '24px' }}>⌛</div>
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

    const getCurrencyName = (code: string) => {
        const map: Record<string, string> = { 'EGP': t("ج.م"), 'SAR': t("ر.س"), 'AED': t("د.إ"), 'USD': '$', 'KWD': t("د.ك"), 'QAR': t("ر.ق"), 'BHD': t("د.ب"), 'OMR': t("ر.ع"), 'JOD': t("د.أ") };
        return map[code] || code;
    };

    const getColumns = (): TableColumn[] => [
        {
            header: t('م'),
            type: 'number' as const,
            cell: (row: StatementInstallment) => (
                <span style={{ color: '#818cf8', fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT }}>
                    {row.installmentNo}
                </span>
            )
        },
        {
            header: t('الاستحقاق'),
            type: 'number' as const,
            cell: (row: StatementInstallment) => (
                <span style={{ color: C.textSecondary, fontSize: '13px', fontFamily: OUTFIT }}>
                    {fmt(row.dueDate)}
                </span>
            )
        },
        {
            header: t('المبلغ'),
            type: 'number' as const,
            cell: (row: StatementInstallment) => (
                <span style={{ fontWeight: 700, color: C.textPrimary, fontSize: '13px', fontFamily: OUTFIT }}>
                    {fmtN(row.amount)} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                </span>
            )
        },
        {
            header: t('المدفوع'),
            type: 'number' as const,
            cell: (row: StatementInstallment) => (
                <span style={{ color: '#34d399', fontWeight: 700, fontSize: '13px', fontFamily: OUTFIT }}>
                    {fmtN(row.paidAmount || 0)} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                </span>
            )
        },
        {
            header: t('المتبقي'),
            type: 'number' as const,
            cell: (row: StatementInstallment) => (
                <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '13px', fontFamily: OUTFIT }}>
                    {fmtN(row.remaining || 0)} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                </span>
            )
        },
        {
            header: t('الحالة'),
            type: 'number' as const,
            cell: (row: StatementInstallment) => (
                <span style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '20px', background: row.status === 'paid' ? 'rgba(52,211,153,0.1)' : 'rgba(245,158,11,0.1)', color: row.status === 'paid' ? '#34d399' : '#f59e0b', fontWeight: 600, fontFamily: CAIRO, border: row.status === 'paid' ? '1px solid rgba(52,211,153,0.1)' : '1px solid rgba(245,158,11,0.1)' }}>
                    {row.status === 'paid' ? t('مدفوع') : t('غير مسدد')}
                </span>
            )
        }
    ];

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
                <span style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO, whiteSpace: 'nowrap' }}>{t('اختر العميل:')}</span>
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
            </div>

            <div style={{ minHeight: '300px' }}>
                {loading && <TableSkeleton />}

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
                                    <div style={{ textAlign: 'center'}}>
                                        <p style={{ fontSize: '11px', fontWeight: 500, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '15px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                            {i !== 0 && <span style={{ fontSize: '10px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>}
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
                                        <div style={{ fontSize: '10px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO, marginBottom: '4px' }}>{t('رقم الخطة')}</div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.primary, fontFamily: OUTFIT }}>{`PLAN-${String(plan.planNumber || 0).padStart(5, '0')}`}</div>
                                    </div>
                                    <div style={{ width: 1, height: 32, background: C.border }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '10px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO, marginBottom: '4px' }}>{t('المنتج')}</div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{plan.productName || t('منتج عام')}</div>
                                    </div>
                                    <div style={{ width: 1, height: 32, background: C.border }} />
                                    <div style={{ textAlign: 'center'}}>
                                        <div style={{ fontSize: '10px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO, marginBottom: '4px' }}>{t('إجمالي الخطة')}</div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>
                                            {fmtN(plan.grandTotal)} <span style={{ fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                        </div>
                                    </div>
                                </div>

                                <DataTable
                                    columns={getColumns()}
                                    data={plan.installments || []}
                                    emptyIcon={FileText}
                                    emptyMessage={t('لا توجد أقساط مسجلة لهذه الخطة')}
                                />
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
