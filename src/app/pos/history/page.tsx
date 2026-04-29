'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { C, CAIRO, OUTFIT, IS, BTN_PRIMARY } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import { Loader2, Package, Truck, ChevronDown, History, CheckCircle2, XCircle, TrendingUp, Globe, Phone, MapPin, User, Utensils, ShoppingBag, Printer, Search } from 'lucide-react';

const TYPE_ICONS: Record<string, React.ReactNode> = {
    'dine-in': <Utensils size={14} />,
    'takeaway': <ShoppingBag size={14} />,
    'delivery': <Truck size={14} />,
    'online': <Globe size={14} />
};
const TYPE_LABELS: Record<string, string> = { 'dine-in': 'صالة', 'takeaway': 'تيك أواي', 'delivery': 'توصيل', 'online': 'أونلاين' };
const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
    pending:    { label: 'معلق',       color: '#f59e0b', bg: '#f59e0b12' },
    preparing:  { label: 'قيد التحضير', color: '#6366f1', bg: '#6366f112' },
    ready:      { label: 'جاهز',       color: '#10b981', bg: '#10b98112' },
    delivered:  { label: 'تم التسليم', color: '#6b7280', bg: '#6b728012' },
    cancelled:  { label: 'ملغي',       color: '#ef4444', bg: '#ef444412' },
};

