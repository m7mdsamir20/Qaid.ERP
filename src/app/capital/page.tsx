'use client';
import { formatNumber } from '@/lib/currency';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { DollarSign, Plus, Loader2, X, TrendingUp, TrendingDown, ChevronDown, ChevronUp, History, Info, AlertCircle, Save, Banknote, Users, CheckCircle2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { C, CAIRO, OUTFIT, TABLE_STYLE, SEARCH_STYLE, KPI_STYLE, KPI_ICON, focusIn, focusOut, PAGE_BASE, IS, LS, BTN_PRIMARY, BTN_DANGER } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

interface CapitalChange { 
    id: string; 
    type: 'increase' | 'decrease'; 
    amount: number; 
    date: string; 
    notes?: string; 
}

interface Partner { 
    id: string; 
    name: string; 
    share: number; 
    capital: number; 
    balance: number; 
    changes: CapitalChange[];
}

export default function CapitalPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [data, setData] = useState<Partner[]>([]);
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
        try {
            const res = await fetch('/api/capital');
            if (res.ok) {
                const json = await res.json();
                setData(Array.isArray(json) ? json : []);
            }
        } catch (error) {
            console.error('Failed to fetch capital data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totalCapital = useMemo(() => data.reduce((s, p) => s + (p.capital || 0), 0), [data]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showModal || !form.amount) return;
        setSaving(true);
        try {
            const res = await fetch('/api/capital', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...form, 
                    partnerId: showModal.id, 
                    amount: parseFloat(form.amount) 
                }),
            });
            if (res.ok) {
                setShowModal(null);
                setForm({ type: 'increase', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
                fetchData();
            } else { 
                const d = await res.json(); 
                alert(d.error || t('فشل الحفظ')); 
            }
        } catch (error) {
            alert(t('حدث خطأ أثناء الاتصال بالسيرفر'));
        } finally {
            setSaving(false);
        }
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
                            { label: t('آخر تحديث لرأس المال'), val: data.length > 0 ? new Date().toLocaleDateString(isRtl ? 'ar-EG-u-nu-latn' : 'en-GB') : '-', color: '#10b981', icon: History, suffix: '' },
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
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', fontWeight: 900, color: s.color, fontFamily: OUTFIT }} dir="ltr">
                                        <span>{typeof s.val === 'number' ? s.val : s.val}</span>
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
                    <div style={{ padding: '100px' }}>
                        <Loader2 size={40} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, margin: '0 auto 16px', display: 'block' }} />
                        <p style={{ color: C.textMuted, fontWeight: 800, fontFamily: CAIRO }}>{t('جاري تحميل البيانات الرأسمالية...')}</p>
                    </div>
                ) : data.length === 0 ? (
                    <div style={{ padding: '80px 20px', background: 'rgba(255,255,255,0.01)', border: `1px dashed ${C.border}`, borderRadius: '20px' }}>
                        <DollarSign size={48} style={{ opacity: 0.1, display: 'block', margin: '0 auto 16px', color: C.primary }} />
                        <h3 style={{ color: C.textPrimary, fontSize: '16px', fontWeight: 900, marginBottom: '6px', fontFamily: CAIRO }}>{t('لا يوجد شركاء مسجلون')}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: C.textMuted, fontFamily: CAIRO }}>{t('قم بإضافة الشركاء أولاً من صفحة البيانات الأساسية')}</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                        {data.map(p => {
                            const changes = p.changes || [];
                            const increased = changes.filter(c => c.type === 'increase').reduce((s, c) => s + c.amount, 0);
                            const decreased = changes.filter(c => c.type === 'decrease').reduce((s, c) => s + c.amount, 0);
                            const isExpanded = expanded === p.id;

                            return (
                                <div key={p.id} style={{ 
                                    background: C.card, border: `1px solid ${isExpanded ? C.primary : C.border}`, borderRadius: '18px', 
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden', position: 'relative' 
                                }}>
                                    
                                    <div style={{ padding: '20px' }}>
                                        {/* Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${C.blue}15`, border: `1px solid ${C.blue}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900, color: C.blue, fontFamily: CAIRO }}>
                                                    {p.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '15px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{p.name}</div>
                                                    <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, fontFamily: OUTFIT }}>{t('الحصة')}: {p.share}%</div>
                                                </div>
                                            </div>
                                            <button onClick={() => setExpanded(isExpanded ? null : p.id)} style={{ padding: '6px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', color: C.textMuted, cursor: 'pointer', transition: '0.2s' }}>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>

                                        {/* Main Value */}
                                        <div style={{ background: 'rgba(0,0,0,0.15)', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', marginBottom: '18px' }}>
                                            <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 750, marginBottom: '6px', fontFamily: CAIRO }}>{t('إجمالي القيمة الرأسمالية')}</div>
                                            <div style={{ fontSize: '24px', fontWeight: 950, color: C.blue, fontFamily: OUTFIT }}>
                                                {formatNumber(p.capital)} <span style={{ fontSize: '12px', fontFamily: CAIRO, opacity: 0.7 }}>{t('ج.م')}</span>
                                            </div>
                                        </div>

                                        {/* Stats Row */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                                            <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '12px', padding: '10px' }}>
                                                <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 800, marginBottom: '2px', fontFamily: CAIRO }}>{t('زيادات')}</div>
                                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#10b981', fontFamily: OUTFIT }}>{formatNumber(increased)}</div>
                                            </div>
                                            <div style={{ background: `${C.danger}05`, border: `1px solid ${C.danger}10`, borderRadius: '12px', padding: '10px' }}>
                                                <div style={{ fontSize: '10px', color: C.danger, fontWeight: 800, marginBottom: '2px', fontFamily: CAIRO }}>{t('تخفيضات')}</div>
                                                <div style={{ fontSize: '14px', fontWeight: 900, color: C.danger, fontFamily: OUTFIT }}>{formatNumber(decreased)}</div>
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
                                                    <div style={{ fontSize: '11px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('سجل الحركات')}</div>
                                                </div>
                                                
                                                {changes.length === 0 ? (
                                                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                                                        <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{t('لا توجد حركات سابقة')}</div>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {changes.map((c, i) => (
                                                            <div key={i} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: c.type === 'increase' ? '#10b981' : C.danger, fontFamily: CAIRO }}>
                                                                        {c.type === 'increase' ? t('زيادة') : t('تخفيض')}
                                                                    </div>
                                                                    <div style={{ fontSize: '10px', color: C.textMuted, fontFamily: OUTFIT }}>{new Date(c.date).toLocaleDateString(isRtl ? 'ar-EG-u-nu-latn' : 'en-GB')}</div>
                                                                </div>
                                                                <div style={{ textAlign: 'end' }}>
                                                                    <div style={{ fontSize: '13px', fontWeight: 900, color: C.textPrimary, fontFamily: OUTFIT }}>
                                                                        {c.type === 'increase' ? '+' : '-'}{c.amount.toLocaleString()}
                                                                    </div>
                                                                    <div style={{ fontSize: '9px', color: C.textMuted, fontFamily: CAIRO }}>{t('ج.م')}</div>
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

                {/* MODAL: Adjust Capital */}
                <AppModal
                    show={!!showModal}
                    onClose={() => setShowModal(null)}
                    title={`${t('تعديل رأس مال')} : ${showModal?.name || ''}`}
                    icon={DollarSign}
                >
                    <form onSubmit={handleSave}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 900, color: C.textMuted, marginBottom: '8px', fontFamily: CAIRO }}>{t('القيمة الرأسمالية الحالية')}</div>
                            <div style={{ fontSize: '24px', fontWeight: 950, color: C.blue, fontFamily: OUTFIT }}>
                                {showModal?.capital.toLocaleString() || 0} <span style={{ fontSize: '12px', fontFamily: CAIRO }}>{t('ج.م')}</span>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            <button type="button" onClick={() => setForm(f => ({ ...f, type: 'increase' }))}
                                style={{ 
                                    height: '48px', borderRadius: '12px', border: `1px solid ${form.type === 'increase' ? '#10b981' : C.border}`, 
                                    background: form.type === 'increase' ? 'rgba(16,185,129,0.1)' : 'transparent',
                                    color: form.type === 'increase' ? '#10b981' : C.textSecondary,
                                    fontSize: '14px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontFamily: CAIRO
                                }}>
                                <TrendingUp size={18} /> {t('زيادة')}
                            </button>
                            <button type="button" onClick={() => setForm(f => ({ ...f, type: 'decrease' }))}
                                style={{ 
                                    height: '48px', borderRadius: '12px', border: `1px solid ${form.type === 'decrease' ? C.danger : C.border}`, 
                                    background: form.type === 'decrease' ? 'rgba(239,68,68,0.1)' : 'transparent',
                                    color: form.type === 'decrease' ? C.danger : C.textSecondary,
                                    fontSize: '14px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontFamily: CAIRO
                                }}>
                                <TrendingDown size={18} /> {t('تخفيض')}
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={LS}>{t('المبلغ')} <span style={{ color: C.danger }}>*</span></label>
                                <input required type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{...IS, color: form.type === 'increase' ? '#10b981' : C.danger, fontWeight: 900, fontFamily: OUTFIT}} onFocus={focusIn} onBlur={focusOut} placeholder="0.00" />
                            </div>
                            <div>
                                <label style={LS}>{t('تاريخ الحركة')}</label>
                                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
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
                            <button type="button" onClick={() => setShowModal(null)} style={{ height: '48px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
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
