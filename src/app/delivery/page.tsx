'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { C, CAIRO, OUTFIT } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import { Truck, RefreshCw, Loader2, MapPin, Phone, Clock, User, Package, CheckCircle2, ChevronDown } from 'lucide-react';

const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'بانتظار المطبخ', color: '#f59e0b', bg: '#fef3c7' },
    preparing: { label: 'قيد التجهيز', color: '#8b5cf6', bg: '#ede9fe' },
    ready: { label: 'جاهز للاستلام', color: '#10b981', bg: '#d1fae5' },
    assigned: { label: 'تم التعيين', color: '#6366f1', bg: '#e0e7ff' },
    picked: { label: 'خرج للتوصيل', color: '#3b82f6', bg: '#dbeafe' },
    delivered: { label: 'تم التسليم', color: '#14b8a6', bg: '#ccfbf1' },
    returned: { label: 'رفض الاستلام', color: '#f97316', bg: '#ffedd5' },
    cancelled: { label: 'ملغي', color: '#ef4444', bg: '#fee2e2' },
};

export default function DeliveryPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const { fMoneyJSX } = useCurrency();

    const [orders, setOrders] = useState<any[]>([]);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

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
            let url = `/api/restaurant/orders?type=delivery&limit=100`;
            if (filterStatus) url += `&status=${filterStatus}`;
            if (filterDate) url += `&date=${filterDate}`;
            const r = await fetch(url);
            const data = await r.json();
            setOrders(Array.isArray(data) ? data : []);
        } finally { setLoading(false); }
    }, [filterStatus, filterDate]);

    useEffect(() => { load(); }, [load]);

    const updateStatus = async (id: string, status: string, driverId?: string) => {
        await fetch('/api/restaurant/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status, driverId }),
        });
        load();
        if(driverId || status === 'delivered' || status === 'cancelled' || status === 'returned') loadDrivers(); 
    };

    const formatTime = (d: string) => new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const pending = orders.filter(o => o.status === 'pending').length;
    const onTheWay = orders.filter(o => o.status === 'picked').length;
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

                {/* فلتر */}
                <div className="filter-bar" style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input 
                        type="date" 
                        value={filterDate} 
                        onChange={(e) => setFilterDate(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}
                    />
                    {[{ value: '', label: 'كل الحالات' }, ...Object.entries(STATUS_INFO).map(([v, s]) => ({ value: v, label: s.label }))].map(s => (
                        <button key={s.value} onClick={() => setFilterStatus(s.value)}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${filterStatus === s.value ? C.primary : C.border}`, background: filterStatus === s.value ? `${C.primary}12` : C.card, color: filterStatus === s.value ? C.primary : C.textSecondary, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
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
                        <p style={{fontSize: '13px'}}>لا توجد طلبات توصيل</p>
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
                                                 المندوب: {order.driver.name}
                                            </span>
                                        )}
                                        
                                        <span style={{ fontSize: '12px', color: C.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={12} /> {formatTime(order.createdAt)}
                                        </span>
                                        
                                        <span style={{ background: st.bg, border: `1px solid ${st.color}40`, borderRadius: '6px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 700, color: st.color }}>
                                            {st.label}
                                        </span>
                                        
                                        <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
                                            
                                            {/* Quick Actions in Header */}
                                            {(!order.driverId && order.status !== 'delivered' && order.status !== 'cancelled') && (
                                                <select
                                                    value=""
                                                    onChange={(e) => { if (e.target.value) updateStatus(order.id, 'assigned', e.target.value); }}
                                                    style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${C.border}`, background: C.card, fontSize: '11px', fontWeight: 600, fontFamily: CAIRO, color: C.textSecondary, outline: 'none', cursor: 'pointer' }}
                                                >
                                                    <option value="" disabled>تعيين مندوب...</option>
                                                    {drivers.filter(d => d.status === 'available').map(d => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </select>
                                            )}

                                            {(order.driverId && order.status !== 'picked' && order.status !== 'delivered' && order.status !== 'cancelled') && (
                                                <button onClick={() => updateStatus(order.id, 'picked', order.driverId)}
                                                    style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid #3b82f640`, background: '#3b82f612', color: '#3b82f6', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, transition: 'all 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#3b82f620'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#3b82f612'}
                                                >
                                                    خرج للتوصيل
                                                </button>
                                            )}

                                             {(order.status === 'picked') && (
                                                <>
                                                    <button onClick={() => updateStatus(order.id, 'delivered')}
                                                        style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid #14b8a640`, background: '#14b8a612', color: '#14b8a6', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, transition: 'all 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#14b8a620'}
                                                        onMouseLeave={e => e.currentTarget.style.background = '#14b8a612'}
                                                    >
                                                        تأكيد التسليم
                                                    </button>
                                                    <button onClick={() => updateStatus(order.id, 'returned')}
                                                        style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid #f9741640`, background: '#f9741612', color: '#f97416', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, transition: 'all 0.2s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#f9741620'}
                                                        onMouseLeave={e => e.currentTarget.style.background = '#f9741612'}
                                                    >
                                                        رفض الاستلام
                                                    </button>
                                                </>
                                             )}
                                            
                                            {fMoneyJSX(order.total, '', { fontWeight: 800, fontSize: '14px', color: C.textPrimary, marginInlineStart: '8px' })}
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
                                                            {fMoneyJSX(line.total, "", { fontWeight: 700, color: C.textPrimary })}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* العمليات المنطقية - Workflow */}
                                             {order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'returned' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <h4 style={{ margin: 0, fontSize: '13px', color: C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>تحديث الإجراء</h4>
                                                    
                                                    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        
                                                        {order.status === 'pending' && (
                                                            <button onClick={() => updateStatus(order.id, 'preparing')}
                                                                style={{ width: 'fit-content', padding: '6px 16px', borderRadius: '8px', border: `1px solid ${C.primary}`, background: C.primary, color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                                                بدء التجهيز
                                                            </button>
                                                        )}
                                                        
                                                        {order.status === 'preparing' && (
                                                            <button onClick={() => updateStatus(order.id, 'ready')}
                                                                style={{ width: 'fit-content', padding: '6px 16px', borderRadius: '8px', border: `1px solid #10b981`, background: '#10b981', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                                                جاهز للاستلام
                                                            </button>
                                                        )}
                                                        
                                                        {(!order.driverId && (order.status === 'ready' || order.status === 'preparing' || order.status === 'pending')) && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: order.status === 'ready' ? 0 : '8px', paddingTop: order.status === 'ready' ? 0 : '8px', borderTop: order.status === 'ready' ? 'none' : `1px dashed ${C.border}` }}>
                                                                <span style={{fontSize: '12px', color: C.textSecondary, fontWeight: 600}}>إسناد إلى مندوب:</span>
                                                                <div className="filter-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                                    {drivers.filter(d => d.status === 'available').length > 0 ? drivers.filter(d => d.status === 'available').map(d => (
                                                                        <button key={d.id} onClick={() => updateStatus(order.id, 'assigned', d.id)}
                                                                            style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO, transition: 'all 0.2s' }}
                                                                            onMouseEnter={e => { e.currentTarget.style.background = `${C.primary}10`; e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}
                                                                        >
                                                                            {d.name}
                                                                        </button>
                                                                    )) : <a href="/restaurant/drivers" style={{ fontSize: '12px', color: C.primary, textDecoration: 'none', fontWeight: 600, fontFamily: CAIRO }}>لا يوجد مناديب متاحين ←</a>}
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        {(order.driverId && order.status !== 'picked' && order.status !== 'delivered') && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                <span style={{fontSize: '12px', color: '#6366f1', fontWeight: 600}}>المندوب المعين: {order.driver?.name}</span>
                                                                <button onClick={() => updateStatus(order.id, 'picked', order.driverId)}
                                                                    style={{ width: 'fit-content', padding: '6px 16px', borderRadius: '8px', border: `1px solid #3b82f6`, background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                                                    خرج للتوصيل
                                                                </button>
                                                            </div>
                                                        )}
                                                        
                                                        {order.status === 'picked' && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                <span style={{fontSize: '12px', color: '#3b82f6', fontWeight: 600}}>مع المندوب: {order.driver?.name}</span>
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    <button onClick={() => updateStatus(order.id, 'delivered')}
                                                                        style={{ width: 'fit-content', padding: '6px 16px', borderRadius: '8px', border: `1px solid #14b8a6`, background: '#14b8a6', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                                                        تأكيد التسليم
                                                                    </button>
                                                                    <button onClick={() => updateStatus(order.id, 'returned')}
                                                                        style={{ width: 'fit-content', padding: '6px 16px', borderRadius: '8px', border: `1px solid #f97416`, background: 'transparent', color: '#f97416', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                                                        رفض الاستلام
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {order.status === 'returned' && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                                <div style={{ padding: '8px 12px', background: '#ffedd5', border: '1px solid #f9741640', borderRadius: '8px', fontSize: '12px', color: '#c2410c', fontWeight: 700 }}>
                                                                    تم رفض الاستلام من العميل — يمكنك إعادة المحاولة أو إلغاء الطلب
                                                                </div>
                                                                <span style={{fontSize: '12px', color: C.textSecondary, fontWeight: 600}}>إعادة الإرسال مع مندوب:</span>
                                                                <div className="filter-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                                    {drivers.filter(d => d.status === 'available').length > 0 ? drivers.filter(d => d.status === 'available').map(d => (
                                                                        <button key={d.id} onClick={() => updateStatus(order.id, 'assigned', d.id)}
                                                                            style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO, transition: 'all 0.2s' }}
                                                                            onMouseEnter={e => { e.currentTarget.style.background = `${C.primary}10`; e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}
                                                                        >
                                                                            {d.name}
                                                                        </button>
                                                                    )) : <span style={{ fontSize: '12px', color: C.textMuted, fontWeight: 600 }}>لا يوجد مناديب متاحين الآن</span>}
                                                                </div>
                                                                <button onClick={() => updateStatus(order.id, 'cancelled')}
                                                                    style={{ width: 'fit-content', padding: '6px 16px', borderRadius: '8px', border: `1px solid #ef4444`, background: 'transparent', color: '#ef4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                                                    إلغاء الطلب نهائياً
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
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
