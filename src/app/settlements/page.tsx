'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Plus, Search, ChevronDown, Loader2, UserCheck, UserMinus, UserPlus, CheckCircle2, ArrowRight, Info, History, DollarSign, Calendar, Building2, Banknote, Users, X, Wallet, RefreshCw, ShieldAlert, FileText, ArrowLeftRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut } from '@/constants/theme';



function SearchableSelect({ options, value, onChange, placeholder, disabled, labelIcon: Icon }: {
    options: { id: string; label: string; sub?: string; balance?: number }[];
    value: string; onChange: (id: string) => void; placeholder: string;
    disabled?: boolean;
    labelIcon?: any;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const selected = options.find(o => o.id === value);
    const filtered = options.filter(o => o.label.includes(q) || (o.sub || '').toLowerCase().includes(q.toLowerCase()));

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <div onClick={() => { if (!disabled) setOpen(v => !v); }}
                style={{
                    ...IS,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
                    borderColor: open ? C.primary : C.border,
                    boxShadow: open ? `0 0 0 2px ${C.primaryBg}` : 'none',
                    background: open ? C.hover : C.inputBg
                }}>
                <div style={{ flex: 1, textAlign: 'start', color: selected ? C.textPrimary : C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start' }}>
                    {Icon && <Icon size={16} style={{ color: selected ? C.primary : C.textMuted }} />}
                    <span style={{ fontWeight: selected ? 700 : 500, fontFamily: CAIRO }}>{selected ? selected.label : placeholder}</span>
                </div>
                <ChevronDown size={14} style={{ color: C.textMuted, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>
            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', insetInlineStart: 0, insetInlineEnd: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', zIndex: 1100, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', overflow: 'hidden', animation: 'scaleIn 0.15s ease' }}>
                    <div style={{ padding: '10px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={t("ابحث في القائمة...")}
                                style={{ ...IS, height: '36px', paddingInlineStart: '36px', fontSize: '12px' }} />
                        </div>
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {filtered.length === 0
                            ? <div style={{ padding: '24px', textAlign: 'center', color: C.textMuted, fontSize: '13px', fontWeight: 600 }}>{t('لا توجد خيارات مطابقة')}</div>
                            : filtered.map(opt => (
                                <div key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); setQ(''); }}
                                    style={{ padding: '10px 16px', cursor: 'pointer', background: opt.id === value ? C.primaryBg : 'transparent', borderInlineEnd: opt.id === value ? `3px solid ${C.primary}` : '3px solid transparent', transition: 'all 0.1s' }}
                                    onMouseEnter={e => opt.id !== value && (e.currentTarget.style.background = C.hover)}
                                    onMouseLeave={e => opt.id !== value && (e.currentTarget.style.background = 'transparent')}>
                                    <div style={{ textAlign: 'start' }}>
                                        <div style={{ fontSize: '13px', color: C.textPrimary, fontWeight: 700, fontFamily: CAIRO }}>{opt.label}</div>
                                        {opt.sub && <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px', fontWeight: 600, fontFamily: OUTFIT }}>{opt.sub}</div>}
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}
        </div>
    );
}

function Modal({ isOpen, onClose, title, icon, children, maxWidth = '800px' }: { isOpen: boolean; onClose: () => void; title: string; icon: React.ReactNode; children: React.ReactNode; maxWidth?: string; }) {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: '40px 16px', background: 'rgba(7,13,26,0.75)', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s ease' }}>
            <div onClick={e => e.stopPropagation()} dir={isRtl ? 'rtl' : 'ltr'} style={{ width: '100%', maxWidth, background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '10px', background: C.primaryBg, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{title}</h2>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{t('قم بإدخال بيانات التسوية بدقة لتحديث أرصدة الحسابات')}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', color: C.textMuted, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = C.danger; e.currentTarget.style.background = C.dangerBg; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}><X size={20} /></button>
                </div>
                <div style={{ padding: '24px', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>{children}</div>
            </div>
        </div>
    );
}

let pageCache: any = null;

export default function ComprehensiveSettlementPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { symbol: currencySign } = useCurrency();
    const router = useRouter();
    const [customers, setCustomers] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [settlements, setSettlements] = useState<any[]>([]);
    const [settlementSearch, setSettlementSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [detailsModal, setDetailsModal] = useState<any>(null);

    const [form, setForm] = useState({
        fromType: 'customer' as 'customer' | 'supplier' | 'bank', fromId: '',
        toType: 'customer' as 'customer' | 'supplier' | 'bank', toId: '',
        amount: '', date: new Date().toISOString().split('T')[0], notes: '',
    });

    const fetchData = useCallback(async () => {
        if (!pageCache) setLoading(true);
        try {
            const [cRes, sRes, bRes, setRes] = await Promise.all([
                fetch('/api/customers'), fetch('/api/suppliers'), fetch('/api/treasuries'), fetch('/api/debt-settlement'),
            ]);
            const [cData, sData, bData, setData] = await Promise.all([cRes.json(), sRes.json(), bRes.json(), setRes.json()]);

            const cc = Array.isArray(cData) ? cData : [];
            const ss = Array.isArray(sData) ? sData : [];
            const tt = Array.isArray(bData) ? bData : []; // All treasuries (Cash + Bank)
            const dSett = Array.isArray(setData) ? setData : [];

            pageCache = { c: cc, s: ss, b: tt, set: dSett };
            setCustomers(cc); setSuppliers(ss); setBanks(tt); setSettlements(dSett);
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredSettlements = (Array.isArray(settlements) ? settlements : []).filter((s: any) =>
        (s.description || '').toLowerCase().includes(settlementSearch.toLowerCase()) ||
        String(s.entryNumber).includes(settlementSearch)
    );

    const handleSave = async () => {
        const amt = form.amount.replace(/,/g, '');
        if (!form.fromId || !form.toId || !amt) { alert(t('يرجى ملء كافة الحقول الإجبارية')); return; }
        setSubmitting(true);
        try {
            const res = await fetch('/api/debt-settlement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, amount: amt })
            });
            if (res.ok) {
                setForm(f => ({ ...f, fromId: '', toId: '', amount: '' }));
                setShowForm(false);
                fetchData();
            } else {
                const d = await res.json(); alert(d.error || t('فشل في حفظ عملية التسوية'));
            }
        } catch { alert(t('خطأ في الاتصال بالخادم')); } finally { setSubmitting(false); }
    };

    const getOptions = (type: string) => {
        if (type === 'customer') return customers.map((c: any) => ({ id: c.id, label: c.name, sub: t('رصيد متاح:') + ` ${c.balance.toLocaleString()} ${currencySign}`, balance: c.balance }));
        if (type === 'supplier') return suppliers.map((s: any) => ({ id: s.id, label: s.name, sub: t('رصيد متاح:') + ` ${s.balance.toLocaleString()} ${currencySign}`, balance: s.balance }));
        if (type === 'bank') return banks.map((b: any) => ({ id: b.id, label: b.name, sub: t('رصيد متاح:') + ` ${b.balance.toLocaleString()} ${currencySign}`, balance: b.balance }));
        return [];
    };

    const fromLabel = form.fromType === 'customer' ? t('العميل') : form.fromType === 'supplier' ? t('المورد') : t('الخزينة / البنك');
    const toLabel = form.toType === 'customer' ? t('العميل') : form.toType === 'supplier' ? t('المورد') : t('الخزينة / البنك');


    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: CAIRO, paddingBottom: '60px', paddingTop: THEME.header.pt }}>
                {/* ── Header ── */}
                <div className="mobile-column" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: THEME.header.mb }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            padding: THEME.header.iconPadding,
                            borderRadius: '10px',
                            background: C.primaryBg,
                            color: C.primary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ArrowRightLeft size={THEME.header.iconSize} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: THEME.header.titleSize, fontWeight: 600, margin: 0, color: C.textPrimary, textAlign: 'start', fontFamily: CAIRO }}>{t('تسوية ديون')}</h1>
                            <p style={{ fontSize: THEME.header.subSize, color: C.textMuted, margin: '2px 0 0', fontWeight: 400, textAlign: 'start', fontFamily: CAIRO }}>{t('إدارة ومراجعة التحويلات المالية وتسوية الأرصدة')}</p>
                        </div>
                    </div>

                    <button
                        className="mobile-full"
                        onClick={() => setShowForm(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            height: '36px', padding: '0 14px', borderRadius: '8px',
                            background: C.primary, color: '#fff', border: 'none',
                            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = C.primaryHover}
                        onMouseLeave={e => e.currentTarget.style.background = C.primary}
                    >
                        <Plus size={14} /> {t('تسجيل تسوية جديدة')}
                    </button>
                </div>

                {/* ── Search ── */}
                <div className="mobile-full" style={{ position: 'relative', marginBottom: '14px' }}>
                    <Search size={16} style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                    <input
                        placeholder={t("ابحث برقم القيد أو تفاصيل العملية...")}
                        value={settlementSearch}
                        onChange={e => setSettlementSearch(e.target.value)}
                        style={{
                            ...IS,
                            width: '100%',
                            height: '36px',
                            paddingInlineStart: '40px',
                            boxSizing: 'border-box',
                            background: C.card,
                        }}
                        onFocus={focusIn} onBlur={focusOut}
                    />
                </div>

                {loading ? (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '60px', textAlign: 'center' }}>
                        <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, display: 'block', margin: '0 auto' }} />
                        <p style={{ marginTop: '10px', color: C.textMuted, fontSize: '13px', fontFamily: CAIRO }}>{t('جاري تحميل البيانات...')}</p>
                    </div>
                ) : (
                    <>
                        {showForm && (
                            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: '40px 16px', background: 'rgba(7,13,26,0.75)', backdropFilter: 'blur(10px)', animation: 'fadeIn 0.2s ease' }}>
                                <div dir={isRtl ? 'rtl' : 'ltr'} style={{ width: '100%', maxWidth: '480px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ padding: '8px', borderRadius: '8px', background: C.primaryBg, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <ArrowRightLeft size={16} />
                                            </div>
                                            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('تسجيل تسوية ديون')}</h2>
                                        </div>
                                        <button onClick={() => setShowForm(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '6px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', color: C.textMuted, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = C.danger; e.currentTarget.style.background = C.dangerBg; }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}><X size={16} /></button>
                                    </div>
                                    <div style={{ padding: '22px', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                <div>
                                                    <label style={LS}>{t('تاريخ العملية')}</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type="date"
                                                            value={form.date}
                                                            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                                            style={{ ...IS, paddingInlineEnd: '12px', direction: 'ltr', color: C.textSecondary }}
                                                            onFocus={focusIn} onBlur={focusOut}
                                                            className="blue-date-icon"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={LS}>{t('المبلغ المراد تسويته')}</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type="text"
                                                            value={form.amount}
                                                            onChange={e => {
                                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                const parts = val.split('.');
                                                                if (parts.length > 2) return;
                                                                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                                                                const formatted = parts.join('.');
                                                                setForm(f => ({ ...f, amount: formatted }));
                                                            }}
                                                            style={{ ...IS, paddingInlineStart: '44px', fontFamily: OUTFIT, fontWeight: 400 }}
                                                            onFocus={focusIn} onBlur={focusOut} placeholder="0.00"
                                                        />
                                                        <span style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: C.textMuted }}>{currencySign}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                <div style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>{t('الطرف المحوّل منه (المصدر)')}</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                                    {[
                                                        { id: 'customer', name: t('عميل') },
                                                        { id: 'supplier', name: t('مورد') },
                                                        { id: 'bank', name: t('خزينة / بنك') }
                                                    ].map(tType => (
                                                        <button key={tType.id} onClick={() => setForm(f => ({ ...f, fromType: tType.id as any, fromId: '' }))}
                                                            style={{ height: '34px', borderRadius: '6px', border: `1px solid ${form.fromType === tType.id ? C.primary : C.border}`, background: form.fromType === tType.id ? C.primaryBg : 'transparent', color: form.fromType === tType.id ? C.primary : C.textSecondary, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                                                            {tType.name}
                                                        </button>
                                                    ))}
                                                </div>
                                                <SearchableSelect options={getOptions(form.fromType)} value={form.fromId} onChange={v => setForm(f => ({ ...f, fromId: v }))} placeholder={t('ابحث عن') + ` ${fromLabel}...`} labelIcon={UserMinus} />
                                            </div>

                                            <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                <div style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>{t('الطرف المحوّل إليه (المستلم)')}</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                                    {[
                                                        { id: 'customer', name: t('عميل') },
                                                        { id: 'supplier', name: t('مورد') },
                                                        { id: 'bank', name: t('خزينة / بنك') }
                                                    ].map(tType => (
                                                        <button key={tType.id} onClick={() => setForm(f => ({ ...f, toType: tType.id as any, toId: '' }))}
                                                            style={{ height: '34px', borderRadius: '6px', border: `1px solid ${form.toType === tType.id ? C.primary : C.border}`, background: form.toType === tType.id ? C.primaryBg : 'transparent', color: form.toType === tType.id ? C.primary : C.textSecondary, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>
                                                            {tType.name}
                                                        </button>
                                                    ))}
                                                </div>
                                                <SearchableSelect options={getOptions(form.toType)} value={form.toId} onChange={v => setForm(f => ({ ...f, toId: v }))} placeholder={t('ابحث عن') + ` ${toLabel}...`} labelIcon={UserPlus} />
                                            </div>


                                            <div>
                                                <label style={LS}>{t('ملاحظات التسوية')}</label>
                                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...IS, height: '60px', paddingTop: '8px', resize: 'none' }} onFocus={focusIn} onBlur={focusOut} placeholder={t("اكتب بياناً توضيحياً...")} />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px', marginTop: '10px' }}>
                                                <button onClick={() => setShowForm(false)} style={{ height: '42px', borderRadius: '10px', background: C.inputBg, color: C.textSecondary, border: `1px solid ${C.border}`, fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: CAIRO }}>{t('إلغاء')}</button>
                                                <button onClick={handleSave} disabled={submitting || !form.amount} style={{ height: '42px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none', fontSize: '14px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: (submitting || !form.amount) ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: CAIRO }}>
                                                    {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><Plus size={16} /> {t('حفظ التسوية')}</>}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {filteredSettlements.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '100px 20px', background: C.card, border: `1px dashed ${C.border}`, borderRadius: '32px' }}>
                                <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.primaryBg, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}><ArrowRightLeft size={36} opacity={0.5} /></div>
                                <h3 style={{ fontSize: '18px', color: C.textPrimary, fontWeight: 800, margin: '0 0 10px', fontFamily: CAIRO }}>{settlementSearch ? t('لم نجد أي مطابقات') : t('سجل التسويات فارغ')}</h3>
                                <p style={{ color: C.textSecondary, fontSize: '14px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6, fontFamily: CAIRO }}>{t('بإمكانك البدء الآن في تسوية أرصدة حسابات العملاء والموردين أو البنوك بكل سهولة من خلال زر الإضافة.')}</p>
                            </div>
                        ) : (
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', overflow: 'hidden' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start', fontSize: '14px' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                                                {[
                                                    { label: t('التاريخ'), width: '12%' },
                                                    { label: t('رقم القيد'), width: '10%' },
                                                    { label: t('المصدر (من)'), width: '22%' },
                                                    { label: t('المستلم (إليه)'), width: '22%' },
                                                    { label: t('البيان'), width: 'auto' },
                                                    { label: t('المبلغ'), width: '14%' },
                                                    { label: t('إجراء'), width: '6%' }
                                                ].map((h, i) => (
                                                    <th key={i} style={{ padding: '11px 16px', fontSize: '12px', fontWeight: 500, color: C.textMuted,  width: h.width, fontFamily: CAIRO }}>{h.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSettlements.map((s: any, idx) => (
                                                <tr key={s.id} style={{ background: 'rgba(0,0,0,0.15)', borderBottom: idx < filteredSettlements.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = C.hover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '11px 16px',  color: C.textSecondary, fontSize: '12px', fontWeight: 500, fontFamily: OUTFIT }}>
                                                        {new Date(s.date).toLocaleDateString('en-GB')}
                                                    </td>
                                                    <td style={{ padding: '11px 16px', }}>
                                                        <span style={{ padding: '2px 8px', borderRadius: '6px', background: C.primaryBg, border: `1px solid ${C.primaryBorder}`, color: C.primary, fontWeight: 700, fontSize: '11px', fontFamily: OUTFIT }}>
                                                            {String(s.entryNumber).padStart(4, '0')}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '11px 16px', }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', justifyContent: 'flex-start' }}>
                                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: C.dangerBg, color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}><UserMinus size={12} /></div>
                                                            <span style={{ fontWeight: 500, color: C.textPrimary, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.fromConfig?.name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '11px 16px', }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', justifyContent: 'flex-start' }}>
                                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: C.successBg, color: C.success, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}><UserPlus size={12} /></div>
                                                            <span style={{ fontWeight: 500, color: C.textPrimary, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.toConfig?.name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '11px 16px',  fontSize: '13px', color: C.textSecondary, fontWeight: 500, fontFamily: CAIRO }}>{s.notes || '-'}</td>
                                                    <td style={{ padding: '11px 16px', }}>
                                                        <div style={{ fontSize: '14px', fontWeight: 700, color: C.success, fontFamily: OUTFIT }}>
                                                            {s.amount.toLocaleString()} <span style={{ fontSize: '10px' }}>{currencySign}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '11px 16px', }}>
                                                        <button onClick={() => setDetailsModal(s)}
                                                            style={{ width: '29px', height: '29px', borderRadius: '6px', border: `1px solid ${C.border}`, background: 'transparent', color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 0 0 auto' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            <History size={13} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Details Modal */}
            {detailsModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,13,26,0.75)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '40px 16px', animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', width: '100%', maxWidth: '650px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ padding: '8px', borderRadius: '8px', background: C.primaryBg, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><History size={16} /></div>
                                <div dir={isRtl ? 'rtl' : 'ltr'}>
                                    <h3 style={{ margin: 0, color: C.textPrimary, fontSize: '15px', fontWeight: 600, fontFamily: CAIRO }}>{t('مراجعة سند التسوية')}</h3>
                                </div>
                            </div>
                            <button onClick={() => setDetailsModal(null)} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: C.textMuted, cursor: 'pointer', width: 30, height: 30, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = C.danger; e.currentTarget.style.background = C.dangerBg }} onMouseLeave={e => { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}><X size={16} /></button>
                        </div>
                        <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '22px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '22px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                                    <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500, marginBottom: '4px' }}>{t('تاريخ التسجيل')}</div>
                                    <div style={{ fontSize: '13px', color: C.textPrimary, fontWeight: 700, fontFamily: OUTFIT }}>{new Date(detailsModal.date).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { dateStyle: 'full' })}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                                    <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500, marginBottom: '4px' }}>{t('إجمالي القيد')}</div>
                                    <div style={{ fontSize: '18px', color: C.success, fontWeight: 900, fontFamily: OUTFIT }}>{detailsModal.amount.toLocaleString()} <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.7 }}>{currencySign}</span></div>
                                </div>
                            </div>

                            <div style={{ border: `1px solid ${C.border}`, borderRadius: '8px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'inherit' }}>
                                    <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                                            <th style={{ padding: '10px 16px',  color: C.textMuted, fontSize: '12px', fontWeight: 500, fontFamily: CAIRO }}>{t('الحساب المتأثر')}</th>
                                            <th style={{ padding: '10px 16px',  color: C.textMuted, fontSize: '12px', fontWeight: 500, fontFamily: CAIRO }}>{t('مدين (+)')}</th>
                                            <th style={{ padding: '10px 16px',  color: C.textMuted, fontSize: '12px', fontWeight: 500, fontFamily: CAIRO }}>{t('دائن (-)')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(detailsModal.lines || []).map((line: any, index: number) => (
                                            <tr key={index} style={{ borderBottom: index < detailsModal.lines.length - 1 ? `1px solid ${C.border}` : 'none', background: 'rgba(0,0,0,0.15)' }}>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ color: C.textPrimary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{line.accountName}</div>
                                                </td>
                                                <td style={{ padding: '12px 16px', color: C.success, fontSize: '14px', fontWeight: 700,  fontFamily: OUTFIT }}>{line.debit > 0 ? line.debit.toLocaleString() : '-'}</td>
                                                <td style={{ padding: '12px 16px', color: C.danger, fontSize: '14px', fontWeight: 700,  fontFamily: OUTFIT }}>{line.credit > 0 ? line.credit.toLocaleString() : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot style={{ background: 'rgba(255,255,255,0.02)', borderTop: `1px solid ${C.border}` }}>
                                        <tr>
                                            <td style={{ padding: '12px 16px', color: C.textPrimary, fontSize: '13px', fontWeight: 700, fontFamily: CAIRO }}>{t('إجمالي القيد')}</td>
                                            <td style={{ padding: '12px 16px', color: C.textPrimary, fontSize: '15px', fontWeight: 800,  fontFamily: OUTFIT }}>{detailsModal.amount.toLocaleString()}</td>
                                            <td style={{ padding: '12px 16px', color: C.textPrimary, fontSize: '15px', fontWeight: 800,  fontFamily: OUTFIT }}>{detailsModal.amount.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {detailsModal.notes && (
                                <div style={{ marginTop: '18px', padding: '12px', background: 'rgba(255,255,255,0.01)', border: `1px solid ${C.border}`, borderRadius: '8px', display: 'flex', gap: '10px' }}>
                                    <Info size={16} color={C.primary} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <p style={{ margin: 0, fontSize: '12px', color: C.textSecondary, lineHeight: 1.5, fontFamily: CAIRO }}>{detailsModal.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
                input[type="date"]::-webkit-calendar-picker-indicator {
                    cursor: pointer;
                    filter: invert(41%) sepia(34%) saturate(3000%) hue-rotate(190deg) brightness(100%) contrast(100%);
                    margin-insetInlineEnd: 5px;
                }
            `}</style>
        </DashboardLayout>
    );
}
