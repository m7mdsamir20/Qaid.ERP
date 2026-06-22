'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ContentSkeleton from '@/components/ContentSkeleton';
import CustomSelect from '@/components/CustomSelect';
import PriceInput from '@/components/PriceInput';
import PageHeader from '@/components/PageHeader';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { formatNumber } from '@/lib/currency';
import {
    ShoppingBag, Plus, Trash2, Search, Loader2, AlertCircle, Package, CheckCircle, Pencil,
} from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, THEME } from '@/constants/theme';

interface Supplier { id: string; name: string; balance?: number; }
interface Warehouse { id: string; name: string; }
interface Project { id: string; name: string; }
interface Item { id: string; code: string; name: string; costPrice: number; unit?: any; stocks?: any[]; }

interface POLine {
    itemId: string;
    itemName: string;
    itemCode: string;
    description: string;
    quantity: number;
    unit: string;
    price: number;
    discount: number;
    total: number;
}

const getUnitName = (u: any) => !u ? '' : typeof u === 'string' ? u : (u.name || u.nameEn || '');

export default function NewPurchaseOrderPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { data: session } = useSession();
    const { fMoneyJSX } = useCurrency();

    const isContracting = (session?.user as any)?.businessType?.toUpperCase() === 'CONTRACTING';

    const [nextNum, setNextNum] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [lines, setLines] = useState<POLine[]>([]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [errorMsg, setErrorMsg] = useState('');

    const itemSelectRef = useRef<any>(null);
    const qtyRef = useRef<any>(null);
    const priceRef = useRef<any>(null);
    const [entryItemId, setEntryItemId] = useState('');
    const [entryQty, setEntryQty] = useState<number | ''>(1);
    const [entryPrice, setEntryPrice] = useState<number | ''>('');
    const [entryDesc, setEntryDesc] = useState('');

    const [form, setForm] = useState({
        supplierId: '',
        warehouseId: '',
        projectId: '',
        date: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        notes: '',
        taxRate: 0,
    });

    const clearError = (field: string) => {
        setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    };

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

            if (Array.isArray(whs) && whs.length > 0) {
                const lastWh = typeof window !== 'undefined' ? localStorage.getItem('last_warehouse_id') : null;
                const defaultWh = (lastWh && whs.some((w: any) => w.id === lastWh)) ? lastWh : whs[0].id;
                setForm(f => ({ ...f, warehouseId: defaultWh }));
            }
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        if (entryItemId) {
            const item = items.find(i => i.id === entryItemId);
            if (item) {
                setEntryPrice(item.costPrice || 0);
                setTimeout(() => qtyRef.current?.focus(), 50);
            }
        }
    }, [entryItemId, items]);

    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const taxAmount = subtotal * (form.taxRate / 100);
    const grandTotal = subtotal + taxAmount;

    const addLine = useCallback(() => {
        const errors: Record<string, string> = {};
        if (!entryItemId) errors.entryItemId = t('يرجى اختيار الصنف');
        if (!entryQty || Number(entryQty) <= 0) errors.entryQty = t('الكمية؟');
        if (entryPrice === '') errors.entryPrice = t('السعر؟');

        if (Object.keys(errors).length > 0) { setFieldErrors(prev => ({ ...prev, ...errors })); return; }

        const item = items.find(i => i.id === entryItemId);
        if (!item) return;

        const qty = Number(entryQty);
        const price = Number(entryPrice);
        const lineTotal = qty * price;

        setLines(prev => {
            const idx = prev.findIndex(l => l.itemId === item.id);
            if (idx >= 0) {
                const updated = [...prev];
                const newQty = updated[idx].quantity + qty;
                updated[idx] = { ...updated[idx], quantity: newQty, total: newQty * updated[idx].price };
                return updated;
            }
            return [...prev, {
                itemId: item.id,
                itemName: item.name,
                itemCode: item.code,
                description: entryDesc,
                quantity: qty,
                unit: getUnitName(item.unit),
                price,
                discount: 0,
                total: lineTotal,
            }];
        });

        setEntryItemId('');
        setEntryQty(1);
        setEntryPrice('');
        setEntryDesc('');
        setFieldErrors({});
        setTimeout(() => itemSelectRef.current?.focus(), 50);
    }, [entryItemId, entryQty, entryPrice, entryDesc, items, t]);

    const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));
    const editLine = (i: number) => {
        const l = lines[i];
        setEntryItemId(l.itemId);
        setEntryQty(l.quantity);
        setEntryPrice(l.price);
        setEntryDesc(l.description);
        removeLine(i);
        setTimeout(() => qtyRef.current?.focus(), 50);
    };

    const handleSubmit = async (approve = false) => {
        setErrorMsg('');
        const errors: Record<string, string> = {};
        if (!form.supplierId) errors.supplierId = t('يرجى اختيار المورد');
        if (!form.warehouseId) errors.warehouseId = t('يرجى اختيار المخزن');
        if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
        if (lines.length === 0) { setErrorMsg(t('يرجى إضافة صنف واحد على الأقل')); return; }

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
                    taxRate: Number(form.taxRate),
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

            // If approve directly, send approve request
            if (approve) {
                await fetch(`/api/purchase-orders/${created.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'approved' }),
                });
            }

            router.push('/purchase-orders');
        } catch { setErrorMsg(t('خطأ في الاتصال')); } finally { setSubmitting(false); }
    };

    if (loading) return <DashboardLayout><ContentSkeleton /></DashboardLayout>;

    const SCStyle: React.CSSProperties = {
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    };
    const STitleStyle: React.CSSProperties = {
        fontSize: '13px', fontWeight: 600,
        color: C.primary, marginBottom: '16px',
        display: 'flex', alignItems: 'center', gap: '8px',
        fontFamily: CAIRO,
    };

    const InlineError = ({ field }: { field: string }) => {
        if (!fieldErrors[field]) return null;
        return (
            <div style={{
                position: 'absolute', top: '-32px', insetInlineStart: '4px',
                fontSize: '11px', color: '#fff', fontWeight: 600,
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                padding: '4px 10px', borderRadius: '8px', pointerEvents: 'none', zIndex: 100,
                boxShadow: '0 10px 15px -3px rgba(185,28,28,0.4)',
                display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
                animation: 'inlineErrorPush 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
                <AlertCircle size={12} strokeWidth={3} />
                {fieldErrors[field]}
                <div style={{ position: 'absolute', bottom: '-4px', insetInlineStart: '12px', width: '8px', height: '8px', background: '#b91c1c', transform: 'rotate(45deg)', borderRadius: '1px' }} />
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '30px', paddingTop: THEME.header.pt, fontFamily: CAIRO }}>
                <PageHeader
                    title={t('أمر شراء جديد')}
                    subtitle={t('إنشاء أمر شراء جديد وإرساله للمورد')}
                    icon={ShoppingBag}
                    backUrl="/purchase-orders"
                />

                {errorMsg && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '12px 16px', marginBottom: '16px',
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: 600,
                    }}>
                        <AlertCircle size={16} /> {errorMsg}
                    </div>
                )}

                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px', alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                        {/* Basic Info */}
                        <div style={SCStyle}>
                            <div style={{ ...STitleStyle, color: '#256af4' }}><ShoppingBag size={12} /> {t('بيانات أمر الشراء')}</div>
                            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="mobile-hide">
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('رقم الأمر')}</label>
                                    <div style={{ height: '42px', borderRadius: '10px', background: 'rgba(37,106,244,0.08)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: OUTFIT, fontWeight: 600, fontSize: '13px', color: '#60a5fa', letterSpacing: '1px' }}>
                                        {`PO-${String(nextNum).padStart(5, '0')}`}
                                    </div>
                                </div>
                                <div>
                                    <label style={LS}>{t('المورد')} <span style={{ color: C.danger }}>*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <CustomSelect
                                            value={form.supplierId}
                                            onChange={v => { setForm(f => ({ ...f, supplierId: v })); clearError('supplierId'); }}
                                            icon={Search}
                                            placeholder={t('ابحث واختر المورد...')}
                                            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                        />
                                        <InlineError field="supplierId" />
                                    </div>
                                </div>
                                <div>
                                    <label style={LS}>{t('المخزن')} <span style={{ color: C.danger }}>*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <CustomSelect
                                            value={form.warehouseId}
                                            onChange={v => { setForm(f => ({ ...f, warehouseId: v })); if (typeof window !== 'undefined') localStorage.setItem('last_warehouse_id', v); clearError('warehouseId'); }}
                                            icon={Search}
                                            hideSearch
                                            placeholder={t('اختر المخزن...')}
                                            options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                                        />
                                        <InlineError field="warehouseId" />
                                    </div>
                                </div>
                                <div>
                                    <label style={LS}>{t('تاريخ الأمر')}</label>
                                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...IS }} onFocus={focusIn} onBlur={focusOut} className="blue-date-icon" />
                                </div>
                                <div>
                                    <label style={LS}>{t('تاريخ التسليم المتوقع')}</label>
                                    <input type="date" value={form.expectedDeliveryDate} onChange={e => setForm(f => ({ ...f, expectedDeliveryDate: e.target.value }))} style={{ ...IS }} onFocus={focusIn} onBlur={focusOut} className="blue-date-icon" />
                                </div>
                                {isContracting && projects.length > 0 && (
                                    <div>
                                        <label style={LS}>{t('المشروع (اختياري)')}</label>
                                        <CustomSelect
                                            value={form.projectId}
                                            onChange={v => setForm(f => ({ ...f, projectId: v }))}
                                            icon={Search}
                                            placeholder={t('اختر المشروع...')}
                                            options={[{ value: '', label: t('بدون مشروع') }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Lines */}
                        <div style={SCStyle}>
                            <div style={{ ...STitleStyle, color: '#256af4' }}><Package size={12} /> {t('الأصناف')}</div>

                            {/* Entry Row */}
                            <div className="item-entry-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 110px 110px 44px', gap: '10px', alignItems: 'end', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('الصنف')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <CustomSelect
                                            ref={itemSelectRef}
                                            value={entryItemId}
                                            onChange={v => { setEntryItemId(v); clearError('entryItemId'); }}
                                            icon={Search}
                                            placeholder={t('اختر الصنف...')}
                                            options={items.map(i => ({ value: i.id, label: i.name, sub: i.code }))}
                                        />
                                        <InlineError field="entryItemId" />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('وصف (اختياري)')}</label>
                                    <input
                                        value={entryDesc}
                                        onChange={e => setEntryDesc(e.target.value)}
                                        placeholder={t('وصف...')}
                                        style={{ ...IS, height: '38px' }}
                                        onFocus={focusIn} onBlur={focusOut}
                                    />
                                </div>
                                <div>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('الكمية')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <PriceInput
                                            ref={qtyRef}
                                            value={entryQty}
                                            onChange={val => { setEntryQty(val); clearError('entryQty'); }}
                                            disabled={!entryItemId}
                                            style={{ height: '38px', opacity: !entryItemId ? 0.5 : 1 }}
                                            textAlign="center"
                                            onFocus={e => (e.target as HTMLInputElement).select()}
                                            onKeyDown={e => { if (e.key === 'Enter') priceRef.current?.focus(); }}
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
                                            style={{ height: '38px', opacity: !entryItemId ? 0.5 : 1 }}
                                            textAlign="center"
                                            onFocus={e => (e.target as HTMLInputElement).select()}
                                            onKeyDown={e => { if (e.key === 'Enter') { addLine(); setTimeout(() => itemSelectRef.current?.focus(), 50); } }}
                                        />
                                        <InlineError field="entryPrice" />
                                    </div>
                                </div>
                                <button
                                    onClick={addLine}
                                    disabled={!entryItemId}
                                    style={{ height: '38px', borderRadius: '10px', border: 'none', background: !entryItemId ? 'rgba(37,106,244,0.3)' : C.primary, color: '#fff', cursor: !entryItemId ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px' }}
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            {/* Lines Table */}
                            <div className="table-container">
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: C.subtle, borderBottom: `1px solid ${C.border}` }}>
                                            {[t('الصنف'), t('الوصف'), t('الكمية'), t('الوحدة'), t('السعر'), t('الخصم'), t('الإجمالي'), ''].map((h, i) => (
                                                <th key={i} style={{ textAlign: i === 0 ? 'start' : 'center', padding: '12px', fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((l, i) => (
                                            <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                                                <td style={{ padding: '12px', color: C.textPrimary, fontWeight: 700, fontFamily: CAIRO }}>
                                                    {l.itemName}
                                                    <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: OUTFIT }}>{l.itemCode}</div>
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontSize: '12px' }}>{l.description || '—'}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', color: C.textPrimary, fontWeight: 700, fontFamily: OUTFIT }}>{formatNumber(l.quantity)}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontSize: '12px' }}>{l.unit || '—'}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontFamily: OUTFIT }}>{formatNumber(l.price)}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', color: C.textSecondary, fontFamily: OUTFIT }}>{formatNumber(l.discount)}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', color: C.primary, fontWeight: 700, fontFamily: OUTFIT }}>{formatNumber(l.total)}</td>
                                                <td style={{ padding: '12px' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button onClick={() => editLine(i)} style={{ color: C.primary, background: 'none', border: 'none', cursor: 'pointer' }}><Pencil size={14} /></button>
                                                        <button onClick={() => removeLine(i)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={15} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {lines.length === 0 && (
                                            <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: C.textMuted, fontSize: '12px' }}>{t('لا توجد أصناف مضافة')}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Notes */}
                        <div style={SCStyle}>
                            <label style={{ ...LS, fontSize: '11px' }}>{t('ملاحظات')}</label>
                            <textarea
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                style={{ ...IS, height: '80px', padding: '10px', resize: 'none' }}
                                placeholder={t('أدخل أي ملاحظات هنا...')}
                                onFocus={focusIn} onBlur={focusOut}
                            />
                        </div>
                    </div>

                    {/* Summary Sidebar */}
                    <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={SCStyle}>
                            <div style={{ ...STitleStyle, color: '#256af4' }}>{t('ملخص أمر الشراء')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0' }}>
                                    <span style={{ color: C.textSecondary }}>{t('الإجمالي قبل الضريبة')}</span>
                                    <span style={{ color: C.textPrimary, fontWeight: 700 }}>{fMoneyJSX(subtotal)}</span>
                                </div>

                                <div style={{ background: C.subtle, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 12px' }}>
                                    <label style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 700, display: 'block', marginBottom: '6px' }}>{t('نسبة الضريبة %')}</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={form.taxRate}
                                            onChange={e => setForm(f => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))}
                                            style={{ ...IS, height: '34px', fontSize: '13px', flex: 1 }}
                                            onFocus={focusIn} onBlur={focusOut}
                                        />
                                        <span style={{ color: '#60a5fa', fontWeight: 600, fontSize: '14px' }}>%</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0' }}>
                                    <span style={{ color: C.textSecondary }}>{t('مبلغ الضريبة')}</span>
                                    <span style={{ color: '#fbbf24', fontWeight: 700 }}>{fMoneyJSX(taxAmount)}</span>
                                </div>

                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'linear-gradient(135deg, rgba(37,106,244,0.12), rgba(37,106,244,0.05))',
                                    padding: '10px 14px', borderRadius: '12px', marginTop: '4px',
                                    border: `1px solid rgba(37,106,244,0.3)`,
                                }}>
                                    <span style={{ color: C.textSecondary, fontWeight: 600, fontSize: '13px' }}>{t('الإجمالي النهائي')}</span>
                                    <span style={{ color: C.primary, fontWeight: 600, fontSize: '17px', fontFamily: OUTFIT }}>{fMoneyJSX(grandTotal)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                style={{ width: '100%', height: '52px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: C.primary, boxShadow: '0 8px 25px -5px rgba(37,106,244,0.4)', border: 'none', borderRadius: '14px', opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: CAIRO, color: '#fff' }}
                            >
                                {submitting ? <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} /> : <><CheckCircle size={18} /> {t('حفظ كمسودة')}</>}
                            </button>
                            <button
                                onClick={() => handleSubmit(true)}
                                disabled={submitting}
                                style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.06)', color: '#4ade80', fontSize: '13px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: CAIRO, opacity: submitting ? 0.5 : 1 }}
                            >
                                <CheckCircle size={16} /> {t('اعتماد مباشرة')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes inlineErrorPush { 0% { transform: translateY(10px) scale(0.9); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
                .blue-date-icon::-webkit-calendar-picker-indicator { cursor: pointer; filter: invert(41%) sepia(34%) saturate(3000%) hue-rotate(190deg) brightness(100%) contrast(100%); }
            `}</style>
        </DashboardLayout>
    );
}
