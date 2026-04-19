'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowRight, CreditCard, CheckCircle2, Clock,
    AlertTriangle, Loader2, X, Banknote, Printer, ChevronDown,
    Calendar, TrendingUp, Info, Wallet, DollarSign, Check, Package
} from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { THEME, C, CAIRO, INTER, IS, LS, SC, STitle, PAGE_BASE, BTN_PRIMARY, BTN_SUCCESS, BTN_DANGER, focusIn, focusOut } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';
import AppModal from '@/components/AppModal';

const fmt  = (d: string) => new Date(d).toLocaleDateString('en-GB');
const fmtN = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusColor: Record<string, { bg: string; color: string; label: string }> = {
    paid:    { bg: 'rgba(52,211,153,0.1)',  color: '#34d399', label: 'مدفوع'    },
    partial: { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'جزئي'    },
    pending: { bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6', label: 'قادم'    },
    overdue: { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', label: 'متأخر'   },
};

export default function InstallmentDetailPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router   = useRouter();
    const params   = useParams();
    const id       = params.id as string;
    const { symbol: cSymbol } = useCurrency();

    const [plan, setPlan]           = useState<any>(null);
    const [loading, setLoading]     = useState(true);
    const [treasuries, setTreasuries] = useState<any[]>([]);
    const [collectTarget, setCollectTarget] = useState<any | null>(null);
    const [collectForm, setCollectForm]     = useState({ amount: '', treasuryId: '', notes: '' });
    const [collecting, setCollecting]       = useState(false);
    const [showCancel,  setShowCancel]  = useState(false);
    const [cancelForm,  setCancelForm]  = useState({ refundTreasuryId: '' });
    const [cancelling,  setCancelling]  = useState(false);
    const [showSettle,  setShowSettle]  = useState(false);
    const [settleForm,  setSettleForm]  = useState({ amount: '', treasuryId: '', notes: '' });
    const [settling,    setSettling]    = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [pRes, tRes] = await Promise.all([
                fetch(`/api/installments/${id}`),
                fetch('/api/treasuries'),
            ]);
            if (pRes.ok) setPlan(await pRes.json());
            if (tRes.ok) setTreasuries(await tRes.json());
        } catch { } finally { setLoading(false); }
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCollect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!collectTarget || !collectForm.amount) return;
        setCollecting(true);
        try {
            const res = await fetch('/api/installments/collect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    installmentId: collectTarget.id,
                    paidAmount:    parseFloat(collectForm.amount),
                    treasuryId:    collectForm.treasuryId || undefined,
                    notes:         collectForm.notes,
                }),
            });
            if (res.ok) {
                setCollectTarget(null);
                setCollectForm({ amount: '', treasuryId: '', notes: '' });
                fetchData();
            } else {
                const d = await res.json();
                alert(d.error || t('فشل التحصيل'));
            }
        } finally { setCollecting(false); }
    };

    const handleCancel = async (e: React.FormEvent) => {
        e.preventDefault();
        setCancelling(true);
        try {
            const res = await fetch('/api/installments/cancel', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    planId:           plan.id,
                    refundTreasuryId: cancelForm.refundTreasuryId || undefined,
                }),
            });
            if (res.ok) { setShowCancel(false); fetchData(); }
            else { const d = await res.json(); alert(d.error || t('فشل')); }
        } finally { setCancelling(false); }
    };

    const handleSettle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settleForm.amount || !settleForm.treasuryId) return;
        setSettling(true);
        try {
            const res = await fetch('/api/installments/settle', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    planId:     plan.id,
                    paidAmount: parseFloat(settleForm.amount),
                    treasuryId: settleForm.treasuryId,
                    notes:      settleForm.notes,
                }),
            });
            if (res.ok) { setShowSettle(false); fetchData(); }
            else { const d = await res.json(); alert(d.error || t('فشل التكييش')); }
        } finally { setSettling(false); }
    };

    const handlePrint = () => {
        if (!plan) return;
        const { printInstallmentPlan } = require('@/lib/printInvoices');
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                printInstallmentPlan(plan, data.company || {});
            });
    };

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.textMuted }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } `}</style>
        </DashboardLayout>
    );

    if (!plan) return (
        <DashboardLayout>
            <div style={{ textAlign: 'center', padding: '100px', color: C.textMuted }}>
                <AlertTriangle size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                <p style={{ fontSize: '18px', fontWeight: 600 }}>{t('عذراً، الخطة غير موجودة')}</p>
                <button onClick={() => router.push('/installments')} style={{ marginTop: '20px', color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>{t('العودة للقائمة')}</button>
            </div>
        </DashboardLayout>
    );

    const paidCount    = plan.installments?.filter((i: any) => i.status === 'paid').length || 0;
    const totalPaid    = plan.installments?.reduce((s: number, i: any) => s + (i.paidAmount || 0), 0) || 0;
    const totalRemain  = plan.installments?.filter((i: any) => i.status !== 'paid' && i.status !== 'cancelled')
        .reduce((s: number, i: any) => s + (i.remaining || 0), 0) || 0;
    const overdueCount = plan.installments?.filter((i: any) =>
        i.status !== 'paid' && i.status !== 'cancelled' && new Date(i.dueDate) < new Date()).length || 0;

    const isCancelled = plan.status === 'cancelled';
    const progressPct = (paidCount / plan.monthsCount) * 100;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={() => router.push('/installments')} 
                            style={{ 
                                width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', 
                                border: `1px solid ${C.border}`, color: C.textSecondary,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                            <ArrowRight size={22} />
                        </button>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: isCancelled ? 'rgba(239,68,68,0.1)' : C.primaryBg, color: isCancelled ? C.danger : C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={22} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h1 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: C.textPrimary }}>{t('خطة تقسيط')} <span style={{ color: '#5286ed' }}>PLAN-{String(plan.planNumber || 1).padStart(4, '0')}</span></h1>
                                {isCancelled && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(239,68,68,0.1)', color: C.danger, border: `1px solid ${C.danger}20`, fontWeight: 800 }}>{t('ملغاة')}</span>}
                            </div>
                            <p style={{ fontSize: '13px', color: C.textMuted, margin: '2px 0 0', fontWeight: 600 }}>{t('تتبع دورة التحصيل وعمليات السداد للخطة')}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {plan.status === 'active' && (
                            <>
                                <button onClick={() => {
                                    const remPrinc = (plan.installments || []).filter((i:any)=>i.status !== 'paid').reduce((s:number,i:any)=>s+i.principal, 0);
                                    const firstCash = treasuries.find(t => t.type === 'cash') || treasuries[0];
                                    setSettleForm({ amount: remPrinc.toFixed(2), treasuryId: firstCash?.id || '', notes: t('سداد مبلغ الأصل المتبقي (تكييش)') });
                                    setShowSettle(true);
                                }} 
                                style={{ ...BTN_PRIMARY(false, false), height: '42px', width: 'auto', padding: '0 20px', fontSize: '13px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}>
                                    <DollarSign size={16} /> {t('سداد معجل')}
                                </button>
                                <button onClick={() => setShowCancel(true)} style={{ ...BTN_DANGER(false, false), height: '42px', width: 'auto', padding: '0 20px', fontSize: '13px' }}>
                                    <X size={16} /> {t('إلغاء الخطة')}
                                </button>
                            </>
                        )}
                        <button onClick={handlePrint} style={{ ...BTN_SUCCESS(false, false), height: '42px', width: 'auto', padding: '0 20px', fontSize: '13px' }}>
                            <Printer size={16} /> {t('طباعة الجدول')}
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
                    
                    {/* Left Side: Installments Table */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Progress Panel */}
                        {!isCancelled && (
                            <div style={{ ...SC, background: 'linear-gradient(135deg, rgba(37,106,244,0.05), rgba(37,106,244,0.02))', border: `1px solid ${C.primaryBorder}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: C.primary, fontWeight: 800, fontSize: '14px' }}>
                                        <TrendingUp size={16} /> {t('مؤشر تقدم التحصيل')}
                                    </div>
                                    <div style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 700, fontFamily: INTER }}>
                                        <span style={{ color: C.textPrimary }}>{paidCount}</span> / <span style={{ color: C.textMuted }}>{plan.monthsCount}</span> {t('قسط مدفوع')}
                                    </div>
                                </div>
                                <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{ 
                                        width: `${progressPct}%`, height: '100%', 
                                        background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', 
                                        borderRadius: '10px', transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
                                        boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px', color: C.textMuted, fontWeight: 700 }}>
                                    <span>{progressPct.toFixed(1)}% {t('مكتمل')}</span>
                                    <span>{t('المتبقي')} {plan.monthsCount - paidCount} {t('شهر')}</span>
                                </div>
                            </div>
                        )}

                        {/* Table Listing */}
                        <div style={SC}>
                            <div style={STitle}><Info size={16} /> جدول استحقاق الأقساط</div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', color: C.textPrimary }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                                            {['رقم القسط', 'تاريخ الاستحقاق', 'المبلغ المستحق', 'المدفوع', 'المتبقي', 'الحالة', 'إجراء'].map((h, i) => (
                                                <th key={i} style={{ padding: '16px', textAlign: 'start', fontSize: '12px', fontWeight: 700, color: C.textMuted }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(plan.installments || []).map((inst: any, idx: number) => {
                                            const isOverdue = inst.status !== 'paid' && inst.status !== 'cancelled' && new Date(inst.dueDate) < new Date();
                                            const st = isOverdue ? statusColor.overdue : (statusColor[inst.status] || statusColor.pending);
                                            return (
                                                <tr key={inst.id} style={{ borderBottom: idx < (plan.installments.length - 1) ? `1px solid ${C.border}` : 'none', opacity: inst.status === 'cancelled' ? 0.4 : 1, transition: '0.2s' }}
                                                    onMouseEnter={e => inst.status !== 'cancelled' && (e.currentTarget.style.background = C.hover)}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={{ padding: '16px', fontWeight: 800, color: C.primary, fontFamily: INTER }}>
                                                        {inst.installmentNo}
                                                    </td>
                                                    <td style={{ padding: '16px', color: isOverdue ? C.danger : C.textSecondary, fontWeight: 600, fontFamily: INTER }}>
                                                        {fmt(inst.dueDate)}
                                                    </td>
                                                    <td style={{ padding: '16px', fontWeight: 700, fontFamily: INTER }}>
                                                        {fmtN(inst.amount)} <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.6 }}>{cSymbol}</span>
                                                    </td>
                                                    <td style={{ padding: '16px', color: '#10b981', fontWeight: 700, fontFamily: INTER }}>
                                                        {fmtN(inst.paidAmount || 0)} <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.6 }}>{cSymbol}</span>
                                                    </td>
                                                    <td style={{ padding: '16px', color: (inst.remaining || 0) > 0 ? C.warning : '#10b981', fontWeight: 800, fontFamily: INTER }}>
                                                        {fmtN(inst.remaining || 0)} <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.6 }}>{cSymbol}</span>
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        <div style={{ 
                                                            display: 'inline-flex', alignItems: 'center', gap: '5px', 
                                                            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800,
                                                            background: st.bg, color: st.color, border: `1px solid ${st.color}20`
                                                        }}>
                                                            {t(st.label)}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        {inst.status !== 'paid' && inst.status !== 'cancelled' && !isCancelled && (
                                                            <button onClick={() => { 
                                                                setCollectTarget(inst); 
                                                                const amt = (inst.remaining || inst.amount).toFixed(2);
                                                                const firstCash = treasuries.find(t => t.type === 'cash');
                                                                const defTr = firstCash || treasuries[0];
                                                                setCollectForm({ 
                                                                    amount: amt, 
                                                                    treasuryId: defTr?.id || '', 
                                                                    selectedType: defTr?.type || 'cash',
                                                                    notes: '' 
                                                                } as any); 
                                                            }}
                                                                style={{ height: '32px', padding: '0 14px', borderRadius: '8px', border: 'none', background: C.primary, color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}
                                                                onMouseEnter={e => e.currentTarget.style.background = C.primaryHover}
                                                                onMouseLeave={e => e.currentTarget.style.background = C.primary}
                                                            >
                                                                {t('تحصيل القسط')}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Quick Stats & Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '24px' }}>
                        
                        {/* Plan Details */}
                        <div style={SC}>
                            <div style={{ ...STitle, fontSize: '12.5px' }}><Info size={14} /> {t('بيانات العقد')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', paddingBottom: '10px', borderBottom: `1px solid ${C.border}`, marginBottom: '2px' }}>
                                        <span style={{ color: C.textMuted }}>{t('صاحب التعاقد :')}</span>
                                        <span style={{ color: C.primary, fontWeight: 900, fontSize: '14px' }}>{plan.customer?.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span style={{ color: C.textMuted }}>{t('تاريخ البداية :')}</span>
                                        <span style={{ color: C.textPrimary, fontWeight: 700, fontFamily: INTER }}>{fmt(plan.startDate)}</span>
                                    </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <span style={{ color: C.textMuted }}>{t('المنتج :')}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.primary, fontWeight: 800 }}>
                                        <Package size={13} /> {plan.productName || '—'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <span style={{ color: C.textMuted }}>{t('القسط الشهري :')}</span>
                                    <span style={{ color: C.primary, fontWeight: 900, fontSize: '14.5px', fontFamily: INTER }}>
                                        {fmtN(plan.installmentAmount)} {cSymbol}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <span style={{ color: C.textMuted }}>{t('نسبة الفائدة :')}</span>
                                    <span style={{ color: C.textPrimary, fontWeight: 800, fontFamily: INTER }}>{plan.interestRate || 0}%</span>
                                </div>
                                {plan.notes && (
                                    <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: `1px solid ${C.border}`, fontSize: '11.5px', color: C.textSecondary, lineHeight: 1.5 }}>
                                        <strong>{t('ملاحظات:')}</strong> {plan.notes}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div style={SC}>
                            <div style={{ ...STitle, fontSize: '12.5px' }}><TrendingUp size={14} /> {t('الخلاصة المالية')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[
                                    { label: t('قيمة المنتج الإجمالية :'), value: plan.totalAmount, color: C.textPrimary, icon: Package },
                                    { label: t('الدفعة المقدمة :'), value: plan.downPayment, color: '#10b981', icon: Banknote },
                                    { label: t('المتبقي بعد المقدم :'), value: (plan.totalAmount - (plan.downPayment || 0)), color: C.textSecondary, icon: CreditCard },
                                    { label: t('إجمالي مبلغ الخطة :'), value: plan.grandTotal, color: C.textPrimary, icon: DollarSign },
                                    { label: t('إجمالي ما تم تحصيله :'), value: totalPaid, color: '#10b981', icon: CheckCircle2 },
                                    { label: t('المتبقي تحت التحصيل :'), value: totalRemain, color: C.warning, icon: Wallet },
                                    { label: t('متأخرات حالية :'), value: overdueCount, color: C.danger, icon: AlertTriangle, unit: t('قسط') },
                                ].map((s, i) => (
                                    <div key={i} style={{ 
                                        padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.015)', 
                                        border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <s.icon size={13} />
                                            </div>
                                            <span style={{ fontSize: '11.5px', color: C.textSecondary, fontWeight: 700 }}>{s.label}</span>
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: s.color, fontFamily: INTER }}>
                                            {typeof s.value === 'number' ? fmtN(s.value) : s.value} 
                                            <span style={{ fontSize: '9px', fontWeight: 600, opacity: 0.6, marginInlineEnd: '3px' }}>{s.unit || cSymbol}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals Section */}
                {/* Collect Installment Modal (Redesigned with AppModal) */}
                <AppModal
                    show={!!collectTarget}
                    onClose={() => setCollectTarget(null)}
                    title={collectTarget ? `${t('تحصيل القسط')} #${collectTarget.installmentNo}` : t('تحصيل قسط')}
                    maxWidth="440px"
                >
                    {collectTarget && (
                        <form onSubmit={handleCollect}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '12px', color: C.textMuted, fontWeight: 700 }}>{t('العميل:')}</span>
                                    <span style={{ fontSize: '13px', color: C.textPrimary, fontWeight: 800 }}>{plan.customer?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: C.textMuted, fontWeight: 700 }}>{t('المقرر تحصيله:')}</span>
                                    <span style={{ fontSize: '14px', color: C.primary, fontWeight: 900, fontFamily: INTER }}>
                                        {fmtN(collectTarget.remaining || collectTarget.amount)} <span style={{ fontSize: '10px', fontWeight: 400 }}>{cSymbol}</span>
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ ...LS, fontSize: '11px', color: C.textMuted, marginBottom: '6px' }}>{t('المبلغ المحصّل')} <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" step="any" required value={collectForm.amount} 
                                        onChange={e => setCollectForm(f => ({ ...f, amount: e.target.value }))} 
                                        style={{ ...IS, paddingInlineStart: '45px', fontSize: '16px', fontWeight: 800, fontFamily: INTER }} 
                                        onFocus={focusIn} onBlur={focusOut} 
                                    />
                                    <span style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 800, color: C.textMuted }}>{cSymbol}</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ ...LS, fontSize: '11px', color: C.textMuted, marginBottom: '10px', display: 'block' }}>{t('جهة التحصيل (خزينة/بنك)')} <span style={{ color: C.danger }}>*</span></label>
                                
                                {/* Step 1: Selection Type */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                    {[
                                        { id: 'cash', label: t('خزينة نقدية'), icon: Wallet },
                                        { id: 'bank', label: t('حساب بنكي'), icon: Banknote },
                                    ].map(t => {
                                        const typeMatch = treasuries.find(tr => tr.id === collectForm.treasuryId)?.type === t.id;
                                        const isSelectedType = (collectForm as any).selectedType === t.id || typeMatch;
                                        return (
                                            <div key={t.id} 
                                                onClick={() => {
                                                    const firstTr = treasuries.find(tr => tr.type === t.id);
                                                    setCollectForm(f => ({ ...f, treasuryId: firstTr?.id || '', selectedType: t.id } as any));
                                                }}
                                                style={{
                                                    flex: 1, padding: '10px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: '0.2s',
                                                    border: `1px solid ${isSelectedType ? C.primary : C.border}`,
                                                    background: isSelectedType ? 'rgba(37,106,244,0.12)' : 'rgba(255,255,255,0.02)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                }}
                                            >
                                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: isSelectedType ? C.primary : 'rgba(255,255,255,0.05)', color: isSelectedType ? '#fff' : C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <t.icon size={14} />
                                                </div>
                                                <div style={{ fontSize: '11.5px', fontWeight: 800, color: isSelectedType ? C.primary : C.textSecondary }}>{t.label}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Step 2: Specific Dropdown */}
                                {((collectForm as any).selectedType || treasuries.find(tr => tr.id === collectForm.treasuryId)?.type) && (
                                    <div style={{ animation: 'fadeIn 0.2s' }}>
                                        <div style={{ position: 'relative', '--surface-50': C.card, '--surface-100': C.inputBg, '--border-subtle': C.border } as any}>
                                            <CustomSelect
                                                value={collectForm.treasuryId}
                                                onChange={v => setCollectForm(f => ({ ...f, treasuryId: v }))}
                                                options={treasuries
                                                    .filter(t => t.type === ((collectForm as any).selectedType || treasuries.find(tr => tr.id === collectForm.treasuryId)?.type))
                                                    .map(t => ({ value: t.id, label: t.name }))
                                                }
                                                placeholder={t("اختر من القائمة...")}
                                                style={{ height: '40px' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ ...LS, fontSize: '11px', color: C.textMuted, marginBottom: '6px' }}>{t('ملاحظات التحصيل (اختياري)')}</label>
                                <textarea 
                                    placeholder={t("اكتب أي ملاحظات هنا...")}
                                    value={collectForm.notes} 
                                    onChange={e => setCollectForm(f => ({ ...f, notes: e.target.value }))} 
                                    style={{ ...IS, height: '62px', padding: '10px 14px', resize: 'none', background: C.inputBg, fontSize: '12px' }} 
                                    onFocus={focusIn} onBlur={focusOut} 
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" disabled={collecting} 
                                    style={{ ...BTN_PRIMARY(false, collecting), flex: 1.5, height: '46px', borderRadius: '12px', fontSize: '14px' }}>
                                    {collecting ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><Check size={20} /> {t('تأكيد التحصيل')}</>}
                                </button>
                                <button type="button" onClick={() => setCollectTarget(null)} 
                                    style={{ 
                                        flex: 1, borderRadius: '12px', border: `1px solid ${C.border}`, 
                                        background: 'rgba(255,255,255,0.03)', color: C.textSecondary, 
                                        fontWeight: 800, cursor: 'pointer', transition: '0.2s', fontSize: '14px' 
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                >
                                    {t('إلغاء')}
                                </button>
                            </div>
                        </form>
                    )}
                </AppModal>

                {/* settle Plan Modal */}
                <AppModal
                    show={showSettle}
                    onClose={() => !settling && setShowSettle(false)}
                    title={t("سداد معجل للخطة")}
                    icon={DollarSign}
                    maxWidth="500px"
                >
                    {plan && (
                        <form onSubmit={handleSettle}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <p style={{ fontSize: '14px', color: C.textSecondary, marginBottom: '10px' }}>
                                    {t('سيتم إغلاق الخطة بالكامل وتحصيل مبلغ الأصل المتبقي فقط.')}
                                </p>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '15px', border: `1px solid ${C.border}` }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>{t('الأصل المتبقي')}</div>
                                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#10b981', fontFamily: INTER }}>
                                            {fmtN((plan.installments || []).filter((i:any)=>i.status !== 'paid').reduce((s:number,i:any)=>s+i.principal, 0))} <span style={{ fontSize: '10px' }}>{cSymbol}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '4px' }}>{t('الفوائد المتبقية')}</div>
                                        <div style={{ fontSize: '16px', fontWeight: 900, color: C.danger, fontFamily: INTER }}>
                                            {fmtN((plan.installments || []).filter((i:any)=>i.status !== 'paid').reduce((s:number,i:any)=>s+i.interest, 0))} <span style={{ fontSize: '10px' }}>{cSymbol}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={LS}>{t('مبلغ السداد الحالي (الأصل)')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" step="any" required value={settleForm.amount} 
                                        onChange={e => setSettleForm(f => ({ ...f, amount: e.target.value }))}
                                        style={{ ...IS, paddingInlineStart: '45px', fontSize: '18px', fontWeight: 900, fontFamily: INTER, textAlign: 'center' }}
                                    />
                                    <span style={{ position: 'absolute', insetInlineStart: '15px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: C.textMuted }}>{cSymbol}</span>
                                </div>
                                <p style={{ fontSize: '11px', color: C.textMuted, marginTop: '5px', textAlign: 'center' }}>💡 {t('سيتم التنازل عن الفوائد المتبقية للعميل عند التكييش.')}</p>
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={LS}>{t('خزينة التحصيل')}</label>
                                <CustomSelect 
                                    value={settleForm.treasuryId}
                                    onChange={v => setSettleForm(f => ({ ...f, treasuryId: v }))}
                                    options={treasuries.map(t_tr => ({ value: t_tr.id, label: t_tr.name, sub: t_tr.type === 'bank' ? t('حساب بنكي') : t('خزينة نقدية') }))}
                                    placeholder={t("اختر الخزينة...")}
                                />
                            </div>

                            <div style={{ marginBottom: '25px' }}>
                                <label style={LS}>{t('ملاحظات')}</label>
                                <textarea 
                                    value={settleForm.notes}
                                    onChange={e => setSettleForm(f => ({ ...f, notes: e.target.value }))}
                                    style={{ ...IS, height: '60px', padding: '10px' }}
                                    placeholder={t("ملاحظات اختيارية...")}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="submit" disabled={settling} style={{ ...BTN_PRIMARY(false, settling), flex: 1.5, height: '48px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}>
                                    {settling ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : t('تأكيد السداد وإغلاق الخطة')}
                                </button>
                                <button type="button" onClick={() => setShowSettle(false)} style={{ flex: 1, borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 700 }}>{t('إلغاء')}</button>
                            </div>
                        </form>
                    )}
                </AppModal>

                {/* Cancel Plan Modal */}
                <AppModal
                    show={showCancel}
                    onClose={() => !cancelling && setShowCancel(false)}
                    title={t('إلغاء وإسقاط خطة التقسيط')}
                    icon={AlertTriangle}
                    variant="danger"
                    maxWidth="500px"
                >
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <p style={{ margin: 0, fontSize: '13px', color: C.textMuted }}>
                            {t('رقم الخطة:')} <span style={{ color: '#5286ed', fontWeight: 700 }}>#{plan.planNumber}</span> — {t('للعميل:')} {plan.customer?.name}
                        </p>
                    </div>

                    <div style={{ background: C.subtle, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {[
                                { label: t('إجمالي الخطة'), value: fmtN(plan.grandTotal), color: C.textPrimary },
                                { label: t('المحصّل فعلياً'), value: fmtN(totalPaid), color: '#10b981' },
                                { label: t('المبلغ المتبقي'), value: fmtN(plan.grandTotal - totalPaid), color: C.danger },
                                { label: t('أقساط قادمة للغلق'), value: (plan.monthsCount - paidCount), color: C.textPrimary, unit: t('قسط') },
                            ].map((item, i) => (
                                <div key={i} style={{ padding: '10px', background: C.card, borderRadius: '12px', textAlign: 'center', border: `1px solid ${C.border}` }}>
                                    <div style={{ fontSize: '10px', color: C.textMuted, marginBottom: '4px' }}>{item.label}</div>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: item.color, fontFamily: INTER }}>{item.value} <span style={{ fontSize: '9px', fontWeight: 400, opacity: 0.6 }}>{item.unit || cSymbol}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleCancel}>
                        {totalPaid > 0 ? (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={LS}>{t('جهة رد المبالغ المحصّلة')} ({fmtN(totalPaid)} {cSymbol})</label>
                                <CustomSelect 
                                    value={cancelForm.refundTreasuryId} 
                                    onChange={v => setCancelForm(f => ({ ...f, refundTreasuryId: v }))}
                                    options={[
                                        { value: '', label: t('-- تحويل المبلغ لرصيد دائن للعميل --') },
                                        ...treasuries.map(t_tr => ({ value: t_tr.id, label: t_tr.name, sub: `${t('رصيد متاح:')} ${fmtN(t_tr.balance)} ${cSymbol}` }))
                                    ]}
                                    placeholder={t("اختر الخزينة للرد النقدي...")}
                                    icon={Wallet}
                                />
                                <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '8px', lineHeight: 1.5 }}>⚠️ {t('إذا لم تختر خزينة، سيتم تحويل الإجمالي المدفوع إلى رصيد دائن في حساب العميل.')}</div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '12px', fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={16} /> {t('لا توجد مبالغ مدفوعة — سيتم إغلاق الخطة مباشرة.')}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={cancelling} style={{ ...BTN_DANGER(false, cancelling), flex: 1.5 }}>
                                {cancelling ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><X size={18} /> {t('تأكيد الإلغاء النهائي')}</>}
                            </button>
                            <button type="button" onClick={() => setShowCancel(false)} disabled={cancelling} 
                                style={{ 
                                    flex: 1, height: '52px', borderRadius: '14px', 
                                    border: `1px solid ${C.border}`, background: C.subtle, 
                                    color: C.textSecondary, fontWeight: 700, cursor: 'pointer',
                                    transition: 'all 0.2s', fontFamily: CAIRO
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = C.textPrimary; }}
                                onMouseLeave={e => { e.currentTarget.style.background = C.subtle; e.currentTarget.style.color = C.textSecondary; }}
                            >{t('تراجع')}</button>
                        </div>
                    </form>
                </AppModal>
            </div>
        </div>
            <style jsx global>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.2); border-radius: 10px; }
            `}</style>
        </DashboardLayout>
    );
}
