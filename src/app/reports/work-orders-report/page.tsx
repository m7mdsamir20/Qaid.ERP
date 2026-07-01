'use client';
import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { Wrench, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, PAGE_BASE } from '@/constants/theme';
import { DataTable } from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import StatCard, { StatCardGrid } from '@/components/StatCard';

interface WorkOrder {
    id: string;
    orderNumber: number;
    type: string;
    status: string;
    priority: string;
    scheduledDate: string | null;
    customer: { id: string; name: string } | null;
    contract: { id: string; contractNumber: number } | null;
    assignedEmployee: { id: string; name: string } | null;
    description: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    new:         { label: 'جديد',   color: '#256af4' },
    assigned:    { label: 'مُسند',  color: '#8b5cf6' },
    in_progress: { label: 'جاري',   color: '#f59e0b' },
    completed:   { label: 'مكتمل', color: '#22c55e' },
    cancelled:   { label: 'ملغي',  color: '#ef4444' },
    on_hold:     { label: 'موقوف', color: '#94a3b8' },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
    low:    { label: 'منخفض', color: '#94a3b8' },
    normal: { label: 'عادي',  color: '#256af4' },
    high:   { label: 'عالي',  color: '#f59e0b' },
    urgent: { label: 'عاجل',  color: '#ef4444' },
};

