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
                    title={t("إدارة رأس المال")}
                    subtitle={t("إدارة حصص الشركاء والمساهمات الرأسمالية وحقوق الملكية")}
                    icon={DollarSign}
                />

                {/* KPI Header Stats */}
                {!loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: t('إجمالي رأس المال العام'), val: totalCapital, color: C.blue, icon: DollarSign, suffix: t('ج.م') },
                            { label: t('عدد المساهمين'), val: data.length, color: '#818cf8', icon: Users, suffix: t('شريك') },
                            { label: t('آخر تحديث لرأس المال'), val: data.length > 0 ? new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB') : '-', color: '#10b981', icon: History, suffix: '' },
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
                        <p style={{ color: C.textMuted, fontWeight: 800, fontFamily: CAIRO }}>{t('جاري تحميل البيانات الرأسمالية...')}</p>
                    </div>
                ) : data.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.01)', border: `1px dashed ${C.border}`, borderRadius: '20px' }}>
                        <DollarSign size={48} style={{ opacity: 0.1, display: 'block', margin: '0 auto 16px', color: C.primary }} />
                        <h3 style={{ color: C.textPrimary, fontSize: '16px', fontWeight: 900, marginBottom: '6px', fontFamily: CAIRO }}>{t('لا يوجد شركاء مسجلون')}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: C.textMuted, fontFamily: CAIRO }}>{t('قم بإضافة الشركاء أولاً من صفحة البيانات الأساسية')}</p>
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
                                                    <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, fontFamily: INTER }}>{t('المساهمة الحالية')}: {p.share}%</div>
                                                </div>
                                            </div>
                                            <button onClick={() => setExpanded(isExpanded ? null : p.id)} style={{ padding: '6px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', color: C.textMuted, cursor: 'pointer' }}>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>

                                        {/* Main Value */}
                                        <div style={{ background: 'rgba(0,0,0,0.15)', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', marginBottom: '18px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 750, marginBottom: '6px', fontFamily: CAIRO }}>{t('إجمالي القيمة الرأسمالية')}</div>
                                            <div style={{ fontSize: '24px', fontWeight: 950, color: C.blue, fontFamily: INTER }}>
                                                {p.capital.toLocaleString('en-US')} <span style={{ fontSize: '12px', fontFamily: CAIRO, opacity: 0.7 }}>{t('ج.م')}</span>
                                            </div>
                                        </div>

                                        {/* Stats Row */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                                            <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '12px', padding: '10px' }}>
                                                <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 800, marginBottom: '2px', fontFamily: CAIRO }}>{t('إجمالي الزيادات')}</div>
                                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#10b981', fontFamily: INTER }}>{increased.toLocaleString('en-US')}</div>
                                            </div>
                                            <div style={{ background: `${C.danger}05`, border: `1px solid ${C.danger}10`, borderRadius: '12px', padding: '10px' }}>
                                                <div style={{ fontSize: '10px', color: C.danger, fontWeight: 800, marginBottom: '2px', fontFamily: CAIRO }}>{t('إجمالي التخفيضات')}</div>
                                                <div style={{ fontSize: '14px', fontWeight: 900, color: C.danger, fontFamily: INTER }}>{decreased.toLocaleString('en-US')}</div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => { setShowModal(p); setForm(f => ({ ...f, type: 'increase' })); }}
                                                style={{ flex: 1, height: '38px', borderRadius: '10px', border: 'none', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '12px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: CAIRO }}>
                                                <TrendingUp size={14} /> {t('زيادة')}
                                            </button>
                                            <button onClick={() => { setShowModal(p); setForm(f => ({ ...f, type: 'decrease' })); }}
                                                style={{ flex: 1, height: '38px', borderRadius: '10px', border: 'none', background: `${C.danger}15`, color: C.danger, fontSize: '12px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: CAIRO }}>
                                                <TrendingDown size={14} /> {t('تخفيض')}
                                            </button>
                                        </div>

                                        {/* Expanded History */}
                                        {isExpanded && (
                                            <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: `1px dashed ${C.border}`, animation: 'slideDown 0.3s ease-out' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                    <History size={14} style={{ color: C.textMuted }} />
                                                    <div style={{ fontSize: '11px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('سجل الحركات الرأسمالية')}</div>
                                                </div>
                                                
                                                {p.changes.length === 0 ? (
                                                    <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                                                        <Info size={16} style={{ color: C.textMuted, opacity: 0.5, marginBottom: '4px' }} />
                                                        <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{t('لا توجد حركات سابقة')}</div>
                                                    </div>
                                                ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
                    
                    {/* Current Partners List */}
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '14px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{t('المساهمة الحالية')}</div>
                            <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 750, background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '6px', fontFamily: INTER }}>
                                {totalCapital.toLocaleString()} {t('ج.م')}
                            </div>
                        </div>
                        
                        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            {loading ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <Loader2 size={24} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, margin: '0 auto' }} />
                                </div>
                            ) : partners.map(p => (
                                <div key={p.id} style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{p.name}</div>
                                        <div style={{ fontSize: '12px', fontWeight: 900, color: C.primary, fontFamily: INTER }}>{totalCapital > 0 ? ((p.capital / totalCapital) * 100).toFixed(1) : 0}%</div>
                                    </div>
                                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                                        <div style={{ width: `${totalCapital > 0 ? (p.capital / totalCapital) * 100 : 0}%`, height: '100%', background: C.primary, borderRadius: '2px' }} />
                                    </div>
                                    <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, fontFamily: INTER, textAlign: 'end' }}>
                                        {p.capital.toLocaleString()} {t('ج.م')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent History */}
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <History size={18} style={{ color: C.primary }} />
                            <div style={{ fontSize: '14px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{t('سجل الحركات الرأسمالية')}</div>
                        </div>
                        
                        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            {loading ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <Loader2 size={24} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, margin: '0 auto' }} />
                                </div>
                            ) : history.length === 0 ? (
                                <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                                    <History size={40} style={{ opacity: 0.1, margin: '0 auto 12px', display: 'block' }} />
                                    <p style={{ margin: 0, fontSize: '13px', color: C.textMuted, fontFamily: CAIRO }}>{t('لا توجد حركات سابقة')}</p>
                                </div>
                            ) : (
                                history.map((h, i) => (
                                    <div key={i} style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '18px' }}>
                                        <div style={{ 
                                            width: '40px', height: '40px', borderRadius: '12px', 
                                            background: h.type === 'increase' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                            color: h.type === 'increase' ? '#10b981' : C.danger, border: `1px solid ${h.type === 'increase' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
                                        }}>
                                            {h.type === 'increase' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{h.type === 'increase' ? t('زيادة رأس مال') : t('تخفيض رأس مال')}</div>
                                                <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, fontFamily: INTER }}>{new Date(h.date).toLocaleDateString(isRtl ? 'ar-EG-u-nu-latn' : 'en-GB')}</div>
                                            </div>
                                            <div style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO, marginBottom: '6px' }}>{h.notes || t('بدون بيان')}</div>
                                            <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: C.textMuted, fontWeight: 800, fontFamily: INTER }}>
                                               <span style={{ color: h.type === 'increase' ? '#10b981' : C.danger }}>{h.type === 'increase' ? '+' : '-'}{h.amount.toLocaleString()}</span>
                                               <span style={{ opacity: 0.5 }}>→</span>
                                               <span style={{ color: '#f1f5f9' }}>{t('الرصيد')}: {h.balanceAfter.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* MODAL: Adjust Capital */}
                <AppModal
                    show={showModal}
                    onClose={() => setShowModal(false)}
                    title={t("تعديل رأس المال")}
                    icon={TrendingUp}
                >
                    <form onSubmit={handleSave}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 900, color: C.textMuted, marginBottom: '8px', fontFamily: CAIRO }}>{t('رأس المال الحالي')}</div>
                            <div style={{ fontSize: '24px', fontWeight: 950, color: '#10b981', fontFamily: INTER }}>{totalCapital.toLocaleString()} <span style={{ fontSize: '12px', fontFamily: CAIRO }}>{t('ج.م')}</span></div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={LS}>{t('اختر الشريك')} <span style={{ color: C.danger }}>*</span></label>
                            <select required value={form.partnerId} onChange={e => setForm(f => ({ ...f, partnerId: e.target.value }))} style={IS} onFocus={focusIn} onBlur={focusOut}>
                                <option value="">{t('اختر الشريك...')}</option>
                                {partners.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} — {t('مساهمة الحالية')}: {p.capital.toLocaleString()}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            <button type="button" onClick={() => setForm(f => ({ ...f, type: 'increase' }))}
                                style={{ 
                                    height: '48px', borderRadius: '12px', border: `1px solid ${form.type === 'increase' ? '#10b981' : C.border}`, 
                                    background: form.type === 'increase' ? 'rgba(16,185,129,0.1)' : 'transparent',
                                    color: form.type === 'increase' ? '#10b981' : C.textSecondary,
                                    fontSize: '14px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontFamily: CAIRO
                                }}>
                                <ArrowUpPlus size={18} /> {t('زيادة')}
                            </button>
                            <button type="button" onClick={() => setForm(f => ({ ...f, type: 'decrease' }))}
                                style={{ 
                                    height: '48px', borderRadius: '12px', border: `1px solid ${form.type === 'decrease' ? C.danger : C.border}`, 
                                    background: form.type === 'decrease' ? 'rgba(239,68,68,0.1)' : 'transparent',
                                    color: form.type === 'decrease' ? C.danger : C.textSecondary,
                                    fontSize: '14px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontFamily: CAIRO
                                }}>
                                <ArrowDownToLine size={18} /> {t('تخفيض')}
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={LS}>{t('المبلغ')} <span style={{ color: C.danger }}>*</span></label>
                                <input required type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{...IS, color: form.type === 'increase' ? '#10b981' : C.danger, fontWeight: 900, fontFamily: INTER}} onFocus={focusIn} onBlur={focusOut} placeholder="0.00" />
                            </div>
                            <div>
                                <label style={LS}>{t('تاريخ الحركة')}</label>
                                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: INTER }} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={LS}>{t('ملاحظات أو بيان')}</label>
                            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                                style={{ ...IS, height: 'auto', padding: '12px 14px', resize: 'none' } as any}
                                onFocus={focusIn} onBlur={focusOut} placeholder={t("بيان تفصيلي لتعديل رأس المال...")} />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={saving} style={{ ...BTN_PRIMARY(false, saving), flex: 1.5, height: '48px' }}>
                                {saving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : <CheckCircle2 size={18} />}
                                <span style={{ marginInlineEnd: '8px' }}>{t('اعتماد الحركة')}</span>
                            </button>
                            <button type="button" onClick={() => setShowModal(false)} style={{ height: '48px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
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
