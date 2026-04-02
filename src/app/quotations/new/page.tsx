'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FileText, Plus, Trash2, Package, Printer, Info, Loader2, Search, X, ArrowRight, Pencil, Banknote, Building2, Camera, CheckCircle, AlertCircle, ShoppingCart, User, Phone, UserPlus } from 'lucide-react';
import { THEME, C, CAIRO, INTER, IS, LS, focusIn, focusOut } from '@/constants/theme';
import { printQuotation, CompanyInfo } from '@/lib/printInvoices';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import { useCurrency } from '@/hooks/useCurrency';

interface Customer { id: string; name: string; phone?: string; balance: number; }
interface Item { id: string; code: string; name: string; sellPrice: number; description?: string; unit: any; }
interface QuotationLine { itemId: string; itemCode: string; itemName: string; unit: string; quantity: number; price: number; total: number; description?: string; taxRate?: number; taxAmount?: number; }

export default function NewQuotationPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { symbol: cSymbol } = useCurrency();
    const [customers,  setCustomers]  = useState<Customer[]>([]);
    const [items,      setItems]      = useState<Item[]>([]);
    const [company,    setCompany]    = useState<CompanyInfo>({});
    const [nextNum,    setNextNum]    = useState(1);
    const [loading,    setLoading]    = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAddCust,setShowAddCust]= useState(false);

    const [lines, setLines] = useState<QuotationLine[]>([]);
    const [entryItemId, setEntryItemId] = useState('');
    const [entryQty, setEntryQty]           = useState<number | ''>(1);
    const [entryPrice, setEntryPrice]       = useState<number | ''>('');

    const [form, setForm]   = useState<any>({
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
                fetch('/api/items'),
                fetch('/api/quotations?justNextNum=true'),
                fetch('/api/settings'),
                fetch('/api/company')
            ]);
            if (custRes.ok) setCustomers(await custRes.json());
            if (itemRes.ok) {
                const itemData = await itemRes.json();
                setItems(itemData.items || itemData);
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
                const taxS = setts.taxSettings || setts;
                setTaxSettings(taxS);
                if (taxS?.enabled) {
                    setForm((form: any) => ({ ...form, taxRate: taxS.rate }));
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
    const discountAmt = parseFloat(form.discountAmt) || 0;
    const afterDisc = Math.max(0, subtotal - discountAmt);
    
    let taxAmount = 0;
    if (taxSettings?.enabled) {
        if (taxSettings.isInclusive) {
            taxAmount = afterDisc - (afterDisc / (1 + form.taxRate / 100));
        } else {
            taxAmount = afterDisc * (form.taxRate / 100);
        }
    }
    const finalTotal = taxSettings?.isInclusive ? afterDisc : (afterDisc + taxAmount);

    const addItem = (itemId: string, qty: number, price: number) => {
        const item = items.find(it => it.id === itemId);
        if (!item) return;

        const existing = lines.find(l => l.itemId === item.id);
        if (existing) {
             setLines(lines.map(l => l.itemId === item.id ? { 
                 ...l, 
                 quantity: l.quantity + qty, 
                 price: price || l.price,
                 total: (l.quantity + qty) * (price || l.price) 
             } : l));
        } else {
            setLines([...lines, {
                itemId: item.id,
                itemCode: item.code,
                itemName: item.name,
                unit: typeof item.unit === 'string' ? item.unit : (item.unit?.name || ''),
                quantity: qty,
                price: price,
                total: qty * price,
                taxRate: form.taxRate,
                taxAmount: 0 // Will recalc on save/submit
            }]);
        }
    };

    const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
    const updateLine = (idx: number, key: string, val: any) => {
        const newLines = [...lines];
        (newLines[idx] as any)[key] = val;
        if (key === 'quantity' || key === 'price') {
            newLines[idx].total = Number(newLines[idx].quantity) * Number(newLines[idx].price);
        }
        setLines(newLines);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (lines.length === 0) return alert('يجب إضافة صنف واحد على الأقل');
        if (!form.customerId) return alert('برجاء اختيار عميل');

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
                printQuotation({ ...savedQuotation, customer: customers.find(c => c.id === form.customerId) }, company);
                router.push('/quotations');
            } else {
                const err = await res.json();
                alert(err.error || 'فشل حفظ عرض السعر');
            }
        } catch (error) {
            alert('خطأ في الاتصال');
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
            <div dir="rtl" style={{ background: C.bg, minHeight: '100%', fontFamily: CAIRO, paddingBottom: '80px' }}>
                <PageHeader 
                    title="إنشاء عرض سعر"
                    subtitle={`قم بتجهيز عرض سعر احترافي لعملائك برقم #${nextNum}`}
                    icon={FileText}
                    backUrl="/quotations"
                />

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Area 1: Items Selection Area */}
                        <div style={{ background: C.card, borderRadius: '15px', border: `1px solid ${C.border}`, padding: '24px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '240px' }}>
                                    <label style={LS}>اختر الخدمة / الصنف</label>
                                    <CustomSelect 
                                        options={items.map(it => ({ value: it.id, label: `${it.name} (${it.code})`, raw: it }))}
                                        placeholder="ابحث باسم الخدمة أو الكود..."
                                        value={entryItemId}
                                        onChange={(val: any) => {
                                            setEntryItemId(val);
                                            const item = items.find(it => it.id === val);
                                            if (item) setEntryPrice(item.sellPrice);
                                        }}
                                    />
                                </div>
                                <div style={{ width: '90px' }}>
                                    <label style={LS}>الكمية</label>
                                    <input 
                                        type="number" step="any" 
                                        value={entryQty} onChange={e => setEntryQty(e.target.value as any)}
                                        style={{ ...IS, textAlign: 'center', height: '42px' }} 
                                        onFocus={focusIn} onBlur={focusOut}
                                    />
                                </div>
                                <div style={{ width: '120px' }}>
                                    <label style={LS}>السعر</label>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            type="number" step="any" 
                                            value={entryPrice} onChange={e => setEntryPrice(e.target.value as any)}
                                            style={{ ...IS, textAlign: 'center', height: '42px', paddingLeft: '30px' }} 
                                            onFocus={focusIn} onBlur={focusOut}
                                        />
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: C.textMuted }}>{cSymbol}</span>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        if (!entryItemId) return alert('برجاء اختيار خدمة أولاً');
                                        addItem(entryItemId, Number(entryQty || 1), Number(entryPrice || 0));
                                        setEntryItemId('');
                                        setEntryQty(1);
                                        setEntryPrice('');
                                    }}
                                    style={{ 
                                        height: '42px', padding: '0 20px', background: C.primary, color: '#fff', border: 'none', borderRadius: '10px', 
                                        fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                                    onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                                >
                                    <Plus size={18} />
                                    إضافة للعرض
                                </button>
                            </div>
                            
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `2px solid ${C.border}` }}>
                                            <th style={{ padding: '14px', textAlign: 'right', fontSize: '12px', color: C.textMuted, fontWeight: 800 }}>الخدمة / الصنف</th>
                                            <th style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: C.textMuted, width: '90px', fontWeight: 800 }}>الكمية</th>
                                            <th style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: C.textMuted, width: '130px', fontWeight: 800 }}>السعر</th>
                                            <th style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: C.textMuted, width: '130px', fontWeight: 800 }}>الإجمالي</th>
                                            <th style={{ padding: '14px', width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((l, idx) => (
                                            <tr key={idx} style={{ borderBottom: `1px solid ${C.border}44`, transition: '0.2s' }}>
                                                <td style={{ padding: '16px 14px' }}>
                                                    <div style={{ fontWeight: 700, color: C.textPrimary, fontSize: '14px' }}>{l.itemName}</div>
                                                    <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{l.itemCode}</div>
                                                </td>
                                                <td style={{ padding: '16px 14px' }}>
                                                    <input type="number" step="any" value={l.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} style={{ ...IS, textAlign: 'center', height: '36px', padding: 0, borderRadius: '8px' }} />
                                                </td>
                                                <td style={{ padding: '16px 14px' }}>
                                                    <input type="number" step="any" value={l.price} onChange={e => updateLine(idx, 'price', e.target.value)} style={{ ...IS, textAlign: 'center', height: '36px', padding: 0, borderRadius: '8px' }} />
                                                </td>
                                                <td style={{ padding: '16px 14px', textAlign: 'center', fontWeight: 900, fontFamily: INTER, color: C.textPrimary, fontSize: '15px' }}>
                                                    {l.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '16px 14px' }}>
                                                    <button type="button" onClick={() => removeLine(idx)} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: C.danger, cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {lines.length === 0 && (
                                            <tr>
                                                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: C.textMuted }}>
                                                    <Package size={40} style={{ opacity: 0.1, marginBottom: '10px' }} />
                                                    <div style={{ fontSize: '13px' }}>لم يتم إضافة أصناف بعد. ابدأ باختيار خدمة من الأعلى.</div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Area 2: Notes */}
                        <div style={{ background: C.card, borderRadius: '15px', border: `1px solid ${C.border}`, padding: '20px' }}>
                            <label style={LS}>ملاحظات العرض / شروط التنفيذ</label>
                            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...IS, height: '100px', padding: '12px' }} placeholder="اكتب أي ملاحظات أو شروط تود ظهورها في عرض السعر..." />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Summary Bar */}
                        <div style={{ background: C.card, borderRadius: '15px', border: `1px solid ${C.border}`, padding: '20px', position: 'sticky', top: '20px' }}>
                            <div style={{ marginBottom: '18px' }}>
                                <label style={LS}>التاريخ</label>
                                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                            
                            <div style={{ marginBottom: '18px' }}>
                                <label style={LS}>العميل <span style={{ color: C.danger }}>*</span></label>
                                <CustomSelect 
                                    options={customers.map(c => ({ value: c.id, label: c.name }))}
                                    placeholder="اختر عميل..."
                                    value={form.customerId}
                                    onChange={(val: any) => setForm({ ...form, customerId: val })}
                                />
                            </div>

                            <hr style={{ border: `1px dashed ${C.border}`, margin: '20px 0' }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: C.textSecondary }}>
                                    <span>الإجمالي قبل الضريبة:</span>
                                    <span style={{ fontWeight: 700, fontFamily: INTER }}>{subtotal.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: C.textSecondary }}>
                                    <span>الخصم:</span>
                                    <input type="number" step="any" value={form.discountAmt} onChange={e => setForm({ ...form, discountAmt: e.target.value })} style={{ ...IS, width: '100px', height: '28px', textAlign: 'center', padding: 0 }} />
                                </div>
                                {taxSettings?.enabled && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: C.textSecondary }}>
                                        <span>الضريبة ({form.taxRate}%):</span>
                                        <span style={{ fontWeight: 700, fontFamily: INTER }}>{taxAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 900, color: C.primary, marginTop: '10px', paddingTop: '15px', borderTop: `1px solid ${C.border}` }}>
                                    <span>الإجمالي النهائي:</span>
                                    <span style={{ fontFamily: INTER }}>{finalTotal.toLocaleString()} {cSymbol}</span>
                                </div>
                            </div>

                            <button type="submit" disabled={submitting} style={{ width: '100%', height: '50px', background: C.primary, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '16px', marginTop: '25px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                {submitting ? <Loader2 className="animate-spin" /> : <Printer size={20} />}
                                {submitting ? 'جاري الحفظ...' : 'حفظ وطباعة عرض السعر'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; } `}</style>
        </DashboardLayout>
    );
}
