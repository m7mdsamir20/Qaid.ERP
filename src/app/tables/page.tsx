'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, IS, LS, BTN_PRIMARY, PAGE_BASE } from '@/constants/theme';
import { Plus, RefreshCw, Loader2, X, Check, Users, Table2, Edit3, Trash2, AlertCircle, CheckCircle2, Receipt } from 'lucide-react';

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
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={t('خريطة الطاولات')}
                    subtitle={t('إدارة طاولات المطعم وحالتها')}
                    icon={Table2}
                    actions={[
                        <button key="refresh" onClick={load} style={{ height: '42px', width: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={15} /></button>
                    ]}
                    primaryButton={{ label: t('طاولة جديدة'), onClick: () => openModal(), icon: Plus }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: 'إجمالي الطاولات', count: counts.all, color: C.primary, icon: <Table2 size={18} /> },
                        { label: 'الطاولات المتاحة', count: counts.available, color: '#10b981', icon: <CheckCircle2 size={18} /> },
                        { label: 'الطاولات المشغولة', count: counts.occupied, color: '#f59e0b', icon: <Users size={18} /> },
                        { label: 'تنتظر حساب', count: counts.waiting_bill, color: '#ef4444', icon: <Receipt size={18} /> }
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                            padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'all 0.2s', position: 'relative'
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = `${s.color}15`}
                            onMouseLeave={e => e.currentTarget.style.background = `${s.color}08`}
                        >
                            <div style={{ textAlign: 'start' }}>
                                <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', whiteSpace: 'nowrap' }}>{s.label}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.count}</span>
                                    <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500 }}>طاولة</span>
                                </div>
                            </div>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                {s.icon}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="filter-bar" style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
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
                                    <CustomSelect
                                        value={table.status}
                                        onChange={(v) => handleStatus(table.id, v)}
                                        options={TABLE_STATUSES}
                                    />
                                </div>
                            );
                        })}
                        {filtered.length === 0 && !loading && (
                            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px', color: C.textMuted }}>
                                <Table2 size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                                <p>{t('لا توجد طاولات — أضف طاولة جديدة')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <AppModal show={showModal} onClose={() => setShowModal(false)} title={editItem ? t('تعديل الطاولة') : t('إضافة طاولة')} maxWidth="520px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div><label style={LS}>{t('اسم الطاولة')} <span style={{ color: C.danger }}>*</span></label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('مثال: طاولة 1')} style={IS} /></div>
                    <div><label style={LS}>{t('السعة')}</label><input type="number" min="1" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} style={{ ...IS, fontFamily: OUTFIT }} /></div>
                    <div><label style={LS}>{t('القسم (اختياري)')}</label><input value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} placeholder={t('مثال: تراس، صالة داخلية')} style={IS} /></div>
                    {error && <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '10px 14px', color: C.danger, fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} />{error}</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '28px' }}>
                    <button onClick={handleSave} disabled={saving} style={{ height: '44px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: saving ? 'not-allowed' : 'pointer' }}>
                        {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : t('حفظ')}
                    </button>
                    <button onClick={() => setShowModal(false)} style={{ height: '44px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>{t('إلغاء')}</button>
                </div>
            </AppModal>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
