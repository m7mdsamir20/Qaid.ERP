'use client';
import { formatNumber } from '@/lib/currency';
import React, { useState, useEffect, useCallback } from 'react';
import { Currency } from '@/components/Currency';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { PieChart, Plus, Loader2, X, TrendingUp, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, History, Percent, Banknote, Users, Info, DollarSign, Wallet } from 'lucide-react';
import { C, CAIRO, OUTFIT, TABLE_STYLE, SEARCH_STYLE, KPI_STYLE, KPI_ICON, focusIn, focusOut, PAGE_BASE, IS, LS, BTN_PRIMARY, BTN_DANGER } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import { useCurrency } from '@/hooks/useCurrency';

interface Partner { id: string; name: string; share: number; capital: number; balance: number; }
interface Distribution { id: string; date: string; totalAmount: number; period: string; notes?: string; paidFromTreasury?: boolean; lines: { partnerName: string; amount: number; share: number }[]; }
interface Treasury { id: string; name: string; type: string; balance: number; }

export default function ProfitDistributionPage() {
    const { lang, t } = useTranslation();
    const { symbol: cSymbol } = useCurrency();

    const PERIOD_LABELS: Record<string, string> = {
        monthly: t('شهري'),
        quarterly: t('ربع سنوي'),
        semi_annual: t('نصف سنوي'),
        annual: t('سنوي'),
        custom: t('مخصص'),
    };

    const PERIODS = [
        { val: 'monthly', label: t('شهري') },
        { val: 'quarterly', label: t('ربع سنوي') },
        { val: 'semi_annual', label: t('نصف سنوي') },
        { val: 'annual', label: t('سنوي') },
        { val: 'custom', label: t('مخصص') },
    ];
        const isRtl = lang === 'ar';
        const [partners, setPartners] = useState<Partner[]>([]);
        const [distributions, setDistributions] = useState<Distribution[]>([]);
        const [treasuries, setTreasuries] = useState<Treasury[]>([]);
        const [loading, setLoading] = useState(true);
        const [showModal, setShowModal] = useState(false);
        const [saving, setSaving] = useState(false);
        const [expanded, setExpanded] = useState<string | null>(null);

        const [form, setForm] = useState({
            totalAmount: '',
            period: 'monthly',
            date: new Date().toISOString().split('T')[0],
            notes: '',
            treasuryId: '',
        });

        const fetchData = useCallback(async () => {
            const [pRes, dRes, tRes] = await Promise.all([
                fetch('/api/partners'),
                fetch('/api/profit-distributions'),
                fetch('/api/treasuries'),
            ]);
            if (pRes.ok) setPartners(await pRes.json());
            if (dRes.ok) setDistributions(await dRes.json());
            if (tRes.ok) setTreasuries(await tRes.json());
            setLoading(false);
        }, []);
        useEffect(() => { fetchData(); }, [fetchData]);

        const totalShares = partners.reduce((s, p) => s + p.share, 0);
        const totalAmt = parseFloat(form.totalAmount) || 0;

        /* Preview: how much each partner gets */
        const preview = partners.map(p => ({
            ...p,
            gets: totalShares > 0 ? (p.share / totalShares) * totalAmt : 0,
        }));

        const handleSave = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!form.totalAmount || partners.length === 0) return;
            setSaving(true);
            const res = await fetch('/api/profit-distributions', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, totalAmount: totalAmt, lines: preview.map(p => ({ partnerId: p.id, amount: p.gets })) }),
            });
            if (res.ok) {
                setShowModal(false);
                setForm({ totalAmount: '', period: 'monthly', date: new Date().toISOString().split('T')[0], notes: '', treasuryId: '' });
                fetchData();
            } else { const d = await res.json(); alert(d.error || t('فشل الحفظ')); }
            setSaving(false);
        };

        const totalDistributed = distributions.reduce((s, d) => s + d.totalAmount, 0);

        return (
            <DashboardLayout>
                <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                    
                    <PageHeader
                        title={t("توزيع الأرباح")}
                        subtitle={t("إدارة وتوزيع الأرباح على الشركاء والمساهمين حسب الحصص الرأسمالية")}
                        icon={PieChart}
                        primaryButton={{
                            label: t("توزيع جديد"),
                            onClick: () => setShowModal(true),
                            icon: Plus
                        }}
                    />

                    {/* KPI Header Stats */}
                    {!loading && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                            {[
                                { label: t('إجمالي الأرباح الموزعة'), val: totalDistributed, color: '#10b981', icon: <TrendingUp size={18} />, suffix: cSymbol },
                                { label: t('عدد عمليات التوزيع'), val: distributions.length, color: C.blue, icon: <History size={18} />, suffix: t('عملية') },
                                { label: t('إجمالي الحصص الرأسمالية'), val: totalShares, color: '#818cf8', icon: <Percent size={18} />, suffix: '%' },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                                    padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s', position: 'relative'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = `${s.color}15`}
                                onMouseLeave={e => e.currentTarget.style.background = `${s.color}08`}
                                >
                                    <div style={{ textAlign: 'start' }}>
                                        <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', whiteSpace: 'nowrap', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{typeof s.val === 'number' ? formatNumber(s.val) : s.val}</span>
                                            {s.suffix && <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{s.suffix}</span>}
                                        </div>
                                    </div>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Partner Shares Visualization - Sub-header section */}
                    {!loading && partners.length > 0 && (
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '18px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>
                               <Users size={16} style={{ color: C.primary }} /> {t('قاعدة توزيع الأرباح (الحصص الحالية)')}
                            </div>
                            {partners.map(p => (
                                <div key={p.id} style={{ flex: 1, minWidth: '180px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{p.name}</div>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: C.primary, fontFamily: OUTFIT }}>{p.share}%</div>
                                    </div>
                                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${p.share}%`, height: '100%', background: `linear-gradient(90deg, ${C.primary}, #818cf8)`, borderRadius: '2px' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Main List */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0 16px' }}>
                        <div style={{ width: 4, height: 20, background: C.primary, borderRadius: '4px' }} />
                        <h2 style={{ fontSize: '13px', fontWeight: 950, color: C.textPrimary, margin: 0, fontFamily: CAIRO }}>{t('سجل عمليات توزيع الأرباح السابقة')}</h2>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px' }}>
                            <Loader2 size={40} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, margin: '0 auto 16px', display: 'block' }} />
                            <p style={{ color: C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>{t('جاري تحميل سجل التوزيعات...')}</p>
                        </div>
                    ) : distributions.length === 0 ? (
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.01)', border: `1px dashed ${C.border}`, borderRadius: '20px' }}>
                            <PieChart size={48} style={{ opacity: 0.1, display: 'block', margin: '0 auto 16px', color: C.primary }} />
                            <h3 style={{ color: C.textPrimary, fontSize: '13px', fontWeight: 600, marginBottom: '6px', fontFamily: CAIRO }}>{t('لا توجد عمليات توزيع مسجلة')}</h3>
                            <p style={{ margin: 0, fontSize: '13px', color: C.textMuted, fontFamily: CAIRO }}>{t('سجّل أول عملية توزيع أرباح لزيادة أرصدة الشركاء بناءً على حصصهم')}</p>
                        </div>
                    ) : (
                    <div style={TABLE_STYLE.container}>
                        <table style={TABLE_STYLE.table}>
                            <thead>
                                <tr style={TABLE_STYLE.thead}>
                                    <th style={TABLE_STYLE.th(true)}>{t('التاريخ')}</th>
                                    <th style={TABLE_STYLE.th(false)}>{t('دورة التوزيع')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('إجمالي المبلغ')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('البيان / الملاحظات')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('الحالة')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false, true), textAlign: 'center' }}>{t('التفاصيل')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {distributions.map((d, idx) => {
                                    const isExpanded = expanded === d.id;
                                    return (
                                        <React.Fragment key={d.id}>
                                            <tr style={TABLE_STYLE.row(idx === distributions.length - 1 && !isExpanded)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ ...TABLE_STYLE.td(true), color: C.textSecondary, fontSize: '12px', fontFamily: OUTFIT }}>
                                                    {new Date(d.date).toLocaleDateString(isRtl ? 'ar-EG-u-nu-latn' : 'en-GB')}
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <div style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{PERIOD_LABELS[d.period] || d.period}</div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT }}>
                                                        <Currency amount={d.totalAmount} />
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', color: C.textSecondary, fontSize: '12px' }}>
                                                    {d.notes || '—'}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: `${C.success}10`, color: C.success, border: `1px solid ${C.success}20`, fontSize: '11px', fontWeight: 600 }}>
                                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.success }} />
                                                        {t('مُعتمد')}
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, true), textAlign: 'center' }}>
                                                    <button onClick={() => setExpanded(isExpanded ? null : d.id)}
                                                        style={{ ...TABLE_STYLE.actionBtn(isExpanded ? C.primary : C.textSecondary), margin: '0 auto' }}>
                                                        {isExpanded ? <ChevronUp size={14} /> : <History size={14} />}
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={6} style={{ padding: '0', background: 'rgba(37, 106, 244, 0.02)' }}>
                                                        <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, animation: 'fadeIn 0.3s ease' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                                                {d.lines?.map((l, i) => (
                                                                    <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <div>
                                                                            <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{l.partnerName}</div>
                                                                            <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 700, fontFamily: OUTFIT }}>{l.share}%</div>
                                                                        </div>
                                                                        <div style={{ textAlign: 'end' }}>
                                                                            <div style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={l.amount} /></div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    )}

                    {/* MODAL: New Distribution */}
                    <AppModal
                        show={showModal}
                        onClose={() => setShowModal(false)}
                        title={t("توزيع أرباح جديد")}
                        icon={PieChart}
                    >
                        <form onSubmit={handleSave}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px dashed ${C.border}`, borderRadius: '12px', padding: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Info size={18} style={{ color: C.primary }} />
                                <div style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO, lineHeight: 1.5 }}>
                                    {t('سيتم توزيع المبلغ المدخل آلياً على الشركاء كلاً حسب نسبة مساهمته الحالية في رأس المال.')}
                                </div>
                            </div>

                            {/* Period Selection */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={LS}>{t('دورة التوزيع')}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                                    {PERIODS.map(opt => (
                                        <button key={opt.val} type="button" onClick={() => setForm(f => ({ ...f, period: opt.val }))}
                                            style={{ 
                                                padding: '10px 4px', borderRadius: '10px', 
                                                border: `1px solid ${form.period === opt.val ? C.primary : C.border}`, 
                                                background: form.period === opt.val ? `${C.primary}15` : 'transparent', 
                                                color: form.period === opt.val ? C.primary : C.textSecondary, 
                                                fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                                fontFamily: CAIRO
                                            }}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Amount + Date */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                <div>
                                    <label style={LS}>{t('إجمالي المبلغ المراد توزيعه')} <span style={{ color: C.danger }}>*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            type="number" step="any" required 
                                            value={form.totalAmount} 
                                            onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} 
                                            style={{ ...IS, paddingInlineEnd: '40px', fontFamily: OUTFIT, fontWeight: 700 }} 
                                            onFocus={focusIn} onBlur={focusOut} 
                                            placeholder="0.00"
                                        />
                                        <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: C.textMuted, fontFamily: CAIRO }}>{cSymbol}</span>
                                    </div>
                                </div>
                                <div>
                                    <label style={LS}>{t('تاريخ التوزيع')}</label>
                                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>

                            {/* Preview Preview */}
                            {totalAmt > 0 && partners.length > 0 && (
                                <div style={{ background: 'rgba(0,0,0,0.15)', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: C.textPrimary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}>
                                        <TrendingUp size={14} style={{ color: '#10b981' }} /> {t('معاينة التوزيع المقترح')}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {preview.map(p => (
                                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                                <span style={{ color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{p.name} <span style={{ fontSize: '10px', opacity: 0.6 }}>({p.share}%)</span></span>
                                                <div style={{ flex: 1, borderBottom: `1px dotted ${C.border}`, margin: '0 10px' }} />
                                                <span style={{ color: C.textPrimary, fontWeight: 950, fontFamily: OUTFIT }}>{formatNumber(p.gets)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Treasury (optional immediate payment) */}
                            <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: C.textPrimary, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}>
                                    <Banknote size={14} style={{ color: C.primary }} /> {t('طريقة الصرف')}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                                    <button type="button" onClick={() => setForm(f => ({ ...f, treasuryId: '' }))}
                                        style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${!form.treasuryId ? C.primary : C.border}`, background: !form.treasuryId ? `${C.primary}15` : 'transparent', color: !form.treasuryId ? C.primary : C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                                        {t('تسجيل فقط (تأجيل)')}
                                    </button>
                                    <button type="button" onClick={() => setForm(f => ({ ...f, treasuryId: f.treasuryId || (treasuries[0]?.id || '') }))}
                                        style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${form.treasuryId ? '#10b981' : C.border}`, background: form.treasuryId ? 'rgba(16,185,129,0.1)' : 'transparent', color: form.treasuryId ? '#10b981' : C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                                        {t('صرف فوري من خزينة')}
                                    </button>
                                </div>
                                {form.treasuryId && (
                                    <select value={form.treasuryId} onChange={e => setForm(f => ({ ...f, treasuryId: e.target.value }))}
                                        style={{ ...IS, marginBottom: 0 }} onFocus={focusIn} onBlur={focusOut}>
                                        {treasuries.map(tData => (
                                            <option key={tData.id} value={tData.id}>{tData.name} — {t('رصيد')}: {tData.balance.toLocaleString()}</option>
                                        ))}
                                    </select>
                                )}
                                {form.treasuryId && totalAmt > 0 && (() => {
                                    const tObj = treasuries.find(tData => tData.id === form.treasuryId);
                                    if (tObj && tObj.balance < totalAmt) return (
                                        <div style={{ marginTop: '8px', fontSize: '11px', color: '#f87171', fontWeight: 700, fontFamily: CAIRO }}>
                                            ⚠ {t('رصيد الخزينة')} ({tObj.balance.toLocaleString()}) {t('أقل من المبلغ المطلوب')}
                                        </div>
                                    );
                                    return null;
                                })()}
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={LS}>{t('ملاحظات')}</label>
                                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder={t("مثل: توزيع أرباح السنة المالية المنتهية 2023...")} />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" disabled={saving} style={{ ...BTN_PRIMARY(false, saving), flex: 1.5, height: '48px' }}>
                                    {saving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : <CheckCircle2 size={18} />}
                                    <span style={{ marginInlineEnd: '8px' }}>{t('اعتماد وتوزيع الأرباح')}</span>
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} style={{ height: '48px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                    {t('إلغاء')}
                                </button>
                            </div>
                        </form>
                    </AppModal>
                </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
        </DashboardLayout>
    );
}
