'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Plus, Loader2, Search, Trash2, Eye, CheckCircle2, Clock, AlertCircle, XCircle, Package, FileText } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/hooks/useCurrency';
import { C, CAIRO, OUTFIT, IS, focusIn, focusOut, PAGE_BASE, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import CustomSelect from '@/components/CustomSelect';
import { useTranslation } from '@/lib/i18n';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';

interface PurchaseOrder {
    id: string;
    orderNumber: number;
    date: string;
    expectedDeliveryDate?: string;
    status: string;
    total: number;
    subtotal: number;
    taxAmount: number;
    supplier: { id: string; name: string };
    warehouse?: { id: string; name: string } | null;
    project?: { id: string; name: string } | null;
    lines: { id: string; quantity: number; receivedQty: number }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    draft: { label: 'مسودة', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: FileText },
    approved: { label: 'معتمد', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', icon: CheckCircle2 },
    partially_received: { label: 'مستلم جزئياً', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', icon: Clock },
    received: { label: 'مستلم', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', icon: CheckCircle2 },
    invoiced: { label: 'مُفوتر', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', icon: FileText },
    cancelled: { label: 'ملغي', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: XCircle },
};

export default function PurchaseOrdersPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { fMoneyJSX } = useCurrency();
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';

    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const isAdmin = session?.user?.role === 'admin';
    const perms = (session?.user as any)?.permissions || {};
    const canCreate = isAdmin || perms['/purchase-orders']?.create;

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(pageSize),
            });
            if (searchTerm) params.set('search', searchTerm);
            if (statusFilter) params.set('status', statusFilter);
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);

            const res = await fetch(`/api/purchase-orders?${params}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
                setTotal(data.total || 0);
            }
        } catch { } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, statusFilter, dateFrom, dateTo]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, dateFrom, dateTo]);

    const getReceivePercent = (lines: PurchaseOrder['lines']) => {
        if (!lines || lines.length === 0) return 0;
        const totalQty = lines.reduce((s, l) => s + Number(l.quantity), 0);
        const receivedQty = lines.reduce((s, l) => s + Number(l.receivedQty), 0);
        if (totalQty === 0) return 0;
        return Math.round((receivedQty / totalQty) * 100);
    };

    const columns: TableColumn[] = [
        {
            header: t('رقم الأمر'),
            type: 'number',
            cell: (row: PurchaseOrder) => (
                <span style={{ fontWeight: 600, fontSize: '11px', color: C.primary, opacity: 0.85, fontFamily: OUTFIT }}>
                    PO-{String(row.orderNumber).padStart(5, '0')}
                </span>
            ),
            style: { width: '110px' },
        },
        {
            header: t('التاريخ'),
            type: 'date',
            cell: (row: PurchaseOrder) => (
                <span style={{ color: C.textSecondary, fontSize: '13px', fontFamily: OUTFIT }}>
                    {new Date(row.date).toLocaleDateString(isRtl ? 'ar-EG-u-nu-latn' : 'en-GB')}
                </span>
            ),
        },
        {
            header: t('المورد'),
            type: 'text',
            cell: (row: PurchaseOrder) => (
                <span style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>
                    {row.supplier?.name || '—'}
                </span>
            ),
        },
        {
            header: t('المبلغ'),
            type: 'number',
            cell: (row: PurchaseOrder) => fMoneyJSX(row.total),
        },
        {
            header: t('الحالة'),
            type: 'status',
            cell: (row: PurchaseOrder) => {
                const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.draft;
                return (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '3px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700,
                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`, fontFamily: CAIRO,
                    }}>
                        <cfg.icon size={12} /> {cfg.label}
                    </div>
                );
            },
        },
        {
            header: t('تاريخ التسليم المتوقع'),
            type: 'date',
            cell: (row: PurchaseOrder) => row.expectedDeliveryDate
                ? <span style={{ color: C.textSecondary, fontSize: '12px', fontFamily: OUTFIT }}>{new Date(row.expectedDeliveryDate).toLocaleDateString(isRtl ? 'ar-EG-u-nu-latn' : 'en-GB')}</span>
                : <span style={{ color: C.textMuted, fontSize: '12px' }}>—</span>,
        },
        {
            header: t('نسبة الاستلام'),
            type: 'number',
            cell: (row: PurchaseOrder) => {
                const pct = getReceivePercent(row.lines);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '80px' }}>
                        <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: C.border, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#4ade80' : pct > 0 ? '#fbbf24' : C.textMuted, borderRadius: '2px', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: OUTFIT, minWidth: '30px' }}>{pct}%</span>
                    </div>
                );
            },
        },
        {
            header: t('إجراءات'),
            type: 'action',
            cell: (row: PurchaseOrder) => (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/purchase-orders/${row.id}`); }}
                        style={TABLE_STYLE.actionBtn()}
                        title={t('عرض')}
                    >
                        <Eye size={TABLE_STYLE.actionIconSize} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={t('أوامر الشراء')}
                    subtitle={t('إدارة وتتبع أوامر الشراء من الموردين')}
                    icon={ShoppingBag}
                    primaryButton={canCreate ? {
                        label: t('أمر شراء جديد'),
                        onClick: () => router.push('/purchase-orders/new'),
                        icon: Plus,
                    } : undefined}
                />

                {/* Filters */}
                <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch', flexWrap: 'wrap' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={t('رقم الأمر أو اسم المورد...')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn}
                            onBlur={focusOut}
                        />
                    </div>

                    {/* Status Filter */}
                    <CustomSelect
                        value={statusFilter}
                        onChange={setStatusFilter}
                        placeholder={t('كل الحالات')}
                        hideSearch={true}
                        options={[
                            { value: '', label: t('كل الحالات') },
                            ...Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({ value: key, label: cfg.label }))
                        ]}
                        style={{ height: '42px', width: '160px' }}
                    />

                    {/* Date Filters */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: C.textSecondary, fontSize: '12px' }}>{t('من')}</span>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...IS, width: '155px' }} onFocus={focusIn} onBlur={focusOut} />
                        <span style={{ color: C.textSecondary, fontSize: '12px' }}>{t('إلى')}</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...IS, width: '155px' }} onFocus={focusIn} onBlur={focusOut} />
                    </div>

                    {(searchTerm || statusFilter || dateFrom || dateTo) && (
                        <button
                            onClick={() => { setSearchTerm(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); }}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                padding: '0 12px', height: '36px', background: 'transparent',
                                border: `1px solid ${C.danger}40`, color: C.danger, borderRadius: '6px',
                                fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: '0.2s', fontFamily: CAIRO,
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
                        emptyIcon={Package}
                        emptyMessage={searchTerm || statusFilter || dateFrom || dateTo ? t('لا توجد نتائج بحث مطابقة') : t('لا توجد أوامر شراء')}
                        isLoading={loading}
                        loadingSkeleton={
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
                                <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                            </div>
                        }
                        onRowClick={(row) => router.push(`/purchase-orders/${row.id}`)}
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
