'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertTriangle, Loader2, X, Banknote, ChevronDown, Calendar, ArrowLeftCircle, ListFilter, Wallet, Check, Eye } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { THEME, C, CAIRO, INTER, IS, LS, SC, STitle, PAGE_BASE, BTN_PRIMARY, BTN_SUCCESS, BTN_DANGER, TABLE_STYLE, focusIn, focusOut } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';
import { useRouter } from 'next/navigation';

import AppModal from '@/components/AppModal';

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB');
const fmtN = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OverduePage() {
    const router = useRouter();
    const { symbol: cSymbol } = useCurrency();
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
                alert(d.error || 'فشل التحصيل');
            }
        } finally { setCollecting(false); }
    };

    const totalOverdue = installments.reduce((s, i) => s + (i.remaining || 0), 0);

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>

                {/* Page Header (Stand alone) */}
                <PageHeader
                    title="المتأخرات وحالات التعثر"
                    subtitle="الأقساط التي تجاوزت تاريخ استحقاقها وتحتاج متابعة وتحصيل فوري"
                    icon={AlertTriangle}
                />

                {/* Content Container (Table & Header) */}
                <div style={SC}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
                        {/* Filters */}
                        <div style={{ display: 'flex', background: 'rgba(15,23,42,0.4)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '4px', gap: '4px' }}>
                            {[
                                { id: 'current', label: 'الشهر الحالي', icon: <Calendar size={14} /> },
                                { id: 'next', label: 'الشهر القادم', icon: <ArrowLeftCircle size={14} /> },
                                { id: 'all', label: 'كل المتأخرات', icon: <ListFilter size={14} /> },
                            ].map(t => (
                                <button key={t.id} onClick={() => setMonthFilter(t.id)}
                                    style={{
                                        padding: '8px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, transition: 'all 0.2s',
                                        background: monthFilter === t.id ? C.danger : 'transparent',
                                        color: monthFilter === t.id ? '#fff' : C.textSecondary,
                                        boxShadow: monthFilter === t.id ? '0 4px 12px rgba(239,68,68,0.3)' : 'none',
                                    }}>
                                    {t.icon} {t.label}
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
                                <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 800 }}>إجمالي المتأخرات</div>
                                <div style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>
                                    {fmtN(totalOverdue)} <span style={{ fontSize: '10px', fontWeight: 600, color: C.textMuted }}>{cSymbol}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '100px', color: C.textMuted }}>
                            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.danger, margin: '0 auto 16px' }} />
                            <p style={{ fontWeight: 600 }}>جاري استخراج بيانات التعثر...</p>
                        </div>
                    ) : (
                        <div style={TABLE_STYLE.container}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={TABLE_STYLE.table}>
                                    <thead>
                                        <tr style={TABLE_STYLE.thead}>
                                            {['العميل المتأخر', 'رقم الخطة', 'القسط', 'تاريخ الاستحقاق', 'مدة التأخير', 'المبلغ المتبقي', 'إجراء'].map((h, i) => (
                                                <th key={i} style={TABLE_STYLE.th(i === 0)}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {installments.map((inst, idx) => (
                                            <tr key={inst.id} 
                                                style={TABLE_STYLE.row(idx === installments.length - 1)}
                                                onClick={() => router.push(`/installments/${inst.plan?.id}`)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.12)'}>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <div style={{ fontWeight: 800, color: C.textPrimary, fontSize: '14px' }}>
                                                        {inst.plan?.customer?.name}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px', fontFamily: INTER }}>{inst.plan?.customer?.phone}</div>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <div style={{ color: '#5286ed', fontWeight: 900, fontFamily: INTER }}>
                                                        #{inst.plan?.planNumber}
                                                    </div>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    {inst.installmentNo}
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    {fmt(inst.dueDate)}
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <div style={{ 
                                                        display: 'inline-flex', alignItems: 'center', gap: '5px', 
                                                        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800,
                                                        background: 'rgba(239,68,68,0.12)', color: C.danger, border: `1px solid ${C.danger}22`
                                                    }}>
                                                        {inst.daysOverdue} يوم تأخير
                                                    </div>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    {fmtN(inst.remaining || 0)} <span style={{ fontSize: '10px', fontWeight: 400, opacity: 0.6 }}>{cSymbol}</span>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)} onClick={e => e.stopPropagation()}>
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
                                                                fontSize: '11px', fontWeight: 800, cursor: 'pointer', transition: '0.2s',
                                                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                                        >
                                                            تحصيل
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
                                    <div style={{ textAlign: 'center', padding: '80px', color: C.textMuted }}>
                                        <AlertTriangle size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                        <p style={{ fontSize: '15px' }}>لا توجد متأخرات مسجلة حالياً</p>
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
                    title={collectTarget ? `تحصيل القسط الراكد #${collectTarget.installmentNo}` : 'تحصيل قسط'}
                    maxWidth="440px"
                >
                    {collectTarget && (
                        <form onSubmit={handleCollect}>
                            <div style={{ background: 'rgba(251,113,133,0.03)', padding: '16px', borderRadius: '16px', border: `1px solid ${C.danger}20`, marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '12px', color: C.textMuted, fontWeight: 700 }}>العميل المتعثر:</span>
                                    <span style={{ fontSize: '13px', color: C.textPrimary, fontWeight: 800 }}>{collectTarget.plan?.customer?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: C.textMuted, fontWeight: 700 }}>إجمالي المتأخر:</span>
                                    <span style={{ fontSize: '15px', color: C.danger, fontWeight: 900, fontFamily: INTER }}>
                                        {fmtN(collectTarget.remaining || collectTarget.amount)} {cSymbol}
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ ...LS, fontSize: '11.5px', color: C.textMuted, marginBottom: '6px' }}>المبلغ المحصّل حالياً <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" step="any" required value={collectForm.amount} 
                                        onChange={e => setCollectForm(f => ({ ...f, amount: e.target.value }))} 
                                        style={{ ...IS, paddingLeft: '45px', fontSize: '16px', fontWeight: 800, fontFamily: INTER, border: `1px solid ${C.danger}30` }} 
                                        onFocus={focusIn} onBlur={focusOut} 
                                    />
                                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 800, color: C.textMuted }}>{cSymbol}</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ ...LS, fontSize: '11.5px', color: C.textMuted, marginBottom: '10px', display: 'block' }}>جهة توريد المبلغ (خزينة/بنك) <span style={{ color: C.danger }}>*</span></label>
                                
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                    {[
                                        { id: 'cash', label: 'خزينة نقدية', icon: Wallet },
                                        { id: 'bank', label: 'حساب بنكي', icon: Banknote },
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
                                                    border: `1px solid ${isSelectedType ? C.danger : C.border}`,
                                                    background: isSelectedType ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.02)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                }}
                                            >
                                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: isSelectedType ? C.danger : 'rgba(255,255,255,0.05)', color: isSelectedType ? '#fff' : C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <t.icon size={14} />
                                                </div>
                                                <div style={{ fontSize: '11.5px', fontWeight: 800, color: isSelectedType ? C.danger : C.textSecondary }}>{t.label}</div>
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
                                                    .filter(t => t.type === ((collectForm as any).selectedType || treasuries.find(tr => tr.id === collectForm.treasuryId)?.type))
                                                    .map(t => ({ value: t.id, label: t.name }))
                                                }
                                                placeholder="اختر من القائمة..."
                                                style={{ height: '40px' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ ...LS, fontSize: '11.5px', color: C.textMuted, marginBottom: '6px' }}>ملاحظات التسوية (اختياري)</label>
                                <textarea 
                                    placeholder="اكتب أي ملاحظة عن حالة السداد هنا..." 
                                    value={collectForm.notes} 
                                    onChange={e => setCollectForm(f => ({ ...f, notes: e.target.value }))} 
                                    style={{ ...IS, height: '62px', padding: '10px 14px', resize: 'none', background: C.inputBg, fontSize: '12px' }} 
                                    onFocus={focusIn} onBlur={focusOut} 
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" disabled={collecting} 
                                    style={{ ...BTN_DANGER(false, collecting), flex: 1.5, height: '48px', borderRadius: '12px', fontSize: '14px' }}>
                                    {collecting ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><Check size={20} /> تسوية وتحصيل</>}
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
                                    إلغاء
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