export default function WorkOrdersReportPage() {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [q, setQ] = useState('');

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo)   params.set('dateTo',   dateTo);
        fetch(`/api/work-orders?${params}`)
            .then(r => r.ok ? r.json() : [])
            .then(d => setOrders(Array.isArray(d) ? d : []))
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    }, [dateFrom, dateTo]);

    const orderTypes = Array.from(new Set(orders.map(o => o.type))).filter(Boolean);

    const filtered = orders.filter(o => {
        if (statusFilter !== 'all' && o.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && o.priority !== priorityFilter) return false;
        if (typeFilter !== 'all' && o.type !== typeFilter) return false;
        if (q) {
            const term = q.toLowerCase();
            const num = `WO-${String(o.orderNumber).padStart(5, '0')}`;
            if (
                !num.includes(term) &&
                !(o.customer?.name || '').toLowerCase().includes(term) &&
                !o.type.toLowerCase().includes(term) &&
                !(o.assignedEmployee?.name || '').toLowerCase().includes(term)
            ) return false;
        }
        return true;
    });

    const newCount        = filtered.filter(o => o.status === 'new').length;
    const inProgressCount = filtered.filter(o => o.status === 'in_progress' || o.status === 'assigned').length;
    const completedCount  = filtered.filter(o => o.status === 'completed').length;
    const urgentCount     = filtered.filter(o => o.priority === 'urgent' && o.status !== 'completed' && o.status !== 'cancelled').length;

    const columns: TableColumn[] = [
        {
            header: 'رقم الأمر',
            cell: (r: WorkOrder) => (
                <span style={{ fontFamily: OUTFIT, color: C.primary, fontWeight: 700 }}>
                    WO-{String(r.orderNumber).padStart(5, '0')}
                </span>
            ),
        },
        {
            header: 'العميل',
            cell: (r: WorkOrder) => r.customer?.name || <span style={{ color: C.textSecondary }}>—</span>,
        },
        {
            header: 'النوع',
            cell: (r: WorkOrder) => r.type,
        },
        {
            header: 'الأولوية',
            cell: (r: WorkOrder) => {
                const p = PRIORITY_LABELS[r.priority] || { label: r.priority, color: C.textSecondary };
                return (
                    <span style={{ padding: '2px 10px', borderRadius: '20px', background: `${p.color}18`, color: p.color, fontSize: '11px', fontWeight: 700 }}>
                        {p.label}
                    </span>
                );
            },
        },
        {
            header: 'الحالة',
            cell: (r: WorkOrder) => {
                const s = STATUS_LABELS[r.status] || { label: r.status, color: C.textSecondary };
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', background: `${s.color}18`, color: s.color, fontSize: '11px', fontWeight: 700 }}>
                        {s.label}
                    </span>
                );
            },
        },
        {
            header: 'المُسند إليه',
            cell: (r: WorkOrder) => r.assignedEmployee?.name || <span style={{ color: C.textSecondary }}>—</span>,
        },
        {
            header: 'التاريخ المجدول',
            cell: (r: WorkOrder) => r.scheduledDate
                ? new Date(r.scheduledDate).toLocaleDateString('ar-EG')
                : <span style={{ color: C.textSecondary }}>—</span>,
        },
        {
            header: 'العقد',
            cell: (r: WorkOrder) => r.contract
                ? <span style={{ fontFamily: OUTFIT, fontSize: '12px', color: C.textSecondary }}>SC-{String(r.contract.contractNumber).padStart(5, '0')}</span>
                : <span style={{ color: C.textSecondary }}>—</span>,
        },
    ];

    return (
        <DashboardLayout>
            <div dir="rtl" style={PAGE_BASE}>
                <ReportHeader
                    title="تقرير أوامر العمل"
                    subtitle="متابعة أوامر العمل حسب الحالة والأولوية والمُسند إليه"
                    backTab="services"
                    onPrint={() => {
                        const rows = filtered.map(o => {
                            const num = `WO-${String(o.orderNumber).padStart(5, '0')}`;
                            const s = STATUS_LABELS[o.status] || { label: o.status };
                            const p = PRIORITY_LABELS[o.priority] || { label: o.priority };
                            return `<tr><td>${num}</td><td>${o.customer?.name || '—'}</td><td>${o.type}</td><td>${p.label}</td><td>${s.label}</td><td>${o.assignedEmployee?.name || '—'}</td><td>${o.scheduledDate ? new Date(o.scheduledDate).toLocaleDateString('ar-EG') : '—'}</td></tr>`;
                        }).join('');
                        const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير أوامر العمل</title></head><body>
                            <table border="1" cellpadding="6" style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:12px;">
                            <thead style="background:#f1f5f9;"><tr><th>رقم الأمر</th><th>العميل</th><th>النوع</th><th>الأولوية</th><th>الحالة</th><th>المُسند إليه</th><th>التاريخ المجدول</th></tr></thead>
                            <tbody>${rows}</tbody></table></body></html>`;
                        const w = window.open('', '_blank');
                        if (!w) return;
                        w.document.write(html); w.document.close(); w.print();
                    }}
                />

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center' }}>
                    <input
                        type="text" value={q} onChange={e => setQ(e.target.value)}
                        placeholder="بحث برقم الأمر أو العميل أو النوع..."
                        style={{ flex: '1 1 220px', height: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, padding: '0 14px', fontSize: '13px', fontFamily: CAIRO, outline: 'none' }}
                    />
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        style={{ height: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, padding: '0 12px', fontSize: '13px', fontFamily: OUTFIT, outline: 'none', flex: '0 0 150px' }} />
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        style={{ height: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, padding: '0 12px', fontSize: '13px', fontFamily: OUTFIT, outline: 'none', flex: '0 0 150px' }} />
                    <div style={{ flex: '0 0 150px' }}>
                        <CustomSelect value={statusFilter} onChange={setStatusFilter} hideSearch
                            options={[
                                { value: 'all',         label: 'كل الحالات' },
                                { value: 'new',         label: 'جديد' },
                                { value: 'assigned',    label: 'مُسند' },
                                { value: 'in_progress', label: 'جاري' },
                                { value: 'completed',   label: 'مكتمل' },
                                { value: 'on_hold',     label: 'موقوف' },
                                { value: 'cancelled',   label: 'ملغي' },
                            ]} />
                    </div>
                    <div style={{ flex: '0 0 150px' }}>
                        <CustomSelect value={priorityFilter} onChange={setPriorityFilter} hideSearch
                            options={[
                                { value: 'all',    label: 'كل الأولويات' },
                                { value: 'low',    label: 'منخفض' },
                                { value: 'normal', label: 'عادي' },
                                { value: 'high',   label: 'عالي' },
                                { value: 'urgent', label: 'عاجل' },
                            ]} />
                    </div>
                    {orderTypes.length > 0 && (
                        <div style={{ flex: '0 0 170px' }}>
                            <CustomSelect value={typeFilter} onChange={setTypeFilter}
                                options={[{ value: 'all', label: 'كل الأنواع' }, ...orderTypes.map(tp => ({ value: tp, label: tp }))]}
                                placeholder="نوع الخدمة..." />
                        </div>
                    )}
                </div>

                {/* Stats */}
                <StatCardGrid style={{ marginBottom: '24px' }}>
                    <StatCard label="إجمالي الأوامر" value={filtered.length}           icon={<Wrench size={18} />}       color="#256af4" />
                    <StatCard label="جديد / مُسند"   value={newCount + inProgressCount} icon={<Clock size={18} />}        color="#8b5cf6" />
                    <StatCard label="جاري التنفيذ"   value={inProgressCount}            icon={<Clock size={18} />}        color="#f59e0b" />
                    <StatCard label="مكتملة"         value={completedCount}             icon={<CheckCircle size={18} />}  color="#22c55e" />
                </StatCardGrid>

                {urgentCount > 0 && (
                    <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertTriangle size={18} color="#ef4444" />
                        <span style={{ color: '#ef4444', fontSize: '13px', fontFamily: CAIRO, fontWeight: 700 }}>
                            يوجد {urgentCount} أمر عمل عاجل لم يُنجز بعد
                        </span>
                    </div>
                )}

                <DataTable
                    columns={columns}
                    data={filtered}
                    emptyIcon={Wrench}
                    isLoading={loading}
                    emptyMessage="لا توجد أوامر عمل تطابق الفلتر المحدد"
                    onRowClick={(row: WorkOrder) => window.open(`/work-orders/${row.id}`, '_blank')}
                />
            </div>
        </DashboardLayout>
    );
}
