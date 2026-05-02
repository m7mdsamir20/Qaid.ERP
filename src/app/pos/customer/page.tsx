'use client';
import React, { useEffect, useState } from 'react';
import { C, CAIRO } from '@/constants/theme';
import { ShoppingCart, CheckCircle2 } from 'lucide-react';

export default function CustomerDisplayPage() {
    const [state, setState] = useState<any>({
        cart: [],
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        hasTax: false,
    });
    
    const [successState, setSuccessState] = useState<{ show: boolean, orderNumber?: string }>({ show: false });

    useEffect(() => {
        const bc = new BroadcastChannel('qaid-customer-display');
        
        bc.onmessage = (event) => {
            if (event.data.type === 'CART_UPDATE') {
                setState(event.data.payload);
                setSuccessState({ show: false });
            } else if (event.data.type === 'ORDER_SUCCESS') {
                setSuccessState({ show: true, orderNumber: event.data.payload.orderNumber });
                setTimeout(() => setSuccessState({ show: false }), 6000);
            }
        };

        return () => bc.close();
    }, []);

    // Helper formatter (standalone page - no session context)
    const fMoney = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(val);
    };

    if (successState.show) {
        return (
            <div dir="rtl" style={{ height: '100vh', width: '100vw', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: CAIRO }}>
                <CheckCircle2 size={120} color={C.success} style={{ marginBottom: '24px' }} />
                <h1 style={{ color: C.textPrimary, fontSize: '48px', marginBottom: '16px' }}>شكراً لزيارتكم!</h1>
                <p style={{ color: C.textSecondary, fontSize: '24px' }}>تم تأكيد طلبكم بنجاح.</p>
                {successState.orderNumber && (
                    <div style={{ marginTop: '30px', background: C.card, padding: '20px 40px', borderRadius: '16px', border: `2px dashed ${C.border}` }}>
                        <span style={{ color: C.textMuted, fontSize: '20px' }}>رقم الطلب: </span>
                        <span style={{ color: C.primary, fontSize: '32px', fontWeight: 'bold' }}>#{successState.orderNumber}</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div dir="rtl" style={{ display: 'flex', height: '100vh', width: '100vw', background: C.bg, fontFamily: CAIRO }}>
            
            {/* Left Side: Ads / Branding */}
            <div style={{ flex: 1, background: `linear-gradient(135deg, ${C.card} 0%, ${C.bg} 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderInlineEnd: `1px solid ${C.border}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '300px', height: '300px', background: C.primary, filter: 'blur(150px)', opacity: 0.15, borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '300px', height: '300px', background: C.success, filter: 'blur(150px)', opacity: 0.1, borderRadius: '50%' }}></div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px', zIndex: 1 }}>
                    <div style={{ width: '80px', height: '80px', background: C.primary, borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '36px', color: '#fff', fontWeight: 'bold' }}>Q</span>
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '42px', color: C.textPrimary, fontWeight: 900, letterSpacing: '2px' }}>QAID ERP</h1>
                        <p style={{ margin: 0, color: C.primary, fontSize: '18px', fontWeight: 600 }}>نظام المطاعم المتكامل</p>
                    </div>
                </div>

                <div style={{ zIndex: 1, textAlign: 'center', padding: '0 40px' }}>
                    <h2 style={{ fontSize: '32px', color: C.textPrimary, marginBottom: '16px' }}>أهلاً بكم في مطعمنا</h2>
                    <p style={{ fontSize: '20px', color: C.textSecondary, lineHeight: '1.6' }}>يرجى مراجعة طلبكم على الشاشة.<br/>نتمنى لكم تجربة مميزة!</p>
                </div>
            </div>

            {/* Right Side: Cart Details */}
            <div style={{ width: '450px', background: C.card, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.2)' }}>
                {/* Header */}
                <div style={{ padding: '30px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.2)' }}>
                    <ShoppingCart size={32} color={C.primary} />
                    <h2 style={{ margin: 0, fontSize: '28px', color: C.textPrimary }}>تفاصيل الطلب</h2>
                </div>

                {/* Items List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {state.cart.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, fontSize: '20px' }}>
                            بانتظار طلبكم...
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {state.cart.map((item: any, i: number) => {
                                let modsTotal = 0;
                                if (item.modifiers) {
                                    Object.values(item.modifiers).forEach((arr: any) => arr.forEach((o: any) => modsTotal += (o.price || 0)));
                                }
                                const itemTotal = (item.unitPrice + modsTotal) * item.quantity;

                                return (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: C.bg, borderRadius: '12px', border: `1px solid ${C.border}` }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: C.textPrimary, marginBottom: '8px' }}>
                                                {item.quantity} × {item.itemName}
                                            </div>
                                            {item.modifiers && Object.entries(item.modifiers).map(([modName, opts]: any) => (
                                                <div key={modName} style={{ fontSize: '14px', color: C.textSecondary, paddingRight: '12px', borderRight: `2px solid ${C.primary}`, marginBottom: '4px' }}>
                                                    {opts.map((o: any) => o.name).join('، ')}
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: C.textPrimary }}>
                                            {fMoney(itemTotal)}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Totals Area */}
                <div style={{ padding: '30px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: C.textSecondary, fontSize: '20px' }}>
                        <span>المجموع الفرعي:</span>
                        <span>{fMoney(state.subtotal)}</span>
                    </div>
                    {state.hasTax && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: C.textSecondary, fontSize: '20px' }}>
                            <span>الضريبة ({state.taxRate}%):</span>
                            <span>{fMoney(state.taxAmount)}</span>
                        </div>
                    )}
                    {(state.discount > 0 || state.couponDiscount > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: C.danger, fontSize: '20px' }}>
                            <span>الخصم:</span>
                            <span>-{fMoney(state.discount + state.couponDiscount)}</span>
                        </div>
                    )}
                    
                    <div style={{ height: '1px', background: C.border, margin: '20px 0' }}></div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '28px', fontWeight: 'bold', color: C.textPrimary }}>الإجمالي:</span>
                        <span style={{ fontSize: '40px', fontWeight: '900', color: C.primary }}>{fMoney(state.total)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
