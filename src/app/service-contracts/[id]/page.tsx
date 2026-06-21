'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { C, CAIRO, OUTFIT, IS, LS, SC, STitle, TABLE_STYLE, focusIn, focusOut } from '@/constants/theme';
import { FileText, Plus, Loader2, Edit3, CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface WorkOrderRow {
    id: string;
    orderNumber: number;
    type: string;
    status: string;
    priority: string;
    scheduledDate: string | null;
    customer: { name: string } | null;
}

interface Contract {
    id: string;
    contractNumber: number;
    type: string;
    startDate: string;
    endDate: string | null;
    contractValue: number;
    billingCycle: string;
    autoRenew: boolean;
    status: string;
    description: string | null;
    terms: string | null;
    customer: { id: string; name: string; phone: string | null } | null;
    workOrders: WorkOrderRow[];
}

const TYPE_LABELS: Record<string, string> = { maintenance: 'صيانة', consulting: 'استشارات', development: 'تطوير', support: 'دعم فني' };
const BILLING_LABELS: Record<string, string> = { monthly: 'شهري', quarterly: 'ربع سنوي', semi_annual: 'نصف سنوي', annual: 'سنوي' };
const STATUS_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
    draft:     { label: 'مسودة', bg: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'rgba(255,255,255,0.15)' },
    active:    { label: 'نشط',   bg: 'rgba(74,222,128,0.12)',  color: '#4ade80', border: 'rgba(74,222,128,0.22)'  },
    expired:   { label: 'منتهي', bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.22)'   },
    cancelled: { label: 'ملغى',  bg: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'rgba(255,255,255,0.15)' },
};
const WO_STATUS_BADGE: Record<string, { label: string; color: string }> = {
    new:        { label: 'جديد',    color: '#94a3b8' },
    assigned:   { label: 'مُسنَد',  color: '#256af4' },
    in_progress:{ label: 'جاري',    color: '#fbbf24' },
    completed:  { label: 'مكتمل',   color: '#4ade80' },
    invoiced:   { label: 'مُفوتر',  color: '#a78bfa' },
    cancelled:  { label: 'ملغى',    color: '#ef4444' },
};

