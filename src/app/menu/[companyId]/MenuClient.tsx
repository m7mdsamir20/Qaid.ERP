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
}

export default function MenuClient({ company, categories, currency, tableId }: { company: any, categories: Category[], currency: string, tableId?: string | null }) {
    const [activeTab, setActiveTab] = useState<string>(categories[0]?.id || '');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

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
                    items: cart.map(i => ({ itemId: i.variantId || i.itemId, itemName: i.name, quantity: i.quantity, price: i.price }))
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
                                <div key={item.id} className="item-card">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="item-img" loading="lazy" />
                                    ) : (
                                        <div className="item-placeholder">🍽️</div>
                                    )}
                                    <div className="item-info">
                                        <div className="item-name">{item.name}</div>
                                        {item.description && <div className="item-desc">{item.description}</div>}
                                        
                                        {item.variants && item.variants.length > 0 ? (
                                            <div className="variants-container">
                                                <div className="item-price" style={{ marginBottom: '8px', opacity: 0.7, fontSize: '14px' }}>يبدأ من {item.sellPrice} {currency}</div>
                                                <div className="variants-list">
                                                    {item.variants.map(v => (
                                                        <button key={v.id} className="variant-btn" onClick={() => addToCart(item, v)}>
                                                            <span className="v-name">{v.name}</span>
                                                            <span className="v-price">{v.sellPrice} <small>{currency}</small></span>
                                                            <Plus size={14} className="v-icon" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="item-footer">
                                                <div className="item-price">
                                                    {item.sellPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    <span className="item-currency">{currency}</span>
                                                </div>
                                                <button className="add-btn" onClick={() => addToCart(item)}>
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                        )}
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
                        {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
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
                                <div className="cart-items">
                                    {cart.map(item => (
                                        <div key={item.id} className="cart-item">
                                            <div className="cart-item-info">
                                                <div className="cart-item-name">{item.name}</div>
                                                <div className="cart-item-price">{item.price} {currency}</div>
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
                                            <span className="summary-total">{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}</span>
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
        </div>
    );
}
