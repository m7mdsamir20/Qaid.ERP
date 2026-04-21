'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import {
    TrendingUp, Search, Lock, Loader2,
    Building2, Banknote, CheckCircle2, ArrowRight,
    Printer, Receipt, UserPlus, Calendar, AlertCircle, User, Phone
} from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { THEME, C, CAIRO, INTER, IS, LS, focusIn, focusOut, PAGE_BASE, GRID, SC, STitle, BTN_PRIMARY, BTN_SUCCESS } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

/* ── Types ── */
interface Customer { id: string; name: string; balance: number; }
interface Treasury { id: string; name: string; type: string; balance: number; }

export default function NewReceiptPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { symbol: cSymbol } = useCurrency();
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [partners, setPartners] = useState<any[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [nextNum, setNextNum] = useState(1);
    const [loading, setLoading] = useState(true);

    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<any>({
        customerId: '',
        partnerType: 'customer',
        treasuryId: '',
        amount: '',
        paymentType: 'cash' as 'cash' | 'bank',
        date: new Date().toISOString().split('T')[0],
        description: '',
    });

    const clearError = (field: string) => {
        if (fieldErrors[field]) setFieldErrors(prev => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vovRes, suppRes, custRes, treaRes] = await Promise.all([
                    fetch('/api/vouchers?type=receipt'),
                    fetch('/api/suppliers'),
                    fetch('/api/customers'),
                    fetch('/api/treasuries'),
                ]);
                const vData = await vovRes.json();
                const vArray = Array.isArray(vData) ? vData : (vData.vouchers || []);
                const validNumbers = vArray.map((v: any) => v.voucherNumber || 0).filter((n: number) => n < 1000000);
                const maxNum = validNumbers.length > 0 ? Math.max(...validNumbers) : 0;
                setNextNum(maxNum + 1);

                const sData = await suppRes.json();
                const slist = (Array.isArray(sData) ? sData : []).map(s => ({ ...s, ptype: 'supplier' }));

                const cData = await custRes.json();
                const clist = (Array.isArray(cData) ? cData : []).map(c => ({ ...c, ptype: 'customer' }));

                setPartners([...slist, ...clist]);

                const tData = await treaRes.json();
                const tArray = Array.isArray(tData) ? tData : [];
                setTreasuries(tArray);


                const defaultCash = tArray.find((t: any) => t.type !== 'bank');
                if (defaultCash) setForm((f: any) => ({ ...f, treasuryId: defaultCash.id }));
            } catch { } finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const selectedPartner = partners.find(p => p.id === form.customerId);
    const availTreasuries = Array.isArray(treasuries) ? treasuries.filter(t => form.paymentType === 'cash' ? t.type !== 'bank' : t.type === 'bank') : [];

    const fmtInput = (v: any) => {
        if (v === '' || v === undefined || v === null) return '';
        const n = parseFloat(String(v).replace(/,/g, ''));
        if (isNaN(n)) return '';
        return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    const handleAmountChange = (val: string) => {
        const v = val.replace(/,/g, '');
        if (v === '' || !isNaN(Number(v)) || v === '.') {
            setForm((f: any) => ({ ...f, amount: v }));
            clearError('amount');
        }
    };

    const handleSubmit = async (andPrint = false) => {
        setFieldErrors({});
        const errors: Record<string, string> = {};

        if (!form.customerId) errors.customerId = 'يرجى اختيار العميل';
        if (!form.treasuryId) errors.treasuryId = 'يرجى اختيار الخزينة';
        if (!form.amount || parseFloat(form.amount) <= 0) errors.amount = 'يرجى إدخال المبلغ';

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/vouchers', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    type: 'receipt',
                    amount: parseFloat(form.amount),
                    supplierId: form.partnerType === 'supplier' ? form.customerId : undefined,
                    customerId: form.partnerType === 'customer' ? form.customerId : undefined,
                }),
            });
            if (res.ok) {
                const saved = await res.json();
                if (andPrint) handlePrint(saved);
                router.push('/receipts');
            } else { const d = await res.json(); alert(d.error || 'فشل في الحفظ'); }
        } catch { alert('فشل الاتصال بالخادم'); }
        finally { setSubmitting(false); }
    };

    const handlePrint = (v: any) => {
        window.open(`/print/voucher/${v.id}`, '_blank');
    };

    const InlineError = ({ field, top = '-32px' }: { field: string, top?: string }) => {
        if (!fieldErrors[field]) return null;
        return (
            <div style={{
                position: 'absolute', top, insetInlineStart: '4px', fontSize: '11px', color: '#fff', fontWeight: 800,
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
    const canSubmit = !!form.amount && parseFloat(form.amount) > 0;
    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.textMuted }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                </div>
                <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } `}</style>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title="سند قبض جديد"
                    subtitle="استلم نقدية من العميل وتوريدها للخزينة"
                    icon={Receipt}
                    backUrl="/receipts"
                />

                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: GRID.main, gap: GRID.gap, alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: GRID.verticalGap }}>
                        <div style={SC}>
                            <div style={STitle}>
                                <TrendingUp size={16} /> بيانات السند الأساسية
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Row 1 */}
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '110px 140px 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>رقم السند</label>
                                        <div style={{
                                            height: '42px', borderRadius: '10px',
                                            background: 'rgba(59,130,246,0.08)',
                                            border: `1px solid ${C.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontFamily: INTER, fontWeight: 900,
                                            fontSize: '14px', color: '#60a5fa',
                                            letterSpacing: '1px',
                                            boxSizing: 'border-box'
                                        }}>
                                            RCP-{String(nextNum).padStart(5, '0')}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>تاريخ السند <span style={{ color: C.danger }}>*</span></label>
                                        <input type="date" value={form.date}
                                            onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))}
                                            style={{ ...IS, direction: 'ltr', textAlign: 'end', background: C.inputBg, fontSize: '13px', fontFamily: CAIRO }}
                                            className="blue-date-icon" onFocus={focusIn} onBlur={focusOut}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>المستفيد (عميل/مورد) <span style={{ color: C.danger }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <CustomSelect
                                                value={form.customerId}
                                                onChange={v => {
                                                    const p = partners.find(x => x.id === v);
                                                    setForm((f: any) => ({ ...f, customerId: v, partnerType: p?.ptype || 'customer' }));
                                                    clearError('customerId');
                                                }}
                                                icon={Search}
                                                placeholder="بحث باسم العميل أو المورد..."
                                                options={partners.map(p => ({
                                                    value: p.id,
                                                    label: p.name,
                                                    sub: p.ptype === 'supplier' ? 'مورد' : 'عميل'
                                                }))}
                                            />
                                            <InlineError field="customerId" />
                                        </div>
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
                                                background: (selectedPartner.ptype === 'supplier'
                                                    ? selectedPartner.balance > 0 ? 'rgba(239,68,68,0.08)' : selectedPartner.balance < 0 ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)'
                                                    : selectedPartner.balance < 0 ? 'rgba(239,68,68,0.08)' : selectedPartner.balance > 0 ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)'
                                                ),
                                                color: (selectedPartner.ptype === 'supplier'
                                                    ? selectedPartner.balance > 0 ? '#f87171' : selectedPartner.balance < 0 ? '#34d399' : '#475569'
                                                    : selectedPartner.balance < 0 ? '#f87171' : selectedPartner.balance > 0 ? '#34d399' : '#475569'
                                                ),
                                                border: `1px solid ${selectedPartner.ptype === 'supplier'
                                                        ? selectedPartner.balance > 0 ? 'rgba(239,68,68,0.2)' : selectedPartner.balance < 0 ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'
                                                        : selectedPartner.balance < 0 ? 'rgba(239,68,68,0.2)' : selectedPartner.balance > 0 ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'
                                                    }`,
                                            }}>
                                                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
                                                {selectedPartner.ptype === 'supplier'
                                                    ? (selectedPartner.balance > 0 ? `له عندنا: ${Math.abs(selectedPartner.balance).toLocaleString()} ${cSymbol}` : selectedPartner.balance < 0 ? `عليه لنا: ${Math.abs(selectedPartner.balance).toLocaleString()} ${cSymbol}` : 'رصيده الحالي: صفر')
                                                    : (selectedPartner.balance < 0 ? `له عندنا: ${Math.abs(selectedPartner.balance).toLocaleString()} ${cSymbol}` : selectedPartner.balance > 0 ? `عليه لنا: ${Math.abs(selectedPartner.balance).toLocaleString()} ${cSymbol}` : 'رصيده الحالي: صفر')
                                                }
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Row 2 */}
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'start' }}>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>طريقة الدفع <span style={{ color: C.danger }}>*</span></label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            {[
                                                { val: 'cash', label: 'نقدي', icon: <Banknote size={14} />, color: '#10b981' },
                                                { val: 'bank', label: 'تحويل', icon: <Building2 size={14} />, color: C.primary },
                                            ].map(opt => (
                                                <button key={opt.val} type="button"
                                                    onClick={() => {
                                                        const nextType = opt.val as 'cash' | 'bank';
                                                        const nextTrea = treasuries.find(t => nextType === 'cash' ? t.type !== 'bank' : t.type === 'bank');
                                                        setForm((f: any) => ({ ...f, paymentType: nextType, treasuryId: nextTrea?.id || '' }));
                                                    }}
                                                    style={{
                                                        padding: '10px 8px', borderRadius: '8px', border: '1px solid',
                                                        borderColor: form.paymentType === opt.val ? opt.color : C.border,
                                                        background: form.paymentType === opt.val ? `${opt.color}11` : 'rgba(255,255,255,0.02)',
                                                        cursor: 'pointer', transition: 'all 0.2s',
                                                        display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'
                                                    }}>
                                                    <span style={{ color: form.paymentType === opt.val ? opt.color : C.textMuted }}>{opt.icon}</span>
                                                    <span style={{ fontSize: '12px', color: form.paymentType === opt.val ? C.textPrimary : C.textSecondary, fontWeight: 700 }}>{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{form.paymentType === 'cash' ? 'الخزينة المستلمة' : 'الحساب البنكي'} <span style={{ color: C.danger }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <CustomSelect
                                                value={form.treasuryId}
                                                onChange={v => { setForm((f: any) => ({ ...f, treasuryId: v })); clearError('treasuryId'); }}
                                                icon={Building2}
                                                placeholder={form.paymentType === 'cash' ? 'اختر الخزينة...' : 'اختر الحساب...'}
                                                options={availTreasuries.map(t => ({
                                                    value: t.id,
                                                    label: t.name,
                                                    sub: `رصيد: ${t.balance.toLocaleString()} ${cSymbol}`,
                                                }))}
                                            />
                                            <InlineError field="treasuryId" />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>ملاحظات / البيان المالي</label>
                                        <input type="text" placeholder="مثال: استلام دفعة من الحساب..." value={form.description}
                                            onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                                            style={{ ...IS, background: 'rgba(255,255,255,0.02)', fontSize: '13px' }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Summary */}
                    <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={SC}>
                            <div style={STitle}>
                                <CheckCircle2 size={16} /> تأكيد التحصيل
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ ...LS, fontSize: '11px' }}>المبلغ المحصَّل <span style={{ color: C.danger }}>*</span></label>
                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '12px', border: `1px solid ${C.primary}`,
                                    overflow: 'visible', position: 'relative'
                                }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <input
                                            type="text" inputMode="decimal" placeholder="0.00"
                                            value={fmtInput(form.amount)}
                                            onChange={e => handleAmountChange(e.target.value)}
                                            style={{
                                                width: '100%', height: '52px', background: 'transparent',
                                                border: 'none', color: C.primary, fontWeight: 900,
                                                fontSize: '22px', textAlign: 'center', paddingInlineEnd: '20px',
                                                fontFamily: CAIRO, outline: 'none'
                                            }}
                                            onFocus={e => { focusIn(e); e.target.select(); }} onBlur={focusOut}
                                        />
                                        <InlineError field="amount" top="-42px" />
                                        <div style={{ position: 'absolute', insetInlineEnd: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, opacity: 0.6 }}>
                                            {form.paymentType === 'cash' ? <Banknote size={20} /> : <Building2 size={20} />}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: `1px dashed ${C.border}` }}>
                                    <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 600 }}>الرصيد بعد السند</span>
                                    {selectedPartner ? (() => {
                                        const amt = parseFloat(form.amount) || 0;
                                        // Customer: Balance (Debt) decreases with Receipt
                                        // Supplier: Balance (Our Debt) increases with Receipt (Deposit)
                                        const nextBal = selectedPartner.ptype === 'customer'
                                            ? selectedPartner.balance - amt
                                            : selectedPartner.balance + amt;

                                        const hasCredit = selectedPartner.ptype === 'customer' ? nextBal < 0 : nextBal > 0;

                                        return (
                                            <span style={{
                                                fontSize: '15px', fontWeight: 800, fontFamily: CAIRO,
                                                color: hasCredit ? '#fb7185' : '#10b981'
                                            }}>
                                                {Math.abs(nextBal).toLocaleString()} {cSymbol}
                                            </span>
                                        );
                                    })() : (
                                        <span style={{ fontSize: '14px', color: C.textMuted }}>—</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button type="button" onClick={() => handleSubmit(false)} disabled={submitting || !canSubmit}
                                style={{ ...BTN_PRIMARY(!canSubmit, submitting), opacity: (submitting || !canSubmit) ? 0.6 : 1 }}>
                                {submitting ? <Loader2 size={20} className="animate-spin" /> : <>ترحيل مستند القبض <CheckCircle2 size={18} /></>}
                            </button>
                            <button type="button" onClick={() => handleSubmit(true)} disabled={submitting || !canSubmit}
                                style={{ ...BTN_SUCCESS(!canSubmit, submitting), opacity: (submitting || !canSubmit) ? 0.6 : 1 }}
                                onMouseEnter={e => { if (!submitting && canSubmit) e.currentTarget.style.background = 'rgba(16,185,129,0.18)'; }}
                                onMouseLeave={e => { if (!submitting && canSubmit) e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }}>
                                ترحيل وطباعة السند <Printer size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                @keyframes spin{to{transform:rotate(360deg)}}
                .blue-date-icon::-webkit-calendar-picker-indicator {
                    cursor: pointer;
                    filter: invert(41%) sepia(34%) saturate(3000%) hue-rotate(190deg) brightness(100%) contrast(100%);
                    border-radius: 4px; padding: 2px;
                }
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            `}</style>
        </DashboardLayout>
    );
}


