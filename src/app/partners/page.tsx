'use client';
import { formatNumber } from '@/lib/currency';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { Users, Plus, X, Loader2, Pencil, Trash2, Phone, StickyNote, TrendingUp, ArrowUpDown, PieChart, DollarSign, CheckCircle2, AlertTriangle, Save, MoreVertical, ExternalLink } from 'lucide-react';
import { C, CAIRO, OUTFIT, TABLE_STYLE, SEARCH_STYLE, KPI_STYLE, KPI_ICON, focusIn, focusOut, PAGE_BASE, IS, LS, BTN_PRIMARY, BTN_DANGER } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

interface Partner {
    id: string; name: string; share: number; capital: number;
    balance: number; phone?: string; notes?: string;
    _count: { transactions: number };
}

const BLANK = { name: '', capital: '', phone: '', notes: '' };
const PARTNER_COLORS = ['#6366f1', '#a78bfa', '#34d399', '#60a5fa', '#f97316', '#f472b6', '#fb923c'];

export default function PartnersPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);

    /* modal: null=closed, 'add'=add new, Partner=edit */
    const [modal, setModal] = useState<null | 'add' | Partner>(null);
    const [form, setForm] = useState(BLANK);

    const fetchData = useCallback(async () => {
        const res = await fetch('/api/partners');
        if (res.ok) setPartners(await res.json());
        setLoading(false);
    }, []);
    useEffect(() => { fetchData(); }, [fetchData]);

    const openAdd = () => { setForm(BLANK); setModal('add'); };
    const openEdit = (p: Partner) => {
        setForm({ name: p.name, capital: String(p.capital), phone: p.phone || '', notes: p.notes || '' });
        setModal(p);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const isEdit = modal !== 'add';
        const url = '/api/partners';
        const method = isEdit ? 'PUT' : 'POST';
        
        const body = { 
            name: form.name,
            capital: form.capital,
            phone: form.phone,
            notes: form.notes,
            ...(isEdit ? { id: (modal as Partner).id } : {}) 
        };

        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) { setModal(null); fetchData(); }
        else { const d = await res.json(); alert(d.error || t('فشل الحفظ')); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        const res = await fetch('/api/partners', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) });
        if (res.ok) { setDeleteTarget(null); fetchData(); }
        else { alert(t('فشل الحذف')); }
        setSaving(false);
    };

    const totalCapital = partners.reduce((s, p) => s + p.capital, 0);
    const totalShare = partners.reduce((s, p) => s + p.share, 0);
    const totalBalance = partners.reduce((s, p) => s + p.balance, 0);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                
                <PageHeader
                    title={t("بيانات الشركاء")}
                    subtitle={t("إدارة الحصص ورأس المال وتوزيع الأرباح")}
                    icon={Users}
                    primaryButton={{
                        label: t("شريك جديد"),
                        onClick: openAdd,
                        icon: Plus
                    }}
                />

                {!loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: t('إجمالي رأس المال'), val: totalCapital, color: C.blue, icon: DollarSign, suffix: t('ج.م') },
                            { label: t('إجمالي الحصص'), val: totalShare.toFixed(1), color: '#818cf8', icon: PieChart, suffix: '%' },
                            { label: t('إجمالي الأرصدة'), val: totalBalance, color: totalBalance >= 0 ? '#10b981' : C.danger, icon: TrendingUp, suffix: t('ج.م') },
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
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontWeight: 600, color: s.color, fontFamily: OUTFIT }} dir="ltr">
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

                {!loading && partners.length > 0 && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ fontSize: '13px', color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <PieChart size={16} style={{ color: C.primary }} />
                                {t('توزيع الحصص الفعلي')}
                            </div>
                            <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, fontFamily: OUTFIT }}>{t('الإجمالي')}: 100%</div>
                        </div>
                        
                        <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', gap: '2px', background: 'rgba(255,255,255,0.03)' }}>
                            {partners.map((p, i) => (
                                <div key={p.id} title={`${p.name}: ${p.share}%`}
                                    style={{ width: `${p.share}%`, background: PARTNER_COLORS[i % PARTNER_COLORS.length], transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                            ))}
                            {totalShare < 100 && (
                                <div title={`${t('غير موزع')}: ${(100 - totalShare).toFixed(1)}%`}
                                    style={{ width: `${100 - totalShare}%`, background: 'rgba(255,255,255,0.06)', borderInlineStart: '1px dashed rgba(255,255,255,0.1)' }} />
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
                            {partners.map((p, i) => (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PARTNER_COLORS[i % PARTNER_COLORS.length] }} />
                                    {p.name} <span style={{ fontFamily: OUTFIT, opacity: 0.8, fontSize: '11px' }}>({p.share}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div style={{ padding: '80px' }}>
                        <Loader2 size={40} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, margin: '0 auto 16px' }} />
                        <p style={{ margin: 0, color: C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>{t('جاري استرجاع سجلات الشركاء...')}</p>
                    </div>
                ) : partners.length === 0 ? (
                    <div style={{ padding: '80px 20px', background: 'rgba(255,255,255,0.01)', border: `1px dashed ${C.border}`, borderRadius: '20px' }}>
                        <Users size={48} style={{ opacity: 0.1, display: 'block', margin: '0 auto 16px', color: C.primary }} />
                        <h3 style={{ color: C.textPrimary, fontSize: '13px', fontWeight: 600, marginBottom: '6px', fontFamily: CAIRO }}>{t('لا يوجد شركاء مسجلون')}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: C.textMuted, fontFamily: CAIRO }}>{t('ابدأ بإضافة أول شريك للشركة لإدارة الحصص والأرباح')}</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {partners.map((p, i) => {
                            const color = PARTNER_COLORS[i % PARTNER_COLORS.length];
                            return (
                                <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '18px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'hidden', position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                                     onMouseEnter={e => { 
                                         e.currentTarget.style.borderColor = `${color}60`; 
                                         e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)'; 
                                         e.currentTarget.style.background = `linear-gradient(135deg, ${C.card}, ${color}05)`; 
                                         e.currentTarget.style.boxShadow = `0 20px 35px -12px ${color}30`; 
                                     }}
                                     onMouseLeave={e => { 
                                         e.currentTarget.style.borderColor = C.border; 
                                         e.currentTarget.style.transform = 'none'; 
                                         e.currentTarget.style.background = C.card; 
                                         e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'; 
                                     }}>
                                    
                                    <div style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600, color, fontFamily: CAIRO }}>
                                                    {p.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '15px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, marginBottom: '2px' }}>{p.name}</div>
                                                    <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 600, fontFamily: OUTFIT, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Phone size={10} /> {p.phone || '—'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ background: `${color}15`, color, borderRadius: '10px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, fontFamily: OUTFIT, border: `1px solid ${color}20` }}>
                                                {p.share}%
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                                            <div style={{ }}>
                                                <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 750, marginBottom: '4px', fontFamily: CAIRO }}>{t('رأس المال')}</div>
                                                <div style={{ fontSize: '15px', fontWeight: 600, color: C.blue, fontFamily: OUTFIT }}>{formatNumber(p.capital)} <span style={{ fontSize: '10px', fontFamily: CAIRO, opacity: 0.7 }}>{t('ج.م')}</span></div>
                                            </div>
                                            <div style={{ }}>
                                                <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 750, marginBottom: '4px', fontFamily: CAIRO }}>{t('الرصيد الجاري')}</div>
                                                <div style={{ fontSize: '15px', fontWeight: 600, color: p.balance >= 0 ? '#10b981' : C.danger, fontFamily: OUTFIT }}>
                                                    {(p.balance)} <span style={{ fontSize: '10px', fontFamily: CAIRO, opacity: 0.7 }}>{t('ج.م')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => router.push('/partner-accounts')}
                                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '36px', borderRadius: '10px', border: `1px solid ${color}30`, background: `${color}10`, color, fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: CAIRO }}>
                                                <ExternalLink size={13} />
                                                {t('كشف الحساب')}
                                            </button>
                                            <button onClick={() => openEdit(p)} style={{ ...TABLE_STYLE.actionBtn(), width: '36px', height: '36px' }} title={t("تعديل")}>
                                                <Pencil size={15} />
                                            </button>
                                            <button onClick={() => setDeleteTarget(p)} style={{ ...TABLE_STYLE.actionBtn(C.danger), width: '36px', height: '36px' }} title={t("حذف")}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div style={{ position: 'absolute', bottom: 0, insetInlineEnd: 0, insetInlineStart: 0, height: '3px', background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ height: '100%', width: `${p.share}%`, background: color, transition: 'width 1s ease-out' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <AppModal
                    show={modal !== null}
                    onClose={() => setModal(null)}
                    title={modal === 'add' ? t('إضافة شريك جديد') : t('تعديل بيانات الشريك')}
                    icon={Users}
                >
                    <form onSubmit={handleSave}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={LS}>{t('اسم الشريك')} <span style={{ color: C.danger }}>*</span></label>
                            <input required type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={IS} onFocus={focusIn} onBlur={focusOut} placeholder={t("أدخل اسم الشريك الكامل...")} />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>{t('رأس المال (ج.م)')} <span style={{ color: C.danger }}>*</span></label>
                                <input required type="number" min="0" step="0.01" value={form.capital} onChange={e => setForm(f => ({ ...f, capital: e.target.value }))} style={{...IS, color: '#10b981', fontFamily: OUTFIT}} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={LS}>{t('النسبة المحسوبة (%)')}</label>
                                <div style={{...IS, background: 'rgba(255,255,255,0.02)', border: `1px dashed ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 600, color: C.primary, fontFamily: OUTFIT}}>
                                    {(() => {
                                        const cap = parseFloat(form.capital) || 0;
                                        const otherCap = partners
                                            .filter(pInfo => {
                                                if (!modal || modal === 'add') return true;
                                                return pInfo.id !== (modal as any).id;
                                            })
                                            .reduce((s, pInfo) => s + pInfo.capital, 0);
                                        const total = otherCap + cap;
                                        return total > 0 ? ((cap / total) * 100).toFixed(2) : '0.00';
                                    })()}%
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={LS}>{t('رقم الهاتف')}</label>
                            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} placeholder="05xxxxxxxx" />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={LS}>{t('ملاحظات')}</label>
                            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                                style={{ ...IS, height: 'auto', padding: '12px 14px', resize: 'none' } as any}
                                onFocus={focusIn} onBlur={focusOut} placeholder={t("أية ملاحظات إضافية...")} />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={saving} style={{ ...BTN_PRIMARY(false, saving), flex: 1, height: '48px' }}>
                                {saving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Save size={18} />}
                                <span style={{ marginInlineEnd: '8px' }}>{modal === 'add' ? t('إضافة الشريك') : t('حفظ التعديلات')}</span>
                            </button>
                            <button type="button" onClick={() => setModal(null)} style={{ height: '48px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                {t('إلغاء')}
                            </button>
                        </div>
                    </form>
                </AppModal>

                <AppModal
                    show={deleteTarget !== null}
                    onClose={() => setDeleteTarget(null)}
                    isDelete={true}
                    title={t("تأكيد حذف الشريك")}
                    itemName={deleteTarget?.name}
                    onConfirm={handleDelete}
                    isSubmitting={saving}
                />
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />
        </DashboardLayout>
    );
}
