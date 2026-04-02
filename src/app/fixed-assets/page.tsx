'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useSession } from 'next-auth/react';
import {
    Briefcase, Plus, Pencil, Trash2, Search, X,
    TrendingDown, DollarSign, Building2, Loader2, AlertTriangle,
    Calendar, ShieldCheck, History, Info, ExternalLink, Filter
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
    C, CAIRO, INTER, THEME, TABLE_STYLE, SEARCH_STYLE, 
    KPI_STYLE, focusIn, focusOut, 
    PAGE_BASE, IS, LS, BTN_PRIMARY, BTN_DANGER 
} from '@/constants/theme';
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

const CATEGORIES = ['مركبات', 'أجهزة وحاسبات', 'أراضي ومباني', 'أثاث ومفروشات', 'معدات وآلات', 'أخرى'];
const DEP_METHODS = [
    { value: 'straight',  label: 'قسط ثابت',   sub: 'التكلفة ÷ العمر الإنتاجي' },
    { value: 'declining', label: 'قسط متناقص', sub: 'الصافي × المعدل' },
];
const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
    active:    { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'نشط' },
    disposed:  { bg: `${C.danger}15`,   color: C.danger, label: 'مُستبعد' },
    fully_dep: { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', label: 'مستهلك' },
};

const fmt = (n: number) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function FixedAssetsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const isAdmin = (session?.user as any)?.role === 'admin';
    const canEdit   = isAdmin || (session?.user as any)?.permissions?.['/fixed-assets']?.edit;
    const canDelete = isAdmin || (session?.user as any)?.permissions?.['/fixed-assets']?.delete;
    const canCreate = isAdmin || (session?.user as any)?.permissions?.['/fixed-assets']?.create;

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
            setError('يرجى تعبئة جميع الحقول المطلوبة'); return;
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
            else { const d = await res.json(); setError(d.error || 'فشل الحفظ'); }
        } catch { setError('خطأ في الاتصال بالخادم'); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/fixed-assets/${deleteItem.id}`, { method: 'DELETE' });
            if (res.ok) { setDeleteItem(null); fetchAssets(); }
            else { const d = await res.json(); alert(d.error || 'فشل الحذف'); }
        } catch { alert('خطأ في الاتصال'); }
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
            <div dir="rtl" style={PAGE_BASE}>
                
                <PageHeader
                    title="الرصيد الدفتري للأصول"
                    subtitle="إدارة وتبويب الأصول الثابتة، تتبع تكاليف الشراء والقيم الدفترية"
                    icon={Briefcase}
                    primaryButton={canCreate ? {
                        label: "إضافة أصل جديد",
                        icon: Plus,
                        onClick: () => router.push('/fixed-assets/new')
                    } : undefined}
                />

                {/* KPI Section */}
                {!loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: 'إجمالي تكلفة الأصول', val: totalCost, color: C.blue, icon: DollarSign },
                            { label: 'مجمع الإهلاك المتراكم', val: totalAccum, color: C.danger, icon: TrendingDown },
                            { label: 'الصافي الدفتري الحالي', val: totalNet, color: '#10b981', icon: Building2 },
                            { label: 'الأصول النشطة', val: assets.filter(a => a.status === 'active').length, color: '#f59e0b', icon: ShieldCheck, isCount: true },
                        ].map((s, i) => (
                            <div key={i} style={{
                                background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '4px', fontWeight: 900, color: s.color, fontFamily: INTER }} dir="ltr">
                                        <span>{s.val.toLocaleString('en-US')}</span>
                                        {!s.isCount && <span style={{ fontSize: '10px', color: C.textMuted, fontFamily: CAIRO, marginLeft: '4px' }}>ج.م</span>}
                                    </div>
                                </div>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                    <s.icon size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters Row */}
                <div style={{ ...SEARCH_STYLE.container, marginBottom: '16px' }}>
                    <div style={{ ...SEARCH_STYLE.wrapper, flex: 1 }}>
                        <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.textMuted)} />
                        <input 
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="ابحث باسم الأصل أو الكود أو الفئة..."
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', background: THEME.colors.card, padding: '4px', borderRadius: '12px', border: `1px solid ${C.border}`, height: SEARCH_STYLE.input.height, boxSizing: 'border-box', alignItems: 'center' }}>
                        {[
                            { id: 'all', label: 'الكل', color: C.blue },
                            { id: 'active', label: 'نشط', color: '#10b981' },
                            { id: 'fully_dep', label: 'مستهلك ماليّاً', color: '#94a3b8' },
                            { id: 'disposed', label: 'مُستبعد', color: C.danger },
                        ].map(f => (
                            <button key={f.id} onClick={() => setStatusFilter(f.id)} style={{
                                padding: '0 14px', height: '100%', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: 900, fontFamily: CAIRO,
                                cursor: 'pointer', transition: 'all 0.2s',
                                background: statusFilter === f.id ? f.color : 'transparent',
                                color: statusFilter === f.id ? '#fff' : C.textMuted,
                            }}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Table */}
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                {['كود الأصل', 'اسم الأصل', 'الفئة الضريبية', 'تاريخ الاقتناء', 'تكلفة الشراء', 'مجمع الإهلاك', 'الصافي الدفتري', 'الحالة', 'خيارات'].map((h, i) => (
                                    <th key={i} style={{ padding: '14px 16px', fontSize: '11px', fontWeight: 700, color: C.textSecondary, textAlign: 'right', fontFamily: CAIRO }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} style={{ padding: '100px', textAlign: 'center' }}>
                                    <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, margin: '0 auto' }} />
                                </td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={9} style={{ padding: '80px', textAlign: 'center', color: C.textMuted }}>
                                    <Info size={40} style={{ opacity: 0.1, margin: '0 auto 12px', display: 'block' }} />
                                    <div style={{ fontWeight: 800, fontFamily: CAIRO }}>لم يتم العثور على أصول مطابقة للبحث</div>
                                </td></tr>
                            ) : filtered.map((a, i) => {
                                const st = STATUS_MAP[a.status];
                                return (
                                    <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{ fontSize: '12px', color: C.blue, fontWeight: 800, fontFamily: INTER }}>{a.code}</span>
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{a.name}</div>
                                            {a.notes && <div style={{ fontSize: '10px', color: C.textMuted, fontFamily: CAIRO, marginTop: '2px' }}>{a.notes}</div>}
                                        </td>
                                        <td style={{ padding: '14px 16px', fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }}>{a.category}</td>
                                        <td style={{ padding: '14px 16px', fontSize: '13px', color: C.textMuted, fontFamily: INTER }}>{new Date(a.purchaseDate).toLocaleDateString('ar-EG-u-nu-latn')}</td>
                                        <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 700, color: C.textPrimary, fontFamily: INTER }}>{fmt(a.purchaseCost)}</td>
                                        <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 700, color: C.danger, fontFamily: INTER }}>{fmt(a.accumulatedDepreciation)}</td>
                                        <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: 950, color: '#10b981', fontFamily: INTER }}>{fmt(a.netBookValue)}</td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 900, background: st.bg, color: st.color, border: `1px solid ${st.color}20`, fontFamily: CAIRO }}>
                                                {st.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {canEdit && <button onClick={() => openEdit(a)} style={TABLE_STYLE.actionBtn()} title="تعديل"><Pencil size={15} /></button>}
                                                {canDelete && <button onClick={() => setDeleteItem(a)} style={TABLE_STYLE.actionBtn(C.danger)} title="حذف"><Trash2 size={15} /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Edit Modal */}
                <AppModal show={showModal} onClose={() => setShowModal(false)} title="تعديل بيانات الأصل الثابت" icon={Briefcase}>
                    <form onSubmit={handleSave}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>كود الأصل</label>
                                <input readOnly value={form.code} style={{ ...IS, background: 'rgba(255,255,255,0.02)', color: C.textMuted, fontFamily: INTER }} />
                            </div>
                            <div>
                                <label style={LS}>اسم الأصل *</label>
                                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={IS} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>الفئة الضريبية *</label>
                                <CustomSelect value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
                            </div>
                            <div>
                                <label style={LS}>تاريخ الشراء *</label>
                                <input required type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} style={{ ...IS, fontFamily: INTER }} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                            <div>
                                <label style={LS}>تكلفة الشراء</label>
                                <input type="number" step="0.01" value={form.purchaseCost} onChange={e => setForm(f => ({ ...f, purchaseCost: e.target.value }))} style={{...IS, fontFamily: INTER}} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                            <div>
                                <label style={LS}>قيمة الخردة</label>
                                <input type="number" step="0.01" value={form.salvageValue} onChange={e => setForm(f => ({ ...f, salvageValue: e.target.value }))} style={{...IS, fontFamily: INTER}} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                            <div>
                                <label style={LS}>معدل الإهلاك %</label>
                                <input type="number" step="0.01" value={form.depreciationRate} onChange={e => setForm(f => ({ ...f, depreciationRate: e.target.value }))} style={{...IS, fontFamily: INTER}} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={LS}>ملاحظات</label>
                            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...IS, height: 'auto', padding: '10px' } as any} onFocus={focusIn} onBlur={focusOut} />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={saving} style={{ ...BTN_PRIMARY(false, saving), flex: 1.5, height: '48px' }}>
                                {saving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Plus size={18} />}
                                <span style={{ marginRight: '8px' }}>حفظ التعديلات</span>
                            </button>
                            <button type="button" onClick={() => setShowModal(false)} style={{ height: '48px', padding: '0 20px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>إلغاء</button>
                        </div>
                    </form>
                </AppModal>

                {/* Delete Confirm */}
                <AppModal
                    show={deleteItem !== null}
                    onClose={() => setDeleteItem(null)}
                    isDelete={true}
                    title="تأكيد حذف أصل"
                    itemName={deleteItem?.name}
                    onConfirm={handleDelete}
                    isSubmitting={deleting}
                />

            </div>
            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
        </DashboardLayout>
    );
}
