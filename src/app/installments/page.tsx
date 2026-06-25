'use client';
import TableSkeleton from '@/components/TableSkeleton';
import DataTable from '@/components/DataTable';
import { formatNumber } from '@/lib/currency';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { CreditCard, Plus, Search, Eye, Trash2, Loader2, CheckCircle2, Clock, AlertTriangle, X, Check, ChevronDown, User, Calendar, Banknote, Printer, UserPlus, Package, ArrowLeftCircle, ShoppingCart, TrendingUp, DollarSign, Wallet, Info, Phone } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import AppModal from '@/components/AppModal';
import { THEME, C, CAIRO, OUTFIT, IS, LS, SC, STitle, PAGE_BASE, BTN_PRIMARY, BTN_DANGER, TABLE_STYLE, focusIn, focusOut } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';

const fmt = (d: string) => new Date(d).toLocaleDateString('en-ZA');
const fmtN = (n: number) => formatNumber(n);

export default function InstallmentsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { symbol: cSymbol, fMoney, fMoneyJSX } = useCurrency();
    const [plans, setPlans] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [treasuries, setTreasuries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [cart, setCart] = useState<any[]>([]);
    const [cartQuantity, setCartQuantity] = useState('1');
    const [cartPrice, setCartPrice] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [form, setForm] = useState({
        customerId: '', productName: '', totalAmount: '', downPayment: '',
        interestRate: '', monthsCount: '12',
        startDate: new Date().toISOString().split('T')[0],
        notes: '', treasuryId: '', quantity: '1',
        paymentType: 'monthly',
        activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        taxRate: '0',
        taxAmount: '0',
    });
    const [taxSettings, setTaxSettings] = useState<any>(null);

    const [items, setItems] = useState<any[]>([]);
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    const fetchData = useCallback(async () => {
        try {
            const [pRes, cRes, tRes, iRes] = await Promise.all([
                fetch('/api/installments'),
                fetch('/api/customers'),
                fetch('/api/treasuries'),
                fetch('/api/items'),

            ]);

            if (pRes.ok) {
                const data = await pRes.json();
                setPlans(Array.isArray(data) ? data : []);
            }

            if (cRes.ok) {
                const data = await cRes.json();
                setCustomers(Array.isArray(data) ? data : []);
            }

            if (tRes.ok) {
                const data = await tRes.json();
                setTreasuries(Array.isArray(data) ? data : []);
            }

            if (iRes.ok) {
                const data = await iRes.json();
                setItems(Array.isArray(data) ? data : (data.items || []));
            }

        } catch (error) {
            console.error("Fetch Error:", error);
        } finally { setLoading(false); }
    }, []);

    const fetchTaxSettings = useCallback(async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                if (data.company?.taxSettings) {
                    const tax = typeof data.company.taxSettings === 'string' ? JSON.parse(data.company.taxSettings) : data.company.taxSettings;
                    setTaxSettings(tax);
                }
            }
        } catch { }
    }, []);

    useEffect(() => {
        fetchData();
        fetchTaxSettings();
    }, [fetchData, fetchTaxSettings]);

    // Reset form when modal closes
    useEffect(() => {
        if (!showNew) {
            setForm({
                customerId: '', productName: '', totalAmount: '', downPayment: '',
                interestRate: '', monthsCount: '12',
                startDate: new Date().toISOString().split('T')[0],
                notes: '', treasuryId: '', quantity: '1',
                paymentType: 'monthly',
                activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                taxRate: '0',
                taxAmount: '0',
            });
            setSelectedItem(null);
            setCart([]);
            setCartQuantity('1');
            setCartPrice('');
        }
    }, [showNew]);

    // Handle initial tax calculation when totalAmount or taxSettings change
    useEffect(() => {
        if (showNew && taxSettings?.enabled && form.totalAmount) {
            const total = parseFloat(form.totalAmount) || 0;
            const rate = taxSettings.rate || 0;
            let taxAmt = 0;
            if (taxSettings.isInclusive) {
                taxAmt = total - (total / (1 + rate / 100));
            } else {
                taxAmt = total * (rate / 100);
            }
            setForm(f => ({ ...f, taxRate: String(rate), taxAmount: String(taxAmt.toFixed(2)) }));
        }
    }, [showNew, taxSettings, form.totalAmount]);

    // حسابات مباشرة
    const totalAmount = parseFloat(form.totalAmount) || 0;
    const downPayment = parseFloat(form.downPayment) || 0;
    const interestRate = parseFloat(form.interestRate) || 0;
    const taxAmount = parseFloat(form.taxAmount) || 0;
    const taxRate = parseFloat(form.taxRate) || 0;
    const monthsCount = parseInt(form.monthsCount) || 12;

    const basePriceForInterest = taxSettings?.isInclusive ? totalAmount - taxAmount : totalAmount;
    const priceWithTax = totalAmount + (taxSettings?.isInclusive ? 0 : taxAmount);

    const remaining = priceWithTax - downPayment;
    const totalInterest = parseFloat((remaining * interestRate / 100).toFixed(2));
    const grandTotal = remaining + totalInterest;
    const installmentAmt = monthsCount > 0 ? parseFloat((grandTotal / monthsCount).toFixed(2)) : 0;


    const handleAddToCart = () => {
        if (!selectedItem) return alert(t('اختر الصنف'));
        const item = items.find(i => i.id === selectedItem);
        if (!item) return;
        const q = parseFloat(cartQuantity) || 1;
        const p = parseFloat(cartPrice) || item.sellPrice || 0;

        const inStock = (item.stocks || []).reduce((s: number, v: any) => s + v.quantity, 0);
        if (q > inStock) return alert(t('الكمية المطلوبة غير متوفرة. المتاح: ') + inStock);

        setCart(prev => [...prev, { id: item.id, name: item.name, quantity: q, price: p, total: q * p }]);
        setSelectedItem(null);
        setCartQuantity('1');
        setCartPrice('');
    };
    const handleRemoveFromCart = (idx: number) => {
        setCart(prev => prev.filter((_, i) => i !== idx));
    };

    useEffect(() => {
        if (showNew) {
            const total = cart.reduce((sum, item) => sum + item.total, 0);
            setForm(f => ({ ...f, totalAmount: String(total) }));
        }
    }, [cart, showNew]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.customerId || cart.length === 0) {
            alert(t('يرجى اختيار العميل وإضافة المنتجات للسلة'));
            return;
        }

        setSubmitting(true);
        try {
            const productName = cart.map((i: any) => `${i.name} (${i.quantity})`).join(', ');

            const res = await fetch('/api/installments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    productName,
                    cart,
                    totalAmount,
                    downPayment,
                    interestRate,
                    taxRate,
                    taxAmount,
                    monthsCount,
                    type: 'invoice', // Force backend to create invoice
                }),
            });
            if (res.ok) {
                setShowNew(false);
                fetchData();
            } else {
                const d = await res.json();
                alert(d.error || t('فشل الحفظ'));
            }
        } finally { setSubmitting(false); }
    };

    const onSelectItem = (id: string) => {
        setSelectedItem(id);
        const item = items.find(i => i.id === id);
        if (item) {
            setForm(f => ({
                ...f,
                productName: item.name,
                totalAmount: item.sellPrice ? String(item.sellPrice) : f.totalAmount
            }));
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await fetch(`/api/installments?id=${deleteId}`, { method: 'DELETE' });
        setDeleteId(null);
        fetchData();
    };

    const filtered = plans.filter(p =>
        (p.customer?.name || '').includes(search) ||
        (p.planNumber?.toString() || '').includes(search) ||
        (p.productName || '').includes(search)
    );

    // KPIs
    const kpis = {
        total: plans.length,
        active: plans.filter(p => p.status === 'active').length,
        overdue: plans.reduce((s, p) =>
            s + (p.installments || []).filter((i: any) =>
                i.status !== 'paid' && new Date(i.dueDate) < new Date()).length, 0),
        pending: plans.reduce((s, p) =>
            s + (p.installments || []).filter((i: any) =>
                i.status !== 'paid').reduce((ss: number, i: any) => ss + (i.remaining || 0), 0), 0),
    };

    const kpiData = [
        { label: t('إجمالي الخطط'), value: kpis.total, color: '#256af4', icon: CreditCard, subtitle: t('إجمالي الحالات') },
        { label: t('خطط نشطة'), value: kpis.active, color: '#10b981', icon: CheckCircle2, subtitle: t('جاري التحصيل') },
        { label: t('أقساط متأخرة'), value: kpis.overdue, color: '#fb7185', icon: AlertTriangle, subtitle: t('تحتاج متابعة') },
        { label: t('المتبقي للتحصيل'), value: fmtN(kpis.pending), color: '#a78bfa', icon: Wallet, subtitle: t('إجمالي المديونية'), suffix: cSymbol },
    ];

    return (
        <DashboardLayout>
            <>
                <div dir={isRtl ? 'rtl' : 'ltr'} style={{
                    ...PAGE_BASE,
                    background: C.bg,
                    minHeight: '100%',
                    fontFamily: CAIRO,
                    // Inject CSS Variables for components like CustomSelect
                    ['--surface-50' as any]: C.card,
                    ['--surface-100' as any]: C.inputBg,
                    ['--surface-200' as any]: C.hover,
                    ['--text-primary' as any]: C.textPrimary,
                    ['--text-secondary' as any]: C.textSecondary,
                    ['--text-muted' as any]: C.textMuted,
                    ['--border-subtle' as any]: C.border,
                    ['--primary-500' as any]: C.primary,
                    ['--primary-light' as any]: 'var(--c-primary-bg, rgba(37,106,244,0.15))',
                }}>

                    {/* Header Section */}
                    <PageHeader
                        title={t("خطط التقسيط")}
                        subtitle={t("إدارة وتبقسيط المبيعات — تتبع دورات التحصيل وحالات السداد")}
                        icon={CreditCard}
                        primaryButton={{
                            label: t('خطة تقسيط جديدة'),
                            onClick: () => router.push("/installments/new"),
                            icon: Plus
                        }}
                    />

                    {/* KPIs Dashboard */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {kpiData.map((k, i) => (
                            <div key={i} style={{
                                background: `${k.color}08`, border: `1px solid ${k.color}33`, borderRadius: '10px',
                                padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.2s', position: 'relative'
                            }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 500, color: C.textSecondary, margin: '0 0 4px', whiteSpace: 'nowrap' }}>{k.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                        {typeof k.value === 'string' && k.suffix ? (
                                            fMoneyJSX(parseFloat(k.value.replace(/,/g, '')))
                                        ) : (
                                            <>
                                                <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{k.value}</span>
                                                <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 500 }}>{k.suffix || k.subtitle}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${k.color}15`, border: `1px solid ${k.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color }}>
                                    <k.icon size={20} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Filters ── */}
                    <div style={{ display: 'flex', marginBottom: '16px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                            <input
                                placeholder={t("ابحث باسم العميل، المنتج أو رقم الخطة...")}
                                value={search} onChange={e => setSearch(e.target.value)}
                                style={{ ...IS, width: '100%', paddingInlineStart: '40px', height: '38px', borderRadius: '8px', background: C.inputBg }}
                                onFocus={focusIn} onBlur={focusOut}
                            />
                        </div>
                    </div>

                    <DataTable
                        columns={[
                            {
                                header: t('الخطة'),
                                type: 'number',
                                cell: (row, idx) => (
                                    <span style={{ fontWeight: 600, color: '#5286ed', fontFamily: OUTFIT, fontSize: '13px', display: 'inline-block', direction: 'ltr' }}>
                                        {`PLAN-${String(row.planNumber || idx + 1).padStart(5, '0')}`}
                                    </span>
                                )
                            },
                            {
                                header: t('المنتج'),
                                type: 'text',
                                cell: (row) => row.productName ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Package size={14} style={{ opacity: 0.5 }} />
                                        <span style={{ fontWeight: 600 }}>{row.productName}</span>
                                    </div>
                                ) : <span style={{ color: C.textSecondary }}>—</span>
                            },
                            {
                                header: t('الهاتف'),
                                type: 'text',
                                cell: (row) => (
                                    <span style={{ fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary, display: 'inline-block', direction: 'ltr' }}>
                                        {row.customer?.phone || '—'}
                                    </span>
                                )
                            },
                            {
                                header: t('العميل'),
                                type: 'text',
                                cell: (row) => <span style={{ fontWeight: 600, color: C.textPrimary }}>{row.customer?.name}</span>
                            },
                            {
                                header: t('إجمالي الخطة'),
                                type: 'number',
                                cell: (row) => fMoneyJSX(row.grandTotal)
                            },
                            {
                                header: t('المقدم'),
                                type: 'number',
                                cell: (row) => <span style={{ color: '#10b981', fontWeight: 700 }}>{fMoneyJSX(row.downPayment)}</span>
                            },
                            {
                                header: t('القسط'),
                                type: 'number',
                                cell: (row) => <span style={{ color: C.primary, fontWeight: 600 }}>{fMoneyJSX(row.installmentAmount)}</span>
                            },
                            {
                                header: t('المدة'),
                                type: 'number',
                                cell: (row) => {
                                    const paidCount = (row.installments || []).filter((i: any) => i.status === 'paid').length;
                                    return (
                                        <span style={{ color: C.textSecondary, fontFamily: OUTFIT, fontSize: '13px' }}>
                                            {paidCount} <span style={{ margin: '0 2px', opacity: 0.4 }}>/</span> {row.monthsCount}
                                            <span style={{ fontSize: '10px', marginInlineStart: '4px' }}>{t('شهر')}</span>
                                        </span>
                                    );
                                }
                            },
                            {
                                header: t('الحالة'),
                                type: 'number',
                                cell: (row) => {
                                    const overdueCount = (row.installments || []).filter((i: any) => i.status !== 'paid' && new Date(i.dueDate) < new Date()).length;
                                    if (overdueCount > 0) {
                                        return (
                                            <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '30px', background: 'rgba(239, 68, 68, 0.12)', color: '#fb7185', border: '1px solid rgba(239, 68, 68, 0.22)', fontSize: '10px', fontWeight: 600, gap: '4px', alignItems: 'center' }}>
                                                <AlertTriangle size={10} /> {overdueCount} {t('متأخر')}
                                            </span>
                                        );
                                    }
                                    if (row.status === 'cancelled') {
                                        return (
                                            <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '30px', background: 'rgba(239, 68, 68, 0.12)', color: '#fb7185', border: '1px solid rgba(239, 68, 68, 0.22)', fontSize: '10px', fontWeight: 600, gap: '4px', alignItems: 'center' }}>
                                                <X size={10} /> {t('ملغاة')}
                                            </span>
                                        );
                                    }
                                    if (row.status === 'completed') {
                                        return (
                                            <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '30px', background: 'rgba(239, 68, 68, 0.12)', color: '#fb7185', border: '1px solid rgba(239, 68, 68, 0.22)', fontSize: '10px', fontWeight: 600, gap: '4px', alignItems: 'center' }}>
                                                <Check size={10} /> {t('انتهت')}
                                            </span>
                                        );
                                    }
                                    return (
                                        <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '30px', background: 'rgba(74, 222, 128, 0.12)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.22)', fontSize: '10px', fontWeight: 600, gap: '4px', alignItems: 'center' }}>
                                            <Clock size={10} /> {t('نشطة')}
                                        </span>
                                    );
                                }
                            },
                            {
                                header: t('إجراء'),
                                type: 'number',
                                cell: (row) => (
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                                        <button onClick={() => router.push(`/installments/${row.id}`)}
                                            style={{ width: 32, height: 32, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', transition: '0.2s' }}
                                            onMouseEnter={e => e.currentTarget.style.color = C.primary}
                                            onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}
                                            title={t("عرض التفاصيل")}
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </div>
                                )
                            }
                        ]}
                        data={filtered}
                        emptyIcon={CreditCard}
                        emptyMessage={t('لا توجد خطط تقسيط مطابقة للبحث')}
                        isLoading={loading}
                        loadingSkeleton={<TableSkeleton />}
                        onRowClick={(row) => router.push(`/installments/${row.id}`)}
                    />

                    {/* ── New Plan Modal (REDESIGNED PREMIUM) ── */}

                </div>

            </>
        </DashboardLayout>
    );
}
