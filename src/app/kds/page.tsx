'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, OUTFIT } from '@/constants/theme';
import { Clock, CheckCircle2, Loader2, RefreshCw, AlertCircle, ChefHat, LogOut, Globe, XCircle, Phone, MapPin, User } from 'lucide-react';

import PageHeader from '@/components/PageHeader';

export default function KDSPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';

    const [orders, setOrders] = useState<any[]>([]);
    const [completedOrders, setCompletedOrders] = useState<any[]>([]);
    const [showCompletedPanel, setShowCompletedPanel] = useState(false);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/restaurant/orders?limit=100');
            const data = await res.json();
            if (Array.isArray(data)) {
                setOrders(data.filter(o => o.status === 'pending' || o.status === 'preparing'));
                setCompletedOrders(data.filter(o => o.status === 'ready' || o.status === 'delivered').slice(0, 50));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        load();
        const fetchInterval = setInterval(load, 15000);
        const tickInterval = setInterval(() => setNow(Date.now()), 1000);
        return () => {
            clearInterval(fetchInterval);
            clearInterval(tickInterval);
        };
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
                setCompletedOrders(prev => {
                    const completed = orders.find(o => o.id === orderId);
                    return completed ? [{ ...completed, status: 'ready' }, ...prev].slice(0, 50) : prev;
                });
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

    // Accept external order
    const acceptOrder = async (orderId: string) => {
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

    // Reject external order
    const rejectOrder = async (orderId: string) => {
        setUpdatingId(orderId);
        try {
            const res = await fetch('/api/restaurant/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: orderId, status: 'cancelled' }),
            });
            if (res.ok) {
                setOrders(prev => prev.filter(o => o.id !== orderId));
            }
        } finally {
            setUpdatingId(null);
        }
    };

    const formatElapsedTime = (dateString: string) => {
        const diffMs = Math.max(0, now - new Date(dateString).getTime());
        const totalSeconds = Math.floor(diffMs / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getElapsedMinutes = (dateString: string) => {
        return Math.floor((now - new Date(dateString).getTime()) / 60000);
    };

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg, fontFamily: CAIRO, color: C.textPrimary }}>
            {/* Header */}
            <div style={{ padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <a href="/" title="الخروج للنظام" style={{ width: '38px', height: '38px', borderRadius: '12px', border: '1px solid #ef444440', background: '#ef444415', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', textDecoration: 'none' }}>
                        <LogOut size={18} />
                    </a>
                    <div style={{ padding: '8px', borderRadius: '10px', background: C.primaryBg, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChefHat size={18} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: C.textPrimary }}>شاشة المطبخ (KDS)</h1>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>إدارة الطلبات الحية ومتابعة التحضير</p>
                    </div>
                </div>
                <button title="الطلبات المكتملة" onClick={() => setShowCompletedPanel(!showCompletedPanel)} style={{ width: '38px', height: '38px', borderRadius: '12px', border: `1px solid ${C.primary}40`, background: showCompletedPanel ? C.primary : `${C.primary}15`, color: showCompletedPanel ? '#fff' : C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', zIndex: 101 }}>
                    <CheckCircle2 size={18} />
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                {loading && orders.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.textMuted }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                ) : orders.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.textMuted, gap: '12px' }}>
                        <CheckCircle2 size={48} style={{ opacity: 0.2 }} />
                        <h2 style={{ margin: 0, fontSize: '20px' }}>لا توجد طلبات حالياً</h2>
                        <p style={{ margin: 0, fontSize: '14px' }}>المطبخ هادئ... استرخِ قليلاً ☕</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                        {orders.map(order => {
                            const elapsedMins = getElapsedMinutes(order.createdAt);
                            const isLate = elapsedMins > 20;
                            const isPreparing = order.status === 'preparing';
                            const isExternal = order.source && order.source !== 'pos';
                            const sourceLabel = order.source === 'website' ? 'طلب موقع' : order.source === 'qr' ? 'طلب QR' : order.source === 'api' ? 'طلب خارجي' : '';
                            const isPendingExternal = isExternal && order.status === 'pending';

                            return (
                                <div key={order.id} style={{ background: C.card, border: `2px solid ${isPendingExternal ? '#f59e0b50' : isLate ? '#ef444450' : isPreparing ? C.primary : C.border}`, borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.1)' }}>
                                    
                                    {/* External Order Banner */}
                                    {isExternal && (
                                        <div style={{ padding: '8px 16px', background: isPendingExternal ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.08)', borderBottom: `1px solid ${isPendingExternal ? '#f59e0b30' : '#3b82f630'}`, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: isPendingExternal ? '#f59e0b' : '#3b82f6' }}>
                                            <Globe size={14} />
                                            🌐 {sourceLabel}
                                            {isPendingExternal && <span style={{ marginInlineStart: 'auto', fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: '#f59e0b20', border: '1px solid #f59e0b40', animation: 'pulse 2s infinite' }}>بانتظار الموافقة</span>}
                                        </div>
                                    )}

                                    {/* Order Header */}
                                    <div style={{ padding: '12px', background: isLate ? '#ef444415' : isPreparing ? `${C.primary}15` : C.bg, display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: `1px solid ${C.border}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, fontFamily: OUTFIT, display: 'flex', alignItems: 'center', gap: '8px', color: C.textPrimary }}>
                                                #{order.orderNumber}
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isLate ? '#ef4444' : C.primary, fontSize: '16px', fontWeight: 800, fontFamily: OUTFIT }}>
                                                <Clock size={16} /> {formatElapsedTime(order.createdAt)}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 600, color: C.textSecondary }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#00000010', color: C.textPrimary, fontFamily: CAIRO, fontWeight: 700 }}>
                                                    {order.type === 'dine-in' ? 'صالة' : order.type === 'takeaway' ? 'تيك أواي' : order.type === 'delivery' ? 'توصيل' : 'أونلاين'}
                                                </span>
                                                <span style={{ fontFamily: OUTFIT, fontWeight: 700 }}>{new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            {order.table && <span>الطاولة: <strong style={{ color: C.primary }}>{order.table.name}</strong></span>}
                                        </div>
                                    </div>

                                    {/* External Customer Info */}
                                    {isExternal && (order.deliveryName || order.deliveryPhone || order.deliveryAddress) && (
                                        <div style={{ padding: '10px 16px', background: 'rgba(59,130,246,0.04)', borderBottom: `1px solid ${C.border}`, display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>
                                            {order.deliveryName && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} style={{ color: '#3b82f6' }} /> {order.deliveryName}</span>}
                                            {order.deliveryPhone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} style={{ color: '#10b981' }} /> <span dir="ltr">{order.deliveryPhone}</span></span>}
                                            {order.deliveryAddress && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} style={{ color: '#f59e0b' }} /> {order.deliveryAddress}</span>}
                                        </div>
                                    )}

                                    {/* Order Lines */}
                                    <div style={{ padding: '12px', flex: 1 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {order.lines?.map((line: any) => (
                                                <div key={line.id} style={{ display: 'flex', gap: '10px', borderBottom: `1px solid ${C.border}`, paddingBottom: '10px' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: `${C.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: OUTFIT, color: C.primary, fontSize: '14px', flexShrink: 0 }}>
                                                        {line.quantity}
                                                    </div>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: C.textPrimary }}>{line.itemName}</p>
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
                                    <div style={{ padding: '12px', display: 'flex', gap: '10px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
                                        {isPendingExternal ? (
                                            /* Accept/Reject for external pending orders */
                                            <>
                                                <button onClick={() => acceptOrder(order.id)} disabled={updatingId === order.id} style={{ flex: 1, height: '38px', borderRadius: '10px', background: '#10b981', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}>
                                                    {updatingId === order.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle2 size={16} /> قبول الطلب</>}
                                                </button>
                                                <button onClick={() => rejectOrder(order.id)} disabled={updatingId === order.id} style={{ flex: 1, height: '38px', borderRadius: '10px', background: '#ef4444', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(239,68,68,0.3)' }}>
                                                    {updatingId === order.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><XCircle size={16} /> رفض</>}
                                                </button>
                                            </>
                                        ) : isPreparing ? (
                                            <button onClick={() => markAsReady(order.id)} disabled={updatingId === order.id} style={{ flex: 1, height: '38px', borderRadius: '10px', background: '#10b981', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}>
                                                {updatingId === order.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle2 size={16} /> جاهز للتسليم</>}
                                            </button>
                                        ) : (
                                            <button onClick={() => markAsPreparing(order.id)} disabled={updatingId === order.id} style={{ flex: 1, height: '38px', borderRadius: '10px', background: C.primary, border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: `0 4px 10px ${C.primary}40` }}>
                                                {updatingId === order.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'بدء التحضير'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Completed Orders Sidebar Overlay */}
            {showCompletedPanel && (
                <div onClick={() => setShowCompletedPanel(false)} style={{ position: 'absolute', top: '79px', left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99, backdropFilter: 'blur(2px)' }} />
            )}
            <div style={{
                position: 'absolute',
                top: '79px',
                bottom: 0,
                [isRtl ? 'left' : 'right']: showCompletedPanel ? 0 : '-400px',
                width: '400px',
                background: C.card,
                boxShadow: '0 0 20px rgba(0,0,0,0.1)',
                transition: '0.3s ease-in-out',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                borderInlineStart: `1px solid ${C.border}`
            }}>
                <div style={{ padding: '24px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.bg }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={20} color="#10b981" /> الطلبات المكتملة
                    </h3>
                    <button onClick={() => setShowCompletedPanel(false)} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: C.textSecondary, cursor: 'pointer', borderRadius: '8px' }} onMouseEnter={e => e.currentTarget.style.background = C.border} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <XCircle size={20} />
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {completedOrders.length === 0 ? (
                        <p style={{ textAlign: 'center', color: C.textMuted, fontSize: '14px', marginTop: '40px', fontWeight: 600 }}>لا توجد طلبات مكتملة حديثاً</p>
                    ) : (
                        completedOrders.map(o => (
                            <div key={o.id} style={{ 
                                position: 'relative',
                                background: 'linear-gradient(to right, rgba(16, 185, 129, 0.03), rgba(16, 185, 129, 0.08))', 
                                border: '1px solid rgba(16, 185, 129, 0.15)', 
                                borderRadius: '14px', 
                                padding: '16px',
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '12px',
                                overflow: 'hidden',
                                boxShadow: '0 4px 15px -5px rgba(0,0,0,0.1)'
                            }}>
                                {/* Left/Right Accent line */}
                                <div style={{ position: 'absolute', top: 0, bottom: 0, [isRtl ? 'right' : 'left']: 0, width: '4px', background: '#10b981' }} />
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, fontFamily: OUTFIT, color: C.textPrimary }}>
                                            #{o.orderNumber}
                                        </h3>
                                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, padding: '3px 10px', background: '#10b98115', borderRadius: '20px', border: '1px solid #10b98130' }}>
                                            {o.status === 'delivered' ? 'تم التسليم' : 'جاهز'}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '12px', fontFamily: OUTFIT, color: C.textMuted, fontWeight: 600 }}>
                                        {new Date(o.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingInlineStart: '4px' }}>
                                    {o.lines?.map((l: any, i: number) => (
                                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                            <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 800, fontFamily: OUTFIT, minWidth: '20px' }}>{l.quantity}x</span>
                                            <span style={{ color: C.textPrimary, fontSize: '13px', fontWeight: 600 }}>{l.itemName}</span>
                                        </div>
                                    ))}
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '12px', borderTop: '1px dashed rgba(16, 185, 129, 0.2)' }}>
                                    <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO, fontWeight: 700, background: 'rgba(0,0,0,0.2)', padding: '3px 8px', borderRadius: '6px' }}>
                                        {o.type === 'dine-in' ? 'صالة' : o.type === 'takeaway' ? 'تيك أواي' : o.type === 'delivery' ? 'توصيل' : 'أونلاين'}
                                    </span>
                                    {o.table && <span style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>الطاولة: <strong style={{ color: C.primary }}>{o.table.name}</strong></span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
        </div>
    );
}
