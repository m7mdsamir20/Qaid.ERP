'use client';
import React, { useState, useEffect, use } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import {
    Users, Phone, Mail, BadgeCheck, AlertCircle, Loader2,
    FileText, UsersIcon, Wallet, Edit2, Save, ArrowRight, TrendingUp, Target
} from 'lucide-react';
import {
    C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut,
    PAGE_BASE, BTN_PRIMARY, TABLE_STYLE, KPI_STYLE, KPI_ICON, SC
} from '@/constants/theme';

interface SalesRep {
    id: string;
    code?: string;
    name: string;
    phone?: string;
    email?: string;
    commissionRate?: number;
    commissionType?: string;
    isActive: boolean;
    userId?: string;
    employeeId?: string;
    _count?: { customers: number; invoices: number };
}

interface Invoice {
    id: string;
    invoiceNumber: number;
    date: string;
    customer?: { name: string };
    total: number;
    remaining: number;
    status?: string;
}

interface Customer {
    id: string;
    name: string;
    phone?: string;
    balance?: number;
}

interface Collection {
    id: string;
    date: string;
    amount: number;
    method: string;
    status: string;
    customer?: { name: string };
}

const TABS = [
    { key: 'data', label: 'البيانات', icon: Edit2 },
    { key: 'invoices', label: 'فواتيره', icon: FileText },
    { key: 'customers', label: 'عملاؤه', icon: UsersIcon },
    { key: 'collections', label: 'تحصيلاته', icon: Wallet }
] as const;

type TabKey = typeof TABS[number]['key'];

const STATUS_COLLECTION: Record<string, { label: string; color: string }> = {
    pending: { label: 'معلق', color: '#fbbf24' },
    deposited: { label: 'مودَع', color: C.success },
    returned: { label: 'مرتجع', color: C.danger }
};

const METHOD_LABELS: Record<string, string> = {
    cash: 'نقدي', check: 'شيك', transfer: 'تحويل'
};

