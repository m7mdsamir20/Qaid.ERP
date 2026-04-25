'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import { C, CAIRO, OUTFIT, IS, LS, PAGE_BASE, BTN_PRIMARY } from '@/constants/theme';
import { Plus, RefreshCw, Loader2, X, Check, Trash2, Edit3, AlertCircle, PlusCircle, Settings2 } from 'lucide-react';

interface Option { id?: string; name: string; extraPrice: number; itemId?: string | null; }

export default function ModifiersPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';

    const [modifiers, setModifiers] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem]   = useState<any>(null);
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState('');
    const [form, setForm] = useState({ name: '', required: false, multiSelect: false, options: [] as Option[] });

    const load = useCallback(async () => {
        setLoading(true);
        try { 
            const [r, i] = await Promise.all([
                fetch('/api/restaurant/modifiers'),
                fetch('/api/items')
            ]);
            setModifiers(await r.json());
            setItems(await i.json());
        }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const openModal = (item?: any) => {
        setEditItem(item ?? null);
        setForm(item ? { name: item.name, required: item.required, multiSelect: item.multiSelect, options: item.options.map((o: any) => ({ id: o.id, name: o.name, extraPrice: o.extraPrice, itemId: o.itemId })) } : { name: '', required: false, multiSelect: false, options: [] });
        setError(''); setShowModal(true);
    };

    const addOption    = () => setForm(f => ({ ...f, options: [...f.options, { name: '', extraPrice: 0, itemId: null }] }));
    const removeOption = (i: number) => setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));
    const updateOption = (i: number, field: keyof Option, value: any) => setForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? { ...o, [field]: value } : o) }));

    const handleSave = async () => {
        if (!form.name.trim()) { setError('اسم الإضافة مطلوب'); return; }
        if (form.options.length === 0) { setError('أضف خياراً واحداً على الأقل'); return; }
        if (form.options.some(o => !o.name.trim())) { setError('اسم كل خيار مطلوب'); return; }
        setSaving(true);
        const res = await fetch('/api/restaurant/modifiers', { method: editItem ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: editItem?.id }) });
        if (!res.ok) { const d = await res.json(); setError(d.error); } else { setShowModal(false); load(); }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('هل أنت متأكد؟'))) return;
        await fetch(`/api/restaurant/modifiers?id=${id}`, { method: 'DELETE' });
        load();
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={t('الإضافات والتعديلات')}
                    subtitle={t('تحكم في الخيارات الإضافية على الوجبات (درجة النضج، إضافات...)')}
                    icon={Settings2}
                    actions={[
                        <button key="r" onClick={load} style={{ height: '42px', width: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={15} /></button>
                    ]}
                    primaryButton={{ label: t('إضافة جديدة'), onClick: () => openModal(), icon: Plus }}
                />

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textMuted }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : modifiers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px', color: C.textMuted, fontFamily: CAIRO }}>
                        <Settings2 size={40} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                        <p style={{ margin: 0 }}>لا توجد إضافات — ابدأ بإضافة مجموعة</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {modifiers.map(mod => (
                            <div key={mod.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{mod.name}</h3>
                                            {mod.required && <span style={{ background: '#ef444412', border: '1px solid #ef444440', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, color: '#ef4444', fontFamily: CAIRO }}>إجباري</span>}
                                            {mod.multiSelect && <span style={{ background: `${C.primary}12`, border: `1px solid ${C.primary}40`, borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, color: C.primary, fontFamily: CAIRO }}>متعدد</span>}
                                        </div>
                                        <p style={{ margin: '3px 0 0', fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>{mod.options?.length} خيار</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={() => openModal(mod)} style={{ width: 32, height: 32, borderRadius: '8px', border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit3 size={13} /></button>
                                        <button onClick={() => handleDelete(mod.id)} style={{ width: 32, height: 32, borderRadius: '8px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {mod.options?.map((opt: any) => (
                                        <div key={opt.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{opt.name}</span>
                                            {opt.extraPrice > 0 && <span style={{ fontSize: '11px', fontFamily: OUTFIT, fontWeight: 700, color: '#10b981' }}>+{opt.extraPrice}</span>}
                                            {opt.item && <span style={{ fontSize: '10px', color: C.primary, borderInlineStart: `1px solid ${C.border}`, paddingInlineStart: '5px' }}>📦 {opt.item.name}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AppModal show={showModal} onClose={() => setShowModal(false)} title={editItem ? 'تعديل الإضافة' : 'إضافة جديدة'} maxWidth="520px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div><label style={LS}>اسم المجموعة <span style={{ color: C.danger }}>*</span></label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: درجة النضج" style={IS} /></div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        {[{ key: 'required', label: 'إجباري' }, { key: 'multiSelect', label: 'اختيار متعدد' }].map(opt => (
                            <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO, userSelect: 'none' }}>
                                <input type="checkbox" checked={(form as any)[opt.key]} onChange={e => setForm(f => ({ ...f, [opt.key]: e.target.checked }))} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: C.primary }} />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={LS}>الخيارات <span style={{ color: C.danger }}>*</span></label>
                            <button onClick={addOption} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: CAIRO }}><PlusCircle size={13} /> إضافة خيار</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {form.options.length === 0 && <p style={{ margin: 0, fontSize: '12px', color: C.textMuted, textAlign: 'center', padding: '12px', background: C.bg, borderRadius: '8px', border: `1px dashed ${C.border}`, fontFamily: CAIRO }}>اضغط "إضافة خيار"</p>}
                            {form.options.map((opt, i) => (
                                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <input value={opt.name} onChange={e => updateOption(i, 'name', e.target.value)} placeholder="اسم الخيار" style={{ ...IS, flex: 1, height: '38px', fontSize: '12.5px' }} />
                                    <input type="number" min="0" value={opt.extraPrice || ''} onChange={e => updateOption(i, 'extraPrice', Number(e.target.value))} placeholder="+سعر" style={{ ...IS, width: '75px', height: '38px', fontSize: '12.5px', fontFamily: OUTFIT }} />
                                    <select value={opt.itemId || ''} onChange={e => updateOption(i, 'itemId', e.target.value || null)} style={{ ...IS, width: '120px', height: '38px', fontSize: '12px', padding: '0 8px' }}>
                                        <option value="">-- بدون ربط مخزني --</option>
                                        {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                                    </select>
                                    <button onClick={() => removeOption(i)} style={{ width: 32, height: 32, borderRadius: '8px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    {error && <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '8px', padding: '8px 12px', color: C.danger, fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center', fontFamily: CAIRO }}><AlertCircle size={13} />{error}</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '28px' }}>
                    <button onClick={handleSave} disabled={saving} style={{ height: '44px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: saving ? 'not-allowed' : 'pointer' }}>
                        {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : t('حفظ')}
                    </button>
                    <button onClick={() => setShowModal(false)} style={{ height: '44px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>{t('إلغاء')}</button>
                </div>
            </AppModal>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </DashboardLayout>
    );
}
