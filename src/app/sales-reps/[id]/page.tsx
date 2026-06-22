'use client';
import React, { useState, useEffect, use } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import {
    Users, Phone, Mail, BadgeCheck, Loader2,
    FileText, UsersIcon, Wallet, Edit2, ArrowRight, TrendingUp
} from 'lucide-react';
import {
    C, CAIRO, OUTFIT, LS,
    PAGE_BASE, TABLE_STYLE, KPI_STYLE, KPI_ICON, SC
} from '@/constants/theme';

const READ_FIELD: React.CSSProperties = {
    margin: '6px 0 0', padding: '10px 14px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
    fontSize: '14px', color: C.textPrimary, fontFamily: CAIRO, lineHeight: 1.5
};

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


    // Fetch rep
    const fetchRep = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/sales-reps/${id}`);
            if (res.ok) {
                const data = await res.json();
                setRep(data);
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

    const monthSales = invoices
        .filter(inv => {
            const d = new Date(inv.date);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((s, inv) => s + Number(inv.total), 0);

    const visibleTabs = TABS.filter(tab => {
        if (tab.key === 'invoices') return (rep?._count?.invoices ?? 0) > 0;
        if (tab.key === 'customers') return (rep?._count?.customers ?? 0) > 0;
        return true;
    });

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
                    {visibleTabs.map(tab => (
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
                            بيانات المندوب
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>الاسم</label>
                                <p style={READ_FIELD}>{rep.name}</p>
                            </div>
                            <div>
                                <label style={LS}>الكود</label>
                                <p style={READ_FIELD}>{rep.code || '—'}</p>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>الهاتف</label>
                                <p style={{ ...READ_FIELD, fontFamily: OUTFIT, direction: 'ltr', textAlign: 'right' }}>{rep.phone || '—'}</p>
                            </div>
                            <div>
                                <label style={LS}>البريد الإلكتروني</label>
                                <p style={{ ...READ_FIELD, fontFamily: OUTFIT, direction: 'ltr', textAlign: 'right' }}>{rep.email || '—'}</p>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>نسبة العمولة</label>
                                <p style={{ ...READ_FIELD, fontFamily: OUTFIT }}>{rep.commissionRate ?? 0}%</p>
                            </div>
                            <div>
                                <label style={LS}>أساس العمولة</label>
                                <p style={READ_FIELD}>{rep.commissionType === 'collected_amount' ? 'على التحصيل' : 'على الفاتورة'}</p>
                            </div>
                        </div>
                        <div>
                            <label style={LS}>الحالة</label>
                            <div style={{ marginTop: '6px' }}>
                                <span style={{
                                    display: 'inline-block', padding: '5px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, fontFamily: CAIRO,
                                    background: rep.isActive ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)',
                                    color: rep.isActive ? C.success : C.danger
                                }}>
                                    {rep.isActive ? 'نشط' : 'موقوف'}
                                </span>
                            </div>
                        </div>
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
