'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FileText, Plus, Trash2, Package, Printer, Info, Loader2, Search, X, ArrowRight, Pencil, Banknote, Building2, Camera, CheckCircle, AlertCircle, ShoppingCart, User, Phone, UserPlus, Percent } from 'lucide-react';
import { THEME, C, CAIRO, INTER, IS, LS, focusIn, focusOut } from '@/constants/theme';
import { printQuotation, CompanyInfo } from '@/lib/printInvoices';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import { useCurrency } from '@/hooks/useCurrency';

interface Customer { id: string; name: string; phone?: string; balance: number; }
interface Item { id: string; code: string; name: string; sellPrice: number; description?: string; unit: any; }
interface QuotationLine { itemId: string; itemCode: string; itemName: string; unit: string; quantity: number; price: number; total: number; description?: string; taxRate?: number; taxAmount?: number; }

const fmt = (v: any) => {
    if (v === '' || v === undefined || v === null) return '';
    const s = v.toString().replace(/,/g, '');
    const parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join('.');
};

const SC: React.CSSProperties = { background: C.card, borderRadius: '15px', border: `1px solid ${C.border}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' };
const STitle: React.CSSProperties = { fontSize: '13px', fontWeight: 800, color: C.textMuted, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' };

export default function NewQuotationPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { data: session } = useSession();
    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';
    const { symbol: cSymbol } = useCurrency();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [company, setCompany] = useState<CompanyInfo>({});
    const [nextNum, setNextNum] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const itemSelectRef = useRef<any>(null);
    const qtyRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);

    const [lines, setLines] = useState<QuotationLine[]>([]);
    const [entryItemId, setEntryItemId] = useState('');
    const [entryDescription, setEntryDescription] = useState('');
    const [entryQty, setEntryQty] = useState<number | ''>(1);
    const [entryPrice, setEntryPrice] = useState<number | ''>(0);

    const [form, setForm] = useState<any>({
        customerId: '',
        date: new Date().toISOString().split('T')[0],
        discountPct: 0,
        discountAmt: 0,
        notes: '',
        taxRate: 0,
    });

    const [taxSettings, setTaxSettings] = useState<any>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [custRes, itemRes, numRes, settingsRes, comRes] = await Promise.all([
                fetch('/api/customers'),
                fetch('/api/items?all=true'),
                fetch('/api/quotations?justNextNum=true'),
                fetch('/api/settings'),
                fetch('/api/company')
            ]);
            if (custRes.ok) setCustomers(await custRes.json());
            if (itemRes.ok) {
                const itemData = await itemRes.json();
                setItems(Array.isArray(itemData) ? itemData : (itemData.items || []));
            }
            if (numRes.ok) {
                const data = await numRes.json();
                setNextNum(data.nextNum);
            }
            if (comRes.ok) {
                setCompany(await comRes.json());
            }
            if (settingsRes.ok) {
                const setts = await settingsRes.json();
                const rawTax = setts.company?.taxSettings;
                const taxS = rawTax ? (typeof rawTax === 'string' ? JSON.parse(rawTax) : rawTax) : null;
                setTaxSettings(taxS);
                if (taxS?.enabled) {
                    setForm((f: any) => ({ ...f, taxRate: taxS.rate }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    
    // Sync discounts
    const updateDiscount = (val: number, type: 'pct' | 'amt') => {
        if (type === 'pct') {
            const amt = subtotal * (val / 100);
            setForm((prev: any) => ({ ...prev, discountPct: val, discountAmt: amt }));
        } else {
            const pct = subtotal > 0 ? (val / subtotal) * 100 : 0;
            setForm((prev: any) => ({ ...prev, discountAmt: val, discountPct: pct }));
        }
    };

    const afterDisc = Math.max(0, subtotal - (form.discountAmt || 0));

    let taxAmount = 0;
    if (taxSettings?.enabled) {
        if (taxSettings.isInclusive) {
            taxAmount = afterDisc - (afterDisc / (1 + form.taxRate / 100));
        } else {
            taxAmount = afterDisc * (form.taxRate / 100);
        }
    }
    const finalTotal = taxSettings?.isInclusive ? afterDisc : (afterDisc + taxAmount);

    const addLine = useCallback(() => {
        if (!entryItemId) return;
        const item = items.find(it => it.id === entryItemId);
        if (!item) return;

        const qty = Number(entryQty || 1);
        const price = Number(entryPrice || 0);

        setLines(prev => {
            const idx = prev.findIndex(l => l.itemId === item.id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = {
                    ...updated[idx],
                    quantity: updated[idx].quantity + qty,
                    price: price || updated[idx].price,
                    total: (updated[idx].quantity + qty) * (price || updated[idx].price)
                };
                return updated;
            }
            return [...prev, {
                itemId: item.id,
                itemCode: item.code,
                itemName: item.name,
                unit: typeof item.unit === 'string' ? item.unit : (item.unit?.name || ''),
                quantity: qty,
                price: price,
                total: qty * price,
                description: entryDescription || item.description,
                taxRate: form.taxRate,
                taxAmount: 0
            }];
        });

        setEntryItemId('');
        setEntryDescription('');
        setEntryQty(1);
        setEntryPrice(0);
        setTimeout(() => itemSelectRef.current?.focus(), 50);
    }, [entryItemId, entryQty, entryPrice, entryDescription, items, form.taxRate]);

    const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
    const editLine = (i: number) => {
        const line = lines[i];
        setEntryItemId(line.itemId);
        setEntryQty(line.quantity);
        setEntryPrice(line.price);
        setEntryDescription(line.description || '');
        setLines(prev => prev.filter((_, idx) => idx !== i));
        setTimeout(() => qtyRef.current?.focus(), 50);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (lines.length === 0) return alert(t('يجب إضافة صنف واحد على الأقل'));
        if (!form.customerId) return alert(t('برجاء اختيار عميل'));

        setSubmitting(true);
        try {
            const body = {
                ...form,
                taxInclusive: !!taxSettings?.isInclusive,
                taxLabel: taxSettings?.label || 'الضريبة',
                subtotal,
                taxAmount,
                total: finalTotal,
                lines: lines.map(l => ({
                    ...l,
                    taxAmount: l.taxRate ? (l.total * (l.taxRate / 100)) : 0
                }))
            };
            const res = await fetch('/api/quotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                const savedQuotation = await res.json();
                const branches = (session?.user as any)?.branches || [];
                const branchName = branches.length > 1 ? (session?.user as any)?.activeBranchName : undefined;
                const co: CompanyInfo = { ...company, branchName, businessType: (session?.user as any)?.businessType || company.businessType };
                printQuotation({ ...savedQuotation, customer: customers.find(c => c.id === form.customerId) }, co);
                router.push('/quotations');
            } else {
                const err = await res.json();
                alert(err.error || t('فشل حفظ عرض السعر'));
            }
        } catch (error) {
            alert(t('خطأ في الاتصال'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: C.primary }} />
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ background: C.bg, minHeight: '100%', fontFamily: CAIRO, paddingBottom: '80px' }}>
                <PageHeader 
                    title={t("إنشاء عرض سعر")}
                    subtitle={`${t("قم بتجهيز عرض سعر احترافي لعملائك برقم")} QUO-${String(nextNum).padStart(5, '0')}`}
                    icon={FileText}
                    backUrl="/quotations"
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', padding: '0 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Basic Info */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: '#3b82f6' }}><Info size={12} /> {t('بيانات العرض الأساسية')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 150px', gap: '15px' }}>
                                <div>
                                    <label style={LS}>{t('رقم العرض')}</label>
                                    <div style={{ height: '42px', borderRadius: '10px', background: 'rgba(59,130,244,0.1)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: INTER, fontWeight: 900, color: C.primary, letterSpacing: '0.5px' }}>
                                        QUO-{String(nextNum).padStart(5, '0')}
                                    </div>
                                </div>
                                <div>
                                    <label style={LS}>{t('العميل')}</label>
                                    <CustomSelect 
                                        options={customers.map(c => ({ value: c.id, label: c.name }))}
                                        placeholder={t("اختر عميل...")}
                                        value={form.customerId}
                                        onChange={(val: any) => setForm({ ...form, customerId: val })}
                                        icon={Search}
                                    />
                                </div>
                                <div>
                                    <label style={LS}>{t('التاريخ')}</label>
                                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ ...IS, fontFamily: INTER }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>
                        </div>

                        {/* Items Selection */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: '#3b82f6' }}><Package size={12} /> {isServices ? t('إضافة الخدمات') : t('اضافة الاصناف')}</div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ ...LS, fontSize: '11px' }}>{isServices ? t("اسم الخدمة") : t("اسم الصنف")}</label>
                                    <CustomSelect 
                                        ref={itemSelectRef}
                                        options={items.map(it => ({ value: it.id, label: it.name, sub: it.code }))}
                                        placeholder={isServices ? t("ابحث باسم الخدمة...") : t("ابحث باسم الصنف أو الكود...")}
                                        value={entryItemId}
                                        onChange={(val: any) => {
                                            setEntryItemId(val);
                                            const item = items.find(it => it.id === val);
                                            if (item) {
                                                setEntryPrice(item.sellPrice);
                                                setEntryDescription(item.description || '');
                                            }
                                            setTimeout(() => qtyRef.current?.focus(), 50);
                                        }}
                                        icon={Search}
                                        onCreate={isServices ? (val) => {
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
                                    />
                                </div>
                                <div style={{ width: '100px' }}>
                                    <label style={{ ...LS, fontSize: '11px', textAlign: 'center' }}>{t('الكمية')}</label>
                                    <input ref={qtyRef} type="text" inputMode="decimal" disabled={!entryItemId} value={entryQty === '' ? '1' : fmt(entryQty)} onChange={e => {
                                        const v = e.target.value.replace(/,/g, '');
                                        if (v === '' || !isNaN(Number(v)) || v === '.') setEntryQty(v === '' ? '' : v as any);
                                    }} onKeyDown={e => e.key === 'Enter' && priceRef.current?.focus()} style={{ ...IS, textAlign: 'center', height: '42px', fontFamily: INTER, opacity: !entryItemId ? 0.5 : 1 }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div style={{ width: '120px' }}>
                                    <label style={{ ...LS, fontSize: '11px', textAlign: 'center' }}>{t('السعر')}</label>
                                    <input ref={priceRef} type="text" inputMode="decimal" disabled={!entryItemId} value={entryPrice === '' ? '0' : fmt(entryPrice)} onChange={e => {
                                        const v = e.target.value.replace(/,/g, '');
                                        if (v === '' || !isNaN(Number(v)) || v === '.') setEntryPrice(v === '' ? '' : v as any);
                                    }} onKeyDown={e => e.key === 'Enter' && addLine()} style={{ ...IS, textAlign: 'center', height: '42px', fontFamily: INTER, opacity: !entryItemId ? 0.5 : 1 }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <button type="button" onClick={addLine} disabled={!entryItemId} style={{ height: '42px', width: '60px', borderRadius: '10px', background: !entryItemId ? 'rgba(59,130,246,0.3)' : C.primary, color: '#fff', border: 'none', cursor: !entryItemId ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Plus size={22} />
                                </button>
                            </div>

                            {/* Lines Table */}
                            <div style={{ marginTop: '10px', overflowX: 'auto', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `2px solid ${C.border}` }}>
                                            <th style={{ padding: '12px', textAlign: 'start', fontSize: '12px', color: C.textMuted, fontWeight: 800 }}>{isServices ? t('الخدمة') : t('الصنف')}</th>
                                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: C.textMuted, width: '90px', fontWeight: 800 }}>{t('الكمية')}</th>
                                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: C.textMuted, width: '120px', fontWeight: 800 }}>{t('السعر')}</th>
                                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: C.textMuted, width: '120px', fontWeight: 800 }}>{t('الإجمالي')}</th>
                                            <th style={{ padding: '12px', width: '80px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((l, idx) => (
                                            <tr key={idx} style={{ borderBottom: `1px solid ${C.border}44`, background: 'rgba(0,0,0,0.1)' }}>
                                                <td style={{ padding: '12px' }}>
                                                    <div style={{ fontWeight: 700, color: C.textPrimary, fontSize: '14px' }}>{l.itemName}</div>
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center', fontFamily: INTER, fontWeight: 800, color: C.textPrimary }}>{l.quantity}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', fontFamily: INTER, color: C.textSecondary }}>{fmt(l.price)}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 900, fontFamily: INTER, color: C.primary, fontSize: '15px' }}>{fmt(l.total)}</td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button type="button" onClick={() => editLine(idx)} style={{ color: C.primary, border: 'none', background: 'none', cursor: 'pointer' }}><Pencil size={15} /></button>
                                                        <button type="button" onClick={() => removeLine(idx)} style={{ color: C.danger, border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {lines.length === 0 && (
                                            <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>{t('لم يتم إضافة أصناف بعد')}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Notes */}
                        <div style={SC}>
                            <div style={STitle}><FileText size={12} /> {t('ملاحظات وشروط العرض')}</div>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...IS, height: '100px', padding: '12px', fontSize: '14px' }} placeholder={t("اكتب أي ملاحظات أو شروط تود ظهورها في عرض السعر...")} />
                        </div>
                    </div>

                    {/* Summary Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ ...SC, position: 'sticky', top: '20px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, marginBottom: '10px', textAlign: 'center' }}>{t('ملخص عرض السعر')}</div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: C.textSecondary, fontSize: '14px' }}>
                                    <span>{t('المجموع الفرعي')}:</span>
                                    <span style={{ fontWeight: 800, fontFamily: INTER }}>{fmt(subtotal)}</span>
                                </div>

                                {/* Discount Section aligned with Sales Invoice */}
                                <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                                        <label style={{ ...LS, marginBottom: 0 }}>{t('الخصم')}</label>
                                        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '6px' }}>
                                            <Percent size={10} style={{ color: C.textMuted }} />
                                            <Banknote size={10} style={{ color: C.textMuted }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" inputMode="decimal" value={form.discountPct === 0 ? '' : fmt(form.discountPct)} 
                                                onChange={e => {
                                                    const v = e.target.value.replace(/,/g, '');
                                                    if (v === '' || !isNaN(Number(v)) || v === '.') updateDiscount(v === '' ? 0 : Number(v), 'pct');
                                                }} 
                                                style={{ ...IS, height: '38px', textAlign: 'center', fontFamily: INTER, fontSize: '13px', background: 'rgba(255,255,255,0.02)' }} 
                                                placeholder="%" onFocus={focusIn} onBlur={focusOut} 
                                            />
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" inputMode="decimal" value={form.discountAmt === 0 ? '' : fmt(form.discountAmt)} 
                                                onChange={e => {
                                                    const v = e.target.value.replace(/,/g, '');
                                                    if (v === '' || !isNaN(Number(v)) || v === '.') updateDiscount(v === '' ? 0 : Number(v), 'amt');
                                                }} 
                                                style={{ ...IS, height: '38px', textAlign: 'center', fontFamily: INTER, fontSize: '13px', color: '#fb7185', background: 'rgba(251,113,133,0.05)', borderColor: 'rgba(251,113,133,0.2)' }} 
                                                placeholder={cSymbol} onFocus={focusIn} onBlur={focusOut} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Tax Section - Integrated visibility */}
                                {taxSettings?.enabled && (
                                    <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                                            <label style={{ ...LS, marginBottom: 0 }}>{taxSettings.label || t('الضريبة')}</label>
                                            <span style={{ fontSize: '10px', color: C.textMuted }}>{taxSettings.isInclusive ? t('(شاملة)') : t('(مضافة)')}</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <input type="text" inputMode="decimal" value={form.taxRate === 0 ? '' : fmt(form.taxRate)} 
                                                    onChange={e => {
                                                        const v = e.target.value.replace(/,/g, '');
                                                        if (v === '' || !isNaN(Number(v)) || v === '.') setForm((f: any) => ({ ...f, taxRate: v === '' ? 0 : Number(v) }));
                                                    }} 
                                                    style={{ ...IS, height: '38px', textAlign: 'center', fontFamily: INTER, fontSize: '13px', background: 'rgba(255,255,255,0.02)' }} 
                                                    placeholder="%" onFocus={focusIn} onBlur={focusOut} 
                                                />
                                            </div>
                                            <div style={{ 
                                                height: '38px', borderRadius: '10px', border: `1px solid ${C.border}`, 
                                                background: 'rgba(251,113,133,0.05)', color: '#fb7185',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontFamily: INTER, fontSize: '14px', fontWeight: 800
                                            }}>
                                                {fmt(taxAmount)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div style={{ 
                                    background: C.primary, color: '#fff', padding: '15px', borderRadius: '14px', marginTop: '10px',
                                    boxShadow: '0 4px 15px rgba(37,106,244,0.3)', position: 'relative', overflow: 'hidden'
                                }}>
                                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}><Banknote size={60} /></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '5px', opacity: 0.9 }}>{t('الإجمالي النهائي')}</div>
                                    <div style={{ fontSize: '26px', fontWeight: 900, textAlign: 'center', fontFamily: INTER }}>
                                        {fmt(finalTotal)} <span style={{ fontSize: '14px', fontWeight: 600 }}>{cSymbol}</span>
                                    </div>
                                </div>
                            </div>

                            <button onClick={() => handleSubmit()} disabled={submitting} style={{ width: '100%', height: '52px', background: 'linear-gradient(135deg, #256af4 0%, #1e40af 100%)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '16px', marginTop: '15px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s shadow' }}>
                                {submitting ? <Loader2 className="animate-spin" /> : <Printer size={20} />}
                                {submitting ? t('جاري الحفظ...') : t('حفظ وطباعة العرض')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; } `}</style>
        </DashboardLayout>
    );
}
