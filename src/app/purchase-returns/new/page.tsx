'use client';
import { formatNumber } from '@/lib/currency';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import { RotateCcw, Printer, Lock, Info, Loader2, Search, ChevronDown, ChevronUp, ArrowRight, Banknote, Building2, UserCheck, FileText, Receipt, Package, CheckCircle2, ShoppingCart } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useSession } from 'next-auth/react';
import { CompanyInfo } from '@/lib/printInvoices';
import { useCurrency } from '@/hooks/useCurrency';
import { AlertCircle, User, Phone, UserPlus } from 'lucide-react';
import AppModal from '@/components/AppModal';

/* ── Types ── */
interface Supplier { id: string; name: string; phone?: string; balance: number; }
interface Warehouse { id: string; name: string; }
interface Treasury { id: string; name: string; type: string; balance: number; }
interface ReturnLine {
    itemId: string; itemCode: string; itemName: string; unit: string;
    originalQty: number;
    alreadyReturned: number;
    availableQty: number;
    returnQty: number;
    price: number;
    originalLineTotal: number;
    discountOnLine: number;
    netPrice: number;
    returnTotal: number;
    selected: boolean;
}
interface PurchaseInvoice {
    id: string;
    invoiceNumber: number;
    date: string;
    supplier: { id: string; name: string } | null;
    subtotal: number;
    discount: number;
    total: number;
    paidAmount: number;
    remaining: number;
    lines: {
        itemId: string;
        item: { id: string; code: string; name: string; unit: any };
        quantity: number;
        price: number;
        total: number;
        alreadyReturned?: number;
    }[];
}

const RETURN_REASONS = [
    'عيب في المنتج', 'تالف من المورد', 'خطأ في الطلبية',
    'تغيير في الاحتياجات', 'صنف غير مطابق للمواصفات', 'أخرى',
];

const fmt = (v: any) => {
    if (v === '' || v === undefined || v === null) return '';
    const n = parseFloat(String(v).replace(/,/g, ''));
    if (isNaN(n)) return '';
    return formatNumber(n);
};

