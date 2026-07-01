'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { C, CAIRO, OUTFIT, SC, STitle, TABLE_STYLE } from '@/constants/theme';
import { ClipboardList, Loader2, Play, CheckCircle, XCircle, Edit3, Package, Receipt } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface Material {
    id: string;
    quantity: number;
    unitPrice: number;
    total: number;
    unit: string | null;
    item: { name: string; code: string };
}

interface WorkOrder {
    id: string;
    orderNumber: number;
    type: string;
    priority: string;
    status: string;
    description: string;
    notes: string | null;
    resolution: string | null;
    customerPONumber: string | null;
    scheduledDate: string | null;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    customer: { id: string; name: string; phone: string | null } | null;
    contract: { id: string; contractNumber: number; type: string } | null;
    assignedEmployee: { id: string; name: string; position: string | null } | null;
    materials: Material[];
}

const TYPE_LABELS: Record<string, string> = {
    maintenance: 'صيانة',
    installation: 'تركيب',
    repair: 'إصلاح',
    inspection: 'فحص وتفتيش',
    consulting: 'استشارات',
};

const PRIORITY_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
    low:    { label: 'منخفضة', bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: 'rgba(100,116,139,0.22)' },
    normal: { label: 'عادية',  bg: 'rgba(37,106,244,0.12)',  color: '#256af4', border: 'rgba(37,106,244,0.22)'  },
    high:   { label: 'عالية',  bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: 'rgba(251,191,36,0.22)'  },
    urgent: { label: 'عاجلة',  bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.22)'   },
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
    new:         { label: 'جديد',        bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', border: 'rgba(148,163,184,0.22)' },
    assigned:    { label: 'مُسنَد',      bg: 'rgba(37,106,244,0.12)',  color: '#256af4', border: 'rgba(37,106,244,0.22)'  },
    in_progress: { label: 'قيد التنفيذ', bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: 'rgba(251,191,36,0.22)'  },
    completed:   { label: 'مكتمل',       bg: 'rgba(74,222,128,0.12)', color: '#4ade80', border: 'rgba(74,222,128,0.22)'  },
    invoiced:    { label: 'تمت الفوترة',  bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.22)'  },
    cancelled:   { label: 'ملغى',        bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', border: 'rgba(239,68,68,0.22)'   },
};

function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtNum(n: number) {
    return n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WorkOrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [order, setOrder] = useState<WorkOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusLoading, setStatusLoading] = useState(false);
    const [error, setError] = useState('');
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [resolutionText, setResolutionText] = useState('');

    const fetchOrder = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/work-orders/${id}`);
            if (res.ok) setOrder(await res.json());
            else setError('تعذر تحميل بيانات أمر العمل');
        } catch {
            setError('خطأ في الاتصال بالسيرفر');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    const changeStatus = async (status: string, resolution?: string) => {
        setStatusLoading(true);
        try {
            const body: Record<string, string> = { status };
            if (resolution) body.resolution = resolution;
            const res = await fetch(`/api/work-orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) fetchOrder();
        } finally {
            setStatusLoading(false);
        }
    };

    const handleComplete = async () => {
        await changeStatus('completed', resolutionText || undefined);
        setShowCompleteModal(false);
        setResolutionText('');
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                </div>
                <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </DashboardLayout>
        );
    }

    if (!order) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '80px', color: C.textMuted, fontFamily: CAIRO }}>
                    {error || 'أمر العمل غير موجود'}
                </div>
            </DashboardLayout>
        );
    }

    const padded = `WO-${String(order.orderNumber).padStart(5, '0')}`;
    const statusBadge = STATUS_BADGE[order.status] || STATUS_BADGE.new;
    const priorityBadge = PRIORITY_BADGE[order.priority] || PRIORITY_BADGE.normal;
    const isEditable = order.status !== 'completed' && order.status !== 'invoiced' && order.status !== 'cancelled';
    const materialsTotal = order.materials.reduce((sum, m) => sum + m.total, 0);

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ paddingBottom: '60px', fontFamily: CAIRO }}>
                <PageHeader
                    title={padded}
                    subtitle={`${TYPE_LABELS[order.type] || order.type} — ${order.customer?.name || 'بدون عميل'}`}
                    icon={ClipboardList}
                    primaryButton={isEditable ? {
                        label: 'تعديل أمر العمل',
                        onClick: () => router.push(`/work-orders/${id}/edit`),
                        icon: Edit3,
                    } : undefined}
                />

                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div style={SC}>
                            <p style={STitle}><ClipboardList size={14} /> تفاصيل أمر العمل</p>
                            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {[
                                    { label: 'رقم الأمر', value: padded, mono: true },
                                    { label: 'نوع الأمر', value: TYPE_LABELS[order.type] || order.type },
                                    { label: 'العميل', value: order.customer?.name || '—' },
                                    { label: 'جهة الاتصال', value: order.customer?.phone || '—', mono: true },
                                    { label: 'عقد الخدمة', value: order.contract ? `SC-${String(order.contract.contractNumber).padStart(5, '0')}` : '—', mono: true },
                                    { label: 'رقم أمر الشراء', value: order.customerPONumber || '—', mono: true },
                                    { label: 'الموظف المسؤول', value: order.assignedEmployee?.name || '—' },
                                    { label: 'المسمى الوظيفي', value: order.assignedEmployee?.position || '—' },
                                    { label: 'التاريخ المجدول', value: fmtDate(order.scheduledDate), mono: true },
                                    { label: 'تاريخ الإنشاء', value: fmtDate(order.createdAt), mono: true },
                                    { label: 'بدأ التنفيذ', value: fmtDateTime(order.startedAt), mono: true },
                                    { label: 'تاريخ الإتمام', value: fmtDateTime(order.completedAt), mono: true },
                                ].map((item, i) => (
                                    <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                                        <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px', fontWeight: 700 }}>{item.label}</div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: C.textPrimary, fontFamily: item.mono ? OUTFIT : CAIRO }}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '14px' }}>
                                <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '6px', fontWeight: 700 }}>الوصف</div>
                                <p style={{ color: C.textSecondary, fontSize: '13px', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{order.description}</p>
                            </div>
                            {order.notes && (
                                <div style={{ marginTop: '14px' }}>
                                    <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '6px', fontWeight: 700 }}>الملاحظات</div>
                                    <p style={{ color: C.textSecondary, fontSize: '13px', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{order.notes}</p>
                                </div>
                            )}
                            {order.resolution && (
                                <div style={{ marginTop: '14px' }}>
                                    <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '6px', fontWeight: 700 }}>الحل والإجراء المتخذ</div>
                                    <p style={{ color: '#4ade80', fontSize: '13px', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{order.resolution}</p>
                                </div>
                            )}
                        </div>

                        <div style={SC}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <p style={{ ...STitle, margin: 0 }}><Package size={14} /> المواد المستخدمة</p>
                                {order.materials.length > 0 && (
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT }}>
                                        الإجمالي: {fmtNum(materialsTotal)}
                                    </span>
                                )}
                            </div>
                            {order.materials.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: C.textMuted, fontSize: '13px' }}>
                                    لا توجد مواد مسجلة لهذا الأمر
                                </div>
                            ) : (
                                <div style={TABLE_STYLE.container}>
                                    <table style={{ ...TABLE_STYLE.table, minWidth: '400px' }}>
                                        <thead style={TABLE_STYLE.thead}>
                                            <tr>
                                                {['الصنف', 'الكود', 'الكمية', 'الوحدة', 'سعر الوحدة', 'الإجمالي'].map((h, i) => (
                                                    <th key={i} style={TABLE_STYLE.th(i === 0, i >= 2)}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.materials.map((m, idx) => (
                                                <tr
                                                    key={m.id}
                                                    style={TABLE_STYLE.row(idx === order.materials.length - 1)}
                                                    onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                >
                                                    <td style={TABLE_STYLE.td(true)}>
                                                        <span style={{ fontWeight: 600, color: C.textPrimary }}>{m.item.name}</span>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        <span style={{ fontFamily: OUTFIT, color: C.textMuted, fontSize: '12px' }}>{m.item.code}</span>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false, true)}>
                                                        <span style={{ fontFamily: OUTFIT, color: C.textPrimary }}>{m.quantity}</span>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false, true)}>
                                                        <span style={{ color: C.textSecondary, fontSize: '12px' }}>{m.unit || '—'}</span>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false, true)}>
                                                        <span style={{ fontFamily: OUTFIT, color: C.textSecondary }}>{fmtNum(m.unitPrice)}</span>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false, true)}>
                                                        <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{fmtNum(m.total)}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div style={SC}>
                            <p style={STitle}>الحالة والأولوية</p>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <span style={{
                                    display: 'inline-block', padding: '6px 20px', borderRadius: '30px',
                                    fontSize: '13px', fontWeight: 700, fontFamily: CAIRO,
                                    background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}`,
                                }}>{statusBadge.label}</span>
                                <span style={{
                                    display: 'inline-block', padding: '6px 20px', borderRadius: '30px',
                                    fontSize: '13px', fontWeight: 700, fontFamily: CAIRO,
                                    background: priorityBadge.bg, color: priorityBadge.color, border: `1px solid ${priorityBadge.border}`,
                                }}>{priorityBadge.label}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(order.status === 'new' || order.status === 'assigned') && (
                                    <button
                                        onClick={() => changeStatus('in_progress')}
                                        disabled={statusLoading}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '42px', borderRadius: '10px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontWeight: 700, fontSize: '13px', cursor: statusLoading ? 'not-allowed' : 'pointer', fontFamily: CAIRO, opacity: statusLoading ? 0.6 : 1 }}
                                    >
                                        <Play size={15} /> بدء التنفيذ
                                    </button>
                                )}
                                {order.status === 'in_progress' && (
                                    <button
                                        onClick={() => setShowCompleteModal(true)}
                                        disabled={statusLoading}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '42px', borderRadius: '10px', border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontWeight: 700, fontSize: '13px', cursor: statusLoading ? 'not-allowed' : 'pointer', fontFamily: CAIRO, opacity: statusLoading ? 0.6 : 1 }}
                                    >
                                        <CheckCircle size={15} /> إتمام أمر العمل
                                    </button>
                                )}
                                {(order.status === 'new' || order.status === 'assigned' || order.status === 'in_progress') && (
                                    <button
                                        onClick={() => changeStatus('cancelled')}
                                        disabled={statusLoading}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '42px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 700, fontSize: '13px', cursor: statusLoading ? 'not-allowed' : 'pointer', fontFamily: CAIRO, opacity: statusLoading ? 0.6 : 1 }}
                                    >
                                        <XCircle size={15} /> إلغاء أمر العمل
                                    </button>
                                )}
                                {order.status === 'completed' && (
                                    <button
                                        onClick={() => router.push(`/sales/new?businessType=SERVICES&workOrderId=${order.id}`)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '42px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: CAIRO }}
                                    >
                                        <Receipt size={15} /> تحويل إلى فاتورة خدمات
                                    </button>
                                )}
                                {(order.status === 'completed' || order.status === 'invoiced' || order.status === 'cancelled') && (
                                    <div style={{ textAlign: 'center', padding: '12px', color: C.textMuted, fontSize: '12px', fontFamily: CAIRO }}>
                                        {order.status === 'completed' ? 'تم إتمام أمر العمل بنجاح' : order.status === 'invoiced' ? 'تمت فوترة أمر العمل بنجاح' : 'تم إلغاء أمر العمل'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {order.contract && (
                            <div style={SC}>
                                <p style={STitle}>عقد الخدمة المرتبط</p>
                                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: `1px solid ${C.border}`, cursor: 'pointer' }}
                                    onClick={() => router.push(`/service-contracts/${order.contract!.id}`)}
                                    onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                >
                                    <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px', fontWeight: 700 }}>رقم العقد</div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>
                                        {`SC-${String(order.contract.contractNumber).padStart(5, '0')}`}
                                    </div>
                                    <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '4px' }}>
                                        {TYPE_LABELS[order.contract.type] || order.contract.type}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={SC}>
                            <p style={STitle}>إجراءات</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {isEditable && (
                                    <button
                                        onClick={() => router.push(`/work-orders/${id}/edit`)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'rgba(37,106,244,0.08)', color: C.primary, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: CAIRO }}
                                    >
                                        <Edit3 size={15} /> تعديل بيانات الأمر
                                    </button>
                                )}
                                <button
                                    onClick={() => router.push('/work-orders')}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: CAIRO }}
                                >
                                    العودة لقائمة أوامر العمل
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {showCompleteModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowCompleteModal(false)}>
                    <div dir="rtl" style={{ background: C.card, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', fontFamily: CAIRO }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <CheckCircle size={20} color="#4ade80" />
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary }}>إتمام أمر العمل</h3>
                        </div>
                        <p style={{ margin: '0 0 20px', fontSize: '13px', color: C.textMuted }}>أدخل ملخص ما تم إنجازه قبل إغلاق الأمر (اختياري)</p>

                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: C.textSecondary, marginBottom: '8px' }}>الحل والإجراء المتخذ</label>
                        <textarea
                            value={resolutionText}
                            onChange={e => setResolutionText(e.target.value)}
                            placeholder="مثال: تم استبدال المضخة وتنظيف الفلاتر واختبار النظام. يعمل بشكل طبيعي."
                            rows={4}
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                        />

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button
                                onClick={handleComplete}
                                disabled={statusLoading}
                                style={{ flex: 1, height: '44px', borderRadius: '10px', border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.12)', color: '#4ade80', fontWeight: 700, fontSize: '14px', cursor: statusLoading ? 'not-allowed' : 'pointer', fontFamily: CAIRO, opacity: statusLoading ? 0.6 : 1 }}
                            >
                                {statusLoading ? 'جاري الحفظ...' : 'تأكيد الإتمام'}
                            </button>
                            <button
                                onClick={() => { setShowCompleteModal(false); setResolutionText(''); }}
                                disabled={statusLoading}
                                style={{ flex: 1, height: '44px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: CAIRO }}
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
