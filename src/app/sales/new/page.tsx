'use client';
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Receipt, Plus, Trash2, Package, Printer, Info, Loader2, Search, X, ArrowRight, Pencil, Banknote, Building2, Camera, CheckCircle, AlertCircle, ShoppingCart, User, Phone, UserPlus } from 'lucide-react';
import { CompanyInfo } from '@/lib/printInvoices';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import PriceInput from '@/components/PriceInput';
import { useCurrency } from '@/hooks/useCurrency';
import { getCurrencySymbol, formatNumber } from '@/lib/currency';

interface Customer { id: string; name: string; phone?: string; balance: number; partnerType?: string; }
interface Warehouse { id: string; name: string; }
interface Treasury { id: string; name: string; type: string; balance: number; }
interface Item { id: string; code: string; name: string; sellPrice: number; description?: string; unit: any; stocks?: any[]; }
interface InvoiceLine { itemId: string; itemCode: string; itemName: string; unit: string; quantity: number; price: number; total: number; stock: number; description?: string; taxRate?: number; taxAmount?: number; }

// Using global theme constants instead of local variables

const getUnitName = (u: any) => !u ? '' : typeof u === 'string' ? u : (u.name || u.nameEn || '');




function NewSalePageInner() {
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
    const { symbol: cSymbol, fMoney, fMoneyJSX } = useCurrency();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [company, setCompany] = useState<CompanyInfo>({});
    const [nextNum, setNextNum] = useState(1);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showAddCust, setShowAddCust] = useState(false);
    const searchParams = useSearchParams();
    const quotationId = searchParams.get('quotationId');
    const [fromQuotation, setFromQuotation] = useState<any>(null);


    const itemSelectRef = useRef<any>(null);
    const qtyRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);
    const [entryItemId, setEntryItemId] = useState('');
    const [entryDescription, setEntryDescription] = useState('');
    const [entryQty, setEntryQty] = useState<number | ''>(1);
    const [entryPrice, setEntryPrice] = useState<number | ''>(0);
    const [entryTaxRate, setEntryTaxRate] = useState<number | ''>(0);
    const [entryStock, setEntryStock] = useState<number | null>(null);

    const [lines, setLines] = useState<InvoiceLine[]>([]);
    const [attachments, setAttachments] = useState<{ name: string; type: string; data: string }[]>([]);
    const [taxSettings, setTaxSettings] = useState<any>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const clearError = (field: string) => {
        if (fieldErrors[field]) setFieldErrors(prev => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const [form, setForm] = useState<any>({
        customerId: '', warehouseId: '', discountPct: 0, discountAmt: 0,
        paidAmount: '', paymentType: 'cash' as 'cash' | 'bank' | 'credit',
        treasuryId: '', bankId: '', notes: '',
        date: new Date().toISOString().split('T')[0],
        taxRate: 0,
        taxAmount: 0,
    });

    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const afterDisc = Math.max(0, subtotal - (form.discountAmt || 0));

    // Automatically update taxAmount when afterDisc or taxRate changes
    useEffect(() => {
        if (taxSettings?.enabled) {
            let amt = 0;
            if (taxSettings.isInclusive) {
                amt = afterDisc - (afterDisc / (1 + form.taxRate / 100));
            } else {
                amt = afterDisc * (form.taxRate / 100);
            }
            setForm((f: any) => ({ ...f, taxAmount: amt }));
        } else {
            setForm((f: any) => ({ ...f, taxAmount: 0 }));
        }
    }, [afterDisc, form.taxRate, taxSettings?.enabled, taxSettings?.isInclusive]);

    const netTotal = afterDisc + (taxSettings?.isInclusive ? 0 : form.taxAmount);
    const diff = netTotal - (form.paidAmount || 0);
    const remaining = Math.max(0, diff);
    const overpaid = Math.max(0, (form.paidAmount || 0) - netTotal);

    const partners = Array.isArray(customers) ? customers.map(c => ({ ...c, partnerType: 'customer' })) : [];
    const selectedPartner = partners.find(p => p.id === form.customerId);

    const loadData = useCallback(async () => {
        try {
            const [invR, custR, whR, trR, itemR, coR] = await Promise.all([
                fetch('/api/sales?justNextNum=true'), fetch('/api/customers'),
                fetch('/api/warehouses'), fetch('/api/treasuries'), fetch('/api/items?all=true'),
                fetch('/api/company'),
            ]);
            const nextNumData = await invR.json();
            setNextNum(nextNumData.nextNum || 1);

            const cusData = await custR.json();
            const cus = Array.isArray(cusData) ? cusData : [];

            const whsData = await whR.json();
            const whs = Array.isArray(whsData) ? whsData : [];

            const trsData = await trR.json();
            const trs = Array.isArray(trsData) ? trsData : [];

            const itsData = await itemR.json();
            const its = Array.isArray(itsData) ? itsData : (itsData.items || []);

            setCustomers(cus);
            setWarehouses(whs); setTreasuries(trs);
            setItems(its);
            if (coR.ok) setCompany(await coR.json());

            const taxRes = await fetch('/api/settings');
            if (taxRes.ok) {
                const taxData = await taxRes.json();
                if (taxData.company?.taxSettings) {
                    const ts = typeof taxData.company.taxSettings === 'string' ? JSON.parse(taxData.company.taxSettings) : taxData.company.taxSettings;
                    setTaxSettings(ts);
                    if (ts.enabled) {
                        setForm((f: any) => ({ ...f, taxRate: ts.rate }));
                    }
                }
            }

            // Set Defaults
            const lastWh = localStorage.getItem('last_warehouse_id');
            const defaultWh = (lastWh && whs.some((w: any) => w.id === lastWh)) ? lastWh : (whs.length > 0 ? whs[0].id : '');
            if (defaultWh) setForm((f: any) => ({ ...f, warehouseId: defaultWh }));

            const firstCash = trs.find((t: any) => t.type !== 'bank');
            if (firstCash) setForm((f: any) => ({ ...f, treasuryId: firstCash.id }));

            const firstBank = trs.find((t: any) => t.type === 'bank');
            if (firstBank) setForm((f: any) => ({ ...f, bankId: firstBank.id }));

        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Prefill from quotation if quotationId param is present
    useEffect(() => {
        if (!quotationId || loading) return;
        fetch(`/api/quotations?id=${quotationId}`)
            .then(r => r.ok ? r.json() : null)
            .then(quo => {
                if (!quo) return;
                setFromQuotation(quo);
                // Set customer
                if (quo.customerId) {
                    setForm((f: any) => ({ ...f, customerId: quo.customerId }));
                }
                // Set discount
                setForm((f: any) => ({
                    ...f,
                    customerId: quo.customerId || f.customerId,
                    discountPct: quo.discountPct || 0,
                    discountAmt: quo.discountAmt || 0,
                    taxRate: quo.taxRate || f.taxRate,
                    notes: quo.notes || '',
                    date: quo.date ? quo.date.split('T')[0] : f.date,
                }));
                // Set lines from quotation
                if (quo.lines?.length) {
                    setLines(quo.lines.map((l: any) => ({
                        itemId: l.itemId,
                        itemCode: l.itemCode || '',
                        itemName: l.itemName,
                        unit: l.unit || '',
                        quantity: l.quantity,
                        price: l.price,
                        total: l.total,
                        stock: 99999,
                        description: l.description || '',
                        taxRate: l.taxRate || 0,
                        taxAmount: l.taxAmount || 0,
                    })));
                }
            })
            .catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quotationId, loading]);

    useEffect(() => {
        if (!entryItemId || !form.warehouseId) { setEntryStock(null); return; }
        const item = items.find(i => i.id === entryItemId);
        if (item) {
            const stock = item.stocks?.find((s: any) => s.warehouseId === form.warehouseId)?.quantity || 0;
            setEntryStock(stock);
        } else {
            setEntryStock(null);
        }
    }, [entryItemId, form.warehouseId, items]);

    useEffect(() => {
        if (entryItemId) {
            const item = items.find(i => i.id === entryItemId);
            if (item) {
                setEntryPrice(isServices ? 0 : item.sellPrice);
                setTimeout(() => {
                    if (qtyRef.current) {
                        qtyRef.current.focus();
                        qtyRef.current.select();
                    }
                }, 50);
            }
        }
    }, [entryItemId, items, isServices]);

    const addLine = useCallback(() => {
        setFieldErrors({});
        const errors: Record<string, string> = {};

        if (!isServices && !form.warehouseId) errors.warehouseId = t('يرجى اختيار المخزن أولاً');
        if (!form.customerId) errors.customerId = t('يرجى اختيار العميل أولاً');
        if (!entryItemId) errors.entryItemId = t('يرجى اختيار الخدمة');
        if (entryQty === '' || Number(entryQty) <= 0) errors.entryQty = t('الكمية؟');
        if (entryPrice === '' || Number(entryPrice) < 0) errors.entryPrice = t('السعر؟');

        if (Object.keys(errors).length > 0) {
            setFieldErrors(prev => ({ ...prev, ...errors }));
            return;
        }

        const item = items.find(i => i.id === entryItemId);
        if (!item) return;

        // ✅ تخطي فحص المخزون في حالة نشاط الخدمات
        const stock = isServices ? 999999 : (item.stocks?.find((s: any) => s.warehouseId === form.warehouseId)?.quantity || 0);
        const qty = Number(entryQty);

        if (!isServices) {
            if (stock <= 0) {
                setFieldErrors(prev => ({ ...prev, entryItemId: t('ليس لديك رصيد من هذا الصنف') }));
                return;
            }
            if (qty > stock) {
                setFieldErrors(prev => ({ ...prev, entryQty: `${t('المتاح')}: ${stock}` }));
                return;
            }
        }

        const price = Number(entryPrice);
        const taxRate = Number(entryTaxRate) || 0;
        const taxAmountValue = (qty * price) * (taxRate / 100);

        setLines(prev => {
            const idx = prev.findIndex(l => l.itemId === entryItemId);
            if (idx >= 0) {
                const updated = [...prev];
                const newQty = updated[idx].quantity + qty;
                if (!isServices && newQty > stock) {
                    setFieldErrors(prevE => ({ ...prevE, entryQty: `${t('تجاوز المتاح')} (${stock})` }));
                    return prev;
                }
                const newTaxAmt = (newQty * price) * (taxRate / 100);
                updated[idx] = {
                    ...updated[idx],
                    quantity: newQty,
                    price: price,
                    taxRate: taxRate,
                    taxAmount: newTaxAmt,
                    total: (newQty * price) + newTaxAmt
                };
                return updated;
            }

            return [...prev, {
                itemId: item.id,
                itemCode: item.code,
                itemName: item.name,
                unit: getUnitName(item.unit),
                quantity: qty,
                price,
                total: (qty * price) + taxAmountValue,
                stock,
                description: entryDescription,
                taxRate: taxRate,
                taxAmount: taxAmountValue
            }];
        });

        setEntryItemId('');
        setEntryDescription('');
        setEntryQty(1);
        setEntryPrice(0);
        setEntryTaxRate(0);
        setEntryStock(null);
        setTimeout(() => itemSelectRef.current?.focus(), 50);
    }, [entryItemId, entryQty, entryPrice, entryDescription, items, form.warehouseId, form.customerId, isServices]);

    const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));
    const editLine = (i: number) => {
        const l = lines[i];
        setEntryItemId(l.itemId);
        setEntryQty(l.quantity);
        setEntryPrice(l.price);
        setEntryDescription(l.description || '');
        setEntryTaxRate(l.taxRate || 0);
        removeLine(i); setTimeout(() => qtyRef.current?.focus(), 50);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const newFiles = await Promise.all(Array.from(files).map(file => {
            return new Promise<{ name: string; type: string; data: string }>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({ name: file.name, type: file.type, data: reader.result as string });
                reader.readAsDataURL(file);
            });
        }));
        setAttachments(prev => [...prev, ...newFiles]);
    };

    const handleSubmit = async (andPrint = false) => {
        const isServicesBusiness = isServices; // use component-level var (already .toUpperCase())
        setErrorMsg('');
        setFieldErrors({});
        const errors: Record<string, string> = {};

        if (!form.customerId) errors.customerId = t('يرجى اختيار العميل أولاً');
        if (!isServicesBusiness && !form.warehouseId) errors.warehouseId = t('يرجى اختيار المخزن أولاً');

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setErrorMsg(t('يرجى استكمال البيانات المطلوبة'));
            return;
        }

        if (lines.length === 0) {
            setErrorMsg(t('يرجى إضافة صنف واحد على الأقل للفاتورة'));
            return;
        }

        // Final Stock Validation
        if (!isServicesBusiness) {
            for (const line of lines) {
                const item = items.find(i => i.id === line.itemId);
                const available = item?.stocks?.find((s: any) => s.warehouseId === form.warehouseId)?.quantity || 0;
                if (line.quantity > available) {
                    setErrorMsg(`${t('خطأ: الصنف')} (${line.itemName}) ${t('لم يعد متوفراً بالكمية المطلوبة. المتاح:')} ${available}`);
                    return;
                }
            }
        }

        if (form.paymentType !== 'credit' && (form.paidAmount === '' || Number(form.paidAmount) <= 0)) {
            setFieldErrors(prev => ({ ...prev, paidAmount: t('أدخل المبلغ') }));
            setErrorMsg(t('يرجى إدخال المبلغ المدفوع أو تغيير طريقة الدفع إلى آجل'));
            return;
        }

        if (form.paymentType === 'cash' && Number(form.paidAmount || 0) > 0 && !form.treasuryId) {
            setFieldErrors(prev => ({ ...prev, treasuryId: t('اختر الخزينة...') }));
            setErrorMsg(t('يرجى اختيار الخزينة المستلمة للمبلغ'));
            return;
        }
        if (form.paymentType === 'bank' && Number(form.paidAmount || 0) > 0 && !form.bankId) {
            setFieldErrors(prev => ({ ...prev, bankId: t('اختر البنك...') }));
            setErrorMsg(t('يرجى اختيار الحساب البنكي المستلم للمبلغ'));
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/sales', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: form.date,
                    warehouseId: form.warehouseId,
                    customerId: form.customerId,
                    discount: Number(form.discountAmt || 0),
                    paidAmount: Number(form.paidAmount || 0),
                    paymentType: form.paymentType,
                    treasuryId: form.paymentType === 'cash' ? form.treasuryId : undefined,
                    bankId: form.paymentType === 'bank' ? form.bankId : undefined,
                    notes: form.notes, attachments,
                    taxRate: Number(form.taxRate || 0),
                    taxAmount: Number(form.taxAmount || 0),
                    taxInclusive: taxSettings?.isInclusive || false,
                    lines: lines.map(l => ({ itemId: l.itemId, quantity: Number(l.quantity), price: Number(l.price), description: l.description })),
                }),
            });
            if (res.ok) {
                const savedInvoice = await res.json();

                // If converting from a quotation, mark it as converted
                if (quotationId) {
                    await fetch('/api/quotations/convert', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ quotationId, invoiceId: savedInvoice.id }),
                    }).catch(() => { });
                }

                if (andPrint) {
                    window.open(`/print/invoice/${savedInvoice.id}`, '_blank');
                }
                router.push('/sales');
            } else {
                const data = await res.json();
                setErrorMsg(data.error || t('فشل الحفظ'));
            }
        } catch { alert(t('خطأ في الاتصال')); } finally { setSubmitting(false); }
    };

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        </DashboardLayout>
    );

    /* ── Section card style ── */
    const SC: React.CSSProperties = {
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    };
    const STitle: React.CSSProperties = {
        fontSize: '13px', fontWeight: 600,
        color: C.primary,
        marginBottom: '16px',
        display: 'flex', alignItems: 'center', gap: '8px',
        fontFamily: CAIRO
    };

    const InlineError = ({ field }: { field: string }) => {
        if (!fieldErrors[field]) return null;
        return (
            <div style={{
                position: 'absolute',
                top: '-32px', // أعلى قليلاً لتجنب التداخل مع العناوين
                insetInlineStart: '4px',  // من جهة اليسار بدلاً من اليمين لتجنب التصادم مع "الصنف" وغيرها
                fontSize: '11px',
                color: '#fff',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                padding: '4px 10px',
                borderRadius: '8px',
                pointerEvents: 'none',
                zIndex: 100,
                boxShadow: '0 10px 15px -3px rgba(185, 28, 28, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                animation: 'inlineErrorPush 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                <AlertCircle size={12} strokeWidth={3} />
                {fieldErrors[field]}
                {/* سهم صغير أسفل الفقاعة */}
                <div style={{
                    position: 'absolute',
                    bottom: '-4px',
                    insetInlineStart: '12px',
                    width: '8px',
                    height: '8px',
                    background: '#b91c1c',
                    transform: 'rotate(45deg)',
                    borderRadius: '1px'
                }} />
            </div>
        );
    };

    // Permission guard: block access if user lacks create permission
    const userPerms = (session?.user as any)?.permissions || {};
    const userRole = (session?.user as any)?.role;
    const isSuperAdminUser = (session?.user as any)?.isSuperAdmin;
    const hasGranularPerms = Object.keys(userPerms).length > 0;
    const salesPerms = userPerms['/sales'] || {};
    const canCreate = isSuperAdminUser || userRole === 'admin' || !hasGranularPerms || !!salesPerms.create;

    if (!canCreate) {
        return (
            <DashboardLayout>
                <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px', fontFamily: CAIRO }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.danger }}>
                        <AlertCircle size={40} />
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: C.textPrimary, margin: 0 }}>{t('ليس لديك صلاحية')}</h2>
                    <p style={{ fontSize: '13px', color: C.textSecondary, margin: 0 }}>{t('لا تملك صلاحية إنشاء فواتير مبيعات جديدة. يرجى مراجعة مدير النظام.')}</p>
                    <button onClick={() => router.push('/sales')} style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: C.primary, color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO }}>{t('العودة للمبيعات')}</button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '30px', paddingTop: THEME.header.pt }}>

                {/* ── Header ── */}
                <PageHeader
                    title={isServices ? t("فاتورة خدمة جديدة") : t("فاتورة مبيعات جديدة")}
                    subtitle={isServices ? t("إصدار فاتورة لخدمة مقدمة وتحصيل قيمتها") : t("إنشاء فاتورة مبيعات جديدة وحفظها في النظام")}
                    icon={Receipt}
                    backUrl="/sales"
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
                                {t('أنت حالياً على وضع "كل الفروع" — اختر فرعاً محدداً من القائمة المنسدلة في الأعلى قبل إنشاء الفاتورة')}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Quotation Conversion Banner ── */}
                {fromQuotation && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '14px 20px', marginBottom: '16px',
                        background: 'rgba(74,222,128,0.06)',
                        border: '1px solid rgba(74,222,128,0.3)',
                        borderRadius: '12px',
                        fontFamily: CAIRO,
                    }}>
                        <CheckCircle size={20} style={{ color: '#4ade80', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80', marginBottom: '2px' }}>
                                {t('تحويل عرض السعر')} QUO-{String(fromQuotation.quotationNumber).padStart(5, '0')} {t('إلى فاتورة مبيعات')}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {t('تم تحميل بيانات العرض تلقائياً — اختر طريقة الدفع واضغط حفظ')}
                            </div>
                        </div>
                    </div>
                )}

                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px', alignItems: 'start' }}>

                    {/* ══ Left: Main Content ══ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                        {/* Basic Data */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: '#256af4' }}><Receipt size={12} /> {t('بيانات الفاتورة')}</div>
                            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: isServices ? '100px 1.8fr 140px 140px' : '100px 1.2fr 1fr 140px 140px', gap: '10px' }}>
                                <div className="mobile-hide">
                                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '20px', marginBottom: '6px' }}>
                                        <label style={{ ...LS, fontSize: '11px', marginBottom: 0 }}>{t('رقم الفاتورة')}</label>
                                    </div>
                                    <div style={{
                                        height: '42px', borderRadius: '10px',
                                        background: 'rgba(37, 106, 244,0.08)',
                                        border: `1px solid ${C.border}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontFamily: OUTFIT, fontWeight: 600,
                                        fontSize: '13px', color: '#60a5fa',
                                        letterSpacing: '1px',
                                        boxSizing: 'border-box'
                                    }}>
                                        {isServices ? 'SRV' : 'SAL'}-{String(nextNum).padStart(5, '0')}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '20px', marginBottom: '6px' }}>
                                        <label style={{ ...LS, fontSize: '11px', marginBottom: 0 }}>{t('اسم العميل')}</label>
                                        <button onClick={() => setShowAddCust(true)} style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>+ {t('عميل جديد')}</button>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <CustomSelect
                                            value={form.customerId}
                                            onChange={v => { setForm((f: any) => ({ ...f, customerId: v })); clearError('customerId'); }}
                                            icon={Search}
                                            placeholder={t("ابحث واختر...")}
                                            options={partners.map(p => ({
                                                value: p.id,
                                                label: p.name
                                            }))}
                                        />
                                        <InlineError field="customerId" />
                                    </div>
                                    {selectedPartner && (
                                        <div style={{
                                            marginTop: '6px', fontSize: '11px', fontWeight: 700,
                                            color: selectedPartner.balance < 0 ? '#fb7185' : selectedPartner.balance > 0 ? '#4ade80' : '#94a3b8',
                                            background: selectedPartner.balance < 0 ? 'rgba(239, 68, 68, 0.12)' : selectedPartner.balance > 0 ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                                            border: `1px solid ${selectedPartner.balance < 0 ? 'rgba(239, 68, 68, 0.22)' : selectedPartner.balance > 0 ? 'rgba(74,222,128,0.22)' : 'var(--border-color)'}`,
                                            display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '30px', width: 'fit-content'
                                        }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                            {selectedPartner.balance > 0 ? `${t('عليه لنا:')} ${fMoney(Math.abs(selectedPartner.balance))}` : selectedPartner.balance < 0 ? `${t('له عندنا:')} ${fMoney(Math.abs(selectedPartner.balance))}` : t('متزن')}
                                        </div>
                                    )}
                                </div>
                                {(session?.user as any)?.businessType?.toUpperCase() !== 'SERVICES' && (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'flex-end', height: '20px', marginBottom: '6px' }}>
                                            <label style={{ ...LS, fontSize: '11px', marginBottom: 0 }}>{t('مخزن الصرف')}</label>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <CustomSelect value={form.warehouseId} onChange={v => { setForm((f: any) => ({ ...f, warehouseId: v })); localStorage.setItem('last_warehouse_id', v); clearError('warehouseId'); }} icon={Building2} placeholder={t("اختر المكان...")} options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
                                            <InlineError field="warehouseId" />
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '20px', marginBottom: '6px' }}>
                                        <label style={{ ...LS, fontSize: '11px', marginBottom: 0 }}>{t('تاريخ الفاتورة')}</label>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input type="date" value={form.date}
                                            onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))}
                                            style={{ ...IS, color: C.textSecondary, textAlign: 'end', direction: 'ltr', fontSize: '13px', fontFamily: OUTFIT }}
                                            onFocus={focusIn} onBlur={focusOut} className="blue-date-icon" />
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '20px', marginBottom: '6px' }}>
                                        <label style={{ ...LS, fontSize: '11px', marginBottom: 0 }}>{t('تاريخ الاستحقاق')}</label>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input type="date" value={form.dueDate || ''}
                                            onChange={e => setForm((f: any) => ({ ...f, dueDate: e.target.value }))}
                                            style={{ ...IS, color: '#fbbf24', textAlign: 'end', direction: 'ltr', fontSize: '13px', fontFamily: OUTFIT, background: 'rgba(251,191,36,0.05)', borderColor: 'rgba(251,191,36,0.3)' }}
                                            onFocus={focusIn} onBlur={focusOut} className="gold-date-icon" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: '#256af4' }}>
                                <Package size={12} /> {isServices ? t('إضافة الخدمات') : t('اضافة الاصناف')}
                            </div>

                            {/* Entry Row - Direct without nested box */}
                            <div className="item-entry-grid" style={{
                                display: 'grid',
                                gridTemplateColumns: isServices ? '1fr 110px 110px 60px' : '1fr 110px 110px 60px',
                                gap: '12px',
                                alignItems: 'end',
                                marginBottom: '20px'
                            }}>
                                <div>
                                    <label style={{ ...LS, fontSize: '11px', textAlign: 'start' }}>{isServices ? t('اسم الخدمة') : t('اسم الصنف')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <CustomSelect
                                            ref={itemSelectRef}
                                            value={entryItemId}
                                            onChange={v => {
                                                setEntryItemId(v);
                                                clearError('entryItemId');
                                                setTimeout(() => qtyRef.current?.focus(), 50);
                                            }}
                                            icon={Search}
                                            placeholder={isServices ? t("اختر الخدمة...") : t("اختر الصنف...")}
                                            onCreate={isServices ? (val) => {
                                                // Quick create service logic
                                                fetch('/api/items', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ name: val, sellPrice: 0 })
                                                }).then(res => res.json()).then(newItem => {
                                                    if (newItem && newItem.id) {
                                                        setItems(prev => [newItem, ...prev]);
                                                        setEntryItemId(newItem.id);
                                                    }
                                                });
                                            } : undefined}
                                            options={items.map(i => {
                                                const s = isServices ? null : (i.stocks?.find((st: any) => st.warehouseId === form.warehouseId)?.quantity || 0);
                                                return {
                                                    value: i.id,
                                                    label: i.name,
                                                    sub: s !== null ? `${t('متاح:')} ${s}` : undefined,
                                                    style: s !== null && s <= 0 ? { opacity: 0.6, color: C.danger } : undefined
                                                };
                                            })}
                                        />
                                        <InlineError field="entryItemId" />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('الكمية')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <PriceInput
                                            ref={qtyRef}
                                            value={entryQty}
                                            onChange={val => { setEntryQty(val); clearError('entryQty'); }}
                                            disabled={!entryItemId}
                                            onFocus={(e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.select(); }}
                                            decimals={2}
                                            style={{ height: '38px', opacity: !entryItemId ? 0.5 : 1, fontSize: '16px', fontWeight: 600 }}
                                        />
                                        <InlineError field="entryQty" />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('السعر')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <PriceInput
                                            ref={priceRef}
                                            value={entryPrice}
                                            onChange={val => { setEntryPrice(val); clearError('entryPrice'); }}
                                            disabled={!entryItemId}
                                            onFocus={(e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.select(); }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    addLine();
                                                    setTimeout(() => itemSelectRef.current?.focus(), 50);
                                                }
                                            }}
                                            style={{ height: '38px', opacity: !entryItemId ? 0.5 : 1, fontSize: '16px', fontWeight: 600 }}
                                        />
                                        <InlineError field="entryPrice" />
                                    </div>
                                </div>
                                <button onClick={addLine} disabled={!entryItemId || (!isServices && !form.warehouseId)}
                                    style={{
                                        height: '38px', borderRadius: '10px', border: 'none',
                                        background: (!entryItemId || (!isServices && !form.warehouseId)) ? 'rgba(37, 106, 244,0.3)' : C.primary,
                                        color: '#fff', cursor: (!entryItemId || (!isServices && !form.warehouseId)) ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', width: '60px', flexShrink: 0
                                    }}
                                >
                                    <Plus size={22} />
                                </button>
                            </div>

                            {(session?.user as any)?.businessType?.toUpperCase() === 'SERVICES' && entryItemId && (
                                <div style={{ animation: 'slideDown 0.2s ease', marginTop: '14px' }}>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('الوصف (يتم سحبه تلقائياً ويمكن التعديل)')}</label>
                                    <textarea
                                        value={entryDescription}
                                        onChange={e => setEntryDescription(e.target.value)}
                                        placeholder={t("اكتب وصف الخدمة التفصيلي هنا...")}
                                        style={{ ...IS, height: '60px', padding: '10px 12px', fontSize: '13px', lineHeight: '1.5', resize: 'none' }}
                                        onFocus={focusIn} onBlur={focusOut}
                                    />
                                </div>
                            )}

                            {/* Lines Table */}
                            <div className="scroll-table" style={{ marginTop: '10px' }}>
                                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: C.subtle, borderBottom: `1px solid ${C.border}` }}>
                                            {isServices ? (
                                                [t('الخدمة'), t('الكمية'), t('السعر'), t('الإجمالي'), ''].map((h, i) => (
                                                    <th key={i} style={{
                                                        textAlign: i === 0 ? 'start' : (i === 4 ? 'center' : 'center'),
                                                        padding: '12px', fontSize: '12px', fontWeight: 700, color: C.textMuted, fontFamily: CAIRO
                                                    }}>{h}</th>
                                                ))
                                            ) : (
                                                [t('الصنف'), t('الوحدة'), t('الكمية'), t('السعر'), t('الإجمالي'), ''].map((h, i) => (
                                                    <th key={i} style={{
                                                        textAlign: i === 0 ? 'start' : (i === 5 ? 'center' : 'center'),
                                                        padding: '12px', fontSize: '12px', fontWeight: 700, color: C.textMuted, fontFamily: CAIRO
                                                    }}>{h}</th>
                                                ))
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((l, i) => (
                                            <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '12px', color: C.textPrimary, fontSize: '13px', fontWeight: 700, fontFamily: CAIRO }}>
                                                    <div style={{ marginBottom: '2px' }}>{l.itemName}</div>
                                                    {l.description && <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 400 }}>{l.description}</div>}
                                                </td>
                                                {(session?.user as any)?.businessType?.toUpperCase() !== 'SERVICES' && (
                                                    <td style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontSize: '12px', fontWeight: 500 }}>{l.unit}</td>
                                                )}
                                                <td style={{ padding: '12px', textAlign: 'center', color: C.textPrimary, fontWeight: 700, fontFamily: OUTFIT, fontSize: '14px' }}>{formatNumber(l.quantity)}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontSize: '14px', fontWeight: 600, fontFamily: OUTFIT }}>{formatNumber(l.price)}</td>

                                                <td style={{ padding: '12px', textAlign: 'center', color: C.primary, fontWeight: 700, fontSize: '15px', fontFamily: OUTFIT }}>{formatNumber(l.total)}</td>
                                                <td style={{ padding: '12px', }}>
                                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                        <button onClick={() => editLine(i)} style={{ color: C.primary, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}><Pencil size={15} /></button>
                                                        <button onClick={() => removeLine(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {lines.length === 0 && (
                                            <tr><td colSpan={isServices ? 5 : 6} style={{ padding: '40px', color: 'var(--text-muted)', fontSize: '12px' }}>{t('لا توجد بنود مضافة')}</td></tr>
                                        )}
                                    </tbody>
                                    {lines.length > 0 && (
                                        <tfoot>
                                            <tr style={{ background: 'rgba(37,106,244,0.04)', borderTop: `1px solid ${C.primaryBorder}` }}>
                                                <td colSpan={isServices ? 3 : 4} style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>
                                                    {t('إجمالي')} {isServices ? t('الخدمات') : t('الأصناف')}
                                                </td>
                                                <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: C.primary, fontFamily: OUTFIT }}>
                                                    {fMoneyJSX(subtotal)}
                                                </td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>

                        {/* Attachments */}
                        <div style={SC}>
                            <div style={{ ...STitle, marginBottom: '10px', color: '#256af4' }}><Camera size={12} /> {t('المرفقات')}</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{
                                    flex: 1,
                                    border: '1px dashed var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.01)'
                                }}>
                                    <input type="file" multiple onChange={handleFileChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <Plus size={14} /> {t('رفع ملفات')}
                                    </div>
                                </div>
                                {attachments.length > 0 && (
                                    <div style={{ color: 'var(--primary-500)', fontSize: '11px', fontWeight: 700 }}>
                                        {attachments.length} {t('ملفات مدرجة')}
                                    </div>
                                )}
                            </div>
                            {attachments.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                                    {attachments.map((file, idx) => (
                                        <div key={idx} style={{
                                            background: 'var(--surface-850)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            padding: '4px 8px',
                                            fontSize: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                            <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} style={{ color: 'var(--danger-500)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Trash2 size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div style={SC}>
                            <label style={{ ...LS, fontSize: '11px' }}>{t('ملاحظات')}</label>
                            <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                                style={{ ...IS, height: '60px', padding: '10px', resize: 'none', background: 'rgba(255,255,255,0.02)' }}
                                placeholder={t("أدخل أي ملاحظات هنا...")}
                                onFocus={focusIn} onBlur={focusOut} />
                        </div>
                    </div>

                    {/* ══ Right: Summary (Sticky) ══ */}
                    <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                        <div style={SC}>
                            <div style={{ ...STitle, color: '#256af4' }}>{t('ملخص الفاتورة')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>

                                {/* صافي الفاتورة */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'linear-gradient(135deg, rgba(37,106,244,0.12), rgba(37,106,244,0.05))',
                                    padding: '10px 14px', borderRadius: '12px', marginTop: '6px',
                                    border: `1px solid ${C.primaryBorder}`,
                                    boxShadow: '0 4px 12px rgba(37,106,244,0.08)',
                                }}>
                                    <span style={{ color: C.textSecondary, fontWeight: 700, fontSize: '13px', fontFamily: CAIRO }}>{t('المبلغ')}</span>
                                    <span style={{ color: C.primary, fontWeight: 700, fontSize: '18px' }}>
                                        {fMoneyJSX(netTotal, '', { fontSize: '18px', fontWeight: 700 })}
                                    </span>
                                </div>

                                {/* الخصم */}
                                <div style={{
                                    background: C.subtle,
                                    border: `1px solid ${C.border}`,
                                    borderRadius: '10px',
                                    padding: '8px 12px',
                                    marginTop: '8px'
                                }}>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{t('الخصم')}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <PriceInput
                                                value={form.discountAmt || 0}
                                                onChange={val => {
                                                    setForm((f: any) => ({
                                                        ...f,
                                                        discountAmt: val,
                                                        discountPct: subtotal > 0 ? Number(((val / subtotal) * 100).toFixed(2)) : 0,
                                                    }));
                                                }}
                                                style={{ height: '34px', fontSize: '13px' }}
                                                textAlign="center"
                                            />
                                            <span style={{ position: 'absolute', bottom: '9px', insetInlineEnd: '10px', fontSize: '10px', color: '#64748b' }}>{cSymbol}</span>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <input type="number" min="0" max="100" placeholder="0"
                                                value={form.discountPct || ''}
                                                onChange={e => {
                                                    const pct = parseFloat(e.target.value) || 0;
                                                    setForm((f: any) => ({
                                                        ...f,
                                                        discountPct: pct,
                                                        discountAmt: parseFloat(((subtotal * pct) / 100).toFixed(2)),
                                                    }));
                                                }}
                                                style={{ ...IS, height: '34px', fontSize: '13px', textAlign: 'center' }}
                                                onFocus={focusIn} onBlur={focusOut} />
                                            <span style={{ position: 'absolute', insetInlineEnd: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#60a5fa', fontWeight: 600 }}>%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* الضريبة */}
                                {taxSettings?.enabled && (
                                    <div style={{ padding: '8px 12px', background: C.subtle, borderRadius: '10px', border: `1px dashed ${C.border}`, marginTop: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ color: C.textSecondary, fontSize: '11px', fontWeight: 600 }}>{taxSettings.type} {taxSettings.isInclusive ? t('(مشمولة)') : t('(مضافة)')}</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <input type="number" step="0.01" value={form.taxRate}
                                                    onChange={e => setForm((f: any) => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))}
                                                    style={{ ...IS, height: '30px', fontSize: '12px', paddingInlineStart: '22px' }}
                                                    onFocus={focusIn} onBlur={focusOut} />
                                                <span style={{ position: 'absolute', insetInlineEnd: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>%</span>
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <PriceInput
                                                    value={form.taxAmount}
                                                    onChange={val => {
                                                        const afterDisc = subtotal - (form.discountAmt || 0);
                                                        setForm((f: any) => ({
                                                            ...f,
                                                            taxAmount: val,
                                                            taxRate: afterDisc > 0 ? (val / afterDisc) * 100 : f.taxRate
                                                        }));
                                                    }}
                                                    style={{ height: '30px', fontSize: '12px', fontWeight: 600, color: C.primary }}
                                                    textAlign="center"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* إجمالي الأصناف */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '4px 0', marginTop: '4px' }}>
                                    <span style={{ color: C.textSecondary, fontWeight: 600 }}>{t('إجمالي الأصناف')}</span>
                                    <span style={{ color: C.textPrimary, fontWeight: 700 }}>{fMoneyJSX(subtotal)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: '#256af4' }}>{t('التحصيل والسداد')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {/* Payment Type */}
                                <div>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('طريقة الدفع')}</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                        {(['cash', 'bank', 'credit'] as const).map(tType => (
                                            <button key={tType} onClick={() => setForm((f: any) => ({ ...f, paymentType: tType, paidAmount: tType === 'credit' ? 0 : f.paidAmount }))}
                                                style={{
                                                    height: '36px', borderRadius: '8px', border: '1px solid', fontFamily: CAIRO,
                                                    borderColor: form.paymentType === tType ? C.primary : C.border,
                                                    background: form.paymentType === tType ? C.primaryBg : 'transparent',
                                                    color: form.paymentType === tType ? C.primary : C.textSecondary,
                                                    fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                                                }}>
                                                {tType === 'cash' ? t('كاش') : tType === 'bank' ? t('بنكي') : t('آجل')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {form.paymentType !== 'credit' && (
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('المبلغ المدفوع')}</label>
                                        <div style={{ position: 'relative' }}>
                                            <PriceInput
                                                value={form.paidAmount}
                                                onChange={val => { setForm((f: any) => ({ ...f, paidAmount: val })); clearError('paidAmount'); }}
                                                style={{ height: '44px', fontSize: '16px', fontWeight: 600, color: (form.paidAmount === '' || form.paidAmount === 0) ? C.textMuted : C.textPrimary }}
                                                placeholder="0.00"
                                            />
                                            {form.paymentType === 'bank' ? (
                                                <Building2 size={20} style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                                            ) : (
                                                <Banknote size={20} style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                                            )}
                                            <InlineError field="paidAmount" />
                                        </div>
                                    </div>
                                )}

                                {form.paymentType === 'cash' && form.paidAmount > 0 && (
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('الخزينة المستلمة')} <span style={{ color: '#f87171' }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <CustomSelect value={form.treasuryId} onChange={v => { setForm((f: any) => ({ ...f, treasuryId: v })); clearError('treasuryId'); }} icon={Banknote} placeholder={t("اختر الخزينة...")} options={treasuries.filter(t => t.type !== 'bank').map(t => ({ value: t.id, label: t.name }))} />
                                            <InlineError field="treasuryId" />
                                        </div>
                                    </div>
                                )}
                                {form.paymentType === 'bank' && form.paidAmount > 0 && (
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('الحساب البنكي')} <span style={{ color: '#f87171' }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <CustomSelect value={form.bankId} onChange={v => { setForm((f: any) => ({ ...f, bankId: v })); clearError('bankId'); }} icon={Building2} placeholder={t("اختر البنك...")} options={treasuries.filter(t => t.type === 'bank').map(t => ({ value: t.id, label: t.name }))} />
                                            <InlineError field="bankId" />
                                        </div>
                                    </div>
                                )}

                                {/* Payment Status Badge */}
                                {lines.length > 0 && (
                                    <div style={{
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        background: diff > 0
                                            ? 'rgba(239,68,68,0.07)'
                                            : diff < 0
                                                ? 'rgba(99,102,241,0.07)'
                                                : 'rgba(52,211,153,0.07)',
                                        color: diff > 0 ? '#f87171' : diff < 0 ? '#818cf8' : '#34d399',
                                        border: `1px solid ${diff > 0 ? 'rgba(239,68,68,0.15)'
                                            : diff < 0 ? 'rgba(99,102,241,0.15)'
                                                : 'rgba(52,211,153,0.15)'
                                            }`,
                                    }}>
                                        <span>
                                            {diff > 0 ? `${t('متبقي:')} ${fMoney(Math.abs(diff))}`
                                                : diff < 0 ? `${t('زيادة:')} ${fMoney(Math.abs(diff))}`
                                                    : t('تم السداد بالكامل ✓')}
                                        </span>
                                        {diff !== 0 && (
                                            <span style={{ fontSize: '10px', opacity: 0.7 }}>
                                                {diff > 0 ? t('آجل') : t('رصيد دائن')}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                            <button onClick={() => handleSubmit(false)} disabled={submitting}
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    height: '52px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    gap: '12px',
                                    background: C.primary,
                                    boxShadow: '0 8px 25px -5px rgba(37,106,244,0.4)',
                                    border: 'none',
                                    borderRadius: '14px',
                                    opacity: submitting ? 0.5 : 1,
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    fontFamily: CAIRO,
                                    color: '#fff'
                                }}>
                                {submitting ? <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> : <>{t('حفظ الفاتورة')} <CheckCircle size={20} /></>}
                            </button>
                            <button
                                onClick={() => handleSubmit(true)}
                                disabled={submitting}
                                style={{
                                    width: '100%', height: '42px', borderRadius: '12px',
                                    border: '1px solid rgba(16,185,129,0.3)',
                                    background: 'rgba(16,185,129,0.06)',
                                    color: '#34d399', fontSize: '13px', fontWeight: 700,
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    fontFamily: CAIRO,
                                    opacity: submitting ? 0.5 : 1,
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(16,185,129,0.12)';
                                    e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(16,185,129,0.06)';
                                    e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)';
                                }}>
                                {t('حفظ وطباعة الفاتورة')} <Printer size={15} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* End Page Content */}
            {/* Unified Add Customer Modal */}
            <AppModal
                show={showAddCust}
                onClose={() => setShowAddCust(false)}
                title={t('إضافة عميل جديد')}
                icon={UserPlus}
                maxWidth="440px"
            >
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    const name = (e.currentTarget.elements.namedItem('pName') as HTMLInputElement).value;
                    const phone = (e.currentTarget.elements.namedItem('pPhone') as HTMLInputElement).value;

                    if (!name) return;
                    setSubmitting(true);
                    try {
                        const targetApi = '/api/customers';
                        const res = await fetch(targetApi, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name, phone }),
                        });
                        if (res.ok) {
                            const newP = await res.json();
                            setCustomers(prev => [...prev, newP]);

                            setForm((f: any) => ({ ...f, customerId: newP.id }));
                            setShowAddCust(false);
                        } else alert(t('فشل في الإضافة'));
                    } catch { alert(t('خطأ في الاتصال')); } finally { setSubmitting(false); }
                }}>


                    <div style={{ marginBottom: '16px' }}>
                        <label style={LS}>{t('الاسم')} <span style={{ color: C.danger }}>*</span></label>
                        <div style={{ position: 'relative' }}>
                            <User size={16} style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
                            <input name="pName" required placeholder={t('اسم العميل...')} style={{ ...IS, height: '42px', paddingInlineEnd: '40px' }} onFocus={focusIn} onBlur={focusOut} autoFocus />
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={LS}>{t('رقم الجوال')}</label>
                        <div style={{ position: 'relative' }}>
                            <Phone size={16} style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
                            <input name="pPhone" placeholder="01x xxxx xxxx" style={{ ...IS, height: '42px', paddingInlineEnd: '40px', direction: 'ltr', textAlign: 'start' }} onFocus={focusIn} onBlur={focusOut} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" disabled={submitting} style={{
                            flex: 1.5, height: '46px', borderRadius: '12px', border: 'none', background: submitting ? 'rgba(37, 106, 244,0.5)' : C.primary, color: '#fff', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: CAIRO
                        }}>
                            {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : t('حفظ')}
                        </button>
                        <button type="button" onClick={() => setShowAddCust(false)} style={{
                            flex: 1, height: '46px', borderRadius: '12px', border: `1px solid ${C.border}`,
                            background: 'transparent', color: C.textSecondary, fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO
                        }}>{t('إلغاء')}</button>
                    </div>
                </form>
            </AppModal>
            <style jsx global>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes errorSlideDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes inlineErrorPush {
                    0% { transform: translateY(10px) scale(0.9); opacity: 0; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
                .blue-date-icon::-webkit-calendar-picker-indicator {
                    cursor: pointer;
                    filter: invert(41%) sepia(34%) saturate(3000%) hue-rotate(190deg) brightness(100%) contrast(100%);
                    border-radius: 4px; padding: 2px;
                }
                .blue-date-icon::-webkit-calendar-picker-indicator:hover {
                    background: rgba(37,106,244,0.1);
                }
                /* Hide arrows/spinners in number inputs */
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button {
                    -webkit-appearance: none; margin: 0;
                }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
            <script dangerouslySetInnerHTML={{
                __html: `
                document.addEventListener('wheel', function(e) {
                    if (document.activeElement.type === 'number') {
                        document.activeElement.blur();
                    }
                }, { passive: false });
            `}} />
        </DashboardLayout>
    );
}

export default function NewSalePage() {
    return (
        <Suspense>
            <NewSalePageInner />
        </Suspense>
    );
}
