'use client';
import { useTranslation } from '@/lib/i18n';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import { RotateCcw, Printer, Lock, Info, Loader2, Search, ChevronDown, ChevronUp, ArrowRight, Banknote, Building2, UserCheck, FileText, Receipt, Package, CheckCircle2 } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut } from '@/constants/theme';
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
            
        </DashboardLayout>
    );
}


