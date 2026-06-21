'use client';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import { useEffect, useState } from 'react';
import { Clock, Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import { C, CAIRO, IS, focusIn, focusOut } from '@/constants/theme';

interface WorkSchedule {
    id: string;
    name: string;
    checkInTime: string;
    checkOutTime: string;
    workDays: string;
    lateToleranceMinutes: number;
    overtimeStartAfter: number;
    _count: { employees: number };
}

const DAY_LABELS: Record<string, string> = {
    Sun: 'أحد', Mon: 'اثنين', Tue: 'ثلاثاء', Wed: 'أربعاء',
    Thu: 'خميس', Fri: 'جمعة', Sat: 'سبت',
};
const ALL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SchedulesPage() {
    const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<WorkSchedule | null>(null);
    const [toast, setToast] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [form, setForm] = useState({
        name: '',
        checkInTime: '08:00',
        checkOutTime: '17:00',
        workDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'] as string[],
        lateToleranceMinutes: 15,
        overtimeStartAfter: 30,
    });

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast(msg);
        setToastType(type);
        setTimeout(() => setToast(''), 3000);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/attendance/schedules');
            if (res.ok) setSchedules(await res.json());
        } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ name: '', checkInTime: '08:00', checkOutTime: '17:00', workDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'], lateToleranceMinutes: 15, overtimeStartAfter: 30 });
        setShowModal(true);
    };

    const openEdit = (s: WorkSchedule) => {
        setEditing(s);
        let days: string[] = [];
        try { days = JSON.parse(s.workDays); } catch { days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu']; }
        setForm({
            name: s.name,
            checkInTime: s.checkInTime,
            checkOutTime: s.checkOutTime,
            workDays: days,
            lateToleranceMinutes: s.lateToleranceMinutes,
            overtimeStartAfter: s.overtimeStartAfter,
        });
        setShowModal(true);
    };

    const toggleDay = (day: string) => {
        setForm(f => ({
            ...f,
            workDays: f.workDays.includes(day) ? f.workDays.filter(d => d !== day) : [...f.workDays, day],
        }));
    };

    const handleSave = async () => {
        if (!form.name || !form.checkInTime || !form.checkOutTime) {
            showToast('الاسم ووقت الحضور والانصراف مطلوبة', 'error');
            return;
        }
        setSaving(true);
        try {
            const method = editing ? 'PUT' : 'POST';
            const payload = editing ? { id: editing.id, ...form } : form;
            const res = await fetch('/api/attendance/schedules', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json();
                showToast(err.error || 'فشل في الحفظ', 'error');
            } else {
                showToast(editing ? 'تم تحديث الجدول' : 'تم إنشاء الجدول');
                setShowModal(false);
                fetchData();
            }
        } catch { showToast('خطأ في الاتصال', 'error'); }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل تريد حذف هذا الجدول؟')) return;
        const res = await fetch(`/api/attendance/schedules?id=${id}`, { method: 'DELETE' });
        if (res.ok) { showToast('تم الحذف'); fetchData(); }
        else { const e = await res.json(); showToast(e.error || 'فشل الحذف', 'error'); }
    };

    return (
        <DashboardLayout>
            <PageHeader
                title="جداول مواعيد العمل"
                subtitle="إدارة جداول الحضور والانصراف"
                icon={Clock}
                primaryButton={{ label: 'جدول جديد', onClick: openCreate }}
            />

            {toast && (
                <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, padding: '12px 24px', borderRadius: '10px', background: toastType === 'success' ? '#10b981' : '#ef4444', color: '#fff', fontFamily: CAIRO, fontWeight: 700, fontSize: '14px' }}>
                    {toast}
                </div>
            )}

            <div style={{ padding: '0 24px 24px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textSecondary }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                ) : schedules.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: C.textSecondary, fontFamily: CAIRO }}>
                        <Clock size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                        <p>لا توجد جداول عمل بعد</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                        {schedules.map(s => {
                            let days: string[] = [];
                            try { days = JSON.parse(s.workDays); } catch { }
                            return (
                                <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div>
                                            <div style={{ fontFamily: CAIRO, fontWeight: 700, fontSize: '16px', color: C.textPrimary }}>{s.name}</div>
                                            <div style={{ fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Users size={13} /> {s._count.employees} موظف
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => openEdit(s)} style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', padding: '4px' }}><Pencil size={16} /></button>
                                            <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px 12px', flex: 1, textAlign: 'center' }}>
                                            <div style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary }}>الحضور</div>
                                            <div style={{ fontFamily: OUTFIT, fontWeight: 700, fontSize: '18px', color: '#10b981' }}>{s.checkInTime}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px 12px', flex: 1, textAlign: 'center' }}>
                                            <div style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary }}>الانصراف</div>
                                            <div style={{ fontFamily: OUTFIT, fontWeight: 700, fontSize: '18px', color: '#ef4444' }}>{s.checkOutTime}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {ALL_DAYS.map(d => (
                                            <span key={d} style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontFamily: CAIRO, background: days.includes(d) ? C.primary : 'rgba(255,255,255,0.05)', color: days.includes(d) ? '#fff' : C.textSecondary }}>
                                                {DAY_LABELS[d]}
                                            </span>
                                        ))}
                                    </div>
                                    {(s.lateToleranceMinutes > 0 || s.overtimeStartAfter > 0) && (
                                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', fontSize: '12px', fontFamily: CAIRO, color: C.textSecondary }}>
                                            {s.lateToleranceMinutes > 0 && <span>تسامح التأخير: {s.lateToleranceMinutes} د</span>}
                                            {s.overtimeStartAfter > 0 && <span>| العمل الإضافي بعد: {s.overtimeStartAfter} د</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showModal && (
                <AppModal onClose={() => setShowModal(false)} title={editing ? 'تعديل جدول العمل' : 'جدول عمل جديد'}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
                        <div>
                            <label style={{ display: 'block', fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary, marginBottom: '6px' }}>اسم الجدول *</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ ...IS, width: '100%' }} placeholder="مثال: الدوام الرسمي" onFocus={focusIn} onBlur={focusOut} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary, marginBottom: '6px' }}>وقت الحضور *</label>
                                <input type="time" value={form.checkInTime} onChange={e => setForm(f => ({ ...f, checkInTime: e.target.value }))} style={{ ...IS, width: '100%' }} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary, marginBottom: '6px' }}>وقت الانصراف *</label>
                                <input type="time" value={form.checkOutTime} onChange={e => setForm(f => ({ ...f, checkOutTime: e.target.value }))} style={{ ...IS, width: '100%' }} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary, marginBottom: '8px' }}>أيام العمل</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {ALL_DAYS.map(d => (
                                    <button key={d} onClick={() => toggleDay(d)} style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${form.workDays.includes(d) ? C.primary : C.border}`, background: form.workDays.includes(d) ? C.primary : 'transparent', color: form.workDays.includes(d) ? '#fff' : C.textSecondary, fontFamily: CAIRO, fontSize: '13px', cursor: 'pointer' }}>
                                        {DAY_LABELS[d]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary, marginBottom: '6px' }}>مدة التسامح في التأخير (دقيقة)</label>
                                <input type="number" value={form.lateToleranceMinutes} onChange={e => setForm(f => ({ ...f, lateToleranceMinutes: Number(e.target.value) }))} style={{ ...IS, width: '100%' }} min={0} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary, marginBottom: '6px' }}>بداية العمل الإضافي بعد (دقيقة)</label>
                                <input type="number" value={form.overtimeStartAfter} onChange={e => setForm(f => ({ ...f, overtimeStartAfter: Number(e.target.value) }))} style={{ ...IS, width: '100%' }} min={0} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '8px', color: C.textSecondary, fontFamily: CAIRO, cursor: 'pointer' }}>إلغاء</button>
                            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: C.primary, color: '#fff', border: 'none', borderRadius: '8px', fontFamily: CAIRO, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                                {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                                {editing ? 'حفظ التعديلات' : 'إنشاء الجدول'}
                            </button>
                        </div>
                    </div>
                </AppModal>
            )}
        </DashboardLayout>
    );
}
