'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import DataTable from '@/components/DataTable';
import AppModal from '@/components/AppModal';
import { TableColumn } from '@/components/EmptyTableState';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { C, CAIRO, OUTFIT, IS, TABLE_STYLE, SEARCH_STYLE, focusIn, focusOut, PAGE_BASE } from '@/constants/theme';
import { Hash, Plus, Search, Trash2, Edit3, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

interface SerialRecord {
    id: string;
    serial: string;
    status: string;
    soldAt: string | null;
    warrantyEnd: string | null;
    notes: string | null;
    customerId: string | null;
    warehouseId: string | null;
    customerName: string | null;
    warehouseName: string | null;
    item: { name: string; code: string };
}

const STATUS_OPTIONS = [
    { value: '', label: 'كل الحالات' },
    { value: 'in_stock', label: 'في المخزن' },
    { value: 'sold', label: 'مباع' },
    { value: 'reserved', label: 'محجوز' },
    { value: 'returned', label: 'مرتجع' },
    { value: 'damaged', label: 'تالف' },
];

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
    in_stock: { label: 'في المخزن', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.22)' },
    sold: { label: 'مباع', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.22)' },
    reserved: { label: 'محجوز', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.22)' },
    returned: { label: 'مرتجع', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.22)' },
    damaged: { label: 'تالف', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.22)' },
};

export default function SerialNumbersPage() {
    const { lang } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();

    const [records, setRecords] = useState<SerialRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 20;

    const [deleteItem, setDeleteItem] = useState<SerialRecord | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);
            const res = await fetch(`/api/serial-numbers?${params}`);
            if (res.ok) {
                const data = await res.json();
                setRecords(data.records || []);
                setTotal(data.total || 0);
            }
        } catch {
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => { setPage(1); }, [search, statusFilter]);

    const handleDelete = async () => {
        if (!deleteItem) return;
        setDeleting(true);
        setDeleteError('');
        try {
            const res = await fetch(`/api/serial-numbers/${deleteItem.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteItem(null);
                showToast('تم حذف الرقم التسلسلي بنجاح');
                fetchData();
            } else {
                const d = await res.json();
                setDeleteError(d.error || 'فشل في الحذف');
            }
        } catch {
            setDeleteError('خطأ في الاتصال بالسيرفر');
        } finally {
            setDeleting(false);
        }
    };

    const columns: TableColumn[] = [
        {
            header: 'الرقم التسلسلي',
            type: 'text',
            cell: (r: SerialRecord) => (
                <span style={{
                    fontFamily: OUTFIT, fontWeight: 700, color: C.primary, fontSize: '13px',
                    background: `${C.primary}10`, padding: '4px 10px', borderRadius: '6px',
                    border: `1px solid ${C.primary}30`,
                }}>
                    {r.serial}
                </span>
            ),
        },
        {
            header: 'الصنف',
            type: 'text',
            cell: (r: SerialRecord) => (
                <div>
                    <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px' }}>{r.item?.name || '—'}</div>
                    <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: OUTFIT }}>{r.item?.code || ''}</div>
                </div>
            ),
        },
        {
            header: 'المخزن',
            type: 'text',
            cell: (r: SerialRecord) => (
                <span style={{ color: C.textSecondary, fontSize: '12px' }}>{r.warehouseName || '—'}</span>
            ),
        },
        {
            header: 'الحالة',
            type: 'status',
            cell: (r: SerialRecord) => {
                const s = STATUS_LABELS[r.status] || { label: r.status, color: C.textMuted, bg: 'transparent', border: C.border };
                return (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
                        borderRadius: '30px', fontSize: '11px', fontWeight: 600,
                        background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                    }}>
                        {s.label}
                    </span>
                );
            },
        },
        {
            header: 'العميل',
            type: 'text',
            cell: (r: SerialRecord) => (
                <span style={{ color: C.textSecondary, fontSize: '12px' }}>{r.customerName || '—'}</span>
            ),
        },
        {
            header: 'تاريخ البيع',
            type: 'date',
            cell: (r: SerialRecord) => (
                <span style={{ color: C.textMuted, fontSize: '12px', fontFamily: OUTFIT }}>
                    {r.soldAt ? new Date(r.soldAt).toLocaleDateString('en-ZA') : '—'}
                </span>
            ),
        },
        {
            header: 'ضمان حتى',
            type: 'date',
            cell: (r: SerialRecord) => {
                if (!r.warrantyEnd) return <span style={{ color: C.textMuted, fontSize: '12px' }}>—</span>;
                const expired = new Date(r.warrantyEnd) < new Date();
                return (
                    <span style={{ color: expired ? '#ef4444' : '#4ade80', fontSize: '12px', fontFamily: OUTFIT, fontWeight: 600 }}>
                        {new Date(r.warrantyEnd).toLocaleDateString('en-ZA')}
                    </span>
                );
            },
        },
        {
            header: 'الإجراءات',
            type: 'action',
            cell: (r: SerialRecord) => (
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    {r.status === 'in_stock' && (
                        <button
                            onClick={() => { setDeleteItem(r); setDeleteError(''); }}
                            style={TABLE_STYLE.actionBtn(C.danger)}
                            title="حذف"
                        >
                            <Trash2 size={TABLE_STYLE.actionIconSize} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, fontFamily: CAIRO }}>
                <PageHeader
                    title="الأرقام التسلسلية"
                    subtitle="تتبع وإدارة الأرقام التسلسلية للأصناف"
                    icon={Hash}
                    primaryButton={{
                        label: 'إضافة أرقام',
                        onClick: () => router.push('/serial-numbers/new'),
                        icon: Plus,
                    }}
                />

                {toast && (
                    <div style={{
                        position: 'fixed', bottom: '24px', insetInlineStart: '24px',
                        background: toast.type === 'success' ? '#10b981' : '#ef4444',
                        color: '#fff', padding: '12px 24px', borderRadius: '10px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)', display: 'flex',
                        alignItems: 'center', gap: '10px', zIndex: 9999, fontSize: '13px', fontWeight: 600,
                        fontFamily: CAIRO,
                    }}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        {toast.msg}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon()} />
                        <input
                            type="text"
                            placeholder="ابحث بالرقم التسلسلي..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            style={{ ...SEARCH_STYLE.input, paddingInlineStart: '42px' }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                        />
                    </div>
                    <div style={{ width: '180px' }}>
                        <CustomSelect
                            value={statusFilter}
                            onChange={val => { setStatusFilter(val); setPage(1); }}
                            options={STATUS_OPTIONS}
                            hideSearch
                            style={{ height: '42px', fontSize: '13px', width: '100%', minWidth: '100%' }}
                        />
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={records}
                    emptyIcon={Hash}
                    emptyMessage={search || statusFilter ? 'لا توجد نتائج مطابقة' : 'لا توجد أرقام تسلسلية مسجلة حالياً'}
                    isLoading={loading}
                    loadingSkeleton={
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px', color: C.textMuted }}>
                            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                            جاري التحميل...
                        </div>
                    }
                />
                {!loading && total > 0 && (
                    <Pagination
                        total={total}
                        pageSize={pageSize}
                        currentPage={page}
                        onPageChange={setPage}
                    />
                )}

                <AppModal
                    show={!!deleteItem}
                    onClose={() => { setDeleteItem(null); setDeleteError(''); }}
                    isDelete
                    title="تأكيد حذف الرقم التسلسلي"
                    itemName={deleteItem?.serial}
                    onConfirm={handleDelete}
                    isSubmitting={deleting}
                    error={deleteError}
                />
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
