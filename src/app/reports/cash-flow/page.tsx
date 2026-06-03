'use client';
import TableSkeleton from '@/components/TableSkeleton';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { Currency } from '@/components/Currency';
import { formatNumber } from '@/lib/currency';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { TrendingUp, TrendingDown, Activity, Search, DollarSign } from 'lucide-react';
import { C, CAIRO, OUTFIT, PAGE_BASE, IS } from '@/constants/theme';

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

const fmt = (n: number) => formatNumber(n);

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
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => {});
    }, []);

    const fetchData = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (branchId && branchId !== 'all') params.set('branchId', branchId);
        fetch(`/api/reports/cash-flow?${params}`)
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
    };

    useEffect(() => { fetchData(); }, [branchId]);

    const filtered = data.filter(v => 
        (v.party || '').includes(q) || 
        (v.treasury || '').includes(q) || 
        (v.description || '').includes(q)
    );

    const sym = getCurrencyName(currency);

    const columns: TableColumn[] = [
        {
            header: t('التاريخ'),
            cell: (row: MoneyLog) => new Date(row.date).toLocaleDateString('en-GB'),
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('النوع'),
            cell: (row: MoneyLog) => (
                <span style={{
                    padding: '3px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 600, fontFamily: CAIRO,
                    background: row.type === 'receipt' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 113, 133, 0.1)',
                    color: row.type === 'receipt' ? '#10b981' : '#fb7185'
                }}>
                    {row.type === 'receipt' ? t('قبض +') : t('صرف -')}
                </span>
            ),
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الخزينة'),
            cell: (row: MoneyLog) => row.treasury,
            style: { fontFamily: CAIRO, fontSize: '13px', fontWeight: 600, color: C.textSecondary }
        },
        {
            header: t('الطرف الآخر'),
            cell: (row: MoneyLog) => row.party,
            style: { fontFamily: CAIRO, fontSize: '13px', color: C.textPrimary, fontWeight: 600 }
        },
        {
            header: t('البيان'),
            cell: (row: MoneyLog) => row.description || '—',
            style: { fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('المبلغ'),
            type: 'number' as const,
            cell: (row: MoneyLog) => <Currency amount={row.amount} style={{ color: row.type === 'receipt' ? '#10b981' : '#fb7185' }} />,
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 950, textAlign: 'center' } as React.CSSProperties
        }
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("قائمة التدفق النقدي")}
                    subtitle={t("تحليل السيولة النقدية الواردة والمنصرفة عبر كافة الخزن والتحويلات البنكية.")}
                    backTab="financial"
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

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', marginBottom: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                        <span style={{ fontSize: '13px' }}>⚠️</span>{error}
                        <button onClick={() => setError('')} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>×</button>
                    </div>
                )}

                {loading ? ( <TableSkeleton /> ) : (
                    <>
                        {/* KPI Cards */}
                        <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: t('إجمالي المقبوضات'), value: fmt(stats.totalIncome), color: '#10b981', icon: <TrendingUp size={18} /> },
                                { label: t('إجمالي المدفوعات'), value: fmt(stats.totalExpense), color: '#fb7185', icon: <TrendingDown size={18} /> },
                                { label: t('صافي التدفق'), value: fmt(stats.netFlow), color: stats.netFlow >= 0 ? '#10b981' : '#fb7185', icon: <DollarSign size={18} /> },
                                { label: t('عدد الحركات'), value: data.length.toString(), color: '#256af4', icon: <Activity size={18} /> },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}>
                                    <div style={{ textAlign: 'center'}}>
                                        <p className="stat-label" style={{ fontSize: '11px', fontWeight: 500, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span className="stat-value" style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                            {i < 3 && <span style={{ fontSize: '10px', color: C.textSecondary, fontWeight: 500, fontFamily: CAIRO }}>{sym}</span>}
                                        </div>
                                    </div>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Search Bar */}
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

                        <DataTable
                            columns={columns}
                            data={filtered}
                            emptyIcon={Activity}
                            emptyMessage={t('لم يتم العثور على حركات نقدية تطابق البحث')}
                        />
                    </>
                )}
            </div>

            <style>{`
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
