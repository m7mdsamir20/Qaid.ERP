'use client';
import TableSkeleton from '@/components/TableSkeleton';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { Currency } from '@/components/Currency';
import { formatNumber, getCurrencySymbol } from '@/lib/currency';
import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';

import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import StatCard from '@/components/StatCard';
import { ArrowRightLeft, Search, Activity, Loader2, TrendingUp, TrendingDown, FileText } from 'lucide-react';

const fmt = (n: number) => formatNumber(n);

interface ReturnInvoice {
    id: string;
    invoiceNumber: number;
    type: 'sale_return' | 'purchase_return';
    date: string;
    party: string;
    total: number;
    itemCount: number;
}

interface BranchOption {
    id: string;
    name: string;
}

export default function ReturnsReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [data, setData] = useState<ReturnInvoice[]>([]);
    const [stats, setStats] = useState({ totalSaleReturns: 0, totalPurchaseReturns: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [q, setQ] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [returnType, setReturnType] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (branchId && branchId !== 'all') params.set('branchId', branchId);
        if (returnType && returnType !== 'all') params.set('type', returnType);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        fetch(`/api/reports/returns-report?${params}`)
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(d => {
                if (d.error) throw new Error(d.error);
                setData(d.returns);
                setStats({ totalSaleReturns: d.totalSaleReturns, totalPurchaseReturns: d.totalPurchaseReturns });
            })
            .catch(() => setError(t('فشل تحميل بيانات المرتجعات')))
            .finally(() => setLoading(false));
    }, [branchId, returnType, from, to]);

    const filtered = data.filter(r => (r.party || '').toLowerCase().includes(q.toLowerCase()) || String(r.invoiceNumber).includes(q));
    const sym = getCurrencySymbol(currency, lang);

    const columns: TableColumn[] = [
        {
            header: t('رقم الفاتورة'),
            type: 'number' as const,
            cell: (row: ReturnInvoice) => (
                row.type === 'sale_return' ? 'RET-' : 'RTN-'
            ) + String(row.invoiceNumber).padStart(5, '0'),
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: C.textPrimary } as React.CSSProperties
        },
        {
            header: t('التاريخ'),
            cell: (row: ReturnInvoice) => new Date(row.date).toLocaleDateString('en-ZA'),
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('نوع المرتجع'),
            cell: (row: ReturnInvoice) => (
                <span style={{
                    padding: '4px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO,
                    background: row.type === 'sale_return' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 106, 244, 0.1)',
                    color: row.type === 'sale_return' ? '#ef4444' : '#256af4',
                    border: `1px solid ${row.type === 'sale_return' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(37, 106, 244, 0.2)'}`
                }}>
                    {row.type === 'sale_return' ? t('مرتجع مبيعات') : t('مرتجع مشتريات')}
                </span>
            ),
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الطرف الآخر'),
            cell: (row: ReturnInvoice) => row.party,
            style: { fontFamily: CAIRO, fontSize: '13px', fontWeight: 600, color: C.textPrimary, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الأصناف'),
            cell: (row: ReturnInvoice) => `${row.itemCount} ${t('صنف')}`,
            style: { fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('القيمة الإجمالية'),
            type: 'number' as const,
            cell: (row: ReturnInvoice) => <Currency amount={row.total} />,
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: C.textPrimary, textAlign: 'center' } as React.CSSProperties
        }
    ];

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير مرتجعات البيع والشراء")}
                    subtitle={t("متابعة دقيقة لكافة عمليات المرتجع الصادرة والواردة وتأثيرها المالي على المخزون.")}
                    backTab="sales-purchases"
                    printTitle={t("تقرير مرتجعات البيع والشراء")}
                    branchName={selectedBranchName}
                    printDate={(from || to) ? `${from ? t('من: ') + from : ''} ${to ? t(' إلى: ') + to : ''}` : undefined}
                />

                <div data-print-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                    <StatCard
                        label={t('إجمالي مرتجع البيع')}
                        value={fmt(stats.totalSaleReturns)}
                        suffix={sym}
                        icon={<TrendingDown size={18} />}
                        color="#ef4444"
                    />
                    <StatCard
                        label={t('إجمالي مرتجع الشراء')}
                        value={fmt(stats.totalPurchaseReturns)}
                        suffix={sym}
                        icon={<TrendingUp size={18} />}
                        color="#256af4"
                    />
                    <StatCard
                        label={t('إجمالي عدد الفواتير')}
                        value={String(data.length)}
                        icon={<FileText size={18} />}
                        color="#a78bfa"
                    />
                    <StatCard
                        label={t('متوسط قيمة العملية')}
                        value={fmt(data.length ? (stats.totalSaleReturns + stats.totalPurchaseReturns) / data.length : 0)}
                        suffix={sym}
                        icon={<Activity size={18} />}
                        color="#10b981"
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                            <div style={{ minWidth: '160px' }}>
                                <CustomSelect
                                    value={branchId}
                                    onChange={v => setBranchId(v)}
                                    placeholder={t("كل الفروع")}
                                    hideSearch={true}
                                    options={[
                                        { value: 'all', label: t('كل الفروع') },
                                        ...branches.map((b) => ({ value: b.id, label: b.name }))
                                    ]}
                                />
                            </div>
                        )}

                        <div style={{ minWidth: '160px' }}>
                            <CustomSelect
                                value={returnType}
                                onChange={v => setReturnType(v)}
                                placeholder={t("كل المرتجعات")}
                                hideSearch={true}
                                options={[
                                    { value: 'all', label: t('كل المرتجعات') },
                                    { value: 'sale_return', label: t('مرتجعات المبيعات') },
                                    { value: 'purchase_return', label: t('مرتجعات المشتريات') }
                                ]}
                            />
                        </div>

                        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                placeholder={t("ابحث برقم الفاتورة أو الطرف الآخر...")}
                                value={q} onChange={e => setQ(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 45px 0 15px',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    outline: 'none', fontFamily: CAIRO, fontWeight: 500
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ color: C.textSecondary, fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{t('من:')}</span>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                                style={{
                                    ...IS, height: '42px', padding: '0 12px',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                            <span style={{ color: C.textSecondary, fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{t('إلى:')}</span>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)}
                                style={{
                                    ...IS, height: '42px', padding: '0 12px',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', marginBottom: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                            <span style={{ fontSize: '13px' }}>⚠️</span>{error}
                            <button onClick={() => setError('')} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>×</button>
                        </div>
                    )}

                    <DataTable
                        columns={columns}
                        data={filtered}
                        emptyIcon={ArrowRightLeft}
                        emptyMessage={t('لا توجد مرتجعات مسجلة')}
                        isLoading={loading}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
