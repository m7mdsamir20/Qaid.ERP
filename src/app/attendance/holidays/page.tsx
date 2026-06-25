'use client';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import { useEffect, useState } from 'react';
import { CalendarDays, Plus, Trash2, Loader2, RefreshCcw } from 'lucide-react';
import { C, CAIRO, IS, focusIn, focusOut } from '@/constants/theme';

interface OfficialHoliday {
    id: string;
    name: string;
    date: string;
    isRecurring: boolean;
}

export default function HolidaysPage() {
    const [holidays, setHolidays] = useState<OfficialHoliday[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [toast, setToast] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [form, setForm] = useState({ name: '', date: '', isRecurring: false });

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast(msg);
        setToastType(type);
        setTimeout(() => setToast(''), 3000);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/attendance/holidays');
            if (res.ok) setHolidays(await res.json());
        } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSave = async () => {
        if (!form.name || !form.date) {
            showToast('اسم العطلة والتاريخ مطلوبان', 'error');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/attendance/holidays', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const err = await res.json();
                showToast(err.error || 'فشل في الحفظ', 'error');
            } else {
                showToast('تم إضافة العطلة');
                setShowModal(false);
                setForm({ name: '', date: '', isRecurring: false });
                fetchData();
            }
        } catch { showToast('خطأ في الاتصال', 'error'); }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل تريد حذف هذه العطلة؟')) return;
        const res = await fetch(`/api/attendance/holidays?id=${id}`, { method: 'DELETE' });
        if (res.ok) { showToast('تم الحذف'); fetchData(); }
        else { showToast('فشل الحذف', 'error'); }
    };

    const byMonth: Record<string, OfficialHoliday[]> = {};
    holidays.forEach(h => {
        const month = new Date(h.date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' });
        if (!byMonth[month]) byMonth[month] = [];
        byMonth[month].push(h);
    });

    return (
        <DashboardLayout>
            <PageHeader
                title="العطلات الرسمية"
                subtitle="إدارة العطلات والأعياد الرسمية"
                icon={CalendarDays}
                primaryButton={{ label: 'إضافة عطلة', onClick: () => setShowModal(true) }}
            />

            {toast && (
                <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 999999, padding: '12px 24px', borderRadius: '10px', background: toastType === 'success' ? '#10b981' : '#ef4444', color: '#fff', fontFamily: CAIRO, fontWeight: 700, fontSize: '14px' }}>
                    {toast}
                </div>
            )}

            <div style={{ padding: '0 24px 24px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textSecondary }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                ) : holidays.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: C.textSecondary, fontFamily: CAIRO }}>
                        <p>لا توجد عطلات رسمية مضافة بعد</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {Object.entries(byMonth).map(([month, items]) => (
                            <div key={month}>
                                <h3 style={{ fontFamily: CAIRO, fontSize: '15px', fontWeight: 700, color: C.textSecondary, marginBottom: '10px', paddingBottom: '8px', borderBottom: `1px solid ${C.border}` }}>{month}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {items.map(h => (
                                        <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', fontFamily: CAIRO, fontWeight: 700, fontSize: '16px' }}>
                                                    {new Date(h.date).getDate()}
                                                </div>
                                                <div>
                                                    <div style={{ fontFamily: CAIRO, fontWeight: 700, fontSize: '15px', color: C.textPrimary }}>{h.name}</div>
                                                    <div style={{ fontFamily: CAIRO, fontSize: '12px', color: C.textSecondary, marginTop: '2px' }}>
                                                        {new Date(h.date).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                        {h.isRecurring && (
                                                            <span style={{ marginRight: '8px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                                <RefreshCcw size={11} /> سنوية
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDelete(h.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <AppModal show={showModal} onClose={() => setShowModal(false)} title="إضافة عطلة رسمية">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
                        <div>
                            <label style={{ display: 'block', fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary, marginBottom: '6px' }}>اسم العطلة *</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ ...IS, width: '100%' }} placeholder="مثال: عيد الفطر المبارك" onFocus={focusIn} onBlur={focusOut} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary, marginBottom: '6px' }}>تاريخ العطلة *</label>
                            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...IS, width: '100%' }} onFocus={focusIn} onBlur={focusOut} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontFamily: CAIRO, fontSize: '14px', color: C.textPrimary, userSelect: 'none' }}>
                            <span style={{
                                position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                                border: form.isRecurring ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
                                background: form.isRecurring ? C.primary : 'transparent',
                                transition: 'all 0.2s ease',
                                boxShadow: form.isRecurring ? `0 0 0 3px ${C.primary}22` : 'none',
                            }}>
                                <input
                                    type="checkbox"
                                    checked={form.isRecurring}
                                    onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))}
                                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', margin: 0 }}
                                />
                                {form.isRecurring && (
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                            </span>
                            عطلة سنوية متكررة
                        </label>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '8px', color: C.textSecondary, fontFamily: CAIRO, cursor: 'pointer' }}>إلغاء</button>
                            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: C.primary, color: '#fff', border: 'none', borderRadius: '8px', fontFamily: CAIRO, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                                {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                                إضافة العطلة
                            </button>
                        </div>
                    </div>
                </AppModal>
            )}
        </DashboardLayout>
    );
}
