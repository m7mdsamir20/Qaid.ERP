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
        <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', fontFamily: CAIRO, color: '#f8fafc' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ChefHat size={32} color={C.primary} />
                    <div>
                        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff' }}>شاشة المطبخ (KDS)</h1>
                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>إدارة الطلبات الحية</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={load} style={{ height: '44px', padding: '0 16px', borderRadius: '10px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                        <RefreshCw size={16} /> تحديث الطلبات
                    </button>
                    <a href="/" style={{ height: '44px', padding: '0 16px', borderRadius: '10px', border: '1px solid #334155', background: '#ef444420', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textDecoration: 'none' }}>
                        <LogOut size={16} /> خروج
                    </a>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {loading && orders.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                ) : orders.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', gap: '16px' }}>
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
                                <div key={order.id} style={{ background: isLate ? '#ef444415' : '#1e293b', border: `2px solid ${isLate ? '#ef444450' : isPreparing ? C.primary : '#334155'}`, borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    
                                    {/* Order Header */}
                                    <div style={{ padding: '16px', background: isLate ? '#ef444430' : isPreparing ? `${C.primary}30` : '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: OUTFIT, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                #{order.orderNumber}
                                                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#00000040', fontFamily: CAIRO }}>
                                                    {order.type === 'dine-in' ? 'صالة' : order.type === 'takeaway' ? 'تيك أواي' : 'توصيل'}
                                                </span>
                                            </h3>
                                            {order.table && <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 600 }}>الطاولة: {order.table.name}</p>}
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isLate ? '#fca5a5' : '#94a3b8', fontSize: '14px', fontWeight: 700 }}>
                                                <Clock size={16} /> {elapsed} دقيقة
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Lines */}
                                    <div style={{ padding: '16px', flex: 1 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {order.lines?.map((line: any) => (
                                                <div key={line.id} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: OUTFIT, color: '#fff', fontSize: '16px', flexShrink: 0 }}>
                                                        {line.quantity}
                                                    </div>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>{line.itemName}</p>
                                                        {line.modifiers && (
                                                            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                {Object.values(JSON.parse(line.modifiers)).flat().map((m: any, i: number) => (
                                                                    <span key={i} style={{ fontSize: '13px', color: '#fbbf24' }}>+ {m.name}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {line.notes && <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>📝 {line.notes}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {order.notes && (
                                            <div style={{ marginTop: '16px', padding: '12px', background: '#0f172a', borderRadius: '8px', border: '1px dashed #475569', fontSize: '13px', color: '#cbd5e1' }}>
                                                <AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                                ملاحظة الطلب: {order.notes}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ padding: '16px', display: 'flex', gap: '12px' }}>
                                        {isPreparing ? (
                                            <button onClick={() => markAsReady(order.id)} disabled={updatingId === order.id} style={{ flex: 1, height: '48px', borderRadius: '12px', background: '#10b981', border: 'none', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                {updatingId === order.id ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle2 size={18} /> جاهز للتسليم</>}
                                            </button>
                                        ) : (
                                            <button onClick={() => markAsPreparing(order.id)} disabled={updatingId === order.id} style={{ flex: 1, height: '48px', borderRadius: '12px', background: C.primary, border: 'none', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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
