'use client';
import { formatNumber } from '@/lib/currency';
import { useCurrency } from '@/hooks/useCurrency';


import React, { useState, useEffect, useCallback } from 'react';
import { Currency } from '@/components/Currency';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useSession } from 'next-auth/react';
import { Briefcase, Plus, Pencil, Trash2, Search, X, TrendingDown, DollarSign, Building2, Loader2, AlertTriangle, Calendar, ShieldCheck, History, Info, ExternalLink, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { C, CAIRO, OUTFIT, THEME, TABLE_STYLE, SEARCH_STYLE, KPI_STYLE, focusIn, focusOut, PAGE_BASE, IS, LS, BTN_PRIMARY, BTN_DANGER } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

/* ── Types ── */
interface Account { id: string; code: string; name: string; type: string; isParent?: boolean; accountCategory?: string; }
interface FixedAsset {
    id: string; code: string; name: string; category: string; purchaseDate: string;
    purchaseCost: number; salvageValue: number; depreciationRate: number;
    depreciationMethod: 'straight' | 'declining'; usefulLife: number;
    accumulatedDepreciation: number; netBookValue: number; status: 'active' | 'disposed' | 'fully_dep';
    depAccountId: string; accumAccountId: string; assetAccountId: string; notes?: string;
}

const fmt = (n: number) => formatNumber(n);

export default function FixedAssetsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { data: session } = useSession();
    const { symbol: cSymbol } = useCurrency();
    
    const isAdmin = (session?.user as any)?.role === 'admin';
    const canEdit   = isAdmin || (session?.user as any)?.permissions?.['/fixed-assets']?.edit;
    const canDelete = isAdmin || (session?.user as any)?.permissions?.['/fixed-assets']?.delete;
    const canCreate = isAdmin || (session?.user as any)?.permissions?.['/fixed-assets']?.create;

    const CATEGORIES = [t('مركبات'), t('أجهزة وحاسبات'), t('أراضي ومباني'), t('أثاث ومفروشات'), t('معدات وآلات'), t('أخرى')];
    const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
        active:    { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: t('نشط') },
        disposed:  { bg: `${C.danger}15`,   color: C.danger, label: t('مُستبعد') },
        fully_dep: { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', label: t('مستهلك') },
    };

    const [assets, setAssets]       = useState<FixedAsset[]>([]);
    const [accounts, setAccounts]   = useState<Account[]>([]);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem]   = useState<FixedAsset | null>(null);
    const [deleteItem, setDeleteItem] = useState<FixedAsset | null>(null);
    const [saving, setSaving]       = useState(false);
    const [deleting, setDeleting]   = useState(false);
    const [error, setError]         = useState('');

    const [form, setForm] = useState({
        code: '', name: '', category: '', purchaseDate: '',
        purchaseCost: '', salvageValue: '0', depreciationRate: '',
        depreciationMethod: 'straight' as 'straight' | 'declining', usefulLife: '',
        depAccountId: '', accumAccountId: '', assetAccountId: '', notes: '',
    });

    const fetchAssets = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/fixed-assets');
            const data = await res.json();
            setAssets(Array.isArray(data) ? data : []);
        } catch { setAssets([]); }
        setLoading(false);
    }, []);

    const fetchAccounts = useCallback(async () => {
        try {
            const res = await fetch('/api/accounts');
            const data = await res.json();
            setAccounts(Array.isArray(data) ? data.filter((a: Account) => !a.isParent && a.accountCategory !== 'summary') : []);
        } catch { setAccounts([]); }
    }, []);

    useEffect(() => { fetchAssets(); fetchAccounts(); }, [fetchAssets, fetchAccounts]);

    const openEdit = (a: FixedAsset) => {
        setEditItem(a);
        setError('');
        setForm({
            code: a.code, name: a.name, category: a.category,
            purchaseDate: a.purchaseDate.split('T')[0],
            purchaseCost: String(a.purchaseCost),
            salvageValue: String(a.salvageValue),
            depreciationRate: String(a.depreciationRate),
            depreciationMethod: a.depreciationMethod,
            usefulLife: String(a.usefulLife),
            depAccountId: a.depAccountId || '',
            accumAccountId: a.accumAccountId || '',
            assetAccountId: a.assetAccountId || '',
            notes: a.notes || '',
        });
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!form.name || !form.category || !form.purchaseDate || !form.purchaseCost || !form.depreciationRate) {
            setError(t('يرجى تعبئة جميع الحقول المطلوبة')); return;
        }
        setSaving(true);
        try {
            const body = {
                ...form,
                purchaseCost: parseFloat(form.purchaseCost),
                salvageValue: parseFloat(form.salvageValue) || 0,
                depreciationRate: parseFloat(form.depreciationRate),
                usefulLife: parseInt(form.usefulLife) || Math.round(100 / parseFloat(form.depreciationRate)),
            };
            const url    = editItem ? `/api/fixed-assets/${editItem.id}` : '/api/fixed-assets';
            const method = editItem ? 'PUT' : 'POST';
            const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) { setShowModal(false); fetchAssets(); }
            else { const d = await res.json(); setError(d.error || t('فشل الحفظ')); }
        } catch { setError(t('خطأ في الاتصال بالخادم')); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/fixed-assets/${deleteItem.id}`, { method: 'DELETE' });
            if (res.ok) { setDeleteItem(null); fetchAssets(); }
            else { const d = await res.json(); alert(d.error || t('فشل الحذف')); }
        } catch { alert(t('خطأ في الاتصال')); }
        setDeleting(false);
    };

    const filtered = assets.filter(a => {
        const matchSearch = a.name.includes(search) || a.code.includes(search) || a.category.includes(search);
        const matchStatus = statusFilter === 'all' || a.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalCost  = assets.reduce((s, a) => s + a.purchaseCost, 0);
    const totalAccum = assets.reduce((s, a) => s + a.accumulatedDepreciation, 0);
    const totalNet   = assets.reduce((s, a) => s + a.netBookValue, 0);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                
                <PageHeader
                    title={t("الرصيد الدفتري للأصول")}
                    subtitle={t("إدارة وتبويب الأصول الثابتة، تتبع تكاليف الشراء والقيم الدفترية")}
                    icon={Briefcase}
                    primaryButton={canCreate ? {
                        label: t("إضافة أصل جديد"),
                        icon: Plus,
                        onClick: () => router.push('/fixed-assets/new')
                    } : undefined}
                />

                {/* KPI Section */}
                {!loading && (
                    <div className="stats-grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: t('إجمالي تكلفة الأصول'), val: totalCost, color: C.blue, icon: <DollarSign size={18} /> },
                            { label: t('مجمع الإهلاك المتراكم'), val: totalAccum, color: C.danger, icon: <TrendingDown size={18} /> },
                            { label: t('الصافي الدفتري الحالي'), val: totalNet, color: '#10b981', icon: <Building2 size={18} /> },
                            { label: t('الأصول النشطة'), val: assets.filter(a => a.status === 'active').length, color: '#f59e0b', icon: <ShieldCheck size={18} />, isCount: true },
                        ].map((s, i) => (
                            <div key={i} style={{
                                background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                                padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.2s', position: 'relative'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = `${s.color}15`}
                            onMouseLeave={e => e.currentTarget.style.background = `${s.color}08`}
                            >
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 500, color: C.textSecondary, margin: '0 0 4px', whiteSpace: 'nowrap', fontFamily: CAIRO }}>{s.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                        <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{formatNumber(s.val)}</span>
                                        {!s.isCount && <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 500, fontFamily: CAIRO }}>{cSymbol}</span>}
                                    </div>
                                </div>
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                    {s.icon}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters Row */}
                <div className="filters-row-responsive" style={{ ...SEARCH_STYLE.container, marginBottom: '16px' }}>
                    <div style={{ ...SEARCH_STYLE.wrapper, flex: 1 }}>
                        <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.textMuted)} />
                        <input 
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={t("ابحث باسم الأصل أو الكود أو الفئة...")}
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                    
                    <div className="status-filter-scroll" style={{ display: 'flex', gap: '8px', background: THEME.colors.card, padding: '4px', borderRadius: '12px', border: `1px solid ${C.border}`, height: SEARCH_STYLE.input.height, boxSizing: 'border-box', alignItems: 'center', overflowX: 'auto' }}>
                        {[
                            { id: 'all', label: t('الكل'), color: C.blue },
                            { id: 'active', label: t('نشط'), color: '#10b981' },
                            { id: 'fully_dep', label: t('مستهلك ماليّاً'), color: '#94a3b8' },
                            { id: 'disposed', label: t('مُستبعد'), color: C.danger },
                        ].map(f => (
                            <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
                                padding: '0 14px', height: '100%', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO,
                                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                                background: statusFilter === f.id ? f.color : 'transparent',
                                color: statusFilter === f.id ? '#fff' : C.textMuted,
                            }}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Table */}
                <div style={TABLE_STYLE.container}>
                    <div className="scroll-table" style={{ overflowX: 'auto' }}>
                        <table style={TABLE_STYLE.table}>
                            <thead>
                                <tr style={TABLE_STYLE.thead}>
                                    <th style={TABLE_STYLE.th(true)}>{t('كود الأصل')}</th>
                                    <th style={TABLE_STYLE.th(false)}>{t('اسم الأصل')}</th>
                                    <th className="hide-mobile" style={TABLE_STYLE.th(false)}>{t('الفئة الضريبية')}</th>
                                    <th className="hide-mobile" style={TABLE_STYLE.th(false)}>{t('تاريخ الاقتناء')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false, true), textAlign: 'center' }}>{t('تكلفة الشراء')}</th>
                                    <th className="hide-mobile" style={{ ...TABLE_STYLE.th(false, true), textAlign: 'center' }}>{t('مجمع الإهلاك')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false, true), textAlign: 'center' }}>{t('الصافي الدفتري')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false, true), textAlign: 'center' }}>{t('الحالة')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false, true), textAlign: 'center' }}>{t('خيارات')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={9} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', textAlign: 'center' }}><Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, margin: '0 auto' }} /></td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={9} style={{ padding: '80px', color: C.textSecondary, textAlign: 'center' }}>
                                        <Info size={40} style={{ opacity: 0.1, margin: '0 auto 12px', display: 'block' }} />
                                        <div style={{ fontWeight: 600, fontFamily: CAIRO }}>{t('لم يتم العثور على أصول مطابقة للبحث')}</div>
                                    </td></tr>
                                ) : filtered.map((a, i) => {
                                    const st = STATUS_MAP[a.status];
                                    return (
                                        <tr key={a.id} style={TABLE_STYLE.row(i === filtered.length - 1)}
                                            onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={TABLE_STYLE.td(true)}>
                                                <span style={{ fontSize: '12px', color: C.blue, fontWeight: 700, fontFamily: OUTFIT }}>{a.code}</span>
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, textAlign: 'center' }}>{a.name}</div>
                                                {a.notes && <div style={{ fontSize: '10px', color: C.textSecondary, fontFamily: CAIRO, marginTop: '2px', textAlign: 'center' }}>{a.notes}</div>}
                                            </td>
                                            <td className="hide-mobile" style={{ ...TABLE_STYLE.td(false), color: C.textSecondary, fontFamily: CAIRO }}>{a.category}</td>
                                            <td className="hide-mobile" style={{ ...TABLE_STYLE.td(false), color: C.textSecondary, fontFamily: OUTFIT }}>{new Date(a.purchaseDate).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB')}</td>
                                            <td style={{ ...TABLE_STYLE.td(false, true), textAlign: 'center' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={a.purchaseCost} /></div>
                                            </td>
                                            <td className="hide-mobile" style={{ ...TABLE_STYLE.td(false, true), textAlign: 'center' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: C.danger, fontFamily: OUTFIT }}><Currency amount={a.accumulatedDepreciation} /></div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false, true), textAlign: 'center' }}>
                                                <div style={{ fontSize: '15px', fontWeight: 950, color: '#10b981', fontFamily: OUTFIT }}><Currency amount={a.netBookValue} /></div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false, true), textAlign: 'center' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 600, background: st.bg, color: st.color, border: `1px solid ${st.color}20`, fontFamily: CAIRO }}>
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false, true), textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    {canEdit && <button onClick={() => openEdit(a)} style={TABLE_STYLE.actionBtn()} title={t("تعديل")}><Pencil size={15} /></button>}
                                                    {canDelete && <button onClick={() => setDeleteItem(a)} style={TABLE_STYLE.actionBtn(C.danger)} title={t("حذف")}><Trash2 size={15} /></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Edit Modal */}
                <AppModal show={showModal} onClose={() => setShowModal(false)} title={t("تعديل بيانات الأصل الثابت")} icon={Briefcase}>
                    <form onSubmit={handleSave}>
                        <div className="modal-grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>{t('كود الأصل')}</label>
                                <input readOnly value={form.code} style={{ ...IS, background: 'rgba(255,255,255,0.02)', color: C.textSecondary, fontFamily: OUTFIT }} />
                            </div>
                            <div>
                                <label style={LS}>{t('اسم الأصل')} *</label>
                                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={IS} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
                        <div className="modal-grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>{t('الفئة الضريبية')} *</label>
                                <CustomSelect value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
                            </div>
                            <div>
                                <label style={LS}>{t('تاريخ الشراء')} *</label>
                                <input required type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
                        
                        <div style={{ position: 'relative', marginBottom: '24px' }}>
                            <label style={{ ...LS,  display: 'block', marginBottom: '12px' }}>{t('تكلفة الشراء')}</label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 600, color: 'rgba(255,255,255,0.03)', pointerEvents: 'none', fontFamily: OUTFIT, letterSpacing: '2px' }}>
                                    0.00
                                </div>
                                <input 
                                    type="number" step="0.01" 
                                    value={form.purchaseCost} 
                                    onChange={e => setForm(f => ({ ...f, purchaseCost: e.target.value }))} 
                                    style={{ ...IS, background: 'transparent', textAlign: 'start', fontSize: '32px', height: '80px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT, border: 'none', borderBottom: `2px solid ${C.primary}30`, borderRadius: 0 }} 
                                    onFocus={focusIn} onBlur={focusOut} 
                                    placeholder=""
                                />
                                <span style={{ position: 'absolute', insetInlineEnd: '0', bottom: '12px', fontSize: '12px', fontWeight: 700, color: C.primary, fontFamily: CAIRO }}>{cSymbol}</span>
                            </div>
                        </div>

                        <div className="modal-grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={LS}>{t('قيمة الخردة')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" step="0.01" value={form.salvageValue} onChange={e => setForm(f => ({ ...f, salvageValue: e.target.value }))} style={{...IS, paddingInlineEnd: '45px', fontFamily: OUTFIT}} onFocus={focusIn} onBlur={focusOut} />
                                    <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: C.textSecondary }}>{cSymbol}</span>
                                </div>
                            </div>
                            <div>
                                <label style={LS}>{t('معدل الإهلاك')} %</label>
                                <input type="number" step="0.01" value={form.depreciationRate} onChange={e => setForm(f => ({ ...f, depreciationRate: e.target.value }))} style={{...IS, fontFamily: OUTFIT}} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={LS}>{t('ملاحظات')}</label>
                            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...IS, height: 'auto', padding: '10px' } as any} onFocus={focusIn} onBlur={focusOut} />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={saving} style={{ ...BTN_PRIMARY(false, saving), flex: 1.5, height: '48px' }}>
                                {saving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Plus size={18} />}
                                <span style={{ marginInlineEnd: '8px' }}>{t('حفظ التعديلات')}</span>
                            </button>
                            <button type="button" onClick={() => setShowModal(false)} style={{ height: '48px', padding: '0 20px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>{t('إلغاء')}</button>
                        </div>
                    </form>
                </AppModal>

                {/* Delete Confirm */}
                <AppModal
                    show={deleteItem !== null}
                    onClose={() => setDeleteItem(null)}
                    isDelete={true}
                    title={t("تأكيد حذف أصل")}
                    itemName={deleteItem?.name}
                    onConfirm={handleDelete}
                    isSubmitting={deleting}
                />

                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes spin { to { transform: rotate(360deg); } }
                    
                    @media (max-width: 768px) {
                        .stats-grid-responsive { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
                        .filters-row-responsive { flex-direction: column; align-items: stretch !important; gap: 12px !important; }
                        .status-filter-scroll { width: 100%; padding: 6px !important; }
                        .hide-mobile { display: none !important; }
                        .modal-grid-responsive { grid-template-columns: 1fr !important; }
                    }
                ` }} />

            </div>
        </DashboardLayout>
    );
}
