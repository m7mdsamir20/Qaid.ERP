'use client';
import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import { TrendingUp, Search, Lock, Loader2, Building2, Banknote, CheckCircle2, ArrowRight, Printer, Receipt, Save, AlertCircle } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, PAGE_BASE, GRID, SC, STitle, BTN_PRIMARY, BTN_SUCCESS } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import PriceInput from '@/components/PriceInput';
import { formatNumber } from '@/lib/currency';
import { printVoucherDirectly } from '@/lib/printDirectly';


/* ── Types ── */
interface Supplier { id: string; name: string; balance: number; }
interface Treasury { id: string; name: string; type: string; balance: number; }

export default function NewPaymentPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { symbol: cSymbol } = useCurrency();
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [nextNum, setNextNum] = useState(1);
    const [loading, setLoading] = useState(true);

    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<any>({
        supplierId: '',
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
                const [vovRes, suppRes, treaRes] = await Promise.all([
                    fetch('/api/vouchers?type=payment'),
                    fetch('/api/suppliers'),
                    fetch('/api/treasuries'),
                ]);
                const vData = await vovRes.json();
                const vArray = Array.isArray(vData) ? vData : (vData.vouchers || []);
                const maxNum = vArray.reduce((m: number, v: any) => Math.max(m, v.voucherNumber || 0), 0);
                setNextNum(maxNum + 1);

                const sData = await suppRes.json();
                setSuppliers(Array.isArray(sData) ? sData : []);

                const tData = await treaRes.json();
                const tArray = Array.isArray(tData) ? tData : [];
                setTreasuries(tArray);


                const defaultCash = tArray.find((t: any) => t.type !== 'bank');
                if (defaultCash) setForm((f: any) => ({ ...f, treasuryId: defaultCash.id }));
            } catch { } finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const selectedSupplier = Array.isArray(suppliers) ? suppliers.find(c => c.id === form.supplierId) : null;
    const availTreasuries = Array.isArray(treasuries) ? treasuries.filter(t => form.paymentType === 'cash' ? t.type !== 'bank' : t.type === 'bank') : [];

    const handlePrint = (v: any) => {
        printVoucherDirectly(v.id);
    };

    const handleSubmit = async (andPrint = false) => {
        setFieldErrors({});
        const errors: Record<string, string> = {};

        if (!form.supplierId) errors.supplierId = 'يرجى اختيار المورد';
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
                body: JSON.stringify({ ...form, type: 'payment', amount: parseFloat(form.amount) }),
            });
            if (res.ok) {
                const saved = await res.json();
                if (andPrint) handlePrint(saved);
                router.push('/payments');
            } else { const d = await res.json(); alert(d.error || 'فشل في الحفظ'); }
        } catch { alert('فشل الاتصال بالخادم'); }
        finally { setSubmitting(false); }
    };

    const InlineError = ({ field, top = '-32px' }: { field: string, top?: string }) => {
        if (!fieldErrors[field]) return null;
        return (
            <div style={{
                position: 'absolute', top, insetInlineStart: '4px', fontSize: '11px', color: '#fff', fontWeight: 600,
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
    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.textSecondary, flexDirection: 'column', gap: '14px' }}>
                <Loader2 size={36} style={{ animation: 'spin 1.5s linear infinite', color: C.primary }} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>جاري تحميل البيانات...</span>
            </div>
            <style jsx global>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title="سند صرف جديد"
                    subtitle="صرف نقدية للمورد من الخزينة أو البنك"
                    icon={TrendingUp}
                    backButton={{ label: 'رجوع للسجل', onClick: () => router.push('/payments') }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '4px 12px', borderRadius: '8px', color: '#f43f5e', fontFamily: CAIRO, fontWeight: 700, fontSize: '13px' }}>
                        <Receipt size={14} /> PMT-{String(nextNum).padStart(5, '0')}
                    </div>
                </PageHeader>

                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: GRID.main, gap: GRID.gap, alignItems: 'start' }}>
                    {/* LEFT Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* 1. Basic Info */}
                        <div style={SC}>
                            <div style={STitle}>البيانات الأساسية للصرف</div>
                            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '16px' }}>
                                <div>
                                    <label style={LS}>رقم السند</label>
                                    <div style={{
                                        height: '42px', borderRadius: '10px',
                                        background: 'rgba(244, 63, 94, 0.08)',
                                        border: `1px solid ${C.border}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontFamily: CAIRO, fontWeight: 600,
                                        fontSize: '13px', color: '#f43f5e',
                                        letterSpacing: '1px',
                                        boxSizing: 'border-box'
                                    }}>
                                        PMT-{String(nextNum).padStart(5, '0')}
                                    </div>
                                </div>
                                <div>
                                    <label style={LS}>تاريخ السند <span style={{ color: C.danger }}>*</span></label>
                                    <input type="date" value={form.date}
                                        onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))}
                                        style={{ ...IS, direction: 'ltr', textAlign: 'end', background: C.card, height: '42px', borderRadius: '10px', fontSize: '13px', fontFamily: CAIRO }}
                                        className="blue-date-icon" onFocus={focusIn} onBlur={focusOut}
                                    />
                                </div>
                                <div>
                                    <label style={LS}>المورد (المُستلِم) <span style={{ color: C.danger }}>*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <CustomSelect
                                            value={form.supplierId}
                                            onChange={v => { setForm((f: any) => ({ ...f, supplierId: v })); clearError('supplierId'); }}
                                            icon={Search}
                                            placeholder="ابحث واختر المورد..."
                                            options={suppliers.map(s => ({
                                                value: s.id,
                                                label: s.name,
                                                sub: s.balance < 0 ? `له: ${formatNumber(Math.abs(s.balance))} ${cSymbol}` : s.balance > 0 ? `عليه: ${formatNumber(s.balance)} ${cSymbol}` : 'رصيد: صفر'
                                            }))}
                                        />
                                        <InlineError field="supplierId" />
                                    </div>
                                    {selectedSupplier && (
                                        <div style={{ marginTop: '8px' }}>
                                            <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', fontWeight: 700, background: selectedSupplier.balance < 0 ? `${C.success}15` : `${C.danger}15`, color: selectedSupplier.balance < 0 ? C.success : C.danger, border: `1px solid ${selectedSupplier.balance < 0 ? C.success : C.danger}30` }}>
                                                {selectedSupplier.balance < 0 ? `للمورد طرفنا ${formatNumber(Math.abs(selectedSupplier.balance))} ${cSymbol}` : selectedSupplier.balance > 0 ? `على المورد طرفنا ${formatNumber(selectedSupplier.balance)} ${cSymbol}` : 'رصيد المورد صفر'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={LS}>طريقة الصرف <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {[
                                        { val: 'cash', label: 'نقدي', sub: 'صرف كاش', icon: <Banknote size={16} />, color: C.primary },
                                        { val: 'bank', label: 'تحويل', sub: 'خصم بنكي', icon: <Building2 size={16} />, color: '#bb86fc' },
                                    ].map(opt => (
                                        <button key={opt.val} type="button"
                                            onClick={() => {
                                                const nextType = opt.val as 'cash' | 'bank';
                                                const nextTrea = treasuries.find(t => nextType === 'cash' ? t.type !== 'bank' : t.type === 'bank');
                                                setForm((f: any) => ({ ...f, paymentType: nextType, treasuryId: nextTrea?.id || '' }));
                                            }}
                                            style={{
                                                padding: '14px 20px',  borderRadius: '12px', border: '1px solid',
                                                borderColor: form.paymentType === opt.val ? opt.color : C.border,
                                                background: form.paymentType === opt.val ? `${opt.color}11` : 'transparent',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                                display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'center',
                                            }}>
                                            <span style={{ color: form.paymentType === opt.val ? opt.color : C.textMuted }}>{opt.icon}</span>
                                            <div>
                                                <div style={{ fontSize: '13px', color: form.paymentType === opt.val ? C.textPrimary : C.textSecondary, fontWeight: 700 }}>{opt.label}</div>
                                                <div style={{ fontSize: '10px', color: C.textSecondary, marginTop: '2px' }}>{opt.sub}</div>
                                            </div>
                                            {form.paymentType === opt.val && (
                                                <div style={{ marginInlineEnd: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: opt.color }} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={LS}>{form.paymentType === 'cash' ? 'الخزينة المنصرف منها' : 'الحساب البنكي'} <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <CustomSelect
                                        value={form.treasuryId}
                                        onChange={v => { setForm((f: any) => ({ ...f, treasuryId: v })); clearError('treasuryId'); }}
                                        icon={Building2}
                                        placeholder={form.paymentType === 'cash' ? 'اختر الخزينة...' : 'اختر الحساب...'}
                                        options={availTreasuries.map(t => ({
                                            value: t.id,
                                            label: t.name,
                                            sub: `رصيد الحالي: ${formatNumber(t.balance)} ${cSymbol}`,
                                        }))}
                                    />
                                    <InlineError field="treasuryId" />
                                </div>
                            </div>

                            <div>
                                <label style={LS}>ملاحظات / البيان المالي</label>
                                <textarea placeholder="مثال: سداد دفعة من الحساب، سداد فاتورة مشتريات..." value={form.description}
                                    onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                                    style={{ ...IS, height: '80px', padding: '12px', background: 'rgba(255,255,255,0.02)', fontSize: '13px', resize: 'none' }} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT Sidebar Summary */}
                    <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={SC}>
                            <div style={STitle}>
                                <CheckCircle2 size={16} /> تأكيد الصرف
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ ...LS, fontSize: '11px' }}>المبلغ المُنصرِف <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ position: 'relative' }}>
                                    <PriceInput 
                                        value={form.amount}
                                        onChange={val => { setForm((f: any) => ({ ...f, amount: val })); clearError('amount'); }}
                                        style={{ height: '44px', fontSize: '16px', fontWeight: 600, color: (form.amount === '' || form.amount === 0) ? C.textMuted : C.textPrimary }}
                                        placeholder="0.00"
                                    />
                                    <InlineError field="amount" />
                                    <div style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', color: C.danger, pointerEvents: 'none' }}>
                                        {form.paymentType === 'cash' ? <Banknote size={20} /> : <Building2 size={20} />}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: `1px dashed ${C.border}` }}>
                                    <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 600 }}>الرصيد بعد السند</span>
                                    {selectedSupplier ? (
                                        <span style={{
                                            fontSize: '15px', fontWeight: 600, fontFamily: CAIRO,
                                            color: ((selectedSupplier.balance - (parseFloat(form.amount) || 0))) >= 0 ? C.danger : C.success
                                        }}>
                                            {formatNumber(Math.abs(selectedSupplier.balance - (parseFloat(form.amount) || 0)))} {cSymbol}
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '13px', color: C.textSecondary }}>—</span>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button type="button" onClick={() => handleSubmit(false)} disabled={submitting || !canSubmit}
                                    style={{ ...BTN_PRIMARY(!canSubmit, submitting), background: (submitting || !canSubmit) ? 'rgba(251, 113, 133, 0.2)' : C.danger, boxShadow: (submitting || !canSubmit) ? 'none' : '0 8px 16px -4px rgba(251, 113, 133, 0.3)', opacity: (submitting || !canSubmit) ? 0.6 : 1 }}>
                                    {submitting ? <Loader2 size={20} className="spin" /> : <>ترحيل مستند الصرف <CheckCircle2 size={18} /></>}
                                </button>
                                <button type="button" onClick={() => handleSubmit(true)} disabled={submitting || !canSubmit}
                                    style={{
                                        ...BTN_SUCCESS(!canSubmit, submitting),
                                        background: 'transparent',
                                        border: `1px solid ${C.danger}40`,
                                        color: C.danger,
                                        opacity: (submitting || !canSubmit) ? 0.6 : 1
                                    }}
                                    onMouseEnter={e => { if (!submitting && canSubmit) e.currentTarget.style.background = `${C.danger}10`; }}
                                    onMouseLeave={e => { if (!submitting && canSubmit) e.currentTarget.style.background = 'transparent'; }}>
                                    <Printer size={18} /> ترحيل وطباعة السند
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
                .spin{animation:spin 1s linear infinite}
                .blue-date-icon::-webkit-calendar-picker-indicator {
                    filter: invert(48%) sepia(85%) saturate(1900%) hue-rotate(190deg) brightness(95%) contrast(110%);
                    cursor: pointer;
                }
            `}</style>
        </DashboardLayout>
    );
}