function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtNum(n: number) {
    return n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ServiceContractDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusLoading, setStatusLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchContract = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/service-contracts/${id}`);
            if (res.ok) setContract(await res.json());
            else setError('تعذر تحميل بيانات العقد');
        } catch {
            setError('خطأ في الاتصال بالسيرفر');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchContract(); }, [fetchContract]);

    const changeStatus = async (status: string) => {
        setStatusLoading(true);
        try {
            const res = await fetch(`/api/service-contracts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) fetchContract();
        } finally {
            setStatusLoading(false);
        }
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

    if (!contract) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '80px', color: C.textMuted, fontFamily: CAIRO }}>
                    {error || 'عقد الخدمة غير موجود'}
                </div>
            </DashboardLayout>
        );
    }

    const badge = STATUS_BADGE[contract.status] || STATUS_BADGE.draft;
    const padded = `SC-${String(contract.contractNumber).padStart(5, '0')}`;

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ paddingBottom: '60px', fontFamily: CAIRO }}>
                <PageHeader
                    title={padded}
                    subtitle={`عقد ${TYPE_LABELS[contract.type] || contract.type} — ${contract.customer?.name || 'بدون عميل'}`}
                    icon={FileText}
                    primaryButton={{
                        label: 'إنشاء أمر عمل',
                        onClick: () => router.push(`/work-orders/new?contractId=${contract.id}&customerId=${contract.customer?.id || ''}`),
                        icon: Plus,
                    }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px' }}>
                    {/* Left: Details + Work Orders */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Contract Info */}
                        <div style={SC}>
                            <p style={STitle}><FileText size={14} /> تفاصيل العقد</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                {[
                                    { label: 'رقم العقد', value: padded, mono: true },
                                    { label: 'العميل', value: contract.customer?.name || '—' },
                                    { label: 'نوع الخدمة', value: TYPE_LABELS[contract.type] || contract.type },
                                    { label: 'دورية الفوترة', value: BILLING_LABELS[contract.billingCycle] || contract.billingCycle },
                                    { label: 'تاريخ البداية', value: fmtDate(contract.startDate), mono: true },
                                    { label: 'تاريخ الانتهاء', value: fmtDate(contract.endDate), mono: true },
                                    { label: 'قيمة العقد', value: fmtNum(contract.contractValue), mono: true },
                                    { label: 'تجديد تلقائي', value: contract.autoRenew ? 'نعم' : 'لا' },
                                ].map((item, i) => (
                                    <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                                        <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px', fontWeight: 700 }}>{item.label}</div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: C.textPrimary, fontFamily: item.mono ? OUTFIT : CAIRO }}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                            {contract.description && (
                                <div style={{ marginTop: '14px' }}>
                                    <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '6px', fontWeight: 700 }}>الوصف</div>
                                    <p style={{ color: C.textSecondary, fontSize: '13px', lineHeight: 1.7, margin: 0 }}>{contract.description}</p>
                                </div>
                            )}
                            {contract.terms && (
                                <div style={{ marginTop: '14px' }}>
                                    <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '6px', fontWeight: 700 }}>الشروط والبنود</div>
                                    <p style={{ color: C.textSecondary, fontSize: '13px', lineHeight: 1.7, margin: 0 }}>{contract.terms}</p>
                                </div>
                            )}
                        </div>

                        {/* Related Work Orders */}
                        <div style={SC}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <p style={{ ...STitle, margin: 0 }}>أوامر العمل المرتبطة</p>
                                <button
                                    onClick={() => router.push(`/work-orders/new?contractId=${contract.id}&customerId=${contract.customer?.id || ''}`)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '12px', cursor: 'pointer', fontFamily: CAIRO, fontWeight: 600 }}
                                >
                                    <Plus size={13} /> إنشاء أمر عمل
                                </button>
                            </div>
                            {contract.workOrders.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: C.textMuted, fontSize: '13px' }}>
                                    لا توجد أوامر عمل مرتبطة بهذا العقد
                                </div>
                            ) : (
                                <div style={TABLE_STYLE.container}>
                                    <table style={{ ...TABLE_STYLE.table, minWidth: '400px' }}>
                                        <thead style={TABLE_STYLE.thead}>
                                            <tr>
                                                {['رقم الأمر', 'النوع', 'الموعد', 'الحالة'].map((h, i) => (
                                                    <th key={i} style={TABLE_STYLE.th(i === 0)}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contract.workOrders.map((wo, idx) => {
                                                const woBadge = WO_STATUS_BADGE[wo.status] || WO_STATUS_BADGE.new;
                                                const woPadded = `WO-${String(wo.orderNumber).padStart(5, '0')}`;
                                                return (
                                                    <tr
                                                        key={wo.id}
                                                        style={{ ...TABLE_STYLE.row(idx === contract.workOrders.length - 1), cursor: 'pointer' }}
                                                        onClick={() => router.push(`/work-orders/${wo.id}`)}
                                                        onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        <td style={TABLE_STYLE.td(true)}>
                                                            <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.primary, fontSize: '13px' }}>{woPadded}</span>
                                                        </td>
                                                        <td style={TABLE_STYLE.td(false)}>
                                                            <span style={{ color: C.textSecondary, fontSize: '13px' }}>{TYPE_LABELS[wo.type] || wo.type}</span>
                                                        </td>
                                                        <td style={TABLE_STYLE.td(false)}>
                                                            <span style={{ fontFamily: OUTFIT, color: C.textSecondary, fontSize: '13px' }}>{fmtDate(wo.scheduledDate)}</span>
                                                        </td>
                                                        <td style={TABLE_STYLE.td(false)}>
                                                            <span style={{ fontSize: '12px', fontWeight: 600, color: woBadge.color }}>{woBadge.label}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar: Status */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={SC}>
                            <p style={STitle}>حالة العقد</p>
                            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                                <span style={{
                                    display: 'inline-block', padding: '8px 24px', borderRadius: '30px',
                                    fontSize: '14px', fontWeight: 700, fontFamily: CAIRO,
                                    background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
                                }}>{badge.label}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {contract.status === 'draft' && (
                                    <button
                                        onClick={() => changeStatus('active')}
                                        disabled={statusLoading}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '42px', borderRadius: '10px', border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: CAIRO }}
                                    >
                                        <CheckCircle size={15} /> تفعيل العقد
                                    </button>
                                )}
                                {contract.status === 'active' && (
                                    <>
                                        <button
                                            onClick={() => changeStatus('expired')}
                                            disabled={statusLoading}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: CAIRO }}
                                        >
                                            <Clock size={15} /> تحديد كمنتهي
                                        </button>
                                        <button
                                            onClick={() => changeStatus('cancelled')}
                                            disabled={statusLoading}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '42px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: CAIRO }}
                                        >
                                            <XCircle size={15} /> إلغاء العقد
                                        </button>
                                    </>
                                )}
                                {(contract.status === 'expired' || contract.status === 'cancelled') && (
                                    <button
                                        onClick={() => changeStatus('active')}
                                        disabled={statusLoading}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', height: '42px', borderRadius: '10px', border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: CAIRO }}
                                    >
                                        <RefreshCw size={15} /> إعادة تفعيل
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
