'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import AppModal from '@/components/AppModal';
import CustomSelect from '@/components/CustomSelect';
import Link from 'next/link';
import { ClipboardList, Plus, Search, Eye, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, focusIn, focusOut, TABLE_STYLE } from '@/constants/theme';

interface MaterialRequest {
    id: string;
    requestNumber: number;
    requestDate: string;
    requiredDate: string | null;
    status: string;
    notes: string | null;
    project: { id: string; name: string; projectNumber: number } | null;
    phase: { id: string; name: string } | null;
    lines: any[];
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'معلق', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    approved: { label: 'معتمد', color: '#256af4', bg: 'rgba(37,106,244,0.1)' },
    partially_fulfilled: { label: 'منفذ جزئياً', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
    fulfilled: { label: 'منفذ', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    rejected: { label: 'مرفوض', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

export default function MaterialRequestsPage() {
    const [items, setItems] = useState<MaterialRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const [deleteItem, setDeleteItem] = useState<MaterialRequest | null>(null);
    const [deleteError, setDeleteError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.set('status', statusFilter);
            const res = await fetch(`/api/material-requests?${params}`);
            if (res.ok) {
                const data = await res.json();
                setItems(data.requests || []);
            }
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { setPage(1); }, [search, statusFilter]);

    const filtered = items.filter(r =>
        !search ||
        String(r.requestNumber).includes(search) ||
        r.project?.name?.toLowerCase().includes(search.toLowerCase())
    );
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSubmitting(true);
        setDeleteError('');
        try {
            const res = await fetch(`/api/material-requests/${deleteItem.id}`, { method: 'DELETE' });
            if (res.ok) { setDeleteItem(null); fetchData(); }
            else { const d = await res.json(); setDeleteError(d.error || 'فشل الحذف'); }
        } catch { setDeleteError('حدث خطأ'); }
        finally { setSubmitting(false); }
    };

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ fontFamily: CAIRO, paddingBottom: '60px' }}>
                <PageHeader
                    title="طلبات المواد"
                    subtitle="إدارة طلبات مواد المشاريع الإنشائية"
                    icon={ClipboardList}
                    primaryButton={{ label: 'طلب مواد جديد', onClick: () => window.location.href = '/material-requests/new', icon: Plus }}
                />

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                        <input
                            type="text" placeholder="ابحث برقم الطلب أو اسم المشروع..."
                            style={{ ...IS, paddingInlineStart: '40px', height: '40px', fontSize: '13px', borderRadius: '12px' }}
                            value={search} onChange={e => setSearch(e.target.value)}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                    <CustomSelect
                        value={statusFilter}
                        onChange={setStatusFilter}
                        placeholder="كل الحالات"
                        hideSearch={true}
                        options={[
                            { value: 'all', label: 'كل الحالات' },
                            ...Object.entries(STATUS_MAP).map(([k, v]) => ({ value: k, label: v.label }))
                        ]}
                        style={{ height: '40px', width: '180px' }}
                    />
                </div>

                <DataTable
                    columns={[
                        {
                            header: 'رقم الطلب', type: 'text',
                            cell: (row) => (
                                <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.primary }}>
                                    {`MR-${String(row.requestNumber).padStart(5, '0')}`}
                                </span>
                            )
                        },
                        {
                            header: 'المشروع', type: 'text',
                            cell: (row) => row.project ? (
                                <div>
                                    <div style={{ fontWeight: 600 }}>{row.project.name}</div>
                                    <div style={{ fontSize: '11px', color: C.textSecondary }}>{`PRJ-${String(row.project.projectNumber).padStart(5, '0')}`}</div>
                                </div>
                            ) : '—'
                        },
                        {
                            header: 'المرحلة', type: 'text',
                            cell: (row) => row.phase?.name || '—'
                        },
                        {
                            header: 'تاريخ الطلب', type: 'text',
                            cell: (row) => new Date(row.requestDate).toLocaleDateString('ar-EG')
                        },
                        {
                            header: 'تاريخ المطلوب', type: 'text',
                            cell: (row) => row.requiredDate ? new Date(row.requiredDate).toLocaleDateString('ar-EG') : '—'
                        },
                        {
                            header: 'الحالة', type: 'text',
                            cell: (row) => {
                                const s = STATUS_MAP[row.status] || { label: row.status, color: C.textSecondary, bg: C.border };
                                return (
                                    <span style={{ display: 'inline-flex', padding: '3px 12px', borderRadius: '30px', fontSize: '11px', fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}>
                                        {s.label}
                                    </span>
                                );
                            }
                        },
                        {
                            header: 'إجراءات', type: 'number',
                            cell: (row) => (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                                    <Link href={`/material-requests/${row.id}`} style={TABLE_STYLE.actionBtn()}>
                                        <Eye size={TABLE_STYLE.actionIconSize} />
                                    </Link>
                                    {row.status === 'pending' && (
                                        <button onClick={() => setDeleteItem(row)} style={TABLE_STYLE.actionBtn(C.danger)}>
                                            <Trash2 size={TABLE_STYLE.actionIconSize} />
                                        </button>
                                    )}
                                </div>
                            )
                        },
                    ]}
                    data={paginated}
                    emptyIcon={ClipboardList}
                    emptyMessage="لا توجد طلبات مواد مسجلة حالياً"
                    isLoading={loading}
                    onRowClick={(row) => window.location.href = `/material-requests/${row.id}`}
                />

                {!loading && filtered.length > pageSize && (
                    <div style={{ marginTop: '16px' }}>
                        <Pagination total={filtered.length} pageSize={pageSize} currentPage={page} onPageChange={setPage} />
                    </div>
                )}

                {deleteItem && (
                    <AppModal
                        show={!!deleteItem}
                        onClose={() => { setDeleteItem(null); setDeleteError(''); }}
                        isDelete title="تأكيد حذف الطلب"
                        itemName={`MR-${String(deleteItem.requestNumber).padStart(5, '0')}`}
                        onConfirm={handleDelete}
                        isSubmitting={submitting}
                        error={deleteError}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
