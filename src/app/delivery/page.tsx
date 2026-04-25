'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { C, CAIRO, OUTFIT, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import {
    Truck, Plus, RefreshCw, Loader2, X, Check, MapPin,
    Phone, Clock, User, ChevronDown, AlertCircle, Package
} from 'lucide-react';

const STATUS_INFO: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
    pending:    { label: 'في الانتظار',  color: '#f59e0b', bg: '#f59e0b12', emoji: '⏳' },
    assigned:   { label: 'تم التعيين',   color: '#6366f1', bg: '#6366f112', emoji: '🏍️' },
    picked:     { label: 'جاري التوصيل', color: '#3b82f6', bg: '#3b82f612', emoji: '🚚' },
    delivered:  { label: 'تم التسليم',   color: '#10b981', bg: '#10b98112', emoji: '✅' },
    cancelled:  { label: 'ملغي',         color: '#ef4444', bg: '#ef444412', emoji: '❌' },
};

export default function DeliveryPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const { fMoney } = useCurrency();

    const [orders,   setOrders]   = useState<any[]>([]);
    const [drivers,  setDrivers]  = useState<string[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [showAddDriver, setShowAddDriver] = useState(false);
    const [newDriver, setNewDriver] = useState('');

    // Load drivers from localStorage
    useEffect(() => {
        try {
            const d = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
            setDrivers(Array.isArray(d) ? d : []);
        } catch { }
    }, []);

    const saveDrivers = (list: string[]) => {
        setDrivers(list);
        localStorage.setItem('delivery_drivers', JSON.stringify(list));
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const url = filterStatus
                ? `/api/restaurant/orders?type=delivery&status=${filterStatus}&limit=100`
                : '/api/restaurant/orders?type=delivery&limit=100';
            const r = await fetch(url);
            const data = await r.json();
            setOrders(Array.isArray(data) ? data : []);
        } finally { setLoading(false); }
    }, [filterStatus]);

    useEffect(() => { load(); }, [load]);

    const updateStatus = async (id: string, status: string, driver?: string) => {
        await fetch('/api/restaurant/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status, deliveryDriver: driver }),
        });
        load();
    };

    const formatTime = (d: string) => new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (d: string) => new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });

    const pending   = orders.filter(o => o.status === 'pending').length;
    const onTheWay  = orders.filter(o => o.status === 'picked').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto', fontFamily: CAIRO }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Truck size={24} color={C.primary} /> {t('إدارة التوصيل')}
                        </h1>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.textMuted }}>{t('تتبع وإدارة طلبات التوصيل والمناديب')}</p>
                    </div>
                    <button onClick={load} style={{ height: '40px', width: '40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={15} /></button>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    {[
                        { label: 'في الانتظار', value: pending, color: '#f59e0b', bg: '#f59e0b12' },
                        { label: 'في الطريق', value: onTheWay, color: '#3b82f6', bg: '#3b82f612' },
                        { label: 'تم التسليم اليوم', value: delivered, color: '#10b981', bg: '#10b98112' },
                    ].map(s => (
                        <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: '16px', padding: '16px 20px' }}>
                            <p style={{ margin: 0, fontSize: '12px', color: s.color, fontWeight: 600 }}>{s.label}</p>
                            <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 800, color: s.color, fontFamily: OUTFIT }}>{s.value}</p>
                        </div>
                    ))}
                    {/* إدارة المناديب */}
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <p style={{ margin: 0, fontSize: '12px', color: C.textMuted, fontWeight: 600 }}>المناديب</p>
                            <button onClick={() => setShowAddDriver(true)} style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: CAIRO }}>+ إضافة</button>
                        </div>
                        <p style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: C.textPrimary, fontFamily: OUTFIT }}>{drivers.length}</p>
                        {showAddDriver && (
                            <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                                <input value={newDriver} onChange={e => setNewDriver(e.target.value)} placeholder="اسم المندوب" style={{ ...IS, height: '32px', fontSize: '12px', flex: 1 }} />
                                <button onClick={() => { if (newDriver.trim()) { saveDrivers([...drivers, newDriver.trim()]); setNewDriver(''); setShowAddDriver(false); } }} style={{ width: 32, height: 32, borderRadius: '8px', border: 'none', background: C.primary, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={13} /></button>
                                <button onClick={() => { setShowAddDriver(false); setNewDriver(''); }} style={{ width: 32, height: 32, borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
                            </div>
                        )}
                    </div>
                </div>

                {/* فلتر الحالة */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {[{ value: '', label: 'الكل' }, ...Object.entries(STATUS_INFO).map(([v, s]) => ({ value: v, label: s.label }))].map(s => (
                        <button key={s.value} onClick={() => setFilterStatus(s.value)}
                            style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${filterStatus === s.value ? C.primary : C.border}`, background: filterStatus === s.value ? `${C.primary}12` : 'transparent', color: filterStatus === s.value ? C.primary : C.textSecondary, fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* القائمة */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textMuted }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: C.textMuted }}>
                        <Truck size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                        <p>لا توجد طلبات توصيل</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {orders.map(order => {
                            const st = STATUS_INFO[order.status] ?? STATUS_INFO.pending;
                            const isOpen = expanded === order.id;
                            return (
                                <div key={order.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                                    <div onClick={() => setExpanded(isOpen ? null : order.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', cursor: 'pointer', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '20px' }}>{st.emoji}</span>
                                        <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.primary, fontSize: '14px' }}>#{order.orderNumber}</span>
                                        {order.deliveryAddress && (
                                            <span style={{ fontSize: '12px', color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={12} /> {order.deliveryAddress}
                                            </span>
                                        )}
                                        {order.deliveryDriver && (
                                            <span style={{ fontSize: '12px', color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <User size={12} /> {order.deliveryDriver}
                                            </span>
                                        )}
                                        <span style={{ fontSize: '12px', color: C.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12} /> {formatTime(order.createdAt)}
                                        </span>
                                        <span style={{ background: st.bg, border: `1px solid ${st.color}40`, borderRadius: '6px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 700, color: st.color }}>{st.label}</span>
                                        <span style={{ marginInlineStart: 'auto', fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{fMoney(order.total)}</span>
                                        <ChevronDown size={15} color={C.textMuted} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                    </div>

                                    {isOpen && (
                                        <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {/* الأصناف */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {order.lines?.map((line: any) => (
                                                    <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: C.textSecondary }}>
                                                        <span>{line.quantity}× {line.itemName}</span>
                                                        <span style={{ fontFamily: OUTFIT }}>{fMoney(line.total)}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* تعيين مندوب */}
                                            {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: `1px solid ${C.border}`, paddingTop: '12px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '12px', color: C.textMuted }}>تعيين مندوب:</span>
                                                    {drivers.length > 0 ? drivers.map(d => (
                                                        <button key={d} onClick={() => updateStatus(order.id, 'assigned', d)}
                                                            style={{ padding: '5px 12px', borderRadius: '8px', border: `1px solid ${order.deliveryDriver === d ? C.primary : C.border}`, background: order.deliveryDriver === d ? `${C.primary}15` : 'transparent', color: order.deliveryDriver === d ? C.primary : C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                                                            🏍️ {d}
                                                        </button>
                                                    )) : <span style={{ fontSize: '12px', color: C.textMuted }}>أضف مندوبين أولاً</span>}
                                                </div>
                                            )}

                                            {/* تغيير الحالة */}
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '12px', color: C.textMuted, alignSelf: 'center' }}>تغيير الحالة:</span>
                                                {Object.entries(STATUS_INFO).filter(([s]) => s !== order.status).map(([s, si]) => (
                                                    <button key={s} onClick={() => updateStatus(order.id, s)}
                                                        style={{ padding: '5px 14px', borderRadius: '8px', border: `1px solid ${si.color}40`, background: si.bg, color: si.color, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                                        {si.emoji} {si.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </DashboardLayout>
    );
}
