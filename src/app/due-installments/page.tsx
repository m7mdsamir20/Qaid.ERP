'use client';
import { formatNumber } from '@/lib/currency';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { Clock, Loader2, AlertTriangle, X, Banknote, ChevronDown, Calendar, ArrowLeftCircle, ListFilter, Wallet, Check, Eye } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { THEME, C, CAIRO, OUTFIT, IS, LS, SC, STitle, PAGE_BASE, BTN_PRIMARY, BTN_SUCCESS, TABLE_STYLE, focusIn, focusOut } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';
import AppModal from '@/components/AppModal';
import DataTable from '@/components/DataTable';

const fmt = (d: string, lang: string) => new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB');
const fmtN = (n: number) => formatNumber(n);

export default function DuePage() {
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
                ? '/api/installments/due'
                : `/api/installments/due?month=${monthFilter}`;

            const [dRes, tRes] = await Promise.all([
                fetch(url),
                fetch('/api/treasuries'),
            ]);
            if (dRes.ok) setInstallments(await dRes.json());
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

    const totalDue = installments.reduce((s, i) => s + (i.remaining || 0), 0);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>

                {/* Header Section */}
                <PageHeader
                    title={t("الأقساط المستحقة")}
                    subtitle={t("متابعة وجدولة عمليات التحصيل القادمة والجارية — تتبع المواعيد")}
                    icon={Clock}
                />

                {/* Content Container (Table & Header) */}
                <div style={{ ...SC, background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
                    <div className="installments-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
                        {/* Filters */}
                        <div className="installments-filter" style={{ display: 'flex', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '4px', gap: '4px' }}>
                            {[
                                { id: 'current', label: t('الشهر الحالي'), icon: <Calendar size={14} /> },
                                { id: 'next', label: t('الشهر القادم'), icon: <ArrowLeftCircle size={14} /> },
                                { id: 'all', label: t('كافة الأقساط'), icon: <ListFilter size={14} /> },
                            ].map(t => (
                                <button key={t.id} onClick={() => setMonthFilter(t.id)}
                                    style={{
                                        flex: 1, padding: '8px 12px', borderRadius: '9px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: CAIRO, transition: 'all 0.2s',
                                        background: monthFilter === t.id ? C.primary : 'transparent',
                                        color: monthFilter === t.id ? '#fff' : C.textSecondary,
                                        boxShadow: monthFilter === t.id ? '0 4px 12px rgba(37,106,244,0.3)' : 'none',
                                    }}>
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Integrated KPI Card */}
                        <div className="installments-kpi" style={{
                            minWidth: '220px', background: 'rgba(37,106,244,0.05)', border: `1px solid ${C.primaryBorder}`, borderRadius: '12px',
                            padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', overflow: 'hidden'
                        }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: C.primaryBg, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Wallet size={16} />
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: C.textSecondary, fontWeight: 600 }}>{t('إجمالي المستحق حالياً')}</div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>
                                    {fMoneyJSX(totalDue)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DataTable
                        columns={[
                            {
                                header: t('العميل المستفيد'),
                                type: 'text',
                                cell: (row) => (
                                    <div style={{ textAlign: 'start' }}>
                                        <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px' }}>{row.customer?.name}</div>
                                        <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px', fontFamily: OUTFIT, direction: 'ltr', textAlign: 'right' }}>{row.customer?.phone}</div>
                                    </div>
                                )
                            },
                            {
                                header: t('رقم الخطة'),
                                type: 'number',
                                cell: (row) => (
                                    <span style={{ color: '#5286ed', fontWeight: 600, fontFamily: OUTFIT, display: 'inline-block', direction: 'ltr' }}>PLAN-{String(row.plan?.planNumber || 1).padStart(4, '0')}</span>
                                )
                            },
                            {
                                header: t('رقم القسط'),
                                type: 'number',
                                cell: (row) => row.installmentNo
                            },
                            {
                                header: t('تاريخ الاستحقاق'),
                                type: 'number',
                                cell: (row) => fmt(row.dueDate, lang)
                            },
                            {
                                header: t('المبلغ المقرر'),
                                type: 'number',
                                cell: (row) => fMoneyJSX(row.amount)
                            },
                            {
                                header: t('المتبقي'),
                                type: 'number',
                                cell: (row) => fMoneyJSX(row.remaining || 0)
                            },
                            {
                                header: t('الحالة'),
                                type: 'number',
                                cell: (row) => {
                                    const isOverdue = new Date(row.dueDate) < new Date();
                                    return (
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 600,
                                            background: isOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                                            color: isOverdue ? C.danger : C.warning, border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.22)' : 'rgba(245,158,11,0.22)'}`
                                        }}>
                                            {isOverdue ? <AlertTriangle size={10} /> : <Clock size={10} />}
                                            {isOverdue ? t('متأخر') : t('قادم')}
                                        </div>
                                    );
                                }
                            },
                            {
                                header: t('إجراء'),
                                type: 'number',
                                cell: (row) => {
                                    const isOverdue = new Date(row.dueDate) < new Date();
                                    return (
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                                            <button onClick={() => {
                                                setCollectTarget(row);
                                                const amt = (row.remaining || row.amount || 0).toFixed(2);
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
                                                    background: isOverdue ? C.danger : C.primary, color: 'white',
                                                    fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: '0.2s',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                            >
                                                {t('تحصيل')}
                                            </button>
                                            <button onClick={() => router.push(`/installments/${row.plan?.id}`)}
                                                style={{ width: 32, height: 32, borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', color: C.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.color = C.primary}
                                                onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}
                                            >
                                                <Eye size={15} />
                                            </button>
                                        </div>
                                    );
                                }
                            }
                        ]}
                        data={installments}
                        emptyIcon={Clock}
                        emptyMessage={t('لا توجد أقساط مستحقة للفترة المختارة')}
                        isLoading={loading}
                        onRowClick={(row) => router.push(`/installments/${row.plan?.id}`)}
                    />
                </div>

                {/* Collection Modal (Redesigned with AppModal) */}
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
                                    <span style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 700 }}>{t('العميل')}:</span>
                                    <span style={{ fontSize: '13px', color: C.textPrimary, fontWeight: 600 }}>{collectTarget.customer?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 700 }}>{t('المقرر سداده')}:</span>
                                    <span style={{ fontSize: '13px', color: C.primary, fontWeight: 600, fontFamily: OUTFIT }}>
                                        {fMoneyJSX(collectTarget.remaining || collectTarget.amount)}
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ ...LS, fontSize: '12px' }}>{t('المبلغ المحصّل')} <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" step="any" required value={collectForm.amount}
                                        onChange={e => setCollectForm(f => ({ ...f, amount: e.target.value }))}
                                        style={{ ...IS, paddingInlineStart: '45px', fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT }}
                                        onFocus={focusIn} onBlur={focusOut}
                                    />
                                    <span style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 600, color: C.textSecondary }}>{cSymbol}</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ ...LS, fontSize: '12px', marginBottom: '10px', display: 'block' }}>{t('جهة التحصيل (خزينة/بنك)')} <span style={{ color: C.danger }}>*</span></label>

                                {/* Step 1: Selection Type (Cash or Bank) */}
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
                                                    flex: 1, padding: '10px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s',
                                                    border: `1px solid ${isSelectedType ? C.primary : C.border}`,
                                                    background: isSelectedType ? 'rgba(37,106,244,0.12)' : 'rgba(255,255,255,0.02)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                }}
                                            >
                                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: isSelectedType ? C.primary : 'rgba(255,255,255,0.05)', color: isSelectedType ? '#fff' : C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <t.icon size={14} />
                                                </div>
                                                <div style={{ fontSize: '11.5px', fontWeight: 600, color: isSelectedType ? C.primary : C.textSecondary }}>{t.label}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Step 2: Specific Dropdown based on Type */}
                                {((collectForm as any).selectedType || treasuries.find(tr => tr.id === collectForm.treasuryId)?.type) && (
                                    <div style={{ animation: 'fadeIn 0.2s' }}>
                                        <label style={{ ...LS, fontSize: '11px', color: C.textSecondary, marginBottom: '6px' }}>
                                            {(collectForm as any).selectedType === 'bank' || treasuries.find(tr => tr.id === collectForm.treasuryId)?.type === 'bank' ? t('اختر البنك المقرر الإيداع فيه') : t('اختر الخزينة النقدية المستلمة')}
                                        </label>
                                        <div style={{ position: 'relative', '--surface-50': C.card, '--surface-100': C.inputBg, '--border-subtle': C.border } as any}>
                                            <CustomSelect
                                                value={collectForm.treasuryId}
                                                onChange={v => setCollectForm(f => ({ ...f, treasuryId: v }))}
                                                options={treasuries
                                                    .filter(t => t.type === ((collectForm as any).selectedType || treasuries.find(tr => tr.id === collectForm.treasuryId)?.type))
                                                    .map(t => ({ value: t.id, label: t.name }))
                                                }
                                                placeholder={t("اضغط لاختيار الجهة...")}
                                                style={{ height: '40px' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ ...LS, fontSize: '11px', color: C.textSecondary, marginBottom: '6px' }}>{t('ملاحظات إضافية (اختياري)')}</label>
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
                                    style={{ ...BTN_PRIMARY(false, collecting), flex: 1.5, height: '46px', borderRadius: '12px', fontSize: '13px' }}>
                                    {collecting ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><Check size={20} /> {t('تأكيد التحصيل')}</>}
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
