'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { Users, TrendingUp, TrendingDown, ArrowUpDown, Plus, X, Loader2, ChevronDown, ChevronUp, Banknote, CalendarDays, Wallet, AlertCircle, FileText } from 'lucide-react';
import { C, CAIRO, INTER, TABLE_STYLE, SEARCH_STYLE, KPI_STYLE, KPI_ICON, focusIn, focusOut, PAGE_BASE, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

interface Partner { id: string; name: string; share: number; capital: number; balance: number; }
interface Transaction { id: string; type: string; amount: number; date: string; notes?: string; }



const TX_LABELS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    deposit: { label: 'إيداع', color: '#34d399', bg: 'rgba(16,185,129,0.1)', icon: TrendingUp },
    withdrawal: { label: 'سحب', color: '#f87171', bg: 'rgba(239,68,68,0.1)', icon: TrendingDown },
    profit_share: { label: 'توزيع أرباح', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', icon: Banknote },
    capital_increase: { label: 'زيادة رأس مال', color: '#60a5fa', bg: 'rgba(59,130,246,0.1)', icon: TrendingUp },
    capital_decrease: { label: 'تخفيض رأس مال', color: '#fb923c', bg: 'rgba(249,115,22,0.1)', icon: TrendingDown },
};

export default function PartnerAccountsPage() {
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
            <div dir="rtl" style={PAGE_BASE}>
                
                {/* Header Section */}
                <PageHeader
                    title="حسابات الشركاء"
                    subtitle="إدارة الحسابات الجارية وتتبع المسحوبات والإيداعات"
                    icon={ArrowUpDown}
                />

                {/* KPI Header Stats */}
                {!loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: 'إجمالي الأرصدة المستحقة', val: totalBalance, color: totalBalance >= 0 ? '#10b981' : C.danger, icon: Wallet, suffix: 'ج.م' },
                            { label: 'عدد الشركاء', val: partners.length, color: C.blue, icon: Users, suffix: 'شريك' },
                            { label: 'إجمالي رأس المال العام', val: partners.reduce((s, p) => s + p.capital, 0), color: '#818cf8', icon: Banknote, suffix: 'ج.م' },
                        ].map((s, i) => (
                            <div key={i} style={{
                                background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                                padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.2s', position: 'relative'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '4px', fontWeight: 900, color: s.color, fontFamily: INTER }} dir="ltr">
                                        <span>{s.val.toLocaleString('en-US')}</span>
                                        {s.suffix && <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO, marginLeft: '4px' }}>{s.suffix}</span>}
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
                    <div style={{ padding: '100px', textAlign: 'center' }}>
                        <Loader2 size={40} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, margin: '0 auto 16px', display: 'block' }} />
                        <p style={{ color: C.textMuted, fontWeight: 800, fontFamily: CAIRO }}>جاري تحميل البيانات المالية...</p>
                    </div>
                ) : partners.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.01)', border: `1px dashed ${C.border}`, borderRadius: '20px' }}>
                        <Users size={48} style={{ opacity: 0.1, display: 'block', margin: '0 auto 16px', color: C.primary }} />
                        <h3 style={{ color: C.textPrimary, fontSize: '16px', fontWeight: 900, marginBottom: '6px', fontFamily: CAIRO }}>لا يوجد شركاء مسجلون</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: C.textMuted, fontFamily: CAIRO }}>قم بإضافة الشركاء أولاً من صفحة البيانات الأساسية</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {partners.map(p => {
                            const txs = txMap[p.id] || [];
                            const deposits = txs.filter(t => t.type === 'deposit' || t.type === 'capital_increase').reduce((s, t) => s + t.amount, 0);
                            const withdrawals = txs.filter(t => t.type === 'withdrawal' || t.type === 'capital_decrease').reduce((s, t) => s + t.amount, 0);
                            const isExpanded = expanded === p.id;

                            return (
                                <div key={p.id} style={{ 
                                    background: isExpanded ? C.hover : C.card, 
                                    border: `1px solid ${isExpanded ? `${C.primary}40` : C.border}`, 
                                    borderRadius: '16px', overflow: 'hidden', 
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: isExpanded ? '0 12px 30px -10px rgba(0,0,0,0.5)' : 'none',
                                    cursor: 'default'
                                }}
                                onMouseEnter={e => { 
                                    if (!isExpanded) {
                                        e.currentTarget.style.background = C.hover;
                                        e.currentTarget.style.borderColor = `${C.primary}30`;
                                    }
                                }}
                                onMouseLeave={e => { 
                                    if (!isExpanded) {
                                        e.currentTarget.style.background = C.card;
                                        e.currentTarget.style.borderColor = C.border;
                                    }
                                }}>
                                    {/* Partner Summary Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 1fr 1fr 1fr 100px 90px', gap: '20px', alignItems: 'center', padding: '16px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: 42, height: 42, borderRadius: '12px', background: `${C.primary}15`, border: `1px solid ${C.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 900, color: C.primary, fontFamily: CAIRO }}>
                                                {p.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{p.name}</div>
                                                 <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, fontFamily: INTER }}>نسبة المساهمة: {p.share}%</div>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 750, marginBottom: '4px', fontFamily: CAIRO }}>رأس المال</div>
                                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9', fontFamily: INTER }}>{p.capital.toLocaleString('en-US')}</div>
                                        </div>

                                         <div style={{ textAlign: 'center' }}>
                                             <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 750, marginBottom: '2px', fontFamily: CAIRO }}>الرصيد الجاري</div>
                                             <div style={{ fontSize: '15px', fontWeight: 900, color: p.balance >= 0 ? '#10b981' : C.danger, fontFamily: INTER, direction: 'ltr' }}>
                                                 {p.balance.toLocaleString('en-US')}
                                             </div>
                                         </div>

                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                            <div title="إجمالي الإيداعات" style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 900, background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', fontFamily: INTER }}>
                                                ↑ {deposits.toLocaleString('en-US')}
                                            </div>
                                            <div title="إجمالي المسحوبات" style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 900, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', fontFamily: INTER }}>
                                                ↓ {withdrawals.toLocaleString('en-US')}
                                            </div>
                                        </div>

                                        <button onClick={() => setShowModal(p)} style={{ height: '36px', borderRadius: '10px', border: 'none', background: C.primary, color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37,106,244,0.25)', fontFamily: CAIRO }}>
                                            + حركة
                                        </button>

                                        <button onClick={() => toggleExpand(p.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '36px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', color: C.textSecondary, fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} 
                                            كشف
                                        </button>
                                    </div>

                                    {/* Transactions Expanded Section */}
                                    {isExpanded && (
                                        <div style={{ borderTop: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.15)', animation: 'slideDown 0.3s ease-out' }}>
                                            {loadingTx === p.id ? (
                                                <div style={{ padding: '40px', textAlign: 'center', color: C.textMuted }}>
                                                    <Loader2 size={24} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 8px' }} />
                                                    <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: CAIRO }}>استرجاع الحركات...</span>
                                                </div>
                                            ) : txs.length === 0 ? (
                                                <div style={{ padding: '30px', textAlign: 'center', color: C.textMuted, fontSize: '13px', fontFamily: CAIRO }}>
                                                    <AlertCircle size={20} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                                                    لا توجد حركات مسجلة لهذا الشريك
                                                </div>
                                            ) : (
                                                <div style={{ padding: '10px' }}>
                                                    <table style={{ ...TABLE_STYLE.table, background: 'transparent' }}>
                                                        <thead>
                                                            <tr style={{ ...TABLE_STYLE.thead, background: 'rgba(255,255,255,0.02)' }}>
                                                                <th style={{ ...TABLE_STYLE.th(true), padding: '12px 16px' }}>التاريخ</th>
                                                                <th style={{ ...TABLE_STYLE.th(false), padding: '12px 16px' }}>نوع العملية</th>
                                                                <th style={{ ...TABLE_STYLE.th(false), padding: '12px 16px' }}>المبلغ</th>
                                                                <th style={{ ...TABLE_STYLE.th(false), padding: '12px 16px' }}>البيان والملاحظات</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {txs.map((tx, idx) => {
                                                                const meta = TX_LABELS[tx.type] || { label: tx.type, color: '#94a3b8', bg: 'rgba(255,255,255,0.05)', icon: Banknote };
                                                                return (
                                                                    <tr key={tx.id} style={{ ...TABLE_STYLE.row(idx === txs.length - 1), background: 'transparent' }}>
                                                                        <td style={{ ...TABLE_STYLE.td(true), fontSize: '12px', color: C.textMuted, fontFamily: INTER }}>
                                                                            {new Date(tx.date).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                                        </td>
                                                                        <td style={TABLE_STYLE.td(false)}>
                                                                            <span style={{ 
                                                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                                                padding: '4px 12px', borderRadius: '20px', fontSize: '11px', 
                                                                                fontWeight: 800, background: meta.bg, color: meta.color,
                                                                                fontFamily: CAIRO
                                                                            }}>
                                                                                {meta.label}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ ...TABLE_STYLE.td(false), fontWeight: 900, color: meta.color, fontFamily: INTER, fontSize: '14px' }}>
                                                                            {tx.amount.toLocaleString('en-US')} <span style={{ fontSize: '10px', fontFamily: CAIRO }}>ج.م</span>
                                                                        </td>
                                                                        <td style={{ ...TABLE_STYLE.td(false), fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>
                                                                            {tx.notes || '—'}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* MODAL: Financial Transaction */}
                <AppModal
                    show={showModal !== null}
                    onClose={() => setShowModal(null)}
                    title={showModal ? `حركة مالية — ${showModal.name}` : ''}
                    icon={Banknote}
                >
                    {showModal && (
                        <form onSubmit={handleSave}>
                            {/* Current Balance Indicator */}
                            <div style={{ 
                                background: 'rgba(255,255,255,0.02)', border: `1px dashed ${C.border}`, 
                                borderRadius: '12px', padding: '12px', marginBottom: '20px', textAlign: 'center' 
                            }}>
                                <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, marginBottom: '4px', fontFamily: CAIRO }}>الرصيد الجاري حالياً</div>
                                <div style={{ fontSize: '20px', fontWeight: 950, color: showModal.balance >= 0 ? '#10b981' : C.danger, fontFamily: INTER }}>
                                    {showModal.balance.toLocaleString('en-US')} <span style={{ fontSize: '12px', fontFamily: CAIRO }}>ج.م</span>
                                </div>
                            </div>

                            {/* Type Selector */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={LS}>نوع الحركة</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
                                    {[
                                        { val: 'deposit', label: 'إيداع', color: '#10b981' },
                                        { val: 'withdrawal', label: 'سحب', color: C.danger },
                                        { val: 'profit_share', label: 'توزيع أرباح', color: '#8b5cf6' },
                                        { val: 'capital_increase', label: 'زيادة رأس مال', color: C.blue },
                                        { val: 'capital_decrease', label: 'تخفيض رأس مال', color: '#fb923c' },
                                    ].map(opt => (
                                        <button key={opt.val} type="button" onClick={() => setForm(f => ({ ...f, type: opt.val }))}
                                            style={{ 
                                                padding: '10px 4px', borderRadius: '10px', 
                                                border: `1px solid ${form.type === opt.val ? opt.color : C.border}`, 
                                                background: form.type === opt.val ? `${opt.color}15` : 'transparent', 
                                                color: form.type === opt.val ? opt.color : C.textSecondary, 
                                                fontSize: '11px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s',
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
                                    <label style={LS}>الخزينة / المصدر</label>
                                    <CustomSelect
                                        value={form.treasuryId}
                                        onChange={v => setForm(f => ({ ...f, treasuryId: v }))}
                                        icon={Wallet}
                                        placeholder="اختر الخزينة..."
                                        options={treasuries.map(t => ({ value: t.id, label: `${t.name} (${t.balance.toLocaleString('en-US')} ج.م)` }))}
                                    />
                                </div>
                            )}

                            {/* Amount + Date Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={LS}>المبلغ (ج.م) *</label>
                                    <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{...IS, color: '#10b981', fontWeight: 900, fontFamily: INTER}} onFocus={focusIn} onBlur={focusOut} placeholder="0.00" />
                                </div>
                                <div>
                                    <label style={LS}>التاريخ</label>
                                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...IS, direction: 'ltr', textAlign: 'left', fontFamily: INTER }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>

                            {/* Notes */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={LS}>بيان / ملاحظات</label>
                                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder="تفاصيل الحركة المالية..." />
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" disabled={saving} style={{ ...BTN_PRIMARY(false, saving), flex: 1, height: '48px' }}>
                                    {saving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Plus size={18} />}
                                    <span style={{ marginRight: '8px' }}>اعتماد الحركة</span>
                                </button>
                                <button type="button" onClick={() => setShowModal(null)} style={{ height: '48px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                    إلغاء
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

