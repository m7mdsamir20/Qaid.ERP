'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { THEME, C, CAIRO, OUTFIT, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import {
    ShoppingCart, Search, Plus, Minus, X, Printer, Check, ChevronRight,
    UtensilsCrossed, Truck, Package, Wifi, Table2, Loader2, RefreshCw,
    AlertCircle, Clock, ChevronsRight
} from 'lucide-react';

const ORDER_TYPES = [
    { value: 'dine-in',  label: 'صالة',    icon: Table2,   color: '#6366f1' },
    { value: 'takeaway', label: 'تيك أواي', icon: Package,  color: '#f59e0b' },
    { value: 'delivery', label: 'توصيل',    icon: Truck,    color: '#10b981' },
    { value: 'online',   label: 'أونلاين',  icon: Wifi,     color: '#3b82f6' },
];

interface CartItem {
    itemId: string;
    itemName: string;
    unitPrice: number;
    quantity: number;
    discount: number;
    notes: string;
}

export default function POSPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const { fMoney } = useCurrency();

    // Data
    const [categories, setCategories] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Filters
    const [selectedCategory, setSelectedCategory] = useState('');
    const [search, setSearch] = useState('');

    // Order
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderType, setOrderType] = useState('dine-in');
    const [selectedTable, setSelectedTable] = useState('');
    const [orderNotes, setOrderNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [discount, setDiscount] = useState(0);
    const [step, setStep] = useState<'cart' | 'payment'>('cart');

    const searchRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [catRes, itemRes, tableRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/items'),
                fetch('/api/restaurant/tables'),
            ]);
            const [cats, itms, tbls] = await Promise.all([catRes.json(), itemRes.json(), tableRes.json()]);
            setCategories(Array.isArray(cats) ? cats : []);
            setItems(Array.isArray(itms) ? itms : []);
            setTables(Array.isArray(tbls) ? tbls : []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filteredItems = items.filter(item => {
        const matchCat = !selectedCategory || item.categoryId === selectedCategory;
        const matchSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    const addToCart = (item: any) => {
        setCart(prev => {
            const existing = prev.find(c => c.itemId === item.id);
            if (existing) {
                return prev.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, {
                itemId: item.id,
                itemName: item.name,
                unitPrice: item.salePrice ?? item.price ?? 0,
                quantity: 1,
                discount: 0,
                notes: '',
            }];
        });
    };

    const updateQty = (itemId: string, delta: number) => {
        setCart(prev => prev.map(c => c.itemId === itemId
            ? { ...c, quantity: Math.max(0, c.quantity + delta) }
            : c
        ).filter(c => c.quantity > 0));
    };

    const removeFromCart = (itemId: string) => setCart(prev => prev.filter(c => c.itemId !== itemId));
    const clearCart = () => { setCart([]); setStep('cart'); setSelectedTable(''); setOrderNotes(''); setDiscount(0); };

    const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
    const total = Math.max(0, subtotal - discount);
    const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

    const handleSubmit = async () => {
        if (cart.length === 0) { setErrorMsg('السلة فارغة'); return; }
        if (orderType === 'dine-in' && !selectedTable) { setErrorMsg('اختر الطاولة أولاً'); return; }
        setSubmitting(true);
        setErrorMsg('');
        try {
            const res = await fetch('/api/restaurant/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: orderType,
                    tableId: selectedTable || null,
                    notes: orderNotes,
                    paymentMethod,
                    discount,
                    lines: cart.map(c => ({ ...c })),
                }),
            });
            if (!res.ok) { const d = await res.json(); setErrorMsg(d.error || 'فشل'); setSubmitting(false); return; }
            setSuccessMsg('✅ تم حفظ الطلب وإرساله للمطبخ');
            clearCart();
            load();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch { setErrorMsg('حدث خطأ'); }
        finally { setSubmitting(false); }
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', fontFamily: CAIRO, background: C.bg }}>

                {/* ══ الجانب الأيسر: المنيو ══ */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderInlineEnd: `1px solid ${C.border}` }}>

                    {/* Header المنيو */}
                    <div style={{ padding: '16px 20px', background: C.card, borderBottom: `1px solid ${C.border}`, display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={16} style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
                            <input
                                ref={searchRef}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t('ابحث عن صنف...')}
                                style={{ ...IS, paddingInlineStart: '36px', height: '40px', fontSize: '13px' }}
                            />
                        </div>
                        <button onClick={load} style={{ width: 40, height: 40, borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshCw size={15} />
                        </button>
                    </div>

                    {/* التصنيفات */}
                    <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', overflowX: 'auto', background: C.card, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                        <button onClick={() => setSelectedCategory('')}
                            style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${!selectedCategory ? C.primary : C.border}`, background: !selectedCategory ? `${C.primary}15` : 'transparent', color: !selectedCategory ? C.primary : C.textSecondary, fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', fontFamily: CAIRO }}>
                            الكل
                        </button>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                                style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${selectedCategory === cat.id ? C.primary : C.border}`, background: selectedCategory === cat.id ? `${C.primary}15` : 'transparent', color: selectedCategory === cat.id ? C.primary : C.textSecondary, fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', fontFamily: CAIRO }}>
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* الأصناف */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: C.textMuted }}>
                                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: C.textMuted, gap: '12px' }}>
                                <UtensilsCrossed size={40} style={{ opacity: 0.3 }} />
                                <p style={{ margin: 0, fontSize: '14px' }}>{t('لا توجد أصناف')}</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                                {filteredItems.map(item => {
                                    const inCart = cart.find(c => c.itemId === item.id);
                                    return (
                                        <button key={item.id} onClick={() => addToCart(item)}
                                            style={{ background: inCart ? `${C.primary}10` : C.card, border: `1px solid ${inCart ? C.primary + '40' : C.border}`, borderRadius: '16px', padding: '16px 12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', position: 'relative', fontFamily: CAIRO }}
                                            onMouseEnter={e => { if (!inCart) e.currentTarget.style.borderColor = C.primary + '60'; }}
                                            onMouseLeave={e => { if (!inCart) e.currentTarget.style.borderColor = C.border; }}>
                                            {inCart && (
                                                <div style={{ position: 'absolute', top: '8px', insetInlineEnd: '8px', width: '20px', height: '20px', borderRadius: '50%', background: C.primary, color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: OUTFIT }}>
                                                    {inCart.quantity}
                                                </div>
                                            )}
                                            <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                                                {item.imageUrl ? <img src={item.imageUrl} style={{ width: 48, height: 48, borderRadius: '12px', objectFit: 'cover' }} /> : '🍽️'}
                                            </div>
                                            <p style={{ margin: '0 0 6px', fontSize: '12.5px', fontWeight: 700, color: C.textPrimary, lineHeight: 1.3 }}>{item.name}</p>
                                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>{fMoney(item.salePrice ?? item.price ?? 0)}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ══ الجانب الأيمن: الفاتورة ══ */}
                <div style={{ width: '380px', display: 'flex', flexDirection: 'column', background: C.card, flexShrink: 0 }}>

                    {/* نوع الطلب */}
                    <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>
                            {ORDER_TYPES.map(ot => {
                                const Icon = ot.icon;
                                return (
                                    <button key={ot.value} onClick={() => { setOrderType(ot.value); setSelectedTable(''); }}
                                        style={{ padding: '8px 4px', borderRadius: '10px', border: `1px solid ${orderType === ot.value ? ot.color + '60' : C.border}`, background: orderType === ot.value ? ot.color + '15' : 'transparent', color: orderType === ot.value ? ot.color : C.textMuted, fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.2s', fontFamily: CAIRO }}>
                                        <Icon size={16} />
                                        {ot.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* اختيار الطاولة */}
                        {orderType === 'dine-in' && (
                            <div style={{ marginTop: '10px' }}>
                                <select
                                    value={selectedTable}
                                    onChange={e => setSelectedTable(e.target.value)}
                                    style={{ ...IS, height: '40px', fontSize: '13px', cursor: 'pointer' }}>
                                    <option value="">{t('— اختر الطاولة —')}</option>
                                    {tables.filter(t => t.status === 'available' || t.id === selectedTable).map(tbl => (
                                        <option key={tbl.id} value={tbl.id}>{tbl.name} ({tbl.capacity} أشخاص)</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* السلة */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                        {cart.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: C.textMuted, gap: '12px' }}>
                                <ShoppingCart size={40} style={{ opacity: 0.2 }} />
                                <p style={{ margin: 0, fontSize: '13px' }}>{t('السلة فارغة')}</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {cart.map(item => (
                                    <div key={item.itemId} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ margin: '0 0 2px', fontSize: '12.5px', fontWeight: 700, color: C.textPrimary }}>{item.itemName}</p>
                                            <p style={{ margin: 0, fontSize: '12px', color: C.primary, fontFamily: OUTFIT }}>{fMoney(item.unitPrice)} × {item.quantity} = {fMoney(item.unitPrice * item.quantity)}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <button onClick={() => updateQty(item.itemId, -1)} style={{ width: 28, height: 28, borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={13} /></button>
                                            <span style={{ minWidth: '20px', textAlign: 'center', fontSize: '13px', fontWeight: 700, fontFamily: OUTFIT, color: C.textPrimary }}>{item.quantity}</span>
                                            <button onClick={() => updateQty(item.itemId, 1)} style={{ width: 28, height: 28, borderRadius: '8px', border: `1px solid ${C.border}`, background: `${C.primary}10`, color: C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={13} /></button>
                                            <button onClick={() => removeFromCart(item.itemId)} style={{ width: 28, height: 28, borderRadius: '8px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* الإجمالي والدفع */}
                    <div style={{ padding: '16px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* ملاحظات */}
                        <input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder={t('ملاحظات الطلب...')} style={{ ...IS, height: '36px', fontSize: '12px' }} />

                        {/* خصم */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 600, whiteSpace: 'nowrap' }}>{t('خصم')}</label>
                            <input type="number" min="0" value={discount || ''} onChange={e => setDiscount(Number(e.target.value))} placeholder="0" style={{ ...IS, height: '36px', fontSize: '12px', fontFamily: OUTFIT, flex: 1 }} />
                        </div>

                        {/* الإجمالي */}
                        <div style={{ background: `${C.primary}08`, border: `1px solid ${C.primary}20`, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.textSecondary }}>
                                <span>{t('المجموع')}</span>
                                <span style={{ fontFamily: OUTFIT }}>{fMoney(subtotal)}</span>
                            </div>
                            {discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.danger }}>
                                    <span>{t('خصم')}</span>
                                    <span style={{ fontFamily: OUTFIT }}>- {fMoney(discount)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: C.textPrimary, borderTop: `1px solid ${C.border}`, paddingTop: '6px', marginTop: '2px' }}>
                                <span>{t('الإجمالي')}</span>
                                <span style={{ fontFamily: OUTFIT, color: C.primary }}>{fMoney(total)}</span>
                            </div>
                        </div>

                        {/* طريقة الدفع */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                            {(['cash', 'card', 'mixed'] as const).map(pm => (
                                <button key={pm} onClick={() => setPaymentMethod(pm)}
                                    style={{ height: '36px', borderRadius: '10px', border: `1px solid ${paymentMethod === pm ? C.primary + '50' : C.border}`, background: paymentMethod === pm ? `${C.primary}12` : 'transparent', color: paymentMethod === pm ? C.primary : C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: CAIRO }}>
                                    {pm === 'cash' ? '💵 نقدي' : pm === 'card' ? '💳 شبكة' : '🔀 مختلط'}
                                </button>
                            ))}
                        </div>

                        {/* رسائل */}
                        {errorMsg && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '10px 12px', color: C.danger, fontSize: '12.5px', fontWeight: 600 }}>
                                <AlertCircle size={14} /> {errorMsg}
                            </div>
                        )}
                        {successMsg && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${C.success}10`, border: `1px solid ${C.success}30`, borderRadius: '10px', padding: '10px 12px', color: C.success, fontSize: '12.5px', fontWeight: 600 }}>
                                <Check size={14} /> {successMsg}
                            </div>
                        )}

                        {/* أزرار */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {cart.length > 0 && (
                                <button onClick={clearCart} style={{ height: '48px', padding: '0 16px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                                    {t('مسح')}
                                </button>
                            )}
                            <button onClick={handleSubmit} disabled={submitting || cart.length === 0}
                                style={{ ...BTN_PRIMARY(submitting || cart.length === 0, false), flex: 1, height: '48px', borderRadius: '12px', fontSize: '14px', gap: '8px' }}>
                                {submitting
                                    ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('جاري الحفظ...')}</>
                                    : <><Printer size={16} /> {t('حفظ وطباعة')} {cartCount > 0 && `(${cartCount})`}</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
