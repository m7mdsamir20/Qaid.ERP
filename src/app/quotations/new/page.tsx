'use client';
import { Currency } from '@/components/Currency';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FileText, Plus, Trash2, Package, Printer, Info, Loader2, Search, X, ArrowRight, Pencil, Banknote, Building2, Camera, CheckCircle, AlertCircle, ShoppingCart, User, Phone, UserPlus, Percent } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, SC, STitle } from '@/constants/theme';
import { CompanyInfo } from '@/lib/printInvoices';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import { useCurrency } from '@/hooks/useCurrency';
import PriceInput from '@/components/PriceInput';

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
    const [errorMsg, setErrorMsg] = useState('');
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
        setErrorMsg('');
        setFieldErrors({});
        
        if (!entryItemId) {
            setFieldErrors(prev => ({ ...prev, entryItemId: t('يرجى اختيار صنف أولاً') }));
            return;
        }

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
    }, [entryItemId, entryQty, entryPrice, entryDescription, items, form.taxRate, t]);

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
        setErrorMsg('');
        setFieldErrors({});

        if (lines.length === 0) {
            setFieldErrors(prev => ({ ...prev, entryItemId: t('يجب إضافة صنف واحد على الأقل') }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (!form.customerId) {
            setFieldErrors(prev => ({ ...prev, customerId: t('برجاء اختيار العميل أولاً') }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setSubmitting(true);
        try {
            const body = {
                ...form,
                taxInclusive: !!taxSettings?.isInclusive,
                taxLabel: taxSettings?.label || t('الضريبة'),
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
                window.open(`/print/quotation/${savedQuotation.id}`, '_blank');
                router.push('/quotations');
            } else {
                const err = await res.json();
                setErrorMsg(err.error || t('فشل حفظ عرض السعر'));
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (error) {
            setErrorMsg(t('خطأ في الاتصال'));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSubmitting(false);
        }
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

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: C.primary }} />
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ background: C.bg, minHeight: '100%', fontFamily: CAIRO, paddingBottom: '80px', paddingTop: THEME.header.pt }}>
                <PageHeader
                    title={t("إنشاء عرض سعر")}
                    subtitle={t("قم بإنشاء عرض سعر احترافي لعملائك بسهولة وبخطوات سريعة")}
                    icon={FileText}
                    backUrl="/quotations"
                />

                {errorMsg && (
                    <div style={{ 
                        padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', 
                        border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', 
                        color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <AlertCircle size={18} />
                        <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{errorMsg}</span>
                        <X size={14} style={{ marginInlineStart: 'auto', cursor: 'pointer', opacity: 0.7 }} onClick={() => setErrorMsg('')} />
                    </div>
                )}

                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px', alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                        <div style={SC}>
                            <div style={{ ...STitle, color: '#256af4' }}><Info size={12} /> {t('بيانات العرض الأساسية')}</div>
                            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '100px 1fr 160px', gap: '10px' }}>
                                <div>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('رقم العرض')}</label>
                                    <div style={{ height: '42px', borderRadius: '10px', background: 'rgba(37, 106, 244,0.08)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: OUTFIT, fontWeight: 600, fontSize: '13px', color: '#60a5fa', letterSpacing: '0.5px' }}>
                                        QUO-{String(nextNum).padStart(5, '0')}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('العميل')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <CustomSelect
                                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                                            placeholder={t("اختر عميل...")}
                                            value={form.customerId}
                                            onChange={(val: any) => { setForm({ ...form, customerId: val }); clearError('customerId'); }}
                                            icon={Search}
                                        />
                                        <InlineError field="customerId" />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('تاريخ العرض')}</label>
                                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ ...IS, fontFamily: OUTFIT, fontSize: '13px', textAlign: 'end' }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>
                        </div>

                        {/* Items Selection */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: '#256af4' }}><Package size={12} /> {isServices ? t('إضافة الخدمات') : t('اضافة الاصناف')}</div>
                            <div className="item-entry-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px 60px', gap: '12px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ ...LS, fontSize: '11px' }}>{isServices ? t("اسم الخدمة") : t("اسم الصنف")}</label>
                                    <div style={{ position: 'relative' }}>
                                        <CustomSelect
                                            ref={itemSelectRef}
                                            options={items.map(it => ({ 
                                                value: it.id, 
                                                label: it.name, 
                                                sub: it.code ? `${t('كود:')} ${it.code}` : undefined 
                                            }))}
                                            placeholder={isServices ? t("ابحث باسم الخدمة...") : t("ابحث باسم الصنف أو الكود...")}
                                            value={entryItemId}
                                            onChange={(val: any) => {
                                                setEntryItemId(val);
                                                clearError('entryItemId');
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
                                        <InlineError field="entryItemId" />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('الكمية')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <PriceInput 
                                            ref={qtyRef} 
                                            disabled={!entryItemId} 
                                            value={entryQty} 
                                            onChange={val => { setEntryQty(val); clearError('entryQty'); }} 
                                            onFocus={(e: React.FocusEvent<HTMLInputElement>) => { focusIn(e); e.target.select(); }}
                                            style={{ height: '42px', opacity: !entryItemId ? 0.5 : 1 }} 
                                        />
                                        <InlineError field="entryQty" />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ ...LS, fontSize: '11px' }}>{t('السعر')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <PriceInput 
                                            ref={priceRef} 
                                            disabled={!entryItemId} 
                                            value={entryPrice} 
                                            onChange={val => { setEntryPrice(val); clearError('entryPrice'); }} 
                                            onFocus={(e: React.FocusEvent<HTMLInputElement>) => { focusIn(e); e.target.select(); }}
                                            onKeyDown={(e) => { 
                                                if (e.key === 'Enter') {
                                                    addLine();
                                                    setTimeout(() => itemSelectRef.current?.focus(), 50);
                                                }
                                            }}
                                            style={{ height: '42px', opacity: !entryItemId ? 0.5 : 1 }} 
                                        />
                                        <InlineError field="entryPrice" />
                                    </div>
                                </div>
                                <button type="button" onClick={addLine} disabled={!entryItemId} style={{ height: '42px', width: '60px', borderRadius: '10px', background: !entryItemId ? 'rgba(37, 106, 244,0.3)' : C.primary, color: '#fff', border: 'none', cursor: !entryItemId ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Plus size={22} />
                                </button>
                            </div>

                            <div className="scroll-table" style={{ marginTop: '10px', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: C.subtle, borderBottom: `1px solid ${C.border}` }}>
                                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO }}>{isServices ? t('الخدمة') : t('الصنف')}</th>
                                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: C.textMuted, width: '90px', fontWeight: 700, fontFamily: CAIRO }}>{t('الكمية')}</th>
                                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: C.textMuted, width: '120px', fontWeight: 700, fontFamily: CAIRO }}>{t('السعر')}</th>
                                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: C.textMuted, width: '120px', fontWeight: 700, fontFamily: CAIRO }}>{t('الإجمالي')}</th>
                                            <th style={{ padding: '12px', width: '80px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((l, idx) => (
                                            <tr key={idx} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '12px' }}>
                                                    <div style={{ fontWeight: 700, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}>{l.itemName}</div>
                                                    {l.description && <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 400, marginTop: '2px' }}>{l.description}</div>}
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center', fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary, fontSize: '14px' }}>{l.quantity}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', fontFamily: OUTFIT, color: C.textSecondary, fontSize: '14px', fontWeight: 600 }}>{fmt(l.price)}</td>
                                                <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, fontFamily: OUTFIT, color: C.primary, fontSize: '15px' }}>{fmt(l.total)}</td>
                                                <td style={{ padding: '12px', }}>
                                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                        <button type="button" onClick={() => editLine(idx)} style={{ color: C.primary, border: 'none', background: 'none', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}><Pencil size={15} /></button>
                                                        <button type="button" onClick={() => removeLine(idx)} style={{ color: C.danger, border: 'none', background: 'none', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {lines.length === 0 && (
                                            <tr><td colSpan={5} style={{ padding: '40px',  color: C.textMuted, fontSize: '13px', textAlign: 'center' }}>{t('لم يتم إضافة أصناف بعد')}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Notes */}
                        <div style={SC}>
                            <div style={STitle}><FileText size={12} /> {t('ملاحظات وشروط العرض')}</div>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...IS, height: '100px', padding: '12px', fontSize: '13px' }} placeholder={t("اكتب أي ملاحظات أو شروط تود ظهورها في عرض السعر...")} />
                        </div>
                    </div>

                    {/* Summary Sidebar */}
                    <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ ...SC, padding: '12px' }}>
                            <div style={{ ...STitle, color: '#256af4', fontSize: '12px', marginBottom: '15px' }}>
                                <Info size={12} /> {t('ملخص عرض السعر')}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: C.textSecondary, fontSize: '13px', padding: '0 5px' }}>
                                    <span style={{ color: '#64748b', fontWeight: 600 }}>{isServices ? t('إجمالي الخدمات') : t('إجمالي الأصناف')}</span>
                                    <span style={{ fontWeight: 700, fontFamily: OUTFIT, color: '#e2e8f0' }}><Currency amount={subtotal} /> </span>
                                </div>

                                {/* Discount Section */}
                                <div style={{
                                    background: C.subtle,
                                    borderRadius: '10px',
                                    padding: '8px 12px',
                                    border: `1px solid ${C.border}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <label style={{ ...LS, marginBottom: 0, fontSize: '11px', fontWeight: 600, color: C.textSecondary }}>{t('الخصم')}</label>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" inputMode="decimal" value={form.discountAmt === 0 ? '' : fmt(form.discountAmt)}
                                                onChange={e => {
                                                    const v = e.target.value.replace(/,/g, '');
                                                    if (v === '' || !isNaN(Number(v)) || v === '.') updateDiscount(v === '' ? 0 : Number(v), 'amt');
                                                }}
                                                style={{ ...IS, height: '34px', fontFamily: OUTFIT, fontSize: '13px', background: C.card, borderRadius: '8px', textAlign: 'center' }}
                                                placeholder="0.00"
                                            />
                                            <span style={{ position: 'absolute', bottom: '9px', insetInlineEnd: '10px', fontSize: '10px', color: '#64748b' }}>{cSymbol}</span>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" inputMode="decimal" value={form.discountPct === 0 ? '' : fmt(form.discountPct)}
                                                onChange={e => {
                                                    const v = e.target.value.replace(/,/g, '');
                                                    if (v === '' || !isNaN(Number(v)) || v === '.') updateDiscount(v === '' ? 0 : Number(v), 'pct');
                                                }}
                                                style={{ ...IS, height: '34px', fontFamily: OUTFIT, fontSize: '13px', background: C.card, borderRadius: '8px', textAlign: 'center' }}
                                                placeholder="0"
                                            />
                                            <span style={{ position: 'absolute', bottom: '9px', insetInlineEnd: '10px', fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tax Section */}
                                {taxSettings?.enabled && (
                                    <div style={{
                                        borderRadius: '10px',
                                        padding: '8px 12px',
                                        border: `1px dashed ${C.border}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        background: C.subtle
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                            <label style={{ ...LS, marginBottom: 0, fontSize: '11px', fontWeight: 600, color: C.textSecondary }}>
                                                {taxSettings.label || 'VAT'}
                                            </label>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <div style={{
                                                height: '34px', borderRadius: '8px', border: `1px solid ${C.border}`,
                                                background: C.card, color: '#60a5fa',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, position: 'relative'
                                            }}>
                                                <Currency amount={taxAmount} />
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <input type="text" inputMode="decimal" value={form.taxRate === 0 ? '' : fmt(form.taxRate)}
                                                    onChange={e => {
                                                        const v = e.target.value.replace(/,/g, '');
                                                        if (v === '' || !isNaN(Number(v)) || v === '.') setForm((f: any) => ({ ...f, taxRate: v === '' ? 0 : Number(v) }));
                                                    }}
                                                    style={{ ...IS, height: '34px', fontFamily: OUTFIT, fontSize: '13px', background: C.card, borderRadius: '8px', textAlign: 'center' }}
                                                />
                                                <span style={{ position: 'absolute', bottom: '9px', insetInlineEnd: '10px', fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>%</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'linear-gradient(135deg, rgba(37,106,244,0.12), rgba(37,106,244,0.05))',
                                    padding: '10px 14px', borderRadius: '12px', marginTop: '6px',
                                    border: `1px solid ${C.primaryBorder}`,
                                    boxShadow: '0 4px 12px rgba(37,106,244,0.08)',
                                }}>
                                    <span style={{ color: C.textSecondary, fontWeight: 700, fontSize: '13px', fontFamily: CAIRO }}>{t('صافي العرض')}</span>
                                    <span style={{ color: C.primary, fontWeight: 700, fontSize: '18px', fontFamily: OUTFIT }}>
                                        <Currency amount={finalTotal} style={{ fontSize: '18px', fontWeight: 700 }} />
                                    </span>
                                </div>
                            </div>

                            <button onClick={() => handleSubmit()} disabled={submitting} style={{ width: '100%', height: '52px', background: C.primary, color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 600, fontSize: '13px', marginTop: '14px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'all 0.2s', boxShadow: '0 8px 25px -5px rgba(37,106,244,0.4)', fontFamily: CAIRO }}>
                                {submitting ? <Loader2 className="animate-spin" /> : <>{t('حفظ وطباعة العرض')} <Printer size={20} /></>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; } 
                @keyframes inlineErrorPush {
                    0% { transform: translateY(10px) scale(0.9); opacity: 0; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
            `}</style>
        </DashboardLayout>
    );
}
