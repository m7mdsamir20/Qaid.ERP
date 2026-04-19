'use client';
import {
    THEME, C, CAIRO, INTER, PAGE_BASE, BTN_PRIMARY, IS, LS, focusIn, focusOut, TABLE_STYLE
} from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useTranslation } from '@/lib/i18n';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import AppModal from '@/components/AppModal';
import {
    Landmark, Plus, Banknote, Building2, Pencil, Trash2,
    Loader2, X, TrendingUp, TrendingDown, Wallet, AlertTriangle, Building, CreditCard, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { getListCache, setListCache } from '@/lib/listCache';

/* ── Types ── */
interface Treasury {
    id: string; name: string; type: 'cash' | 'bank';
    bankName?: string; accountNumber?: string; balance: number;
    accountId?: string;
}

/* ── Treasury Modal (Same design as Customer Modal) ── */
function TreasuryModal({ initial, onClose, onSaved }: { initial?: Treasury | null, onClose: () => void, onSaved: () => void }) {
    const { t } = useTranslation();
    const isEdit = !!initial;
    const [currencySymbol, setCurrencySymbol] = useState(t('ج.م'));
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: initial?.name || '',
        type: initial?.type || 'cash' as 'cash' | 'bank',
        bankName: initial?.bankName || '',
        accountNumber: initial?.accountNumber || '',
        balance: initial?.balance?.toString() || '',
        accountId: initial?.accountId || '',
    });

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(data => {
            const cur = data?.company?.currency;
            if (cur) {
                const maps: any = { 'EGP': t('ج.م'), 'SAR': t('ر.س'), 'USD': t('دولار'), 'AED': t('د.إ') };
                setCurrencySymbol(maps[cur] || cur);
            }
        }).catch(() => {});
    }, []);

    const formatWithCommas = (val: string) => {
        if (!val) return '';
        const num = val.replace(/,/g, '');
        if (isNaN(Number(num))) return val;
        const [int, dec] = num.split('.');
        return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec !== undefined ? '.' + dec : '');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const numericBalance = parseFloat(form.balance.replace(/,/g, '')) || 0;
            const res = await fetch('/api/treasuries' + (isEdit ? `/${initial!.id}` : ''), {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, openingBalance: numericBalance })
            });
            if (res.ok) onSaved();
            else { const d = await res.json(); alert(d.error || t('فشل الحفظ')); }
        } catch { }
        finally { setSaving(false); }
    };

    return (
        <AppModal show={true} onClose={onClose} title={isEdit ? t('تعديل بيانات الخزينة / البنك') : t('إضافة خزينة / بنك جديد')} icon={isEdit ? Pencil : Landmark} maxWidth="520px">
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                <div>
                    <label style={{ ...LS, fontSize: '11px', marginBottom: '8px', color: C.textSecondary }}>{t('المسمى / الاسم')} <span style={{ color: C.danger }}>*</span></label>
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder={t("مثال: الخزينة الرئيسية، بنك CIB")} style={{ ...IS, fontSize: '13px' }} onFocus={focusIn} onBlur={focusOut} autoFocus />
                </div>

                {/* Type Toggle */}
                <div>
                    <label style={{ ...LS, fontSize: '11px', marginBottom: '8px', color: C.textSecondary }}>{t('نوع السيولة')} <span style={{ color: C.danger }}>*</span></label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {[
                            { val: 'cash', label: t('نقدي (خزينة)'), icon: <Banknote size={17} />, color: C.success },
                            { val: 'bank', label: t('بنكي (حساب)'), icon: <Building2 size={17} />, color: C.primary },
                        ].map(opt => (
                            <button key={opt.val} type="button"
                                onClick={() => setForm(f => ({ ...f, type: opt.val as any }))}
                                style={{
                                    padding: '10px', borderRadius: '12px', border: '1px solid',
                                    borderColor: form.type === opt.val ? opt.color : C.border,
                                    background: form.type === opt.val ? `${opt.color}15` : C.subtle,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    justifyContent: 'center', fontSize: '13px', fontWeight: 800, fontFamily: CAIRO,
                                    color: form.type === opt.val ? C.textPrimary : C.textSecondary
                                }}>
                                <span style={{ opacity: form.type === opt.val ? 1 : 0.6, color: form.type === opt.val ? opt.color : 'inherit' }}>{opt.icon}</span>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bank fields */}
                {form.type === 'bank' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px', background: 'rgba(59,130,246,0.02)', border: `1px solid rgba(59,130,246,0.1)`, borderRadius: '16px', padding: '16px', animation: 'fadeIn 0.2s ease', borderInlineStart: `3px solid ${C.primary}` }}>
                        <div>
                            <label style={{ ...LS, fontSize: '10px', marginBottom: '6px', color: C.textMuted }}>{t('اسم البنك')}</label>
                            <input value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                                placeholder={t("مثال: بنك مصر")} style={{ ...IS, fontSize: '12px', height: '36px' }} onFocus={focusIn} onBlur={focusOut} />
                        </div>
                        <div>
                            <label style={{ ...LS, fontSize: '10px', marginBottom: '6px', color: C.textMuted }}>{t('رقم الحساب / IBAN')}</label>
                            <input value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                                placeholder="XXXX-XXXX-XXXX" style={{ ...IS, fontSize: '12px', height: '36px', direction: 'ltr', textAlign: 'end' }} onFocus={focusIn} onBlur={focusOut} />
                        </div>
                    </div>
                )}

                {/* Opening Balance */}
                {!isEdit && (
                    <div>
                        <label style={{ ...LS, fontSize: '11px', marginBottom: '8px', color: C.textSecondary }}>{t('الرصيد الافتتاحي (عند الإنشاء)')}</label>
                        <div style={{ position: 'relative', background: C.inputBg, borderRadius: THEME.input.radius, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                            {/* Background Zeros Layer (Only visible when empty) */}
                            {!form.balance && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 900, color: 'rgba(255,255,255,0.03)', pointerEvents: 'none', fontFamily: INTER, letterSpacing: '2px' }}>
                                    0.00
                                </div>
                            )}
                             <input type="text" inputMode="decimal" value={formatWithCommas(form.balance)}
                                onChange={e => {
                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                    // منع تكرار النقطة العشرية
                                    if ((val.match(/\./g) || []).length > 1) return;
                                    setForm(f => ({ ...f, balance: val }));
                                }}
                                style={{ ...IS, border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 900, color: C.textPrimary, height: '46px', fontSize: '17px', width: '100%', padding: '0' }} onFocus={focusIn} onBlur={focusOut} />
                            <span style={{ position: 'absolute', insetInlineStart: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: C.textMuted, fontWeight: 800, pointerEvents: 'none', fontFamily: CAIRO }}>{currencySymbol}</span>
                        </div>
                    </div>
                )}


                {/* Buttons - Swapped Order Solid Footer */}
                <div style={{ 
                    display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '10px', 
                    padding: '24px 22px', borderTop: `1px solid ${C.border}`, 
                    margin: '0 -22px -22px',
                    background: C.card, zIndex: 10
                }}>
                    <button type="submit" disabled={saving} style={{ ...BTN_PRIMARY(saving, false), height: '44px', fontSize: '14px' }}>
                        {saving ? <Loader2 size={18} className="animate-spin" /> : (isEdit ? <CheckCircle2 size={18} /> : <Plus size={18} />)}
                        <span style={{ fontFamily: CAIRO }}>{isEdit ? t('حفظ التعديلات') : t('إضافة الخزينة / البنك')}</span>
                    </button>
                    <button type="button" onClick={onClose} 
                        style={{ 
                            height: '44px', borderRadius: THEME.button.radius, 
                            border: `1px solid ${C.border}`, background: 'transparent', 
                            color: C.textSecondary, fontSize: '13px', fontWeight: 700, 
                            cursor: 'pointer', transition: 'all 0.2s', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', gap: '8px',
                            fontFamily: CAIRO 
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = C.textPrimary; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSecondary; }}>
                        {t('إلغاء')}
                    </button>
                </div>
            </form>
        </AppModal>
    );
}


