'use client';
import React, { useState, useEffect, useCallback, use } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ContentSkeleton from '@/components/ContentSkeleton';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { formatNumber } from '@/lib/currency';
import {
    ShoppingBag, Package, CheckCircle2, AlertCircle, Clock, XCircle, FileText,
    Loader2, Trash2, Edit, Truck, Receipt, Building2, User, Calendar, Wallet,
} from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, LS, PAGE_BASE, TABLE_STYLE, SC, STitle } from '@/constants/theme';

interface POLine {
    id: string;
    itemId: string;
    description?: string;
    quantity: number;
    receivedQty: number;
    price: number;
    discount: number;
    total: number;
    unit?: string;
    item: { id: string; name: string; code: string; unit?: { name: string } | null };
}

interface PurchaseOrder {
    id: string;
    orderNumber: number;
    date: string;
    expectedDeliveryDate?: string;
    status: string;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    notes?: string;
    approvedBy?: string;
    approvedAt?: string;
    supplier: { id: string; name: string; phone?: string };
    warehouse?: { id: string; name: string } | null;
    project?: { id: string; name: string } | null;
    lines: POLine[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    draft: { label: 'مسودة', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: FileText },
    approved: { label: 'معتمد', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', icon: CheckCircle2 },
    partially_received: { label: 'مستلم جزئياً', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', icon: Clock },
    received: { label: 'مستلم', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', icon: CheckCircle2 },
    invoiced: { label: 'مُفوتر', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', icon: FileText },
    cancelled: { label: 'ملغي', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: XCircle },
};

export default function PurchaseOrderDetailPage(props: { params: Promise<{ id: string }> }) {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const params = use(props.params);
    const router = useRouter();
    const { data: session } = useSession();
    const { fMoneyJSX } = useCurrency();

    const [order, setOrder] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
    const [receiving, setReceiving] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const fetchOrder = useCallback(async () => {
        try {
            const res = await fetch(`/api/purchase-orders/${params.id}`);
            if (res.ok) setOrder(await res.json());
        } catch { } finally { setLoading(false); }
    }, [params.id]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    const handleStatusChange = async (newStatus: string) => {
        setActionLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch(`/api/purchase-orders/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                await fetchOrder();
            } else {
                const err = await res.json();
                setErrorMsg(err.error || t('فشل تغيير الحالة'));
            }
        } catch { setErrorMsg(t('خطأ في الاتصال')); } finally { setActionLoading(false); }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/purchase-orders/${params.id}`, { method: 'DELETE' });
            if (res.ok) {
                router.push('/purchase-orders');
            } else {
                const err = await res.json();
                setErrorMsg(err.error || t('فشل الحذف'));
                setShowDeleteModal(false);
            }
        } catch { setErrorMsg(t('خطأ في الاتصال')); setShowDeleteModal(false); } finally { setDeleting(false); }
    };

    const openReceiveModal = () => {
        if (!order) return;
        const initial: Record<string, number> = {};
        order.lines.forEach(l => {
            initial[l.id] = 0;
        });
        setReceiveQtys(initial);
        setShowReceiveModal(true);
    };

    const handleReceive = async () => {
        const lines = Object.entries(receiveQtys)
            .filter(([, qty]) => qty > 0)
            .map(([lineId, receivedQty]) => ({ lineId, receivedQty }));

        if (lines.length === 0) {
            setErrorMsg(t('يرجى إدخال كمية مستلمة لصنف واحد على الأقل'));
            return;
        }

        setReceiving(true);
        setErrorMsg('');
        try {
            const res = await fetch(`/api/purchase-orders/${params.id}/receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lines }),
            });
            if (res.ok) {
                setShowReceiveModal(false);
                await fetchOrder();
            } else {
                const err = await res.json();
                setErrorMsg(err.error || t('فشل تسجيل الاستلام'));
            }
        } catch { setErrorMsg(t('خطأ في الاتصال')); } finally { setReceiving(false); }
    };

    if (loading) return <DashboardLayout><ContentSkeleton /></DashboardLayout>;

    if (!order) return (
        <DashboardLayout>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', color: C.danger }}>
                {t('أمر الشراء غير موجود أو تم حذفه')}
            </div>
        </DashboardLayout>
    );

    const poRef = `PO-${String(order.orderNumber).padStart(5, '0')}`;
    const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
    const StatusIcon = statusCfg.icon;

    const canApprove = order.status === 'draft';
    const canReceive = ['approved', 'partially_received'].includes(order.status);
    const canDelete = order.status === 'draft';
    const canCancel = ['draft', 'approved'].includes(order.status);
    const canEdit = order.status === 'draft';
    const canInvoice = order.status === 'received';

    const headerActions: React.ReactNode[] = [];

    if (canEdit) {
        headerActions.push(
            <button
                key="edit"
                onClick={() => router.push(`/purchase-orders/${order.id}/edit`)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px', height: '38px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}
            >
                <Edit size={14} /> {t('تعديل')}
            </button>
        );
    }

    if (canDelete) {
        headerActions.push(
            <button
                key="delete"
                onClick={() => setShowDeleteModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px', height: '38px', borderRadius: '10px', border: `1px solid rgba(239,68,68,0.3)`, background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}
            >
                <Trash2 size={14} /> {t('حذف')}
            </button>
        );
    }

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={`${t('أمر الشراء')} #${poRef}`}
                    subtitle={`${t('تاريخ الأمر:')} ${new Date(order.date).toLocaleDateString(isRtl ? 'ar-EG-u-nu-latn' : 'en-GB')}`}
                    icon={ShoppingBag}
                    backUrl="/purchase-orders"
                    actions={headerActions}
                />

                {errorMsg && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', marginBottom: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: 600 }}>
                        <AlertCircle size={16} /> {errorMsg}
                    </div>
                )}

                {/* Action Buttons Row */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {canApprove && (
                        <button
                            onClick={() => handleStatusChange('approved')}
                            disabled={actionLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', height: '42px', borderRadius: '10px', border: 'none', background: '#60a5fa', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', fontFamily: CAIRO, opacity: actionLoading ? 0.6 : 1 }}
                        >
                            {actionLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={16} />}
                            {t('اعتماد الأمر')}
                        </button>
                    )}
                    {canReceive && (
                        <button
                            onClick={openReceiveModal}
                            disabled={actionLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', height: '42px', borderRadius: '10px', border: 'none', background: '#4ade80', color: '#0f172a', fontSize: '13px', fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', fontFamily: CAIRO, opacity: actionLoading ? 0.6 : 1 }}
                        >
                            <Truck size={16} /> {t('تسجيل استلام')}
                        </button>
                    )}
                    {canInvoice && (
                        <button
                            onClick={() => router.push(`/purchases/new?purchaseOrderId=${order.id}`)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', height: '42px', borderRadius: '10px', border: 'none', background: '#a78bfa', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}
                        >
                            <Receipt size={16} /> {t('تحويل إلى فاتورة مشتريات')}
                        </button>
                    )}
                    {canCancel && (
                        <button
                            onClick={() => handleStatusChange('cancelled')}
                            disabled={actionLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', height: '42px', borderRadius: '10px', border: `1px solid rgba(239,68,68,0.3)`, background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: '13px', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', fontFamily: CAIRO, opacity: actionLoading ? 0.6 : 1 }}
                        >
                            <XCircle size={16} /> {t('إلغاء الأمر')}
                        </button>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Order Meta */}
                        <div style={{ ...SC, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(37,106,244,0.1)', color: '#256af4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={20} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: C.textSecondary, margin: 0 }}>{t('المورد')}</p>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, margin: 0 }}>{order.supplier?.name || '—'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: C.textSecondary, margin: 0 }}>{t('المخزن')}</p>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, margin: 0 }}>{order.warehouse?.name || '—'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: statusCfg.bg, color: statusCfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <StatusIcon size={20} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: C.textSecondary, margin: 0 }}>{t('الحالة')}</p>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: statusCfg.color, margin: 0 }}>{statusCfg.label}</p>
                                </div>
                            </div>
                            {order.expectedDeliveryDate && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '11px', color: C.textSecondary, margin: 0 }}>{t('تاريخ التسليم المتوقع')}</p>
                                        <p style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, margin: 0 }}>
                                            {new Date(order.expectedDeliveryDate).toLocaleDateString(isRtl ? 'ar-EG-u-nu-latn' : 'en-GB')}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {order.project && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '11px', color: C.textSecondary, margin: 0 }}>{t('المشروع')}</p>
                                        <p style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, margin: 0 }}>{order.project.name}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Lines Table */}
                        <div style={TABLE_STYLE.container}>
                            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={STitle}><Package size={14} /> {t('الأصناف')}</div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary }}>{order.lines.length} {t('عناصر')}</div>
                            </div>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(true)}>{t('الصنف')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('الكمية المطلوبة')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('الكمية المستلمة')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('السعر')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('الإجمالي')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.lines.map((l, idx) => {
                                        const pct = l.quantity > 0 ? Math.round((l.receivedQty / l.quantity) * 100) : 0;
                                        return (
                                            <tr key={l.id} style={TABLE_STYLE.row(idx === order.lines.length - 1)}>
                                                <td style={TABLE_STYLE.td(true)}>
                                                    <div style={{ color: C.textPrimary, fontWeight: 700, fontFamily: CAIRO }}>{l.item.name}</div>
                                                    <div style={{ fontSize: '11px', color: C.textSecondary, fontFamily: OUTFIT }}>{l.item.code}</div>
                                                    {l.description && <div style={{ fontSize: '11px', color: C.textMuted }}>{l.description}</div>}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, true), fontFamily: OUTFIT, fontWeight: 600 }}>
                                                    {formatNumber(l.quantity)}
                                                    {l.unit ? <span style={{ fontSize: '11px', color: C.textMuted, marginInlineStart: '4px' }}>{l.unit}</span> : null}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, true) }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ fontFamily: OUTFIT, fontWeight: 600, color: pct === 100 ? '#4ade80' : pct > 0 ? '#fbbf24' : C.textSecondary }}>
                                                            {formatNumber(l.receivedQty)}
                                                        </span>
                                                        <div style={{ width: '60px', height: '3px', borderRadius: '2px', background: C.border, overflow: 'hidden' }}>
                                                            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#4ade80' : pct > 0 ? '#fbbf24' : C.textMuted, borderRadius: '2px' }} />
                                                        </div>
                                                        <span style={{ fontSize: '10px', color: C.textMuted }}>{pct}%</span>
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, true), fontFamily: OUTFIT, color: C.textSecondary }}>{formatNumber(l.price)}</td>
                                                <td style={{ ...TABLE_STYLE.td(false, true), fontFamily: OUTFIT, fontWeight: 600, color: C.primary }}>{formatNumber(l.total)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {order.notes && (
                            <div style={{ ...SC }}>
                                <div style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 700, marginBottom: '8px' }}>{t('ملاحظات')}</div>
                                <p style={{ fontSize: '13px', color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>{order.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Financial Summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={SC}>
                            <div style={STitle}><Wallet size={14} /> {t('ملخص الأمر')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('الإجمالي قبل الضريبة')}</span>
                                    <span style={{ fontWeight: 700, fontFamily: OUTFIT }}>{fMoneyJSX(order.subtotal)}</span>
                                </div>
                                {order.taxRate > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span style={{ color: C.textSecondary }}>{t('الضريبة')} ({order.taxRate}%)</span>
                                        <span style={{ fontWeight: 700, fontFamily: OUTFIT, color: '#fbbf24' }}>{fMoneyJSX(order.taxAmount)}</span>
                                    </div>
                                )}
                                <div style={{ height: '1px', background: C.border, margin: '4px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: 'rgba(37,106,244,0.08)', border: `1px solid rgba(37,106,244,0.3)` }}>
                                    <span style={{ fontWeight: 600, fontSize: '12px' }}>{t('الإجمالي النهائي')}</span>
                                    <span style={{ fontWeight: 600, fontSize: '18px', color: C.primary, fontFamily: OUTFIT }}>{fMoneyJSX(order.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div style={{ ...SC, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: statusCfg.bg, color: statusCfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <StatusIcon size={22} />
                            </div>
                            <div>
                                <p style={{ fontSize: '11px', color: C.textSecondary, margin: 0 }}>{t('حالة الأمر')}</p>
                                <p style={{ fontSize: '15px', fontWeight: 700, color: statusCfg.color, margin: 0 }}>{statusCfg.label}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Receive Modal */}
                <AppModal
                    show={showReceiveModal}
                    onClose={() => setShowReceiveModal(false)}
                    title={t('تسجيل استلام البضاعة')}
                    icon={Truck}
                    maxWidth="560px"
                    footer={
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleReceive}
                                disabled={receiving}
                                style={{ flex: 1.5, height: '46px', borderRadius: '12px', border: 'none', background: receiving ? 'rgba(74,222,128,0.4)' : '#4ade80', color: '#0f172a', fontWeight: 700, cursor: receiving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: CAIRO, fontSize: '13px' }}
                            >
                                {receiving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Truck size={16} />}
                                {t('تأكيد الاستلام')}
                            </button>
                            <button
                                onClick={() => setShowReceiveModal(false)}
                                style={{ flex: 1, height: '46px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}
                            >
                                {t('إلغاء')}
                            </button>
                        </div>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {errorMsg && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: '#f87171', fontSize: '12px' }}>
                                <AlertCircle size={14} /> {errorMsg}
                            </div>
                        )}
                        <p style={{ color: C.textSecondary, fontSize: '12px', margin: 0 }}>
                            {t('أدخل الكميات المستلمة لكل صنف')} ({t('أمر الشراء')} #{poRef})
                        </p>
                        {order.lines.map((l) => {
                            const remaining = Number(l.quantity) - Number(l.receivedQty);
                            return (
                                <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: '10px', background: C.subtle, borderRadius: '10px', border: `1px solid ${C.border}` }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}>{l.item.name}</div>
                                        <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px' }}>
                                            {t('مطلوب:')} {formatNumber(l.quantity)} | {t('مستلم سابقاً:')} {formatNumber(l.receivedQty)} | {t('متبقي:')} {formatNumber(remaining)}
                                        </div>
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            min="0"
                                            max={remaining}
                                            step="0.01"
                                            value={receiveQtys[l.id] ?? 0}
                                            onChange={e => setReceiveQtys(prev => ({ ...prev, [l.id]: parseFloat(e.target.value) || 0 }))}
                                            style={{ ...IS, width: '100px', height: '38px', textAlign: 'center' as any }}
                                            onFocus={e => e.target.select()}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </AppModal>

                {/* Delete Confirm Modal */}
                <AppModal
                    show={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    title={t('حذف أمر الشراء')}
                    icon={Trash2}
                    isDelete
                    itemName={poRef}
                    description={t('سيتم حذف أمر الشراء نهائياً ولا يمكن التراجع عن هذا الإجراء')}
                    onConfirm={handleDelete}
                    isSubmitting={deleting}
                    confirmText={t('حذف')}
                    cancelText={t('إلغاء')}
                />

            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
