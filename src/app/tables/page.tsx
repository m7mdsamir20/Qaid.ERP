'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { C, CAIRO, OUTFIT, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import { Plus, RefreshCw, Loader2, X, Check, Users, Table2, Edit3, Trash2, AlertCircle } from 'lucide-react';

const TABLE_STATUSES = [
    { value: 'available',    label: 'متاحة',        color: '#10b981', bg: '#10b98112' },
    { value: 'occupied',     label: 'مشغولة',        color: '#f59e0b', bg: '#f59e0b12' },
    { value: 'waiting_bill', label: 'تنتظر الحساب', color: '#ef4444', bg: '#ef444412' },
];
const statusInfo = (s: string) => TABLE_STATUSES.find(x => x.value === s) ?? TABLE_STATUSES[0];

export default function TablesPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const [tables, setTables]       = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem]   = useState<any>(null);
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [form, setForm] = useState({ name: '', capacity: 4, section: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try { const r = await fetch('/api/restaurant/tables'); setTables(await r.json()); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openModal = (item?: any) => {
        setEditItem(item ?? null);
        setForm(item ? { name: item.name, capacity: item.capacity, section: item.section ?? '' } : { name: '', capacity: 4, section: '' });
        setError(''); setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) { setError('اسم الطاولة مطلوب'); return; }
        setSaving(true);
        const res = await fetch('/api/restaurant/tables', {
            method: editItem ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, id: editItem?.id }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error); } else { setShowModal(false); load(); }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('هل أنت متأكد من الحذف؟'))) return;
        await fetch(`/api/restaurant/tables?id=${id}`, { method: 'DELETE' });
        load();
    };

    const handleStatus = async (id: string, status: string) => {
        await fetch('/api/restaurant/tables', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
        load();
    };

    const filtered = tables.filter(t => !filterStatus || t.status === filterStatus);
    const counts = { all: tables.length, available: tables.filter(t => t.status === 'available').length, occupied: tables.filter(t => t.status === 'occupied').length, waiting_bill: tables.filter(t => t.status === 'waiting_bill').length };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', fontFamily: CAIRO }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Table2 size={24} color={C.primary} /> {t('خريطة الطاولات')}
                        </h1>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.textMuted }}>{t('إدارة طاولات المطعم وحالتها')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={load} style={{ height: '40px', width: '40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={15} /></button>
                        <button onClick={() => openModal()} style={{ ...BTN_PRIMARY(false, false), height: '40px', padding: '0 20px', borderRadius: '10px', gap: '6px', fontSize: '13px' }}>
                            <Plus size={15} /> {t('طاولة جديدة')}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
                    {[{ label: 'الكل', count: counts.all, color: C.primary }, { label: 'متاحة', count: counts.available, color: '#10b981' }, { label: 'مشغولة', count: counts.occupied, color: '#f59e0b' }, { label: 'تنتظر حساب', count: counts.waiting_bill, color: '#ef4444' }].map(s => (
                        <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                            <p style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: 700, color: s.color, fontFamily: OUTFIT }}>{s.count}</p>
                            <p style={{ margin: 0, fontSize: '12px', color: C.textSecondary }}>{s.label}</p>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {[{ value: '', label: 'الكل' }, ...TABLE_STATUSES].map(s => (
                        <button key={s.value} onClick={() => setFilterStatus(s.value)}
                            style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${filterStatus === s.value ? C.primary : C.border}`, background: filterStatus === s.value ? `${C.primary}12` : 'transparent', color: filterStatus === s.value ? C.primary : C.textSecondary, fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                            {s.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textMuted }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                        {filtered.map(table => {
                            const st = statusInfo(table.status);
                            return (
                                <div key={table.id} style={{ background: C.card, border: `2px solid ${st.color}40`, borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: '12px', insetInlineEnd: '12px', display: 'flex', gap: '6px' }}>
                                        <button onClick={() => openModal(table)} style={{ width: 28, height: 28, borderRadius: '8px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit3 size={13} /></button>
                                        <button onClick={() => handleDelete(table.id)} style={{ width: 28, height: 28, borderRadius: '8px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button>
                                    </div>
                                    <div style={{ fontSize: '32px', textAlign: 'center' }}>🪑</div>
                                    <div>
                                        <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 700, color: C.textPrimary }}>{table.name}</p>
                                        {table.section && <p style={{ margin: '0 0 4px', fontSize: '11px', color: C.textMuted }}>{table.section}</p>}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: C.textSecondary, fontSize: '12px' }}><Users size={12} /> {table.capacity} أشخاص</div>
                                    </div>
                                    <div style={{ background: st.bg, border: `1px solid ${st.color}40`, borderRadius: '8px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 700, color: st.color, textAlign: 'center' }}>{st.label}</div>
                                    <select value={table.status} onChange={e => handleStatus(table.id, e.target.value)} style={{ ...IS, height: '32px', fontSize: '11px', cursor: 'pointer', fontFamily: CAIRO }}>
                                        {TABLE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                            );
                        })}
                        {filtered.length === 0 && !loading && (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: C.textMuted }}>
                                <Table2 size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                                <p>{t('لا توجد طاولات — أضف طاولة جديدة')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: C.textPrimary }}>{editItem ? t('تعديل الطاولة') : t('إضافة طاولة')}</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div><label style={LS}>{t('اسم الطاولة')} <span style={{ color: C.danger }}>*</span></label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('مثال: طاولة 1')} style={IS} /></div>
                            <div><label style={LS}>{t('السعة')}</label><input type="number" min="1" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} style={{ ...IS, fontFamily: OUTFIT }} /></div>
                            <div><label style={LS}>{t('القسم (اختياري)')}</label><input value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} placeholder={t('مثال: تراس، صالة داخلية')} style={IS} /></div>
                            {error && <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '10px 14px', color: C.danger, fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{error}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                            <button onClick={() => setShowModal(false)} style={{ flex: 1, height: '46px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>{t('إلغاء')}</button>
                            <button onClick={handleSave} disabled={saving} style={{ ...BTN_PRIMARY(saving, false), flex: 2, height: '46px', borderRadius: '12px', gap: '8px' }}>
                                {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> {t('جاري الحفظ...')}</> : <><Check size={15} /> {t('حفظ')}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
