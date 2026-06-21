'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, SEARCH_STYLE, TABLE_STYLE } from '@/constants/theme';
import { ShoppingBag, Plus, Search, Trash2, Loader2, Eye, Filter } from 'lucide-react';
import { TableColumn } from '@/components/EmptyTableState';

interface SalesOrder {
    id: string;
    orderNumber: number;
    date: string;
    expectedDeliveryDate?: string;
    status: string;
    subtotal: number;
    total: number;
    customer?: { id: string; name: string; phone?: string };
    warehouse?: { id: string; name: string };
    lines: { quantity: number; deliveredQty: number }[];
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    draft:               { label: 'مسودة',           color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
    approved:            { label: 'معتمد',            color: '#256af4', bg: 'rgba(37,106,244,0.1)'  },
    processing:          { label: 'قيد التنفيذ',     color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
    partially_delivered: { label: 'تسليم جزئي',      color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
    delivered:           { label: 'مُسلَّم',           color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
    invoiced:            { label: 'مُفوتَر',           color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    cancelled:           { label: 'ملغى',             color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
};

const STATUS_OPTIONS = [
    { value: '', label: 'كل الحالات' },
    { value: 'draft',               label: 'مسودة' },
    { value: 'approved',            label: 'معتمد' },
    { value: 'processing',          label: 'قيد التنفيذ' },
    { value: 'partially_delivered', label: 'تسليم جزئي' },
    { value: 'delivered',           label: 'مُسلَّم' },
    { value: 'invoiced',            label: 'مُفوتَر' },
    { value: 'cancelled',           label: 'ملغى' },
];

export default function SalesOrdersPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { fMoneyJSX } = useCurrency();
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';

    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const isAdmin = (session?.user as any)?.role === 'admin' || (session?.user as any)?.isSuperAdmin;
    const perms = (session?.user as any)?.permissions || {};
    const canCreate = isAdmin || !Object.keys(perms).length || !!perms['/sales-orders']?.create;

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(pageSize),
            });
            if (searchTerm) params.set('search', searchTerm);
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);
            if (statusFilter) params.set('status', statusFilter);

            const res = await fetch(`/api/sales-orders?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
                setTotal(data.total || 0);
            }
        } catch (e) {
            console.error('Failed to fetch sales orders:', e);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, dateFrom, dateTo, statusFilter]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    useEffect(() => { setCurrentPage(1); }, [searchTerm, dateFrom, dateTo, statusFilter]);

    const getDeliveryPct = (order: SalesOrder) => {
        const totalQty = order.lines.reduce((s, l) => s + l.quantity, 0);
        const deliveredQty = order.lines.reduce((s, l) => s + l.deliveredQty, 0);
        if (totalQty === 0) return 0;
        return Math.round((deliveredQty / totalQty) * 100);
    };

    const columns: TableColumn[] = [
        {
            header: t('رقم الأمر'),
            type: 'number',
            cell: (order: SalesOrder) => (
                <span style={{ fontWeight: 600, fontSize: '11px', color: C.primary, opacity: 0.75, fontFamily: OUTFIT }}>
                    SO-{String(order.orderNumber).padStart(5, '0')}
                </span>
            ),
            style: { width: '110px' },
        },
        {
            header: t('التاريخ'),
            type: 'date',
            cell: (order: SalesOrder) => (
                <span style={{ color: C.textSecondary, fontSize: '13px', fontFamily: OUTFIT }}>
                    {new Date(order.date).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB')}
                </span>
            ),
        },
        {
            header: t('العميل'),
            type: 'text',
            cell: (order: SalesOrder) => (
                <span style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>
                    {order.customer?.name || t('عميل نقدي')}
                </span>
            ),
        },
        {
            header: t('المبلغ'),
            type: 'number',
            cell: (order: SalesOrder) => fMoneyJSX(order.total),
        },
        {
            header: t('الحالة'),
            type: 'status',
            cell: (order: SalesOrder) => {
                const st = STATUS_MAP[order.status] || STATUS_MAP.draft;
                return (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '3px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700,
                        background: st.bg, color: st.color, border: `1px solid ${st.color}30`, fontFamily: CAIRO,
                        whiteSpace: 'nowrap',
                    }}>
                        {st.label}
                    </div>
                );
            },
        },
        {
            header: t('تاريخ التسليم المتوقع'),
            type: 'date',
            cell: (order: SalesOrder) => order.expectedDeliveryDate
                ? <span style={{ color: C.textSecondary, fontSize: '12px', fontFamily: OUTFIT }}>
                    {new Date(order.expectedDeliveryDate).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB')}
                  </span>
                : <span style={{ color: C.textMuted, fontSize: '12px' }}>—</span>,
        },
        {
            header: t('نسبة التسليم %'),
            type: 'number',
            cell: (order: SalesOrder) => {
                const pct = getDeliveryPct(order);
                const color = pct === 100 ? C.success : pct > 0 ? '#fbbf24' : C.textMuted;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', minWidth: '60px' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontFamily: OUTFIT, fontSize: '12px', color, fontWeight: 600, minWidth: '32px' }}>{pct}%</span>
                    </div>
                );
            },
        },
        {
            header: t('إجراءات'),
            type: 'action',
            cell: (order: SalesOrder) => (
                <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/sales-orders/${order.id}`); }}
                    style={TABLE_STYLE.actionBtn()}
                    title={t('عرض')}
                >
                    <Eye size={TABLE_STYLE.actionIconSize} />
                </button>
            ),
        },
    ];

    const hasFilters = !!(searchTerm || dateFrom || dateTo || statusFilter);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={t('أوامر البيع')}
                    subtitle={t('إدارة وتتبع أوامر البيع للعملاء')}
                    icon={ShoppingBag}
                    primaryButton={canCreate ? {
                        label: t('أمر بيع جديد'),
                        onClick: () => router.push('/sales-orders/new'),
                        icon: Plus,
                    } : undefined}
                />

                {/* Search & Filters */}
                <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch', flexWrap: 'wrap' }}>
                    <div style={{ ...SEARCH_STYLE.wrapper, minWidth: '200px' }}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={t('رقم الأمر أو اسم العميل...')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>

                    {/* Status filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Filter size={14} style={{ color: C.textSecondary }} />
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            style={{ ...IS, width: '160px', height: '42px', cursor: 'pointer' }}
                            onFocus={focusIn} onBlur={focusOut}
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date filters */}
                    <div className="mobile-flex-row mobile-gap-sm date-filter-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: C.textSecondary, fontSize: '12px' }}>{t('من')}</span>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...IS, width: '150px' }} />
                        <span style={{ color: C.textSecondary, fontSize: '12px' }}>{t('إلى')}</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...IS, width: '150px' }} />
                    </div>

                    {hasFilters && (
                        <button
                            onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); setStatusFilter(''); }}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                padding: '0 12px', height: '36px', background: 'transparent',
                                border: `1px solid ${C.danger}40`, color: C.danger,
                                borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: '0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = `${C.danger}10`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Trash2 size={14} /> {t('مسح')}
                        </button>
                    )}
                </div>

                <div style={{ marginTop: '20px' }}>
                    <DataTable
                        columns={columns}
                        data={orders}
                        emptyIcon={ShoppingBag}
                        emptyMessage={hasFilters ? t('لا توجد نتائج بحث مطابقة') : t('لا توجد أوامر بيع')}
                        isLoading={loading}
                        loadingSkeleton={
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', textAlign: 'center' }}>
                                <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                            </div>
                        }
                        onRowClick={(order) => router.push(`/sales-orders/${order.id}`)}
                        rowStyle={() => ({ cursor: 'pointer' })}
                    />
                    {!loading && total > 0 && (
                        <Pagination
                            total={total}
                            pageSize={pageSize}
                            currentPage={currentPage}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </div>
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
