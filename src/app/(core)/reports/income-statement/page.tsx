'use client';
import TableSkeleton from '@/components/TableSkeleton';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { Currency } from '@/components/Currency';
import { formatNumber, getCurrencySymbol } from '@/lib/currency';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { useSession } from 'next-auth/react';
import { PieChart, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { C, CAIRO, OUTFIT, PAGE_BASE } from '@/constants/theme';



const fmt = (n: number) => formatNumber(n);

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
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => {});
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (branchId) params.set('branchId', branchId);
            const res = await fetch(`/api/reports/income-statement?${params}`);
            if (res.ok) {
                setData(await res.json());
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [branchId]);

    const sym = getCurrencySymbol(currency, lang);
    const netIncomeColor = data && data.netIncome >= 0 ? '#10b981' : '#fb7185';

    // Revenue Columns
    const revenueColumns: TableColumn[] = [
        {
            header: t('كود الحساب'),
            cell: (row: AccountLine) => (
                <span className="notranslate" translate="no" style={{ fontFamily: OUTFIT, fontSize: '11px', padding: '4px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: `1px solid ${C.border}`, color: C.textSecondary }}>{row.code}</span>
            ),
            style: { width: '150px' }
        },
        {
            header: t('اسم الحساب'),
            cell: (row: AccountLine) => row.name,
            style: { fontFamily: CAIRO, fontSize: '13px', fontWeight: 600, color: C.textSecondary }
        },
        {
            header: t('الرصيد'),
            type: 'number' as const,
            cell: (row: AccountLine) => <Currency amount={row.balance} />,
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: '#10b981', textAlign: 'center' } as React.CSSProperties
        }
    ];

    const revenueFooter = data && (
        <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
            <td colSpan={2} style={{ padding: '16px 24px', fontWeight: 950, fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO }}>{t('إجمالي الإيرادات')}</td>
            <td style={{ padding: '16px 24px', fontWeight: 950, fontSize: '13px', color: '#10b981', fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={data.totalRevenue} /></td>
        </tr>
    );

    // Expense Columns
    const expenseColumns: TableColumn[] = [
        {
            header: t('كود الحساب'),
            cell: (row: AccountLine) => (
                <span className="notranslate" translate="no" style={{ fontFamily: OUTFIT, fontSize: '11px', padding: '4px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: `1px solid ${C.border}`, color: C.textSecondary }}>{row.code}</span>
            ),
            style: { width: '150px' }
        },
        {
            header: t('اسم الحساب'),
            cell: (row: AccountLine) => row.name,
            style: { fontFamily: CAIRO, fontSize: '13px', fontWeight: 600, color: C.textSecondary }
        },
        {
            header: t('الرصيد'),
            type: 'number' as const,
            cell: (row: AccountLine) => <Currency amount={row.balance} />,
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: '#fb7185', textAlign: 'center' } as React.CSSProperties
        }
    ];

    const expenseFooter = data && (
        <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
            <td colSpan={2} style={{ padding: '16px 24px', fontWeight: 950, fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO }}>{t('إجمالي المصروفات')}</td>
            <td style={{ padding: '16px 24px', fontWeight: 950, fontSize: '13px', color: '#fb7185', fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={data.totalExpense} /></td>
        </tr>
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("قائمة الدخل")}
                    subtitle={t("ملخص الإيرادات والمصروفات لتحديد صافي الربح أو الخسارة عن الفترة المالية.")}
                    backTab="financial"
                    branchName={branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '')}
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

                {loading ? ( <TableSkeleton /> ) : !data || (data.revenues.length === 0 && data.expenses.length === 0) ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '20px', textAlign: 'center'}}>
                         <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PieChart size={40} style={{ opacity: 0.2, color: C.textSecondary }} />
                         </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد بيانات متاحة')}</h3>
                        <p style={{ fontSize: '13px', color: C.textSecondary, maxWidth: '400px', lineHeight: 1.6, fontFamily: CAIRO }}>{t('لم يتم تسجيل أي إيرادات أو مصروفات خلال السنة المالية الحالية')}</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Summary Cards */}
                        <div data-print-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                            {[
                                { label: t('إجمالي الإيرادات'), value: fmt(data.totalRevenue), color: '#10b981', icon: <TrendingUp size={18} /> },
                                { label: t('إجمالي المصروفات'), value: fmt(data.totalExpense), color: '#fb7185', icon: <TrendingDown size={18} /> },
                                { label: data.netIncome >= 0 ? t('صافي الربح') : t('صافي الخسارة'), value: fmt(data.netIncome), color: data.netIncome >= 0 ? '#10b981' : '#fb7185', icon: <DollarSign size={18} /> },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                                    padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}>
                                    <div style={{ textAlign: 'center'}}>
                                        <p className="stat-label" style={{ fontSize: '11px', fontWeight: 500, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span className="stat-value" style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                            <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 500, fontFamily: CAIRO }}>{sym}</span>
                                        </div>
                                    </div>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Revenues section */}
                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 24px', background: 'rgba(16, 185, 129, 0.05)', color: '#10b981', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <TrendingUp size={20} />
                                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('تفصيل الإيرادات والمبيعات')}</h3>
                            </div>
                            <DataTable
                                columns={revenueColumns}
                                data={data.revenues}
                                emptyIcon={TrendingUp}
                                emptyMessage={t('لا توجد حركات إيرادات مسجلة')}
                                footer={revenueFooter}
                            />
                        </div>

                        {/* Expenses section */}
                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 24px', background: 'rgba(251, 113, 133, 0.05)', color: '#fb7185', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <TrendingDown size={20} />
                                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('تفصيل المصروفات والتكاليف')}</h3>
                            </div>
                            <DataTable
                                columns={expenseColumns}
                                data={data.expenses}
                                emptyIcon={TrendingDown}
                                emptyMessage={t('لا توجد حركات مصروفات مسجلة')}
                                footer={expenseFooter}
                            />
                        </div>

                        {/* Grand Summary Block */}
                        <div data-print-stats style={{
                            padding: '24px 32px',
                            background: `${netIncomeColor}12`,
                            borderRadius: '16px',
                            border: `1.5px solid ${netIncomeColor}30`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '12px'
                        }}>
                            <div>
                                <p style={{ fontSize: '12px', color: C.textSecondary, marginBottom: '4px', fontWeight: 600, fontFamily: CAIRO }}>
                                    {t('نتيجة النشاط:')} <span style={{ color: netIncomeColor }}>{data.netIncome >= 0 ? t('صافي الربح') : t('صافي الخسارة')}</span>
                                </p>
                                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 950, color: netIncomeColor, fontFamily: OUTFIT }}><Currency amount={data.netIncome} /></h2>
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
