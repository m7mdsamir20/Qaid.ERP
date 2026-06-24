'use client';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { useEffect, useState } from 'react';
import { CalendarDays, Loader2, Users } from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, PAGE_BASE } from '@/constants/theme';
import CustomSelect from '@/components/CustomSelect';

interface DayRecord {
    date: string;
    status: string | null;
    checkIn: string | null;
    checkOut: string | null;
    workHours: number;
    lateMinutes: number;
    overtimeHours: number;
    recordId: string | null;
}

interface EmployeeSummary {
    present: number;
    absent: number;
    late: number;
    leaves: number;
    holidays: number;
    overtime: number;
    totalWorkHours: number;
    totalLateMinutes: number;
}

interface EmployeeRow {
    id: string;
    name: string;
    code: string;
    department: string | null;
    records: DayRecord[];
    summary: EmployeeSummary;
}

interface MonthlyData {
    month: number;
    year: number;
    days: string[];
    employees: EmployeeRow[];
}

const STATUS_COLORS: Record<string, string> = {
    present: '#10b981',
    late: '#f59e0b',
    absent: '#ef4444',
    on_leave: '#6366f1',
    holiday: '#64748b',
};

const STATUS_LABELS: Record<string, string> = {
    present: 'حاضر',
    late: 'متأخر',
    absent: 'غائب',
    on_leave: 'إجازة',
    holiday: 'عطلة',
};

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function MonthlyAttendancePage() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [data, setData] = useState<MonthlyData | null>(null);
    const [loading, setLoading] = useState(false);
    const [editCell, setEditCell] = useState<{ empId: string; date: string } | null>(null);
    const [editStatus, setEditStatus] = useState('present');
    const [editCheckIn, setEditCheckIn] = useState('');
    const [editCheckOut, setEditCheckOut] = useState('');
    const [savingCell, setSavingCell] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/attendance/monthly?month=${month}&year=${year}`);
            if (res.ok) setData(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [month, year]);

    const handleCellClick = (emp: EmployeeRow, dateStr: string) => {
        const rec = emp.records.find(r => r.date === dateStr);
        setEditCell({ empId: emp.id, date: dateStr });
        setEditStatus(rec?.status || 'present');
        setEditCheckIn(rec?.checkIn ? new Date(rec.checkIn).toTimeString().slice(0, 5) : '');
        setEditCheckOut(rec?.checkOut ? new Date(rec.checkOut).toTimeString().slice(0, 5) : '');
    };

    const handleSaveCell = async () => {
        if (!editCell) return;
        setSavingCell(true);
        try {
            await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: editCell.empId,
                    date: editCell.date,
                    status: editStatus,
                    checkIn: editCheckIn || undefined,
                    checkOut: editCheckOut || undefined,
                }),
            });
            setEditCell(null);
            await fetchData();
        } finally {
            setSavingCell(false);
        }
    };

    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

    // Totals row
    const totalsByDay = data?.days.map(dateStr => {
        const counts: Record<string, number> = {};
        data.employees.forEach(emp => {
            const rec = emp.records.find(r => r.date === dateStr);
            const s = rec?.status || 'null';
            counts[s] = (counts[s] || 0) + 1;
        });
        return counts;
    }) || [];

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ ...PAGE_BASE, fontFamily: CAIRO }}>
                <PageHeader
                    title="كشف الحضور الشهري"
                    subtitle="عرض جدول الحضور والانصراف لكل موظف خلال الشهر"
                    icon={CalendarDays}
                />

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <div>
                        <label style={LS}>الشهر</label>
                        <CustomSelect
                            value={month}
                            onChange={val => setMonth(Number(val))}
                            options={MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name }))}
                            hideSearch={true}
                            style={{ width: '150px', height: '42px' }}
                        />
                    </div>
                    <div>
                        <label style={LS}>السنة</label>
                        <CustomSelect
                            value={String(year)}
                            onChange={val => setYear(Number(val))}
                            options={years.map(y => ({ value: String(y), label: String(y) }))}
                            hideSearch={true}
                            style={{ width: '120px', height: '42px' }}
                        />
                    </div>
                    <div style={{ marginBottom: '2px' }}>
                        <button onClick={fetchData} style={{ height: '42px', padding: '0 20px', borderRadius: '10px', background: C.primary, border: 'none', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: CAIRO }}>
                            عرض
                        </button>
                    </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.textSecondary }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: STATUS_COLORS[key] }} />
                            {label}
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: C.textSecondary }}>
                        <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', marginLeft: '12px' }} />
                        جاري التحميل...
                    </div>
                ) : data ? (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${200 + data.days.length * 38}px` }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'start', fontSize: '12px', fontWeight: 700, color: C.textSecondary, minWidth: '180px', position: 'sticky', right: 0, background: C.card, zIndex: 10, borderLeft: `1px solid ${C.border}` }}>
                                        الموظف
                                    </th>
                                    {data.days.map(d => {
                                        const dayNum = new Date(d).getDate();
                                        const dayOfWeek = new Date(d).getDay();
                                        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
                                        return (
                                            <th key={d} style={{ padding: '6px 2px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: isWeekend ? '#f59e0b' : C.textSecondary, minWidth: '36px' }}>
                                                {dayNum}
                                            </th>
                                        );
                                    })}
                                    <th style={{ padding: '12px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: C.textSecondary, minWidth: '200px', borderRight: `1px solid ${C.border}` }}>
                                        الملخص
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.employees.map((emp, ei) => (
                                    <tr key={emp.id} style={{ borderBottom: ei === data.employees.length - 1 ? 'none' : `1px solid ${C.border}` }}>
                                        {/* Employee name - sticky */}
                                        <td style={{ padding: '10px 16px', position: 'sticky', right: 0, background: C.card, zIndex: 5, borderLeft: `1px solid ${C.border}` }}>
                                            <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px' }}>{emp.name}</div>
                                            <div style={{ fontSize: '11px', color: C.textSecondary }}>{emp.department || '—'}</div>
                                        </td>
                                        {/* Day cells */}
                                        {emp.records.map(rec => (
                                            <td
                                                key={rec.date}
                                                onClick={() => handleCellClick(emp, rec.date)}
                                                title={rec.status ? STATUS_LABELS[rec.status] || rec.status : 'انقر للتسجيل'}
                                                style={{ padding: '4px', textAlign: 'center', cursor: 'pointer' }}
                                            >
                                                <div style={{
                                                    width: '32px', height: '32px', borderRadius: '6px', margin: '0 auto',
                                                    background: rec.status ? `${STATUS_COLORS[rec.status]}20` : 'rgba(255,255,255,0.03)',
                                                    border: `1px solid ${rec.status ? `${STATUS_COLORS[rec.status]}40` : C.border}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '10px', fontWeight: 700,
                                                    color: rec.status ? STATUS_COLORS[rec.status] : C.textMuted,
                                                    transition: 'all 0.15s'
                                                }}>
                                                    {rec.status ? (rec.status === 'present' ? 'ح' : rec.status === 'late' ? 'ت' : rec.status === 'absent' ? 'غ' : rec.status === 'on_leave' ? 'إ' : 'ع') : '—'}
                                                </div>
                                            </td>
                                        ))}
                                        {/* Summary */}
                                        <td style={{ padding: '10px', borderRight: `1px solid ${C.border}` }}>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                {[
                                                    { key: 'present', val: emp.summary.present, color: '#10b981', label: 'ح' },
                                                    { key: 'absent', val: emp.summary.absent, color: '#ef4444', label: 'غ' },
                                                    { key: 'late', val: emp.summary.late, color: '#f59e0b', label: 'ت' },
                                                    { key: 'leaves', val: emp.summary.leaves, color: '#6366f1', label: 'إ' },
                                                ].map(s => (
                                                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: s.color, fontWeight: 700 }}>
                                                        <span>{s.label}:</span>
                                                        <span style={{ fontFamily: OUTFIT }}>{s.val}</span>
                                                    </div>
                                                ))}
                                                {emp.summary.overtime > 0 && (
                                                    <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 700, display: 'flex', gap: '3px' }}>
                                                        <span>إ.إض:</span>
                                                        <span style={{ fontFamily: OUTFIT }}>{emp.summary.overtime.toFixed(1)}س</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {/* Totals row */}
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
                                    <td style={{ padding: '10px 16px', fontWeight: 700, color: C.textPrimary, fontSize: '12px', position: 'sticky', right: 0, background: 'rgba(14,23,42,0.9)', borderLeft: `1px solid ${C.border}` }}>
                                        الإجماليات
                                    </td>
                                    {totalsByDay.map((counts, i) => (
                                        <td key={i} style={{ padding: '4px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '10px', fontFamily: OUTFIT }}>
                                                {counts['present'] ? <div style={{ color: '#10b981', fontWeight: 700 }}>{counts['present']}</div> : null}
                                                {counts['absent'] ? <div style={{ color: '#ef4444', fontWeight: 700 }}>{counts['absent']}</div> : null}
                                            </div>
                                        </td>
                                    ))}
                                    <td style={{ borderRight: `1px solid ${C.border}` }} />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '60px', color: C.textSecondary }}>
                        <Users size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                        <p>اختر الشهر والسنة لعرض البيانات</p>
                    </div>
                )}

                {/* Edit Cell Modal */}
                {editCell && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={() => setEditCell(null)}>
                        <div dir="rtl" style={{ background: C.card, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '24px', minWidth: '360px', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ margin: '0 0 20px', color: C.textPrimary, fontSize: '15px', fontWeight: 700, fontFamily: CAIRO }}>
                                تعديل سجل الحضور
                            </h3>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={LS}>الحالة</label>
                                <CustomSelect
                                    value={editStatus}
                                    onChange={val => setEditStatus(val)}
                                    options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                                    hideSearch={true}
                                    style={{ width: '100%', height: '42px' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                <div>
                                    <label style={LS}>وقت الحضور</label>
                                    <input type="time" value={editCheckIn} onChange={e => setEditCheckIn(e.target.value)} style={IS} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={LS}>وقت الانصراف</label>
                                    <input type="time" value={editCheckOut} onChange={e => setEditCheckOut(e.target.value)} style={IS} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={handleSaveCell} disabled={savingCell} style={{ flex: 1, height: '42px', borderRadius: '10px', background: C.primary, border: 'none', color: '#fff', fontWeight: 700, cursor: savingCell ? 'not-allowed' : 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    {savingCell ? <Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} /> : 'حفظ'}
                                </button>
                                <button onClick={() => setEditCell(null)} style={{ height: '42px', padding: '0 20px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }` }} />
            </div>
        </DashboardLayout>
    );
}