export default function OrdersHistoryPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const { fMoney } = useCurrency();

    const [orders, setOrders]       = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);
    const [expanded, setExpanded]   = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const url = filterStatus ? `/api/restaurant/orders?status=${filterStatus}&limit=100` : '/api/restaurant/orders?limit=100';
            const r = await fetch(url);
            setOrders(await r.json());
        } finally { setLoading(false); }
    }, [filterStatus]);

    useEffect(() => { load(); }, [load]);

    // Use en-GB to enforce western arabic numerals (0-9) then replace am/pm
    const formatDate = (d: string) => {
        let str = new Date(d).toLocaleString('en-GB', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', hour12: true 
        });
        return str.replace('am', 'ص').replace('pm', 'م').replace('AM', 'ص').replace('PM', 'م');
    };

    const updateStatus = async (id: string, status: string) => {
        let revertInventory = false;
        if (status === 'cancelled') {
            if (!confirm(t('هل أنت متأكد من إلغاء هذا الطلب؟'))) return;
            revertInventory = confirm(t('هل تريد إرجاع مكونات هذا الطلب إلى المخزن (إلغاء الاستهلاك)؟\n\n- اضغط OK (موافق) للإرجاع.\n- اضغط Cancel (إلغاء) لاعتباره هالك (Waste).'));
        }
        await fetch('/api/restaurant/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status, revertInventory }),
        });
        load();
    };

    const handlePrint = (order: any) => {
        // Just an alert for now, in a real scenario you would trigger the print logic
        alert(t('جاري الطباعة للطلب رقم') + ' ' + (order.invoice?.invoiceNumber || order.orderNumber));
    };

    const filteredOrders = orders.filter(o => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const num = (o.invoice?.invoiceNumber || o.orderNumber).toString();
        const phone = o.deliveryPhone || '';
        const name = o.deliveryName || '';
        return num.includes(q) || phone.includes(q) || name.toLowerCase().includes(q);
    });

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={t('سجل الطلبات')}
                    subtitle={t('عرض وتتبع جميع الطلبات')}
                    icon={History}
                    actions={[]}
                />

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: 'إجمالي الطلبات', count: orders.length, color: C.primary, icon: <Package size={18} />, suffix: 'طلب' },
                        { label: 'الطلبات المكتملة', count: orders.filter(o => o.status === 'delivered').length, color: '#10b981', icon: <CheckCircle2 size={18} />, suffix: 'طلب' },
                        { label: 'الطلبات الملغية', count: orders.filter(o => o.status === 'cancelled').length, color: '#ef4444', icon: <XCircle size={18} />, suffix: 'طلب' },
                        { label: 'إجمالي المبيعات', count: fMoney(orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0)), color: '#f59e0b', icon: <TrendingUp size={18} />, suffix: '' },
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
                                    {s.suffix && <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500 }}>{s.suffix}</span>}
                                </div>
                            </div>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                {s.icon}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters & Search */}
                <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[{ value: '', label: 'الكل' }, ...Object.entries(STATUS_INFO).map(([v, s]) => ({ value: v, label: s.label }))].map(s => (
                            <button key={s.value} onClick={() => setFilterStatus(s.value)}
                                style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${filterStatus === s.value ? C.primary : C.border}`, background: filterStatus === s.value ? `${C.primary}12` : 'transparent', color: filterStatus === s.value ? C.primary : C.textSecondary, fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                    
                    <div style={{ position: 'relative', width: '280px' }}>
                        <Search size={16} color={C.textMuted} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isRtl ? 'right' : 'left']: '14px' }} />
                        <input 
                            type="text" 
                            placeholder={t("بحث برقم الفاتورة، العميل، أو الجوال...")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ 
                                ...IS, width: '100%', height: '42px', padding: isRtl ? '0 40px 0 14px' : '0 14px 0 40px',
                                borderRadius: '12px', border: `1px solid ${C.border}`, background: C.card,
                                color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO
                            }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textMuted }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {filteredOrders.length === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px', color: C.textMuted }}>
                                <History size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                                <p style={{ fontFamily: CAIRO, fontWeight: 600 }}>{t("لا توجد طلبات")}</p>
                            </div>
                        )}
                        {filteredOrders.map(order => {
                            const st = STATUS_INFO[order.status] ?? STATUS_INFO.pending;
                            const isOpen = expanded === order.id;
                            const invoiceNo = order.invoice?.invoiceNumber || order.orderNumber;
                            
                            return (
                                <div key={order.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                                    {/* Row header */}
                                    <div onClick={() => setExpanded(isOpen ? null : order.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', cursor: 'pointer', flexWrap: 'wrap' }}>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px', background: `${C.primary}15`, color: C.primary, borderRadius: '8px', minWidth: '60px' }}>
                                            <span style={{ fontFamily: OUTFIT, fontWeight: 800, fontSize: '14px' }}>#{invoiceNo}</span>
                                        </div>
                                        
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: C.textSecondary, fontWeight: 600, padding: '4px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                            {TYPE_ICONS[order.type]} 
                                            {TYPE_LABELS[order.type] ?? order.type}
                                            {order.table ? ` • ${order.table.name}` : ''}
                                        </span>
                                        
                                        {order.source && order.source !== 'pos' && (
                                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Globe size={10} /> {order.source === 'website' ? 'موقع' : order.source === 'qr' ? 'QR' : 'خارجي'}
                                            </span>
                                        )}
                                        
                                        <span style={{ fontSize: '12.5px', color: C.textMuted, fontFamily: OUTFIT }}>{formatDate(order.createdAt)}</span>
                                        
                                        <span style={{ background: st.bg, border: `1px solid ${st.color}40`, borderRadius: '6px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 700, color: st.color }}>{st.label}</span>
                                        
                                        <span style={{ marginInlineStart: 'auto', fontFamily: OUTFIT, fontWeight: 800, color: C.textPrimary, fontSize: '15px' }}>{fMoney(order.total)}</span>
                                        
                                        <ChevronDown size={18} color={C.textMuted} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                                    </div>

                                    {/* تفاصيل الطلب */}
                                    {isOpen && (
                                        <div style={{ borderTop: `1px solid ${C.border}`, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {/* Order Items UI */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                                                {order.lines?.map((line: any) => (
                                                    <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px dashed ${C.border}`, paddingBottom: '8px', marginBottom: '8px' }}>
                                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                            <div style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', color: C.textSecondary, fontFamily: OUTFIT, fontWeight: 700, fontSize: '12px' }}>
                                                                {line.quantity}x
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '13.5px', color: C.textPrimary, fontWeight: 600 }}>{line.itemName}</div>
                                                                {line.notes && <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '4px', fontWeight: 500 }}>📝 {line.notes}</div>}
                                                            </div>
                                                        </div>
                                                        <span style={{ fontFamily: OUTFIT, color: C.textPrimary, fontWeight: 700, fontSize: '13.5px' }}>{fMoney(line.total)}</span>
                                                    </div>
                                                ))}
                                                {/* Totals Summary */}
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', marginTop: '4px' }}>
                                                    {order.taxAmount > 0 && <span style={{ fontSize: '12px', color: C.textMuted }}>ضريبة: <span style={{ fontFamily: OUTFIT }}>{fMoney(order.taxAmount)}</span></span>}
                                                    {order.discount > 0 && <span style={{ fontSize: '12px', color: '#ef4444' }}>خصم: <span style={{ fontFamily: OUTFIT }}>{fMoney(order.discount)}</span></span>}
                                                    <span style={{ fontSize: '13px', color: C.textPrimary, fontWeight: 700 }}>الإجمالي: <span style={{ fontFamily: OUTFIT }}>{fMoney(order.total)}</span></span>
                                                </div>
                                            </div>

                                            {/* External customer info */}
                                            {order.source && order.source !== 'pos' && (order.deliveryName || order.deliveryPhone || order.deliveryAddress) && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)', fontSize: '12.5px', color: C.textSecondary, fontWeight: 600 }}>
                                                    {order.deliveryName && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} style={{ color: '#3b82f6' }} /> {order.deliveryName}</span>}
                                                    {order.deliveryPhone && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} style={{ color: '#10b981' }} /> <span dir="ltr" style={{ fontFamily: OUTFIT }}>{order.deliveryPhone}</span></span>}
                                                    {order.deliveryAddress && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} style={{ color: '#f59e0b' }} /> {order.deliveryAddress}</span>}
                                                </div>
                                            )}

                                            {order.notes && <div style={{ fontSize: '12.5px', color: C.textSecondary, background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${C.border}` }}>📝 {t("ملاحظات الطلب:")} {order.notes}</div>}

                                            {/* أزرار الإجراءات (Actions) */}
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: `1px solid ${C.border}`, paddingTop: '16px', alignItems: 'center' }}>
                                                <button onClick={() => handlePrint(order)} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = C.card}>
                                                    <Printer size={16} /> {t("طباعة الإيصال")}
                                                </button>
                                                
                                                <div style={{ flex: 1 }}></div>

                                                {['preparing', 'ready', 'delivered'].filter(s => s !== order.status && order.status !== 'cancelled').map(s => {
                                                    const si = STATUS_INFO[s];
                                                    const isPrimary = s === 'delivered';
                                                    return (
                                                        <button key={s} onClick={() => updateStatus(order.id, s)}
                                                            style={{ 
                                                                padding: '8px 16px', borderRadius: '8px', 
                                                                border: isPrimary ? 'none' : `1px solid ${si.color}50`, 
                                                                background: isPrimary ? C.primary : 'transparent', 
                                                                color: isPrimary ? '#fff' : si.color, 
                                                                fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO,
                                                                boxShadow: isPrimary ? '0 4px 12px rgba(37,106,244,0.2)' : 'none'
                                                            }}>
                                                            {s === 'delivered' ? '✓ ' + si.label : si.label}
                                                        </button>
                                                    );
                                                })}

                                                {order.status !== 'cancelled' && (
                                                    <button onClick={() => updateStatus(order.id, 'cancelled')}
                                                        style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid #ef444450`, background: 'transparent', color: '#ef4444', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, marginInlineStart: '10px' }}>
                                                        {t("إلغاء الطلب")}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
