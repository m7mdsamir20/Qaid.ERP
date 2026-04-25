'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, OUTFIT } from '@/constants/theme';
import { Clock, CheckCircle2, Loader2, RefreshCw, AlertCircle, ChefHat, LogOut } from 'lucide-react';

export default function KDSPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';

    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            // Fetch pending and preparing orders
            const res = await fetch('/api/restaurant/orders?limit=100');
            const data = await res.json();
            if (Array.isArray(data)) {
                setOrders(data.filter(o => o.status === 'pending' || o.status === 'preparing'));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        // Auto-refresh every 15 seconds
        const interval = setInterval(load, 15000);
        return () => clearInterval(interval);
    }, [load]);

    const markAsReady = async (orderId: string) => {
        setUpdatingId(orderId);
        try {
            const res = await fetch('/api/restaurant/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: orderId, status: 'ready' }),
            });
            if (res.ok) {
                setOrders(prev => prev.filter(o => o.id !== orderId));
            }
        } finally {
            setUpdatingId(null);
        }
    };

    const markAsPreparing = async (orderId: string) => {
        setUpdatingId(orderId);
        try {
            const res = await fetch('/api/restaurant/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: orderId, status: 'preparing' }),
            });
            if (res.ok) {
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'preparing' } : o));
            }
        } finally {
            setUpdatingId(null);
        }
    };

    const getElapsedTime = (dateString: string) => {
        const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
        return diff;
    };

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, fontFamily: CAIRO, color: C.textPrimary }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: C.card, borderBottom: `1px solid ${C.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '14px', background: `${C.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                        <ChefHat size={24} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: C.textPrimary }}>شاشة المطبخ (KDS)</h1>
                        <p style={{ margin: 0, fontSize: '13px', color: C.textMuted }}>إدارة الطلبات الحية</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={load} style={{ height: '44px', padding: '0 16px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, fontWeight: 600 }}>
                        <RefreshCw size={16} /> تحديث الطلبات
                    </button>
                    <a href="/" style={{ height: '44px', padding: '0 16px', borderRadius: '10px', border: '1px solid #ef444430', background: '#ef444410', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textDecoration: 'none', fontWeight: 600 }}>
                        <LogOut size={16} /> خروج
                    </a>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {loading && orders.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.textMuted }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                ) : orders.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.textMuted, gap: '16px' }}>
                        <CheckCircle2 size={64} style={{ opacity: 0.2 }} />
                        <h2 style={{ margin: 0, fontSize: '24px' }}>لا توجد طلبات حالياً</h2>
                        <p style={{ margin: 0, fontSize: '16px' }}>المطبخ هادئ... استرخِ قليلاً ☕</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                        {orders.map(order => {
                            const elapsed = getElapsedTime(order.createdAt);
                            const isLate = elapsed > 20;
                            const isPreparing = order.status === 'preparing';

                            return (
                                <div key={order.id} style={{ background: C.card, border: `2px solid ${isLate ? '#ef444450' : isPreparing ? C.primary : C.border}`, borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.1)' }}>
                                    
                                    {/* Order Header */}
                                    <div style={{ padding: '16px', background: isLate ? '#ef444415' : isPreparing ? `${C.primary}15` : C.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, fontFamily: OUTFIT, display: 'flex', alignItems: 'center', gap: '8px', color: C.textPrimary }}>
                                                #{order.orderNumber}
                                                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#00000010', fontFamily: CAIRO, color: C.textSecondary }}>
                                                    {order.type === 'dine-in' ? 'صالة' : order.type === 'takeaway' ? 'تيك أواي' : 'توصيل'}
                                                </span>
                                            </h3>
                                            {order.table && <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 600, color: C.textSecondary }}>الطاولة: <span style={{ color: C.primary }}>{order.table.name}</span></p>}
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isLate ? '#ef4444' : C.textSecondary, fontSize: '14px', fontWeight: 700 }}>
                                                <Clock size={16} /> {elapsed} دقيقة
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Lines */}
                                    <div style={{ padding: '16px', flex: 1 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {order.lines?.map((line: any) => (
                                                <div key={line.id} style={{ display: 'flex', gap: '12px', borderBottom: `1px solid ${C.border}`, paddingBottom: '12px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${C.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: OUTFIT, color: C.primary, fontSize: '16px', flexShrink: 0 }}>
                                                        {line.quantity}
                                                    </div>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: C.textPrimary }}>{line.itemName}</p>
                                                        {line.modifiers && (
                                                            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                {Object.values(JSON.parse(line.modifiers)).flat().map((m: any, i: number) => (
                                                                    <span key={i} style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>+ {m.name}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {line.notes && <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textMuted, fontWeight: 600 }}>📝 {line.notes}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {order.notes && (
                                            <div style={{ marginTop: '16px', padding: '12px', background: C.bg, borderRadius: '8px', border: `1px dashed ${C.border}`, fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>
                                                <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', color: '#f59e0b' }} />
                                                ملاحظة الطلب: {order.notes}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ padding: '16px', display: 'flex', gap: '12px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
                                        {isPreparing ? (
                                            <button onClick={() => markAsReady(order.id)} disabled={updatingId === order.id} style={{ flex: 1, height: '44px', borderRadius: '12px', background: '#10b981', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}>
                                                {updatingId === order.id ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle2 size={18} /> جاهز للتسليم</>}
                                            </button>
                                        ) : (
                                            <button onClick={() => markAsPreparing(order.id)} disabled={updatingId === order.id} style={{ flex: 1, height: '44px', borderRadius: '12px', background: C.primary, border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: `0 4px 10px ${C.primary}40` }}>
                                                {updatingId === order.id ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'بدء التحضير'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
