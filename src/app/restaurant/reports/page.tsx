'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, Clock, Package, Users, XCircle, Loader2, CalendarDays } from 'lucide-react';
import { C, CAIRO, OUTFIT, PAGE_BASE, TABLE_STYLE, IS, focusIn, focusOut } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from '@/lib/i18n';

const ORDER_TYPE_LABELS: Record<string, string> = {
    'dine-in': 'صالة',
    'takeaway': 'تيك أواي',
    'delivery': 'توصيل',
    'online': 'أونلاين',
};

const PAYMENT_LABELS: Record<string, string> = {
    'cash': 'كاش',
    'card': 'بطاقة',
    'mixed': 'مختلط',
};

export default function RestaurantReportsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { fMoneyJSX } = useCurrency();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            const res = await fetch(`/api/restaurant/reports?${params}`);
            if (res.ok) setData(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [from, to]);

    useEffect(() => { fetchReport(); }, [fetchReport]);

    const KPI = ({ label, value, icon: Icon, color, suffix }: any) => (
        <div style={{
            background: `${color}08`, border: `1px solid ${color}33`, borderRadius: '14px',
            padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all 0.3s'
        }}>
            <div>
                <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 6px', fontFamily: CAIRO }}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT }}>{value}</span>
                    {suffix && <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{suffix}</span>}
                </div>
            </div>
            <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: `${color}15`, border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color
            }}>
                <Icon size={20} />
            </div>
        </div>
    );

    const SectionTitle = ({ icon: Icon, label }: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', marginTop: '28px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: C.primaryBg, border: `1px solid ${C.primaryBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                <Icon size={16} />
            </div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{label}</h3>
        </div>
    );

    const fNum = (n: number) => n?.toLocaleString('en-US', { maximumFractionDigits: 2 }) || '0';

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={t("تقارير المطعم")}
                    subtitle={t("ملخص أداء المطعم — المبيعات، الطلبات، وأكثر الأصناف مبيعاً")}
                    icon={BarChart3}
                />

                {/* Date Filters */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarDays size={16} style={{ color: C.primary }} />
                        <span style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>{t('من')}</span>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...IS, width: '160px', height: '38px', fontSize: '12px', fontFamily: OUTFIT, borderRadius: '10px' }} onFocus={focusIn} onBlur={focusOut} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>{t('إلى')}</span>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...IS, width: '160px', height: '38px', fontSize: '12px', fontFamily: OUTFIT, borderRadius: '10px' }} onFocus={focusIn} onBlur={focusOut} />
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', textAlign: 'center', color: C.textMuted }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto 16px' }} />
                        <p style={{ fontWeight: 600 }}>{t('جاري تحميل التقرير...')}</p>
                    </div>
                ) : data ? (
                    <>
                        {/* KPI Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '8px' }}>
                            <KPI label={t('إجمالي المبيعات')} value={fNum(data.sales.totalRevenue)} icon={DollarSign} color="#10b981" suffix="" />
                            <KPI label={t('عدد الطلبات')} value={fNum(data.sales.totalOrders)} icon={ShoppingCart} color="#256af4" suffix={t('طلب')} />
                            <KPI label={t('متوسط قيمة الطلب')} value={fNum(data.sales.averageOrderValue)} icon={TrendingUp} color="#8b5cf6" suffix="" />
                            <KPI label={t('طلبات ملغاة')} value={fNum(data.sales.cancelledOrders)} icon={XCircle} color="#ef4444" suffix={t('طلب')} />
                        </div>

                        {/* Order Type Breakdown */}
                        <SectionTitle icon={ShoppingCart} label={t('توزيع الطلبات حسب النوع')} />
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.ordersByType.length || 1}, 1fr)`, gap: '12px' }}>
                            {data.ordersByType.map((ot: any) => (
                                <div key={ot.type} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '13px', color: C.textSecondary, margin: '0 0 8px', fontWeight: 600 }}>{t(ORDER_TYPE_LABELS[ot.type] || ot.type)}</p>
                                    <p style={{ fontSize: '22px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT, margin: '0 0 4px' }}>{fNum(ot.count)}</p>
                                    <p style={{ fontSize: '11px', color: C.textMuted, margin: 0 }}>{fNum(ot.total)} {t('إجمالي')}</p>
                                </div>
                            ))}
                        </div>

                        {/* Payment Breakdown */}
                        {data.paymentBreakdown.length > 0 && (
                            <>
                                <SectionTitle icon={DollarSign} label={t('توزيع طرق الدفع')} />
                                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.paymentBreakdown.length}, 1fr)`, gap: '12px' }}>
                                    {data.paymentBreakdown.map((p: any) => (
                                        <div key={p.method} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
                                            <p style={{ fontSize: '13px', color: C.textSecondary, margin: '0 0 8px', fontWeight: 600 }}>{t(PAYMENT_LABELS[p.method] || p.method)}</p>
                                            <p style={{ fontSize: '22px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT, margin: '0 0 4px' }}>{fNum(p.total)}</p>
                                            <p style={{ fontSize: '11px', color: C.textMuted, margin: 0 }}>{fNum(p.count)} {t('عملية')}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Top Selling Items */}
                        <SectionTitle icon={Package} label={t('أكثر الأصناف مبيعاً')} />
                        <div style={TABLE_STYLE.container}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        {[t('#'), t('الصنف'), t('الكمية المباعة'), t('الإيراد'), t('عدد الطلبات')].map((h, i) => (
                                            <th key={h} style={TABLE_STYLE.th(i === 0, i > 1)}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.topItems.map((item: any, idx: number) => (
                                        <tr key={item.itemId} style={TABLE_STYLE.row(idx === data.topItems.length - 1)}>
                                            <td style={TABLE_STYLE.td(true, true)}><span style={{ fontWeight: 700, fontFamily: OUTFIT, color: C.primary }}>{idx + 1}</span></td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontWeight: 700, fontSize: '13px' }}>{item.itemName}</td>
                                            <td style={{ ...TABLE_STYLE.td(false, true), fontFamily: OUTFIT, fontWeight: 600 }}>{fNum(item.quantitySold)}</td>
                                            <td style={{ ...TABLE_STYLE.td(false, true), fontFamily: OUTFIT, fontWeight: 600 }}>{fNum(item.totalRevenue)}</td>
                                            <td style={{ ...TABLE_STYLE.td(false, true), fontFamily: OUTFIT }}>{fNum(item.orderCount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Hourly Distribution */}
                        {data.hourlyDistribution.length > 0 && (
                            <>
                                <SectionTitle icon={Clock} label={t('التوزيع الزمني للطلبات')} />
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '150px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px 16px 12px', overflow: 'hidden' }}>
                                    {data.hourlyDistribution.map((h: any) => {
                                        const max = Math.max(...data.hourlyDistribution.map((x: any) => x.count), 1);
                                        const height = (h.count / max) * 100;
                                        return (
                                            <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                <div style={{
                                                    width: '100%', maxWidth: '28px', height: `${height}%`, minHeight: '4px',
                                                    background: `linear-gradient(180deg, ${C.primary}, ${C.primary}80)`,
                                                    borderRadius: '6px 6px 2px 2px', transition: 'height 0.4s ease'
                                                }} title={`${h.count} ${t('طلب')} — ${fNum(h.total)}`} />
                                                <span style={{ fontSize: '9px', color: C.textMuted, fontFamily: OUTFIT, fontWeight: 600 }}>{h.hour}:00</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* Recent Shifts */}
                        {data.recentShifts.length > 0 && (
                            <>
                                <SectionTitle icon={Users} label={t('آخر الورديات')} />
                                <div style={TABLE_STYLE.container}>
                                    <table style={TABLE_STYLE.table}>
                                        <thead>
                                            <tr style={TABLE_STYLE.thead}>
                                                {[t('الوردية'), t('الحالة'), t('المبيعات'), t('الطلبات'), t('الفرق')].map((h, i) => (
                                                    <th key={h} style={TABLE_STYLE.th(i === 0, i > 1)}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.recentShifts.map((s: any, idx: number) => (
                                                <tr key={s.id} style={TABLE_STYLE.row(idx === data.recentShifts.length - 1)}>
                                                    <td style={TABLE_STYLE.td(true)}><span style={{ fontWeight: 700, fontFamily: OUTFIT, color: C.primary }}>#{s.shiftNumber}</span></td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        <span style={{
                                                            padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                                            background: s.status === 'open' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                                                            color: s.status === 'open' ? '#10b981' : '#6b7280',
                                                            border: `1px solid ${s.status === 'open' ? '#10b98140' : '#6b728040'}`
                                                        }}>{s.status === 'open' ? t('مفتوحة') : t('مغلقة')}</span>
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(false, true), fontFamily: OUTFIT, fontWeight: 600 }}>{fNum(s.totalSales)}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false, true), fontFamily: OUTFIT }}>{s.totalOrders}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false, true), fontFamily: OUTFIT, fontWeight: 700, color: (s.difference ?? 0) >= 0 ? '#10b981' : '#ef4444' }}>
                                                        {s.difference != null ? ((s.difference >= 0 ? '+' : '') + fNum(s.difference)) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </>
                ) : null}
            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } `}</style>
        </DashboardLayout>
    );
}
