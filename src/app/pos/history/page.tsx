'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import { C, CAIRO, OUTFIT, IS, TABLE_STYLE } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import { Loader2, Package, Truck, History, CheckCircle2, XCircle, TrendingUp, Globe, Printer, Search, FileText, Check, X, RotateCcw, AlertCircle, ShoppingBag, Utensils, ChevronDown } from 'lucide-react';

const TYPE_ICONS: Record<string, React.ReactNode> = {
    'dine-in': <Utensils size={14} />,
    'takeaway': <ShoppingBag size={14} />,
    'delivery': <Truck size={14} />,
    'online': <Globe size={14} />
};
const TYPE_LABELS: Record<string, string> = { 'dine-in': 'صالة', 'takeaway': 'تيك اوي', 'delivery': 'توصيل', 'online': 'أونلاين' };

const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
    pending:    { label: 'معالجة',     color: '#f59e0b', bg: '#fef3c7' },
    preparing:  { label: 'طلبات الانتظار', color: '#8b5cf6', bg: '#ede9fe' },
    ready:      { label: 'جاهز',       color: '#3b82f6', bg: '#dbeafe' },
    delivered:  { label: 'مكتمل',      color: '#10b981', bg: '#d1fae5' },
    cancelled:  { label: 'ألغيت',       color: '#ef4444', bg: '#fee2e2' },
};

