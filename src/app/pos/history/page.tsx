'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { C, CAIRO, OUTFIT, IS, BTN_PRIMARY } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import { RefreshCw, Loader2, Table2, Package, Truck, Wifi, ChevronDown, History, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';

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

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const url = filterStatus ? `/api/restaurant/orders?status=${filterStatus}&limit=100` : '/api/restaurant/orders?limit=100';
            const r = await fetch(url);
            setOrders(await r.json());
        } finally { setLoading(false); }
    }, [filterStatus]);

    useEffect(() => { load(); }, [load]);

    const formatDate = (d: string) => new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });

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

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={t('سجل الطلبات')}
                    subtitle={t('عرض وتتبع جميع الطلبات')}
                    icon={History}
                    actions={[
                        <button key="refresh" onClick={load} style={{ height: '42px', width: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={15} /></button>
                    ]}
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

                {/* فلتر الحالة */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {[{ value: '', label: 'الكل' }, ...Object.entries(STATUS_INFO).map(([v, s]) => ({ value: v, label: s.label }))].map(s => (
                        <button key={s.value} onClick={() => setFilterStatus(s.value)}
                            style={{ padding: '6px 16px', borderRadius: '20px', border: `1px solid ${filterStatus === s.value ? C.primary : C.border}`, background: filterStatus === s.value ? `${C.primary}12` : 'transparent', color: filterStatus === s.value ? C.primary : C.textSecondary, fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                            {s.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textMuted }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {orders.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '60px', color: C.textMuted }}>
                                <History size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                                <p>لا توجد طلبات</p>
                            </div>
                        )}
                        {orders.map(order => {
                            const st = STATUS_INFO[order.status] ?? STATUS_INFO.pending;
                            const isOpen = expanded === order.id;
                            return (
                                <div key={order.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                                    {/* Row header */}
                                    <div onClick={() => setExpanded(isOpen ? null : order.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', cursor: 'pointer', flexWrap: 'wrap' }}>
                                        <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.primary, fontSize: '14px', minWidth: '50px' }}>#{order.orderNumber}</span>
                                        <span style={{ fontSize: '12.5px', color: C.textSecondary }}>{TYPE_LABELS[order.type] ?? order.type}{order.table ? ` • ${order.table.name}` : ''}</span>
                                        <span style={{ fontSize: '12px', color: C.textMuted }}>{formatDate(order.createdAt)}</span>
                                        <span style={{ background: st.bg, border: `1px solid ${st.color}40`, borderRadius: '6px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 700, color: st.color }}>{st.label}</span>
                                        <span style={{ marginInlineStart: 'auto', fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary, fontSize: '14px' }}>{fMoney(order.total)}</span>
                                        <ChevronDown size={16} color={C.textMuted} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                                    </div>

                                    {/* تفاصيل الطلب */}
                                    {isOpen && (
                                        <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {order.lines?.map((line: any) => (
                                                    <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: C.textSecondary }}>
                                                        <span>{line.quantity}× {line.itemName}{line.notes ? ` (${line.notes})` : ''}</span>
                                                        <span style={{ fontFamily: OUTFIT, color: C.textPrimary }}>{fMoney(line.total)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {order.notes && <p style={{ margin: 0, fontSize: '12px', color: C.textSecondary }}>📝 {order.notes}</p>}

                                            {/* تغيير الحالة */}
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}>
                                                <span style={{ fontSize: '12px', color: C.textMuted, alignSelf: 'center' }}>تغيير الحالة:</span>
                                                {['preparing', 'ready', 'delivered', 'cancelled'].filter(s => s !== order.status).map(s => {
                                                    const si = STATUS_INFO[s];
                                                    return (
                                                        <button key={s} onClick={() => updateStatus(order.id, s)}
                                                            style={{ padding: '5px 14px', borderRadius: '8px', border: `1px solid ${si.color}40`, background: si.bg, color: si.color, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                                            {si.label}
                                                        </button>
                                                    );
                                                })}
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
