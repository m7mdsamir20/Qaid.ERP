'use client';
import { useTranslation } from '@/lib/i18n';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import {
    RotateCcw, Printer, Lock, Info, Loader2,
    Search, ChevronDown, ChevronUp, ArrowRight, Banknote,
    Building2, UserCheck, FileText, Receipt, Package, CheckCircle2
} from 'lucide-react';
import { THEME, C, CAIRO, INTER, IS, LS, focusIn, focusOut } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useSession } from 'next-auth/react';
import { CompanyInfo } from '@/lib/printInvoices';
import { useCurrency } from '@/hooks/useCurrency';
import { AlertCircle, User, Phone, UserPlus } from 'lucide-react';
import AppModal from '@/components/AppModal';

/* ── Types ── */
interface Customer { id: string; name: string; phone?: string; balance: number; }
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
interface SaleInvoice {
    id: string;
    invoiceNumber: number;
    date: string;
    customer: { id: string; name: string } | null;
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
    'عيب في المنتج', 'منتج تالف', 'خطأ في الطلب',
    'تغيير رأي العميل', 'منتج غير مطابق للمواصفات', 'أخرى',
];

const SERVICE_RETURN_REASONS = [
    'عدم رضا عن الخدمة', 'خطأ في الفوترة', 'إلغاء الحجز / الموعد',
    'تغيير رأي العميل', 'الخدمة غير مطابقة للوصف', 'أخرى',
];

const fmt = (v: any) => {
    if (v === '' || v === undefined || v === null) return '';
    const n = parseFloat(String(v).replace(/,/g, ''));
    if (isNaN(n)) return '';
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};


