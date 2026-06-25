'use client';
import TableSkeleton from '@/components/TableSkeleton';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { Currency } from '@/components/Currency';
import { formatNumber } from '@/lib/currency';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { AlertTriangle, Search, Box } from 'lucide-react';
import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import CustomSelect from '@/components/CustomSelect';
import StatCard from '@/components/StatCard';

interface LowStockItem {
    id: string;
    code: string;
    name: string;
    totalStock: number;
    minLimit: number;
    unit: string;
    category: string;
    averageCost: number;
    value: number;
}

interface BranchOption {
    id: string;
    name: string;
}

export default function LowStockReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();

    const [data, setData] = useState<LowStockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [q, setQ] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    const fetchReport = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (branchId && branchId !== 'all') params.set('branchId', branchId);
        fetch(`/api/reports/low-stock-items?${params}`)
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(d => { if (d.error) throw new Error(d.error); setData(d); })
            .catch(() => setError(t('فشل تحميل بيانات الأصناف الناقصة')))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchReport();
    }, [branchId]);

    const filtered = data.filter(i =>
        (i.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (i.code || '').toLowerCase().includes(q.toLowerCase()) ||
        (i.category || '').toLowerCase().includes(q.toLowerCase())
    );
    const totalValue = filtered.reduce((s, i) => s + i.value, 0);

    const columns: TableColumn[] = [
        {
            header: t('الصنف'),
            cell: (row: LowStockItem) => (
                <>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{row.name}</div>
                    <div style={{ fontSize: '11px', color: C.textSecondary, fontFamily: OUTFIT, fontWeight: 700 }}>{row.code}</div>
                </>
            )
        },
        {
            header: t('التصنيف'),
            cell: (row: LowStockItem) => row.category,
            style: { fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('الرصيد الحالي'),
            cell: (row: LowStockItem) => (
                <span style={{
                    color: row.totalStock <= 0 ? '#ef4444' : '#f59e0b',
                    fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT
                }}>
                    {formatNumber(row.totalStock)}
                </span>
            ),
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الحد الأدنى'),
            type: 'number' as const,
            cell: (row: LowStockItem) => formatNumber(row.minLimit),
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary, fontWeight: 700, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('قيمة النقص'),
            type: 'number' as const,
            cell: (row: LowStockItem) => <Currency amount={row.value} />,
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: '#10b981', textAlign: 'center' } as React.CSSProperties
        }
    ];

    const footerElement = (
        <tr style={{ background: 'rgba(16,185,129,0.05)', borderTop: `2px solid ${C.border}` }}>
            <td colSpan={4} style={{ padding: '18px 24px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجماليات النقص للفترة المختارة')}</td>
            <td style={{ padding: '18px 20px', fontWeight: 600, color: '#10b981', fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' }}>
                <Currency amount={totalValue} />
            </td>
        </tr>
    );

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("أصناف تحت الحد الأدنى")}
                    subtitle={t("قائمة المنتجات التي أوشكت على النفاذ أو وصلت لمستوى إعادة الطلب.")}
                    backTab="inventory"
                    printTitle={t("تقرير أصناف تحت الحد الأدنى")}
                    branchName={selectedBranchName}
                />

                <div data-print-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                    <StatCard
                        label={t('إجمالي عدد النواقص')}
                        value={filtered.length}
                        suffix={t('صنف')}
                        icon={<AlertTriangle size={18} />}
                        color="#ef4444"
                        formatValue={true}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="no-print" style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                            <div style={{ minWidth: '180px' }}>
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

                        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                placeholder={t("ابحث بالاسم، الكود، أو التصنيف...")}
                                value={q} onChange={e => setQ(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 45px 0 15px',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    outline: 'none', fontFamily: CAIRO, fontWeight: 500
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

                    {loading ? (
                        <TableSkeleton />
                    ) : (
                        <div className="print-table-container">
                            <DataTable
                                columns={columns}
                                data={filtered}
                                emptyIcon={Box}
                                emptyMessage={t('تبدو جميع أرصدة المخزون ضمن الحدود الآمنة حالياً')}
                                footer={footerElement}
                            />
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
