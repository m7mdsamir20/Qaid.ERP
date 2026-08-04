'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { useParams } from 'next/navigation';
import { ClipboardList, Loader2, CheckCircle, XCircle, Package } from 'lucide-react';
import { C, CAIRO, OUTFIT, SC, STitle, TABLE_STYLE } from '@/constants/theme';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'معلق', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    approved: { label: 'معتمد', color: '#256af4', bg: 'rgba(37,106,244,0.1)' },
    partially_fulfilled: { label: 'منفذ جزئياً', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
    fulfilled: { label: 'منفذ', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
    rejected: { label: 'مرفوض', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

export default function MaterialRequestDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [mr, setMr] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/material-requests/${id}`);
            if (res.ok) setMr(await res.json());
        } finally { setLoading(false); }
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const changeStatus = async (status: string) => {
        setActionLoading(status);
        setError('');
        try {
            const res = await fetch(`/api/material-requests/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) fetchData();
            else { const d = await res.json(); setError(d.error || 'فشلت العملية'); }
        } catch { setError('حدث خطأ'); }
        finally { setActionLoading(''); }
    };

    if (loading) return (
        <DashboardLayout>
            <div dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px', fontFamily: CAIRO }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                <span style={{ color: C.textSecondary }}>جاري التحميل...</span>
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );

    if (!mr) return (
        <DashboardLayout>
            <div dir="rtl" style={{ textAlign: 'center', padding: '60px', fontFamily: CAIRO, color: C.textSecondary }}>الطلب غير موجود</div>
        </DashboardLayout>
    );

    const status = STATUS_MAP[mr.status] || { label: mr.status, color: C.textSecondary, bg: C.border };

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ fontFamily: CAIRO, paddingBottom: '60px' }}>
                <PageHeader
                    title={`طلب مواد MR-${String(mr.requestNumber).padStart(5, '0')}`}
                    subtitle={mr.project?.name || ''}
                    icon={ClipboardList}
                    backUrl="/material-requests"
                />

                {error && (
                    <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.danger}33`, borderRadius: '10px', color: C.danger, fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', alignItems: 'start' }} className="responsive-grid">
                    {/* Left: details + lines */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Info card */}
                        <div style={SC}>
                            <div style={STitle}><ClipboardList size={14} /> تفاصيل الطلب</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {[
                                    { label: 'رقم الطلب', value: `MR-${String(mr.requestNumber).padStart(5, '0')}` },
                                    { label: 'المشروع', value: mr.project?.name || '—' },
                                    { label: 'المرحلة', value: mr.phase?.name || '—' },
                                    { label: 'تاريخ الطلب', value: new Date(mr.requestDate).toLocaleDateString('en-ZA') },
                                    { label: 'تاريخ المطلوب', value: mr.requiredDate ? new Date(mr.requiredDate).toLocaleDateString('en-ZA') : '—' },
                                    { label: 'طلب بواسطة', value: mr.requestedBy || '—' },
                                ].map((item, i) => (
                                    <div key={i}>
                                        <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '4px' }}>{item.label}</div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>{item.value}</div>
                                    </div>
                                ))}
                                {mr.notes && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '4px' }}>ملاحظات</div>
                                        <div style={{ fontSize: '13px', color: C.textPrimary, background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${C.border}` }}>{mr.notes}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Lines table */}
                        <div style={SC}>
                            <div style={STitle}><Package size={14} /> الأصناف المطلوبة</div>
                            <div style={TABLE_STYLE.container}>
                                <table style={TABLE_STYLE.table}>
                                    <thead style={TABLE_STYLE.thead}>
                                        <tr>
                                            {['الصنف', 'الكمية المطلوبة', 'الكمية المنفذة', 'الوحدة', 'ملاحظات'].map((h, i) => (
                                                <th key={i} style={TABLE_STYLE.th(i === 0)}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mr.lines.map((line: any, idx: number) => (
                                            <tr key={line.id} style={TABLE_STYLE.row(idx === mr.lines.length - 1)}>
                                                <td style={TABLE_STYLE.td(true)}>{line.item?.name || '—'}</td>
                                                <td style={TABLE_STYLE.td(false)}><span style={{ fontFamily: OUTFIT, fontWeight: 700 }}>{line.quantity}</span></td>
                                                <td style={TABLE_STYLE.td(false)}><span style={{ fontFamily: OUTFIT, fontWeight: 700, color: line.fulfilledQty > 0 ? C.success : C.textMuted }}>{line.fulfilledQty}</span></td>
                                                <td style={TABLE_STYLE.td(false)}>{line.unit || '—'}</td>
                                                <td style={TABLE_STYLE.td(false)}>{line.notes || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right: status + actions */}
                    <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={SC}>
                            <div style={STitle}>حالة الطلب</div>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                                <span style={{ display: 'inline-flex', padding: '6px 20px', borderRadius: '30px', fontSize: '13px', fontWeight: 700, background: status.bg, color: status.color, border: `1px solid ${status.color}40` }}>
                                    {status.label}
                                </span>
                            </div>

                            {mr.status === 'pending' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button
                                        onClick={() => changeStatus('approved')}
                                        disabled={!!actionLoading}
                                        style={{ width: '100%', height: '44px', borderRadius: '12px', border: `1px solid ${C.primary}40`, background: 'rgba(37,106,244,0.1)', color: C.primary, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontFamily: CAIRO, transition: 'all 0.2s' }}
                                    >
                                        {actionLoading === 'approved' ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
                                        اعتماد الطلب
                                    </button>
                                    <button
                                        onClick={() => changeStatus('rejected')}
                                        disabled={!!actionLoading}
                                        style={{ width: '100%', height: '44px', borderRadius: '12px', border: `1px solid ${C.danger}40`, background: 'rgba(239,68,68,0.1)', color: C.danger, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontFamily: CAIRO, transition: 'all 0.2s' }}
                                    >
                                        {actionLoading === 'rejected' ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={16} />}
                                        رفض الطلب
                                    </button>
                                </div>
                            )}

                            {mr.status === 'approved' && (
                                <button
                                    onClick={() => changeStatus('fulfilled')}
                                    disabled={!!actionLoading}
                                    style={{ width: '100%', height: '44px', borderRadius: '12px', border: `1px solid ${C.success}40`, background: 'rgba(74,222,128,0.1)', color: C.success, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontFamily: CAIRO, transition: 'all 0.2s' }}
                                >
                                    {actionLoading === 'fulfilled' ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
                                    تأكيد التنفيذ
                                </button>
                            )}
                        </div>

                        {/* Summary */}
                        <div style={SC}>
                            <div style={STitle}>ملخص</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: C.textSecondary }}>عدد الأصناف</span>
                                    <span style={{ fontFamily: OUTFIT, fontWeight: 700 }}>{mr.lines.length}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: C.textSecondary }}>إجمالي الكميات</span>
                                    <span style={{ fontFamily: OUTFIT, fontWeight: 700 }}>{mr.lines.reduce((s: number, l: any) => s + l.quantity, 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
