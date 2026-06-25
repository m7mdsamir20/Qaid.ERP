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
import { ShoppingCart, Search, Calendar, Loader2, TrendingUp, FileText, CheckCircle, Clock } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import StatCard from '@/components/StatCard';

const getCurrencyName = (code: string, t: any) => {
    const map: Record<string, string> = { 'EGP': t('ج.م'), 'SAR': t('ر.س'), 'AED': t('د.إ'), 'USD': '$', 'KWD': t('د.ك'), 'QAR': t('ر.ق'), 'BHD': t('د.ب'), 'OMR': t('ر.ع'), 'JOD': t('د.أ') };
    return map[code] || code;
};

const fmt = (n: number) => formatNumber(n);

interface OrderLine {
    quantity: number;
    receivedQty: number;
    invoicedQty: number;
}

interface PurchaseOrder {
    id: string;
    orderNumber: number;
    date: string;
    expectedDeliveryDate: string | null;
    status: string;
    total: number;
    supplier: { name: string };
    lines: OrderLine[];
}

interface BranchOption {
    id: string;
    name: string;
}

export default function PurchaseOrdersReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [stats, setStats] = useState({ totalAmount: 0, count: 0, fullyReceivedCount: 0, partiallyReceivedCount: 0 });
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
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
            if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
            if (branchId && branchId !== 'all') params.set('branchId', branchId);
            const res = await fetch(`/api/reports/purchase-orders-report?${params}`);
            if (res.ok) {
                const json = await res.json();
                setOrders(json.orders || []);
                setStats({
                    totalAmount: json.totalAmount || 0,
                    count: json.count || 0,
                    fullyReceivedCount: json.fullyReceivedCount || 0,
                    partiallyReceivedCount: json.partiallyReceivedCount || 0
                });
            }
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchReport(); }, [from, to, statusFilter, branchId]);

    const filteredOrders = orders.filter(o => {
        const orderCode = `PO-${String(o.orderNumber).padStart(5, '0')}`;
        return orderCode.includes(q.toUpperCase()) ||
            String(o.orderNumber).includes(q) ||
            (o.supplier?.name || '').toLowerCase().includes(q.toLowerCase());
    });

    const sym = getCurrencyName(currency, t);
    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    const columns: TableColumn[] = [
        {
            header: t('رقم الأمر'),
            type: 'number' as const,
            cell: (row: PurchaseOrder) => (
                <span style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: '8px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 600, color: '#f97316', fontFamily: OUTFIT }}>
                    {`PO-${String(row.orderNumber).padStart(5, '0')}`}
                </span>
            )
        },
        {
            header: t('التاريخ'),
            cell: (row: PurchaseOrder) => new Date(row.date).toLocaleDateString('en-ZA'),
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('المورد'),
            cell: (row: PurchaseOrder) => row.supplier?.name || t('غير محدد'),
            style: { fontWeight: 600, fontFamily: CAIRO, fontSize: '13px', color: C.textPrimary }
        },
        {
            header: t('حالة الاستلام'),
            cell: (row: PurchaseOrder) => {
                if (!row.lines || row.lines.length === 0) return t('غير مستلم');
                const totalOrdered = row.lines.reduce((s, l) => s + l.quantity, 0);
                const totalReceived = row.lines.reduce((s, l) => s + l.receivedQty, 0);
                if (totalReceived >= totalOrdered && totalOrdered > 0) {
                    return <span style={{ color: '#10b981', fontWeight: 600, fontFamily: CAIRO }}>{t('مستلم بالكامل')}</span>;
                }
                if (totalReceived > 0) {
                    return <span style={{ color: '#fb923c', fontWeight: 600, fontFamily: CAIRO }}>{`${t('مستلم جزئياً')} (${Math.round((totalReceived / totalOrdered) * 100)}%)`}</span>;
                }
                return <span style={{ color: '#ef4444', fontWeight: 600, fontFamily: CAIRO }}>{t('غير مستلم')}</span>;
            },
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('حالة الفوترة'),
            cell: (row: PurchaseOrder) => {
                if (!row.lines || row.lines.length === 0) return t('غير مفوتر');
                const totalOrdered = row.lines.reduce((s, l) => s + l.quantity, 0);
                const totalInvoiced = row.lines.reduce((s, l) => s + l.invoicedQty, 0);
                if (totalInvoiced >= totalOrdered && totalOrdered > 0) {
                    return <span style={{ color: '#10b981', fontWeight: 600, fontFamily: CAIRO }}>{t('مفوتر بالكامل')}</span>;
                }
                if (totalInvoiced > 0) {
                    return <span style={{ color: '#fb923c', fontWeight: 600, fontFamily: CAIRO }}>{`${t('مفوتر جزئياً')} (${Math.round((totalInvoiced / totalOrdered) * 100)}%)`}</span>;
                }
                return <span style={{ color: '#ef4444', fontWeight: 600, fontFamily: CAIRO }}>{t('غير مفوتر')}</span>;
            },
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الحالة'),
            cell: (row: PurchaseOrder) => {
                const map: Record<string, string> = { draft: t('مسودة'), approved: t('معتمد'), completed: t('مكتمل'), cancelled: t('ملغي') };
                return map[row.status] || row.status;
            },
            style: { fontFamily: CAIRO, fontSize: '13px', textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('إجمالي القيمة'),
            type: 'number',
            cell: (row: PurchaseOrder) => <Currency amount={row.total} />,
            style: { textAlign: 'center' } as React.CSSProperties
        }
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير أوامر الشراء")}
                    subtitle={t("قائمة أوامر الشراء مع حالة الاستلام والفوترة والمجاميع الكلية.")}
                    backTab="sales-purchases"
                    printTitle={t("تقرير أوامر الشراء تفصيلي")}
                    branchName={selectedBranchName}
                    printDate={(from || to) ? `${from ? t('من: ') + from : ''} ${to ? t(' إلى: ') + to : ''}` : undefined}
                />

                <div data-print-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                    <StatCard
                        label={t('إجمالي قيمة الأوامر')}
                        value={fmt(stats.totalAmount)}
                        suffix={sym}
                        icon={<TrendingUp size={18} />}
                        color="#256af4"
                    />
                    <StatCard
                        label={t('عدد أوامر الشراء')}
                        value={String(stats.count)}
                        icon={<FileText size={18} />}
                        color="#a78bfa"
                    />
                    <StatCard
                        label={t('أوامر مستلمة بالكامل')}
                        value={String(stats.fullyReceivedCount)}
                        icon={<CheckCircle size={18} />}
                        color="#10b981"
                    />
                    <StatCard
                        label={t('أوامر مستلمة جزئياً')}
                        value={String(stats.partiallyReceivedCount)}
                        icon={<Clock size={18} />}
                        color="#fb923c"
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
                                value={statusFilter}
                                onChange={v => setStatusFilter(v)}
                                placeholder={t("كل الحالات")}
                                hideSearch={true}
                                options={[
                                    { value: 'all', label: t('كل الحالات') },
                                    { value: 'draft', label: t('مسودة') },
                                    { value: 'approved', label: t('معتمد') },
                                    { value: 'completed', label: t('مكتمل') },
                                    { value: 'cancelled', label: t('ملغي') }
                                ]}
                            />
                        </div>

                        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                placeholder={t("ابحث برقم الأمر أو المورد...")}
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
                                emptyIcon={ShoppingCart}
                                emptyMessage={t('لا توجد أوامر شراء مسجلة للفترة المحددة')}
                            />
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
