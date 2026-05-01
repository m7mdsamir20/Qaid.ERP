'use client';
import { formatNumber } from '@/lib/currency';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertTriangle, Loader2, X, Banknote, ChevronDown, Calendar, ArrowLeftCircle, ListFilter, Wallet, Check, Eye } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { THEME, C, CAIRO, OUTFIT, IS, LS, SC, STitle, PAGE_BASE, BTN_PRIMARY, BTN_SUCCESS, BTN_DANGER, TABLE_STYLE, focusIn, focusOut } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';
import { useRouter } from 'next/navigation';

import AppModal from '@/components/AppModal';

const fmt = (d: string, lang: string) => new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB');
const fmtN = (n: number) => formatNumber(n);

export default function OverduePage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { symbol: cSymbol, fMoneyJSX } = useCurrency();
    const [installments, setInstallments] = useState<any[]>([]);
    const [treasuries, setTreasuries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [monthFilter, setMonthFilter] = useState('current'); // 'current', 'next', 'all'
    const [collectTarget, setCollectTarget] = useState<any | null>(null);
    const [collectForm, setCollectForm] = useState({ amount: '', treasuryId: '', notes: '' });
    const [collecting, setCollecting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const url = monthFilter === 'all'
                ? '/api/installments/reports?type=overdue'
                : `/api/installments/reports?type=overdue&month=${monthFilter}`;

            const [oRes, tRes] = await Promise.all([
                fetch(url),
                fetch('/api/treasuries'),
            ]);
            if (oRes.ok) { const d = await oRes.json(); setInstallments(d.installments || []); }
            if (tRes.ok) setTreasuries(await tRes.json());
        } catch { } finally { setLoading(false); }
    }, [monthFilter]);

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
                    paidAmount: parseFloat(collectForm.amount),
                    treasuryId: collectForm.treasuryId || undefined,
                    notes: collectForm.notes,
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

    const totalOverdue = installments.reduce((s, i) => s + (i.remaining || 0), 0);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>

                {/* Page Header (Stand alone) */}
                <PageHeader
                    title={t("المتأخرات وحالات التعثر")}
                    subtitle={t("الأقساط التي تجاوزت تاريخ استحقاقها وتحتاج متابعة وتحصيل فوري")}
                    icon={AlertTriangle}
                />

                {/* Content Container (Table & Header) */}
                <div style={{ ...SC, background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
                        {/* Filters */}
                        <div style={{ display: 'flex', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '4px', gap: '4px' }}>
                            {[
                                { id: 'current', label: t('الشهر الحالي'), icon: <Calendar size={14} /> },
                                { id: 'next', label: t('الشهر القادم'), icon: <ArrowLeftCircle size={14} /> },
                                { id: 'all', label: t('كل المتأخرات'), icon: <ListFilter size={14} /> },
                            ].map(t_f => (
                                <button key={t_f.id} onClick={() => setMonthFilter(t_f.id)}
                                    style={{
                                        padding: '8px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, transition: 'all 0.2s',
                                        background: monthFilter === t_f.id ? C.danger : 'transparent',
                                        color: monthFilter === t_f.id ? '#fff' : C.textSecondary,
                                        boxShadow: monthFilter === t_f.id ? '0 4px 12px rgba(239,68,68,0.3)' : 'none',
                                    }}>
                                    {t_f.icon} {t_f.label}
                                </button>
                            ))}
                        </div>

                        {/* Integrated KPI Card (Danger themed) */}
                        <div style={{
                            minWidth: '220px', background: 'rgba(251,113,133,0.05)', border: `1px solid ${C.danger}30`, borderRadius: '12px',
                            padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', overflow: 'hidden'
                        }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(251,113,133,0.1)', color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Wallet size={16} />
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 600 }}>{t('إجمالي المتأخرات')}</div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>
                                    {fMoneyJSX(totalOverdue)}
                                </div>
                            </div>
                        </div>
                    </div>
                    {loading ? (
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', color: C.textMuted }}>
                            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.danger, margin: '0 auto 16px' }} />
                            <p style={{ fontWeight: 600 }}>{t('جاري استخراج بيانات التعثر...')}</p>
                        </div>
                    ) : (
                        <div style={{ ...TABLE_STYLE.container, border: `1px solid ${C.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={TABLE_STYLE.table}>
                                    <thead>
                                        <tr style={TABLE_STYLE.thead}>
                                            {[t('العميل المتأخر'), t('رقم الخطة'), t('القسط'), t('تاريخ الاستحقاق'), t('مدة التأخير'), t('المبلغ المتبقي'), t('إجراء')].map((h, i) => (
                                                <th key={i} style={TABLE_STYLE.th(i === 0, i === 6)}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {installments.map((inst, idx) => (
                                            <tr key={inst.id} 
                                                style={TABLE_STYLE.row(idx === installments.length - 1)}
                                                onClick={() => router.push(`/installments/${inst.plan?.id}`)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px' }}>
                                                        {inst.plan?.customer?.name}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px', fontFamily: OUTFIT }}>{inst.plan?.customer?.phone}</div>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <div style={{ color: '#5286ed', fontWeight: 600, fontFamily: OUTFIT }}>
                                                        #{inst.plan?.planNumber}
                                                    </div>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    {inst.installmentNo}
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    {fmt(inst.dueDate, lang)}
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <div style={{ 
                                                        display: 'inline-flex', alignItems: 'center', gap: '5px', 
                                                        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                                                        background: 'rgba(239,68,68,0.12)', color: C.danger, border: `1px solid ${C.danger}22`
                                                    }}>
                                                        {inst.daysOverdue} {t('يوم تأخير')}
                                                    </div>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    {fMoneyJSX(inst.remaining || 0)}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button onClick={() => {
                                                            setCollectTarget(inst);
                                                            const amt = (inst.remaining || inst.amount || 0).toFixed(2);
                                                            const firstCash = treasuries.find(t => t.type === 'cash');
                                                            const defTr = firstCash || treasuries[0];
                                                            setCollectForm({ 
                                                                amount: amt, 
                                                                treasuryId: defTr?.id || '', 
                                                                selectedType: defTr?.type || 'cash',
                                                                notes: '' 
                                                            } as any);
                                                        }}
                                                            style={{ 
                                                                height: '32px', padding: '0 16px', borderRadius: '10px', border: 'none',
                                                                background: C.danger, color: '#fff', 
                                                                fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: '0.2s',
                                                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                        >
                                                            {t('تحصيل')}
                                                        </button>
                                                        <button onClick={() => router.push(`/installments/${inst.plan?.id}`)}
                                                            style={{ width: 32, height: 32, borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', color: C.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                                                            onMouseEnter={e => e.currentTarget.style.color = C.primary}
                                                            onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {installments.length === 0 && (
                                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', color: C.textMuted }}>
                                        <AlertTriangle size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                        <p style={{ fontSize: '15px' }}>{t('لا توجد متأخرات مسجلة حالياً')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Collection Modal (Redesigned with AppModal) */}
                <AppModal
                    show={!!collectTarget}
                    onClose={() => setCollectTarget(null)}
                    title={collectTarget ? `${t('تحصيل القسط الراكد')} #${collectTarget.installmentNo}` : t('تحصيل قسط')}
                    maxWidth="440px"
                >
                    {collectTarget && (
                        <form onSubmit={handleCollect}>
                            <div style={{ background: 'rgba(251,113,133,0.03)', padding: '16px', borderRadius: '16px', border: `1px solid ${C.danger}20`, marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '12px', color: C.textMuted, fontWeight: 700 }}>{t('العميل المتعثر')}:</span>
                                    <span style={{ fontSize: '13px', color: C.textPrimary, fontWeight: 600 }}>{collectTarget.plan?.customer?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: C.textMuted, fontWeight: 700 }}>{t('إجمالي المتأخر')}:</span>
                                    <span style={{ fontSize: '15px', color: C.danger, fontWeight: 600, fontFamily: OUTFIT }}>
                                        {fMoneyJSX(collectTarget.remaining || collectTarget.amount)}
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ ...LS, fontSize: '11.5px', color: C.textMuted, marginBottom: '6px' }}>{t('المبلغ المحصّل حالياً')} <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" step="any" required value={collectForm.amount} 
                                        onChange={e => setCollectForm(f => ({ ...f, amount: e.target.value }))} 
                                        style={{ ...IS, paddingInlineStart: '45px', fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, border: `1px solid ${C.danger}30` }} 
                                        onFocus={focusIn} onBlur={focusOut} 
                                    />
                                    <span style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 600, color: C.textMuted }}>{cSymbol}</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ ...LS, fontSize: '11.5px', color: C.textMuted, marginBottom: '10px', display: 'block' }}>{t('جهة توريد المبلغ (خزينة/بنك)')} <span style={{ color: C.danger }}>*</span></label>
                                
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                    {[
                                        { id: 'cash', label: t('خزينة نقدية'), icon: Wallet },
                                        { id: 'bank', label: t('حساب بنكي'), icon: Banknote },
                                    ].map(t_tr => {
                                        const typeMatch = treasuries.find(tr => tr.id === collectForm.treasuryId)?.type === t_tr.id;
                                        const isSelectedType = (collectForm as any).selectedType === t_tr.id || typeMatch;
                                        return (
                                            <div key={t_tr.id} 
                                                onClick={() => {
                                                    const firstTr = treasuries.find(tr => tr.type === t_tr.id);
                                                    setCollectForm(f => ({ ...f, treasuryId: firstTr?.id || '', selectedType: t_tr.id } as any));
                                                }}
                                                style={{
                                                    flex: 1, padding: '10px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s',
                                                    border: `1px solid ${isSelectedType ? C.danger : C.border}`,
                                                    background: isSelectedType ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.02)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                }}
                                            >
                                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: isSelectedType ? C.danger : 'rgba(255,255,255,0.05)', color: isSelectedType ? '#fff' : C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <t_tr.icon size={14} />
                                                </div>
                                                <div style={{ fontSize: '11.5px', fontWeight: 600, color: isSelectedType ? C.danger : C.textSecondary }}>{t_tr.label}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {((collectForm as any).selectedType || treasuries.find(tr => tr.id === collectForm.treasuryId)?.type) && (
                                    <div style={{ animation: 'fadeIn 0.2s' }}>
                                        <div style={{ position: 'relative', '--surface-50': '#1e293b', '--surface-100': C.inputBg, '--border-subtle': 'rgba(255,255,255,0.1)' } as any}>
                                            <CustomSelect
                                                value={collectForm.treasuryId}
                                                onChange={v => setCollectForm(f => ({ ...f, treasuryId: v }))}
                                                options={treasuries
                                                    .filter(t_o => t_o.type === ((collectForm as any).selectedType || treasuries.find(tr => tr.id === collectForm.treasuryId)?.type))
                                                    .map(t_o => ({ value: t_o.id, label: t_o.name }))
                                                }
                                                placeholder={t("اختر من القائمة...")}
                                                style={{ height: '40px' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ ...LS, fontSize: '11.5px', color: C.textMuted, marginBottom: '6px' }}>{t('ملاحظات التسوية (اختياري)')}</label>
                                <textarea 
                                    placeholder={t("اكتب أي ملاحظة عن حالة السداد هنا...")} 
                                    value={collectForm.notes} 
                                    onChange={e => setCollectForm(f => ({ ...f, notes: e.target.value }))} 
                                    style={{ ...IS, height: '62px', padding: '10px 14px', resize: 'none', background: C.inputBg, fontSize: '12px' }} 
                                    onFocus={focusIn} onBlur={focusOut} 
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" disabled={collecting} 
                                    style={{ ...BTN_DANGER(false, collecting), flex: 1.5, height: '48px', borderRadius: '12px', fontSize: '13px' }}>
                                    {collecting ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><Check size={20} /> {t('تسوية وتحصيل')}</>}
                                </button>
                                <button type="button" onClick={() => setCollectTarget(null)} 
                                    style={{ 
                                        flex: 1, borderRadius: '12px', border: `1px solid ${C.border}`, 
                                        background: 'rgba(255,255,255,0.03)', color: C.textSecondary, 
                                        fontWeight: 600, cursor: 'pointer', transition: '0.2s', fontSize: '13px' 
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
            </div>
            <style jsx global>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}
