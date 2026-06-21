'use client';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { useEffect, useState } from 'react';
import { FileText, Plus, CheckCircle, XCircle, Loader2, Clock, Users } from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, TABLE_STYLE, PAGE_BASE } from '@/constants/theme';

interface Employee {
    id: string;
    name: string;
    code: string;
}

interface LeaveRequest {
    id: string;
    employeeId: string;
    employee: { name: string; code: string; department?: { name: string } };
    type: string;
    startDate: string;
    endDate: string;
    daysCount: number;
    reason: string | null;
    status: string;
    approvedBy: string | null;
    approvedAt: string | null;
    notes: string | null;
}

const LEAVE_TYPES: Record<string, string> = {
    annual: 'سنوية',
    sick: 'مرضية',
    emergency: 'طارئة',
    unpaid: 'بدون راتب',
    maternity: 'أمومة',
};

const STATUS_LABELS: Record<string, string> = {
    pending: 'معلقة',
    approved: 'معتمدة',
    rejected: 'مرفوضة',
};

const STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
};

const TABS = [
    { key: 'pending', label: 'طلبات معلقة' },
    { key: 'approved', label: 'معتمدة' },
    { key: 'rejected', label: 'مرفوضة' },
    { key: 'all', label: 'جميع الطلبات' },
];

