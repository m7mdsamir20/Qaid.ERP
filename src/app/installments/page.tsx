'use client';

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

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB');
const fmtN = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
                // Items API returns { items: [], total: ... } for pagination
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.customerId || !form.totalAmount || !selectedItem) {
            alert(t('يرجى اختيار العميل والمنتج وإدخال المبلغ'));
            return;
        }
        const selectedItemData = items.find(i => i.id === selectedItem);
        if (selectedItemData) {
            const totalInStock = (selectedItemData.stocks || []).reduce((s: number, v: any) => s + v.quantity, 0);
            if (parseInt(form.quantity) > totalInStock) {
                alert(t('عفواً، الكمية المطلوبة') + ` (${form.quantity}) ` + t('غير متوفرة بالكامل في المخزن حالياً. المتاح:') + ` ${totalInStock}`);
                return;
            }
        }

        setSubmitting(true);
        try {
            const finalProductName = form.quantity && parseInt(form.quantity) > 1
                ? `${form.productName} (${form.quantity})`
                : form.productName;

            const res = await fetch('/api/installments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    productName: finalProductName,
                    totalAmount,
                    downPayment,
                    interestRate,
                    taxRate,
                    taxAmount,
                    monthsCount,
                    itemId: selectedItem,
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
                        onClick: () => setShowNew(true),
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
                            <div style={{ textAlign: 'start' }}>
                                <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', whiteSpace: 'nowrap' }}>{k.label}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    {typeof k.value === 'string' && k.suffix ? (
                                        fMoneyJSX(parseFloat(k.value.replace(/,/g, '')))
                                    ) : (
                                        <>
                                            <span style={{ fontSize: '18px', fontWeight: 800, color: C.textPrimary, fontFamily: OUTFIT }}>{k.value}</span>
                                            <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500 }}>{k.suffix || k.subtitle}</span>
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

                    {loading ? (
                        <div style={{ padding: '60px' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    ) : (
                        <div style={{ ...TABLE_STYLE.container, border: `1px solid ${C.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={TABLE_STYLE.table}>
                                    <thead>
                                        <tr style={TABLE_STYLE.thead}>
                                            {[t('الخطة'), t('المنتج'), t('الهاتف'), t('العميل'), t('إجمالي الخطة'), t('المقدم'), t('القسط'), t('المدة'), t('الحالة'), t('إجراء')].map((h, i) => (
                                                <th key={i} style={TABLE_STYLE.th(i === 0, [8, 9].includes(i))}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((p, idx) => {
                                            const paidCount = (p.installments || []).filter((i: any) => i.status === 'paid').length;
                                            const overdueCount = (p.installments || []).filter((i: any) => i.status !== 'paid' && new Date(i.dueDate) < new Date()).length;
                                            return (
                                                <tr key={p.id} 
                                                    style={TABLE_STYLE.row(idx === filtered.length - 1)}
                                                    onClick={() => router.push(`/installments/${p.id}`)}
                                                    onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={TABLE_STYLE.td(true, true)}>
                                                        <div style={{ fontWeight: 900, color: '#5286ed', fontFamily: OUTFIT, fontSize: '13px' }}>PLAN-{String(p.planNumber || idx + 1).padStart(4, '0')}</div>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false, true)}>
                                                        {p.productName ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <Package size={14} style={{ opacity: 0.5 }} />
                                                                <span style={{ fontWeight: 600 }}>{p.productName}</span>
                                                            </div>
                                                        ) : <span style={{ color: C.textMuted }}>—</span>}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', color: C.textSecondary, fontFamily: OUTFIT, fontSize: '13px' }}>{p.customer?.phone || '—'}</td>
                                                    <td style={{ padding: '12px 16px', fontWeight: 600, color: C.textPrimary }}>{p.customer?.name}</td>
                                                    <td style={{ padding: '12px 16px',  fontWeight: 800, fontFamily: OUTFIT }}>
                                                        {fMoneyJSX(p.grandTotal)}
                                                    </td>
                                                    <td style={{ padding: '12px 16px',  color: '#10b981', fontWeight: 700, fontFamily: OUTFIT }}>
                                                        {fMoneyJSX(p.downPayment)}
                                                    </td>
                                                    <td style={{ padding: '12px 16px',  color: C.primary, fontWeight: 800, fontFamily: OUTFIT }}>
                                                        {fMoneyJSX(p.installmentAmount)}
                                                    </td>
                                                    <td style={{ padding: '12px 16px',  color: C.textSecondary, fontFamily: OUTFIT, fontSize: '13px' }}>
                                                        {paidCount} <span style={{ margin: '0 2px', opacity: 0.4 }}>/</span> {p.monthsCount}
                                                        <span style={{ fontSize: '10px', marginInlineStart: '4px' }}>{t('شهر')}</span>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false, true)}>
                                                        {overdueCount > 0 ? (
                                                            <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '30px', background: 'rgba(239, 68, 68, 0.12)', color: '#fb7185', border: '1px solid rgba(239, 68, 68, 0.22)', fontSize: '10px', fontWeight: 800, gap: '4px', alignItems: 'center' }}>
                                                                <AlertTriangle size={10} /> {overdueCount} {t('متأخر')}
                                                            </span>
                                                        ) : p.status === 'completed' ? (
                                                            <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '30px', background: 'rgba(239, 68, 68, 0.12)', color: '#fb7185', border: '1px solid rgba(239, 68, 68, 0.22)', fontSize: '10px', fontWeight: 800, gap: '4px', alignItems: 'center' }}>
                                                                <Check size={10} /> {t('انتهت')}
                                                            </span>
                                                        ) : (
                                                            <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '30px', background: 'rgba(74, 222, 128, 0.12)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.22)', fontSize: '10px', fontWeight: 800, gap: '4px', alignItems: 'center' }}>
                                                                <Clock size={10} /> {t('نشطة')}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false, true)} onClick={e => e.stopPropagation()}>
                                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                            <button onClick={() => router.push(`/installments/${p.id}`)}
                                                                style={{ width: 32, height: 32, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', transition: '0.2s' }}
                                                                onMouseEnter={e => e.currentTarget.style.color = C.primary}
                                                                onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}
                                                                title={t("عرض التفاصيل")}
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filtered.length === 0 && (
                                <div style={{ padding: '80px', color: C.textMuted }}>
                                    <CreditCard size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                                    <p style={{ fontSize: '15px' }}>{t('لا توجد خطط تقسيط مطابقة للبحث')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── New Plan Modal (REDESIGNED PREMIUM) ── */}
                <AppModal 
                    show={showNew} 
                    onClose={() => setShowNew(false)} 
                    title={t("إنشاء خطة تقسيط جديدة")} 
                    icon={Plus} 
                    maxWidth="720px"
                >
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            
                            {/* Section 1: Basic Contract Info */}
                            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', borderBottom: `1px solid ${C.border}`, paddingBottom: '6px' }}>
                                <User size={14} color={C.primary} />
                                <span style={{ fontSize: '12.5px', fontWeight: 800, color: C.primary }}>{t('بيانات التعاقد الأساسية')}</span>
                            </div>

                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <label style={{ ...LS, fontSize: '11.5px', marginBottom: 0 }}>{t('العميل المتعاقد')} <span style={{ color: C.danger }}>*</span></label>
                                    <button type="button" onClick={() => setShowAddCustomer(true)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#10b981', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                                        <UserPlus size={12} /> {t('عميل جديد')}
                                    </button>
                                </div>
                                <CustomSelect
                                    value={form.customerId}
                                    onChange={v => setForm(f => ({ ...f, customerId: v }))}
                                    options={customers.map(c => ({ 
                                        value: c.id, 
                                        label: c.name, 
                                    }))}
                                    placeholder={t("ابحث واختر العميل...")}
                                    icon={User}
                                    style={{ height: '36px', background: C.inputBg }}
                                />
                                {form.customerId && (
                                    <div style={{
                                        marginTop: '10px',
                                        padding: '6px 14px',
                                        borderRadius: '24px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: (customers.find(c => c.id === form.customerId)?.balance || 0) > 0
                                            ? 'rgba(239,68,68,0.08)'
                                            : (customers.find(c => c.id === form.customerId)?.balance || 0) < 0
                                            ? 'rgba(52,211,153,0.08)'
                                            : 'rgba(255,255,255,0.03)',
                                        color: (customers.find(c => c.id === form.customerId)?.balance || 0) > 0 ? '#f87171'
                                            : (customers.find(c => c.id === form.customerId)?.balance || 0) < 0 ? '#34d399'
                                            : '#475569',
                                        border: `1px solid ${
                                            (customers.find(c => c.id === form.customerId)?.balance || 0) > 0 ? 'rgba(239,68,68,0.2)'
                                            : (customers.find(c => c.id === form.customerId)?.balance || 0) < 0 ? 'rgba(52,211,153,0.2)'
                                            : 'rgba(255,255,255,0.06)'
                                        }`,
                                    }}>
                                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
                                        {Math.abs(customers.find(c => c.id === form.customerId)?.balance || 0) > 0
                                            ? `${(customers.find(c => c.id === form.customerId)?.balance || 0) > 0 ? t('عليه') : t('له')}: ${Math.abs(customers.find(c => c.id === form.customerId)?.balance || 0).toLocaleString()} ${cSymbol}`
                                            : t('رصيده صفر')
                                        }
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ ...LS, fontSize: '11.5px' }}>{t('المنتج / غرض التقسيط')} <span style={{ color: C.danger }}>*</span></label>
                                <CustomSelect
                                    value={selectedItem}
                                    onChange={onSelectItem}
                                    options={items.map(i => ({ value: i.id, label: i.name, sub: `${t('المتاح')}: ${i.stocks?.reduce((s:number,v:any)=>s+v.quantity,0)||0} | ${t('السعر')}: ${fmtN(i.sellPrice)} ${cSymbol}` }))}
                                    placeholder={t("اختر منتجاً من القائمة...")}
                                    icon={Package}
                                    style={{ height: '36px', background: C.inputBg }}
                                />
                            </div>

                            <div>
                                <label style={{ ...LS, fontSize: '11.5px' }}>{t('الكمية')}</label>
                                <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} style={{ ...IS, height: '38px' }} onFocus={focusIn} onBlur={focusOut} />
                            </div>

                            <div>
                                <label style={{ ...LS, fontSize: '11.5px' }}>{t('قيمة المنتج الإجمالية')} <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" required min="0" placeholder="0.00" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))} style={{ ...IS, height: '38px', paddingInlineStart: '40px' }} onFocus={focusIn} onBlur={focusOut} />
                                    <span style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: C.textMuted }}>{cSymbol}</span>
                                </div>
                            </div>

                            {/* Tax Section (Only if enabled in settings) */}
                            {taxSettings?.enabled && (
                                <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '16px', border: `1px solid ${C.border}`, marginTop: '5px' }}>
                                    <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <Info size={14} color={C.primary} />
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: C.primary }}>{t('بيانات الضريبة')} ({taxSettings.type}) - {taxSettings.isInclusive ? t('شاملة') : t('صافي')}</span>
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('نسبة الضريبة (%)')}</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type="number" value={form.taxRate} 
                                                onChange={e => {
                                                    const r = parseFloat(e.target.value) || 0;
                                                    const total = parseFloat(form.totalAmount) || 0;
                                                    let taxAmt = 0;
                                                    if (taxSettings.isInclusive) taxAmt = total - (total / (1 + r / 100));
                                                    else taxAmt = total * (r / 100);
                                                    setForm(f => ({ ...f, taxRate: e.target.value, taxAmount: String(taxAmt.toFixed(2)) }));
                                                }} 
                                                style={{ ...IS, height: '34px', paddingInlineStart: '28px' }} onFocus={focusIn} onBlur={focusOut} 
                                            />
                                            <span style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 900, color: C.primary }}>%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('مبلغ الضريبة')} ({cSymbol})</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" inputMode="decimal" value={fmtN(parseFloat(form.taxAmount) || 0)} 
                                                onChange={e => {
                                                    const v = e.target.value.replace(/,/g, '');
                                                    if (v === '' || !isNaN(Number(v)) || v === '.') {
                                                        const amt = v === '' ? 0 : parseFloat(v) || 0;
                                                        const total = parseFloat(form.totalAmount) || 0;
                                                        const r = total > 0 ? (amt / total) * 100 : parseFloat(form.taxRate);
                                                        setForm(f => ({ ...f, taxAmount: v, taxRate: String(r.toFixed(2)) }));
                                                    }
                                                }}
                                                style={{ ...IS, height: '34px', paddingInlineStart: '32px', fontWeight: 800, color: C.primary }} onFocus={focusIn} onBlur={focusOut} 
                                            />
                                            <span style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: C.textMuted }}>{cSymbol}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section 2: Financial Details */}
                            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', marginBottom: '2px', borderBottom: `1px solid ${C.border}`, paddingBottom: '6px' }}>
                                <DollarSign size={14} color={C.primary} />
                                <span style={{ fontSize: '12.5px', fontWeight: 800, color: C.primary }}>{t('التفاصيل المالية والفوائد')}</span>
                            </div>

                            <div>
                                <label style={{ ...LS, fontSize: '11.5px' }}>{t('الدفعة المقدمة')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" min="0" placeholder="0.00" value={form.downPayment} onChange={e => setForm(f => ({ ...f, downPayment: e.target.value }))} style={{ ...IS, height: '38px', paddingInlineStart: '40px' }} onFocus={focusIn} onBlur={focusOut} />
                                    <span style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: C.textMuted }}>{cSymbol}</span>
                                </div>
                            </div>

                            <div>
                                <label style={{ ...LS, fontSize: '11.5px' }}>{t('فائدة سنوية %')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" min="0" placeholder="0" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} style={{ ...IS, height: '38px', paddingInlineStart: '28px' }} onFocus={focusIn} onBlur={focusOut} />
                                    <span style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 900, color: C.primary }}>%</span>
                                </div>
                            </div>

                            {downPayment > 0 && (
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ ...LS, fontSize: '11.5px' }}>{t('توريد المقدم إلى')} <span style={{ color: C.danger }}>*</span></label>
                                    <CustomSelect
                                        value={form.treasuryId}
                                        onChange={v => setForm(f => ({ ...f, treasuryId: v }))}
                                        options={treasuries.map(t_tr => ({ value: t_tr.id, label: t_tr.name, sub: t_tr.type === 'bank' ? t('حساب بنكي') : t('خزينة نقدية') }))}
                                        placeholder={t("اختر الخزينة...")}
                                        icon={Wallet}
                                        style={{ height: '36px' }}
                                    />
                                </div>
                            )}

                            {/* Section 3: Scheduling */}
                            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', marginBottom: '2px', borderBottom: `1px solid ${C.border}`, paddingBottom: '6px' }}>
                                <Calendar size={14} color={C.primary} />
                                <span style={{ fontSize: '12.5px', fontWeight: 800, color: C.primary }}>{t('جدولة الأقساط')}</span>
                            </div>

                            <div>
                                <label style={{ ...LS, fontSize: '11.5px' }}>{t('مدة التقسيط (شهر)')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" min="1" placeholder="12" value={form.monthsCount} onChange={e => setForm(f => ({ ...f, monthsCount: e.target.value }))} style={{ ...IS, height: '38px', paddingInlineStart: '42px' }} onFocus={focusIn} onBlur={focusOut} />
                                    <span style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 700, color: C.textMuted }}>{t('شهر')}</span>
                                </div>
                            </div>

                            <div>
                                <label style={{ ...LS, fontSize: '11.5px' }}>{t('تاريخ أول استحقاق')}</label>
                                <div style={{ position: 'relative' }}>
                                    <Calendar size={14} style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                                    <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={{ ...IS, height: '38px', paddingInlineEnd: '38px', colorScheme: 'dark', fontFamily: OUTFIT, fontSize: '13px' }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>

                            <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                <label style={{ ...LS, fontSize: '11.5px', marginBottom: '8px' }}>{t('نظام الدفع')} <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {[
                                        { id: 'monthly', label: t('دفع شهري منتظم'), sub: t('كل شهر بدون استثناء'), icon: Clock },
                                        { id: 'seasonal', label: t('دفع موسمي مرن'), sub: t('في شهور محددة فقط'), icon: TrendingUp },
                                    ].map(t_sys => (
                                        <div key={t_sys.id} 
                                            onClick={() => setForm(f => ({ ...f, paymentType: t_sys.id }))}
                                            style={{
                                                flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s',
                                                border: `1px solid ${form.paymentType === t_sys.id ? C.primary : C.border}`,
                                                background: form.paymentType === t_sys.id ? 'rgba(37,106,244,0.1)' : 'rgba(255,255,255,0.02)',
                                                display: 'flex', alignItems: 'center', gap: '10px'
                                            }}
                                        >
                                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: form.paymentType === t_sys.id ? C.primary : 'rgba(255,255,255,0.05)', color: form.paymentType === t_sys.id ? '#fff' : C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <t_sys.icon size={16} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '12px', fontWeight: 800, color: form.paymentType === t_sys.id ? C.primary : C.textSecondary }}>{t_sys.label}</div>
                                                <div style={{ fontSize: '10px', color: C.textMuted }}>{t_sys.sub}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {form.paymentType === 'seasonal' && (
                                <div style={{ gridColumn: 'span 2', animation: 'fadeIn 0.3s', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '15px', border: `1px solid ${C.border}` }}>
                                    <label style={{ ...LS, fontSize: '11px', color: C.primary, marginBottom: '10px', display: 'block', fontWeight: 900 }}>{t('حدد الشهور النشطة للتحصيل:')}</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                                        {['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'].map((m, i) => {
                                            const monthNum = i + 1;
                                            const isActive = form.activeMonths.includes(monthNum);
                                            return (
                                                <div key={i} 
                                                    onClick={() => {
                                                        const newMonths = isActive 
                                                            ? form.activeMonths.filter(x => x !== monthNum)
                                                            : [...form.activeMonths, monthNum];
                                                        setForm(f => ({ ...f, activeMonths: newMonths }));
                                                    }}
                                                    style={{
                                                        padding: '8px 4px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: '0.2s',
                                                        border: `1px solid ${isActive ? C.primary : 'rgba(255,255,255,0.05)'}`,
                                                        background: isActive ? 'rgba(37,106,244,0.15)' : 'transparent',
                                                        color: isActive ? C.primary : C.textMuted
                                                    }}
                                                >
                                                    {t(m)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p style={{ fontSize: '10px', color: C.textMuted, marginTop: '10px' }}>⚠️ {t('سيتم تجاوز الشهور غير المحددة عند توليد جدول الأقساط.')}</p>
                                </div>
                            )}

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ ...LS, fontSize: '11.5px' }}>{t('ملاحظات العقد')}</label>
                                <textarea 
                                    placeholder={t("أية ملاحظات إضافية حول شروط التقسيط...")}
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    style={{ ...IS, height: '50px', padding: '8px 12px', resize: 'none', fontSize: '12px' }} 
                                    onFocus={focusIn} onBlur={focusOut}
                                />
                            </div>
                        </div>

                        {/* Summary Overlay */}
                        {totalAmount > 0 && (
                            <div style={{ 
                                marginTop: '16px', 
                                background: 'rgba(37,106,244,0.06)', 
                                border: `1px solid ${C.primary}20`, 
                                borderRadius: '16px', 
                                padding: '14px' 
                            }}>
                                <div style={{ fontSize: '12px', color: C.primary, fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <TrendingUp size={14} /> {t('الخلاصة المالية المتوقعة')}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                    {[
                                        { label: t('الضريبة'), value: fmtN(taxAmount), color: C.primary },
                                        { label: t('المتبقي'), value: fmtN(remaining), color: C.textPrimary },
                                        { label: t('فوائد'), value: fmtN(totalInterest), color: C.warning },
                                        { label: t('الإجمالي'), value: fmtN(grandTotal), color: C.textPrimary, bold: true },
                                        { label: t('القسط'), value: fmtN(installmentAmt), color: C.primary, bold: true, span: 4 },
                                    ].map((inv_item, i) => (
                                        <div key={i} style={{ 
                                            gridColumn: inv_item.span ? `span ${inv_item.span}` : 'auto',
                                            background: 'rgba(255,255,255,0.02)', 
                                            borderRadius: '12px', 
                                            padding: '8px 4px', 
                                            border: `1px solid ${C.border}` 
                                        }}>
                                            <div style={{ fontSize: '10px', color: C.textMuted, marginBottom: '4px' }}>{inv_item.label}</div>
                                            <div style={{ fontSize: '13.5px', fontWeight: inv_item.bold ? 800 : 700, color: inv_item.color, fontFamily: OUTFIT }}>
                                                {inv_item.value} <span style={{ fontSize: '9px', fontWeight: 400, opacity: 0.6 }}>{cSymbol}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button type="submit" disabled={submitting} style={{ ...BTN_PRIMARY(false, submitting), flex: 1.5, height: '48px', fontSize: '14px' }}>
                                {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle2 size={16} /> {t('اعتماد وحفظ الخطة')}</>}
                            </button>
                            <button type="button" onClick={() => setShowNew(false)} style={{ 
                                flex: 1, height: '48px', borderRadius: '12px', 
                                border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', 
                                color: C.textSecondary, fontWeight: 700, cursor: 'pointer',
                                transition: 'all 0.2s', fontFamily: CAIRO, fontSize: '13px'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.color = C.textPrimary;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                e.currentTarget.style.color = C.textSecondary;
                            }}
                            >{t('تراجـع')}</button>
                        </div>
                    </form>
                </AppModal>

                {/* Delete Confirmation Modal */}
                {deleteId && (
                    <AppModal 
                        show={!!deleteId} 
                        onClose={() => setDeleteId(null)} 
                        title={t("تأكيد حذف الخطة")} 
                        icon={AlertTriangle} 
                        variant="danger"
                    >
                        <div style={{ padding: '10px 0' }}>
                            <p style={{ fontWeight: 700, fontSize: '16px', color: C.textPrimary }}>{t('هل أنت متأكد من حذف هذه الخطة نهائياً؟')}</p>
                            <p style={{ color: C.textMuted, fontSize: '14px', marginTop: '8px', lineHeight: 1.6 }}>{t('سيتم حذف كافة الأقساط والتحصيلات المرتبطة بها. هذا الإجراء لا يمكن التراجع عنه.')}</p>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button onClick={() => setDeleteId(null)} style={{ flex: 1, height: '46px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 700, cursor: 'pointer' }}>{t('تراجع')}</button>
                                <button onClick={handleDelete} disabled={submitting} style={{ flex: 1.5, height: '46px', borderRadius: '12px', background: C.danger, color: '#fff', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : t('تأكيد الحذف النهائي')}
                                </button>
                            </div>
                        </div>
                    </AppModal>
                )}

                {/* Add Customer Modal Integration */}
                <AppModal
                    show={showAddCustomer}
                    onClose={() => setShowAddCustomer(false)}
                    title={t("إضافة عميل جديد")}
                    icon={UserPlus}
                    maxWidth="440px"
                >
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const name = (e.currentTarget.elements.namedItem('custName') as HTMLInputElement).value;
                        const phone = (e.currentTarget.elements.namedItem('custPhone') as HTMLInputElement).value;
                        const address = (e.currentTarget.elements.namedItem('custAddress') as HTMLInputElement).value;
                        
                         if (!name) return;
                        setSubmitting(true);
                        try {
                            const addRes = await fetch('/api/customers', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name, phone, address }),
                            });
                            if (addRes.ok) {
                                const newCust = await addRes.json();
                                setCustomers(prev => [newCust, ...prev]);
                                setForm(f => ({ ...f, customerId: newCust.id }));
                                setShowAddCustomer(false);
                            } else {
                                const addErr = await addRes.json();
                                alert(addErr.error || t('فشل في إضافة العميل'));
                            }
                        } catch {
                            alert(t('خطأ في الاتصال بالخادم'));
                        } finally {
                            setSubmitting(false);
                        }
                    }}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={LS}>{t('اسم العميل الجديد')} <span style={{ color: C.danger }}>*</span></label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
                                <input name="custName" required placeholder={t("الاسم الكامل للعميل...")} style={{ ...IS, height: '42px', paddingInlineEnd: '40px' }} onFocus={focusIn} onBlur={focusOut} autoFocus />
                            </div>
                        </div>
 
                        <div style={{ marginBottom: '16px' }}>
                            <label style={LS}>{t('رقم الهاتف')}</label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={16} style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
                                <input name="custPhone" placeholder="01x xxxx xxxx" style={{ ...IS, height: '42px', paddingInlineEnd: '40px', direction: 'ltr', textAlign: 'end' }} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
 
                        <div style={{ marginBottom: '24px' }}>
                            <label style={LS}>{t('العنوان')}</label>
                            <input name="custAddress" placeholder={t("العنوان بالتفصيل...")} style={{ ...IS, height: '42px' }} onFocus={focusIn} onBlur={focusOut} />
                        </div>
 
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="submit" disabled={submitting} style={{ ...BTN_PRIMARY(false, submitting), flex: 1.5, height: '46px' }}>
                                {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : t('حفظ البيانات')}
                            </button>
                            <button type="button" onClick={() => setShowAddCustomer(false)} style={{ 
                                flex: 1, height: '46px', borderRadius: '12px', border: `1px solid ${C.border}`,
                                background: 'transparent', color: C.textSecondary, fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO
                            }}>{t('إلغاء')}</button>
                        </div>
                    </form>
                </AppModal>
            </div>
            
        </>
        </DashboardLayout>
    );
}
