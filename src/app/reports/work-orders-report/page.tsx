'use client';
import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { Wrench, Clock, CheckCircle, AlertTriangle, Search } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, PAGE_BASE, IS } from '@/constants/theme';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import StatCard, { StatCardGrid } from '@/components/StatCard';
import { formatNumber } from '@/lib/currency';
import TableSkeleton from '@/components/TableSkeleton';

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

interface BranchOption {
    id: string;
    name: string;
}

export default function WorkOrdersReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();

    const [orders, setOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [q, setQ] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.ok ? r.json() : []).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo)   params.set('dateTo',   dateTo);
        if (branchId && branchId !== 'all') params.set('branchId', branchId);
        fetch(`/api/work-orders?${params}`)
            .then(r => r.ok ? r.json() : [])
            .then(d => setOrders(Array.isArray(d) ? d : []))
            .catch(() => setOrders([]))
            .finally(() => setLoading(false));
    }, [dateFrom, dateTo, branchId]);

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

    const STATUS_LABELS: Record<string, { label: string; color: string }> = {
        new:         { label: t('جديد'),   color: '#256af4' },
        assigned:    { label: t('مُسند'),  color: '#8b5cf6' },
        in_progress: { label: t('جاري'),   color: '#f59e0b' },
        completed:   { label: t('مكتمل'), color: '#22c55e' },
        cancelled:   { label: t('ملغي'),  color: '#ef4444' },
        on_hold:     { label: t('موقوف'), color: '#94a3b8' },
    };

    const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
        low:    { label: t('منخفض'), color: '#94a3b8' },
        normal: { label: t('عادي'),  color: '#256af4' },
        high:   { label: t('عالي'),  color: '#f59e0b' },
        urgent: { label: t('عاجل'),  color: '#ef4444' },
    };

    const newCount        = filtered.filter(o => o.status === 'new').length;
    const inProgressCount = filtered.filter(o => o.status === 'in_progress' || o.status === 'assigned').length;
    const completedCount  = filtered.filter(o => o.status === 'completed').length;
    const urgentCount     = filtered.filter(o => o.priority === 'urgent' && o.status !== 'completed' && o.status !== 'cancelled').length;

    const columns: TableColumn[] = [
        {
            header: t('رقم الأمر'),
            cell: (r: WorkOrder) => (
                <span style={{ fontFamily: OUTFIT, color: C.primary, fontWeight: 700 }}>
                    WO-{String(r.orderNumber).padStart(5, '0')}
                </span>
            ),
        },
        {
            header: t('العميل'),
            cell: (r: WorkOrder) => r.customer?.name || <span style={{ color: C.textSecondary }}>—</span>,
        },
        {
            header: t('النوع'),
            cell: (r: WorkOrder) => r.type,
        },
        {
            header: t('الأولوية'),
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
            header: t('الحالة'),
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
            header: t('المُسند إليه'),
            cell: (r: WorkOrder) => r.assignedEmployee?.name || <span style={{ color: C.textSecondary }}>—</span>,
        },
        {
            header: t('التاريخ المجدول'),
            cell: (r: WorkOrder) => r.scheduledDate
                ? new Date(r.scheduledDate).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')
                : <span style={{ color: C.textSecondary }}>—</span>,
        },
        {
            header: t('العقد'),
            cell: (r: WorkOrder) => r.contract
                ? <span style={{ fontFamily: OUTFIT, fontSize: '12px', color: C.textSecondary }}>SC-{String(r.contract.contractNumber).padStart(5, '0')}</span>
                : <span style={{ color: C.textSecondary }}>—</span>,
        },
    ];

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير أوامر العمل")}
                    subtitle={t("متابعة أوامر العمل حسب الحالة والأولوية والمُسند إليه")}
                    backTab="services"
                    printTitle={t("تقرير أوامر العمل")}
                    printDate={(dateFrom || dateTo) ? `${dateFrom ? t('من: ') + dateFrom : ''} ${dateTo ? t(' إلى: ') + dateTo : ''}` : undefined}
                    branchName={selectedBranchName}
                    onPrint={() => {
                        const rows = filtered.map(o => {
                            const num = `WO-${String(o.orderNumber).padStart(5, '0')}`;
                            const s = STATUS_LABELS[o.status] || { label: o.status };
                            const p = PRIORITY_LABELS[o.priority] || { label: o.priority };
                            return `<tr><td>${num}</td><td>${o.customer?.name || '—'}</td><td>${o.type}</td><td>${p.label}</td><td>${s.label}</td><td>${o.assignedEmployee?.name || '—'}</td><td>${o.scheduledDate ? new Date(o.scheduledDate).toLocaleDateString('ar-EG') : '—'}</td></tr>`;
                        }).join('');
                        const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير أوامر العمل</title></head><body>
                            <h2 style="font-family:sans-serif;text-align:center;margin-bottom:20px;">تقرير أوامر العمل</h2>
                            <table border="1" cellpadding="6" style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:12px;">
                            <thead style="background:#f1f5f9;"><tr><th>رقم الأمر</th><th>العميل</th><th>النوع</th><th>الأولوية</th><th>الحالة</th><th>المُسند إليه</th><th>التاريخ المجدول</th></tr></thead>
                            <tbody>${rows}</tbody></table></body></html>`;
                        const w = window.open('', '_blank');
                        if (!w) return;
                        w.document.write(html); w.document.close(); w.print();
                    }}
                />

                {/* Filters */}
                <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center' }}>
                    {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                        <div style={{ minWidth: '160px', flex: '0 0 160px' }}>
                            <CustomSelect
                                value={branchId}
                                onChange={(v: string) => setBranchId(v)}
                                placeholder={t("كل الفروع")}
                                hideSearch
                                options={[
                                    { value: 'all', label: t('كل الفروع') },
                                    ...branches.map((b) => ({ value: b.id, label: b.name }))
                                ]}
                            />
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('من:')}</span>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            style={{ ...IS, height: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, padding: '0 12px', fontSize: '13px', fontFamily: OUTFIT, outline: 'none', width: '150px' }} />
                        <span style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('إلى:')}</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            style={{ ...IS, height: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, padding: '0 12px', fontSize: '13px', fontFamily: OUTFIT, outline: 'none', width: '150px' }} />
                    </div>
                    <div style={{ flex: '0 0 140px' }}>
                        <CustomSelect value={statusFilter} onChange={setStatusFilter} hideSearch
                            options={[
                                { value: 'all',         label: t('كل الحالات') },
                                { value: 'new',         label: t('جديد') },
                                { value: 'assigned',    label: t('مُسند') },
                                { value: 'in_progress', label: t('جاري') },
                                { value: 'completed',   label: t('مكتمل') },
                                { value: 'on_hold',     label: t('موقوف') },
                                { value: 'cancelled',   label: t('ملغي') },
                            ]} />
                    </div>
                    <div style={{ flex: '0 0 140px' }}>
                        <CustomSelect value={priorityFilter} onChange={setPriorityFilter} hideSearch
                            options={[
                                { value: 'all',    label: t('كل الأولويات') },
                                { value: 'low',    label: t('منخفض') },
                                { value: 'normal', label: t('عادي') },
                                { value: 'high',   label: t('عالي') },
                                { value: 'urgent', label: t('عاجل') },
                            ]} />
                    </div>
                    {orderTypes.length > 0 && (
                        <div style={{ flex: '0 0 150px' }}>
                            <CustomSelect value={typeFilter} onChange={setTypeFilter}
                                options={[{ value: 'all', label: t('كل الأنواع') }, ...orderTypes.map(tp => ({ value: tp, label: tp }))]}
                                placeholder={t("نوع الخدمة...")} />
                        </div>
                    )}
                </div>

                {loading ? (
                    <TableSkeleton />
                ) : orders.length === 0 ? (
                    <div className="no-print" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <Wrench size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t("لا توجد أوامر عمل")}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textSecondary, maxWidth: '400px', marginInline: 'auto', lineHeight: 1.6, fontFamily: CAIRO }}>{t("برجاء اختيار فترة زمنية أخرى أو تعديل معايير البحث لعرض تفاصيل أوامر العمل.")}</p>
                    </div>
                ) : (
                    <>
                        {/* Stats - 4 columns side by side */}
                        <StatCardGrid data-print-include cols={4} style={{ marginBottom: '24px' }}>
                            <StatCard label={t("إجمالي الأوامر")} value={formatNumber(filtered.length)}           suffix={t("أمر")} icon={<Wrench size={18} />}       color="#256af4" />
                            <StatCard label={t("جديد / مُسند")}   value={formatNumber(newCount + inProgressCount)} suffix={t("أمر")} icon={<Clock size={18} />}        color="#fb7185" />
                            <StatCard label={t("جاري التنفيذ")}   value={formatNumber(inProgressCount)}            suffix={t("أمر")} icon={<Clock size={18} />}        color="#f59e0b" />
                            <StatCard label={t("مكتملة")}         value={formatNumber(completedCount)}             suffix={t("أمر")} icon={<CheckCircle size={18} />}  color="#10b981" />
                        </StatCardGrid>

                        {urgentCount > 0 && (
                            <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <AlertTriangle size={18} color="#ef4444" />
                                <span style={{ color: '#ef4444', fontSize: '13px', fontFamily: CAIRO, fontWeight: 700 }}>
                                    {t("يوجد")} {formatNumber(urgentCount)} {t("أمر عمل عاجل لم يُنجز بعد")}
                                </span>
                            </div>
                        )}

                        {/* Search Input Bar (Placed below cards, above the table) */}
                        <div className="no-print" style={{ position: 'relative', width: '100%', marginBottom: '20px' }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                type="text"
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                placeholder={t("بحث برقم الأمر أو العميل أو النوع...")}
                                style={{
                                    width: '100%',
                                    height: '44px',
                                    paddingInlineStart: '42px',
                                    paddingInlineEnd: '14px',
                                    borderRadius: '12px',
                                    border: `1px solid ${C.border}`,
                                    background: C.card,
                                    color: C.textPrimary,
                                    fontSize: '13px',
                                    outline: 'none',
                                    fontFamily: CAIRO
                                }}
                            />
                        </div>

                        <DataTable
                            columns={columns}
                            data={filtered}
                            emptyIcon={Wrench}
                            isLoading={loading}
                            emptyMessage={t("لا توجد أوامر عمل تطابق الفلتر المحدد")}
                            onRowClick={(row: WorkOrder) => window.open(`/work-orders/${row.id}`, '_blank')}
                        />
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
