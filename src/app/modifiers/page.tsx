'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, IS, LS, PAGE_BASE, BTN_PRIMARY } from '@/constants/theme';
import { Plus, RefreshCw, Loader2, X, Check, Trash2, Edit3, AlertCircle, PlusCircle, Settings2, Package, Layers } from 'lucide-react';

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
                fetch('/api/items?all=true')
            ]);
            
            const rData = await r.json();
            const iData = await i.json();

            if (r.ok) {
                setModifiers(Array.isArray(rData) ? rData : []);
            } else {
                console.error("Failed to load modifiers:", rData);
                setModifiers([]);
            }

            if (i.ok) {
                setItems(Array.isArray(iData) ? iData : []);
            } else {
                setItems([]);
            }
        } catch (err) {
            console.error("Error loading data:", err);
            setModifiers([]);
            setItems([]);
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
                    primaryButton={{ label: t('إضافة جديدة'), onClick: () => openModal(), icon: Plus }}
                />

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textMuted }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : modifiers.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px', color: C.textMuted, fontFamily: CAIRO }}>
                        <Settings2 size={40} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                        <p style={{ margin: 0 }}>لا توجد إضافات — ابدأ بإضافة مجموعة</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                        {modifiers.map(mod => (
                            <div key={mod.id} style={{ 
                                background: `linear-gradient(145deg, ${C.card}, ${C.bg})`, 
                                border: `1px solid ${C.border}`, 
                                borderRadius: '16px', 
                                padding: '20px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                transition: 'transform 0.2s',
                            }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                                
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: `${C.primary}15`, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `inset 0 0 0 1px ${C.primary}30` }}>
                                            <Layers size={22} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{mod.name}</h3>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {mod.required ? 
                                                    <span style={{ background: '#ef444415', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, fontFamily: CAIRO }}>إجباري</span> :
                                                    <span style={{ background: '#10b98115', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, fontFamily: CAIRO }}>اختياري</span>
                                                }
                                                {mod.multiSelect ? 
                                                    <span style={{ background: `${C.primary}15`, color: C.primary, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, fontFamily: CAIRO }}>متعدد الاختيار</span> :
                                                    <span style={{ background: '#f59e0b15', color: '#f59e0b', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, fontFamily: CAIRO }}>خيار واحد</span>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button onClick={() => openModal(mod)} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: C.textSecondary, cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background=C.border} onMouseLeave={e=>e.currentTarget.style.background='transparent'} title="تعديل"><Edit3 size={15} /></button>
                                        <button onClick={() => handleDelete(mod.id)} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: C.danger, cursor: 'pointer', borderRadius: '8px', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='#ef444415'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} title="حذف"><Trash2 size={15} /></button>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div style={{ height: '1px', background: C.border, opacity: 0.6 }}></div>

                                {/* Options */}
                                <div>
                                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO }}>الخيارات المتاحة ({mod.options?.length})</p>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {mod.options?.map((opt: any) => (
                                            <div key={opt.id} style={{ 
                                                background: C.bg, 
                                                border: `1px solid ${C.border}`, 
                                                borderRadius: '8px', 
                                                padding: '6px 12px', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '8px',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                            }}>
                                                <span style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 600, fontFamily: CAIRO }}>{opt.name}</span>
                                                {opt.extraPrice > 0 ? (
                                                    <span style={{ fontSize: '11px', fontFamily: OUTFIT, fontWeight: 800, color: '#10b981', background: '#10b98115', padding: '2px 6px', borderRadius: '4px' }}>+{opt.extraPrice}</span>
                                                ) : (
                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, background: C.border, padding: '2px 6px', borderRadius: '4px', fontFamily: CAIRO }}>مجاني</span>
                                                )}
                                                {opt.item && (
                                                    <span style={{ fontSize: '11px', color: C.primary, display: 'flex', alignItems: 'center', gap: '4px', borderInlineStart: `1px solid ${C.border}`, paddingInlineStart: '8px', fontFamily: CAIRO }}>
                                                        <Package size={11} /> {opt.item.name}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AppModal show={showModal} onClose={() => setShowModal(false)} title={editItem ? 'تعديل الإضافة' : 'إضافة جديدة'} maxWidth="640px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* اسم المجموعة */}
                    <div><label style={LS}>اسم المجموعة <span style={{ color: C.danger }}>*</span></label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: درجة النضج" style={IS} /></div>

                    {/* إجباري / متعدد - Toggle Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {[{ key: 'required', label: 'إجباري', desc: 'لازم يختار الكاشير', color: '#ef4444' }, { key: 'multiSelect', label: 'اختيار متعدد', desc: 'يقدر يختار أكتر من واحد', color: C.primary }].map(opt => {
                            const isActive = (form as any)[opt.key];
                            return (
                                <button key={opt.key} type="button" onClick={() => setForm(f => ({ ...f, [opt.key]: !isActive }))}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', fontFamily: CAIRO, textAlign: 'start',
                                        background: isActive ? `${opt.color}10` : C.bg,
                                        border: `2px solid ${isActive ? opt.color + '60' : C.border}`,
                                        transition: 'all 0.2s',
                                    }}>
                                    <div style={{
                                        width: '36px', height: '20px', borderRadius: '20px', position: 'relative',
                                        background: isActive ? opt.color : C.border, transition: 'all 0.3s', flexShrink: 0,
                                    }}>
                                        <div style={{
                                            width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px',
                                            insetInlineStart: isActive ? '18px' : '2px', transition: 'all 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                        }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: isActive ? opt.color : C.textPrimary }}>{opt.label}</div>
                                        <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '1px' }}>{opt.desc}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* الخيارات */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <label style={LS}>الخيارات <span style={{ color: C.danger }}>*</span></label>
                            <button onClick={addOption} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: C.primary, background: `${C.primary}10`, border: `1px solid ${C.primary}30`, borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontFamily: CAIRO, transition: 'all 0.2s' }}><PlusCircle size={13} /> إضافة خيار</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {form.options.length === 0 && <p style={{ margin: 0, fontSize: '12px', color: C.textMuted, textAlign: 'center', padding: '20px', background: C.bg, borderRadius: '12px', border: `2px dashed ${C.border}`, fontFamily: CAIRO }}>اضغط "إضافة خيار" لإضافة الخيارات</p>}
                            {form.options.map((opt, i) => (
                                <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '8px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input value={opt.name} onChange={e => updateOption(i, 'name', e.target.value)} placeholder="اسم الخيار" style={{ ...IS, flex: 1.2, height: '38px', fontSize: '12.5px' }} />
                                    <div style={{ flex: 1.5 }}>
                                        <CustomSelect
                                            value={opt.itemId || ''}
                                            onChange={v => updateOption(i, 'itemId', v || null)}
                                            options={items.map(it => ({ value: it.id, label: it.name }))}
                                            placeholder="ربط مخزني (اختياري)"
                                            openUp
                                            style={{ height: '38px', minWidth: '0' }}
                                        />
                                    </div>
                                    <input type="number" min="0" value={opt.extraPrice || ''} onChange={e => updateOption(i, 'extraPrice', Number(e.target.value))} placeholder="+سعر" style={{ ...IS, width: '70px', height: '38px', fontSize: '12.5px', fontFamily: OUTFIT }} />
                                    <button onClick={() => removeOption(i)} style={{ width: 34, height: 34, borderRadius: '8px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={13} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '10px 14px', color: C.danger, fontSize: '12.5px', display: 'flex', gap: '8px', alignItems: 'center', fontFamily: CAIRO, fontWeight: 600 }}><AlertCircle size={14} />{error}</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '28px' }}>
                    <button onClick={handleSave} disabled={saving} style={{ height: '48px', borderRadius: '12px', background: C.primary, color: '#fff', border: 'none', fontWeight: 700, fontSize: '14px', fontFamily: CAIRO, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><Check size={16} /> {t('حفظ')}</>}
                    </button>
                    <button onClick={() => setShowModal(false)} style={{ height: '48px', borderRadius: '12px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer', fontSize: '13px' }}>{t('إلغاء')}</button>
                </div>
            </AppModal>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </DashboardLayout>
    );
}
