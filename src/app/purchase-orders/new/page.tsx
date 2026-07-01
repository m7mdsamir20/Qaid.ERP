'use client';
import ContentSkeleton from '@/components/ContentSkeleton';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ShoppingBag, Plus, Trash2, Package, Info, Loader2, Search, X, ArrowRight, Pencil, AlertCircle, Save, CheckCircle } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import PriceInput from '@/components/PriceInput';
import { useCurrency } from '@/hooks/useCurrency';
import { formatNumber } from '@/lib/currency';

interface Supplier { id: string; name: string; balance?: number; }
interface Warehouse { id: string; name: string; }
interface Project { id: string; name: string; }
interface Item { id: string; code: string; name: string; costPrice: number; unit?: any; stocks?: any[]; }
interface POLine { itemId: string; itemName: string; itemCode: string; description: string; quantity: number; unit: string; price: number; discount: number; total: number; }

const getUnitName = (u: any) => !u ? '' : typeof u === 'string' ? u : (u.name || u.nameEn || '');

export default function NewPurchaseOrderPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { data: session } = useSession();
    const isContracting = (session?.user as any)?.businessType?.toUpperCase() === 'CONTRACTING';

    const activeBranchId = (session?.user as any)?.activeBranchId;
    const allBranches: any[] = (session?.user as any)?.branches || [];
    const allowedBranches: string[] | null = (session?.user as any)?.allowedBranches || null;
    const userBranches = allowedBranches?.length ? allBranches.filter(b => allowedBranches.includes(b.id)) : allBranches;
    const isAllBranches = (!activeBranchId || activeBranchId === 'all') && userBranches.length > 1;

    const { symbol: cSymbol, fMoney } = useCurrency();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [taxSettings, setTaxSettings] = useState<any>(null);

    const [nextNum, setNextNum] = useState(1);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const clearError = (field: string) => {
        if (fieldErrors[field]) setFieldErrors(prev => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const itemSelectRef = useRef<any>(null);
    const qtyRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);

    const [lines, setLines] = useState<POLine[]>([]);
    const [entryItemId, setEntryItemId] = useState('');
    const [entryDescription, setEntryDescription] = useState('');
    const [entryQty, setEntryQty] = useState<number | ''>(1);
    const [entryPrice, setEntryPrice] = useState<number | ''>('');

    const [form, setForm] = useState({
        supplierId: '',
        warehouseId: '',
        projectId: '',
        date: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        notes: '',
        taxRate: 0,
        discountAmt: 0,
        discountPct: 0,
    });

    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const discountAmt = parseFloat(String(form.discountAmt)) || 0;
    const afterDiscount = Math.max(0, subtotal - discountAmt);
    const taxAmount = taxSettings?.enabled ? afterDiscount * ((parseFloat(String(form.taxRate)) || 0) / 100) : 0;
    const total = afterDiscount + taxAmount;

    const loadData = useCallback(async () => {
        try {
            const [supR, whR, projR, itemR, nextR] = await Promise.all([
                fetch('/api/suppliers'),
                fetch('/api/warehouses'),
                fetch('/api/projects'),
                fetch('/api/items?all=true'),
                fetch('/api/purchase-orders?nextNum=1'),
            ]);
            const [sups, whs, projs, its, nextData] = await Promise.all([supR.json(), whR.json(), projR.json(), itemR.json(), nextR.json()]);
            setNextNum(nextData.nextNum || 1);
            setSuppliers(Array.isArray(sups) ? sups : []);
            setWarehouses(Array.isArray(whs) ? whs : []);
            setProjects(Array.isArray(projs) ? projs : (projs.projects || []));

            let fetchedItems = Array.isArray(its) ? its : (its.items || []);
            setItems(fetchedItems);

            const taxRes = await fetch('/api/settings');
            if (taxRes.ok) {
                const taxData = await taxRes.json();
                if (taxData.company?.taxSettings) {
                    const ts = typeof taxData.company.taxSettings === 'string' ? JSON.parse(taxData.company.taxSettings) : taxData.company.taxSettings;
                    setTaxSettings(ts);
                    if (ts.enabled) {
                        setForm(f => ({ ...f, taxRate: ts.rate }));
                    }
                }
            }

            if (Array.isArray(whs) && whs.length > 0) {
                const lastWh = typeof window !== 'undefined' ? localStorage.getItem('last_warehouse_id') : null;
                const defaultWh = (lastWh && whs.some((w: any) => w.id === lastWh)) ? lastWh : whs[0].id;
                setForm(f => ({ ...f, warehouseId: defaultWh }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Auto-set price and focus on item selected
    useEffect(() => {
        if (!entryItemId) return;
        const item = items.find(i => i.id === entryItemId);
        if (item) {
            setEntryPrice(item.costPrice || 0);
            clearError('entryItemId');
            setTimeout(() => { qtyRef.current?.focus(); qtyRef.current?.select(); }, 50);
        }
    }, [entryItemId, items]);

    const addLine = () => {
        if (!entryItemId) return;
        const item = items.find(i => i.id === entryItemId);
        if (!item) return;

        const qty = Number(entryQty) || 0;
        const price = Number(entryPrice) || 0;

        if (qty <= 0) {
            setFieldErrors(prev => ({ ...prev, entryQty: t('الكمية؟') }));
            return;
        }
        if (price < 0) {
            setFieldErrors(prev => ({ ...prev, entryPrice: t('السعر؟') }));
            return;
        }

        const lineTotal = qty * price;

        setLines(prev => {
            const idx = prev.findIndex(l => l.itemId === entryItemId);
            if (idx >= 0) {
                const updated = [...prev];
                const newQty = updated[idx].quantity + qty;
                updated[idx] = {
                    ...updated[idx],
                    quantity: newQty,
                    total: newQty * price,
                };
                return updated;
            }
            return [...prev, {
                itemId: item.id,
                itemName: item.name,
                itemCode: item.code,
                description: entryDescription,
                quantity: qty,
                unit: getUnitName(item.unit),
                price,
                discount: 0,
                total: lineTotal,
            }];
        });

        setEntryItemId('');
        setEntryDescription('');
        setEntryQty(1);
        setEntryPrice('');
        setTimeout(() => { itemSelectRef.current?.focus?.(); }, 50);
    };

    const removeLine = (idx: number) => {
        setLines(prev => prev.filter((_, i) => i !== idx));
    };

    const editLine = (idx: number) => {
        const l = lines[idx];
        setEntryItemId(l.itemId);
        setEntryQty(l.quantity);
        setEntryPrice(l.price);
        setEntryDescription(l.description || '');
        removeLine(idx);
        setTimeout(() => { qtyRef.current?.focus(); }, 50);
    };

    const handleSubmit = async (approve = false) => {
        setErrorMsg('');
        setFieldErrors({});

        if (isAllBranches) {
            setErrorMsg(t('يرجى اختيار فرع محدد من قائمة الفروع أعلى الصفحة أولاً'));
            return;
        }

        const errors: Record<string, string> = {};
        if (!form.supplierId) errors.supplierId = t('يرجى اختيار المورد');
        if (!form.warehouseId) errors.warehouseId = t('يرجى اختيار المخزن');

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setErrorMsg(t('يرجى استكمال البيانات المطلوبة'));
            return;
        }

        if (lines.length === 0) {
            setErrorMsg(t('يرجى إضافة صنف واحد على الأقل'));
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierId: form.supplierId,
                    warehouseId: form.warehouseId,
                    projectId: form.projectId || undefined,
                    date: form.date,
                    expectedDeliveryDate: form.expectedDeliveryDate || undefined,
                    notes: form.notes,
                    taxRate: taxSettings?.enabled ? Number(form.taxRate) : 0,
                    discount: parseFloat(String(form.discountAmt)) || 0,
                    lines: lines.map(l => ({
                        itemId: l.itemId,
                        description: l.description,
                        quantity: l.quantity,
                        price: l.price,
                        discount: l.discount,
                        unit: l.unit,
                    })),
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                setErrorMsg(err.error || t('فشل الحفظ'));
                return;
            }

            const created = await res.json();

            if (approve) {
                await fetch(`/api/purchase-orders/${created.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'approved' }),
                });
            }

            router.push('/purchase-orders');
        } catch (e) {
            setErrorMsg(t('حدث خطأ في الاتصال'));
        } finally {
            setSubmitting(false);
        }
    };

    const selectedSupplier = suppliers.find(s => s.id === form.supplierId);

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
                top: '-32px',
                insetInlineStart: '4px',
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

    if (loading) { return <DashboardLayout><ContentSkeleton /></DashboardLayout>; }

    return (
        <DashboardLayout>
            <div className="purchase-order-page" dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '30px', paddingTop: THEME.header.pt }}>
                <PageHeader
                    title={t('أمر شراء جديد')}
                    subtitle={t('إنشاء أمر شراء جديد وتخصيصه للفرع والمستودع')}
                    icon={ShoppingBag}
                    backUrl="/purchase-orders"
                />

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
                                {t('أنت حالياً على وضع "كل الفروع" — يجب اختيار فرع محدد من قائمة الفروع أعلى الصفحة للتمكن من حفظ أمر الشراء.')}
                            </div>
                        </div>
                    </div>
                )}

                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px', alignItems: 'start' }}>
                    
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        
                        {/* Basic Info */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: '#256af4' }}><ShoppingBag size={12} /> {t('بيانات أمر الشراء')}</div>
                            <div className="sales-form-grid" style={{ display: 'grid', gridTemplateColumns: '100px 1.2fr 1fr 140px 140px', gap: '10px' }}>
                                <div className="mobile-hide">
                                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '20px', marginBottom: '6px' }}>
                                        <label style={{ ...LS, fontSize: '11px', marginBottom: 0 }}>{t('رقم الأمر')}</label>
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
                                        {`PO-${String(nextNum).padStart(5, '0')}`}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '20px', marginBottom: '6px' }}>
                                        <label style={{ ...LS, fontSize: '11px', marginBottom: 0 }}>{t('اسم المورد')}</label>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <CustomSelect
                                            value={form.supplierId}
                                            onChange={v => { setForm(f => ({ ...f, supplierId: v })); clearError('supplierId'); }}
                                            icon={Search}
                                            placeholder={t("ابحث واختر المورد...")}
                                            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                        />
                                        <InlineError field="supplierId" />
                                    </div>
                                    {selectedSupplier && selectedSupplier.balance !== undefined && (
                                        <div style={{
                                            marginTop: '6px', fontSize: '11px', fontWeight: 700,
                                            color: selectedSupplier.balance < 0 ? '#4ade80' : selectedSupplier.balance > 0 ? '#fb7185' : '#94a3b8',
                                            background: selectedSupplier.balance < 0 ? 'rgba(74,222,128,0.12)' : selectedSupplier.balance > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.06)',
                                            border: `1px solid ${selectedSupplier.balance < 0 ? 'rgba(74,222,128,0.22)' : selectedSupplier.balance > 0 ? 'rgba(239, 68, 68, 0.22)' : 'var(--border-color)'}`,
                                            display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '30px', width: 'fit-content'
                                        }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                            {selectedSupplier.balance < 0 ? `${t('له عندنا:')} ${fMoney(Math.abs(selectedSupplier.balance))}` : selectedSupplier.balance > 0 ? `${t('عليه لنا:')} ${fMoney(Math.abs(selectedSupplier.balance))}` : t('متزن')}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '20px', marginBottom: '6px' }}>
                                        <label style={{ ...LS, fontSize: '11px', marginBottom: 0 }}>{t('المخزن المستلم')}</label>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <CustomSelect
                                            value={form.warehouseId}
                                            onChange={v => { setForm(f => ({ ...f, warehouseId: v })); localStorage.setItem('last_warehouse_id', v); clearError('warehouseId'); }}
                                            placeholder={t("اختر المخزن...")}
                                            options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                                        />
                                        <InlineError field="warehouseId" />
                                    </div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '20px', marginBottom: '6px' }}>
                                        <label style={{ ...LS, fontSize: '11px', marginBottom: 0 }}>{t('تاريخ الأمر')}</label>
                                    </div>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                        style={{ ...IS, color: C.textSecondary, textAlign: 'end', direction: 'ltr', fontSize: '13px', fontFamily: OUTFIT }}
                                        onFocus={focusIn} onBlur={focusOut}
                                        className="blue-date-icon"
                                    />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '20px', marginBottom: '6px' }}>
                                        <label style={{ ...LS, fontSize: '11px', marginBottom: 0 }}>{t('تسليم متوقع')}</label>
                                    </div>
                                    <input
                                        type="date"
                                        value={form.expectedDeliveryDate}
                                        onChange={e => setForm(f => ({ ...f, expectedDeliveryDate: e.target.value }))}
                                        style={{ ...IS, color: '#fbbf24', textAlign: 'end', direction: 'ltr', fontSize: '13px', fontFamily: OUTFIT, background: 'rgba(251,191,36,0.05)', borderColor: 'rgba(251,191,36,0.3)' }}
                                        onFocus={focusIn} onBlur={focusOut}
                                        className="gold-date-icon"
                                    />
                                </div>
                            </div>

                            {/* Extra Info (Project) */}
                            {isContracting && projects.length > 0 && (
                                <div className="sales-rep-grid" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '16px', display: 'grid', gridTemplateColumns: '1.2fr', gap: '10px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'flex-end', height: '20px', marginBottom: '6px' }}>
                                            <label style={{ ...LS, fontSize: '11px', marginBottom: 0 }}>{t('المشروع')}</label>
                                        </div>
                                        <CustomSelect
                                            value={form.projectId}
                                            onChange={v => setForm(f => ({ ...f, projectId: v }))}
                                            placeholder={t('اختر المشروع...')}
                                            options={projects.map(p => ({ value: p.id, label: p.name }))}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Items Addition Block */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: '#256af4' }}><Package size={12} /> {t('تفاصيل البنود')}</div>
                            <div className="item-entry-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px 60px', gap: '12px', alignItems: 'end', marginBottom: '20px' }}>
                                <div>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('اسم الصنف')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <CustomSelect
                                            ref={itemSelectRef}
                                            value={entryItemId}
                                            onChange={v => setEntryItemId(v)}
                                            icon={Search}
                                            placeholder={t("اختر الصنف...")}
                                            options={items.map(i => {
                                                const s = i.stocks?.find((st: any) => st.warehouseId === form.warehouseId)?.quantity || 0;
                                                return {
                                                    value: i.id,
                                                    label: i.name,
                                                    sub: `${i.code} | ${t('المتاح')}: ${s}`
                                                };
                                            })}
                                        />
                                        <InlineError field="entryItemId" />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('الكمية')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            ref={qtyRef}
                                            type="number"
                                            value={entryQty}
                                            onChange={e => { setEntryQty(e.target.value === '' ? '' : Number(e.target.value)); clearError('entryQty'); }}
                                            onFocus={(e) => e.currentTarget.select()}
                                            disabled={!entryItemId}
                                            style={{ ...IS, height: '38px', opacity: !entryItemId ? 0.5 : 1, textAlign: 'center', fontSize: '15px', fontWeight: 600, fontFamily: OUTFIT }}
                                        />
                                        <InlineError field="entryQty" />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('سعر التكلفة')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <PriceInput
                                            value={entryPrice}
                                            onChange={val => { setEntryPrice(val); clearError('entryPrice'); }}
                                            disabled={!entryItemId}
                                            onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select()}
                                            style={{ height: '38px', opacity: !entryItemId ? 0.5 : 1, fontSize: '15px', fontWeight: 600 }}
                                            textAlign="center"
                                        />
                                        <InlineError field="entryPrice" />
                                    </div>
                                </div>
                                <button
                                    onClick={addLine}
                                    disabled={!entryItemId}
                                    style={{
                                        height: '38px', borderRadius: '10px', border: 'none',
                                        background: !entryItemId ? 'rgba(37, 106, 244,0.3)' : C.primary,
                                        color: '#fff', cursor: !entryItemId ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', width: '60px', flexShrink: 0
                                    }}
                                >
                                    <Plus size={22} />
                                </button>
                            </div>

                            {entryItemId && (
                                <div style={{ animation: 'slideDown 0.2s ease', marginTop: '14px', marginBottom: '14px' }}>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('وصف اختياري للبند')}</label>
                                    <input
                                        type="text"
                                        value={entryDescription}
                                        onChange={e => setEntryDescription(e.target.value)}
                                        placeholder={t("اكتب وصفاً أو ملاحظات إضافية لهذا البند...")}
                                        style={{ ...IS, height: '38px', padding: '10px 12px', fontSize: '13px' }}
                                        onFocus={focusIn} onBlur={focusOut}
                                    />
                                </div>
                            )}

                            {/* Lines Table */}
                            <div className="scroll-table" style={{ marginTop: '10px', overflowX: 'auto' }}>
                                <table className="sales-items-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                    <colgroup>
                                        <col />
                                        <col className="col-unit" style={{ width: '70px' }} />
                                        <col className="col-qty" style={{ width: '60px' }} />
                                        <col className="col-price" style={{ width: '100px' }} />
                                        <col className="col-total" style={{ width: '100px' }} />
                                        <col className="col-actions" style={{ width: '70px' }} />
                                    </colgroup>
                                    <thead>
                                        <tr style={{ background: C.subtle, borderBottom: `1px solid ${C.border}` }}>
                                            <th style={{ textAlign: 'start', padding: '12px', fontSize: '11.5px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('الصنف')}</th>
                                            <th className="col-unit" style={{ textAlign: 'center', padding: '12px', fontSize: '11.5px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('الوحدة')}</th>
                                            <th className="col-qty" style={{ textAlign: 'center', padding: '12px', fontSize: '11.5px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('الكمية')}</th>
                                            <th className="col-price" style={{ textAlign: 'center', padding: '12px', fontSize: '11.5px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('السعر')}</th>
                                            <th className="col-total" style={{ textAlign: 'center', padding: '12px', fontSize: '11.5px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('الإجمالي')}</th>
                                            <th className="col-actions"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((l, i) => (
                                            <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '12px', overflow: 'hidden' }}>
                                                    <div style={{ color: C.textPrimary, fontSize: '13px', fontWeight: 700, fontFamily: CAIRO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.itemName}</div>
                                                    {l.description && <div style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.description}</div>}
                                                </td>
                                                <td className="col-unit" style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap' }}>{l.unit}</td>
                                                <td className="col-qty" style={{ padding: '12px', textAlign: 'center', color: C.textPrimary, fontWeight: 700, fontFamily: OUTFIT, fontSize: '13px', whiteSpace: 'nowrap' }}>{formatNumber(l.quantity)}</td>
                                                <td className="col-price" style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, whiteSpace: 'nowrap' }}>{formatNumber(l.price)}</td>
                                                <td className="col-total" style={{ padding: '12px', textAlign: 'center', color: C.primary, fontWeight: 700, fontSize: '13px', fontFamily: OUTFIT, whiteSpace: 'nowrap' }}>{formatNumber(l.total)}</td>
                                                <td className="col-actions" style={{ padding: '12px' }}>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                        <button onClick={() => editLine(i)} style={{ color: C.primary, background: 'none', border: 'none', cursor: 'pointer' }}><Pencil size={14} /></button>
                                                        <button onClick={() => removeLine(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={15} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {lines.length === 0 && (
                                            <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontFamily: CAIRO }}>{t('لا توجد بنود مضافة')}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Totals & Actions) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        
                        {/* Totals Box */}
                        <div style={SC}>
                            <div style={STitle}><Info size={12} /> {t('ملخص الحسابات')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                
                                {/* إجمالي الأصناف */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '4px 0' }}>
                                    <span style={{ color: C.textSecondary, fontFamily: CAIRO, fontWeight: 600 }}>{t('إجمالي البنود')}</span>
                                    <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{fMoney(subtotal)}</span>
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
                                                    setForm(f => ({
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
                                                    setForm(f => ({
                                                        ...f,
                                                        discountPct: pct,
                                                        discountAmt: parseFloat(((subtotal * pct) / 100).toFixed(2)),
                                                    }));
                                                }}
                                                style={{ ...IS, height: '34px', fontSize: '13px', textAlign: 'start' }}
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
                                                    onChange={e => setForm(f => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))}
                                                    style={{ ...IS, height: '30px', fontSize: '12px', paddingInlineStart: '22px' }}
                                                    onFocus={focusIn} onBlur={focusOut} />
                                                <span style={{ position: 'absolute', insetInlineEnd: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>%</span>
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <PriceInput
                                                    value={taxAmount}
                                                    onChange={val => {
                                                        const afterDisc = subtotal - (form.discountAmt || 0);
                                                        setForm(f => ({
                                                            ...f,
                                                            taxRate: afterDisc > 0 ? (val / afterDisc) * 100 : f.taxRate
                                                        }));
                                                    }}
                                                    style={{ height: '30px', fontSize: '12px', fontWeight: 600, color: C.primary }}
                                                    textAlign="center"
                                                    disabled
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* المجموع النهائي */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'linear-gradient(135deg, rgba(37,106,244,0.12), rgba(37,106,244,0.05))',
                                    padding: '12px 14px', borderRadius: '12px',
                                    border: '1px solid rgba(37,106,244,0.3)',
                                    marginTop: '8px'
                                }}>
                                    <span style={{ color: C.textSecondary, fontWeight: 600, fontSize: '12px', fontFamily: CAIRO }}>{t('المجموع النهائي')}</span>
                                    <span style={{ color: C.primary, fontWeight: 800, fontSize: '17px', fontFamily: OUTFIT }}>{fMoney(total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Extra Notes Box */}
                        <div style={SC}>
                            <div style={STitle}><Info size={12} /> {t('ملاحظات وشروط')}</div>
                            <textarea
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder={t("اكتب شروط التوريد أو أي ملاحظات أخرى هنا...")}
                                style={{ ...IS, height: '70px', padding: '10px 12px', fontSize: '13px', lineHeight: '1.5', resize: 'none' }}
                                onFocus={focusIn} onBlur={focusOut}
                            />
                        </div>

                        {errorMsg && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '12px 16px', background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px',
                                color: C.danger, fontSize: '12.5px', fontFamily: CAIRO, fontWeight: 600
                            }}>
                                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                {errorMsg}
                            </div>
                        )}

                        {/* Actions Button */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                style={{
                                    height: '42px', borderRadius: '12px', border: 'none',
                                    background: C.primary, color: '#fff', cursor: submitting ? 'wait' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    fontSize: '13.5px', fontWeight: 700, fontFamily: CAIRO, width: '100%',
                                    opacity: submitting ? 0.7 : 1
                                }}
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {t('حفظ كمسودة')}
                            </button>
                            <button
                                onClick={() => handleSubmit(true)}
                                disabled={submitting}
                                style={{
                                    height: '42px', borderRadius: '12px', border: `1px solid rgba(16,185,129,0.3)`,
                                    background: 'rgba(16,185,129,0.15)', color: '#10b981', cursor: submitting ? 'wait' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    fontSize: '13.5px', fontWeight: 700, fontFamily: CAIRO, width: '100%',
                                    opacity: submitting ? 0.7 : 1
                                }}
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                {t('اعتماد وأمر شراء معتمد')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
