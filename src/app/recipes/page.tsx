'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { C, CAIRO, OUTFIT, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import { Plus, RefreshCw, Loader2, X, Check, Trash2, Edit3, AlertCircle, PlusCircle, BookOpen } from 'lucide-react';

interface RecipeIngredient { itemId: string; itemName: string; quantity: number; unit: string; }

export default function RecipesPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';

    const [recipes, setRecipes]     = useState<any[]>([]);
    const [items, setItems]         = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem]   = useState<any>(null);
    const [saving, setSaving]       = useState(false);
    const [error, setError]         = useState('');

    const [form, setForm] = useState({ itemId: '', notes: '', ingredients: [] as RecipeIngredient[] });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [rr, ir] = await Promise.all([fetch('/api/restaurant/recipes'), fetch('/api/items')]);
            const [r, i]   = await Promise.all([rr.json(), ir.json()]);
            setRecipes(Array.isArray(r) ? r : []);
            setItems(Array.isArray(i) ? i : []);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Items that don't have a recipe yet (for new recipe)
    const availableItems = items.filter(it => !recipes.some(r => r.itemId === it.id && (!editItem || r.id !== editItem.id)));

    const openModal = (recipe?: any) => {
        setEditItem(recipe ?? null);
        setForm(recipe ? {
            itemId: recipe.itemId,
            notes: recipe.notes ?? '',
            ingredients: recipe.items.map((ri: any) => ({ itemId: ri.itemId, itemName: '', quantity: ri.quantity, unit: ri.unit ?? '' })),
        } : { itemId: '', notes: '', ingredients: [] });
        setError(''); setShowModal(true);
    };

    const addIngredient = () => setForm(f => ({ ...f, ingredients: [...f.ingredients, { itemId: '', itemName: '', quantity: 1, unit: '' }] }));
    const removeIng = (i: number) => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));
    const updateIng = (i: number, field: keyof RecipeIngredient, value: any) =>
        setForm(f => ({ ...f, ingredients: f.ingredients.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing) }));

    const handleSave = async () => {
        if (!form.itemId) { setError('اختر الوجبة أولاً'); return; }
        if (form.ingredients.length === 0) { setError('أضف مكوناً واحداً على الأقل'); return; }
        if (form.ingredients.some(i => !i.itemId || i.quantity <= 0)) { setError('تأكد من اختيار كل المكونات وكمياتها'); return; }
        setSaving(true);
        const res = await fetch('/api/restaurant/recipes', {
            method: editItem ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, id: editItem?.id, items: form.ingredients }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error); } else { setShowModal(false); load(); }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('حذف الوصفة؟')) return;
        await fetch(`/api/restaurant/recipes?id=${id}`, { method: 'DELETE' });
        load();
    };

    const getItemName = (id: string) => items.find(i => i.id === id)?.name ?? id;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '32px', maxWidth: '900px', margin: '0 auto', fontFamily: CAIRO }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <BookOpen size={24} color={C.primary} /> {t('وصفات الطبخ')}
                        </h1>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.textMuted }}>{t('ربط كل وجبة بمكوناتها الخام لتتبع المخزون')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={load} style={{ height: '40px', width: '40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={15} /></button>
                        <button onClick={() => openModal()} style={{ ...BTN_PRIMARY(false, false), height: '40px', padding: '0 20px', borderRadius: '10px', gap: '6px', fontSize: '13px' }}>
                            <Plus size={15} /> {t('وصفة جديدة')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textMuted }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : recipes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px', color: C.textMuted }}>
                        <BookOpen size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 16px' }} />
                        <p style={{ margin: 0, fontSize: '15px' }}>لا توجد وصفات — ابدأ بإضافة وصفة لوجبة</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {recipes.map(recipe => (
                            <div key={recipe.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '18px', padding: '20px 24px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: C.textPrimary }}>🍽️ {recipe.item?.name}</h3>
                                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textMuted }}>{recipe.items?.length} مكون</p>
                                        {recipe.notes && <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textSecondary }}>📝 {recipe.notes}</p>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => openModal(recipe)} style={{ width: 34, height: 34, borderRadius: '10px', border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit3 size={14} /></button>
                                        <button onClick={() => handleDelete(recipe.id)} style={{ width: 34, height: 34, borderRadius: '10px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {recipe.items?.map((ri: any, i: number) => (
                                        <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: C.textSecondary }}>
                                            {getItemName(ri.itemId)} — <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{ri.quantity}</span> {ri.unit}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '560px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: C.textPrimary }}>{editItem ? 'تعديل الوصفة' : 'وصفة جديدة'}</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={LS}>الوجبة <span style={{ color: C.danger }}>*</span></label>
                                <select value={form.itemId} onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))} style={{ ...IS, cursor: 'pointer', fontFamily: CAIRO }}>
                                    <option value="">— اختر الوجبة —</option>
                                    {(editItem ? items : availableItems).map(it => (
                                        <option key={it.id} value={it.id}>{it.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={LS}>ملاحظات الوصفة</label>
                                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="تعليمات الطبخ..." style={IS} />
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={LS}>المكونات <span style={{ color: C.danger }}>*</span></label>
                                    <button onClick={addIngredient} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: CAIRO }}>
                                        <PlusCircle size={14} /> إضافة مكون
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {form.ingredients.length === 0 && (
                                        <p style={{ margin: 0, fontSize: '12px', color: C.textMuted, textAlign: 'center', padding: '16px', background: C.bg, borderRadius: '10px', border: `1px dashed ${C.border}` }}>
                                            اضغط "إضافة مكون" لإضافة المواد الخام
                                        </p>
                                    )}
                                    {form.ingredients.map((ing, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <select value={ing.itemId} onChange={e => updateIng(i, 'itemId', e.target.value)} style={{ ...IS, flex: 1, height: '38px', fontSize: '12px', fontFamily: CAIRO, cursor: 'pointer' }}>
                                                <option value="">— المادة الخام —</option>
                                                {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                                            </select>
                                            <input type="number" min="0.01" step="0.01" value={ing.quantity || ''} onChange={e => updateIng(i, 'quantity', Number(e.target.value))} placeholder="الكمية" style={{ ...IS, width: '75px', height: '38px', fontSize: '12px', fontFamily: OUTFIT }} />
                                            <input value={ing.unit} onChange={e => updateIng(i, 'unit', e.target.value)} placeholder="جرام" style={{ ...IS, width: '70px', height: '38px', fontSize: '12px' }} />
                                            <button onClick={() => removeIng(i)} style={{ width: 34, height: 34, borderRadius: '8px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={13} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {error && <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '10px 14px', color: C.danger, fontSize: '12.5px', display: 'flex', gap: '8px', alignItems: 'center' }}><AlertCircle size={14} />{error}</div>}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                            <button onClick={() => setShowModal(false)} style={{ flex: 1, height: '46px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>إلغاء</button>
                            <button onClick={handleSave} disabled={saving} style={{ ...BTN_PRIMARY(saving, false), flex: 2, height: '46px', borderRadius: '12px', gap: '8px' }}>
                                {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</> : <><Check size={15} /> حفظ الوصفة</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