export default function NewReturnPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { data: session } = useSession();
    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';
    const activeBranchId = (session?.user as any)?.activeBranchId;
    const allBranches: any[] = (session?.user as any)?.branches || [];
    const allowedBranches: string[] | null = (session?.user as any)?.allowedBranches || null;
    const userBranches = allowedBranches?.length ? allBranches.filter(b => allowedBranches.includes(b.id)) : allBranches;
    const isAllBranches = (!activeBranchId || activeBranchId === 'all') && userBranches.length > 1;
    const { symbol: cSymbol } = useCurrency();
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const clearError = (field: string) => {
        if (fieldErrors[field]) setFieldErrors(prev => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [saleInvoices, setSaleInvoices] = useState<SaleInvoice[]>([]);
    const [nextNum, setNextNum] = useState(1);
    const [company, setCompany] = useState<CompanyInfo>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    const [form, setForm] = useState<any>({
        customerId: '',
        warehouseId: '',
        originalInvoiceId: '',
        reason: '',
        refundType: 'balance' as 'balance' | 'cash' | 'bank',
        treasuryId: '',
        bankId: '',
        paidAmount: '', // Amount to actually pay back to customer
        notes: '',
        date: new Date().toISOString().split('T')[0],
        supplierId: '',
    });
    const [lines, setLines] = useState<ReturnLine[]>([]);

    /* ── Computed ── */
    const partners = [
        ...customers.map(c => ({ ...c, partnerType: 'customer' })),
        ...suppliers.map(s => ({ ...s, partnerType: 'supplier' })),
    ];
    const selectedPartner = partners.find(p => p.id === (form.customerId || form.supplierId));
    const selectedInvoice = Array.isArray(saleInvoices) ? saleInvoices.find(i => i.id === form.originalInvoiceId) : null;
    const cashTreasuries = Array.isArray(treasuries) ? treasuries.filter(t => t.type !== 'bank') : [];
    const bankTreasuries = Array.isArray(treasuries) ? treasuries.filter(t => t.type === 'bank') : [];

    const partnerId = form.customerId || form.supplierId;
    const customerInvoices = (partnerId && Array.isArray(saleInvoices))
        ? saleInvoices.filter(i => {
            const matchCustomer = i.customer?.id === form.customerId && form.customerId;
            const matchSupplier = (i as any).supplier?.id === form.supplierId && form.supplierId;
            if (!matchCustomer && !matchSupplier) return false;
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
            const [retRes, custRes, supRes, whRes, trRes, salesRes, coRes] = await Promise.all([
                fetch('/api/sale-returns'), fetch('/api/customers'), fetch('/api/suppliers'),
                fetch('/api/warehouses'), fetch('/api/treasuries'), fetch('/api/sales'), fetch('/api/company'),
            ]);

            const retData = await retRes.json();
            const salesData = await salesRes.json();
            const customersData = await custRes.json();
            const suppliersData = await supRes.json();
            const warehousesData = await whRes.json();
            const treasuriesData = await trRes.json();

            const returnsArray = Array.isArray(retData.returns) ? retData.returns : [];
            const maxNum = returnsArray.reduce((m: number, r: any) => Math.max(m, r.invoiceNumber || 0), 0);
            setNextNum(maxNum + 1);

            setCustomers(Array.isArray(customersData) ? customersData : []);
            setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
            setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
            if (Array.isArray(warehousesData) && warehousesData.length > 0) {
                setForm((f: any) => ({ ...f, warehouseId: warehousesData[0].id }));
            }

            setTreasuries(Array.isArray(treasuriesData) ? treasuriesData : []);
            const firstCash = Array.isArray(treasuriesData) ? treasuriesData.find((t: any) => t.type !== 'bank') : null;
            if (firstCash) setForm((f: any) => ({ ...f, treasuryId: firstCash.id }));
            const firstBank = Array.isArray(treasuriesData) ? treasuriesData.find((t: any) => t.type === 'bank') : null;
            if (firstBank) setForm((f: any) => ({ ...f, bankId: firstBank.id }));

            setSaleInvoices(Array.isArray(salesData.invoices) ? salesData.invoices : []);
            if (coRes.ok) setCompany(await coRes.json());
        } catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { loadData(); }, [loadData]);

    /* ── When invoice selected → build lines with discount logic ── */
    useEffect(() => {
        if (!form.originalInvoiceId) { setLines([]); return; }
        fetch(`/api/sales?id=${form.originalInvoiceId}`)
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
                        itemId: l.item.id,
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



    /* ── Toggle line selection ── */
    const toggleLine = (idx: number) => {
        setLines(prev => prev.map((l, i) => i === idx ? { ...l, selected: !l.selected } : l));
    };

    /* ── Update return qty ── */
    const updateReturnQty = (idx: number, val: number) => {
        setLines(prev => prev.map((l, i) => {
            if (i !== idx) return l;
            const qty = Math.min(Math.max(0, val), l.availableQty);
            return { ...l, returnQty: qty, returnTotal: qty * l.price, selected: qty > 0 };
        }));
    };

    /* ── Submit ── */
    const handleSubmit = async (andPrint = false) => {
        setFieldErrors({});
        const errors: Record<string, string> = {};

        if (!form.customerId && !form.supplierId) errors.customerId = t('يرجى اختيار الطرف');
        if (!isServices && !form.warehouseId) errors.warehouseId = t('يرجى اختيار المخزن');
        if (!form.originalInvoiceId) errors.originalInvoiceId = t('يرجى اختيار الفاتورة');

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        if (selectedLines.length === 0) {
            alert(isServices ? t('يرجى تحديد خدمة واحدة على الأقل للإلغاء') : t('يرجى تحديد صنف واحد على الأقل للإرجاع')); return;
        }
        if (form.refundType === 'cash') {
            if (!form.treasuryId) { setFieldErrors({ treasuryId: t('يرجى اختيار الخزينة') }); return; }
            if (form.paidAmount <= 0) { setFieldErrors({ paidAmount: t('أدخل المبلغ') }); return; }
            if (form.paidAmount > netReturnTotal) {
                alert(`${t('المبلغ المردود')} (${form.paidAmount}) ${t('أكبر من')} ${t('صافي المرتجع')} (${netReturnTotal.toFixed(2)})`);
                return;
            }
        }
        if (form.refundType === 'bank') {
            if (!form.bankId) { setFieldErrors({ bankId: 'يرجى اختيار الحساب' }); return; }
            if (form.paidAmount <= 0) { setFieldErrors({ paidAmount: 'أدخل المبلغ' }); return; }
            if (form.paidAmount > netReturnTotal) {
                alert(`المبلغ المحول (${form.paidAmount}) أكبر من صافي المرتجع (${netReturnTotal.toFixed(2)})`);
                return;
            }
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/sale-returns', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: form.date,
                    customerId: form.customerId || undefined,
                    supplierId: form.supplierId || undefined,
                    warehouseId: form.warehouseId,
                    originalInvoiceId: form.originalInvoiceId,
                    reason: form.reason || undefined,
                    refundMethod: form.refundType,
                    treasuryId: form.refundType === 'cash' ? form.treasuryId : undefined,
                    bankId: form.refundType === 'bank' ? form.bankId : undefined,
                    paidAmount: form.refundType === 'balance' ? 0 : Number(form.paidAmount || 0), // Ensure number
                    notes: form.notes,
                    totalDiscount: totalDiscountOnReturn,
                    netTotal: netReturnTotal,
                    lines: selectedLines.map(l => ({
                        itemId: l.itemId,
                        quantity: l.returnQty,
                        price: l.price,
                        discount: l.discountOnLine * (l.returnQty / l.originalQty),
                        netPrice: l.netPrice,
                    })),
                }),
            });
            if (res.ok) {
                const saved = await res.json();
                if (andPrint) {
                    window.open(`/print/invoice/${saved.id}`, '_blank');
                }
                router.push('/sale-returns');
            } else { const err = await res.json(); alert(err.error || t('فشل في الحفظ')); }
        } catch (err: any) { alert(err.message || t('فشل الاتصال')); }
        finally { setSubmitting(false); }
    };

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#475569', flexDirection: 'column', gap: '12px' }}>
                <Loader2 size={36} className="spin" />
                <span style={{ fontSize: '14px' }}>{t('جاري التحميل...')}</span>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin 1s linear infinite;}`}</style>
        </DashboardLayout>
    );

    const InlineError = ({ field }: { field: string }) => {
        if (!fieldErrors[field]) return null;
        return (
            <div style={{
                position: 'absolute', top: '-32px', insetInlineStart: '4px', fontSize: '11px', color: '#fff', fontWeight: 800,
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
                    title={isServices ? t("إلغاء خدمات / مرتجع جديد") : t("مرتجع مبيعات جديد")}
                    subtitle={isServices ? t("إلغاء خدمة وإصدار إشعار دائن للعميل — تسوية مبالغ خدمات سابقة") : t("إنشاء فاتورة مرتجع مبيعات جديدة لعميل")}
                    icon={RotateCcw}
                    backUrl="/sale-returns"
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
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fbbf24', marginBottom: '2px' }}>
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

                        {/* Card: بيانات المرتجع */}
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#3b82f6', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                <FileText size={16} /> {t('بيانات المرتجع الأساسية')}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                                {/* Row 1 */}
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '110px 140px 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('رقم المرتجع')}</label>
                                        <div style={{
                                            height: '42px', borderRadius: '10px',
                                            background: 'rgba(59,130,246,0.08)',
                                            border: `1px solid ${C.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontFamily: INTER, fontWeight: 900,
                                            fontSize: '14px', color: '#60a5fa',
                                            letterSpacing: '1px',
                                        }}>
                                            RET-{String(nextNum).padStart(5, '0')}
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
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('العميل / المورد')} <span style={{ color: C.danger }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <CustomSelect
                                                value={form.customerId || form.supplierId}
                                                onChange={v => {
                                                    const p = partners.find(x => x.id === v);
                                                    if (p?.partnerType === 'supplier') {
                                                        setForm((f: any) => ({ ...f, supplierId: v, customerId: '', originalInvoiceId: '' }));
                                                    } else {
                                                        setForm((f: any) => ({ ...f, customerId: v, supplierId: '', originalInvoiceId: '' }));
                                                    }
                                                    setLines([]);
                                                    clearError('customerId');
                                                }}
                                                icon={UserCheck}
                                                placeholder={t("اختر الطرف...")}
                                                options={partners.map(c => ({
                                                    value: c.id,
                                                    label: c.name,
                                                    sub: c.partnerType === 'customer' ? t('عميل') : t('مورد')
                                                }))}
                                            />
                                            <InlineError field="customerId" />

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
                                                    background: (selectedPartner?.partnerType === 'supplier'
                                                        ? selectedPartner.balance > 0 ? 'rgba(239,68,68,0.08)' : selectedPartner.balance < 0 ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)'
                                                        : selectedPartner.balance < 0 ? 'rgba(239,68,68,0.08)' : selectedPartner.balance > 0 ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)'
                                                    ),
                                                    color: (selectedPartner?.partnerType === 'supplier'
                                                        ? selectedPartner.balance > 0 ? '#f87171' : selectedPartner.balance < 0 ? '#34d399' : '#475569'
                                                        : selectedPartner.balance < 0 ? '#f87171' : selectedPartner.balance > 0 ? '#34d399' : '#475569'
                                                    ),
                                                    border: `1px solid ${selectedPartner?.partnerType === 'supplier'
                                                            ? selectedPartner.balance > 0 ? 'rgba(239,68,68,0.2)' : selectedPartner.balance < 0 ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'
                                                            : selectedPartner.balance < 0 ? 'rgba(239,68,68,0.2)' : selectedPartner.balance > 0 ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'
                                                        }`,
                                                }}>
                                                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
                                                    {selectedPartner?.partnerType === 'supplier'
                                                        ? (selectedPartner.balance > 0 ? `${t('له عندنا:')} ${Math.abs(selectedPartner.balance).toLocaleString()} ${cSymbol}` : selectedPartner.balance < 0 ? `${t('عليه لنا:')} ${Math.abs(selectedPartner.balance).toLocaleString()} ${cSymbol}` : t('رصيده الحالي: صفر'))
                                                        : (selectedPartner.balance < 0 ? `${t('له عندنا:')} ${Math.abs(selectedPartner.balance).toLocaleString()} ${cSymbol}` : selectedPartner.balance > 0 ? `${t('عليه لنا:')} ${Math.abs(selectedPartner.balance).toLocaleString()} ${cSymbol}` : t('رصيده الحالي: صفر'))
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2 */}
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('فاتورة البيع الأصلية')} <span style={{ color: C.danger }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <CustomSelect
                                                value={form.originalInvoiceId}
                                                onChange={v => { setForm((f: any) => ({ ...f, originalInvoiceId: v })); clearError('originalInvoiceId'); }}
                                                icon={Receipt}
                                                placeholder={(partnerId && Array.isArray(saleInvoices)) ? t('اختر الفاتورة...') : t('اختر الشريك أولاً')}
                                                disabled={!form.customerId && !form.supplierId}
                                                options={customerInvoices.map(i => ({
                                                    value: i.id,
                                                    label: `SAL-${String(i.invoiceNumber).padStart(5, '0')}`,
                                                    sub: `${new Date(i.date).toLocaleDateString('en-GB')} | ${i.total.toLocaleString()} ${cSymbol}`,
                                                }))}
                                            />
                                            <InlineError field="originalInvoiceId" />
                                        </div>
                                    </div>
                                    <div style={{ display: isServices ? 'none' : 'block' }}>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('المخزن المرتجع إليه')} <span style={{ color: C.danger }}>*</span></label>
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
                                        <label style={{ ...LS, fontSize: '11px' }}>{isServices ? t("سبب الإلغاء") : t("سبب المرتجع")}</label>
                                        <CustomSelect
                                            value={form.reason}
                                            onChange={v => setForm((f: any) => ({ ...f, reason: v }))}
                                            icon={RotateCcw}
                                            placeholder={t("اختر السبب (اختياري)...")}
                                            options={(isServices ? SERVICE_RETURN_REASONS : RETURN_REASONS).map(r => ({ value: r, label: t(r) }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Invoice Summary Banner ── */}
                        {selectedInvoice && (
                            <div style={{ background: 'rgba(59,130,246,0.04)', border: `1px solid ${C.primary}30`, borderRadius: '12px', padding: '16px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#3b82f6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                    <Info size={16} /> {t('ملخص الفاتورة الأساسية')}
                                </div>
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
                                    {[
                                        { label: 'الإجمالي', value: selectedInvoice.total.toLocaleString(), color: C.textPrimary },
                                        { label: 'الخصم', value: (selectedInvoice.discount || 0).toLocaleString(), color: C.danger },
                                        { label: 'المدفوع', value: selectedInvoice.paidAmount.toLocaleString(), color: '#10b981' },
                                        { label: 'المتبقي', value: selectedInvoice.remaining.toLocaleString(), color: C.textMuted },
                                    ].map((item, i) => (
                                        <div key={i} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '10px', textAlign: 'center', border: `1px solid ${C.border}` }}>
                                            <div style={{ fontSize: '10px', color: C.textMuted, marginBottom: '4px' }}>{item.label}</div>
                                            <div style={{ fontSize: '13px', color: item.color, fontWeight: 700, fontFamily: CAIRO }}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Lines Table ── */}
                        {lines.length > 0 && (
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                        <RotateCcw size={16} /> {isServices ? t("الخدمات الملغاة") : t("الأصناف المرتجعة")}
                                    </div>
                                    <div style={{ fontSize: '10px', color: C.textMuted }}>{lines.length} {t('صنف متاح')}</div>
                                </div>
                                <div className="scroll-table" style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '11px' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                                <th style={{ padding: '10px', width: '30px' }}>✓</th>
                                                <th style={{ padding: '10px',  color: C.textMuted, fontSize: '10px' }}>{isServices ? t('اسم الخدمة') : t('اسم الصنف')}</th>
                                                <th style={{ padding: '10px', color: C.textMuted, fontSize: '10px' }}>{isServices ? t('الوصف') : t('الوحدة')}</th>
                                                <th style={{ padding: '10px', color: C.textMuted, fontSize: '10px' }}>{isServices ? t('الكمية') : t('الكمية المباعة')}</th>
                                                <th style={{ padding: '10px', color: C.textMuted, fontSize: '10px' }}>{isServices ? t('سابق الإلغاء') : t('سابق الإرجاع')}</th>
                                                <th style={{ padding: '10px', color: C.textMuted, fontSize: '10px' }}>{isServices ? t('كمية الإلغاء') : t('كمية الارتجاع')}</th>
                                                <th style={{ padding: '10px', color: C.textMuted, fontSize: '10px' }}>{isServices ? t('سعر الخدمة') : t('سعر البيع')}</th>
                                                <th style={{ padding: '10px', color: C.textMuted, fontSize: '10px' }}>{isServices ? t('إجمالي الملغي') : t('إجمالي المرتجع')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((l, i) => {
                                                const discountThisReturn = l.selected ? l.discountOnLine * (l.returnQty / l.originalQty) : 0;
                                                const netReturn = l.selected ? l.returnTotal - discountThisReturn : 0;
                                                const fullyReturned = l.availableQty === 0;
                                                return (
                                                    <tr key={i} style={{ borderBottom: i < lines.length - 1 ? `1px solid ${C.border}` : 'none', opacity: fullyReturned ? 0.5 : 1, background: l.selected ? `${C.primary}04` : 'transparent' }}>
                                                        <td style={{ padding: '8px 10px' }}>
                                                            {!fullyReturned && <input type="checkbox" checked={l.selected} onChange={() => toggleLine(i)} style={{ width: 14, height: 14, cursor: 'pointer', accentColor: C.primary }} />}
                                                        </td>
                                                        <td style={{ padding: '8px 10px', }}>
                                                            <div style={{ fontWeight: 600, color: C.textPrimary }}>{l.itemName}</div>
                                                        </td>
                                                        <td style={{ padding: '8px 10px', color: C.textSecondary }}>{l.unit}</td>
                                                        <td style={{ padding: '8px 10px', color: C.textSecondary }}>{l.originalQty}</td>
                                                        <td style={{ padding: '8px 10px', color: C.danger }}>{l.alreadyReturned}</td>
                                                        <td style={{ padding: '8px 10px' }}>
                                                            <div style={{
                                                                display: 'flex', alignItems: 'center',
                                                                background: 'rgba(255,255,255,0.05)',
                                                                borderRadius: '8px', border: `1px solid ${l.selected ? C.primary : C.border}`,
                                                                width: '85px', margin: '0 auto', overflow: 'hidden'
                                                            }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <input
                                                                        type="number" min="0" max={l.availableQty} value={l.returnQty || ''}
                                                                        disabled={!l.selected || fullyReturned}
                                                                        onChange={e => updateReturnQty(i, parseFloat(e.target.value) || 0)}
                                                                        style={{
                                                                            width: '100%', height: '32px', textAlign: 'center',
                                                                            background: 'transparent', border: 'none',
                                                                            color: l.selected ? C.textPrimary : C.textMuted,
                                                                            fontSize: '13px', fontWeight: 800, padding: 0
                                                                        }}
                                                                        onFocus={focusIn} onBlur={focusOut}
                                                                    />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
                                                                    <button
                                                                        type="button" disabled={!l.selected || l.returnQty >= l.availableQty}
                                                                        onClick={() => updateReturnQty(i, (l.returnQty || 0) + 1)}
                                                                        style={{ width: '24px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', color: C.textSecondary }}
                                                                    >
                                                                        <ChevronUp size={12} />
                                                                    </button>
                                                                    <button
                                                                        type="button" disabled={!l.selected || (l.returnQty || 0) <= 0}
                                                                        onClick={() => updateReturnQty(i, (l.returnQty || 0) - 1)}
                                                                        style={{ width: '24px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderTop: `1px solid ${C.border}`, cursor: 'pointer', color: C.textSecondary }}
                                                                    >
                                                                        <ChevronDown size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '8px 10px', color: C.textSecondary, fontFamily: CAIRO }}>{l.netPrice.toLocaleString()}</td>
                                                        <td style={{ padding: '8px 10px', fontWeight: 700, color: netReturn > 0 ? '#10b981' : C.textMuted, fontFamily: CAIRO }}>{netReturn.toLocaleString()}</td>
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
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#3b82f6', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${C.border}`, paddingBottom: '12px', fontFamily: CAIRO }}>
                                <Banknote size={16} /> {t('ملخص الحساب')}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: C.textMuted }}>{isServices ? t("عدد الخدمات الملغاة") : t("عدد الأصناف المرتجعة")}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: CAIRO }}>{selectedLines.length} {isServices ? t("خدمة") : t("صنف")}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: C.textMuted }}>{isServices ? t("إجمالي الكمية") : t("إجمالي كمية المرتجع")}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: CAIRO }}>{selectedLines.reduce((acc, l) => acc + l.returnQty, 0)} {isServices ? "" : t("وحدة")}</span>
                                </div>

                                <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: '14px', marginTop: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '13px', color: C.textMuted }}>{isServices ? t("قيمة الملغي") : t("قيمة المرتجع")}</span>
                                        <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: CAIRO }}>{returnSubtotal.toLocaleString()} {cSymbol}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', color: C.textMuted }}>{t('خصم مسترد (-)')}</span>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: C.danger, fontFamily: CAIRO }}>{totalDiscountOnReturn.toLocaleString()} {cSymbol}</span>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    marginTop: '10px', padding: '14px',
                                    background: 'rgba(59,130,246,0.05)', borderRadius: '12px',
                                    border: `1px solid ${C.primary}20`
                                }}>
                                    <span style={{ fontSize: '13px', fontWeight: 800, color: C.primary }}>{isServices ? t("صافي الرصيد المسترد") : t("صافي المرتجع")}</span>
                                    <span style={{ fontSize: '20px', fontWeight: 900, color: C.primary, fontFamily: CAIRO }}>{netReturnTotal.toLocaleString()} {cSymbol}</span>
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
                                            <label style={{ ...LS, fontSize: '11px' }}>{t('المبلغ المردود')} <span style={{ color: C.danger }}>*</span></label>
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
                                                        fontSize: '18px',
                                                        fontWeight: 800,
                                                        textAlign: 'center',
                                                        border: `1px solid ${C.primary}50`,
                                                        color: (form.paidAmount === '' || form.paidAmount === 0) ? C.textMuted : C.primary,
                                                        background: 'rgba(59,130,246,0.03)',
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
                                            background: submitting ? 'rgba(59,130,246,0.18)' : C.primary, 
                                            color: submitting ? C.textMuted : '#fff', fontWeight: 800, fontSize: '15px',
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
                                            color: '#10b981', fontWeight: 700, fontSize: '14px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                            cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontFamily: CAIRO,
                                            opacity: submitting ? 0.6 : 1
                                        }}
                                        onMouseEnter={e => { if(!submitting) e.currentTarget.style.background = 'rgba(16,185,129,0.18)'; }}
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
                input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: invert(0.5) sepia(1) saturate(5) hue-rotate(200deg);
                    cursor: pointer;
                    opacity: 0.8;
                }
            `}</style>
        </DashboardLayout>
    );
}


