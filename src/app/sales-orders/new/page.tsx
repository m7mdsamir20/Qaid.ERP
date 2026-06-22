'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { formatNumber } from '@/lib/currency';
import {
    C, CAIRO, OUTFIT, IS, LS, SC, STitle, BTN_PRIMARY, BTN_SUCCESS,
    focusIn, focusOut,
} from '@/constants/theme';
import {
    ShoppingBag, Plus, Trash2, Package, Info, Loader2, X, Save, CheckCircle,
} from 'lucide-react';

interface Customer { id: string; name: string; phone?: string; }
interface Warehouse { id: string; name: string; }
interface Item { id: string; code: string; name: string; sellPrice: number; unit?: any; stocks?: any[]; }
interface SalesRep { id: string; name: string; }
interface Project { id: string; name: string; projectNumber: string; }

interface OrderLine {
    itemId: string;
    itemName: string;
    unit: string;
    description: string;
    quantity: number;
    price: number;
    discount: number;
    total: number;
    stock: number;
}

const getUnitName = (u: any) => !u ? '' : typeof u === 'string' ? u : (u.name || u.nameEn || '');

export default function NewSalesOrderPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { data: session } = useSession();
    const { fMoneyJSX } = useCurrency();

    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isContracting = businessType === 'CONTRACTING';

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    const [nextNum, setNextNum] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [form, setForm] = useState({
        customerId: '',
        warehouseId: '',
        salesRepId: '',
        projectId: '',
        date: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        notes: '',
        taxRate: 0,
        discount: 0,
    });

    const [lines, setLines] = useState<OrderLine[]>([]);

    // Line entry state
    const [entryItemId, setEntryItemId] = useState('');
    const [entryDescription, setEntryDescription] = useState('');
    const [entryQty, setEntryQty] = useState<number | ''>(1);
    const [entryPrice, setEntryPrice] = useState<number | ''>(0);
    const [entryDiscount, setEntryDiscount] = useState<number | ''>(0);
    const [entryStock, setEntryStock] = useState<number | null>(null);

    const itemSelectRef = useRef<any>(null);
    const qtyRef = useRef<HTMLInputElement>(null);

    // Totals
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const discountAmt = parseFloat(String(form.discount)) || 0;
    const afterDiscount = Math.max(0, subtotal - discountAmt);
    const taxAmount = afterDiscount * ((parseFloat(String(form.taxRate)) || 0) / 100);
    const total = afterDiscount + taxAmount;

    const loadData = useCallback(async () => {
        try {
            const [custR, whR, itemR, repR, nextR] = await Promise.all([
                fetch('/api/customers'),
                fetch('/api/warehouses'),
                fetch('/api/items?all=true'),
                fetch('/api/sales-reps'),
                fetch('/api/sales-orders?nextNum=1'),
            ]);
            const nextData = await nextR.json();
            setNextNum(nextData.nextNum || 1);
            const custData = await custR.json();
            setCustomers(Array.isArray(custData) ? custData : []);

            const whData = await whR.json();
            const whs = Array.isArray(whData) ? whData : [];
            setWarehouses(whs);
            if (whs.length > 0) setForm(f => ({ ...f, warehouseId: whs[0].id }));

            const itemData = await itemR.json();
            setItems(Array.isArray(itemData) ? itemData : (itemData.items || []));

            const repData = await repR.json();
            setSalesReps(Array.isArray(repData) ? repData : []);

            if (isContracting) {
                const projR = await fetch('/api/projects');
                if (projR.ok) {
                    const projData = await projR.json();
                    setProjects(Array.isArray(projData) ? projData : (projData.projects || []));
                }
            }
        } catch (e) {
            console.error('Failed to load data:', e);
        } finally {
            setLoading(false);
        }
    }, [isContracting]);

    useEffect(() => { loadData(); }, [loadData]);

    // Auto-set price when item selected
    useEffect(() => {
        if (!entryItemId) return;
        const item = items.find(i => i.id === entryItemId);
        if (item) {
            setEntryPrice(item.sellPrice);
            setTimeout(() => { qtyRef.current?.focus(); qtyRef.current?.select(); }, 50);
        }
    }, [entryItemId, items]);

    // Update stock for selected item + warehouse
    useEffect(() => {
        if (!entryItemId || !form.warehouseId) { setEntryStock(null); return; }
        const item = items.find(i => i.id === entryItemId);
        if (item) {
            const stock = item.stocks?.find((s: any) => s.warehouseId === form.warehouseId)?.quantity || 0;
            setEntryStock(stock);
        }
    }, [entryItemId, form.warehouseId, items]);

    const addLine = () => {
        if (!entryItemId) return;
        const item = items.find(i => i.id === entryItemId);
        if (!item) return;
        const qty = Number(entryQty) || 0;
        const price = Number(entryPrice) || 0;
        const disc = Number(entryDiscount) || 0;
        if (qty <= 0) return;

        const lineTotal = Math.max(0, qty * price - disc);
        const stock = item.stocks?.find((s: any) => s.warehouseId === form.warehouseId)?.quantity || 0;

        setLines(prev => [...prev, {
            itemId: item.id,
            itemName: item.name,
            unit: getUnitName(item.unit),
            description: entryDescription,
            quantity: qty,
            price,
            discount: disc,
            total: lineTotal,
            stock,
        }]);

        setEntryItemId('');
        setEntryDescription('');
        setEntryQty(1);
        setEntryPrice(0);
        setEntryDiscount(0);
        setEntryStock(null);
        setTimeout(() => { itemSelectRef.current?.focus?.(); }, 50);
    };

    const removeLine = (idx: number) => {
        setLines(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (action: 'save' | 'approve') => {
        setErrorMsg('');
        if (lines.length === 0) { setErrorMsg(t('يرجى إضافة صنف واحد على الأقل')); return; }

        setSubmitting(true);
        try {
            const res = await fetch('/api/sales-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    customerId: form.customerId || null,
                    warehouseId: form.warehouseId || null,
                    salesRepId: form.salesRepId || null,
                    projectId: form.projectId || null,
                    taxRate: parseFloat(String(form.taxRate)) || 0,
                    discount: parseFloat(String(form.discount)) || 0,
                    lines: lines.map(l => ({
                        itemId: l.itemId,
                        description: l.description || null,
                        quantity: l.quantity,
                        price: l.price,
                        discount: l.discount,
                        unit: l.unit || null,
                    })),
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                setErrorMsg(err.error || t('حدث خطأ'));
                return;
            }

            const order = await res.json();

            // If approve is requested, send approve action
            if (action === 'approve') {
                const appRes = await fetch(`/api/sales-orders/${order.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'approve' }),
                });
                if (!appRes.ok) {
                    router.push(`/sales-orders/${order.id}`);
                    return;
                }
            }

            router.push(`/sales-orders/${order.id}`);
        } catch (e) {
            setErrorMsg(t('حدث خطأ في الاتصال'));
        } finally {
            setSubmitting(false);
        }
    };

    const fmt = (n: number) => formatNumber(Number(n || 0));

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                    <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', fontFamily: CAIRO }}>
                <PageHeader
                    title={t('أمر بيع جديد')}
                    subtitle={t('إنشاء أمر بيع جديد للعميل')}
                    icon={ShoppingBag}
                    backUrl="/sales-orders"
                />

                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px', alignItems: 'start' }}>

                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                        {/* Order Info */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: C.primary }}><Info size={12} /> {t('معلومات الأمر')}</div>
                            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {/* Order Number Badge */}
                                <div className="mobile-hide">
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('رقم الأمر')}</label>
                                    <div style={{ height: '42px', borderRadius: '10px', background: 'rgba(37,106,244,0.08)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: OUTFIT, fontWeight: 600, fontSize: '13px', color: '#60a5fa', letterSpacing: '1px' }}>
                                        {`SO-${String(nextNum).padStart(5, '0')}`}
                                    </div>
                                </div>
                                {/* Customer */}
                                <div>
                                    <label style={LS}>{t('العميل')}</label>
                                    <CustomSelect
                                        value={form.customerId}
                                        onChange={v => setForm(f => ({ ...f, customerId: v }))}
                                        options={customers.map(c => ({ value: c.id, label: c.name, sub: c.phone }))}
                                        placeholder={t('اختر العميل')}
                                        icon={Info}
                                    />
                                </div>

                                {/* Warehouse */}
                                <div>
                                    <label style={LS}>{t('المخزن')} <span style={{ color: C.danger }}>*</span></label>
                                    <CustomSelect
                                        value={form.warehouseId}
                                        onChange={v => setForm(f => ({ ...f, warehouseId: v }))}
                                        options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                                        placeholder={t('اختر المخزن')}
                                        icon={Package}
                                    />
                                </div>

                                {/* Date */}
                                <div>
                                    <label style={LS}>{t('تاريخ الأمر')} <span style={{ color: C.danger }}>*</span></label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                        style={IS}
                                        onFocus={focusIn} onBlur={focusOut}
                                    />
                                </div>

                                {/* Expected Delivery */}
                                <div>
                                    <label style={LS}>{t('تاريخ التسليم المتوقع')}</label>
                                    <input
                                        type="date"
                                        value={form.expectedDeliveryDate}
                                        onChange={e => setForm(f => ({ ...f, expectedDeliveryDate: e.target.value }))}
                                        style={IS}
                                        onFocus={focusIn} onBlur={focusOut}
                                    />
                                </div>

                                {/* Sales Rep */}
                                {salesReps.length > 0 && (
                                    <div>
                                        <label style={LS}>{t('مندوب المبيعات')}</label>
                                        <CustomSelect
                                            value={form.salesRepId}
                                            onChange={v => setForm(f => ({ ...f, salesRepId: v }))}
                                            options={salesReps.map(r => ({ value: r.id, label: r.name }))}
                                            placeholder={t('اختر المندوب')}
                                        />
                                    </div>
                                )}

                                {/* Project (Contracting only) */}
                                {isContracting && (
                                    <div>
                                        <label style={LS}>{t('المشروع')}</label>
                                        <CustomSelect
                                            value={form.projectId}
                                            onChange={v => setForm(f => ({ ...f, projectId: v }))}
                                            options={projects.map(p => ({ value: p.id, label: p.name, sub: p.projectNumber }))}
                                            placeholder={t('اختر المشروع')}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div style={{ marginTop: '16px' }}>
                                <label style={LS}>{t('ملاحظات')}</label>
                                <textarea
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    rows={3}
                                    style={{ ...IS, height: 'auto', padding: '12px 16px', resize: 'vertical' }}
                                    placeholder={t('ملاحظات إضافية...')}
                                    onFocus={focusIn} onBlur={focusOut}
                                />
                            </div>
                        </div>

                        {/* Lines Section */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: C.primary }}><Package size={12} /> {t('الأصناف')}</div>

                            {/* Add Line Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto auto', gap: '8px', marginBottom: '16px', alignItems: 'end' }}>
                                <div>
                                    <label style={{ ...LS, marginBottom: '4px' }}>{t('الصنف')}</label>
                                    <CustomSelect
                                        ref={itemSelectRef}
                                        value={entryItemId}
                                        onChange={v => setEntryItemId(v)}
                                        options={items.map(i => ({ value: i.id, label: i.name, sub: i.code }))}
                                        placeholder={t('اختر صنف')}
                                    />
                                </div>
                                <div>
                                    <label style={{ ...LS, marginBottom: '4px' }}>{t('الكمية')}</label>
                                    <input
                                        ref={qtyRef}
                                        type="number"
                                        value={entryQty}
                                        onChange={e => setEntryQty(e.target.value === '' ? '' : Number(e.target.value))}
                                        style={{ ...IS, width: '80px' }}
                                        min="0.01" step="0.01"
                                        onFocus={e => e.target.select()} onBlur={focusOut}
                                    />
                                </div>
                                <div>
                                    <label style={{ ...LS, marginBottom: '4px' }}>{t('السعر')}</label>
                                    <input
                                        type="number"
                                        value={entryPrice}
                                        onChange={e => setEntryPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                        style={{ ...IS, width: '100px' }}
                                        min="0" step="0.01"
                                        onFocus={e => e.target.select()} onBlur={focusOut}
                                    />
                                </div>
                                <div>
                                    <label style={{ ...LS, marginBottom: '4px' }}>{t('الخصم')}</label>
                                    <input
                                        type="number"
                                        value={entryDiscount}
                                        onChange={e => setEntryDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                                        style={{ ...IS, width: '80px' }}
                                        min="0" step="0.01"
                                        onFocus={e => e.target.select()} onBlur={focusOut}
                                    />
                                </div>
                                <div>
                                    <label style={{ ...LS, marginBottom: '4px', opacity: 0 }}>{t('إضافة')}</label>
                                    {entryStock !== null && (
                                        <div style={{ fontSize: '11px', color: entryStock > 0 ? C.success : C.danger, marginBottom: '2px', fontFamily: OUTFIT }}>
                                            {t('المتاح')}: {entryStock}
                                        </div>
                                    )}
                                    <button
                                        onClick={addLine}
                                        disabled={!entryItemId || Number(entryQty) <= 0}
                                        style={{
                                            height: '42px', padding: '0 16px', borderRadius: '10px',
                                            background: entryItemId ? C.primary : 'rgba(37,106,244,0.15)',
                                            color: entryItemId ? '#fff' : C.textMuted,
                                            border: 'none', cursor: entryItemId ? 'pointer' : 'not-allowed',
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            fontFamily: CAIRO, fontSize: '13px', fontWeight: 600,
                                        }}
                                    >
                                        <Plus size={16} /> {t('إضافة')}
                                    </button>
                                </div>
                            </div>

                            {/* Description row */}
                            {entryItemId && (
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={LS}>{t('وصف البند')}</label>
                                    <input
                                        type="text"
                                        value={entryDescription}
                                        onChange={e => setEntryDescription(e.target.value)}
                                        style={IS}
                                        placeholder={t('وصف اختياري...')}
                                        onFocus={focusIn} onBlur={focusOut}
                                    />
                                </div>
                            )}

                            {/* Lines Table */}
                            {lines.length > 0 && (
                                <div className="scroll-table" style={{ borderRadius: '12px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `2px solid ${C.border}` }}>
                                            <tr>
                                                {['الصنف', 'الوصف', 'الكمية', 'الوحدة', 'السعر', 'الخصم', 'الإجمالي', ''].map((h, i) => (
                                                    <th key={i} style={{ padding: '12px 16px', textAlign: 'start', fontSize: '11px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>
                                                        {t(h)}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((line, idx) => (
                                                <tr key={idx} style={{ borderBottom: idx === lines.length - 1 ? 'none' : `1px solid ${C.border}44` }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, fontSize: '13px' }}>
                                                        {line.itemName}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', color: C.textSecondary, fontSize: '12px', maxWidth: '140px' }}>
                                                        {line.description || '—'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontFamily: OUTFIT, fontWeight: 600, color: C.textPrimary }}>
                                                        {line.quantity}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', color: C.textSecondary, fontSize: '12px' }}>
                                                        {line.unit || '—'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontFamily: OUTFIT, fontWeight: 600, color: C.textSecondary }}>
                                                        {fmt(line.price)}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontFamily: OUTFIT, fontWeight: 600, color: C.danger, fontSize: '12px' }}>
                                                        {line.discount > 0 ? `-${fmt(line.discount)}` : '—'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontFamily: OUTFIT, fontWeight: 700, color: C.primary, fontSize: '14px' }}>
                                                        {fmt(line.total)}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <button
                                                            onClick={() => removeLine(idx)}
                                                            style={{ width: '28px', height: '28px', borderRadius: '8px', border: `1px solid ${C.danger}40`, background: 'transparent', color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'sticky', top: '20px' }}>
                        {/* Totals */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: C.primary }}><Info size={12} /> {t('الإجمالي')}</div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('الإجمالي الفرعي')}</span>
                                    <span style={{ fontFamily: OUTFIT, fontWeight: 600, color: C.textPrimary }}>{fmt(subtotal)}</span>
                                </div>

                                {/* Discount */}
                                <div>
                                    <label style={{ ...LS, marginBottom: '6px' }}>{t('الخصم الإجمالي')}</label>
                                    <input
                                        type="number"
                                        value={form.discount}
                                        onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) || 0 }))}
                                        style={{ ...IS, width: '100%' }}
                                        min="0" step="0.01"
                                        onFocus={focusIn} onBlur={focusOut}
                                    />
                                </div>

                                {/* Tax Rate */}
                                <div>
                                    <label style={{ ...LS, marginBottom: '6px' }}>{t('نسبة الضريبة %')}</label>
                                    <input
                                        type="number"
                                        value={form.taxRate}
                                        onChange={e => setForm(f => ({ ...f, taxRate: Number(e.target.value) || 0 }))}
                                        style={{ ...IS, width: '100%' }}
                                        min="0" max="100" step="0.01"
                                        onFocus={focusIn} onBlur={focusOut}
                                    />
                                </div>

                                {taxAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span style={{ color: C.textSecondary }}>{t('الضريبة')} ({form.taxRate}%)</span>
                                        <span style={{ fontFamily: OUTFIT, fontWeight: 600, color: C.primary }}>+{fmt(taxAmount)}</span>
                                    </div>
                                )}

                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: `linear-gradient(135deg, rgba(37,106,244,0.12), rgba(37,106,244,0.05))`,
                                    padding: '12px 16px', borderRadius: '12px',
                                    border: `1px solid rgba(37,106,244,0.3)`,
                                }}>
                                    <span style={{ color: C.textSecondary, fontWeight: 600, fontSize: '13px', fontFamily: CAIRO }}>{t('الإجمالي الكلي')}</span>
                                    <span style={{ color: C.primary, fontWeight: 700, fontSize: '18px', fontFamily: OUTFIT }}>{fmt(total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Error */}
                        {errorMsg && (
                            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, color: C.danger, fontSize: '13px', fontFamily: CAIRO }}>
                                {errorMsg}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                onClick={() => handleSubmit('save')}
                                disabled={submitting}
                                style={BTN_PRIMARY(false, submitting)}
                            >
                                {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                                {t('حفظ كمسودة')}
                            </button>
                            <button
                                onClick={() => handleSubmit('approve')}
                                disabled={submitting}
                                style={BTN_SUCCESS(false, submitting)}
                            >
                                {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={18} />}
                                {t('اعتماد الأمر')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
