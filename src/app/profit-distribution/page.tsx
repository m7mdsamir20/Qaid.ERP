'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
    PieChart, Plus, Loader2, X, TrendingUp, CalendarDays,
    CheckCircle2, ChevronDown, ChevronUp, History,
    Percent, Banknote, Users, Info, DollarSign, Wallet
} from 'lucide-react';
import { 
    C, CAIRO, INTER, TABLE_STYLE, SEARCH_STYLE, 
    KPI_STYLE, KPI_ICON, focusIn, focusOut, 
    PAGE_BASE, IS, LS, BTN_PRIMARY, BTN_DANGER 
} from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

interface Partner { id: string; name: string; share: number; capital: number; balance: number; }
interface Distribution { id: string; date: string; totalAmount: number; period: string; notes?: string; paidFromTreasury?: boolean; lines: { partnerName: string; amount: number; share: number }[]; }
interface Treasury { id: string; name: string; type: string; balance: number; }

const PERIOD_LABELS: Record<string, string> = {
    monthly: 'شهري',
    quarterly: 'ربع سنوي',
    semi_annual: 'نصف سنوي',
    annual: 'سنوي',
    custom: 'مخصص',
};

const PERIODS = [
    { val: 'monthly', label: 'شهري' },
    { val: 'quarterly', label: 'ربع سنوي' },
    { val: 'semi_annual', label: 'نصف سنوي' },
    { val: 'annual', label: 'سنوي' },
    { val: 'custom', label: 'مخصص' },
];

