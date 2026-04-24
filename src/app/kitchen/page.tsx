'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { C, CAIRO, OUTFIT, BTN_PRIMARY } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import { RefreshCw, Loader2, Check, Clock, UtensilsCrossed, Table2, Package, Truck, Wifi, ChefHat } from 'lucide-react';

const TYPE_ICONS: Record<string, any> = { 'dine-in': Table2, 'takeaway': Package, 'delivery': Truck, 'online': Wifi };
const TYPE_LABELS: Record<string, string> = { 'dine-in': 'صالة', 'takeaway': 'تيك أواي', 'delivery': 'توصيل', 'online': 'أونلاين' };
const STATUS_COLORS: Record<string, string> = { pending: '#f59e0b', preparing: '#6366f1', ready: '#10b981' };

function elapsed(createdAt: string) {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    const m = Math.floor(diff / 60), s = diff % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function KitchenPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const { fmt } = useCurrency();

    const [orders, setOrders]   = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tick, setTick]       = useState(0);
    const timerRef              = useRef<any>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/restaurant/orders?status=pending&limit=30');
            const data = await res.json();
            const pending = Array.isArray(data) ? data.filter((o: any) => ['pending', 'preparing'].includes(o.status)) : [];
            setOrders(pending);
        } finally { setLoading(false); }
    }, []);

    // Auto refresh every 15s + timer tick every second
    useEffect(() => {
        load();
        const refreshInterval = setInterval(load, 15000);
        timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
        return () => { clearInterval(refreshInterval); clearInterval(timerRef.current); };
    }, [load]);

    const updateStatus = async (orderId: string, status: string) => {
        await fetch('/api/restaurant/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: orderId, status }),
        });
        load();
    };

    const getElapsedColor = (createdAt: string) => {
        const mins = (Date.now() - new Date(createdAt).getTime()) / 60000;
        if (mins > 20) return '#ef4444';
        if (mins > 10) return '#f59e0b';
        return '#10b981';
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '24px', fontFamily: CAIRO, minHeight: '100vh', background: C.bg }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '14px', background: `${C.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                            <ChefHat size={24} />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: C.textPrimary }}>{t('شاشة المطبخ (KDS)')}</h1>
                            <p style={{ margin: 0, fontSize: '12px', color: C.textMuted }}>{t('تحديث تلقائي كل 15 ثانية')} • {orders.length} {t('طلب نشط')}</p>
                        </div>
                    </div>
                    <button onClick={load} style={{ height: '40px', padding: '0 16px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                        <RefreshCw size={14} /> {t('تحديث')}
                    </button>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {[{ label: 'جديد', color: '#f59e0b' }, { label: 'قيد التحضير', color: '#6366f1' }, { label: 'جاهز', color: '#10b981' }].map(s => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.textSecondary }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                            {s.label}
                        </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.textSecondary, marginInlineStart: 'auto' }}>
                        <Clock size={13} color="#ef4444" /> أكثر من 20 دقيقة تظهر باللون الأحمر
                    </div>
                </div>

                {/* Orders Grid */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px', color: C.textMuted }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : orders.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', color: C.textMuted, gap: '16px' }}>
                        <UtensilsCrossed size={56} style={{ opacity: 0.2 }} />
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{t('لا توجد طلبات حالياً 🎉')}</p>
                        <p style={{ margin: 0, fontSize: '13px' }}>{t('ستظهر الطلبات الجديدة هنا تلقائياً')}</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {orders.map(order => {
                            const Icon = TYPE_ICONS[order.type] ?? Table2;
                            const elapsedColor = getElapsedColor(order.createdAt);
                            const statusColor = STATUS_COLORS[order.status] ?? '#f59e0b';
                            return (
                                <div key={order.id} style={{ background: C.card, border: `2px solid ${statusColor}40`, borderRadius: '20px', overflow: 'hidden', boxShadow: `0 4px 20px -8px ${statusColor}30`, transition: 'all 0.3s' }}>
                                    {/* Header الكارت */}
                                    <div style={{ background: `${statusColor}10`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${statusColor}20` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '10px', background: `${statusColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: statusColor }}>
                                                <Icon size={18} />
                                            </div>
                                            <div>
                                                <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT }}>#{order.orderNumber}</p>
                                                <p style={{ margin: 0, fontSize: '11.5px', color: C.textSecondary }}>{TYPE_LABELS[order.type]}{order.table ? ` • ${order.table.name}` : ''}</p>
                                            </div>
                                        </div>
                                        {/* عداد الوقت */}
                                        <div style={{ textAlign: 'center', color: elapsedColor }}>
                                            <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: OUTFIT }}>{elapsed(order.createdAt)}</p>
                                            <p style={{ margin: 0, fontSize: '10px', fontWeight: 600 }}>دقيقة</p>
                                        </div>
                                    </div>

                                    {/* بنود الطلب */}
                                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {order.lines?.map((line: any) => (
                                            <div key={line.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                <div style={{ minWidth: 28, height: 28, borderRadius: '8px', background: `${C.primary}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>
                                                    {line.quantity}
                                                </div>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: line.kitchenDone ? C.textMuted : C.textPrimary, textDecoration: line.kitchenDone ? 'line-through' : 'none' }}>{line.itemName}</p>
                                                    {line.notes && <p style={{ margin: '2px 0 0', fontSize: '11px', color: C.warning }}>⚠️ {line.notes}</p>}
                                                    {line.modifiers && <p style={{ margin: '2px 0 0', fontSize: '11px', color: C.textMuted }}>{line.modifiers}</p>}
                                                </div>
                                            </div>
                                        ))}
                                        {order.notes && (
                                            <div style={{ background: `${C.warning}10`, border: `1px solid ${C.warning}30`, borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: C.warning, fontWeight: 600 }}>
                                                📝 {order.notes}
                                            </div>
                                        )}
                                    </div>

                                    {/* أزرار الإجراءات */}
                                    <div style={{ padding: '0 16px 14px', display: 'flex', gap: '8px' }}>
                                        {order.status === 'pending' && (
                                            <button onClick={() => updateStatus(order.id, 'preparing')}
                                                style={{ flex: 1, height: '40px', borderRadius: '10px', border: `1px solid #6366f140`, background: '#6366f112', color: '#6366f1', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                                🍳 {t('بدء التحضير')}
                                            </button>
                                        )}
                                        {order.status === 'preparing' && (
                                            <button onClick={() => updateStatus(order.id, 'ready')}
                                                style={{ ...BTN_PRIMARY(false, false), flex: 1, height: '40px', borderRadius: '10px', fontSize: '12.5px', gap: '6px', background: '#10b981', boxShadow: '0 4px 12px #10b98140' }}>
                                                <Check size={15} /> {t('تم التجهيز ✔️')}
                                            </button>
                                        )}
                                        {order.status === 'ready' && (
                                            <div style={{ flex: 1, height: '40px', borderRadius: '10px', border: `1px solid #10b98140`, background: '#10b98112', color: '#10b981', fontSize: '12.5px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CAIRO }}>
                                                ✅ {t('جاهز للتسليم')}
                                            </div>
                                        )}
                                    </div>
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
