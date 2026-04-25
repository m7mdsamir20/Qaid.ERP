'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { C, CAIRO, OUTFIT, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import { Plus, RefreshCw, Loader2, X, Check, Trash2, Edit3, AlertCircle, PlusCircle, Settings2 } from 'lucide-react';

interface Option { name: string; extraPrice: number; }

export default function ModifiersPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';

    const [modifiers, setModifiers] = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem]   = useState<any>(null);
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState('');

    const [form, setForm] = useState({ name: '', required: false, multiSelect: false, options: [] as Option[] });

    const load = useCallback(async () => {
        setLoading(true);
        try { const r = await fetch('/api/restaurant/modifiers'); setModifiers(await r.json()); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openModal = (item?: any) => {
        setEditItem(item ?? null);
        setForm(item
            ? { name: item.name, required: item.required, multiSelect: item.multiSelect, options: item.options.map((o: any) => ({ name: o.name, extraPrice: o.extraPrice })) }
            : { name: '', required: false, multiSelect: false, options: [] }
        );
        setError(''); setShowModal(true);
    };

    const addOption = () => setForm(f => ({ ...f, options: [...f.options, { name: '', extraPrice: 0 }] }));
    const removeOption = (i: number) => setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));
    const updateOption = (i: number, field: keyof Option, value: any) =>
        setForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? { ...o, [field]: value } : o) }));

    const handleSave = async () => {
        if (!form.name.trim()) { setError('اسم الإضافة مطلوب'); return; }
        if (form.options.length === 0) { setError('أضف خياراً واحداً على الأقل'); return; }
        if (form.options.some(o => !o.name.trim())) { setError('اسم كل خيار مطلوب'); return; }
        setSaving(true);
        const res = await fetch('/api/restaurant/modifiers', {
            method: editItem ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, id: editItem?.id }),
        });
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
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '32px', maxWidth: '900px', margin: '0 auto', fontFamily: CAIRO }}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Settings2 size={24} color={C.primary} /> {t('الإضافات والتعديلات')}
                        </h1>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.textMuted }}>{t('تحكم في الخيارات الإضافية على الوجبات (مثل: درجة النضج، الإضافات)')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={load} style={{ height: '40px', width: '40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={15} /></button>
                        <button onClick={() => openModal()} style={{ ...BTN_PRIMARY(false, false), height: '40px', padding: '0 20px', borderRadius: '10px', gap: '6px', fontSize: '13px' }}>
                            <Plus size={15} /> {t('إضافة جديدة')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textMuted }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : modifiers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px', color: C.textMuted }}>
                        <Settings2 size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 16px' }} />
                        <p style={{ margin: 0, fontSize: '15px' }}>لا توجد إضافات — ابدأ بإضافة مجموعة</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {modifiers.map(mod => (
                            <div key={mod.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '18px', padding: '20px 24px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: C.textPrimary }}>{mod.name}</h3>
                                            {mod.required && <span style={{ background: '#ef444412', border: '1px solid #ef444440', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>إجباري</span>}
                                            {mod.multiSelect && <span style={{ background: `${C.primary}12`, border: `1px solid ${C.primary}40`, borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, color: C.primary }}>متعدد</span>}
                                        </div>
                                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textMuted }}>{mod.options?.length} خيار</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => openModal(mod)} style={{ width: 34, height: 34, borderRadius: '10px', border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit3 size={14} /></button>
                                        <button onClick={() => handleDelete(mod.id)} style={{ width: 34, height: 34, borderRadius: '10px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {mod.options?.map((opt: any) => (
                                        <div key={opt.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '12.5px', color: C.textPrimary }}>{opt.name}</span>
                                            {opt.extraPrice > 0 && <span style={{ fontSize: '11px', fontFamily: OUTFIT, color: '#10b981', fontWeight: 700 }}>+{opt.extraPrice}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', margin: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: C.textPrimary }}>{editItem ? 'تعديل الإضافة' : 'إضافة جديدة'}</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div><label style={LS}>اسم المجموعة <span style={{ color: C.danger }}>*</span></label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: درجة النضج، الإضافات" style={IS} /></div>

                            <div style={{ display: 'flex', gap: '16px' }}>
                                {[{ key: 'required', label: 'إجباري (لازم يختار)' }, { key: 'multiSelect', label: 'اختيار متعدد' }].map(opt => (
                                    <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: C.textSecondary, userSelect: 'none' }}>
                                        <input type="checkbox" checked={(form as any)[opt.key]} onChange={e => setForm(f => ({ ...f, [opt.key]: e.target.checked }))}
                                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: C.primary }} />
                                        {opt.label}
                                    </label>
                                ))}
                            </div>

                            {/* الخيارات */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={LS}>الخيارات <span style={{ color: C.danger }}>*</span></label>
                                    <button onClick={addOption} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: CAIRO }}>
                                        <PlusCircle size={14} /> إضافة خيار
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {form.options.length === 0 && (
                                        <p style={{ margin: 0, fontSize: '12px', color: C.textMuted, textAlign: 'center', padding: '16px', background: C.bg, borderRadius: '10px', border: `1px dashed ${C.border}` }}>
                                            اضغط "إضافة خيار" لإضافة الخيارات
                                        </p>
                                    )}
                                    {form.options.map((opt, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input value={opt.name} onChange={e => updateOption(i, 'name', e.target.value)} placeholder="اسم الخيار (مثال: بدون بصل)" style={{ ...IS, flex: 1, height: '38px', fontSize: '12.5px' }} />
                                            <input type="number" min="0" value={opt.extraPrice || ''} onChange={e => updateOption(i, 'extraPrice', Number(e.target.value))} placeholder="+سعر" style={{ ...IS, width: '80px', height: '38px', fontSize: '12.5px', fontFamily: OUTFIT }} />
                                            <button onClick={() => removeOption(i)} style={{ width: 34, height: 34, borderRadius: '8px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={13} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {error && <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '10px 14px', color: C.danger, fontSize: '12.5px', display: 'flex', gap: '8px', alignItems: 'center' }}><AlertCircle size={14} />{error}</div>}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                            <button onClick={() => setShowModal(false)} style={{ flex: 1, height: '46px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>إلغاء</button>
                            <button onClick={handleSave} disabled={saving} style={{ ...BTN_PRIMARY(saving, false), flex: 2, height: '46px', borderRadius: '12px', gap: '8px' }}>
                                {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</> : <><Check size={15} /> حفظ</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
