'use client';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { useEffect, useState } from 'react';
import { Clock, Users, CheckCircle, XCircle, Loader2, Save, AlertTriangle, Check } from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, TABLE_STYLE, PAGE_BASE } from '@/constants/theme';
import CustomSelect from '@/components/CustomSelect';

interface Employee {
    id: string;
    name: string;
    code: string;
    department?: { name: string };
}

interface AttendanceRow {
    employeeId: string;
    name: string;
    code: string;
    department: string;
    checkIn: string;
    checkOut: string;
    status: string;
    notes: string;
    saved: boolean;
    recordId?: string;
    workHours?: number;
    lateMinutes?: number;
    overtimeHours?: number;
}

const STATUS_OPTIONS = [
    { value: 'present', label: 'حاضر', color: '#10b981' },
    { value: 'late', label: 'متأخر', color: '#f59e0b' },
    { value: 'absent', label: 'غائب', color: '#ef4444' },
    { value: 'on_leave', label: 'إجازة', color: '#6366f1' },
    { value: 'holiday', label: 'عطلة', color: '#64748b' },
];

function statusLabel(s: string) {
    return STATUS_OPTIONS.find(o => o.value === s)?.label || s;
}
function statusColor(s: string) {
    return STATUS_OPTIONS.find(o => o.value === s)?.color || C.textSecondary;
}

