'use client';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import TableSkeleton from '@/components/TableSkeleton';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, SEARCH_STYLE, OUTFIT, IS } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { Receipt, Search, Loader2, TrendingUp, FileText, AlertTriangle } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import StatCard from '@/components/StatCard';

const getCurrencyName = (code: string, t: any) => {
    const map: Record<string, string> = { 'EGP': t('ج.م'), 'SAR': t('ر.س'), 'AED': t('د.إ'), 'USD': '$', 'KWD': t('د.ك'), 'QAR': t('ر.ق'), 'BHD': t('د.ب'), 'OMR': t('ر.ع'), 'JOD': t('د.أ') };
    return map[code] || code;
};

const fmt = (n: number) => formatNumber(n);

interface OrderLine {
    quantity: number;
    deliveredQty: number;
}

interface SalesOrder {
    id: string;
    orderNumber: number;
    date: string;
    expectedDeliveryDate: string | null;
    status: string;
    total: number;
    customer: { name: string } | null;
    lines: OrderLine[];
}

interface BranchOption {
    id: string;
    name: string;
}

export default function PendingSalesOrdersReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [stats, setStats] = useState({ totalPendingValue: 0, count: 0, overdueCount: 0 });
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [q, setQ] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            if (branchId && branchId !== 'all') params.set('branchId', branchId);
            const res = await fetch(`/api/reports/sales-orders-pending?${params}`);
            if (res.ok) {
                const json = await res.json();
                setOrders(json.orders || []);
                setStats({
                    totalPendingValue: json.totalPendingValue || 0,
                    count: json.count || 0,
                    overdueCount: json.overdueCount || 0
                });
            }
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchReport(); }, [from, to, branchId]);

    const filteredOrders = orders.filter(o => {
        const orderCode = `SO-${String(o.orderNumber).padStart(5, '0')}`;
        return orderCode.includes(q.toUpperCase()) ||
            String(o.orderNumber).includes(q) ||
            (o.customer?.name || t('عميل نقدي')).toLowerCase().includes(q.toLowerCase());
    });

    const sym = getCurrencyName(currency, t);
    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    const columns: TableColumn[] = [
        {
            header: t('رقم الأمر'),
            type: 'number' as const,
            cell: (row: SalesOrder) => (
                <span style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 600, color: '#ef4444', fontFamily: OUTFIT }}>
                    {`SO-${String(row.orderNumber).padStart(5, '0')}`}
                </span>
            )
        },
        {
            header: t('التاريخ'),
            cell: (row: SalesOrder) => new Date(row.date).toLocaleDateString('en-ZA'),
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('تاريخ التسليم المتوقع'),
            cell: (row: SalesOrder) => {
                if (!row.expectedDeliveryDate) return '—';
                const d = new Date(row.expectedDeliveryDate);
                const isOverdue = d < new Date();
                return (
                    <span style={{ color: isOverdue ? '#ef4444' : C.textSecondary, fontWeight: isOverdue ? 700 : 500 }}>
                        {d.toLocaleDateString('en-ZA')}
                        {isOverdue && ` (${t('متأخر')})`}
                    </span>
                );
            },
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('العميل'),
            cell: (row: SalesOrder) => row.customer?.name || t('عميل نقدي'),
            style: { fontWeight: 600, fontFamily: CAIRO, fontSize: '13px', color: C.textPrimary }
        },
        {
            header: t('نسبة التسليم المعلقة'),
            cell: (row: SalesOrder) => {
                if (!row.lines || row.lines.length === 0) return '0%';
                const totalOrdered = row.lines.reduce((s, l) => s + l.quantity, 0);
                const totalDelivered = row.lines.reduce((s, l) => s + l.deliveredQty, 0);
                const ratio = totalOrdered > 0 ? (totalDelivered / totalOrdered) : 0;
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontFamily: OUTFIT, fontWeight: 700, fontSize: '12px', color: C.textPrimary }}>
                            {`${Math.round(ratio * 100)}%`}
                        </span>
                        <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${ratio * 100}%`, height: '100%', background: ratio > 0.5 ? '#10b981' : '#f97316' }} />
                        </div>
                    </div>
                );
            },
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('إجمالي القيمة المعلقة'),
            type: 'number',
            cell: (row: SalesOrder) => <Currency amount={row.total} />,
            style: { textAlign: 'center' } as React.CSSProperties
        }
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("أوامر البيع المعلقة")}
                    subtitle={t("أوامر البيع التي لم تُسلّم بعد أو تجاوزت موعد التسليم.")}
                    backTab="sales-purchases"
                    printTitle={t("أوامر البيع المعلقة")}
                    branchName={selectedBranchName}
                    printDate={(from || to) ? `${from ? t('من: ') + from : ''} ${to ? t(' إلى: ') + to : ''}` : undefined}
                />

                <div data-print-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                    <StatCard
                        label={t('قيمة الأوامر المعلقة')}
                        value={fmt(stats.totalPendingValue)}
                        suffix={sym}
                        icon={<TrendingUp size={18} />}
                        color="#ef4444"
                    />
                    <StatCard
                        label={t('عدد الأوامر المعلقة')}
                        value={String(stats.count)}
                        icon={<FileText size={18} />}
                        color="#a78bfa"
                    />
                    <StatCard
                        label={t('أوامر متأخرة تسليمها')}
                        value={String(stats.overdueCount)}
                        icon={<AlertTriangle size={18} />}
                        color="#ef4444"
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

                        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                placeholder={t("ابحث برقم الأمر أو العميل...")}
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

                    {loading ? (
                        <TableSkeleton />
                    ) : (
                        <div className="print-table-container">
                            <DataTable
                                columns={columns}
                                data={filteredOrders}
                                emptyIcon={Receipt}
                                emptyMessage={t('لا توجد أوامر بيع معلقة للفترة المحددة')}
                            />
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
