'use client';
import { formatNumber } from '@/lib/currency';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Currency } from '@/components/Currency';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { DollarSign, Plus, Loader2, X, TrendingUp, TrendingDown, ChevronDown, ChevronUp, History, Info, AlertCircle, Save, Banknote, Users, CheckCircle2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { C, CAIRO, OUTFIT, TABLE_STYLE, SEARCH_STYLE, KPI_STYLE, KPI_ICON, focusIn, focusOut, PAGE_BASE, IS, LS, BTN_PRIMARY, BTN_DANGER } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import { useCurrency } from '@/hooks/useCurrency';

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
    const { symbol: cSymbol, fMoneyJSX } = useCurrency();
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
                        {label: t('إجمالي رأس المال العام'), val: totalCapital, color: C.blue, icon: <DollarSign size={18} />, suffix: cSymbol},
                        {label: t('عدد المساهمين'), val: data.length, color: '#818cf8', icon: <Users size={18} />, suffix: t('شريك')},
                        {label: t('آخر تحديث لرأس المال'), val: data.length > 0 ? new Date().toLocaleDateString(isRtl ? 'ar-EG-u-nu-latn' : 'en-GB') : '-', color: '#10b981', icon: <History size={18} />, suffix: ''},
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

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px' }}>
                        <Loader2 size={40} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, margin: '0 auto 16px', display: 'block' }} />
                        <p style={{ color: C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>{t('جاري تحميل البيانات الرأسمالية...')}</p>
                    </div>
                ) : data.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.01)', border: `1px dashed ${C.border}`, borderRadius: '20px' }}>
                        <DollarSign size={48} style={{ opacity: 0.1, display: 'block', margin: '0 auto 16px', color: C.primary }} />
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
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('إجمالي رأس المال')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('الزيادات / التخفيضات')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false, true), textAlign: 'center' }}>{t('الإجراءات')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((p, idx) => {
                                    const changes = p.changes || [];
                                    const increased = changes.filter(c => c.type === 'increase').reduce((s, c) => s + c.amount, 0);
                                    const decreased = changes.filter(c => c.type === 'decrease').reduce((s, c) => s + c.amount, 0);
                                    const isExpanded = expanded === p.id;

                                    return (
                                        <React.Fragment key={p.id}>
                                            <tr style={TABLE_STYLE.row(idx === data.length - 1 && !isExpanded)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={TABLE_STYLE.td(true)}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: `${C.primary}10`, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: OUTFIT }}>
                                                            {p.name?.charAt(0)}
                                                        </div>
                                                        <div style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{p.name}</div>
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: OUTFIT }}>{p.share}%</div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT }}>
                                                        <Currency amount={p.capital} />
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                        <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, fontFamily: OUTFIT }}>
                                                            <span style={{ marginInlineEnd: '2px' }}>+</span>
                                                            <Currency amount={increased} showSymbol={false} />
                                                        </div>
                                                        <div style={{ width: 1, height: 12, background: C.border }} />
                                                        <div style={{ fontSize: '11px', color: C.danger, fontWeight: 700, fontFamily: OUTFIT }}>
                                                            <span style={{ marginInlineEnd: '2px' }}>-</span>
                                                            <Currency amount={decreased} showSymbol={false} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, true), textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                        <button onClick={() => { setShowModal(p); setForm(f => ({ ...f, type: 'increase' })); }}
                                                            style={{ ...TABLE_STYLE.actionBtn('#10b981'), background: 'rgba(16,185,129,0.1)' }} title={t("زيادة")}>
                                                            <TrendingUp size={14} />
                                                        </button>
                                                        <button onClick={() => { setShowModal(p); setForm(f => ({ ...f, type: 'decrease' })); }}
                                                            style={{ ...TABLE_STYLE.actionBtn(C.danger), background: `${C.danger}10` }} title={t("تخفيض")}>
                                                            <TrendingDown size={14} />
                                                        </button>
                                                        <button onClick={() => setExpanded(isExpanded ? null : p.id)}
                                                            style={{ ...TABLE_STYLE.actionBtn(isExpanded ? C.primary : C.textSecondary) }}>
                                                            {isExpanded ? <ChevronUp size={14} /> : <History size={14} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={5} style={{ padding: '0', background: 'rgba(37, 106, 244, 0.02)' }}>
                                                        <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, animation: 'fadeIn 0.3s ease' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                                <History size={14} style={{ color: C.primary }} />
                                                                <div style={{ fontSize: '12px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('سجل حركات رأس المال')}</div>
                                                            </div>
                                                            {changes.length === 0 ? (
                                                                <div style={{ padding: '10px', color: C.textMuted, fontSize: '12px', textAlign: 'center', fontFamily: CAIRO }}>{t('لا توجد حركات مسجلة لهذا الشريك')}</div>
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
                                                                        {changes.map((c, cIdx) => (
                                                                            <tr key={cIdx} style={{ ...TABLE_STYLE.row(cIdx === changes.length - 1), background: 'transparent' }}>
                                                                                <td style={{ ...TABLE_STYLE.td(true), padding: '10px 16px', fontSize: '12px', color: C.textMuted, fontFamily: OUTFIT }}>
                                                                                    {new Date(c.date).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                                                </td>
                                                                                <td style={{ ...TABLE_STYLE.td(false), padding: '10px 16px' }}>
                                                                                    <span style={{ 
                                                                                        display: 'inline-flex', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', 
                                                                                        fontWeight: 600, 
                                                                                        background: c.type === 'increase' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                                                        color: c.type === 'increase' ? '#10b981' : C.danger,
                                                                                        fontFamily: CAIRO
                                                                                    }}>{c.type === 'increase' ? t('زيادة') : t('تخفيض')}</span>
                                                                                </td>
                                                                                <td style={{ ...TABLE_STYLE.td(false, true), padding: '10px 16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>
                                                                                    <Currency amount={c.amount} />
                                                                                </td>
                                                                                <td style={{ ...TABLE_STYLE.td(false), padding: '10px 16px', fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>
                                                                                    {c.notes || '—'}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
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

                {/* MODAL: Adjust Capital */}
                <AppModal
                    show={!!showModal}
                    onClose={() => setShowModal(null)}
                    title={`${t('تعديل رأس مال')} : ${showModal?.name || ''}`}
                    icon={DollarSign}
                >
                    <form onSubmit={handleSave}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, marginBottom: '8px', fontFamily: CAIRO }}>{t('القيمة الرأسمالية الحالية')}</div>
                            <div style={{ fontSize: '24px', fontWeight: 950, color: C.textPrimary, fontFamily: OUTFIT }}>
                                {fMoneyJSX(showModal?.capital || 0)}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            <button type="button" onClick={() => setForm(f => ({ ...f, type: 'increase' }))}
                                style={{ 
                                    height: '48px', borderRadius: '12px', border: `1px solid ${form.type === 'increase' ? '#10b981' : C.border}`, 
                                    background: form.type === 'increase' ? 'rgba(16,185,129,0.1)' : 'transparent',
                                    color: form.type === 'increase' ? '#10b981' : C.textSecondary,
                                    fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontFamily: CAIRO
                                }}>
                                <TrendingUp size={18} /> {t('زيادة')}
                            </button>
                            <button type="button" onClick={() => setForm(f => ({ ...f, type: 'decrease' }))}
                                style={{ 
                                    height: '48px', borderRadius: '12px', border: `1px solid ${form.type === 'decrease' ? C.danger : C.border}`, 
                                    background: form.type === 'decrease' ? 'rgba(239,68,68,0.1)' : 'transparent',
                                    color: form.type === 'decrease' ? C.danger : C.textSecondary,
                                    fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontFamily: CAIRO
                                }}>
                                <TrendingDown size={18} /> {t('تخفيض')}
                            </button>
                        </div>

                        <div style={{ position: 'relative', marginBottom: '24px' }}>
                            <label style={{ ...LS, textAlign: 'center', display: 'block', marginBottom: '12px', fontSize: '13px' }}>{t('المبلغ المراد تعديله')}</label>
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
                            <button type="button" onClick={() => setShowModal(null)} style={{ height: '48px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
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
