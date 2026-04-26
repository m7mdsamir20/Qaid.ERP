'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, IS, LS, BTN_PRIMARY, PAGE_BASE } from '@/constants/theme';
import { Plus, RefreshCw, Loader2, X, Check, Trash2, Edit3, AlertCircle, PlusCircle, BookOpen, DollarSign } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

interface RecipeIngredient { itemId: string; itemName: string; quantity: number; unit: string; }

export default function RecipesPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const { fMoney } = useCurrency();

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
            const [rr, ir] = await Promise.all([fetch('/api/restaurant/recipes'), fetch('/api/items?all=true')]);
            const [r, i]   = await Promise.all([rr.json(), ir.json()]);
            setRecipes(Array.isArray(r) ? r : []);
            setItems(Array.isArray(i) ? i : (i.items || []));
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Items that don't have a recipe yet (for new recipe)
    const productItems = items.filter(it => it.type === 'product' && (!it.variants || it.variants.length === 0));
    const availableItems = productItems.filter(it => !recipes.some(r => r.itemId === it.id && (!editItem || r.id !== editItem.id)));
    const rawItems = items.filter(it => it.type === 'raw');

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

    // Calculate estimated recipe cost from ingredient buyPrices
    const calcRecipeCost = (recipe: any) => {
        if (!recipe.items || recipe.items.length === 0) return 0;
        return recipe.items.reduce((sum: number, ri: any) => {
            const ingredientItem = items.find(it => it.id === ri.itemId);
            const ingredientPrice = ingredientItem?.buyPrice ?? ingredientItem?.costPrice ?? 0;
            return sum + (ingredientPrice * ri.quantity);
        }, 0);
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={t('وصفات الطبخ')}
                    subtitle={t('ربط كل وجبة بمكوناتها الخام لتتبع المخزون')}
                    icon={BookOpen}
                    actions={[
                        <button key="refresh" onClick={load} style={{ height: '42px', width: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={15} /></button>
                    ]}
                    primaryButton={{ label: t('وصفة جديدة'), onClick: () => openModal(), icon: Plus }}
                />

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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {/* التكلفة التقديرية */}
                                        {(() => {
                                            const cost = calcRecipeCost(recipe);
                                            const sell = recipe.item?.sellPrice ?? 0;
                                            const profit = sell - cost;
                                            const profitPct = sell > 0 ? Math.round((profit / sell) * 100) : 0;
                                            return cost > 0 ? (
                                                <div style={{ background: `${profit >= 0 ? '#10b981' : '#ef4444'}08`, border: `1px solid ${profit >= 0 ? '#10b981' : '#ef4444'}30`, borderRadius: '10px', padding: '6px 12px', textAlign: 'center' }}>
                                                    <p style={{ margin: 0, fontSize: '10px', color: C.textMuted }}>التكلفة</p>
                                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, fontFamily: OUTFIT, color: C.textPrimary }}>{fMoney(cost)}</p>
                                                    {sell > 0 && <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: profit >= 0 ? '#10b981' : '#ef4444' }}>هامش {profitPct}%</p>}
                                                </div>
                                            ) : null;
                                        })()}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => openModal(recipe)} style={{ width: 34, height: 34, borderRadius: '10px', border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit3 size={14} /></button>
                                            <button onClick={() => handleDelete(recipe.id)} style={{ width: 34, height: 34, borderRadius: '10px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {recipe.items?.map((ri: any, i: number) => (
                                        <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: C.textSecondary }}>
                                            {ri.item?.name || getItemName(ri.itemId)} — <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{ri.quantity}</span> {ri.unit}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AppModal show={showModal} onClose={() => setShowModal(false)} title={editItem ? 'تعديل الوصفة' : 'وصفة جديدة'} maxWidth="560px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={LS}>الوجبة <span style={{ color: C.danger }}>*</span></label>
                        <CustomSelect
                            value={form.itemId}
                            onChange={v => setForm(f => ({ ...f, itemId: v }))}
                            options={(editItem ? productItems : availableItems).map(it => ({ value: it.id, label: it.name }))}
                            placeholder="— اختر الوجبة —"
                        />
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
                                    <div style={{ flex: 1 }}>
                                        <CustomSelect
                                            value={ing.itemId}
                                            onChange={v => updateIng(i, 'itemId', v)}
                                            options={rawItems.map(it => ({ value: it.id, label: it.name }))}
                                            placeholder="— المادة الخام —"
                                        />
                                    </div>
                                    <input type="number" min="0.01" step="0.01" value={ing.quantity || ''} onChange={e => updateIng(i, 'quantity', Number(e.target.value))} placeholder="الكمية" style={{ ...IS, width: '75px', height: '38px', fontSize: '12px', fontFamily: OUTFIT }} />
                                    <input value={ing.unit} onChange={e => updateIng(i, 'unit', e.target.value)} placeholder="جرام" style={{ ...IS, width: '70px', height: '38px', fontSize: '12px' }} />
                                    <button onClick={() => removeIng(i)} style={{ width: 34, height: 34, borderRadius: '8px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={13} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '10px 14px', color: C.danger, fontSize: '12.5px', display: 'flex', gap: '8px', alignItems: 'center' }}><AlertCircle size={14} />{error}</div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '28px' }}>
                    <button onClick={handleSave} disabled={saving} style={{ height: '44px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: saving ? 'not-allowed' : 'pointer' }}>
                        {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'حفظ الوصفة'}
                    </button>
                    <button onClick={() => setShowModal(false)} style={{ height: '44px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>إلغاء</button>
                </div>
            </AppModal>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
