'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import { C, CAIRO, OUTFIT, IS, TABLE_STYLE } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import { Loader2, Package, Truck, History, CheckCircle2, XCircle, TrendingUp, Globe, Printer, Search, FileText, Check, X, RotateCcw, AlertCircle, ShoppingBag, Utensils, ChevronDown } from 'lucide-react';
import { generateZatcaTLV } from '@/lib/printInvoices';

const TYPE_ICONS: Record<string, React.ReactNode> = {
    'dine-in': <Utensils size={14} />,
    'takeaway': <ShoppingBag size={14} />,
    'delivery': <Truck size={14} />,
    'online': <Globe size={14} />
};
const TYPE_LABELS: Record<string, string> = { 'dine-in': 'صالة', 'takeaway': 'تيك اوي', 'delivery': 'توصيل', 'online': 'أونلاين' };

const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'مكتمل', color: '#10b981', bg: '#dbeafe' }, // mapped to completed for old orders
    preparing: { label: 'تحت التحضير', color: '#8b5cf6', bg: '#ede9fe' },
    ready: { label: 'مكتمل', color: '#10b981', bg: '#dbeafe' },
    delivered: { label: 'مكتمل', color: '#10b981', bg: '#d1fae5' }, // fallback
    cancelled: { label: 'ألغيت', color: '#ef4444', bg: '#fee2e2' },
    returned: { label: 'مرتجع', color: '#ef4444', bg: '#fee2e2' },
};