export default function LeavesPage() {
    const [tab, setTab] = useState('pending');
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showNewModal, setShowNewModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        employeeId: '',
        type: 'annual',
        startDate: '',
        endDate: '',
        reason: '',
    });
    const [formError, setFormError] = useState('');

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [lr, er] = await Promise.all([
                fetch('/api/attendance/leaves'),
                fetch('/api/employees'),
            ]);
            if (lr.ok) setLeaves(await lr.json());
            if (er.ok) setEmployees((await er.json()).filter((e: any) => e.status === 'active'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const filtered = tab === 'all' ? leaves : leaves.filter(l => l.status === tab);

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/attendance/leaves?id=${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                await fetchAll();
            } else {
                const d = await res.json();
                alert(d.error || 'فشلت العملية');
            }
        } finally {
            setActionLoading(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        if (!form.employeeId || !form.startDate || !form.endDate) {
            setFormError('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        setIsSaving(true);
        try {
            const res = await fetch('/api/attendance/leaves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (res.ok) {
                setShowNewModal(false);
                setForm({ employeeId: '', type: 'annual', startDate: '', endDate: '', reason: '' });
                await fetchAll();
            } else {
                setFormError(data.error || 'فشل في تقديم الطلب');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const stats = [
        { label: 'معلقة', value: leaves.filter(l => l.status === 'pending').length, color: '#f59e0b' },
        { label: 'معتمدة', value: leaves.filter(l => l.status === 'approved').length, color: '#10b981' },
        { label: 'مرفوضة', value: leaves.filter(l => l.status === 'rejected').length, color: '#ef4444' },
        { label: 'إجمالي الطلبات', value: leaves.length, color: C.primary },
    ];

    const columns: TableColumn[] = [
        {
            header: 'الموظف',
            cell: (row: LeaveRequest) => (
                <div>
                    <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px' }}>{row.employee?.name}</div>
                    <div style={{ fontSize: '11px', color: C.primary, fontFamily: OUTFIT }}>{row.employee?.code}</div>
                </div>
            ),
        },
        {
            header: 'نوع الإجازة',
            style: { textAlign: 'center' } as React.CSSProperties,
            cell: (row: LeaveRequest) => (
                <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: `${C.primary}15`, color: C.primary }}>
                    {LEAVE_TYPES[row.type] || row.type}
                </span>
            ),
        },
        {
            header: 'من',
            style: { textAlign: 'center' } as React.CSSProperties,
            cell: (row: LeaveRequest) => (
                <span style={{ fontSize: '13px', fontFamily: OUTFIT, color: C.textPrimary }}>{new Date(row.startDate).toLocaleDateString('ar-EG-u-nu-latn')}</span>
            ),
        },
        {
            header: 'إلى',
            style: { textAlign: 'center' } as React.CSSProperties,
            cell: (row: LeaveRequest) => (
                <span style={{ fontSize: '13px', fontFamily: OUTFIT, color: C.textPrimary }}>{new Date(row.endDate).toLocaleDateString('ar-EG-u-nu-latn')}</span>
            ),
        },
        {
            header: 'عدد الأيام',
            type: 'number',
            style: { textAlign: 'center' } as React.CSSProperties,
            cell: (row: LeaveRequest) => (
                <span style={{ fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT }}>{row.daysCount}</span>
            ),
        },
        {
            header: 'السبب',
            cell: (row: LeaveRequest) => (
                <span style={{ color: C.textSecondary, fontSize: '12px' }}>{row.reason || '—'}</span>
            ),
        },
        {
            header: 'الحالة',
            type: 'status',
            style: { textAlign: 'center' } as React.CSSProperties,
            cell: (row: LeaveRequest) => {
                const color = STATUS_COLORS[row.status] || C.textSecondary;
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: `${color}15`, color }}>
                        {row.status === 'pending' ? <Clock size={11} /> : row.status === 'approved' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                        {STATUS_LABELS[row.status] || row.status}
                    </span>
                );
            },
        },
        {
            header: 'إجراءات',
            type: 'action',
            style: { textAlign: 'center' } as React.CSSProperties,
            cell: (row: LeaveRequest) => {
                if (row.status !== 'pending') return <span style={{ color: C.textMuted, fontSize: '12px' }}>—</span>;
                return (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                            onClick={() => handleAction(row.id, 'approved')}
                            disabled={actionLoading === row.id}
                            title="موافقة"
                            style={{ ...TABLE_STYLE.actionBtn('#10b981'), width: '32px', height: '32px' }}
                        >
                            {actionLoading === row.id ? <Loader2 size={13} style={{ animation: 'spin 1.5s linear infinite' }} /> : <CheckCircle size={13} />}
                        </button>
                        <button
                            onClick={() => handleAction(row.id, 'rejected')}
                            disabled={actionLoading === row.id}
                            title="رفض"
                            style={{ ...TABLE_STYLE.actionBtn('#ef4444'), width: '32px', height: '32px' }}
                        >
                            {actionLoading === row.id ? <Loader2 size={13} style={{ animation: 'spin 1.5s linear infinite' }} /> : <XCircle size={13} />}
                        </button>
                    </div>
                );
            },
        },
    ];

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ ...PAGE_BASE, fontFamily: CAIRO }}>
                <PageHeader
                    title="إدارة الإجازات"
                    subtitle="متابعة طلبات الإجازة والموافقة عليها"
                    icon={FileText}
                    primaryButton={{ label: 'طلب إجازة جديد', onClick: () => setShowNewModal(true), icon: Plus }}
                />

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' }}>
                    {stats.map((s, i) => (
                        <div key={i} style={{ background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ margin: '0 0 4px', fontSize: '11px', color: C.textSecondary, fontWeight: 600 }}>{s.label}</p>
                                <span style={{ fontSize: '22px', fontWeight: 700, color: s.color, fontFamily: OUTFIT }}>{s.value}</span>
                            </div>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                <FileText size={18} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            style={{ height: '36px', padding: '0 16px', borderRadius: '8px', border: 'none', background: tab === t.key ? C.primary : 'transparent', color: tab === t.key ? '#fff' : C.textSecondary, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: CAIRO, transition: 'all 0.15s' }}
                        >
                            {t.label}
                            {t.key !== 'all' && (
                                <span style={{ marginRight: '6px', fontSize: '11px', background: tab === t.key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)', padding: '1px 7px', borderRadius: '20px' }}>
                                    {leaves.filter(l => l.status === t.key).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={filtered}
                    emptyIcon={FileText}
                    emptyMessage={tab === 'pending' ? 'لا توجد طلبات معلقة' : 'لا توجد طلبات'}
                    isLoading={loading}
                    loadingSkeleton={
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: C.textSecondary }}>
                            <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', marginLeft: '12px' }} />
                            جاري التحميل...
                        </div>
                    }
                />

                {/* New Leave Modal */}
                <AppModal show={showNewModal} onClose={() => { setShowNewModal(false); setFormError(''); }} title="طلب إجازة جديد" icon={FileText} maxWidth="500px">
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={LS}>الموظف <span style={{ color: C.danger }}>*</span></label>
                            <select value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} required>
                                <option value="">اختر الموظف...</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.code} - {emp.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={LS}>نوع الإجازة <span style={{ color: C.danger }}>*</span></label>
                            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut}>
                                {Object.entries(LEAVE_TYPES).map(([v, l]) => (
                                    <option key={v} value={v}>{l}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>من تاريخ <span style={{ color: C.danger }}>*</span></label>
                                <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} required />
                            </div>
                            <div>
                                <label style={LS}>إلى تاريخ <span style={{ color: C.danger }}>*</span></label>
                                <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} required />
                            </div>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={LS}>السبب</label>
                            <textarea
                                value={form.reason}
                                onChange={e => setForm({ ...form, reason: e.target.value })}
                                placeholder="اذكر سبب الإجازة..."
                                style={{ ...IS, height: '70px', padding: '12px', resize: 'none' }}
                                onFocus={focusIn}
                                onBlur={focusOut}
                            />
                        </div>
                        {formError && (
                            <div style={{ padding: '10px 14px', borderRadius: '8px', background: `${C.danger}10`, border: `1px solid ${C.danger}30`, color: C.danger, fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                                {formError}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="submit" disabled={isSaving} style={{ flex: 1, height: '44px', borderRadius: '10px', background: isSaving ? 'rgba(37,106,244,0.3)' : C.primary, border: 'none', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: isSaving ? 'not-allowed' : 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} /> : 'تقديم الطلب'}
                            </button>
                            <button type="button" onClick={() => setShowNewModal(false)} style={{ height: '44px', padding: '0 20px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                                إلغاء
                            </button>
                        </div>
                    </form>
                </AppModal>

                <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
            </div>
        </DashboardLayout>
    );
}
