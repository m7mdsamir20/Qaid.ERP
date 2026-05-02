'use client';
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Check, ChevronRight, X, Loader2 } from 'lucide-react';

interface Variant { id: string; name: string; sellPrice: number; }
interface MenuItem { id: string; name: string; description: string | null; sellPrice: number; imageUrl: string | null; variants: Variant[]; category: { name: string } | null; }
interface Category { id: string; name: string; items: MenuItem[]; }

interface CartItem {
    id: string; // unique ID for the cart line (item.id + variant.id)
    itemId: string;
    variantId?: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string | null;
    notes?: string;
}

export default function MenuClient({ company, categories, currency, tableId }: { company: any, categories: Category[], currency: string, tableId?: string | null }) {
    const [activeTab, setActiveTab] = useState<string>(categories[0]?.id || '');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

    // Item Modal State
    const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
    const [itemQty, setItemQty] = useState(1);
    const [itemNotes, setItemNotes] = useState('');

    useEffect(() => {
        const handleScroll = () => {
            const sections = document.querySelectorAll('.cat-section');
            let current = activeTab;
            sections.forEach(sec => {
                const rect = sec.getBoundingClientRect();
                if (rect.top <= 150) current = sec.id.replace('cat-', '');
            });
            if (current !== activeTab) setActiveTab(current);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [activeTab]);

    const addToCart = (item: MenuItem, variant?: Variant) => {
        setCart(prev => {
            const id = variant ? `${item.id}-${variant.id}` : item.id;
            const existing = prev.find(i => i.id === id);
            if (existing) {
                return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, {
                id,
                itemId: item.id,
                variantId: variant?.id,
                name: variant ? `${item.name} - ${variant.name}` : item.name,
                price: variant ? variant.sellPrice : item.sellPrice,
                quantity: 1,
                imageUrl: item.imageUrl
            }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
    };

    const handleCardClick = (item: MenuItem) => {
        setActiveItem(item);
        setSelectedVariant(item.variants && item.variants.length > 0 ? item.variants[0] : null);
        setItemQty(1);
        setItemNotes('');
    };

    const handleAddToCartFromModal = () => {
        if (!activeItem) return;
        setCart(prev => {
            const baseId = selectedVariant ? `${activeItem.id}-${selectedVariant.id}` : activeItem.id;
            const id = itemNotes.trim() ? `${baseId}-${itemNotes.trim()}` : baseId;
            const existing = prev.find(i => i.id === id);
            if (existing) {
                return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + itemQty } : i);
            }
            return [...prev, {
                id,
                itemId: activeItem.id,
                variantId: selectedVariant?.id,
                name: selectedVariant ? `${activeItem.name} - ${selectedVariant.name}` : activeItem.name,
                price: selectedVariant ? selectedVariant.sellPrice : activeItem.sellPrice,
                quantity: itemQty,
                imageUrl: activeItem.imageUrl,
                notes: itemNotes.trim()
            }];
        });
        setActiveItem(null);
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const submitOrder = async () => {
        if (cart.length === 0) return;
        setIsSubmitting(true);
        try {
            // Send order to API
            const res = await fetch(`/api/menu-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyId: company.id,
                    tableId,
                    items: cart.map(i => ({ itemId: i.variantId || i.itemId, itemName: i.name, quantity: i.quantity, price: i.price, notes: i.notes }))
                })
            });
            if (res.ok) {
                setOrderSuccess(true);
                setCart([]);
                setTimeout(() => { setOrderSuccess(false); setIsCartOpen(false); }, 3000);
            } else {
                alert('حدث خطأ أثناء إرسال الطلب');
            }
        } catch (error) {
            console.error(error);
            alert('تعذر الاتصال بالسيرفر');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="menu-container">
            {/* Header */}
            <div className="menu-header">
                <div className="header-content">
                    <h1>{company.name}</h1>
                    <p>المنيو الرقمي — تصفح واطلب مباشرة</p>
                </div>
            </div>

            {/* Categories Sticky Tabs */}
            {categories.length > 1 && (
                <div className="cat-tabs-wrapper">
                    <div className="cat-tabs">
                        {categories.map(cat => (
                            <a key={cat.id} href={`#cat-${cat.id}`} className={`cat-tab ${activeTab === cat.id ? 'active' : ''}`} onClick={() => setActiveTab(cat.id)}>
                                {cat.name}
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Menu Items */}
            <div className="menu-grid">
                {categories.map(category => (
                    <div key={category.id} id={`cat-${category.id}`} className="cat-section">
                        <h2 className="cat-title">{category.name}</h2>
                        <div className="items-list">
                            {category.items.map(item => (
                                <div key={item.id} className="item-card" onClick={() => handleCardClick(item)}>
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="item-img" loading="lazy" />
                                    ) : (
                                        <div className="item-placeholder">🍽️</div>
                                    )}
                                    <div className="item-info">
                                        <div className="item-name">{item.name}</div>
                                        {item.description && <div className="item-desc">{item.description}</div>}
                                        
                                        <div className="item-footer">
                                            <div className="item-price">
                                                {item.variants && item.variants.length > 0 ? (
                                                    <><span style={{ color: '#64748b', fontWeight: 600, fontSize: '13px' }}>من </span>{Math.min(...item.variants.map(v => v.sellPrice))} - {Math.max(...item.variants.map(v => v.sellPrice))}</>
                                                ) : (
                                                    <>{item.sellPrice.toLocaleString('en-US', { minimumFractionDigits: 0 })}</>
                                                )}
                                                <span className="item-currency" style={{ fontFamily: 'Cairo' }}>{currency}</span>
                                            </div>
                                            <button className="add-btn" onClick={(e) => { e.stopPropagation(); handleCardClick(item); }}>
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Floating Cart Button */}
            {totalItems > 0 && (
                <div className="floating-cart" onClick={() => setIsCartOpen(true)}>
                    <div className="cart-badge">{totalItems}</div>
                    <div className="cart-info">
                        <ShoppingCart size={20} />
                        <span style={{ fontWeight: 700, marginInlineStart: '8px' }}>عرض السلة</span>
                    </div>
                    <div className="cart-total">
                        {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontFamily: 'Cairo', fontSize: '14px' }}>{currency}</span>
                    </div>
                </div>
            )}

            {/* Cart Modal */}
            {isCartOpen && (
                <div className="cart-overlay" onClick={() => setIsCartOpen(false)}>
                    <div className="cart-modal" onClick={e => e.stopPropagation()}>
                        <div className="cart-header">
                            <h3>سلة الطلبات</h3>
                            <button className="close-btn" onClick={() => setIsCartOpen(false)}><X size={24} /></button>
                        </div>
                        
                        {orderSuccess ? (
                            <div className="order-success">
                                <div className="success-icon"><Check size={40} /></div>
                                <h2>تم إرسال طلبك بنجاح!</h2>
                                <p>جاري تحضير طلبك في المطبخ الآن.</p>
                            </div>
                        ) : (
                            <>
                                <div className="cart-items custom-scroll">
                                    {cart.map(item => (
                                        <div key={item.id} className="cart-item">
                                            <div className="cart-item-info">
                                                <div className="cart-item-name">{item.name}</div>
                                                {item.notes && <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>📝 {item.notes}</div>}
                                                <div className="cart-item-price">{item.price} <span style={{ fontFamily: 'Cairo' }}>{currency}</span></div>
                                            </div>
                                            <div className="cart-item-actions">
                                                <button onClick={() => updateQuantity(item.id, -1)}><Minus size={16} /></button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)}><Plus size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {cart.length === 0 && <p className="empty-cart">السلة فارغة</p>}
                                </div>
                                
                                {cart.length > 0 && (
                                    <div className="cart-footer">
                                        <div className="cart-summary">
                                            <span>الإجمالي:</span>
                                            <span className="summary-total">{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontFamily: 'Cairo' }}>{currency}</span></span>
                                        </div>
                                        <button className="checkout-btn" onClick={submitOrder} disabled={isSubmitting}>
                                            {isSubmitting ? <Loader2 size={20} className="spin" /> : 'تأكيد وإرسال الطلب للمطبخ'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Item Modal (Variants) */}
            {activeItem && (
                <div className="cart-overlay" onClick={() => setActiveItem(null)}>
                    <div className="cart-modal" onClick={e => e.stopPropagation()} style={{ overflow: 'hidden' }}>
                        <div className="cart-header" style={{ padding: '16px 24px', borderBottom: 'none', position: 'absolute', top: 0, right: 0, left: 0, zIndex: 10 }}>
                            <div style={{ flex: 1 }}></div>
                            <button className="close-btn" style={{ background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onClick={() => setActiveItem(null)}><X size={20} /></button>
                        </div>
                        
                        <div style={{ padding: '24px 24px 0', textAlign: 'center', marginTop: '30px', flexShrink: 0 }}>
                            {activeItem.imageUrl ? (
                                <img src={activeItem.imageUrl} alt={activeItem.name} style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '16px', marginBottom: '16px' }} />
                            ) : (
                                <div style={{ width: '100%', height: '220px', background: '#f1f5f9', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', marginBottom: '16px' }}>🍽️</div>
                            )}
                        </div>
                        
                        <div className="custom-scroll" style={{ overflowY: 'auto', flex: 1, padding: '0 24px 24px' }}>
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>{activeItem.name}</h2>
                                {activeItem.description && <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, marginBottom: 0 }}>{activeItem.description}</p>}
                            </div>

                            {activeItem.variants && activeItem.variants.length > 0 && (
                                <div style={{ marginBottom: '0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>الحجم</h3>
                                        <span style={{ fontSize: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>مطلوب</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {activeItem.variants.map(v => (
                                            <div 
                                                key={v.id} 
                                                onClick={() => setSelectedVariant(v)}
                                                style={{ 
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                                    padding: '16px', borderRadius: '16px', cursor: 'pointer',
                                                    border: `2px solid ${selectedVariant?.id === v.id ? '#256af4' : 'rgba(0,0,0,0.05)'}`,
                                                    background: selectedVariant?.id === v.id ? 'rgba(37,106,244,0.02)' : '#fff',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${selectedVariant?.id === v.id ? '#256af4' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {selectedVariant?.id === v.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#256af4' }} />}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{v.name}</div>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', fontFamily: "'ERP-Numbers', 'Cairo', sans-serif" }}>
                                                    {v.sellPrice} <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'Cairo', fontWeight: 600 }}>{currency}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: activeItem.variants && activeItem.variants.length > 0 ? '24px' : '0' }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>ملاحظات خاصة (اختياري)</div>
                                <textarea 
                                    value={itemNotes}
                                    onChange={e => setItemNotes(e.target.value)}
                                    placeholder="بدون ملح، صوص جانبي، مقرمش، إلخ..."
                                    style={{ 
                                        width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', 
                                        background: '#f8fafc', fontSize: '14px', fontFamily: 'Cairo', resize: 'none', 
                                        minHeight: '80px', outline: 'none', transition: '0.2s' 
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#256af4'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.08)'}
                                />
                            </div>
                        </div>

                        <div className="cart-footer" style={{ padding: '24px', background: '#fff', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div>
                                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>الإجمالي</div>
                                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', fontFamily: "'ERP-Numbers', 'Cairo', sans-serif" }}>
                                        {((selectedVariant ? selectedVariant.sellPrice : activeItem.sellPrice) * itemQty).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                        <span style={{ fontSize: '14px', color: '#64748b', fontFamily: 'Cairo', marginInlineStart: '4px' }}>{currency}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '6px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.04)' }}>
                                    <button onClick={() => setItemQty(Math.max(1, itemQty - 1))} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: '#fff', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}><Minus size={18} /></button>
                                    <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: "'ERP-Numbers', 'Cairo', sans-serif", width: '24px', textAlign: 'center' }}>{itemQty}</span>
                                    <button onClick={() => setItemQty(itemQty + 1)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: '#fff', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}><Plus size={18} /></button>
                                </div>
                            </div>
                            <button 
                                className="checkout-btn" 
                                onClick={handleAddToCartFromModal}
                                style={{ width: '100%', padding: '18px', borderRadius: '16px', background: '#256af4', color: '#fff', fontSize: '17px', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                            >
                                <ShoppingCart size={20} />
                                أضف للسلة
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