export default function AttendancePage() {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [rows, setRows] = useState<AttendanceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState('');

    const fetchEmployees = async () => {
        const res = await fetch('/api/employees');
        if (res.ok) {
            const data: Employee[] = await res.json();
            setEmployees(data.filter((e: any) => e.status === 'active'));
        }
    };

    const fetchAttendance = async (date: string) => {
        setLoading(true);
        try {
            const [empRes, attRes] = await Promise.all([
                fetch('/api/employees'),
                fetch(`/api/attendance?dateFrom=${date}&dateTo=${date}`),
            ]);
            const emps: Employee[] = empRes.ok ? (await empRes.json()).filter((e: any) => e.status === 'active') : [];
            const records: any[] = attRes.ok ? await attRes.json() : [];

            const recordMap = new Map(records.map(r => [r.employeeId, r]));

            const builtRows: AttendanceRow[] = emps.map(emp => {
                const rec = recordMap.get(emp.id);
                return {
                    employeeId: emp.id,
                    name: emp.name,
                    code: emp.code,
                    department: (emp as any).department?.name || '—',
                    checkIn: rec?.checkIn ? new Date(rec.checkIn).toTimeString().slice(0, 5) : '',
                    checkOut: rec?.checkOut ? new Date(rec.checkOut).toTimeString().slice(0, 5) : '',
                    status: rec?.status || 'present',
                    notes: rec?.notes || '',
                    saved: !!rec,
                    recordId: rec?.id,
                    workHours: rec?.workHours,
                    lateMinutes: rec?.lateMinutes,
                    overtimeHours: rec?.overtimeHours,
                };
            });

            setRows(builtRows);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance(selectedDate);
    }, [selectedDate]);

    const updateRow = (index: number, field: keyof AttendanceRow, value: string) => {
        setRows(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const setAllPresent = () => {
        setRows(prev => prev.map(r => ({ ...r, status: 'present' })));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            await Promise.all(
                rows.map(row =>
                    fetch('/api/attendance', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            employeeId: row.employeeId,
                            date: selectedDate,
                            checkIn: row.checkIn || undefined,
                            checkOut: row.checkOut || undefined,
                            status: row.status,
                            notes: row.notes || undefined,
                        }),
                    })
                )
            );
            setSavedMsg('تم حفظ الحضور بنجاح');
            setTimeout(() => setSavedMsg(''), 3000);
            await fetchAttendance(selectedDate);
        } finally {
            setSaving(false);
        }
    };

    const stats = [
        { label: 'حاضر', value: rows.filter(r => r.status === 'present').length, color: '#10b981' },
        { label: 'متأخر', value: rows.filter(r => r.status === 'late').length, color: '#f59e0b' },
        { label: 'غائب', value: rows.filter(r => r.status === 'absent').length, color: '#ef4444' },
        { label: 'إجازة', value: rows.filter(r => r.status === 'on_leave').length, color: '#6366f1' },
    ];

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ ...PAGE_BASE, fontFamily: CAIRO }}>
                <PageHeader
                    title="تسجيل الحضور والانصراف"
                    subtitle="تسجيل يومي لحضور وانصراف الموظفين"
                    icon={Clock}
                    primaryButton={{
                        label: saving ? 'جاري الحفظ...' : 'حفظ الكل',
                        onClick: handleSaveAll,
                        icon: Save,
                    }}
                />

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '16px' }}>
                    {stats.map((s, i) => (
                        <div key={i} style={{ background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ margin: '0 0 4px', fontSize: '11px', color: C.textSecondary, fontWeight: 600 }}>{s.label}</p>
                                <span style={{ fontSize: '22px', fontWeight: 700, color: s.color, fontFamily: OUTFIT }}>{s.value}</span>
                            </div>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                <Users size={18} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div>
                        <label style={LS}>اختر اليوم</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            style={{ ...IS, width: '200px' }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                        />
                    </div>
                    <div style={{ marginTop: '18px' }}>
                        <button
                            onClick={setAllPresent}
                            style={{ height: '42px', padding: '0 18px', borderRadius: '10px', background: '#10b98115', border: '1px solid #10b98130', color: '#10b981', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Check size={16} /> تحديد الكل حاضر
                        </button>
                    </div>
                    {savedMsg && (
                        <div style={{ marginTop: '18px', padding: '8px 16px', borderRadius: '10px', background: '#10b98115', border: '1px solid #10b98130', color: '#10b981', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle size={16} /> {savedMsg}
                        </div>
                    )}
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: C.textSecondary }}>
                        <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', marginLeft: '12px' }} />
                        جاري التحميل...
                    </div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <div className="scroll-table">
                            <table style={{ ...TABLE_STYLE.table, minWidth: '900px' }}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        {['الموظف', 'القسم', 'وقت الحضور', 'وقت الانصراف', 'الحالة', 'ساعات العمل', 'التأخير (د)', 'العمل الإضافي', 'ملاحظات'].map((h, i) => (
                                            <th key={i} style={TABLE_STYLE.th(i === 0)}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} style={{ textAlign: 'center', padding: '60px', color: C.textSecondary }}>
                                                <Clock size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                                <p>لا يوجد موظفون نشطون</p>
                                            </td>
                                        </tr>
                                    ) : rows.map((row, idx) => (
                                        <tr key={row.employeeId} style={TABLE_STYLE.row(idx === rows.length - 1)}>
                                            {/* الموظف */}
                                            <td style={TABLE_STYLE.td(true)}>
                                                <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px' }}>{row.name}</div>
                                                <div style={{ fontSize: '11px', color: C.primary, fontFamily: OUTFIT }}>{row.code}</div>
                                            </td>
                                            {/* القسم */}
                                            <td style={TABLE_STYLE.td(false)}>
                                                <span style={{ fontSize: '12px', color: C.textSecondary }}>{row.department}</span>
                                            </td>
                                            {/* وقت الحضور */}
                                            <td style={TABLE_STYLE.td(false)}>
                                                <input
                                                    type="time"
                                                    value={row.checkIn}
                                                    onChange={e => updateRow(idx, 'checkIn', e.target.value)}
                                                    style={{ ...IS, width: '120px', height: '34px', fontSize: '13px', fontFamily: OUTFIT }}
                                                    onFocus={focusIn}
                                                    onBlur={focusOut}
                                                />
                                            </td>
                                            {/* وقت الانصراف */}
                                            <td style={TABLE_STYLE.td(false)}>
                                                <input
                                                    type="time"
                                                    value={row.checkOut}
                                                    onChange={e => updateRow(idx, 'checkOut', e.target.value)}
                                                    style={{ ...IS, width: '120px', height: '34px', fontSize: '13px', fontFamily: OUTFIT }}
                                                    onFocus={focusIn}
                                                    onBlur={focusOut}
                                                />
                                            </td>
                                            {/* الحالة */}
                                            <td style={TABLE_STYLE.td(false)}>
                                                <CustomSelect
                                                    value={row.status}
                                                    onChange={val => updateRow(idx, 'status', val)}
                                                    options={STATUS_OPTIONS.map(opt => ({ value: opt.value, label: opt.label, style: { color: opt.color } }))}
                                                    hideSearch={true}
                                                    style={{ width: '130px', height: '34px', fontSize: '12px', color: statusColor(row.status) }}
                                                />
                                            </td>
                                            {/* ساعات العمل */}
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', fontFamily: OUTFIT }}>
                                                    {row.workHours ? row.workHours.toFixed(1) : '—'}
                                                </span>
                                            </td>
                                            {/* التأخير */}
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: row.lateMinutes ? '#f59e0b' : C.textMuted, fontFamily: OUTFIT }}>
                                                    {row.lateMinutes || '—'}
                                                </span>
                                            </td>
                                            {/* العمل الإضافي */}
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: row.overtimeHours ? '#6366f1' : C.textMuted, fontFamily: OUTFIT }}>
                                                    {row.overtimeHours ? row.overtimeHours.toFixed(1) : '—'}
                                                </span>
                                            </td>
                                            {/* ملاحظات */}
                                            <td style={TABLE_STYLE.td(false)}>
                                                <input
                                                    type="text"
                                                    value={row.notes}
                                                    onChange={e => updateRow(idx, 'notes', e.target.value)}
                                                    placeholder="ملاحظات..."
                                                    style={{ ...IS, width: '140px', height: '34px', fontSize: '12px' }}
                                                    onFocus={focusIn}
                                                    onBlur={focusOut}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

<style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
            </div>
        </DashboardLayout>
    );
}
