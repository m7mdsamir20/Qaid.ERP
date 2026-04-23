'use client';
import { formatNumber } from '@/lib/currency';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { Users, TrendingUp, TrendingDown, ArrowUpDown, Plus, X, Loader2, ChevronDown, ChevronUp, Banknote, CalendarDays, Wallet, AlertCircle, FileText, History } from 'lucide-react';

import { C, CAIRO, OUTFIT, TABLE_STYLE, SEARCH_STYLE, KPI_STYLE, KPI_ICON, focusIn, focusOut, PAGE_BASE, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';

interface Partner { id: string; name: string; share: number; capital: number; balance: number; }
interface Transaction { id: string; type: string; amount: number; date: string; notes?: string; }

const TX_LABELS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    deposit: { label: 'إيداع', color: '#34d399', bg: 'rgba(16,185,129,0.1)', icon: TrendingUp },
    withdrawal: { label: 'سحب', color: '#f87171', bg: 'rgba(239,68,68,0.1)', icon: TrendingDown },
    profit_share: { label: 'توزيع أرباح', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', icon: Banknote },
    capital_increase: { label: 'زيادة رأس مال', color: '#60a5fa', bg: 'rgba(37, 106, 244,0.1)', icon: TrendingUp },
    capital_decrease: { label: 'تخفيض رأس مال', color: '#fb923c', bg: 'rgba(249,115,22,0.1)', icon: TrendingDown },
};

export default function PartnerAccountsPage() {
    const { lang, t } = useTranslation();
    const { symbol: cSymbol } = useCurrency();
    const isRtl = lang === 'ar';
    const [partners, setPartners] = useState<Partner[]>([]);
    const [treasuries, setTreasuries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [txMap, setTxMap] = useState<Record<string, Transaction[]>>({});
    const [loadingTx, setLoadingTx] = useState<string | null>(null);
    const [showModal, setShowModal] = useState<Partner | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ type: 'deposit', amount: '', date: new Date().toISOString().split('T')[0], notes: '', treasuryId: '' });

    const fetchData = useCallback(async () => {
        const [pRes, tRes] = await Promise.all([fetch('/api/partners'), fetch('/api/treasuries')]);
        if (pRes.ok) setPartners(await pRes.json());
        if (tRes.ok) setTreasuries(await tRes.json());
        setLoading(false);
    }, []);
    useEffect(() => { fetchData(); }, [fetchData]);

    const toggleExpand = async (id: string) => {
        if (expanded === id) { setExpanded(null); return; }
        setExpanded(id);
        if (!txMap[id]) {
            setLoadingTx(id);
            const res = await fetch(`/api/partner-transactions?partnerId=${id}`);
            if (res.ok) {
                const txData = await res.json();
                setTxMap(m => ({ ...m, [id]: txData }));
            }
            setLoadingTx(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showModal) return;
        setSaving(true);
        const res = await fetch('/api/partner-transactions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, partnerId: showModal.id, amount: parseFloat(form.amount) }),
        });
        if (res.ok) {
            setShowModal(null);
            setTxMap({});
            setForm({ type: 'deposit', amount: '', date: new Date().toISOString().split('T')[0], notes: '', treasuryId: '' });
            fetchData();
        } else { const d = await res.json(); alert(d.error || 'فشل الحفظ'); }
        setSaving(false);
    };

    const totalBalance = partners.reduce((s, p) => s + p.balance, 0);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                
                {/* Header Section */}
                <PageHeader
                    title={t("حسابات الشركاء")}
                    subtitle={t("إدارة الحسابات الجارية وتتبع المسحوبات والإيداعات")}
                    icon={ArrowUpDown}
                />

                {/* KPI Header Stats */}
                {!loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: t('إجمالي الأرصدة المستحقة'), val: totalBalance, color: totalBalance >= 0 ? '#10b981' : C.danger, icon: Wallet, suffix: cSymbol },
                            { label: t('عدد الشركاء'), val: partners.length, color: C.blue, icon: Users, suffix: t('شريك') },
                            { label: t('إجمالي رأس المال العام'), val: partners.reduce((s, p) => s + p.capital, 0), color: '#818cf8', icon: Banknote, suffix: cSymbol },
                        ].map((s, i) => (
                            <div key={i} style={{
                                background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                                padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.2s', position: 'relative'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                                <div style={{ textAlign: 'start' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', fontWeight: 600, color: s.color, fontFamily: OUTFIT, direction: 'ltr' }}>
                                        <span>{formatNumber(s.val)}</span>
                                        {s.suffix && <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO, marginInlineStart: '2px' }}>{s.suffix}</span>}
                                    </div>
                                </div>
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                    <s.icon size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div style={{ padding: '100px' }}>
                        <Loader2 size={40} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, margin: '0 auto 16px', display: 'block' }} />
                        <p style={{ color: C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>{t('جاري تحميل البيانات المالية...')}</p>
                    </div>
                ) : partners.length === 0 ? (
                    <div style={{ padding: '80px 20px', background: 'rgba(255,255,255,0.01)', border: `1px dashed ${C.border}`, borderRadius: '20px' }}>
                        <Users size={48} style={{ opacity: 0.1, display: 'block', margin: '0 auto 16px', color: C.primary }} />
                        <h3 style={{ color: C.textPrimary, fontSize: '13px', fontWeight: 600, marginBottom: '6px', fontFamily: CAIRO }}>{t('لا يوجد شركاء مسجلون')}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: C.textMuted, fontFamily: CAIRO }}>{t('قم بإضافة الشركاء أولاً من صفحة البيانات الأساسية')}</p>
                    </div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <table style={TABLE_STYLE.table}>
                            <thead>
                                <tr style={TABLE_STYLE.thead}>
                                    <th style={TABLE_STYLE.th(true)}>{t('الشريك')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('نسبة الحصة')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('رأس المال')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('الرصيد الجاري')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('الإيداعات / المسحوبات')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false, true), textAlign: 'center' }}>{t('الإجراءات')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {partners.map((p, idx) => {
                                    const isExpanded = expanded === p.id;
                                    const txs = txMap[p.id] || [];
                                    const deposits = txs.filter(t => ['deposit', 'profit_share', 'capital_increase'].includes(t.type)).reduce((s, t) => s + t.amount, 0);
                                    const withdrawals = txs.filter(t => ['withdrawal', 'capital_decrease'].includes(t.type)).reduce((s, t) => s + t.amount, 0);

                                    return (
                                        <React.Fragment key={p.id}>
                                            <tr style={TABLE_STYLE.row(idx === partners.length - 1 && !isExpanded)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={TABLE_STYLE.td(true)}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: `${C.primary}10`, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: OUTFIT }}>
                                                            {p.name.charAt(0)}
                                                        </div>
                                                        <div style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{p.name}</div>
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: OUTFIT }}>{p.share}%</div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{formatNumber(p.capital)}</div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT }}>
                                                        {formatNumber(p.balance)}
                                                        <small style={{ fontSize: '10px', marginInlineStart: '4px', opacity: 0.7, fontFamily: CAIRO }}>{cSymbol}</small>
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                        <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, fontFamily: OUTFIT }}>↑ {formatNumber(deposits)}</div>
                                                        <div style={{ width: 1, height: 12, background: C.border }} />
                                                        <div style={{ fontSize: '11px', color: C.danger, fontWeight: 700, fontFamily: OUTFIT }}>↓ {formatNumber(withdrawals)}</div>
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, true), textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                        <button onClick={() => setShowModal(p)}
                                                            style={{ ...TABLE_STYLE.actionBtn(C.primary), background: `${C.primary}15` }} title={t("إضافة حركة")}>
                                                            <Plus size={14} />
                                                        </button>
                                                        <button onClick={() => toggleExpand(p.id)}
                                                            style={{ ...TABLE_STYLE.actionBtn(isExpanded ? C.primary : C.textSecondary) }} title={t("كشف حساب")}>
                                                            {isExpanded ? <ChevronUp size={14} /> : <History size={14} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={6} style={{ padding: '0', background: 'rgba(37, 106, 244, 0.02)' }}>
                                                        <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}`, animation: 'fadeIn 0.3s ease' }}>
                                                            {loadingTx === p.id ? (
                                                                <div style={{ padding: '20px', textAlign: 'center' }}>
                                                                    <Loader2 size={24} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, margin: '0 auto' }} />
                                                                </div>
                                                            ) : txs.length === 0 ? (
                                                                <div style={{ padding: '12px', color: C.textMuted, fontSize: '12px', textAlign: 'center', fontFamily: CAIRO }}>{t('لا توجد حركات مسجلة لهذا الشريك')}</div>
                                                            ) : (
                                                                <table style={{ ...TABLE_STYLE.table, background: 'transparent', minWidth: '100%' }}>
                                                                    <thead>
                                                                        <tr style={{ ...TABLE_STYLE.thead, background: 'rgba(255,255,255,0.02)' }}>
                                                                            <th style={{ ...TABLE_STYLE.th(true), padding: '10px 16px' }}>{t('التاريخ')}</th>
                                                                            <th style={{ ...TABLE_STYLE.th(false), padding: '10px 16px' }}>{t('نوع العملية')}</th>
                                                                            <th style={{ ...TABLE_STYLE.th(false, true), padding: '10px 16px' }}>{t('المبلغ')}</th>
                                                                            <th style={{ ...TABLE_STYLE.th(false), padding: '10px 16px' }}>{t('البيان والملاحظات')}</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {txs.map((tx, tIdx) => {
                                                                            const meta = TX_LABELS[tx.type] || { label: tx.type, color: '#94a3b8', bg: 'rgba(255,255,255,0.05)' };
                                                                            return (
                                                                                <tr key={tx.id} style={{ ...TABLE_STYLE.row(tIdx === txs.length - 1), background: 'transparent' }}>
                                                                                    <td style={{ ...TABLE_STYLE.td(true), padding: '10px 16px', fontSize: '12px', color: C.textMuted, fontFamily: OUTFIT }}>
                                                                                        {new Date(tx.date).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                                                    </td>
                                                                                    <td style={{ ...TABLE_STYLE.td(false), padding: '10px 16px' }}>
                                                                                        <span style={{ 
                                                                                            display: 'inline-flex', alignItems: 'center',
                                                                                            padding: '2px 10px', borderRadius: '12px', fontSize: '11px', 
                                                                                            fontWeight: 600, background: meta.bg, color: meta.color,
                                                                                            fontFamily: CAIRO
                                                                                        }}>{t(meta.label)}</span>
                                                                                    </td>
                                                                                    <td style={{ ...TABLE_STYLE.td(false, true), padding: '10px 16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>
                                                                                        {formatNumber(tx.amount)}
                                                                                    </td>
                                                                                    <td style={{ ...TABLE_STYLE.td(false), padding: '10px 16px', fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>
                                                                                        {tx.notes || '—'}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            )}
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

                {/* MODAL: Financial Transaction */}
                <AppModal
                    show={showModal !== null}
                    onClose={() => setShowModal(null)}
                    title={showModal ? `${t('حركة مالية —')} ${showModal.name}` : ''}
                    icon={Banknote}
                >
                    {showModal && (
                        <form onSubmit={handleSave}>
                            {/* Current Balance Indicator */}
                            <div style={{ 
                                background: 'rgba(255,255,255,0.02)', border: `1px dashed ${C.border}`, 
                                borderRadius: '12px', padding: '12px', marginBottom: '20px' 
                            }}>
                                <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, marginBottom: '4px', fontFamily: CAIRO }}>{t('الرصيد الجاري حالياً')}</div>
                                <div style={{ fontSize: '20px', fontWeight: 950, color: C.textPrimary, fontFamily: OUTFIT }}>
                                    {formatNumber(showModal.balance)} <span style={{ fontSize: '12px', fontFamily: CAIRO, opacity: 0.7 }}>{cSymbol}</span>
                                </div>
                            </div>

                            {/* Type Selector */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={LS}>{t('نوع الحركة')}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
                                    {[
                                        { val: 'deposit', label: t('إيداع'), color: '#10b981' },
                                        { val: 'withdrawal', label: t('سحب'), color: C.danger },
                                        { val: 'profit_share', label: t('توزيع أرباح'), color: '#8b5cf6' },
                                        { val: 'capital_increase', label: t('زيادة رأس مال'), color: C.blue },
                                        { val: 'capital_decrease', label: t('تخفيض رأس مال'), color: '#fb923c' },
                                    ].map(opt => (
                                        <button key={opt.val} type="button" onClick={() => setForm(f => ({ ...f, type: opt.val }))}
                                            style={{ 
                                                padding: '10px 4px', borderRadius: '10px', 
                                                border: `1px solid ${form.type === opt.val ? opt.color : C.border}`, 
                                                background: form.type === opt.val ? `${opt.color}15` : 'transparent', 
                                                color: form.type === opt.val ? opt.color : C.textSecondary, 
                                                fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                                fontFamily: CAIRO
                                            }}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Treasury Section */}
                            {(form.type === 'deposit' || form.type === 'withdrawal' || form.type === 'capital_increase') && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={LS}>{t('الخزينة / المصدر')}</label>
                                    <CustomSelect
                                        value={form.treasuryId}
                                        onChange={v => setForm(f => ({ ...f, treasuryId: v }))}
                                        icon={Wallet}
                                        placeholder={t("اختر الخزينة...")}
                                        options={treasuries.map(t_ => ({ value: t_.id, label: `${t_.name} (${formatNumber(t_.balance)} ${cSymbol})` }))}
                                    />
                                </div>
                            )}

                            <div style={{ position: 'relative', marginBottom: '24px' }}>
                                <label style={{ ...LS, textAlign: 'center', display: 'block', marginBottom: '12px', fontSize: '13px' }}>{t('قيمة الحركة المالية')}</label>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 600, color: 'rgba(255,255,255,0.03)', pointerEvents: 'none', fontFamily: OUTFIT, letterSpacing: '2px' }}>
                                        0.00
                                    </div>
                                    <input 
                                        type="number" step="any" required 
                                        value={form.amount} 
                                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} 
                                        style={{ ...IS, background: 'transparent', textAlign: 'center', fontSize: '32px', height: '80px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT, border: 'none', borderBottom: `2px solid ${C.primary}30`, borderRadius: 0 }} 
                                        onFocus={focusIn} onBlur={focusOut} 
                                        placeholder=""
                                    />
                                    <span style={{ position: 'absolute', insetInlineEnd: '0', bottom: '12px', fontSize: '12px', fontWeight: 700, color: C.primary, fontFamily: CAIRO }}>{cSymbol}</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={LS}>{t('تاريخ الحركة')}</label>
                                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                            </div>

                            {/* Notes */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={LS}>{t('بيان / ملاحظات')}</label>
                                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder={t("تفاصيل الحركة المالية...")} />
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" disabled={saving} style={{ ...BTN_PRIMARY(false, saving), flex: 1, height: '48px' }}>
                                    {saving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Plus size={18} />}
                                    <span style={{ marginInlineEnd: '8px' }}>{t('اعتماد الحركة')}</span>
                                </button>
                                <button type="button" onClick={() => setShowModal(null)} style={{ height: '48px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                    {t('إلغاء')}
                                </button>
                            </div>
                        </form>
                    )}
                </AppModal>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
        </DashboardLayout>
    );
}