export default function NewPurchaseReturnPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { data: session } = useSession();
    const activeBranchId = (session?.user as any)?.activeBranchId;
    const allBranches: any[] = (session?.user as any)?.branches || [];
    const allowedBranches: string[] | null = (session?.user as any)?.allowedBranches || null;
    const userBranches = allowedBranches?.length ? allBranches.filter(b => allowedBranches.includes(b.id)) : allBranches;
    const isAllBranches = (!activeBranchId || activeBranchId === 'all') && userBranches.length > 1;
    const { symbol: cSymbol, fMoneyJSX } = useCurrency();
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const clearError = (field: string) => {
        if (fieldErrors[field]) setFieldErrors(prev => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
    const [nextNum, setNextNum] = useState(1);
    const [company, setCompany] = useState<CompanyInfo>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState<any>({
        customerId: '',
        supplierId: '',
        warehouseId: '',
        originalInvoiceId: '',
        reason: '',
        refundType: 'balance' as 'balance' | 'cash' | 'bank',
        treasuryId: '',
        bankId: '',
        paidAmount: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
    });
    const [lines, setLines] = useState<ReturnLine[]>([]);

    /* ── Computed ── */
    const partners = [
        ...suppliers.map(s => ({ ...s, partnerType: 'supplier' })),
        ...customers.map(c => ({ ...c, partnerType: 'customer' }))
    ];
    const selectedPartner = partners.find(p => p.id === (form.supplierId || form.customerId));

    const selectedInvoice = Array.isArray(purchaseInvoices) ? purchaseInvoices.find(i => i.id === form.originalInvoiceId) : null;
    const cashTreasuries = Array.isArray(treasuries) ? treasuries.filter(t => t.type !== 'bank') : [];
    const bankTreasuries = Array.isArray(treasuries) ? treasuries.filter(t => t.type === 'bank') : [];

    const partnerId = form.supplierId || form.customerId;
    const supplierInvoices = (partnerId && Array.isArray(purchaseInvoices))
        ? purchaseInvoices.filter(i => {
            const matchSupplier = i.supplier?.id === form.supplierId && form.supplierId;
            const matchCustomer = (i as any).customer?.id === form.customerId && form.customerId;
            if (!matchSupplier && !matchCustomer) return false;
            if (!Array.isArray(i.lines)) return true;
            return i.lines.some(l => l.quantity > (l.alreadyReturned || 0));
        })
        : [];
    const selectedLines = lines.filter(l => l.selected && l.returnQty > 0);
    const returnSubtotal = selectedLines.reduce((s, l) => s + l.returnTotal, 0);
    const totalDiscountOnReturn = selectedLines.reduce((s, l) => s + (l.discountOnLine * (l.returnQty / l.originalQty)), 0);
    const netReturnTotal = returnSubtotal - totalDiscountOnReturn;

    /* ── Load data ── */
    const loadData = useCallback(async () => {
        try {
            const [retRes, supRes, custRes, whRes, trRes, purRes, coRes] = await Promise.all([
                fetch('/api/purchase-returns'), fetch('/api/suppliers'), fetch('/api/customers'),
                fetch('/api/warehouses'), fetch('/api/treasuries'), fetch('/api/purchases'), fetch('/api/company'),
            ]);

            const retData = await retRes.json();
            const purData = await purRes.json();
            const suppliersData = await supRes.json();
            const customersData = await custRes.json();
            const warehousesData = await whRes.json();
            const treasuriesData = await trRes.json();

            const returnsArray = Array.isArray(retData) ? retData : (retData.returns || []);
            const maxNum = returnsArray.reduce((m: number, r: any) => Math.max(m, r.invoiceNumber || 0), 0);
            setNextNum(maxNum + 1);

            setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
            setCustomers(Array.isArray(customersData) ? customersData : []);
            const whs = Array.isArray(warehousesData) ? warehousesData : [];
            setWarehouses(whs);
            if (whs.length > 0) setForm((f: any) => ({ ...f, warehouseId: whs[0].id }));

            const trs = Array.isArray(treasuriesData) ? treasuriesData : [];
            setTreasuries(trs);
            const firstCash = trs.find((t: any) => t.type !== 'bank');
            if (firstCash) setForm((f: any) => ({ ...f, treasuryId: firstCash.id }));
            const firstBank = trs.find((t: any) => t.type === 'bank');
            if (firstBank) setForm((f: any) => ({ ...f, bankId: firstBank.id }));

            setPurchaseInvoices(Array.isArray(purData.invoices) ? purData.invoices : []);
            if (coRes.ok) setCompany(await coRes.json());
        } catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { loadData(); }, [loadData]);

    /* ── When invoice selected ── */
    useEffect(() => {
        if (!form.originalInvoiceId) { setLines([]); return; }
        fetch(`/api/purchases?id=${form.originalInvoiceId}`)
            .then(r => r.json())
            .then(inv => {
                if (!inv || !Array.isArray(inv.lines)) return;
                const invSubtotal = inv.subtotal || inv.lines.reduce((s: number, l: any) => s + l.total, 0);
                const invDiscount = inv.discount || 0;
                setLines(inv.lines.map((l: any) => {
                    const alreadyReturned = l.alreadyReturned || 0;
                    const availableQty = l.quantity - alreadyReturned;
                    const lineDiscountRatio = invSubtotal > 0 ? l.total / invSubtotal : 0;
                    const discountOnLine = invDiscount * lineDiscountRatio;
                    const netPrice = l.quantity > 0 ? (l.total - discountOnLine) / l.quantity : l.price;
                    return {
                        itemId: l.itemId || l.item?.id,
                        itemCode: l.item.code,
                        itemName: l.item.name,
                        unit: l.item.unit?.name || l.item.unit || '',
                        originalQty: l.quantity,
                        alreadyReturned,
                        availableQty,
                        returnQty: availableQty,
                        price: l.price,
                        originalLineTotal: l.total,
                        discountOnLine,
                        netPrice,
                        returnTotal: availableQty * l.price,
                        selected: availableQty > 0,
                    };
                }));
            })
            .catch(() => setLines([]));
    }, [form.originalInvoiceId]);

    const toggleLine = (idx: number) => {
        setLines(prev => prev.map((l, i) => i === idx ? { ...l, selected: !l.selected } : l));
    };

    const updateReturnQty = (idx: number, val: number) => {
        setLines(prev => prev.map((l, i) => {
            if (i !== idx) return l;
            const qty = Math.min(Math.max(0, val), l.availableQty);
            return { ...l, returnQty: qty, returnTotal: qty * l.price, selected: qty > 0 };
        }));
    };

    const handleSubmit = async (andPrint = false) => {
        setFieldErrors({});
        const errors: Record<string, string> = {};

        if (!form.supplierId && !form.customerId) errors.supplierId = 'يرجى اختيار المورد / العميل';
        if (!form.warehouseId) errors.warehouseId = 'يرجى اختيار المخزن';
        if (!form.originalInvoiceId) errors.originalInvoiceId = 'يرجى اختيار الفاتورة';

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        if (selectedLines.length === 0) {
            alert('يرجى تحديد صنف واحد على الأقل للإرجاع'); return;
        }
        if (form.refundType === 'cash') {
            if (!form.treasuryId) { setFieldErrors({ treasuryId: 'يرجى اختيار الخزينة' }); return; }
            if (form.paidAmount <= 0) { setFieldErrors({ paidAmount: 'أدخل المبلغ' }); return; }
        }
        if (form.refundType === 'bank') {
            if (!form.bankId) { setFieldErrors({ bankId: 'يرجى اختيار الحساب' }); return; }
            if (form.paidAmount <= 0) { setFieldErrors({ paidAmount: 'أدخل المبلغ' }); return; }
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/purchase-returns', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: form.date,
                    supplierId: form.supplierId || undefined,
                    customerId: form.customerId || undefined,
                    warehouseId: form.warehouseId,
                    originalInvoiceId: form.originalInvoiceId,
                    reason: form.reason || undefined,
                    refundMethod: form.refundType,
                    treasuryId: form.refundType === 'cash' ? form.treasuryId : undefined,
                    bankId: form.refundType === 'bank' ? form.bankId : undefined,
                    paidAmount: form.refundType === 'balance' ? 0 : Number(form.paidAmount || 0),
                    notes: form.notes,
                    totalDiscount: totalDiscountOnReturn,
                    total: netReturnTotal,
                    lines: selectedLines.map(l => ({
                        itemId: l.itemId,
                        quantity: l.returnQty,
                        price: l.price,
                        total: l.returnTotal
                    })),
                }),
            });
            if (res.ok) {
                const saved = await res.json();
                if (andPrint) {
                    window.open(`/print/invoice/${saved.id}`, '_blank');
                }
                router.push('/purchase-returns');
            } else { const err = await res.json(); alert(err.error || 'فشل في الحفظ'); }
        } catch (err: any) { alert(err.message || 'فشل الاتصال'); }
        finally { setSubmitting(false); }
    };

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#475569', flexDirection: 'column', gap: '12px' }}>
                <Loader2 size={36} className="spin" />
                <span style={{ fontSize: '13px' }}>{t('جاري التحميل...')}</span>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite;}`}</style>
        </DashboardLayout>
    );

    const InlineError = ({ field }: { field: string }) => {
        if (!fieldErrors[field]) return null;
        return (
            <div style={{
                position: 'absolute', top: '-32px', insetInlineStart: '4px', fontSize: '11px', color: '#fff', fontWeight: 600,
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)', padding: '4px 10px', borderRadius: '8px',
                pointerEvents: 'none', zIndex: 100, boxShadow: '0 10px 15px -3px rgba(185, 28, 28, 0.4)',
                display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
                animation: 'inlineErrorPush 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                <AlertCircle size={12} strokeWidth={3} />
                {fieldErrors[field]}
                <div style={{ position: 'absolute', bottom: '-4px', insetInlineStart: '12px', width: '8px', height: '8px', background: '#b91c1c', transform: 'rotate(45deg)', borderRadius: '1px' }} />
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '30px', paddingTop: THEME.header.pt, background: C.bg, minHeight: '100vh', fontFamily: CAIRO }}>
                <PageHeader
                    title={t("مرتجع مشتريات جديد")}
                    subtitle={t("إرجاع أصناف للمورد وتسوية حسابه المالي والمخزني")}
                    icon={RotateCcw}
                    backUrl="/purchase-returns"
                />

                {/* ── Branch Warning ── */}
                {isAllBranches && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '14px 20px', marginBottom: '16px',
                        background: 'rgba(251,191,36,0.08)',
                        border: '1px solid rgba(251,191,36,0.3)',
                        borderRadius: '12px',
                        fontFamily: CAIRO,
                    }}>
                        <AlertCircle size={20} style={{ color: '#fbbf24', flexShrink: 0 }} />
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', marginBottom: '2px' }}>
                                {t('يرجى تحديد فرع أولاً')}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {t('أنت حالياً على وضع "كل الفروع" — اختر فرعاً محدداً من القائمة المنسدلة في الأعلى قبل إنشاء المرتجع')}
                            </div>
                        </div>
                    </div>
                )}

                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px', alignItems: 'start' }}>
                    {/* LEFT Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#256af4', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                <FileText size={16} /> {t('بيانات المرتجع الأساسية')}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                                {/* Row 1 */}
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '110px 140px 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('رقم المرتجع')}</label>
                                        <div style={{
                                            height: '42px', borderRadius: '10px',
                                            background: 'rgba(37, 106, 244,0.08)',
                                            border: `1px solid ${C.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontFamily: OUTFIT, fontWeight: 600,
                                            fontSize: '13px', color: '#60a5fa',
                                            letterSpacing: '1px',
                                        }}>
                                            RTN-{String(nextNum).padStart(5, '0')}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('تاريخ المرتجع')}</label>
                                        <input type="date" value={form.date}
                                            onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))}
                                            style={{ ...IS, background: C.inputBg, border: `1px solid ${C.border}`, color: C.textSecondary, textAlign: 'end', direction: 'ltr', fontSize: '13px', fontFamily: CAIRO }}
                                            onFocus={focusIn} onBlur={focusOut} className="blue-date-icon" />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('المورد / العميل')} <span style={{ color: C.danger }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <CustomSelect
                                                value={form.supplierId || form.customerId}
                                                onChange={v => {
                                                    const p = partners.find(x => x.id === v);
                                                    if (p?.partnerType === 'customer') {
                                                        setForm((f: any) => ({ ...f, customerId: v, supplierId: '', originalInvoiceId: '' }));
                                                    } else {
                                                        setForm((f: any) => ({ ...f, supplierId: v, customerId: '', originalInvoiceId: '' }));
                                                    }
                                                    setLines([]);
                                                    clearError('supplierId');
                                                }}
                                                icon={UserCheck}
                                                placeholder={t("اختر الطرف...")}
                                                options={partners.map(s => ({
                                                    value: s.id,
                                                    label: s.name,
                                                    sub: s.partnerType === 'supplier' ? t('مورد') : t('عميل')
                                                }))}
                                            />
                                            <InlineError field="supplierId" />

                                            {selectedPartner && (
                                                <div style={{
                                                    marginTop: '10px',
                                                    padding: '6px 14px',
                                                    borderRadius: '24px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: (selectedPartner.partnerType === 'customer'
                                                        ? selectedPartner.balance > 0 ? 'rgba(52,211,153,0.08)' : selectedPartner.balance < 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)'
                                                        : selectedPartner.balance > 0 ? 'rgba(239,68,68,0.08)' : selectedPartner.balance < 0 ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)'
                                                    ),
                                                    color: (selectedPartner.partnerType === 'customer'
                                                        ? selectedPartner.balance > 0 ? '#34d399' : selectedPartner.balance < 0 ? '#f87171' : '#475569'
                                                        : selectedPartner.balance > 0 ? '#f87171' : selectedPartner.balance < 0 ? '#34d399' : '#475569'
                                                    ),
                                                    border: `1px solid ${selectedPartner.partnerType === 'customer'
                                                            ? selectedPartner.balance > 0 ? 'rgba(52,211,153,0.2)' : selectedPartner.balance < 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'
                                                            : selectedPartner.balance > 0 ? 'rgba(239,68,68,0.2)' : selectedPartner.balance < 0 ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'
                                                        }`,
                                                }}>
                                                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
                                                    {selectedPartner.partnerType === 'customer'
                                                        ? (selectedPartner.balance > 0 ? `${t('عليه لنا:')} ${Math.abs(selectedPartner.balance).toLocaleString()} ${cSymbol}` : selectedPartner.balance < 0 ? `${t('له عندنا:')} ${Math.abs(selectedPartner.balance).toLocaleString()} ${cSymbol}` : t('رصيده الحالي: صفر'))
                                                        : (selectedPartner.balance > 0 ? `${t('له عندنا:')} ${Math.abs(selectedPartner.balance).toLocaleString()} ${cSymbol}` : selectedPartner.balance < 0 ? `${t('عليه لنا:')} ${Math.abs(selectedPartner.balance).toLocaleString()} ${cSymbol}` : t('رصيده الحالي: صفر'))
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2 */}
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('فاتورة الشراء الأصلية')} <span style={{ color: C.danger }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <CustomSelect
                                                value={form.originalInvoiceId}
                                                onChange={v => { setForm((f: any) => ({ ...f, originalInvoiceId: v })); clearError('originalInvoiceId'); }}
                                                icon={Receipt}
                                                placeholder={(form.supplierId || form.customerId) ? t('اختر الفاتورة...') : t('اختر المورد / العميل أولاً')}
                                                disabled={!form.supplierId && !form.customerId}
                                                options={supplierInvoices.map(i => ({
                                                    value: i.id,
                                                    label: `PUR-${String(i.invoiceNumber).padStart(5, '0')}`,
                                                    sub: `${new Date(i.date).toLocaleDateString('en-GB')} | ${i.total.toLocaleString()} ${cSymbol}`,
                                                }))}
                                            />
                                            <InlineError field="originalInvoiceId" />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('المخزن المستلم')} <span style={{ color: C.danger }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <CustomSelect
                                                value={form.warehouseId}
                                                onChange={v => { setForm((f: any) => ({ ...f, warehouseId: v })); clearError('warehouseId'); }}
                                                icon={Building2}
                                                placeholder={t("اختر المخزن...")}
                                                options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                                            />
                                            <InlineError field="warehouseId" />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('سبب الإرجاع')}</label>
                                        <CustomSelect
                                            value={form.reason}
                                            onChange={v => setForm((f: any) => ({ ...f, reason: v }))}
                                            icon={RotateCcw}
                                            placeholder={t("اختر السبب (اختياري)...")}
                                            options={RETURN_REASONS.map(r => ({ value: r, label: t(r) }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {selectedInvoice && (
                            <div style={{ background: 'rgba(37, 106, 244,0.04)', border: `1px solid ${C.primary}30`, borderRadius: '12px', padding: '16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#256af4', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                    <Info size={16} /> {t('ملخص فاتورة الشراء الأصلية')}
                                </div>
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                                    {[
                                        { label: t('الإجمالي'), value: `${selectedInvoice.total.toLocaleString()} ${cSymbol}`, color: C.textPrimary },
                                        { label: t('الخصم'), value: `${(selectedInvoice.discount || 0).toLocaleString()} ${cSymbol}`, color: C.danger },
                                        { label: t('المدفوع'), value: `${selectedInvoice.paidAmount.toLocaleString()} ${cSymbol}`, color: '#10b981' },
                                        { label: t('المتبقي'), value: `${selectedInvoice.remaining.toLocaleString()} ${cSymbol}`, color: C.textSecondary },
                                    ].map((item, i) => (
                                        <div key={i} style={{ borderRadius: '8px', padding: '10px', border: `1px solid ${C.border}` }}>
                                            <div style={{ fontSize: '10px', color: C.textSecondary, marginBottom: '4px' }}>{item.label}</div>
                                            <div style={{ fontSize: '13px', color: item.color, fontWeight: 700, fontFamily: CAIRO }}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {lines.length > 0 && (
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#256af4', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                        <RotateCcw size={16} /> {t('الأصناف المرتجعة')}
                                    </div>
                                    <div style={{ fontSize: '10px', color: C.textSecondary }}>{lines.length} {t('صنف متاح')}</div>
                                </div>
                                <div className="scroll-table" style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                        <thead>
                                            <tr style={{ background: C.subtle, borderBottom: `1px solid ${C.border}` }}>
                                                <th style={{ padding: '12px', width: '30px', textAlign: 'center' }}>✓</th>
                                                <th style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontSize: '12px', fontWeight: 700, fontFamily: CAIRO }}>{t('اسم الصنف')}</th>
                                                <th style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontSize: '12px', fontWeight: 700, fontFamily: CAIRO }}>{t('الوحدة')}</th>
                                                <th style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontSize: '12px', fontWeight: 700, fontFamily: CAIRO }}>{t('الكمية المشتراة')}</th>
                                                <th style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontSize: '12px', fontWeight: 700, fontFamily: CAIRO }}>{t('سابق الإرجاع')}</th>
                                                <th style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontSize: '12px', fontWeight: 700, fontFamily: CAIRO }}>{t('كمية الإرجاع')}</th>
                                                <th style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontSize: '12px', fontWeight: 700, fontFamily: CAIRO }}>{t('سعر التكلفة')}</th>
                                                <th style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontSize: '12px', fontWeight: 700, fontFamily: CAIRO }}>{t('إجمالي المرتجع')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((l, i) => {
                                                const fullyReturned = l.availableQty === 0;
                                                return (
                                                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, opacity: fullyReturned ? 0.5 : 1, background: l.selected ? `${C.primary}04` : 'transparent', transition: 'background 0.2s' }}
                                                        onMouseEnter={e => !fullyReturned && (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                                        onMouseLeave={e => !fullyReturned && (e.currentTarget.style.background = l.selected ? `${C.primary}04` : 'transparent')}
                                                    >
                                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                                            {!fullyReturned && <input type="checkbox" checked={l.selected} onChange={() => toggleLine(i)} style={{ width: 14, height: 14, cursor: 'pointer', accentColor: C.primary }} />}
                                                        </td>
                                                        <td style={{ padding: '12px' }}>
                                                            <div style={{ fontWeight: 700, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}>{l.itemName}</div>
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontSize: '12px' }}>{l.unit}</td>
                                                        <td style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontFamily: OUTFIT, fontSize: '14px' }}>{l.originalQty}</td>
                                                        <td style={{ padding: '12px', textAlign: 'center', color: C.danger, fontFamily: OUTFIT, fontSize: '14px', fontWeight: 600 }}>{l.alreadyReturned}</td>
                                                        <td style={{ padding: '12px' }}>
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center',
                                                                borderRadius: '8px', border: `1px solid ${l.selected ? C.primary : C.border}`,
                                                                width: '85px', margin: '0 auto', overflow: 'hidden', background: C.inputBg
                                                            }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <input
                                                                        type="number" min="0" max={l.availableQty} value={l.returnQty || ''}
                                                                        disabled={!l.selected || fullyReturned}
                                                                        onChange={e => updateReturnQty(i, parseFloat(e.target.value) || 0)}
                                                                        style={{
                                                                            width: '100%', height: '32px',
                                                                            background: 'transparent', border: 'none',
                                                                            color: l.selected ? C.textPrimary : C.textMuted,
                                                                            fontSize: '13px', fontWeight: 700, padding: 0, textAlign: 'center', fontFamily: OUTFIT
                                                                        }}
                                                                        onFocus={focusIn} onBlur={focusOut}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontFamily: OUTFIT, fontSize: '14px', fontWeight: 600 }}>{formatNumber(l.price)}</td>
                                                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: l.selected ? C.primary : C.textMuted, fontFamily: OUTFIT, fontSize: '15px' }}>{formatNumber(l.returnTotal)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            <label style={{ ...LS, fontSize: '11px' }}>{t('ملاحظات إضافية')}</label>
                            <input
                                type="text" placeholder={t("اكتب أي توضيحات للمرتجع...")}
                                value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                                style={IS} onFocus={focusIn} onBlur={focusOut}
                            />
                        </div>
                    </div>

                    {/* RIGHT Column - Sticky Summary */}
                    <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', minHeight: '400px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#256af4', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${C.border}`, paddingBottom: '12px', fontFamily: CAIRO }}>
                                <Banknote size={16} /> {t('ملخص الحساب')}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', color: C.textSecondary }}>{t('عدد الأصناف المرتجعة')}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: CAIRO }}>{selectedLines.length} {t('صنف')}</span>
                                </div>

                                <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: '14px', marginTop: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '13px', color: C.textSecondary }}>{t('قيمة المرتجع')}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: CAIRO }}>{fMoneyJSX(returnSubtotal)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', color: C.textSecondary }}>{t('خصم مسترد (-)')}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: C.danger, fontFamily: CAIRO }}>{fMoneyJSX(totalDiscountOnReturn)}</span>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'linear-gradient(135deg, rgba(37,106,244,0.12), rgba(37,106,244,0.05))',
                                    padding: '10px 14px', borderRadius: '12px', marginTop: '10px',
                                    border: `1px solid ${C.primaryBorder || C.primary}`,
                                    boxShadow: '0 4px 12px rgba(37,106,244,0.08)',
                                }}>
                                    <span style={{ color: C.textSecondary, fontWeight: 700, fontSize: '13px', fontFamily: CAIRO }}>{t('صافي المرتجع')}</span>
                                    <span style={{ color: C.primary, fontWeight: 700, fontSize: '18px' }}>
                                        {fMoneyJSX(netReturnTotal, '', { fontSize: '18px', fontWeight: 700 })}
                                    </span>
                                </div>

                                <div style={{ marginTop: '10px' }}>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('طريقة الرد')}</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                        {['balance', 'cash', 'bank'].map(m => (
                                            <button
                                                key={m} onClick={() => setForm((f: any) => ({ ...f, refundType: m as any }))}
                                                style={{ height: '36px', borderRadius: '8px', border: `1px solid ${form.refundType === m ? C.primary : C.border}`, background: form.refundType === m ? `${C.primary}15` : 'transparent', color: form.refundType === m ? C.primary : C.textMuted, fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}
                                            >
                                                {m === 'balance' ? t('رصيد') : m === 'cash' ? t('نقدي') : t('بنكي')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {(form.refundType === 'cash' || form.refundType === 'bank') && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                                        <div>
                                            <label style={{ ...LS, fontSize: '11px' }}>{t('المبلغ المستلم')} <span style={{ color: C.danger }}>*</span></label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder="0.00"
                                                    value={fmt(form.paidAmount)}
                                                    onChange={e => {
                                                        const v = e.target.value.replace(/,/g, '');
                                                        if (v === '' || !isNaN(Number(v)) || v === '.') {
                                                            setForm((f: any) => ({ ...f, paidAmount: v }));
                                                            clearError('paidAmount');
                                                        }
                                                    }}
                                                    style={{
                                                        ...IS,
                                                        height: '44px',
                                                        fontSize: '16px', fontWeight: 600,
                                                        border: `1px solid ${C.primary}50`,
                                                        color: (form.paidAmount === '' || form.paidAmount === 0) ? C.textMuted : C.primary,
                                                        background: 'rgba(37, 106, 244,0.03)',
                                                        paddingInlineEnd: '40px',
                                                        fontFamily: CAIRO
                                                    }}
                                                    onFocus={e => { focusIn(e); e.target.select(); }} onBlur={focusOut}
                                                />
                                                <InlineError field="paidAmount" />
                                                {form.refundType === 'cash' ? (
                                                    <Banknote size={20} style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                                                ) : (
                                                    <Building2 size={20} style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <CustomSelect
                                                value={form.refundType === 'cash' ? form.treasuryId : form.bankId}
                                                onChange={v => { setForm((f: any) => ({ ...f, [form.refundType === 'cash' ? 'treasuryId' : 'bankId']: v })); clearError(form.refundType === 'cash' ? 'treasuryId' : 'bankId'); }}
                                                icon={Banknote}
                                                placeholder={form.refundType === 'cash' ? t("اختر الخزينة...") : t("اختر الحساب...")}
                                                options={(form.refundType === 'cash' ? cashTreasuries : bankTreasuries).map(tr => ({ value: tr.id, label: tr.name, sub: `${t('رصيد:')} ${tr.balance.toLocaleString()} ${cSymbol}` }))}
                                            />
                                            <InlineError field={form.refundType === 'cash' ? 'treasuryId' : 'bankId'} />
                                        </div>
                                    </div>
                                )}

                                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button type="button" onClick={() => handleSubmit(false)} disabled={submitting}
                                        style={{
                                            width: '100%', height: '52px', borderRadius: '14px', border: 'none',
                                            background: submitting ? 'rgba(37, 106, 244,0.18)' : C.primary,
                                            color: submitting ? C.textMuted : '#fff', fontWeight: 600, fontSize: '15px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                            cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontFamily: CAIRO,
                                            boxShadow: submitting ? 'none' : '0 8px 16px -4px rgba(37,106,244,0.3)',
                                            opacity: submitting ? 0.6 : 1
                                        }}>
                                        {submitting ? <Loader2 size={20} className="spin" /> : <>{t('ترحيل المرتجع')} <CheckCircle2 size={20} /></>}
                                    </button>

                                    <button type="button" onClick={() => handleSubmit(true)} disabled={submitting}
                                        style={{
                                            width: '100%', height: '48px', borderRadius: '14px',
                                            border: '1px solid rgba(16,185,129,0.4)',
                                            background: 'rgba(16,185,129,0.1)',
                                            color: '#10b981', fontWeight: 700, fontSize: '13px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                            cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontFamily: CAIRO,
                                            opacity: submitting ? 0.6 : 1
                                        }}
                                        onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = 'rgba(16,185,129,0.18)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }}>
                                        {t('ترحيل وطباعة المرتجع')} <Printer size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes spin{to{transform:rotate(360deg)}}
                .spin { animation: spin 1s linear infinite; }
                .blue-date-icon::-webkit-calendar-picker-indicator { cursor: pointer; filter: invert(41%) sepia(34%) saturate(3000%) hue-rotate(190deg) brightness(100%) contrast(100%); border-radius: 4px; padding: 2px; }
            `}</style>
        </DashboardLayout>
    );
}