export default function OrdersHistoryPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const { fMoneyJSX } = useCurrency();

    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [actionPrompt, setActionPrompt] = useState<{ type: 'cancel' | 'return' | 'pay' | null }>({ type: null });
    const [cancelReasonInput, setCancelReasonInput] = useState('');
    const [revertInventoryCheck, setRevertInventoryCheck] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            let url = `/api/restaurant/orders?limit=100`;
            if (filterStatus) url += `&status=${filterStatus}`;
            if (filterDate) url += `&date=${filterDate}`;
            const r = await fetch(url);
            setOrders(await r.json());
        } finally { setLoading(false); }
    }, [filterStatus, filterDate]);

    useEffect(() => { load(); }, [load]);

    // Use en-GB to enforce western arabic numerals (0-9) then replace am/pm
    const formatDate = (d: string) => {
        let str = new Date(d).toLocaleString('en-GB', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
        return str.replace('am', 'ص').replace('pm', 'م').replace('AM', 'ص').replace('PM', 'م');
    };

    const updateStatus = async (id: string, status: string, customReason?: string, doRevert?: boolean) => {
        setActionLoading(true);
        const updateData: any = { id, status, revertInventory: doRevert || false };
        if (customReason) {
            updateData.cancelReason = customReason;
        }

        try {
            const res = await fetch('/api/restaurant/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });
            if (!res.ok) {
                const data = await res.json();
                alert('حدث خطأ: ' + (data.error || 'غير معروف'));
                return;
            }

            if (selectedOrder && selectedOrder.id === id) {
                setSelectedOrder({
                    ...selectedOrder,
                    status,
                    notes: customReason ? (selectedOrder.notes ? `${selectedOrder.notes}\n[السبب: ${customReason}]` : `[السبب: ${customReason}]`) : selectedOrder.notes
                });
            }
            load();
            setActionPrompt({ type: null });
            setCancelReasonInput('');
        } catch (err: any) {
            alert('حدث خطأ في الاتصال: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePay = async (order: any) => {
        setActionLoading(true);
        try {
            const res = await fetch('/api/restaurant/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: order.id,
                    action: 'pay_and_close',
                    paymentMethod: 'cash'
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                alert('حدث خطأ أثناء الدفع: ' + (data.error || 'غير معروف'));
                return;
            }
            if (selectedOrder && selectedOrder.id === order.id) {
                setSelectedOrder({ ...selectedOrder, paidAmount: selectedOrder.total, status: 'ready' });
            }
            load();
            setActionPrompt({ type: null });
        } catch (err: any) {
            alert('حدث خطأ في الاتصال: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePrint = (orderData: any) => {
        const lines = orderData.lines || [];
        const finalDiscount = orderData.discount || 0;
        const finalTotal = orderData.total || 0;
        const subtotal = orderData.subtotal || 0;
        const taxAmount = orderData.taxAmount || 0;
        const paidAmount = orderData.paidAmount || finalTotal;
        const change = paidAmount > finalTotal ? paidAmount - finalTotal : 0;

        const formatMoney = (m: number) => Number(m).toFixed(2);

        const typeLabel = orderData.type === 'dine-in' ? 'صالة' :
            orderData.type === 'takeaway' ? 'تيك أواي' :
                orderData.type === 'delivery' ? 'توصيل' : 'أونلاين';

        // Use receiptFooter from restaurant settings, fall back to generic message
        const rs = typeof orderData.company?.restaurantSettings === 'string'
            ? JSON.parse(orderData.company.restaurantSettings)
            : (orderData.company?.restaurantSettings || {});
        const customFooter = rs?.receiptFooter || '';
        const footerHtml = customFooter
            ? customFooter.split('\n').map((line: string) => `<p>${line}</p>`).join('')
            : '<p>شكراً لزيارتكم ❤️</p>';

        const html = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>Receipt #${orderData.orderNumber}</title>
                <style>
                    @page { margin: 0; }
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        width: 280px; /* Perfect for 80mm printers */
                        margin: 0 auto;
                        padding: 10px 0;
                        font-size: 13px;
                        color: #000;
                        background: #fff;
                    }
                    .text-center { text-align: center; }
                    .dashed-line { 
                        border-top: 1px dashed #000; 
                        margin: 10px 0; 
                    }
                    .flex-between { 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-start;
                    }
                    .header h2 { margin: 5px 0; font-size: 18px; letter-spacing: 1px; display: flex; align-items: center; justify-content: center; gap: 8px; }
                    .header img { max-width: 40px; max-height: 40px; object-fit: contain; }
                    .header p { margin: 2px 0; font-size: 12px; }
                    .meta-table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 5px 0; }
                    .meta-table td { padding: 3px 0; vertical-align: top; }
                    .meta-table td:first-child { font-weight: bold; width: 95px; white-space: nowrap; }
                    .item { margin-top: 8px; }
                    .item-main { font-weight: bold; }
                    .modifier { 
                        font-size: 12px; 
                        padding-right: 20px; 
                        color: #333; 
                        margin-top: 2px; 
                    }
                    .totals { margin-top: 10px; }
                    .totals .flex-between { margin: 4px 0; }
                    .grand-total { font-weight: bold; font-size: 15px; margin: 6px 0; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header text-center">
                    ${orderData.company?.logo ? `
                    <div style="text-align: center; margin: 0; padding: 0;">
                        <img src="${orderData.company.logo}" alt="Logo" style="max-width: 140px; max-height: 140px; object-fit: contain; display: block; margin: 0 auto;"/>
                    </div>
                    ` : ''}
                    ${orderData.company?.phone ? `<p style="margin: 0 0 2px; font-weight: bold;">${orderData.company.phone}</p>` : ''}
                    ${[orderData.company?.addressCity, orderData.company?.addressRegion, orderData.company?.addressDistrict, orderData.company?.addressStreet].filter(Boolean).join('، ') ? `<p style="margin: 2px 0;">${[orderData.company?.addressCity, orderData.company?.addressRegion, orderData.company?.addressDistrict, orderData.company?.addressStreet].filter(Boolean).join('، ')}</p>` : ''}
                    ${orderData.company?.taxNumber ? `<p style="margin: 2px 0;">الرقم الضريبي: ${orderData.company.taxNumber}</p>` : ''}
                </div>
                
                <div class="dashed-line"></div>
                
                <table class="meta-table">
                    <tr><td>رقم الطلب</td><td>: ${orderData.orderNumber.toString().padStart(4, '0')}</td></tr>
                    ${orderData.type === 'dine-in' ? `
                    <tr><td>رقم الطاولة</td><td>: ${orderData.table?.name || '-'}</td></tr>
                    ${orderData.guests ? `<tr><td>عدد الأفراد</td><td>: ${orderData.guests}</td></tr>` : ''}
                    ` : ''}
                    ${orderData.type === 'takeaway' ? `
                    <tr><td>رقم الانتظار</td><td>: ${orderData.queueNumber || orderData.orderNumber.toString().padStart(4, '0')}</td></tr>
                    ` : ''}
                    <tr><td>التاريخ</td><td>: ${new Date(orderData.createdAt || Date.now()).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace('am', 'ص').replace('pm', 'م').replace('AM', 'ص').replace('PM', 'م')}</td></tr>
                    ${orderData.type !== 'delivery' ? `<tr><td>الكاشير</td><td>: ${orderData.shift?.user?.name || '-'}</td></tr>` : ''}
                </table>
                ${orderData.type === 'delivery' && orderData.customer ? `
                <div class="dashed-line"></div>
                <table class="meta-table">
                    <tr><td>اسم العميل</td><td>: ${orderData.customer?.name || '-'}</td></tr>
                    <tr><td>رقم الهاتف</td><td>: ${orderData.customer?.phone || '-'}</td></tr>
                    ${orderData.customer?.address ? `<tr><td>العنوان</td><td>: ${orderData.customer?.address}</td></tr>` : ''}
                    ${orderData.deliveryAgent ? `<tr><td>المندوب</td><td>: ${orderData.deliveryAgent?.name}</td></tr>` : ''}
                </table>
                ` : ''}

                <div class="dashed-line"></div>

                <div class="items">
                    ${lines.map((l: any) => {
            let mods = '';
            if (l.modifiers) {
                try {
                    const parsed = typeof l.modifiers === 'string' ? JSON.parse(l.modifiers) : l.modifiers;
                    mods = Object.values(parsed).flat().map((m: any) => `
                                    <div class="flex-between modifier">
                                        <span>&nbsp;&nbsp;&nbsp;+ ${m.name}</span>
                                        <span>${formatMoney(m.price || 0)}</span>
                                    </div>
                                `).join('');
                } catch (e) { }
            }
            const parsedTotal = Number(l.total);
            const rowTotal = !isNaN(parsedTotal) && parsedTotal !== 0 ? parsedTotal : (Number(l.unitPrice || l.price || 0) * Number(l.quantity || 1));
            return `
                            <div class="item">
                                <div class="flex-between item-main">
                                    <span style="flex: 1; padding-left: 10px;">${l.itemName || 'صنف'} x${l.quantity}</span>
                                    <span>${formatMoney(rowTotal)}</span>
                                </div>
                                ${mods}
                            </div>
                        `;
        }).join('')}
                </div>

                <div class="dashed-line"></div>

                <div class="totals">
                    <div class="flex-between">
                        <span>الإجمالي الفرعي</span>
                        <span>${formatMoney(subtotal)}</span>
                    </div>
                    ${finalDiscount > 0 ? `
                    <div class="flex-between">
                        <span>خصم</span>
                        <span>${formatMoney(finalDiscount)}</span>
                    </div>` : ''}
                    ${(() => {
                if (orderData.serviceAmount > 0) {
                    let rate = '';
                    try {
                        const rs = typeof orderData.company?.restaurantSettings === 'string' ? JSON.parse(orderData.company.restaurantSettings) : orderData.company?.restaurantSettings;
                        if (rs && rs.serviceCharge && rs.serviceCharge.rate) rate = ` (${rs.serviceCharge.rate}%)`;
                    } catch (e) { }
                    return `
                            <div class="flex-between">
                                <span>رسوم الخدمة${rate}</span>
                                <span>${formatMoney(orderData.serviceAmount)}</span>
                            </div>`;
                }
                return '';
            })()}
                    ${(() => {
                if (taxAmount > 0) {
                    let rate = '';
                    try {
                        const ts = typeof orderData.company?.taxSettings === 'string' ? JSON.parse(orderData.company.taxSettings) : orderData.company?.taxSettings;
                        if (ts && ts.rate) rate = ` (${ts.rate}%)`;
                    } catch (e) { }
                    return `
                            <div class="flex-between">
                                <span>ضريبة القيمة المضافة${rate}</span>
                                <span>${formatMoney(taxAmount)}</span>
                            </div>`;
                }
                return '';
            })()}
                </div>

                <div class="dashed-line"></div>

                <div class="totals">
                    <div class="flex-between grand-total">
                        <span>الإجمالي</span>
                        <span>${formatMoney(finalTotal)}</span>
                    </div>
                    ${(() => {
                const paidAmount = Number(orderData.paidAmount || 0);
                const methodStr = { 'cash': 'نقدي', 'card': 'شبكة', 'mixed': 'مختلط', 'bank': 'تحويل بنكي' }[orderData.paymentMethod as string] || orderData.paymentMethod || 'نقدي';
                if (orderData.type === 'delivery') {
                    if (paidAmount === 0) {
                        return `
                                <div class="flex-between" style="font-size: 14px; margin-top: 6px;">
                                    <span>طريقة الدفع</span>
                                    <span>الدفع عند الاستلام</span>
                                </div>`;
                    }
                    return `
                                <div class="flex-between" style="font-size: 14px; margin-top: 6px;">
                                    <span>المدفوع (${methodStr})</span>
                                    <span>${formatMoney(paidAmount)}</span>
                                </div>
                                <div class="flex-between" style="font-size: 14px; margin-top: 4px;">
                                    <span>المتبقي</span>
                                    <span>${formatMoney(Math.max(0, finalTotal - paidAmount))}</span>
                                </div>`;
                } else {
                    if (paidAmount > 0) {
                        return `
                                <div class="flex-between" style="font-size: 14px; margin-top: 6px;">
                                    <span>المدفوع (${methodStr})</span>
                                    <span>${formatMoney(paidAmount)}</span>
                                </div>
                                <div class="flex-between" style="font-size: 14px; margin-top: 4px;">
                                    <span>المتبقي</span>
                                    <span>${formatMoney(Math.max(0, finalTotal - paidAmount))}</span>
                                </div>`;
                    }
                    return '';
                }
            })()}
                </div>

                <div class="dashed-line"></div>
                
                <div class="footer">
                    ${footerHtml}
                </div>

                ${orderData.company?.countryCode === 'SA' ? `
                <div style="text-align: center; margin-top: 15px;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(generateZatcaTLV(
                orderData.company.name || '',
                orderData.company.taxNumber || '000000000000000',
                new Date(orderData.createdAt || Date.now()).toISOString(),
                finalTotal.toFixed(2),
                orderData.taxAmount ? Number(orderData.taxAmount).toFixed(2) : '0.00'
            ))}" style="width: 120px; height: 120px; display: inline-block;" alt="ZATCA QR" />
                </div>
                ` : ''}
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
        const num = (o.orderNumber).toString();
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
                <div className="filter-bar" style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="filter-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input 
                            type="date" 
                            value={filterDate} 
                            onChange={(e) => setFilterDate(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}
                        />
                        {[{ value: '', label: 'كل الحالات' }, { value: 'preparing', label: 'تحت التحضير' }, { value: 'ready', label: 'مكتمل' }, { value: 'cancelled', label: 'ألغيت' }].map(s => (
                            <button key={s.value} onClick={() => setFilterStatus(s.value)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${filterStatus === s.value ? C.primary : C.border}`, background: filterStatus === s.value ? `${C.primary}12` : C.card, color: filterStatus === s.value ? C.primary : C.textSecondary, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <div className="mobile-full" style={{ position: 'relative', width: '280px' }}>
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
                                                        {`#${order.orderNumber.toString().padStart(4, '0')}`}
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
                                                {fMoneyJSX(order.total)}
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
                                {`#${selectedOrder.orderNumber.toString().padStart(4, '0')}`}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                            {/* Action Badges in Modal Header */}
                            <div className="filter-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px', alignItems: 'center' }}>
                                {selectedOrder.status && STATUS_INFO[selectedOrder.status] && (
                                    <span style={{
                                        padding: '6px 14px',
                                        background: `${STATUS_INFO[selectedOrder.status].color}15`,
                                        color: STATUS_INFO[selectedOrder.status].color,
                                        border: `1px solid ${STATUS_INFO[selectedOrder.status].color}30`,
                                        borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                        fontFamily: CAIRO
                                    }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_INFO[selectedOrder.status].color, boxShadow: `0 0 8px ${STATUS_INFO[selectedOrder.status].color}` }}></span>
                                        {STATUS_INFO[selectedOrder.status].label}
                                    </span>
                                )}

                                <div style={{ flex: 1 }}></div>

                                <button onClick={() => handlePrint(selectedOrder)}
                                    style={{
                                        width: '36px', height: '36px', background: C.primary,
                                        border: 'none', color: '#fff',
                                        borderRadius: '10px', cursor: 'pointer', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                                        boxShadow: `0 4px 12px ${C.primary}40`
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                >
                                    <Printer size={18} />
                                </button>
                            </div>

                            {/* Order Info Grid */}
                            <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px' }}>
                                <div>
                                    <p style={{ margin: '0 0 4px', fontSize: '11px', color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>نوع الخدمة</p>
                                    <p style={{ margin: 0, fontSize: '13px', color: C.textPrimary, fontWeight: 700 }}>{TYPE_LABELS[selectedOrder.type] ?? selectedOrder.type}</p>
                                </div>
                                <div style={{ borderInlineStart: `1px solid ${C.border}`, borderInlineEnd: `1px solid ${C.border}` }}>
                                    <p style={{ margin: '0 0 4px', fontSize: '11px', color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>الكاشير</p>
                                    <p style={{ margin: 0, fontSize: '13px', color: C.textPrimary, fontWeight: 700 }}>{selectedOrder.shift?.user?.name || '-'}</p>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 4px', fontSize: '11px', color: C.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>المجموع</p>
                                    <p style={{ margin: 0, fontSize: '14px', color: C.primary, fontFamily: OUTFIT, fontWeight: 800 }}>{fMoneyJSX(selectedOrder.total)}</p>
                                </div>
                            </div>

                            {/* Notes Display */}
                            {selectedOrder.notes && (
                                <div style={{ padding: '10px 14px', background: `${C.danger}15`, border: `1px dashed ${C.danger}40`, borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <AlertCircle size={16} color={C.danger} style={{ marginTop: '2px' }} />
                                    <p style={{ margin: 0, fontSize: '13px', color: C.danger, fontWeight: 700, whiteSpace: 'pre-wrap' }}>{selectedOrder.notes}</p>
                                </div>
                            )}

                            {/* Order Items List */}
                            <div>
                                <h3 style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ShoppingBag size={14} color={C.primary} /> عناصر الطلب
                                </h3>
                                <div className="custom-scrollbar" style={{ border: `1px solid ${C.border}`, borderRadius: '12px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.01)', maxHeight: '160px', overflowY: 'auto' }}>
                                    {selectedOrder.lines?.map((line: any) => (
                                        <div key={line.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: C.card, borderRadius: '8px', border: `1px solid ${C.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>{line.itemName}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <span style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 700, fontFamily: OUTFIT, background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '4px' }}>x {line.quantity}</span>
                                                <span style={{ fontFamily: OUTFIT, fontWeight: 800, color: C.textPrimary, fontSize: '13px', minWidth: '70px', textAlign: isRtl ? 'left' : 'right' }}>{fMoneyJSX(line.total)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary */}
                            <div>
                                <h3 style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={14} color={C.primary} /> ملخص الطلب
                                </h3>
                                <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '12px 16px', border: `1px solid ${C.border}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>
                                        <span>المجموع الفرعي</span>
                                        <span style={{ fontFamily: OUTFIT, color: C.textPrimary }}>{fMoneyJSX(selectedOrder.subtotal)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>
                                        <span>تخفيض</span>
                                        <span style={{ fontFamily: OUTFIT, color: C.textPrimary }}>{fMoneyJSX(selectedOrder.discount + selectedOrder.couponDiscount)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>
                                        <span>الخدمة</span>
                                        <span style={{ fontFamily: OUTFIT, color: C.textPrimary }}>{fMoneyJSX(selectedOrder.serviceAmount || 0)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>
                                        <span>ضريبة</span>
                                        <span style={{ fontFamily: OUTFIT, color: C.textPrimary }}>{fMoneyJSX(selectedOrder.taxAmount)}</span>
                                    </div>
                                    <div style={{ height: '1px', background: C.border, margin: '8px 0' }}></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: C.textPrimary, fontWeight: 800 }}>
                                        <span>المجموع</span>
                                        <span style={{ fontFamily: OUTFIT, color: C.primary }}>{fMoneyJSX(selectedOrder.total)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '12px', color: C.textPrimary, fontWeight: 700 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>دفع</span>
                                            {selectedOrder.paidAmount >= selectedOrder.total && selectedOrder.total > 0 ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: `${C.success}15`, color: C.success, border: `1px solid ${C.success}30`, padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontFamily: CAIRO, fontWeight: 800 }}>
                                                    <CheckCircle2 size={12} /> {selectedOrder.paymentMethod === 'cash' ? 'نقدي' : selectedOrder.paymentMethod === 'card' ? 'بطاقة' : selectedOrder.paymentMethod === 'mixed' ? 'متعدد' : 'غير محدد'}
                                                </span>
                                            ) : (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: `${C.danger}15`, color: C.danger, border: `1px solid ${C.danger}30`, padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontFamily: CAIRO, fontWeight: 800 }}>
                                                    <XCircle size={12} /> {selectedOrder.paymentMethod === 'cash' ? 'نقدي' : selectedOrder.paymentMethod === 'card' ? 'بطاقة' : selectedOrder.paymentMethod === 'mixed' ? 'متعدد' : 'غير محدد'}
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ fontFamily: OUTFIT, color: C.textPrimary, fontSize: '13px' }}>{fMoneyJSX(selectedOrder.paidAmount)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: C.textSecondary, fontWeight: 700, marginTop: '4px' }}>
                                        <span>المتبقي</span>
                                        <span style={{ fontFamily: OUTFIT, color: C.textPrimary }}>{fMoneyJSX(Math.max(0, selectedOrder.total - selectedOrder.paidAmount))}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div style={{ padding: '12px 0 0', borderTop: `1px solid ${C.border}`, marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                                {actionPrompt.type ? (
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px', border: `1px solid ${C.border}`, width: '100%' }}>
                                        {actionPrompt.type === 'pay' ? (
                                            <>
                                                <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: C.textPrimary, fontFamily: CAIRO }}>هل أنت متأكد من دفع المبلغ المتبقي نقداً؟</h4>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => handlePay(selectedOrder)} disabled={actionLoading} style={{ flex: 1, padding: '10px', background: C.success, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer', opacity: actionLoading ? 0.7 : 1 }}>
                                                        {actionLoading ? 'جاري الدفع...' : 'تأكيد الدفع'}
                                                    </button>
                                                    <button onClick={() => setActionPrompt({ type: null })} disabled={actionLoading} style={{ flex: 1, padding: '10px', background: 'transparent', color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: '8px', fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>تراجع</button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: actionPrompt.type === 'cancel' ? C.danger : C.primary, fontFamily: CAIRO }}>
                                                    {actionPrompt.type === 'cancel' ? 'إلغاء الطلب' : 'إرجاع الطلب'}
                                                </h4>
                                                <input
                                                    type="text"
                                                    placeholder="اكتب السبب هنا..."
                                                    value={cancelReasonInput}
                                                    onChange={e => setCancelReasonInput(e.target.value)}
                                                    style={{ width: '100%', padding: '10px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.textPrimary, marginBottom: '10px', fontFamily: CAIRO, fontSize: '13px' }}
                                                />
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO, cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={revertInventoryCheck} onChange={e => setRevertInventoryCheck(e.target.checked)} />
                                                    إرجاع المكونات إلى المخزن (إلغاء الاستهلاك)
                                                </label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => updateStatus(selectedOrder.id, actionPrompt.type === 'cancel' ? 'cancelled' : 'returned', cancelReasonInput, revertInventoryCheck)}
                                                        disabled={actionLoading || !cancelReasonInput.trim()}
                                                        style={{ flex: 1, padding: '10px', background: actionPrompt.type === 'cancel' ? C.danger : C.primary, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontFamily: CAIRO, cursor: cancelReasonInput.trim() ? 'pointer' : 'not-allowed', opacity: (actionLoading || !cancelReasonInput.trim()) ? 0.7 : 1 }}
                                                    >
                                                        {actionLoading ? 'جاري التنفيذ...' : 'تأكيد'}
                                                    </button>
                                                    <button onClick={() => setActionPrompt({ type: null })} disabled={actionLoading} style={{ flex: 1, padding: '10px', background: 'transparent', color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: '8px', fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>تراجع</button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start', flexWrap: 'wrap', width: '100%', alignItems: 'center' }}>
                                        {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'returned' && (
                                            <>
                                                <button onClick={() => { setActionPrompt({ type: 'return' }); setCancelReasonInput(''); }} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: C.textPrimary, borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                                                    <RotateCcw size={14} /> إرجاع
                                                </button>

                                                <button onClick={() => { setActionPrompt({ type: 'cancel' }); setCancelReasonInput(''); }} style={{ padding: '6px 14px', background: `${C.danger}15`, color: C.danger, border: `1px solid ${C.danger}30`, borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = `${C.danger}25`} onMouseLeave={e => e.currentTarget.style.background = `${C.danger}15`}>
                                                    <X size={14} /> إلغاء
                                                </button>
                                            </>
                                        )}

                                        {/* Order progression actions */}
                                        {selectedOrder.status === 'preparing' && (
                                            <button onClick={() => updateStatus(selectedOrder.id, 'ready')} style={{ padding: '6px 14px', background: `${C.success}20`, color: C.success, border: `1px solid ${C.success}40`, borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = `${C.success}30`} onMouseLeave={e => e.currentTarget.style.background = `${C.success}20`}>
                                                <CheckCircle2 size={14} /> جاهز
                                            </button>
                                        )}

                                        {/* Pay action if unpaid */}
                                        {selectedOrder.paidAmount < selectedOrder.total && selectedOrder.total > 0 && selectedOrder.status !== 'cancelled' && (
                                            <button onClick={() => setActionPrompt({ type: 'pay' })} style={{ padding: '6px 14px', background: C.success, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO, boxShadow: `0 2px 8px ${C.success}40`, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                                دفع
                                            </button>
                                        )}

                                        {(selectedOrder.status === 'ready' && selectedOrder.paidAmount >= selectedOrder.total) && (
                                            <div style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.03)', color: C.textSecondary, borderRadius: '8px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO, border: `1px solid ${C.border}` }}>
                                                <Check size={14} /> مكتمل
                                            </div>
                                        )}
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
