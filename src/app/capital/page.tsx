'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { 
    DollarSign, Plus, Loader2, X, TrendingUp, TrendingDown, 
    ChevronDown, ChevronUp, History, Info, AlertCircle, Save,
    Banknote, Users
} from 'lucide-react';
import { 
    C, CAIRO, INTER, TABLE_STYLE, SEARCH_STYLE, 
    KPI_STYLE, KPI_ICON, focusIn, focusOut, 
    PAGE_BASE, IS, LS, BTN_PRIMARY, BTN_DANGER 
} from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

interface Partner { id: string; name: string; share: number; capital: number; balance: number; }
interface CapitalChange { id: string; type: 'increase' | 'decrease'; amount: number; date: string; notes?: string; }
interface PartnerWithChanges extends Partner { changes: CapitalChange[]; }

export default function CapitalPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [data, setData] = useState<PartnerWithChanges[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [showModal, setShowModal] = useState<Partner | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        type: 'increase' as 'increase' | 'decrease',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const fetchData = useCallback(async () => {
        const res = await fetch('/api/capital');
        if (res.ok) setData(await res.json());
        setLoading(false);
    }, []);
    useEffect(() => { fetchData(); }, [fetchData]);

    const totalCapital = data.reduce((s, p) => s + p.capital, 0);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showModal) return;
        setSaving(true);
        const res = await fetch('/api/capital', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, partnerId: showModal.id, amount: parseFloat(form.amount) }),
        });
        if (res.ok) {
            setShowModal(null);
            setForm({ type: 'increase', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
            fetchData();
        } else { const d = await res.json(); alert(d.error || 'فشل الحفظ'); }
        setSaving(false);
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                
                <PageHeader
                    title="إدارة رأس المال"
                    subtitle="إدارة حصص الشركاء والمساهمات الرأسمالية وحقوق الملكية"
                    icon={DollarSign}
                />

                {/* KPI Header Stats */}
                {!loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: 'إجمالي رأس المال العام', val: totalCapital, color: C.blue, icon: DollarSign, suffix: 'ج.م' },
                            { label: 'عدد المساهمين', val: data.length, color: '#818cf8', icon: Users, suffix: 'شريك' },
                            { label: 'آخر تحديث لرأس المال', val: data.length > 0 ? new Date().toLocaleDateString('ar-EG-u-nu-latn') : '-', color: '#10b981', icon: History, suffix: '' },
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
                                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '4px', fontWeight: 900, color: s.color, fontFamily: INTER }} dir="ltr">
                                        <span>{typeof s.val === 'number' ? s.val.toLocaleString('en-US') : s.val}</span>
                                        {s.suffix && <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO, marginInlineStart: '4px' }}>{s.suffix}</span>}
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
                        <p style={{ color: C.textMuted, fontWeight: 800, fontFamily: CAIRO }}>جاري تحميل البيانات الرأسمالية...</p>
                    </div>
                ) : data.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.01)', border: `1px dashed ${C.border}`, borderRadius: '20px' }}>
                        <DollarSign size={48} style={{ opacity: 0.1, display: 'block', margin: '0 auto 16px', color: C.primary }} />
                        <h3 style={{ color: C.textPrimary, fontSize: '16px', fontWeight: 900, marginBottom: '6px', fontFamily: CAIRO }}>لا يوجد شركاء مسجلون</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: C.textMuted, fontFamily: CAIRO }}>قم بإضافة الشركاء أولاً من صفحة البيانات الأساسية</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                        {data.map(p => {
                            const increased = p.changes.filter(c => c.type === 'increase').reduce((s, c) => s + c.amount, 0);
                            const decreased = p.changes.filter(c => c.type === 'decrease').reduce((s, c) => s + c.amount, 0);
                            const isExpanded = expanded === p.id;

                            return (
                                <div key={p.id} style={{ 
                                    background: C.card, border: `1px solid ${C.border}`, borderRadius: '18px', 
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden', position: 'relative' 
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = `${C.blue}50`; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 15px 35px -12px ${C.blue}20`; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                                    
                                    <div style={{ padding: '20px' }}>
                                        {/* Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${C.blue}15`, border: `1px solid ${C.blue}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900, color: C.blue, fontFamily: CAIRO }}>
                                                    {p.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '15px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{p.name}</div>
                                                    <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, fontFamily: INTER }}>المساهمة الحالية: {p.share}%</div>
                                                </div>
                                            </div>
                                            <button onClick={() => setExpanded(isExpanded ? null : p.id)} style={{ padding: '6px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', color: C.textMuted, cursor: 'pointer' }}>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>

                                        {/* Main Value */}
                                        <div style={{ background: 'rgba(0,0,0,0.15)', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', marginBottom: '18px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 750, marginBottom: '6px', fontFamily: CAIRO }}>إجمالي القيمة الرأسمالية</div>
                                            <div style={{ fontSize: '24px', fontWeight: 950, color: C.blue, fontFamily: INTER }}>
                                                {p.capital.toLocaleString('en-US')} <span style={{ fontSize: '12px', fontFamily: CAIRO, opacity: 0.7 }}>ج.م</span>
                                            </div>
                                        </div>

                                        {/* Stats Row */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                                            <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '12px', padding: '10px' }}>
                                                <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 800, marginBottom: '2px', fontFamily: CAIRO }}>إجمالي الزيادات</div>
                                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#10b981', fontFamily: INTER }}>{increased.toLocaleString('en-US')}</div>
                                            </div>
                                            <div style={{ background: `${C.danger}05`, border: `1px solid ${C.danger}10`, borderRadius: '12px', padding: '10px' }}>
                                                <div style={{ fontSize: '10px', color: C.danger, fontWeight: 800, marginBottom: '2px', fontFamily: CAIRO }}>إجمالي التخفيضات</div>
                                                <div style={{ fontSize: '14px', fontWeight: 900, color: C.danger, fontFamily: INTER }}>{decreased.toLocaleString('en-US')}</div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => { setShowModal(p); setForm(f => ({ ...f, type: 'increase' })); }}
                                                style={{ flex: 1, height: '38px', borderRadius: '10px', border: 'none', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '12px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: CAIRO }}>
                                                <TrendingUp size={14} /> زيادة
                                            </button>
                                            <button onClick={() => { setShowModal(p); setForm(f => ({ ...f, type: 'decrease' })); }}
                                                style={{ flex: 1, height: '38px', borderRadius: '10px', border: 'none', background: `${C.danger}15`, color: C.danger, fontSize: '12px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: CAIRO }}>
                                                <TrendingDown size={14} /> تخفيض
                                            </button>
                                        </div>

                                        {/* Expanded History */}
                                        {isExpanded && (
                                            <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: `1px dashed ${C.border}`, animation: 'slideDown 0.3s ease-out' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                    <History size={14} style={{ color: C.textMuted }} />
                                                    <div style={{ fontSize: '11px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>سجل الحركات الرأسمالية</div>
                                                </div>
                                                
                                                {p.changes.length === 0 ? (
                                                    <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                                                        <Info size={16} style={{ color: C.textMuted, opacity: 0.5, marginBottom: '4px' }} />
                                                        <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>لا توجد حركات سابقة</div>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingInlineEnd: '4px' }}>
                                                        {p.changes.map((c, i) => (
                                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
                                                                <div>
                                                                    <div style={{ fontSize: '13px', fontWeight: 900, color: c.type === 'increase' ? '#10b981' : C.danger, fontFamily: INTER }}>
                                                                        {c.type === 'increase' ? '↑' : '↓'} {c.amount.toLocaleString('en-US')} <span style={{ fontSize: '9px', fontFamily: CAIRO, opacity: 0.7 }}>ج.م</span>
                                                                    </div>
                                                                    {c.notes && <div style={{ fontSize: '10px', color: C.textMuted, fontFamily: CAIRO, marginTop: '2px' }}>{c.notes}</div>}
                                                                </div>
                                                                <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 700, fontFamily: INTER }}>
                                                                    {new Date(c.date).toLocaleDateString('ar-EG-u-nu-latn')}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* MODAL: Capital Change */}
                <AppModal
                    show={showModal !== null}
                    onClose={() => setShowModal(null)}
                    title={showModal ? `تعديل رأس المال — ${showModal.name}` : ''}
                    icon={Banknote}
                >
                    {showModal && (
                        <form onSubmit={handleSave}>
                            {/* Current Summary */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px dashed ${C.border}`, borderRadius: '12px', padding: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 700, marginBottom: '2px', fontFamily: CAIRO }}>رأس المال الحالي</div>
                                    <div style={{ fontSize: '18px', fontWeight: 950, color: C.blue, fontFamily: INTER }}>{showModal.capital.toLocaleString('en-US')} ج.م</div>
                                </div>
                                <div style={{ textAlign: 'end' }}>
                                    <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 700, marginBottom: '2px', fontFamily: CAIRO }}>نسبة المساهمة</div>
                                    <div style={{ fontSize: '18px', fontWeight: 950, color: C.textSecondary, fontFamily: INTER }}>{showModal.share}%</div>
                                </div>
                            </div>

                            {/* Type Toggle */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                                <button type="button" onClick={() => setForm(f => ({ ...f, type: 'increase' }))}
                                    style={{ 
                                        padding: '12px', borderRadius: '12px', border: `1px solid ${form.type === 'increase' ? '#10b981' : C.border}`, 
                                        background: form.type === 'increase' ? 'rgba(16,185,129,0.1)' : 'transparent', 
                                        color: form.type === 'increase' ? '#10b981' : C.textSecondary, 
                                        fontSize: '13px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s',
                                        fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}>
                                    <TrendingUp size={16} /> زيادة رأس المال
                                </button>
                                <button type="button" onClick={() => setForm(f => ({ ...f, type: 'decrease' }))}
                                    style={{ 
                                        padding: '12px', borderRadius: '12px', border: `1px solid ${form.type === 'decrease' ? C.danger : C.border}`, 
                                        background: form.type === 'decrease' ? `${C.danger}15` : 'transparent', 
                                        color: form.type === 'decrease' ? C.danger : C.textSecondary, 
                                        fontSize: '13px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s',
                                        fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}>
                                    <TrendingDown size={16} /> تخفيض رأس المال
                                </button>
                            </div>

                            {/* Inputs */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={LS}>المبلغ (ج.م) *</label>
                                    <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{...IS, color: form.type === 'increase' ? '#10b981' : C.danger, fontWeight: 900, fontFamily: INTER}} onFocus={focusIn} onBlur={focusOut} placeholder="0.00" />
                                </div>
                                <div>
                                    <label style={LS}>تاريخ العملية</label>
                                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: INTER }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>

                            {/* New Balance Preview */}
                            {form.amount && parseFloat(form.amount) > 0 && (
                                <div style={{ background: `${C.blue}08`, border: `1px solid ${C.blue}20`, borderRadius: '12px', padding: '12px', marginBottom: '16px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 700, marginBottom: '4px', fontFamily: CAIRO }}>رأس المال بعد المعالجة</div>
                                    <div style={{ fontSize: '20px', fontWeight: 950, color: C.blue, fontFamily: INTER }}>
                                        {(form.type === 'increase' ? showModal.capital + parseFloat(form.amount) : showModal.capital - parseFloat(form.amount)).toLocaleString('en-US')} <span style={{ fontSize: '12px', fontFamily: CAIRO }}>ج.م</span>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginBottom: '24px' }}>
                                <label style={LS}>ملاحظات أو بيان</label>
                                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder="بيان تفصيلي لتعديل رأس المال..." />
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" disabled={saving} style={{ ...BTN_PRIMARY(false, saving), flex: 1.5, height: '48px', background: form.type === 'increase' ? 'linear-gradient(135deg, #10b981, #059669)' : `linear-gradient(135deg, ${C.danger}, #dc2626)` }}>
                                    {saving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Save size={18} />}
                                    <span style={{ marginInlineEnd: '8px' }}>اعتماد الحركة</span>
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
