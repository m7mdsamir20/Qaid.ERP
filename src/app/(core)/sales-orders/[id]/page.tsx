'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import ContentSkeleton from '@/components/ContentSkeleton';
import AppModal from '@/components/AppModal';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { formatNumber } from '@/lib/currency';
import {
    C, CAIRO, OUTFIT, IS, LS, SC, STitle, focusIn, focusOut,
} from '@/constants/theme';
import {
    ShoppingBag, CheckCircle, X, Truck, Receipt, Trash2, Info, Package,
    Loader2, FileText, Edit, Printer, FileDown
} from 'lucide-react';
import { printSalesOrderDirectly, downloadSalesOrderPDF } from '@/lib/printDirectly';

interface SalesOrderLine {
    id: string;
    itemId: string;
    description?: string;
    quantity: number;
    deliveredQty: number;
    invoicedQty: number;
    price: number;
    discount: number;
    total: number;
    unit?: string;
    item: { id: string; name: string; unit?: { name: string }; stocks?: any[] };
}

interface SalesOrder {
    id: string;
    orderNumber: number;
    date: string;
    expectedDeliveryDate?: string;
    status: string;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discount: number;
    total: number;
    notes?: string;
    approvedBy?: string;
    approvedAt?: string;
    customer?: { id: string; name: string; phone?: string };
    warehouse?: { id: string; name: string };
    project?: { id: string; name: string };
    lines: SalesOrderLine[];
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    draft:               { label: 'مسودة',         color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
    approved:            { label: 'معتمد',          color: '#256af4', bg: 'rgba(37,106,244,0.1)'  },
    processing:          { label: 'قيد التنفيذ',   color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
    partially_delivered: { label: 'تسليم جزئي',    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
    delivered:           { label: 'مُسلَّم',         color: '#4ade80', bg: 'rgba(74,222,128,0.1)'  },
    invoiced:            { label: 'مُفوتَر',         color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    cancelled:           { label: 'ملغى',           color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
};

export default function SalesOrderDetailPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const params = useParams();
    const { data: session } = useSession();
    const { fMoneyJSX } = useCurrency();

    const [order, setOrder] = useState<SalesOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [downloading, setDownloading] = useState(false);

    const handlePrint = () => {
        if (!order) return;
        printSalesOrderDirectly(order.id);
    };

    const handleDownloadPDF = async () => {
        if (!order) return;
        setDownloading(true);
        try {
            await downloadSalesOrderPDF(order.id);
        } catch (err: any) {
            alert(t('فشل تحميل PDF') + ': ' + (err?.message || ''));
        } finally {
            setDownloading(false);
        }
    };

    // Delivery modal
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [deliveryQtys, setDeliveryQtys] = useState<Record<string, number>>({});
    const [deliveryError, setDeliveryError] = useState('');
    const [deliveryLoading, setDeliveryLoading] = useState(false);
    const [stockMap, setStockMap] = useState<Record<string, number>>({});

    // Delete confirm
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const fetchOrder = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/sales-orders/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setOrder(data);
            } else {
                setOrder(null);
            }
        } catch {
            setOrder(null);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    // Prepare delivery modal
    const openDeliveryModal = () => {
        if (!order) return;
        const initQtys: Record<string, number> = {};
        const stocks: Record<string, number> = {};
        order.lines.forEach(l => {
            const remaining = Math.max(0, l.quantity - l.deliveredQty);
            initQtys[l.id] = remaining;
            // Get available stock from item stocks
            const warehouseStock = l.item.stocks?.find((s: any) => s.warehouseId === order.warehouse?.id)?.quantity || 0;
            stocks[l.id] = warehouseStock;
        });
        setDeliveryQtys(initQtys);
        setStockMap(stocks);
        setDeliveryError('');
        setShowDeliveryModal(true);
    };

    const handleAction = async (action: string) => {
        if (!order) return;
        setErrorMsg('');
        setActionLoading(true);
        try {
            const res = await fetch(`/api/sales-orders/${order.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            if (!res.ok) {
                const err = await res.json();
                setErrorMsg(err.error || t('حدث خطأ'));
                return;
            }
            await fetchOrder();
        } catch {
            setErrorMsg(t('حدث خطأ في الاتصال'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!order) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/sales-orders/${order.id}`, { method: 'DELETE' });
            if (res.ok) {
                router.push('/sales-orders');
            } else {
                const err = await res.json();
                setErrorMsg(err.error || t('فشل في الحذف'));
            }
        } catch {
            setErrorMsg(t('حدث خطأ في الاتصال'));
        } finally {
            setActionLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleDeliverySubmit = async () => {
        if (!order) return;
        setDeliveryError('');
        setDeliveryLoading(true);
        try {
            const lines = order.lines
                .map(l => ({ lineId: l.id, deliveredQty: deliveryQtys[l.id] || 0 }))
                .filter(dl => dl.deliveredQty > 0);

            if (lines.length === 0) {
                setDeliveryError(t('يرجى إدخال كميات التسليم'));
                return;
            }

            const res = await fetch(`/api/sales-orders/${order.id}/deliver`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lines }),
            });

            if (!res.ok) {
                const err = await res.json();
                setDeliveryError(err.error || t('حدث خطأ'));
                return;
            }

            setShowDeliveryModal(false);
            await fetchOrder();
        } catch {
            setDeliveryError(t('حدث خطأ في الاتصال'));
        } finally {
            setDeliveryLoading(false);
        }
    };

    const fmt = (n: number) => formatNumber(Number(n || 0));

    if (loading) {
        return <DashboardLayout><ContentSkeleton /></DashboardLayout>;
    }

    if (!order) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', textAlign: 'center' }}>
                    <X size={48} style={{ color: C.danger, opacity: 0.3, marginBottom: '16px' }} />
                    <p style={{ color: C.textSecondary, fontFamily: CAIRO }}>{t('أمر البيع غير موجود')}</p>
                    <button onClick={() => router.push('/sales-orders')} style={{ marginTop: '16px', padding: '8px 20px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: CAIRO }}>
                        {t('العودة للقائمة')}
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const soCode = `SO-${String(order.orderNumber).padStart(5, '0')}`;
    const st = STATUS_MAP[order.status] || STATUS_MAP.draft;
    const canApprove = order.status === 'draft';
    const canCancel = !['delivered', 'invoiced', 'cancelled'].includes(order.status);
    const canDelete = order.status === 'draft';
    const canDeliver = ['approved', 'partially_delivered', 'processing'].includes(order.status);
    const canInvoice = order.status === 'delivered';

    const totalQty = order.lines.reduce((s, l) => s + l.quantity, 0);
    const totalDelivered = order.lines.reduce((s, l) => s + l.deliveredQty, 0);
    const deliveryPct = totalQty > 0 ? Math.round((totalDelivered / totalQty) * 100) : 0;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', fontFamily: CAIRO }}>
                <PageHeader
                    title={soCode}
                    subtitle={t('تفاصيل أمر البيع')}
                    icon={ShoppingBag}
                    backUrl="/sales-orders"
                    actions={[
                        <button
                            key="download-pdf"
                            onClick={handleDownloadPDF}
                            disabled={downloading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                height: '42px',
                                padding: '0 20px',
                                borderRadius: '12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: downloading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s',
                                fontFamily: CAIRO,
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={e => {
                                if (!downloading) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                            }}
                            onMouseLeave={e => {
                                if (!downloading) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            }}
                        >
                            {downloading ? (
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <FileDown size={18} />
                            )}
                            {t('تحميل PDF')}
                        </button>
                    ]}
                    primaryButton={{
                        label: t('طباعة أمر البيع'),
                        onClick: handlePrint,
                        icon: Printer
                    }}
                />

                {/* Error */}
                {errorMsg && (
                    <div style={{ marginBottom: '12px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, color: C.danger, fontSize: '13px', fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <X size={14} /> {errorMsg}
                        <button onClick={() => setErrorMsg('')} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: C.danger, cursor: 'pointer' }}>
                            <X size={14} />
                        </button>
                    </div>
                )}

                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px', alignItems: 'start' }}>

                    {/* Left: Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                        {/* Status Bar */}
                        <div style={{
                            background: st.bg, padding: '14px 20px', borderRadius: '14px',
                            border: `1px solid ${st.color}33`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: st.color }} />
                                <span style={{ color: st.color, fontWeight: 700, fontSize: '14px' }}>{st.label}</span>
                            </div>
                            {deliveryPct > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '80px', height: '5px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px' }}>
                                        <div style={{ width: `${deliveryPct}%`, height: '100%', background: deliveryPct === 100 ? C.success : '#fbbf24', borderRadius: '3px' }} />
                                    </div>
                                    <span style={{ fontFamily: OUTFIT, fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>
                                        {deliveryPct}% {t('مُسلَّم')}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Info Card */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: C.primary }}><Info size={12} /> {t('معلومات الأمر')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '32px' }}>
                                <div>
                                    <label style={LS}>{t('معلومات العميل')}</label>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: C.textPrimary, marginBottom: '4px' }}>
                                        {order.customer?.name || t('عميل نقدي')}
                                    </div>
                                    {order.customer?.phone && (
                                        <div style={{ fontSize: '13px', color: C.textSecondary, fontFamily: OUTFIT }}>{order.customer.phone}</div>
                                    )}
                                </div>
                                <div style={{ background: C.border }} />
                                <div>
                                    <label style={LS}>{t('تفاصيل المستند')}</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span style={{ color: C.textSecondary }}>{t('رقم الأمر:')}</span>
                                            <span style={{ fontWeight: 700, fontFamily: OUTFIT, color: C.primary }}>{soCode}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span style={{ color: C.textSecondary }}>{t('التاريخ:')}</span>
                                            <span style={{ fontWeight: 700, fontFamily: OUTFIT, color: C.textPrimary }}>
                                                {new Date(order.date).toLocaleDateString('en-ZA')}
                                            </span>
                                        </div>
                                        {order.expectedDeliveryDate && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span style={{ color: C.textSecondary }}>{t('موعد التسليم:')}</span>
                                                <span style={{ fontWeight: 700, fontFamily: OUTFIT, color: C.textPrimary }}>
                                                    {new Date(order.expectedDeliveryDate).toLocaleDateString('en-ZA')}
                                                </span>
                                            </div>
                                        )}
                                        {order.warehouse && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span style={{ color: C.textSecondary }}>{t('المخزن:')}</span>
                                                <span style={{ fontWeight: 600, color: C.textPrimary }}>{order.warehouse.name}</span>
                                            </div>
                                        )}
                                        {order.project && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <span style={{ color: C.textSecondary }}>{t('المشروع:')}</span>
                                                <span style={{ fontWeight: 600, color: C.textPrimary }}>{order.project.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Lines Table */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: C.primary }}><Package size={12} /> {t('بنود الأصناف')}</div>
                            <div className="scroll-table" style={{ borderRadius: '12px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `2px solid ${C.border}` }}>
                                        <tr>
                                            {[t('الصنف'), t('الكمية المطلوبة'), t('الكمية المسلمة'), t('السعر'), t('الإجمالي')].map((h, i) => (
                                                <th key={i} style={{ padding: '12px 16px', textAlign: i === 0 ? 'start' : 'center', fontSize: '11px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.lines.map((line, idx) => {
                                            const fullyDelivered = line.deliveredQty >= line.quantity;
                                            return (
                                                <tr key={line.id} style={{ borderBottom: idx === order.lines.length - 1 ? 'none' : `1px solid ${C.border}44` }}>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        <div style={{ fontWeight: 700, color: C.textPrimary, fontSize: '13px' }}>{line.item.name}</div>
                                                        {line.description && (
                                                            <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px' }}>{line.description}</div>
                                                        )}
                                                        {line.unit && (
                                                            <div style={{ fontSize: '11px', color: C.textMuted }}>{line.unit}</div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>
                                                        {line.quantity}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                        <span style={{
                                                            fontFamily: OUTFIT, fontWeight: 700,
                                                            color: fullyDelivered ? C.success : line.deliveredQty > 0 ? '#fbbf24' : C.textMuted,
                                                        }}>
                                                            {line.deliveredQty}
                                                        </span>
                                                        {fullyDelivered && <span style={{ fontSize: '10px', color: C.success, marginInlineStart: '4px' }}>✓</span>}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: OUTFIT, fontWeight: 600, color: C.textSecondary }}>
                                                        {fmt(line.price)}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: OUTFIT, fontWeight: 700, color: C.primary, fontSize: '14px' }}>
                                                        {fmt(line.total)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Notes */}
                        {order.notes && (
                            <div style={SC}>
                                <div style={STitle}><FileText size={12} /> {t('ملاحظات')}</div>
                                <div style={{ fontSize: '13px', lineHeight: '1.8', color: C.textSecondary, whiteSpace: 'pre-wrap' }}>{order.notes}</div>
                            </div>
                        )}
                    </div>

                    {/* Right: Summary + Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Summary */}
                        <div style={{ ...SC, position: 'sticky', top: '20px' }}>
                            <div style={{ ...STitle, color: C.primary }}><Info size={12} /> {t('ملخص الأمر')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('الإجمالي الفرعي')}</span>
                                    <span style={{ fontFamily: OUTFIT, fontWeight: 600, color: C.textPrimary }}>{fmt(order.subtotal)}</span>
                                </div>
                                {order.discount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span style={{ color: C.textSecondary }}>{t('الخصم')}</span>
                                        <span style={{ fontFamily: OUTFIT, fontWeight: 600, color: C.danger }}>-{fmt(order.discount)}</span>
                                    </div>
                                )}
                                {order.taxAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span style={{ color: C.textSecondary }}>{t('الضريبة')} ({order.taxRate}%)</span>
                                        <span style={{ fontFamily: OUTFIT, fontWeight: 600, color: C.primary }}>+{fmt(order.taxAmount)}</span>
                                    </div>
                                )}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'linear-gradient(135deg, rgba(37,106,244,0.12), rgba(37,106,244,0.05))',
                                    padding: '10px 14px', borderRadius: '12px',
                                    border: '1px solid rgba(37,106,244,0.3)',
                                }}>
                                    <span style={{ color: C.textSecondary, fontWeight: 600, fontSize: '13px' }}>{t('الإجمالي الكلي')}</span>
                                    <span style={{ color: C.primary, fontWeight: 700, fontSize: '17px', fontFamily: OUTFIT }}>{fmt(order.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: C.primary }}>{t('الإجراءات')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                                {canApprove && (
                                    <button
                                        onClick={() => handleAction('approve')}
                                        disabled={actionLoading}
                                        style={{
                                            width: '100%', height: '46px', borderRadius: '12px', border: 'none',
                                            background: actionLoading ? 'rgba(37,106,244,0.15)' : C.primary,
                                            color: actionLoading ? C.textMuted : '#fff',
                                            fontWeight: 700, fontSize: '13px', cursor: actionLoading ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            fontFamily: CAIRO,
                                        }}
                                    >
                                        {actionLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
                                        {t('اعتماد الأمر')}
                                    </button>
                                )}

                                {canDeliver && (
                                    <button
                                        onClick={openDeliveryModal}
                                        style={{
                                            width: '100%', height: '46px', borderRadius: '12px', border: `1px solid rgba(74,222,128,0.3)`,
                                            background: 'rgba(74,222,128,0.08)',
                                            color: C.success, fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            fontFamily: CAIRO,
                                        }}
                                    >
                                        <Truck size={16} /> {t('تسجيل تسليم')}
                                    </button>
                                )}

                                {canInvoice && (
                                    <button
                                        onClick={() => router.push(`/sales/new?salesOrderId=${order.id}`)}
                                        style={{
                                            width: '100%', height: '46px', borderRadius: '12px', border: `1px solid rgba(167,139,250,0.3)`,
                                            background: 'rgba(167,139,250,0.08)',
                                            color: '#a78bfa', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            fontFamily: CAIRO,
                                        }}
                                    >
                                        <Receipt size={16} /> {t('تحويل إلى فاتورة مبيعات')}
                                    </button>
                                )}

                                {canDelete && (
                                    <button
                                        onClick={() => router.push(`/sales-orders/new?editId=${order.id}`)}
                                        style={{
                                            width: '100%', height: '40px', borderRadius: '12px', border: `1px solid ${C.border}`,
                                            background: 'transparent', color: C.textSecondary,
                                            fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            fontFamily: CAIRO,
                                        }}
                                    >
                                        <Edit size={14} /> {t('تعديل')}
                                    </button>
                                )}

                                {canCancel && (
                                    <button
                                        onClick={() => handleAction('cancel')}
                                        disabled={actionLoading}
                                        style={{
                                            width: '100%', height: '40px', borderRadius: '12px', border: `1px solid rgba(239,68,68,0.3)`,
                                            background: 'transparent', color: C.danger,
                                            fontWeight: 600, fontSize: '13px', cursor: actionLoading ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            fontFamily: CAIRO,
                                        }}
                                    >
                                        <X size={14} /> {t('إلغاء الأمر')}
                                    </button>
                                )}

                                {canDelete && (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        disabled={actionLoading}
                                        style={{
                                            width: '100%', height: '40px', borderRadius: '12px', border: `1px solid rgba(239,68,68,0.3)`,
                                            background: 'transparent', color: C.danger,
                                            fontWeight: 600, fontSize: '13px', cursor: actionLoading ? 'not-allowed' : 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            fontFamily: CAIRO,
                                        }}
                                    >
                                        <Trash2 size={14} /> {t('حذف الأمر')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delivery Modal */}
            <AppModal
                show={showDeliveryModal}
                onClose={() => setShowDeliveryModal(false)}
                title={<span style={{ fontFamily: CAIRO }}>{t('تسجيل تسليم')} — {soCode}</span>}
                icon={Truck}
                maxWidth="600px"
                footer={
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setShowDeliveryModal(false)}
                            style={{ padding: '8px 20px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, cursor: 'pointer', fontFamily: CAIRO, fontSize: '13px' }}
                        >
                            {t('إغلاق')}
                        </button>
                        <button
                            onClick={handleDeliverySubmit}
                            disabled={deliveryLoading}
                            style={{
                                padding: '8px 24px', borderRadius: '10px', border: 'none',
                                background: deliveryLoading ? 'rgba(37,106,244,0.3)' : C.primary,
                                color: '#fff', cursor: deliveryLoading ? 'not-allowed' : 'pointer',
                                fontFamily: CAIRO, fontSize: '13px', fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: '8px',
                            }}
                        >
                            {deliveryLoading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                            {t('تأكيد التسليم')}
                        </button>
                    </div>
                }
            >
                <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: CAIRO }}>
                    {deliveryError && (
                        <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, color: C.danger, fontSize: '13px' }}>
                            {deliveryError}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {order?.lines.map(line => {
                            const remaining = Math.max(0, line.quantity - line.deliveredQty);
                            const available = stockMap[line.id] ?? 0;
                            if (remaining === 0) return null;
                            return (
                                <div key={line.id} style={{ padding: '14px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: C.textPrimary, fontSize: '13px' }}>{line.item.name}</div>
                                            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>
                                                {t('المطلوب')}: {line.quantity} | {t('تم تسليمه')}: {line.deliveredQty} | {t('المتبقي')}: {remaining}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'end', flexShrink: 0 }}>
                                            <div style={{ fontSize: '11px', color: available > 0 ? C.success : C.danger, fontFamily: OUTFIT, fontWeight: 600 }}>
                                                {t('المتاح في المخزن')}: {available}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <label style={{ ...LS, marginBottom: 0, minWidth: '120px' }}>{t('الكمية للتسليم')}</label>
                                        <input
                                            type="number"
                                            value={deliveryQtys[line.id] ?? remaining}
                                            onChange={e => setDeliveryQtys(prev => ({ ...prev, [line.id]: Math.min(Number(e.target.value) || 0, remaining) }))}
                                            style={{ ...IS, width: '100px', textAlign: 'center' }}
                                            min="0" max={remaining} step="0.01"
                                            onFocus={focusIn} onBlur={focusOut}
                                        />
                                        <span style={{ fontSize: '11px', color: C.textMuted }}>/ {remaining}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {order?.lines.every(l => l.deliveredQty >= l.quantity) && (
                            <div style={{ textAlign: 'center', padding: '20px', color: C.success, fontFamily: CAIRO }}>
                                <CheckCircle size={32} style={{ marginBottom: '8px' }} />
                                <div>{t('تم تسليم جميع الأصناف بالكامل')}</div>
                            </div>
                        )}
                    </div>
                </div>
            </AppModal>

            {/* Delete Confirm Modal */}
            <AppModal
                show={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title={t('تأكيد الحذف')}
                icon={Trash2}
                isDelete
                itemName={soCode}
                description={t('سيتم حذف أمر البيع نهائياً ولا يمكن التراجع عن هذا الإجراء')}
                onConfirm={handleDelete}
                isSubmitting={actionLoading}
                confirmText={t('حذف الأمر')}
            />

            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
