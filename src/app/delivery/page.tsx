'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { C, CAIRO, OUTFIT, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import {
    Truck, Plus, RefreshCw, Loader2, X, Check, MapPin,
    Phone, Clock, User, ChevronDown, AlertCircle, Package, CheckCircle2
} from 'lucide-react';

const STATUS_INFO: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
    pending:    { label: 'بانتظار المطبخ',  color: '#f59e0b', bg: '#f59e0b12', emoji: '⏳' },
    preparing:  { label: 'قيد التجهيز',    color: '#8b5cf6', bg: '#8b5cf612', emoji: '🍳' },
    ready:      { label: 'جاهز للاستلام',  color: '#10b981', bg: '#10b98112', emoji: '🎒' },
    assigned:   { label: 'تم التعيين',     color: '#6366f1', bg: '#6366f112', emoji: '🏍️' },
    picked:     { label: 'خرج للتوصيل',    color: '#3b82f6', bg: '#3b82f612', emoji: '🚚' },
    delivered:  { label: 'تم التسليم',     color: '#14b8a6', bg: '#14b8a612', emoji: '✅' },
    cancelled:  { label: 'ملغي',          color: '#ef4444', bg: '#ef444412', emoji: '❌' },
};

export default function DeliveryPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const { fMoney } = useCurrency();

    const [orders,   setOrders]   = useState<any[]>([]);
    const [drivers,  setDrivers]  = useState<any[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState('');

    // Load drivers from API (not localStorage)
    const loadDrivers = useCallback(async () => {
        try {
            const res = await fetch('/api/drivers');
            if (res.ok) {
                const data = await res.json();
                setDrivers(Array.isArray(data) ? data : []);
            }
        } catch { }
    }, []);

    useEffect(() => { loadDrivers(); }, [loadDrivers]);

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

    const updateStatus = async (id: string, status: string, driverId?: string) => {
        await fetch('/api/restaurant/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status, driverId }),
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
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>

                {/* Header */}
                <PageHeader
                    title={t('إدارة التوصيل')}
                    subtitle={t('تتبع وإدارة طلبات التوصيل والمناديب')}
                    icon={Truck}
                    actions={[
                        <button key="refresh" onClick={load} style={{ height: '42px', width: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={15} /></button>
                    ]}
                />

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: 'في الانتظار', count: pending, color: '#f59e0b', icon: <Clock size={18} /> },
                        { label: 'في الطريق', count: onTheWay, color: '#3b82f6', icon: <Truck size={18} /> },
                        { label: 'تم التسليم اليوم', count: delivered, color: '#10b981', icon: <CheckCircle2 size={18} /> },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                            padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'all 0.2s', position: 'relative'
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = `${s.color}15`}
                            onMouseLeave={e => e.currentTarget.style.background = `${s.color}08`}
                        >
                            <div style={{ textAlign: 'start' }}>
                                <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', whiteSpace: 'nowrap' }}>{s.label}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.count}</span>
                                    <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500 }}>طلب</span>
                                </div>
                            </div>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                {s.icon}
                            </div>
                        </div>
                    ))}
                    {/* إدارة المناديب */}
                    <div style={{
                        background: `${C.primary}05`, border: `1px solid ${C.primary}22`, borderRadius: '10px',
                        padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'all 0.2s', position: 'relative'
                    }}>
                        <div style={{ textAlign: 'start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: 0, whiteSpace: 'nowrap' }}>المناديب</p>
                                <a href="/restaurant/drivers" style={{ color: C.primary, fontSize: '10px', fontWeight: 700, fontFamily: CAIRO, textDecoration: 'none' }}>إدارة ←</a>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{drivers.length}</span>
                                <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500 }}>
                                    متاح: {drivers.filter(d => d.status === 'available').length}
                                </span>
                            </div>
                        </div>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${C.primary}15`, border: `1px solid ${C.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                            <User size={18} />
                        </div>
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px', color: C.textMuted }}>
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
                                        {order.deliveryName && (
                                            <span style={{ fontSize: '12px', color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <User size={12} /> {order.deliveryName}
                                            </span>
                                        )}
                                        {order.deliveryPhone && (
                                            <span style={{ fontSize: '12px', color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: OUTFIT }}>
                                                <Phone size={12} /> {order.deliveryPhone}
                                            </span>
                                        )}
                                        {order.driver && (
                                            <span style={{ fontSize: '12px', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                                🏍️ {order.driver.name}
                                            </span>
                                        )}
                                        <span style={{ fontSize: '12px', color: C.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12} /> {formatTime(order.createdAt)}
                                        </span>
                                        <span style={{ background: st.bg, border: `1px solid ${st.color}40`, borderRadius: '6px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 700, color: st.color }}>{st.label}</span>
                                        <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                                            {(!order.driverId && order.status !== 'delivered' && order.status !== 'cancelled') && (
                                                <select 
                                                    value="" 
                                                    onChange={(e) => { if(e.target.value) updateStatus(order.id, 'assigned', e.target.value); }}
                                                    style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${C.border}`, background: C.card, fontSize: '11px', fontWeight: 600, fontFamily: CAIRO, color: C.textSecondary, outline: 'none', cursor: 'pointer' }}
                                                >
                                                    <option value="" disabled>تعيين سريع لمندوب...</option>
                                                    {drivers.filter(d => d.status === 'available').map(d => (
                                                        <option key={d.id} value={d.id}>🏍️ {d.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                            
                                            {(order.driverId && order.status !== 'picked' && order.status !== 'delivered' && order.status !== 'cancelled') && (
                                                <button onClick={() => updateStatus(order.id, 'picked', order.driverId)}
                                                    style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid #3b82f640`, background: '#3b82f612', color: '#3b82f6', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, transition: 'all 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#3b82f620'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#3b82f612'}
                                                >
                                                    🚚 إرسال للتوصيل
                                                </button>
                                            )}

                                            {(order.status === 'picked') && (
                                                <button onClick={() => updateStatus(order.id, 'delivered')}
                                                    style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid #14b8a640`, background: '#14b8a612', color: '#14b8a6', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, transition: 'all 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#14b8a620'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#14b8a612'}
                                                >
                                                    ✅ تأكيد التسليم
                                                </button>
                                            )}
                                            <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary, marginInlineStart: '8px' }}>{fMoney(order.total)}</span>
                                            <ChevronDown size={15} color={C.textMuted} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: '4px' }} />
                                        </div>
                                    </div>

                                    {isOpen && (
                                        <div style={{ borderTop: `1px solid ${C.border}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', background: `${C.bg}30` }}>
                                            {/* الأصناف */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <h4 style={{ margin: 0, fontSize: '13px', color: C.textPrimary, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}>
                                                    <Package size={14} color={C.primary} /> تفاصيل الطلب
                                                </h4>
                                                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {order.lines?.map((line: any, idx: number) => (
                                                        <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: C.textPrimary, paddingBottom: idx !== order.lines.length - 1 ? '8px' : 0, borderBottom: idx !== order.lines.length - 1 ? `1px dashed ${C.border}` : 'none' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ background: `${C.primary}15`, color: C.primary, padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontFamily: OUTFIT, fontSize: '12px' }}>x{line.quantity}</span>
                                                                <span style={{ fontWeight: 600, fontFamily: CAIRO }}>{line.itemName}</span>
                                                            </div>
                                                            <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{fMoney(line.total)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* العمليات */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                {/* تعيين مندوب */}
                                                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                                    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        <h4 style={{ margin: 0, fontSize: '13px', color: C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>إسناد الطلب لمندوب</h4>
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                            {drivers.filter(d => d.status === 'available').length > 0 ? drivers.filter(d => d.status === 'available').map(d => (
                                                                <button key={d.id} onClick={() => updateStatus(order.id, 'assigned', d.id)}
                                                                    style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${order.driverId === d.id ? C.primary : C.border}`, background: order.driverId === d.id ? `${C.primary}15` : 'transparent', color: order.driverId === d.id ? C.primary : C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
                                                                    onMouseEnter={e => e.currentTarget.style.background = order.driverId === d.id ? `${C.primary}15` : `${C.primary}05`}
                                                                    onMouseLeave={e => e.currentTarget.style.background = order.driverId === d.id ? `${C.primary}15` : 'transparent'}
                                                                >
                                                                    🏍️ {d.name}
                                                                </button>
                                                            )) : <a href="/restaurant/drivers" style={{ fontSize: '12px', color: C.primary, textDecoration: 'none', fontWeight: 600, fontFamily: CAIRO }}>لا يوجد مناديب متاحين ←</a>}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* تغيير الحالة */}
                                                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <h4 style={{ margin: 0, fontSize: '13px', color: C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>تحديث حالة الطلب</h4>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        {Object.entries(STATUS_INFO).filter(([s]) => s !== order.status).map(([s, si]) => (
                                                            <button key={s} onClick={() => updateStatus(order.id, s)}
                                                                style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${si.color}40`, background: si.bg, color: si.color, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
                                                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                            >
                                                                {si.emoji} {si.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
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
