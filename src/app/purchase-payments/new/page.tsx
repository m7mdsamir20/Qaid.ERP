'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import {
    TrendingUp, Search, Lock, Loader2,
    Building2, Banknote, CheckCircle2, ArrowRight,
    Printer, Receipt, UserPlus, Calendar, User, Phone
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { THEME, C, CAIRO, INTER, IS, LS, focusIn, focusOut, PAGE_BASE, GRID, SC, STitle, BTN_PRIMARY, BTN_DANGER, BTN_SUCCESS } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

/* ── Types ── */
interface Supplier { id: string; name: string; balance: number; }
interface Treasury { id: string; name: string; type: string; balance: number; }

export default function NewPurchasePaymentPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { symbol: cSymbol } = useCurrency();
    const [partners, setPartners] = useState<any[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [nextNum, setNextNum] = useState(1);
    const [loading, setLoading] = useState(true);

    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState<any>({
        partnerId: '',
        partnerType: 'supplier',
        treasuryId: '',
        amount: '',
        paymentType: 'cash' as 'cash' | 'bank',
        date: new Date().toISOString().split('T')[0],
        description: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vovRes, suppRes, custRes, treaRes] = await Promise.all([
                    fetch('/api/purchase-payments'),
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

    const selectedPartner = partners.find(p => p.id === form.partnerId);
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
        }
    };

    const handleSubmit = async (andPrint = false) => {
        if (!form.partnerId || !form.treasuryId || !form.amount) {
            alert('يرجى تعبئة الجهة (مورد/عميل) والخزينة والمبلغ'); return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/purchase-payments', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    supplierId: form.partnerType === 'supplier' ? form.partnerId : null,
                    customerId: form.partnerType === 'customer' ? form.partnerId : null,
                    amount: parseFloat(form.amount),
                }),
            });
            if (res.ok) {
                const saved = await res.json();
                if (andPrint) printPayVoucher(saved, selectedPartner, nextNum, form, cSymbol);
                router.push('/purchase-payments');
            } else { const d = await res.json(); alert(d.error || 'فشل في الحفظ'); }
        } catch { alert('فشل الاتصال بالخادم'); }
        finally { setSubmitting(false); }
    };

    const canSave = !!form.partnerId && !!form.treasuryId && parseFloat(form.amount || '0') > 0;

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
                    title="سند صرف جديد"
                    subtitle="صرف نقدية لجهة (مورد/عميل) وتحديث الرصيد"
                    icon={Receipt}
                    backUrl="/purchase-payments"
                />

                <div style={{ display: 'grid', gridTemplateColumns: GRID.main, gap: GRID.gap, alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: GRID.verticalGap }}>
                        <div style={SC}>
                            <div style={STitle}>
                                <TrendingUp size={16} /> بيانات السند الأساسية
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Row 1 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '110px 140px 1fr', gap: '20px' }}>
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
                                            PMT-{String(nextNum).padStart(5, '0')}
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
                                        <label style={{ ...LS, fontSize: '11px' }}>المستفيد (مورد/عميل) <span style={{ color: C.danger }}>*</span></label>
                                        <CustomSelect
                                            value={form.partnerId}
                                            onChange={v => {
                                                const p = partners.find(x => x.id === v);
                                                setForm((f: any) => ({ ...f, partnerId: v, partnerType: p?.ptype || 'supplier' }));
                                            }}
                                            icon={Search}
                                            placeholder="بحث باسم العميل أو المورد..."
                                            options={partners.map(p => ({
                                                value: p.id,
                                                label: p.name,
                                                sub: p.ptype === 'supplier' ? 'مورد' : 'عميل'
                                            }))}
                                        />
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
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'start' }}>
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
                                        <label style={{ ...LS, fontSize: '11px' }}>{form.paymentType === 'cash' ? 'الخزينة الصارفة' : 'الحساب البنكي'} <span style={{ color: C.danger }}>*</span></label>
                                        <CustomSelect
                                            value={form.treasuryId}
                                            onChange={v => setForm((f: any) => ({ ...f, treasuryId: v }))}
                                            icon={Building2}
                                            placeholder={form.paymentType === 'cash' ? 'اختر الخزينة...' : 'اختر الحساب...'}
                                            options={availTreasuries.map(t => ({
                                                value: t.id,
                                                label: t.name,
                                                sub: `رصيد: ${t.balance.toLocaleString()} ${cSymbol}`,
                                            }))}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>ملاحظات / البيان المالي</label>
                                        <input type="text" placeholder="مثال: سداد دفعة للمورد..." value={form.description}
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
                                <CheckCircle2 size={16} /> تأكيد الصرف
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ ...LS, fontSize: '11px' }}>المبلغ المُنصرف <span style={{ color: C.danger }}>*</span></label>
                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '12px', border: `1px solid ${C.primary}`,
                                    overflow: 'hidden'
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
                                        />
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
                                        let nextBal = selectedPartner.balance;
                                        if (selectedPartner.ptype === 'customer') nextBal += amt;
                                        else nextBal -= amt;

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
                            <button type="button" onClick={() => handleSubmit(false)} disabled={!canSave || submitting}
                                style={BTN_PRIMARY(!canSave, submitting)}>
                                {submitting ? <Loader2 size={20} className="animate-spin" /> : <>ترحيل مستند الصرف <CheckCircle2 size={18} /></>}
                            </button>
                            <button type="button" onClick={() => handleSubmit(true)} disabled={!canSave || submitting}
                                style={BTN_SUCCESS(!canSave, submitting)}
                                onMouseEnter={e => { if (!submitting && canSave) e.currentTarget.style.background = 'rgba(16,185,129,0.18)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }}>
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

function printPayVoucher(voucher: any, supplier: any, voucherNumber: number, form: any, cSymbol: string) {
    const date = new Date(form.date || new Date()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const amount = (voucher.amount || 0).toLocaleString('en-US');
    const COMPANY = {
        name: 'شركة النور للتجارة', nameEn: 'Al-Nour Trading Company',
        address: 'القاهرة، مصر - شارع التحرير، عمارة 12',
        phone: '01000000000  |  01100000000',
        email: 'info@alnour.com', tax: '123-456-789', logo: '',
    };

    // Calculate Balance After for Print
    const isCust = supplier?.ptype === 'customer';
    const nextBal = isCust ? (supplier?.balance || 0) + (voucher.amount || 0) : (supplier?.balance || 0) - (voucher.amount || 0);

    const html = `<!DOCTYPE html>
<html lang="ar" dir={isRtl ? 'rtl' : 'ltr'}>
<head><meta charset="UTF-8"/><title>سند صرف - PMT-${String(voucherNumber).padStart(5, '0')}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1e293b;font-size:13px;direction:rtl;background:#fff}
  .page{width:148mm;min-height:105mm;margin:10mm auto;padding:10mm 12mm;border:2px solid #3b82f6;border-radius:12px;display:flex;flex-direction:column;gap:14px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2px dashed #e2e8f0}
  .logo-box{width:50px;height:50px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:900;overflow:hidden}
  .logo-area{display:flex;gap:10px;align-items:center}
  .company-info h1{font-size:15px;font-weight:900;color:#3b82f6;margin-bottom:2px}
  .company-info p{font-size:10px;color:#64748b;line-height:1.6}
  .badge-area{text-align:left}
  .badge-type{display:inline-block;background:#eff6ff;color:#1e40af;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:800;margin-bottom:6px}
  .badge-num{font-size:22px;font-weight:900;color:#3b82f6;font-family:monospace;text-align:left}
  .badge-date{font-size:11px;color:#64748b;text-align:left;margin-top:2px}
  .amount-box{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #3b82f6;border-radius:10px;padding:14px 20px;text-align:center}
  .amount-label{font-size:12px;color:#64748b;font-weight:600;margin-bottom:4px}
  .amount-value{font-size:32px;font-weight:900;color:#1d4ed8}
  .amount-words{font-size:11px;color:#64748b;margin-top:4px}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .meta-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px}
  .meta-card .title{font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px}
  .ml{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px}
  .ml:last-child{margin-bottom:0}
  .mk{font-size:11px;color:#64748b} .mv{font-size:11px;color:#1e293b;font-weight:700}
  .desc-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;font-size:12px;color:#475569}
  .desc-box strong{color:#1e293b}
  .footer{display:flex;justify-content:space-between;align-items:flex-end;padding-top:10px;border-top:1px dashed #e2e8f0;margin-top:auto}
  .sig{text-align:center;min-width:100px}
  .sig .sl{font-size:10px;color:#94a3b8;margin-bottom:24px}
  .sig .ss{border-top:1px solid #cbd5e1;padding-top:3px;font-size:10px;color:#64748b}
  .cf{text-align:center;font-size:10px;color:#94a3b8;line-height:1.7}
  .cf strong{color:#64748b}
  @media print{body{margin:0}.page{margin:5mm auto;border-width:3px}@page{size:A5 landscape;margin:0}}
</style></head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-area">
      <div class="logo-box">${COMPANY.logo ? `<img src="${COMPANY.logo}" style="width:100%;height:100%;object-fit:contain"/>` : COMPANY.name.charAt(0)}</div>
      <div class="company-info">
        <h1>${COMPANY.name}</h1>
        <p style="color:#64748b;font-size:10px">${COMPANY.nameEn}</p>
        <p>${COMPANY.phone}</p>
        <p>${COMPANY.email}</p>
      </div>
    </div>
    <div class="badge-area">
      <div><span class="badge-type">📤 سند صرف</span></div>
      <div class="badge-num">PMT-${String(voucherNumber).padStart(5, '0')}</div>
      <div class="badge-date">${date}</div>
    </div>
  </div>
  <div class="amount-box">
    <div class="amount-label">المبلغ المصروف</div>
    <div class="amount-value">${amount} ${cSymbol}</div>
    ${form.description ? `<div class="amount-words">${form.description}</div>` : ''}
  </div>
  <div class="meta-grid">
    <div class="meta-card">
      <div class="title">بيانات المستفيد</div>
      <div class="ml"><span class="mk">الاسم</span><span class="mv">${supplier?.name || '—'}</span></div>
      ${supplier?.phone ? `<div class="ml"><span class="mk">الهاتف</span><span class="mv">${supplier.phone}</span></div>` : ''}
      <div class="ml">
        <span class="mk">الرصيد بعد السند</span>
        <span class="mv" style="color:${(isCust ? nextBal < 0 : nextBal > 0) ? '#dc2626' : '#166534'}">
          ${Math.abs(nextBal).toLocaleString('en-US')} ${cSymbol}
        </span>
      </div>
    </div>
    <div class="meta-card">
      <div class="title">تفاصيل السند</div>
      <div class="ml"><span class="mk">رقم السند</span><span class="mv" style="font-family:monospace">PMT-${String(voucherNumber).padStart(5, '0')}</span></div>
      <div class="ml"><span class="mk">التاريخ</span><span class="mv">${date}</span></div>
      <div class="ml"><span class="mk">طريقة الدفع</span><span class="mv">${form.paymentType === 'cash' ? 'نقدي' : 'تحويل بنكي'}</span></div>
      <div class="ml"><span class="mk">الخزينة</span><span class="mv">${voucher.treasury?.name || '—'}</span></div>
    </div>
  </div>
  <div class="footer">
    <div class="sig"><div class="sl">توقيع المستفيد</div><div class="ss">الاسم والتوقيع</div></div>
    <div class="cf"><strong>${COMPANY.name}</strong><br/>${COMPANY.address}<br/><span style="color:#3b82f6;font-weight:700">سند رسمي معتمد</span></div>
    <div class="sig"><div class="sl">توقيع المُصرِف</div><div class="ss">الاسم والتوقيع</div></div>
  </div>
</div>
<script>window.onload=()=>window.print();</script>
</body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
}
