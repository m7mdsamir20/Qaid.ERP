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
                    background: row.totalStock <= 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: row.totalStock <= 0 ? '#ef4444' : '#f59e0b',
                    padding: '4px 12px', borderRadius: '10px', fontWeight: 600, fontSize: '12px', fontFamily: OUTFIT
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', marginBottom: '24px', alignItems: 'start' }}>
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

                    <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: 'linear-gradient(145deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 25px -10px rgba(239,68,68,0.2)' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '16px' }}>
                                <AlertTriangle size={24} />
                            </div>
                            <div style={{ fontSize: '11.5px', color: C.textSecondary, fontWeight: 700, marginBottom: '6px', fontFamily: CAIRO }}>{t('إجمالي عدد النواقص')}</div>
                            <div style={{ fontSize: '32px', fontWeight: 600, color: '#ef4444', fontFamily: OUTFIT }}>
                                {formatNumber(filtered.length)}
                                <span style={{ fontSize: '13px', marginInlineEnd: '6px', fontWeight: 700, fontFamily: CAIRO }}>{t('صنف')}</span>
                            </div>
                        </div>

                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.primary }} /> {t('دليل الإحصائيات')}
                            </div>
                            <ul style={{ margin: 0, paddingInlineEnd: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    t('الأصناف التي وصل رصيدها للحد الأدنى.'),
                                    t('الأصناف التي نفد رصيدها تماماً (0).'),
                                    t('تتأثر القائمة بعمليات الصرف والمبيعات.'),
                                    t('يجب إعادة طلب هذه الكميات لسير العمل.')
                                ].map((text, i) => (
                                    <li key={i} style={{ fontSize: '12.5px', color: C.textSecondary, fontFamily: CAIRO, lineHeight: 1.6 }}>{text}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
