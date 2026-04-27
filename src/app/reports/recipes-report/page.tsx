'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, PAGE_BASE } from '@/constants/theme';
import { RefreshCw, Loader2, BookOpen } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

interface RecipeIngredient { itemId: string; itemName: string; quantity: number; unit: string; }

export default function RecipesPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const { fMoney } = useCurrency();

    const [recipes, setRecipes]     = useState<any[]>([]);
    const [items, setItems]         = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);

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

    useEffect(() => { load(); }, [load]);

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

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