export default function SalesRepProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { t } = useTranslation();

    const [rep, setRep] = useState<SalesRep | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>('data');

    // Tab data
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [tabLoading, setTabLoading] = useState(false);

    // Edit form
    const [editForm, setEditForm] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Fetch rep
    const fetchRep = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/sales-reps/${id}`);
            if (res.ok) {
                const data = await res.json();
                setRep(data);
                setEditForm({
                    name: data.name || '',
                    code: data.code || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    commissionRate: String(data.commissionRate ?? 0),
                    commissionType: data.commissionType || 'invoice_total',
                    isActive: data.isActive
                });
            }
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchRep(); }, [id]);

    // Fetch tab data on tab change
    useEffect(() => {
        if (!id) return;
        if (activeTab === 'data') return;
        setTabLoading(true);
        const fetcher =
            activeTab === 'invoices' ? fetch(`/api/sales?salesRepId=${id}`).then(r => r.ok ? r.json() : ({} as any)).then((d: any) => setInvoices(d.invoices || [])) :
            activeTab === 'customers' ? fetch(`/api/customers?salesRepId=${id}`).then(r => r.ok ? r.json() : ({} as any)).then((d: any) => setCustomers(d.customers || d)) :
            fetch(`/api/collections?salesRepId=${id}`).then(r => r.ok ? r.json() : ([] as any)).then((d: any) => setCollections(Array.isArray(d) ? d : []));
        fetcher.finally(() => setTabLoading(false));
    }, [activeTab, id]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true); setSaveError(''); setSaveSuccess(false);
        try {
            const res = await fetch(`/api/sales-reps/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...editForm, commissionRate: parseFloat(editForm.commissionRate) || 0 })
            });
            if (res.ok) { setSaveSuccess(true); fetchRep(); setTimeout(() => setSaveSuccess(false), 3000); }
            else { const d = await res.json(); setSaveError(d.error || 'فشل الحفظ'); }
        } catch { setSaveError('فشل في الاتصال'); }
        finally { setIsSaving(false); }
    };

    const monthSales = invoices
        .filter(inv => {
            const d = new Date(inv.date);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((s, inv) => s + Number(inv.total), 0);

    if (loading) return (
        <DashboardLayout>
            <div dir="rtl" style={{ ...PAGE_BASE, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <Loader2 size={36} style={{ animation: 'spin 1.2s linear infinite', color: C.primary }} />
            </div>
            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}` }} />
        </DashboardLayout>
    );

    if (!rep) return (
        <DashboardLayout>
            <div dir="rtl" style={{ ...PAGE_BASE, textAlign: 'center', padding: '80px 20px' }}>
                <p style={{ color: C.danger, fontFamily: CAIRO, fontSize: '16px' }}>لم يُعثر على المندوب</p>
                <button onClick={() => router.push('/sales-reps')} style={{ marginTop: '16px', padding: '8px 20px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textPrimary, cursor: 'pointer', fontFamily: CAIRO, fontSize: '13px' }}>
                    عودة للقائمة
                </button>
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div dir="rtl" style={PAGE_BASE}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <button onClick={() => router.push('/sales-reps')} style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontSize: '13px', fontFamily: CAIRO, fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
                        إدارة المناديب
                    </button>
                    <span style={{ color: C.textSecondary, fontSize: '13px' }}>/</span>
                    <span style={{ color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}>{rep.name}</span>
                </div>

                {/* Rep Header */}
                <div style={{ ...SC, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: `${C.primary}20`, border: `2px solid ${C.primary}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                        <Users size={28} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{rep.name}</h1>
                            {rep.code && (
                                <span style={{ padding: '3px 10px', borderRadius: '8px', background: `${C.primary}15`, color: C.primary, fontSize: '12px', fontWeight: 700, fontFamily: OUTFIT }}>
                                    {rep.code}
                                </span>
                            )}
                            <span style={{
                                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO,
                                background: rep.isActive ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                                color: rep.isActive ? C.success : C.danger
                            }}>
                                {rep.isActive ? 'نشط' : 'موقوف'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            {rep.phone && (
                                <span style={{ fontSize: '13px', color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}>
                                    <Phone size={13} /> {rep.phone}
                                </span>
                            )}
                            {rep.email && (
                                <span style={{ fontSize: '13px', color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}>
                                    <Mail size={13} /> {rep.email}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* KPI Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: 'عملاء', value: rep._count?.customers ?? 0, color: C.primary, icon: UsersIcon, isCount: true },
                        { label: 'مبيعات الشهر', value: monthSales, color: C.success, icon: TrendingUp },
                        { label: 'العمولة', value: `${rep.commissionRate ?? 0}%`, color: C.teal, icon: BadgeCheck, isText: true },
                        { label: 'إجمالي الفواتير', value: rep._count?.invoices ?? 0, color: C.warning, icon: FileText, isCount: true }
                    ].map((card, i) => (
                        <div key={i} style={KPI_STYLE(card.color)}>
                            <div style={KPI_ICON(card.color)}><card.icon size={18} /></div>
                            <div>
                                <p style={{ fontSize: '10px', fontWeight: 700, color: C.textSecondary, margin: '0 0 2px', fontFamily: CAIRO }}>{card.label}</p>
                                <p style={{ fontSize: '18px', fontWeight: 800, color: card.color, margin: 0, fontFamily: OUTFIT }}>
                                    {(card as any).isText ? card.value : (card as any).isCount ? card.value : Number(card.value).toLocaleString('ar-SA')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: activeTab === tab.key ? C.primary : 'transparent',
                                color: activeTab === tab.key ? '#fff' : C.textSecondary,
                                fontWeight: 700, fontSize: '12px', fontFamily: CAIRO,
                                display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <tab.icon size={13} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'data' && (
                    <div style={SC}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: C.primary, marginBottom: '20px', fontFamily: CAIRO }}>
                            تعديل بيانات المندوب
                        </p>
                        <form onSubmit={handleSave}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={LS}>الاسم <span style={{ color: C.danger }}>*</span></label>
                                    <input style={IS} value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={LS}>الكود</label>
                                    <input style={IS} value={editForm.code || ''} onChange={e => setEditForm({ ...editForm, code: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={LS}>الهاتف</label>
                                    <input style={IS} value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={LS}>البريد الإلكتروني</label>
                                    <input style={IS} type="email" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                <div>
                                    <label style={LS}>نسبة العمولة (%)</label>
                                    <input type="number" min="0" max="100" step="0.01" style={{ ...IS, fontFamily: OUTFIT }} value={editForm.commissionRate || '0'} onChange={e => setEditForm({ ...editForm, commissionRate: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={LS}>أساس العمولة</label>
                                    <CustomSelect
                                        value={editForm.commissionType || 'invoice_total'}
                                        onChange={v => setEditForm({ ...editForm, commissionType: v })}
                                        style={{ background: C.card }}
                                        options={[
                                            { value: 'invoice_total', label: 'على الفاتورة' },
                                            { value: 'collected_amount', label: 'على التحصيل' }
                                        ]}
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label style={{ ...LS, margin: 0 }}>الحالة:</label>
                                <button
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                                    style={{
                                        padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                                        fontWeight: 700, fontSize: '12px', fontFamily: CAIRO,
                                        background: editForm.isActive ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
                                        color: editForm.isActive ? C.success : C.danger
                                    }}
                                >
                                    {editForm.isActive ? 'نشط' : 'موقوف'}
                                </button>
                            </div>

                            {saveError && (
                                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: C.danger, fontSize: '13px', fontFamily: CAIRO, marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <AlertCircle size={14} /> {saveError}
                                </div>
                            )}
                            {saveSuccess && (
                                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(74,222,128,0.1)', color: C.success, fontSize: '13px', fontFamily: CAIRO, marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <BadgeCheck size={14} /> تم الحفظ بنجاح
                                </div>
                            )}

                            <button type="submit" disabled={isSaving} style={{ ...BTN_PRIMARY(false, isSaving), maxWidth: '220px', height: '44px' }}>
                                {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1.2s linear infinite' }} /> : <><Save size={15} /> حفظ التعديلات</>}
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'invoices' && (
                    <div>
                        {tabLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textSecondary }}>
                                <Loader2 size={32} style={{ animation: 'spin 1.2s linear infinite' }} />
                            </div>
                        ) : invoices.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: C.textSecondary, fontFamily: CAIRO }}>
                                <FileText size={40} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
                                لا توجد فواتير
                            </div>
                        ) : (
                            <div style={{ ...TABLE_STYLE.container }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={TABLE_STYLE.table}>
                                        <thead>
                                            <tr style={TABLE_STYLE.thead}>
                                                {['رقم الفاتورة', 'التاريخ', 'العميل', 'الإجمالي', 'المتبقي', 'الحالة'].map((h, i) => (
                                                    <th key={i} style={TABLE_STYLE.th(i === 0)}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoices.map((inv, idx) => (
                                                <tr key={inv.id} style={TABLE_STYLE.row(idx === invoices.length - 1)}>
                                                    <td style={TABLE_STYLE.td(true)}>
                                                        <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.primary, fontSize: '13px' }}>#{inv.invoiceNumber}</span>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        <span style={{ fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }}>
                                                            {new Date(inv.date).toLocaleDateString('ar-EG-u-nu-latn')}
                                                        </span>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        <span style={{ fontFamily: CAIRO, fontSize: '13px', color: C.textPrimary }}>{inv.customer?.name || '—'}</span>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        <span style={{ fontFamily: OUTFIT, fontWeight: 700, fontSize: '13px', color: C.textPrimary }}>
                                                            {Number(inv.total).toLocaleString('ar-SA')}
                                                        </span>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        <span style={{ fontFamily: OUTFIT, fontWeight: 700, fontSize: '13px', color: Number(inv.remaining) > 0 ? C.danger : C.success }}>
                                                            {Number(inv.remaining).toLocaleString('ar-SA')}
                                                        </span>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        <span style={{
                                                            padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO,
                                                            background: Number(inv.remaining) === 0 ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)',
                                                            color: Number(inv.remaining) === 0 ? C.success : C.warning
                                                        }}>
                                                            {Number(inv.remaining) === 0 ? 'مسدد' : 'جزئي'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'customers' && (
                    <div>
                        {tabLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textSecondary }}>
                                <Loader2 size={32} style={{ animation: 'spin 1.2s linear infinite' }} />
                            </div>
                        ) : customers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: C.textSecondary, fontFamily: CAIRO }}>
                                <UsersIcon size={40} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
                                لا يوجد عملاء
                            </div>
                        ) : (
                            <div style={{ ...TABLE_STYLE.container }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={TABLE_STYLE.table}>
                                        <thead>
                                            <tr style={TABLE_STYLE.thead}>
                                                {['اسم العميل', 'الهاتف', 'الرصيد'].map((h, i) => (
                                                    <th key={i} style={TABLE_STYLE.th(i === 0)}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customers.map((cust, idx) => (
                                                <tr key={cust.id} style={TABLE_STYLE.row(idx === customers.length - 1)}>
                                                    <td style={TABLE_STYLE.td(true)}>
                                                        <span style={{ fontFamily: CAIRO, fontWeight: 700, fontSize: '13px', color: C.textPrimary }}>{cust.name}</span>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        <span style={{ fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }}>{cust.phone || '—'}</span>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        <span style={{
                                                            fontFamily: OUTFIT, fontWeight: 700, fontSize: '13px',
                                                            color: Number(cust.balance ?? 0) > 0 ? C.danger : Number(cust.balance ?? 0) < 0 ? C.success : C.textSecondary
                                                        }}>
                                                            {Number(cust.balance ?? 0).toLocaleString('ar-SA')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'collections' && (
                    <div>
                        {tabLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textSecondary }}>
                                <Loader2 size={32} style={{ animation: 'spin 1.2s linear infinite' }} />
                            </div>
                        ) : collections.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: C.textSecondary, fontFamily: CAIRO }}>
                                <Wallet size={40} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
                                لا توجد تحصيلات
                            </div>
                        ) : (
                            <div style={{ ...TABLE_STYLE.container }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={TABLE_STYLE.table}>
                                        <thead>
                                            <tr style={TABLE_STYLE.thead}>
                                                {['التاريخ', 'العميل', 'المبلغ', 'الطريقة', 'الحالة'].map((h, i) => (
                                                    <th key={i} style={TABLE_STYLE.th(i === 0)}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {collections.map((col, idx) => {
                                                const statusCfg = STATUS_COLLECTION[col.status] || { label: col.status, color: C.textSecondary };
                                                return (
                                                    <tr key={col.id} style={TABLE_STYLE.row(idx === collections.length - 1)}>
                                                        <td style={TABLE_STYLE.td(true)}>
                                                            <span style={{ fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }}>
                                                                {new Date(col.date).toLocaleDateString('ar-EG-u-nu-latn')}
                                                            </span>
                                                        </td>
                                                        <td style={TABLE_STYLE.td(false)}>
                                                            <span style={{ fontFamily: CAIRO, fontSize: '13px', color: C.textPrimary }}>{col.customer?.name || '—'}</span>
                                                        </td>
                                                        <td style={TABLE_STYLE.td(false)}>
                                                            <span style={{ fontFamily: OUTFIT, fontWeight: 700, fontSize: '13px', color: C.textPrimary }}>
                                                                {Number(col.amount).toLocaleString('ar-SA')}
                                                            </span>
                                                        </td>
                                                        <td style={TABLE_STYLE.td(false)}>
                                                            <span style={{ fontFamily: CAIRO, fontSize: '12px', padding: '3px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: C.textSecondary }}>
                                                                {METHOD_LABELS[col.method] || col.method}
                                                            </span>
                                                        </td>
                                                        <td style={TABLE_STYLE.td(false)}>
                                                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO, background: `${statusCfg.color}18`, color: statusCfg.color }}>
                                                                {statusCfg.label}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}` }} />
        </DashboardLayout>
    );
}