export default function ProfitDistributionPage() {
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
        } else { const d = await res.json(); alert(d.error || 'فشل الحفظ'); }
        setSaving(false);
    };

    const totalDistributed = distributions.reduce((s, d) => s + d.totalAmount, 0);

    return (
        <DashboardLayout>
            <div dir="rtl" style={PAGE_BASE}>
                
                <PageHeader
                    title="توزيع الأرباح"
                    subtitle="إدارة وتوزيع الأرباح على الشركاء والمساهمين حسب الحصص الرأسمالية"
                    icon={PieChart}
                    primaryButton={{
                        label: "توزيع جديد",
                        onClick: () => setShowModal(true),
                        icon: Plus
                    }}
                />

                {/* KPI Header Stats */}
                {!loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: 'إجمالي الأرباح الموزعة', val: totalDistributed, color: '#10b981', icon: TrendingUp, suffix: 'ج.م' },
                            { label: 'عدد عمليات التوزيع', val: distributions.length, color: C.blue, icon: History, suffix: 'عملية' },
                            { label: 'إجمالي الحصص الرأسمالية', val: totalShares, color: '#818cf8', icon: Percent, suffix: '%' },
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
                                        <span>{typeof s.val === 'number' ? s.val.toLocaleString('en-US') : s.val}</span>
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

                {/* Partner Shares Visualization - Sub-header section */}
                {!loading && partners.length > 0 && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '18px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>
                           <Users size={16} style={{ color: C.primary }} /> قاعدة توزيع الأرباح (الحصص الحالية)
                        </div>
                        {partners.map(p => (
                            <div key={p.id} style={{ flex: 1, minWidth: '180px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800, color: C.textSecondary, fontFamily: CAIRO }}>{p.name}</div>
                                    <div style={{ fontSize: '11px', fontWeight: 900, color: C.primary, fontFamily: INTER }}>{p.share}%</div>
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
                    <h2 style={{ fontSize: '16px', fontWeight: 950, color: C.textPrimary, margin: 0, fontFamily: CAIRO }}>سجل عمليات توزيع الأرباح السابقة</h2>
                </div>

                {loading ? (
                    <div style={{ padding: '80px', textAlign: 'center' }}>
                        <Loader2 size={40} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, margin: '0 auto 16px', display: 'block' }} />
                        <p style={{ color: C.textMuted, fontWeight: 800, fontFamily: CAIRO }}>جاري تحميل سجل التوزيعات...</p>
                    </div>
                ) : distributions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.01)', border: `1px dashed ${C.border}`, borderRadius: '20px' }}>
                        <PieChart size={48} style={{ opacity: 0.1, display: 'block', margin: '0 auto 16px', color: C.primary }} />
                        <h3 style={{ color: C.textPrimary, fontSize: '16px', fontWeight: 900, marginBottom: '6px', fontFamily: CAIRO }}>لا توجد عمليات توزيع مسجلة</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: C.textMuted, fontFamily: CAIRO }}>سجّل أول عملية توزيع أرباح لزيادة أرصدة الشركاء بناءً على حصصهم</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {distributions.map(d => {
                             const isExpanded = expanded === d.id;
                             return (
                                <div key={d.id} style={{ 
                                    background: isExpanded ? C.hover : C.card, 
                                    border: `1px solid ${isExpanded ? `${C.primary}40` : C.border}`, 
                                    borderRadius: '16px', overflow: 'hidden', 
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1.5fr) 140px 180px 100px 50px', gap: '20px', alignItems: 'center', padding: '14px 20px', cursor: 'pointer' }}
                                        onClick={() => setExpanded(isExpanded ? null : d.id)}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '12px', background: `${C.blue}15`, border: `1px solid ${C.blue}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.blue }}>
                                                <CalendarDays size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>توزيع أرباح {PERIOD_LABELS[d.period] || d.period}</div>
                                                <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{d.notes || 'لا يوجد بيان'}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 750, marginBottom: '4px', fontFamily: CAIRO }}>تاريخ القيد</div>
                                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9', fontFamily: INTER }}>
                                                {new Date(d.date).toLocaleDateString('ar-EG-u-nu-latn')}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 750, marginBottom: '4px', fontFamily: CAIRO }}>إجمالي التوزيع</div>
                                            <div style={{ fontSize: '18px', fontWeight: 950, color: '#10b981', fontFamily: INTER }}>
                                                {d.totalAmount.toLocaleString('en-US')} <span style={{ fontSize: '10px', fontFamily: CAIRO }}>ج.م</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 900, fontFamily: CAIRO }}>مُعتمد</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'center', color: C.textMuted }}>
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ borderTop: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.15)', padding: '18px 20px', animation: 'slideDown 0.3s ease-out' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                                <History size={14} style={{ color: C.primary }} />
                                                <div style={{ fontSize: '12px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>تفاصيل توزيع حصص الشركاء</div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                                                {d.lines?.map((l, i) => (
                                                    <div key={i} style={{ background: `${C.blue}05`, border: `1px solid ${C.blue}15`, borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <div style={{ fontSize: '13px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO, marginBottom: '2px' }}>{l.partnerName}</div>
                                                            <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 700, fontFamily: INTER }}>نسبة الحصة: {l.share}%</div>
                                                        </div>
                                                        <div style={{ textAlign: 'left' }}>
                                                            <div style={{ fontSize: '15px', fontWeight: 950, color: C.primary, fontFamily: INTER }}>{l.amount.toLocaleString('en-US')}</div>
                                                            <div style={{ fontSize: '9px', color: C.textMuted, fontFamily: CAIRO }}>ج.م</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                             );
                        })}
                    </div>
                )}

                {/* MODAL: New Distribution */}
                <AppModal
                    show={showModal}
                    onClose={() => setShowModal(false)}
                    title="توزيع أرباح جديد"
                    icon={PieChart}
                >
                    <form onSubmit={handleSave}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px dashed ${C.border}`, borderRadius: '12px', padding: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Info size={18} style={{ color: C.primary }} />
                            <div style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO, lineHeight: 1.5 }}>
                                سيتم توزيع المبلغ المدخل آلياً على الشركاء كلاً حسب نسبة مساهمته الحالية في رأس المال.
                            </div>
                        </div>

                        {/* Period Selection */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={LS}>دورة التوزيع</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                                {PERIODS.map(opt => (
                                    <button key={opt.val} type="button" onClick={() => setForm(f => ({ ...f, period: opt.val }))}
                                        style={{ 
                                            padding: '10px 4px', borderRadius: '10px', 
                                            border: `1px solid ${form.period === opt.val ? C.primary : C.border}`, 
                                            background: form.period === opt.val ? `${C.primary}15` : 'transparent', 
                                            color: form.period === opt.val ? C.primary : C.textSecondary, 
                                            fontSize: '11px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s',
                                            fontFamily: CAIRO
                                        }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Amount + Date */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>إجمالي الربح الموزع (ج.م) *</label>
                                <input required type="number" min="1" step="0.01" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} style={{...IS, color: '#10b981', fontWeight: 900, fontFamily: INTER}} onFocus={focusIn} onBlur={focusOut} placeholder="0.00" />
                            </div>
                            <div>
                                <label style={LS}>تاريخ التوزيع</label>
                                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...IS, direction: 'ltr', textAlign: 'left', fontFamily: INTER }} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>

                        {/* Preview Preview */}
                        {totalAmt > 0 && partners.length > 0 && (
                            <div style={{ background: 'rgba(0,0,0,0.15)', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 900, color: C.textPrimary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}>
                                    <TrendingUp size={14} style={{ color: '#10b981' }} /> معاينة التوزيع المقترح
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {preview.map(p => (
                                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                            <span style={{ color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{p.name} <span style={{ fontSize: '10px', opacity: 0.6 }}>({p.share}%)</span></span>
                                            <div style={{ flex: 1, borderBottom: `1px dotted ${C.border}`, margin: '0 10px' }} />
                                            <span style={{ color: C.primary, fontWeight: 950, fontFamily: INTER }}>{p.gets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Treasury (optional immediate payment) */}
                        <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: C.textPrimary, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}>
                                <Banknote size={14} style={{ color: C.primary }} /> طريقة الصرف
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                                <button type="button" onClick={() => setForm(f => ({ ...f, treasuryId: '' }))}
                                    style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${!form.treasuryId ? C.primary : C.border}`, background: !form.treasuryId ? `${C.primary}15` : 'transparent', color: !form.treasuryId ? C.primary : C.textSecondary, fontSize: '12px', fontWeight: 800, cursor: 'pointer', fontFamily: CAIRO }}>
                                    تسجيل فقط (تأجيل)
                                </button>
                                <button type="button" onClick={() => setForm(f => ({ ...f, treasuryId: f.treasuryId || (treasuries[0]?.id || '') }))}
                                    style={{ padding: '10px', borderRadius: '10px', border: `1px solid ${form.treasuryId ? '#10b981' : C.border}`, background: form.treasuryId ? 'rgba(16,185,129,0.1)' : 'transparent', color: form.treasuryId ? '#10b981' : C.textSecondary, fontSize: '12px', fontWeight: 800, cursor: 'pointer', fontFamily: CAIRO }}>
                                    صرف فوري من خزينة
                                </button>
                            </div>
                            {form.treasuryId && (
                                <select value={form.treasuryId} onChange={e => setForm(f => ({ ...f, treasuryId: e.target.value }))}
                                    style={{ ...IS, marginBottom: 0 }} onFocus={focusIn} onBlur={focusOut}>
                                    {treasuries.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} — رصيد: {t.balance.toLocaleString()}</option>
                                    ))}
                                </select>
                            )}
                            {form.treasuryId && totalAmt > 0 && (() => {
                                const t = treasuries.find(t => t.id === form.treasuryId);
                                if (t && t.balance < totalAmt) return (
                                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#f87171', fontWeight: 700, fontFamily: CAIRO }}>
                                        ⚠ رصيد الخزينة ({t.balance.toLocaleString()}) أقل من المبلغ المطلوب
                                    </div>
                                );
                                return null;
                            })()}
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={LS}>ملاحظات</label>
                            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder="مثل: توزيع أرباح السنة المالية المنتهية 2023..." />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={saving} style={{ ...BTN_PRIMARY(false, saving), flex: 1.5, height: '48px' }}>
                                {saving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : <CheckCircle2 size={18} />}
                                <span style={{ marginRight: '8px' }}>اعتماد وتوزيع الأرباح</span>
                            </button>
                            <button type="button" onClick={() => setShowModal(false)} style={{ height: '48px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                إلغاء
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
