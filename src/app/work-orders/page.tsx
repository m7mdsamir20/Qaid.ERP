'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import { C, CAIRO, OUTFIT, IS, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import { ClipboardList, Plus, Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WorkOrder {
    id: string;
    orderNumber: number;
    type: string;
    priority: string;
    status: string;
    description: string;
    scheduledDate: string | null;
    customer: { id: string; name: string } | null;
    assignedEmployee: { id: string; name: string } | null;
}

const TYPE_LABELS: Record<string, string> = {
    maintenance: 'صيانة',
    installation: 'تركيب',
    repair: 'إصلاح',
    inspection: 'فحص وتفتيش',
    consulting: 'استشارات',
};

const PRIORITY_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
    low:    { label: 'منخفضة', bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: 'rgba(100,116,139,0.22)' },
    normal: { label: 'عادية',  bg: 'rgba(37,106,244,0.12)',  color: '#256af4', border: 'rgba(37,106,244,0.22)'  },
    high:   { label: 'عالية',  bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: 'rgba(251,191,36,0.22)'  },
    urgent: { label: 'عاجلة',  bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.22)'   },
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
    new:         { label: 'جديد',      bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', border: 'rgba(148,163,184,0.22)' },
    assigned:    { label: 'مُسنَد',    bg: 'rgba(37,106,244,0.12)',  color: '#256af4', border: 'rgba(37,106,244,0.22)'  },
    in_progress: { label: 'قيد التنفيذ', bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: 'rgba(251,191,36,0.22)' },
    completed:   { label: 'مكتمل',     bg: 'rgba(74,222,128,0.12)', color: '#4ade80', border: 'rgba(74,222,128,0.22)'  },
    cancelled:   { label: 'ملغى',      bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', border: 'rgba(239,68,68,0.22)'   },
};

function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function WorkOrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/work-orders');
            if (res.ok) setOrders(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { setCurrentPage(1); }, [search, statusFilter, priorityFilter]);

    const filtered = orders.filter(o => {
        const padded = `WO-${String(o.orderNumber).padStart(5, '0')}`;
        const matchSearch =
            padded.toLowerCase().includes(search.toLowerCase()) ||
            o.description.toLowerCase().includes(search.toLowerCase()) ||
            (o.customer?.name || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || o.status === statusFilter;
        const matchPriority = priorityFilter === 'all' || o.priority === priorityFilter;
        return matchSearch && matchStatus && matchPriority;
    });

    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ paddingBottom: '60px', fontFamily: CAIRO }}>
                <PageHeader
                    title="أوامر العمل"
                    subtitle="إدارة أوامر العمل والصيانة والتركيب"
                    icon={ClipboardList}
                    primaryButton={{
                        label: 'أمر عمل جديد',
                        onClick: () => router.push('/work-orders/new'),
                        icon: Plus,
                    }}
                />

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                        <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon()} />
                        <input
                            type="text"
                            placeholder="ابحث برقم الأمر أو الوصف أو العميل..."
                            style={{ ...SEARCH_STYLE.input, paddingInlineStart: '42px' }}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '6px', background: '#0e172a', padding: '4px', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                        {[
                            { id: 'all', label: 'الكل' },
                            { id: 'new', label: 'جديد' },
                            { id: 'assigned', label: 'مُسنَد' },
                            { id: 'in_progress', label: 'قيد التنفيذ' },
                            { id: 'completed', label: 'مكتمل' },
                            { id: 'cancelled', label: 'ملغى' },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setStatusFilter(f.id)}
                                style={{
                                    padding: '0 14px', height: '32px', borderRadius: '8px',
                                    border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                                    fontFamily: CAIRO, transition: 'all 0.2s',
                                    background: statusFilter === f.id ? C.primary : 'transparent',
                                    color: statusFilter === f.id ? '#fff' : C.textSecondary,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <select
                        value={priorityFilter}
                        onChange={e => setPriorityFilter(e.target.value)}
                        style={{
                            ...IS, width: 'auto', minWidth: '130px', height: '42px',
                            paddingInlineStart: '12px', paddingInlineEnd: '12px',
                            cursor: 'pointer', fontSize: '13px',
                        }}
                    >
                        <option value="all">كل الأولويات</option>
                        <option value="low">منخفضة</option>
                        <option value="normal">عادية</option>
                        <option value="high">عالية</option>
                        <option value="urgent">عاجلة</option>
                    </select>
                </div>

                <div style={TABLE_STYLE.container}>
                    <table style={TABLE_STYLE.table}>
                        <thead style={TABLE_STYLE.thead}>
                            <tr>
                                {['رقم الأمر', 'نوع الأمر', 'العميل', 'المسؤول', 'الأولوية', 'الحالة', 'التاريخ المجدول', 'الإجراءات'].map((h, i) => (
                                    <th key={i} style={TABLE_STYLE.th(i === 0, i === 7)}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '60px', color: C.textMuted }}>
                                        <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto', display: 'block' }} />
                                    </td>
                                </tr>
                            ) : paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '60px', color: C.textMuted, fontFamily: CAIRO }}>
                                        لا توجد أوامر عمل مطابقة
                                    </td>
                                </tr>
                            ) : paginated.map((o, idx) => {
                                const statusBadge = STATUS_BADGE[o.status] || STATUS_BADGE.new;
                                const priorityBadge = PRIORITY_BADGE[o.priority] || PRIORITY_BADGE.normal;
                                const padded = `WO-${String(o.orderNumber).padStart(5, '0')}`;
                                const isLast = idx === paginated.length - 1;
                                return (
                                    <tr
                                        key={o.id}
                                        style={{ ...TABLE_STYLE.row(isLast), cursor: 'pointer' }}
                                        onClick={() => router.push(`/work-orders/${o.id}`)}
                                        onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <td style={TABLE_STYLE.td(true)}>
                                            <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.primary, fontSize: '13px' }}>{padded}</span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{ color: C.textSecondary, fontSize: '13px' }}>{TYPE_LABELS[o.type] || o.type}</span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{ fontWeight: 600, color: C.textPrimary }}>{o.customer?.name || '—'}</span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{ color: C.textSecondary, fontSize: '13px' }}>{o.assignedEmployee?.name || '—'}</span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{
                                                display: 'inline-block', padding: '3px 10px', borderRadius: '30px',
                                                fontSize: '11px', fontWeight: 700, fontFamily: CAIRO,
                                                background: priorityBadge.bg, color: priorityBadge.color, border: `1px solid ${priorityBadge.border}`,
                                            }}>{priorityBadge.label}</span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{
                                                display: 'inline-block', padding: '3px 10px', borderRadius: '30px',
                                                fontSize: '11px', fontWeight: 700, fontFamily: CAIRO,
                                                background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}`,
                                            }}>{statusBadge.label}</span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{ fontFamily: OUTFIT, color: C.textSecondary, fontSize: '13px' }}>{fmtDate(o.scheduledDate)}</span>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false, true) }} onClick={e => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => router.push(`/work-orders/${o.id}`)}
                                                    style={TABLE_STYLE.actionBtn(C.primary)}
                                                    title="عرض التفاصيل"
                                                >
                                                    <ClipboardList size={TABLE_STYLE.actionIconSize} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {!loading && filtered.length > 0 && (
                    <Pagination
                        total={filtered.length}
                        pageSize={pageSize}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