export default function OrdersHistoryPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const { fMoney } = useCurrency();

    const [orders, setOrders]       = useState<any[]>([]);
    const [loading, setLoading]     = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

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
            year: 'numeric', month: 'short', day: '2-digit', 
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
        
        if (selectedOrder && selectedOrder.id === id) {
            setSelectedOrder({ ...selectedOrder, status });
        }
        load();
    };

    const handlePay = async (order: any) => {
        // Here you would trigger the payment logic or open a payment modal.
        // For simplicity, we just mark it as paid.
        if (confirm(t('هل تريد تأكيد دفع هذا الطلب بالكامل؟'))) {
            // Update order paidAmount via API (this needs an endpoint, but we simulate it here by changing status to delivered if we want or just closing payment)
            alert('يتم تحويلك لشاشة الدفع...');
        }
    };

    const handlePrint = (orderData: any) => {
        const lines = orderData.lines || [];
        const finalDiscount = orderData.discount || 0;
        const finalTotal = orderData.total || 0;
        
        const html = `
            <html dir="rtl">
            <head>
                <title>فاتورة كاشير</title>
                <style>
                    body { font-family: sans-serif; width: 300px; margin: 0 auto; padding: 20px; font-size: 14px; }
                    .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                    .line { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .total { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; font-weight: bold; font-size: 16px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>فاتورة مطعم</h2>
                    <p>الطلب رقم: ${orderData.invoice?.invoiceNumber ? `#${orderData.invoice.invoiceNumber}` : `#${orderData.orderNumber}`}</p>
                    <p>نوع الطلب: ${TYPE_LABELS[orderData.type] ?? orderData.type}</p>
                    <p>التاريخ: ${new Date(orderData.createdAt || Date.now()).toLocaleString('ar-EG')}</p>
                </div>
                <div class="items">
                    ${lines.map((l: any) => {
                        let mods = '';
                        if (l.modifiers) {
                            try {
                                const parsed = typeof l.modifiers === 'string' ? JSON.parse(l.modifiers) : l.modifiers;
                                mods = Object.values(parsed).flat().map((m: any) => `
                                    <div class="line" style="font-size: 12px; color: #555;">
                                        <span>- ${m.name}</span>
                                        <span>${m.price || 0}</span>
                                    </div>
                                `).join('');
                            } catch(e) {}
                        }
                        return `
                            <div class="line">
                                <span>${l.itemName || 'صنف'} (x${l.quantity})</span>
                                <span>${l.total || (Number(l.price) * l.quantity)}</span>
                            </div>
                            ${mods}
                        `;
                    }).join('')}
                </div>
                <div class="total">
                    ${finalDiscount > 0 ? `<div class="line"><span>خصم:</span><span>${finalDiscount}</span></div>` : ''}
                    ${orderData.serviceAmount > 0 ? `<div class="line"><span>رسوم الخدمة:</span><span>${orderData.serviceAmount}</span></div>` : ''}
                    ${orderData.taxAmount > 0 ? `<div class="line"><span>الضريبة:</span><span>${orderData.taxAmount}</span></div>` : ''}
                    <div class="line"><span>الإجمالي:</span><span>${finalTotal}</span></div>
                </div>
                <div class="footer">
                    <p>شكراً لزيارتكم!</p>
                </div>
            </body>
            </html>
        `;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '-10000px';
        iframe.style.bottom = '-10000px';
        document.body.appendChild(iframe);
        
        iframe.contentDocument?.open();
        iframe.contentDocument?.write(html);
        iframe.contentDocument?.close();
        
        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 500);
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
                    title={t('الطلبات')}
                    subtitle={t('عرض وتتبع جميع الطلبات')}
                    icon={History}
                    actions={[]}
                />

                {/* Filters & Search */}
                <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[{ value: '', label: 'كل الحالات' }, ...Object.entries(STATUS_INFO).map(([v, s]) => ({ value: v, label: s.label }))].map(s => (
                            <button key={s.value} onClick={() => setFilterStatus(s.value)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${filterStatus === s.value ? C.primary : C.border}`, background: filterStatus === s.value ? `${C.primary}12` : C.card, color: filterStatus === s.value ? C.primary : C.textSecondary, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                    
                    <div style={{ position: 'relative', width: '280px' }}>
                        <Search size={16} color={C.textMuted} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isRtl ? 'right' : 'left']: '14px' }} />
                        <input 
                            type="text" 
                            placeholder={t("بحث...")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ 
                                ...IS, width: '100%', height: '40px', padding: isRtl ? '0 40px 0 14px' : '0 14px 0 40px',
                                borderRadius: '8px', border: `1px solid ${C.border}`, background: C.card,
                                color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO
                            }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textMuted }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                            <table style={TABLE_STYLE.table}>
                            <thead style={TABLE_STYLE.thead}>
                                <tr>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: isRtl ? 'right' : 'left' }}>فاتورة</th>
                                    <th style={TABLE_STYLE.th(false)}>العملاء</th>
                                    <th style={TABLE_STYLE.th(false)}>نوع الخدمة</th>
                                    <th style={TABLE_STYLE.th(false)}>الكاشير</th>
                                    <th style={TABLE_STYLE.th(false)}>المجموع</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>المدفوعات</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>حالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: C.textMuted }}>
                                            <History size={40} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
                                            {t("لا توجد طلبات")}
                                        </td>
                                    </tr>
                                )}
                                {filteredOrders.map((order, i) => {
                                    const st = STATUS_INFO[order.status] ?? STATUS_INFO.pending;
                                    const isPaid = order.paidAmount >= order.total && order.total > 0;
                                    
                                    return (
                                        <tr key={order.id} 
                                            onClick={() => setSelectedOrder(order)} 
                                            style={{ ...TABLE_STYLE.row(i === filteredOrders.length - 1), cursor: 'pointer' }} 
                                            onMouseEnter={e => e.currentTarget.style.background = C.hover} 
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                    <span style={{ fontWeight: 800, fontFamily: OUTFIT, color: C.primary, fontSize: '14px' }}>
                                                        {order.invoice?.invoiceNumber ? `#${order.invoice.invoiceNumber.toString().padStart(4, '0')}` : `#${order.orderNumber.toString().padStart(4, '0')}`}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: OUTFIT }}>{formatDate(order.createdAt)}</span>
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', color: C.textPrimary, fontWeight: 700 }}>
                                                {order.customer?.name || 'عميل عام'}
                                                {order.customer?.phone && <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: OUTFIT, fontWeight: 600, display: 'inline-block', marginInlineStart: '6px' }}>{order.customer.phone}</span>}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {order.type === 'dine-in' ? <Utensils size={14} color={C.textPrimary} /> : order.type === 'takeaway' ? <ShoppingBag size={14} color={C.textPrimary} /> : order.type === 'delivery' ? <Truck size={14} color={C.textPrimary} /> : <Globe size={14} color={C.textPrimary} />}
                                                    {TYPE_LABELS[order.type] ?? order.type}
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>
                                                {order.shift?.user?.name || '-'}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, fontWeight: 700, fontSize: '14px', color: C.textPrimary }}>
                                                {fMoney(order.total)}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: C.textSecondary }}>
                                                    {isPaid ? 'مدفوع' : 'غير مدفوع'} 
                                                    {isPaid ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                                                </span>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: `1px solid ${st.color}50`, background: C.card, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, color: st.color }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.color }}></span> {st.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Modal for Order Details */}
                <AppModal 
                    show={!!selectedOrder} 
                    onClose={() => setSelectedOrder(null)} 
                    title={selectedOrder ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: OUTFIT, lineHeight: 1 }}>
                                {selectedOrder.invoice?.invoiceNumber ? `#${selectedOrder.invoice.invoiceNumber.toString().padStart(4, '0')}` : `#${selectedOrder.orderNumber.toString().padStart(4, '0')}`}
                            </span>
                            <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: OUTFIT, marginTop: '4px', fontWeight: 600 }}>
                                {formatDate(selectedOrder.createdAt)}
                            </span>
                        </div>
                    ) : ''}
                    maxWidth="800px"
                    headerActions={null}
                >
                    {selectedOrder && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* Action Badges in Modal Header */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' }}>
                                {selectedOrder.status === 'preparing' && <span style={{ padding: '6px 12px', border: '1px solid #fcd34d', background: '#fffbeb', color: '#f59e0b', borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></span> معالجة</span>}
                                {selectedOrder.status === 'ready' && <span style={{ padding: '6px 12px', border: '1px solid #93c5fd', background: '#eff6ff', color: '#3b82f6', borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></span> جاهز</span>}

                                <div style={{ flex: 1 }}></div>

                                <button onClick={() => {
                                    handlePrint(selectedOrder);
                                }} style={{ width: '32px', height: '32px', background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Printer size={16} />
                                </button>
                            </div>

                            {/* Order Info Grid */}
                            <div style={{ padding: '0 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
                                <div>
                                    <p style={{ margin: '0 0 6px', fontSize: '13px', color: C.textPrimary, fontWeight: 700 }}>نوع الخدمة</p>
                                    <p style={{ margin: 0, fontSize: '14px', color: C.textSecondary, fontWeight: 600 }}>{TYPE_LABELS[selectedOrder.type] ?? selectedOrder.type}</p>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 6px', fontSize: '13px', color: C.textPrimary, fontWeight: 700 }}>الكاشير</p>
                                    <p style={{ margin: 0, fontSize: '14px', color: C.textSecondary, fontWeight: 600 }}>{selectedOrder.shift?.user?.name || '-'}</p>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 6px', fontSize: '13px', color: C.textPrimary, fontWeight: 700 }}>المجموع</p>
                                    <p style={{ margin: 0, fontSize: '14px', color: C.textSecondary, fontFamily: OUTFIT }}>{fMoney(selectedOrder.total)}</p>
                                </div>
                            </div>

                            {/* Order Items List */}
                            <div style={{ padding: '0 0' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 800, color: C.textPrimary, margin: '0 0 12px' }}>عناصر الطلب</h3>
                                <div style={{ border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {selectedOrder.lines?.map((line: any) => (
                                        <div key={line.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: C.bg, borderRadius: '8px', border: `1px solid ${C.border}` }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary }}>{line.itemName}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                                                <span style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 700, fontFamily: OUTFIT }}>x {line.quantity}</span>
                                                <span style={{ fontFamily: OUTFIT, fontWeight: 800, color: C.textPrimary, fontSize: '14px', minWidth: '80px', textAlign: isRtl ? 'left' : 'right' }}>{fMoney(line.total)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary */}
                            <div style={{ padding: '0 0' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 800, color: C.textPrimary, margin: '0 0 12px' }}>ملخص الطلب</h3>
                                <div style={{ background: C.bg, borderRadius: '12px', padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>
                                        <span>المجموع الفرعي</span>
                                        <span style={{ fontFamily: OUTFIT }}>{fMoney(selectedOrder.subtotal)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>
                                        <span>تخفيض</span>
                                        <span style={{ fontFamily: OUTFIT }}>{fMoney(selectedOrder.discount + selectedOrder.couponDiscount)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>
                                        <span>الخدمة</span>
                                        <span style={{ fontFamily: OUTFIT }}>{fMoney(selectedOrder.serviceAmount || 0)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>
                                        <span>ضريبة</span>
                                        <span style={{ fontFamily: OUTFIT }}>{fMoney(selectedOrder.taxAmount)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px', color: C.textPrimary, fontWeight: 800 }}>
                                        <span>المجموع</span>
                                        <span style={{ fontFamily: OUTFIT }}>{fMoney(selectedOrder.total)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px', color: C.textPrimary, fontWeight: 700 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>دفع</span>
                                            {selectedOrder.paidAmount >= selectedOrder.total && selectedOrder.total > 0 ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#d1fae5', color: '#059669', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontFamily: OUTFIT }}>Paid <CheckCircle2 size={12} /></span>
                                            ) : (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontFamily: OUTFIT }}>Unpaid <XCircle size={12} /></span>
                                            )}
                                        </div>
                                        <button style={{ background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary, borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>طريقة الدفع</button>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: C.textSecondary, fontWeight: 600 }}>
                                        <span>المتبقي</span>
                                        <span style={{ fontFamily: OUTFIT }}>{fMoney(Math.max(0, selectedOrder.total - selectedOrder.paidAmount))}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div style={{ padding: '16px 0 0', borderTop: `1px solid ${C.border}`, marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-start', flexWrap: 'wrap', alignItems: 'center' }}>
                                
                                <button style={{ padding: '10px 20px', background: C.card, border: `1px solid ${C.border}`, color: C.textPrimary, borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                    <RotateCcw size={16} /> إرجاع
                                </button>
                                
                                {selectedOrder.status !== 'cancelled' && (
                                    <button onClick={() => updateStatus(selectedOrder.id, 'cancelled')} style={{ padding: '10px 20px', background: '#ef4444', color: C.textPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                        <X size={16} /> إلغاء
                                    </button>
                                )}

                                <div style={{ flex: 1 }}></div>

                                {/* Order progression actions */}
                                {selectedOrder.status === 'pending' && (
                                    <button onClick={() => updateStatus(selectedOrder.id, 'preparing')} style={{ padding: '10px 24px', background: '#10b981', color: C.textPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                        <CheckCircle2 size={18} /> معالجة
                                    </button>
                                )}
                                
                                {selectedOrder.status === 'preparing' && (
                                    <button onClick={() => updateStatus(selectedOrder.id, 'ready')} style={{ padding: '10px 24px', background: '#3b82f6', color: C.textPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                        <CheckCircle2 size={18} /> جاهز
                                    </button>
                                )}
                                
                                {selectedOrder.status === 'ready' && (
                                    <button onClick={() => updateStatus(selectedOrder.id, 'delivered')} style={{ padding: '10px 24px', background: '#10b981', color: C.textPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                        <CheckCircle2 size={18} /> تم التسليم
                                    </button>
                                )}

                                {/* Pay action if unpaid */}
                                {selectedOrder.paidAmount < selectedOrder.total && selectedOrder.total > 0 && selectedOrder.status !== 'cancelled' && (
                                    <button onClick={() => handlePay(selectedOrder)} style={{ padding: '10px 24px', background: '#10b981', color: C.textPrimary, border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                        دفع
                                    </button>
                                )}

                                {(selectedOrder.status === 'delivered' && selectedOrder.paidAmount >= selectedOrder.total) && (
                                    <div style={{ padding: '10px 20px', background: C.bg, color: C.textSecondary, borderRadius: '8px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                        <Check size={16} /> مكتمل
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </AppModal>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
