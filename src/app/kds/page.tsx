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
                setOrders(data.filter(o => o.status === 'preparing' || (o.status === 'pending' && o.source && o.source !== 'pos')));
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

            {/* Split Layout Container */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Content */}
                <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
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
                                <div key={order.id} style={{ 
                                    position: 'relative',
                                    background: isLate ? 'linear-gradient(to right, rgba(239, 68, 68, 0.03), rgba(239, 68, 68, 0.08))' : isPreparing ? 'linear-gradient(to right, rgba(37, 106, 244, 0.03), rgba(37, 106, 244, 0.08))' : C.card,
                                    border: `1px solid ${isLate ? '#ef444450' : isPreparing ? `${C.primary}50` : C.border}`,
                                    borderRadius: '14px', 
                                    padding: '16px',
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '12px',
                                    boxShadow: isPreparing ? `0 4px 20px -5px ${C.primary}20` : '0 4px 15px -5px rgba(0,0,0,0.1)',
                                    overflow: 'hidden'
                                }}>
                                    {/* Left/Right Accent line */}
                                    <div style={{ position: 'absolute', top: 0, bottom: 0, [isRtl ? 'right' : 'left']: 0, width: '4px', background: isLate ? '#ef4444' : isPreparing ? C.primary : C.border }} />

                                    {/* External Order Banner */}
                                    {isExternal && (
                                        <div style={{ margin: '-16px -16px 0 -16px', padding: '8px 16px', background: isPendingExternal ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.08)', borderBottom: `1px solid ${isPendingExternal ? '#f59e0b30' : '#3b82f630'}`, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: isPendingExternal ? '#f59e0b' : '#3b82f6' }}>
                                            <Globe size={14} />
                                            🌐 {sourceLabel}
                                            {isPendingExternal && <span style={{ marginInlineStart: 'auto', fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: '#f59e0b20', border: '1px solid #f59e0b40', animation: 'pulse 2s infinite' }}>بانتظار الموافقة</span>}
                                        </div>
                                    )}

                                    {/* Order Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, fontFamily: OUTFIT, display: 'flex', alignItems: 'center', gap: '8px', color: C.textPrimary }}>
                                                {`#${order.orderNumber.toString().padStart(4, '0')}`}
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isLate ? '#ef4444' : C.primary, fontSize: '13px', fontWeight: 800, fontFamily: OUTFIT, background: isLate ? '#ef444415' : `${C.primary}15`, padding: '3px 10px', borderRadius: '20px', border: `1px solid ${isLate ? '#ef444430' : `${C.primary}30`}` }}>
                                                <Clock size={13} /> {formatElapsedTime(order.createdAt)}
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '12px', fontFamily: OUTFIT, color: C.textMuted, fontWeight: 600 }}>
                                            {new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {/* Order Lines */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingInlineStart: '4px', marginTop: '4px', flex: 1 }}>
                                        {order.lines?.map((line: any) => (
                                            <div key={line.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                                    <span style={{ color: C.textPrimary, fontSize: '14px', fontWeight: 700 }}>{line.itemName}</span>
                                                    <span style={{ color: isLate ? '#ef4444' : C.primary, fontSize: '14px', fontWeight: 800, fontFamily: OUTFIT, textAlign: isRtl ? 'left' : 'right' }}>x{line.quantity}</span>
                                                </div>
                                                {line.modifiers && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingInlineStart: '8px' }}>
                                                        {Object.values(JSON.parse(line.modifiers)).flat().map((m: any, i: number) => (
                                                            <span key={i} style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>+ {m.name}</span>
                                                        ))}
                                                    </div>
                                                )}
                                                {line.notes && <span style={{ fontSize: '12px', color: C.textMuted, fontWeight: 600, paddingInlineStart: '8px' }}>📝 {line.notes}</span>}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Order Notes */}
                                    {order.notes && (
                                        <div style={{ padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: `1px dashed rgba(245, 158, 11, 0.3)`, fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                                            <AlertCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                            ملاحظة: {order.notes}
                                        </div>
                                    )}

                                    {/* External Customer Info */}
                                    {isExternal && (order.deliveryName || order.deliveryPhone || order.deliveryAddress) && (
                                        <div style={{ padding: '8px', background: 'rgba(59,130,246,0.04)', border: `1px solid rgba(59,130,246,0.1)`, borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: C.textSecondary, fontWeight: 600 }}>
                                            {order.deliveryName && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={10} style={{ color: '#3b82f6' }} /> {order.deliveryName}</span>}
                                            {order.deliveryPhone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={10} style={{ color: '#10b981' }} /> <span dir="ltr">{order.deliveryPhone}</span></span>}
                                            {order.deliveryAddress && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={10} style={{ color: '#f59e0b' }} /> {order.deliveryAddress}</span>}
                                        </div>
                                    )}

                                    {/* Metadata & Actions */}
                                    <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: `1px dashed ${isLate ? '#ef444430' : isPreparing ? `${C.primary}30` : C.border}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO, fontWeight: 700, background: 'rgba(0,0,0,0.2)', padding: '3px 8px', borderRadius: '6px' }}>
                                                {order.type === 'dine-in' ? 'صالة' : order.type === 'takeaway' ? 'تيك أواي' : order.type === 'delivery' ? 'توصيل' : 'أونلاين'}
                                            </span>
                                            {order.table && <span style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>الطاولة: <strong style={{ color: C.primary }}>{order.table.name}</strong></span>}
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {isPendingExternal ? (
                                                <>
                                                    <button onClick={() => acceptOrder(order.id)} disabled={updatingId === order.id} style={{ flex: 1, height: '36px', borderRadius: '10px', background: '#10b981', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                        {updatingId === order.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle2 size={16} /> قبول</>}
                                                    </button>
                                                    <button onClick={() => rejectOrder(order.id)} disabled={updatingId === order.id} style={{ flex: 1, height: '36px', borderRadius: '10px', background: '#ef4444', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                        {updatingId === order.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><XCircle size={16} /> رفض</>}
                                                    </button>
                                                </>
                                            ) : isPreparing ? (
                                                <button onClick={() => markAsReady(order.id)} disabled={updatingId === order.id} style={{ flex: 1, height: '36px', borderRadius: '10px', background: '#10b981', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(16,185,129,0.2)' }}>
                                                    {updatingId === order.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle2 size={16} /> جاهز</>}
                                                </button>
                                            ) : (
                                                <button onClick={() => markAsPreparing(order.id)} disabled={updatingId === order.id} style={{ flex: 1, height: '36px', borderRadius: '10px', background: C.primary, border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: `0 4px 10px ${C.primary}20` }}>
                                                    {updatingId === order.id ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'بدء التحضير'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Completed Orders Sidebar (Split layout) */}
            <div style={{
                width: showCompletedPanel ? '280px' : '0px',
                background: C.card,
                boxShadow: showCompletedPanel ? '-4px 0 20px rgba(0,0,0,0.05)' : 'none',
                transition: 'width 0.3s ease-in-out, border 0.3s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                borderInlineStart: showCompletedPanel ? `1px solid ${C.border}` : 'none',
                overflow: 'hidden',
                flexShrink: 0
            }}>
                <div style={{ padding: '20px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', minWidth: '280px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={18} color="#10b981" /> الطلبات المكتملة
                    </h3>
                </div>
                <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '280px' }}>
                    {completedOrders.length === 0 ? (
                        <p style={{ textAlign: 'center', color: C.textMuted, fontSize: '13px', marginTop: '40px', fontWeight: 600 }}>لا توجد طلبات مكتملة حديثاً</p>
                    ) : (
                        completedOrders.map(o => (
                            <div key={o.id} style={{ 
                                position: 'relative',
                                background: 'linear-gradient(to right, rgba(16, 185, 129, 0.03), rgba(16, 185, 129, 0.08))', 
                                border: '1px solid rgba(16, 185, 129, 0.15)', 
                                borderRadius: '12px', 
                                padding: '12px',
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '10px',
                                overflow: 'hidden',
                                flexShrink: 0
                            }}>
                                {/* Left/Right Accent line */}
                                <div style={{ position: 'absolute', top: 0, bottom: 0, [isRtl ? 'right' : 'left']: 0, width: '4px', background: '#10b981' }} />
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, fontFamily: OUTFIT, color: C.textPrimary }}>
                                            {`#${o.orderNumber.toString().padStart(4, '0')}`}
                                        </h3>
                                        <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, padding: '2px 8px', background: '#10b98115', borderRadius: '12px', border: '1px solid #10b98130' }}>
                                            مكتمل
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '11px', fontFamily: OUTFIT, color: C.textMuted, fontWeight: 600 }}>
                                        {new Date(o.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingInlineStart: '4px' }}>
                                    {o.lines?.map((l: any, i: number) => (
                                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                                <span style={{ color: C.textPrimary, fontSize: '12px', fontWeight: 600 }}>{l.itemName}</span>
                                                <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 800, fontFamily: OUTFIT, textAlign: isRtl ? 'left' : 'right' }}>x{l.quantity}</span>
                                            </div>
                                            {l.modifiers && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingInlineStart: '6px' }}>
                                                    {Object.values(JSON.parse(l.modifiers)).flat().map((m: any, idx: number) => (
                                                        <span key={idx} style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>+ {m.name}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '10px', borderTop: '1px dashed rgba(16, 185, 129, 0.2)' }}>
                                    <span style={{ fontSize: '10px', color: C.textSecondary, fontFamily: CAIRO, fontWeight: 700, background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '4px' }}>
                                        {o.type === 'dine-in' ? 'صالة' : o.type === 'takeaway' ? 'تيك أواي' : o.type === 'delivery' ? 'توصيل' : 'أونلاين'}
                                    </span>
                                    {o.table && <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 600 }}>الطاولة: <strong style={{ color: C.primary }}>{o.table.name}</strong></span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            {/* End Split Layout Container */}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } } 
                @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
                
                .custom-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                    background: rgba(150, 150, 150, 0.2);
                    border-radius: 10px;
                }
                .custom-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(150, 150, 150, 0.4);
                }
                .custom-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(150, 150, 150, 0.2) transparent;
                }
            `}</style>
        </div>
    );
}