/* ── Main Page ── */
export default function TreasuriesPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<Treasury | null>(null);
    const [deleteItem, setDeleteItem] = useState<Treasury | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [currencySymbol, setCurrencySymbol] = useState(t('ج.م'));

    const isAdmin = session?.user?.role === 'admin';
    const perms = (session?.user as any)?.permissions || {};
    const canCreate = isAdmin || perms['/treasuries']?.create;
    const canEdit = isAdmin || perms['/treasuries']?.edit;
    const canDelete = isAdmin || perms['/treasuries']?.delete;

    const fetchData = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const [tRes, sRes] = await Promise.all([
                fetch('/api/treasuries'),
                fetch('/api/settings')
            ]);
            const [data, sData] = await Promise.all([tRes.json(), sRes.json()]);
            
            const trList = Array.isArray(data) ? data : [];
            setTreasuries(trList);
            setListCache('treasuries', trList);

            const cur = sData?.company?.currency;
            if (cur) {
                const maps: any = { 'EGP': t('ج.م'), 'SAR': t('ر.س'), 'USD': t('دولار') };
                setCurrencySymbol(maps[cur] || cur);
            }
        } catch { setTreasuries([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        const cached = getListCache('treasuries');
        if (cached) {
            setTreasuries(cached);
            setLoading(false);
            fetchData(false); // تحديث صامت
        } else {
            fetchData(true);
        }
    }, [fetchData]);

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/treasuries/${deleteItem.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteItem(null);
                fetchData();
            } else {
                const d = await res.json();
                alert(d.error || t('فشل الحذف'));
                setDeleteItem(null);
            }
        } catch { 
            alert(t('حدث خطأ في الاتصال'));
            setDeleteItem(null);
        }
        finally { setSubmitting(false); }
    };

    const cashList = treasuries.filter(t => t.type === 'cash');
    const bankList = treasuries.filter(t => t.type === 'bank');
    const totalCash = cashList.reduce((s, t) => s + t.balance, 0);
    const totalBank = bankList.reduce((s, t) => s + t.balance, 0);
    const totalAll = totalCash + totalBank;

    const fmt = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <PageHeader 
                    title={t("الخزن والبنوك")} 
                    subtitle={t("إدارة السيولة النقدية، أرصدة البنوك، ومتابعة الأرصدة المتوفرة لحظياً")}
                    icon={Landmark}
                    primaryButton={canCreate ? {
                        label: t("خزينة / بنك جديد"),
                        onClick: () => { setEditItem(null); setShowModal(true); }
                    } : undefined}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: t('إجمالي السيولة'), val: totalAll, color: C.primary, icon: Wallet, unit: currencySymbol },
                        { label: t('إجمالي الخزن'), val: totalCash, color: C.success, icon: Banknote, unit: currencySymbol },
                        { label: t('إجمالي البنوك'), val: totalBank, color: C.blue, icon: Building2, unit: currencySymbol },
                    ].map((s, idx) => (
                        <div key={idx} style={{ 
                            background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px', 
                            padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
                        }}>
                            <div style={{ textAlign: 'start' }}>
                                <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                    <span style={{ fontSize: '18px', fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>{fmt(s.val)}</span>
                                    <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{s.unit}</span>
                                </div>
                            </div>
                            <div style={{
                                width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`,
                                border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color
                            }}>
                                <s.icon size={18} />
                            </div>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px', background: C.card, borderRadius: '24px', border: `1px dashed ${C.border}` }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary, margin: '0 auto 16px' }} />
                        <p style={{ margin: 0, color: C.textSecondary, fontWeight: 700, fontSize: '15px', fontFamily: CAIRO }}>{t('جاري جرد الخزن والبنوك...')}</p>
                    </div>
                ) : treasuries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px', background: C.card, borderRadius: '24px', border: `1px dashed ${C.border}` }}>
                        <div style={{ width: 72, height: 72, borderRadius: '20px', background: C.subtle, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, margin: '0 auto 20px' }}>
                            <Landmark size={36} />
                        </div>
                        <h3 style={{ margin: '0 0 10px', color: C.textPrimary, fontWeight: 800, fontSize: '18px', fontFamily: CAIRO }}>{t('لا توجد بيانات')}</h3>
                        <p style={{ margin: 0, color: C.textMuted, fontWeight: 600, fontSize: '14px', fontFamily: CAIRO }}>{t('ابدأ بإضافة أول خزينة أو حساب بنكي لتتبع أموالك.')}</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {cashList.length > 0 && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '0 4px' }}>
                                    <Banknote size={20} style={{ color: C.success }} />
                                    <span style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{t('الخزن النقدية')}</span>
                                    <span style={{ fontSize: '11px', color: C.success, background: `${C.success}10`, padding: '2px 10px', borderRadius: '20px', fontWeight: 800, border: `1px solid ${C.success}20`, fontFamily: INTER }}>{cashList.length}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '16px' }}>
                                    {cashList.map(t => (
                                        <TreasuryCard key={t.id} item={t} currencySymbol={currencySymbol} canEdit={canEdit} canDelete={canDelete} onEdit={() => { setEditItem(t); setShowModal(true); }} onDelete={() => setDeleteItem(t)} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {bankList.length > 0 && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '0 4px' }}>
                                    <Building size={20} style={{ color: C.primary }} />
                                    <span style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{t('الحسابات البنكية')}</span>
                                    <span style={{ fontSize: '11px', color: C.primary, background: `${C.primary}10`, padding: '2px 10px', borderRadius: '20px', fontWeight: 800, border: `1px solid ${C.primary}20`, fontFamily: INTER }}>{bankList.length}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '16px' }}>
                                    {bankList.map(t => (
                                        <TreasuryCard key={t.id} item={t} currencySymbol={currencySymbol} canEdit={canEdit} canDelete={canDelete} onEdit={() => { setEditItem(t); setShowModal(true); }} onDelete={() => setDeleteItem(t)} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {showModal && <TreasuryModal initial={editItem} onClose={() => { setShowModal(false); setEditItem(null); }} onSaved={() => { setShowModal(false); setEditItem(null); fetchData(); }} />}
                
                <AppModal
                    show={!!deleteItem}
                    onClose={() => setDeleteItem(null)}
                    isDelete={true}
                    title={t("تأكيد حذف الخزينة / البنك")}
                    itemName={deleteItem?.name}
                    onConfirm={handleDelete}
                    isSubmitting={submitting}
                />

                <style>{` @keyframes spin { to { transform:rotate(360deg); } } `}</style>
            </div>
        </DashboardLayout>
    );
}

/* ── Treasury Card ── */
function TreasuryCard({ item, currencySymbol, canEdit, canDelete, onEdit, onDelete }: { item: Treasury; currencySymbol: string; canEdit?: boolean; canDelete?: boolean; onEdit: () => void; onDelete: () => void; }) {
    const { t } = useTranslation();
    const isCash = item.type === 'cash';
    const accentColor = isCash ? C.success : C.primary;
    const Icon = isCash ? Banknote : Building2;

    return (
        <div style={{ 
            background: C.card, 
            border: `1px solid ${C.border}`, 
            borderRadius: '16px', 
            padding: '16px', 
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', 
            position: 'relative', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }}
            onMouseEnter={e => { 
                e.currentTarget.style.borderColor = accentColor; 
                e.currentTarget.style.boxShadow = `0 10px 20px -10px ${accentColor}20`;
            }}
            onMouseLeave={e => { 
                e.currentTarget.style.borderColor = C.border; 
                e.currentTarget.style.boxShadow = 'none';
            }}>

             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        width: 40, height: 40, borderRadius: '10px', background: `${accentColor}10`, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentColor 
                    }}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', color: C.textPrimary, fontWeight: 800, fontFamily: CAIRO }}>{item.name}</div>
                        <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>{item.type === 'cash' ? t('خزينة') : t('بنك')}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {canEdit && (
                        <button onClick={onEdit} style={TABLE_STYLE.actionBtn()} title={t("تعديل")}>
                            <Pencil size={TABLE_STYLE.actionIconSize} />
                        </button>
                    )}
                    {canDelete && (
                        <button onClick={onDelete} style={TABLE_STYLE.actionBtn(C.danger)} title={t("حذف")}>
                            <Trash2 size={TABLE_STYLE.actionIconSize} />
                        </button>
                    )}
                </div>
             </div>

             {/* Balance Row (Applied Modal Style) */}
             <div style={{ position: 'relative', background: C.inputBg, borderRadius: '12px', padding: '14px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                {/* Digital Watermark */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900, color: 'var(--c-border, rgba(255,255,255,0.03))', pointerEvents: 'none', fontFamily: INTER, letterSpacing: '2px', opacity: 0.1 }}>
                    0.00
                </div>
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: item.balance >= 0 ? C.textPrimary : C.danger, fontFamily: INTER, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
                        {item.balance.toLocaleString('en-US')}
                        <span style={{ fontSize: '11px', color: accentColor, fontWeight: 800, fontFamily: CAIRO }}>{currencySymbol}</span>
                    </div>
                </div>
             </div>

        </div>
    );
}
