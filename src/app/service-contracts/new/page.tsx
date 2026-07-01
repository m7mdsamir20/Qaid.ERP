'use client';
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { C, CAIRO, OUTFIT, IS, LS, SC, STitle, BTN_PRIMARY, focusIn, focusOut } from '@/constants/theme';
import { FileText, Save, Search, X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CustomSelect from '@/components/CustomSelect';

interface Customer { id: string; name: string; phone: string | null; }

const CONTRACT_TYPES = [
    { value: 'maintenance', label: 'صيانة' },
    { value: 'consulting',  label: 'استشارات' },
    { value: 'development', label: 'تطوير' },
    { value: 'support',     label: 'دعم فني' },
];

const BILLING_CYCLES = [
    { value: 'monthly',     label: 'شهري' },
    { value: 'quarterly',   label: 'ربع سنوي' },
    { value: 'semi_annual', label: 'نصف سنوي' },
    { value: 'annual',      label: 'سنوي' },
];

export default function NewServiceContractPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);


    const [form, setForm] = useState({
        customerId: '',
        customerName: '',
        type: 'maintenance',
        startDate: '',
        endDate: '',
        contractValue: '',
        billingCycle: 'monthly',
        autoRenew: false,
        description: '',
        terms: '',
    });

    useEffect(() => {
        fetch('/api/customers')
            .then(r => r.json())
            .then((data: Customer[]) => setCustomers(Array.isArray(data) ? data : []))
            .catch(() => setCustomers([]));
    }, []);



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!form.type || !form.startDate || !form.contractValue) {
            setError('يرجى تعبئة الحقول المطلوبة: نوع العقد، تاريخ البداية، قيمة العقد');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/service-contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: form.customerId || null,
                    type: form.type,
                    startDate: form.startDate,
                    endDate: form.endDate || null,
                    contractValue: parseFloat(form.contractValue.replace(/,/g, '')) || 0,
                    billingCycle: form.billingCycle,
                    autoRenew: form.autoRenew,
                    description: form.description || null,
                    terms: form.terms || null,
                }),
            });
            if (res.ok) {
                const contract = await res.json();
                router.push(`/service-contracts/${contract.id}`);
            } else {
                const data = await res.json();
                setError(data.error || 'فشل في حفظ العقد');
            }
        } catch {
            setError('خطأ في الاتصال بالسيرفر');
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = { ...IS };

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ paddingBottom: '60px', fontFamily: CAIRO }}>
                <PageHeader
                    title="عقد خدمة جديد"
                    subtitle="إنشاء عقد خدمة جديد مع العميل"
                    icon={FileText}
                    backUrl="/service-contracts"
                />

                <form onSubmit={handleSubmit}>
                    <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px' }}>

                        {/* Main Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Customer + Type */}
                            <div style={SC}>
                                <p style={STitle}><FileText size={14} /> بيانات العقد</p>
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

                                    {/* Customer Select */}
                                    <div>
                                        <label style={LS}>العميل</label>
                                        <CustomSelect
                                            value={form.customerId}
                                            onChange={val => {
                                                const c = customers.find(cust => cust.id === val);
                                                setForm(f => ({ ...f, customerId: val, customerName: c ? c.name : '' }));
                                            }}
                                            options={customers.map(c => ({
                                                value: c.id,
                                                label: c.name,
                                                sub: c.phone || undefined
                                            }))}
                                            placeholder="ابحث عن عميل..."
                                            style={{ width: '100%' }}
                                        />
                                    </div>

                                    {/* Type */}
                                    <div>
                                        <label style={LS}>نوع العقد <span style={{ color: C.danger }}>*</span></label>
                                        <CustomSelect
                                            value={form.type}
                                            onChange={val => setForm(f => ({ ...f, type: val }))}
                                            options={CONTRACT_TYPES}
                                            hideSearch={true}
                                            style={{ width: '100%' }}
                                        />
                                    </div>

                                    {/* Start Date */}
                                    <div>
                                        <label style={LS}>تاريخ البداية <span style={{ color: C.danger }}>*</span></label>
                                        <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} style={{ ...inputStyle, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} required />
                                    </div>

                                    {/* End Date */}
                                    <div>
                                        <label style={LS}>تاريخ الانتهاء</label>
                                        <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={{ ...inputStyle, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>

                                    {/* Contract Value */}
                                    <div>
                                        <label style={LS}>قيمة العقد <span style={{ color: C.danger }}>*</span></label>
                                        <input
                                            type="text" inputMode="decimal"
                                            placeholder="0.00"
                                            value={form.contractValue}
                                            onChange={e => {
                                                const v = e.target.value.replace(/[^0-9.]/g, '');
                                                if ((v.match(/\./g) || []).length > 1) return;
                                                setForm(f => ({ ...f, contractValue: v }));
                                            }}
                                            style={{ ...inputStyle, fontFamily: OUTFIT }}
                                            onFocus={focusIn} onBlur={focusOut}
                                        />
                                    </div>

                                    {/* Billing Cycle */}
                                    <div>
                                        <label style={LS}>دورية الفوترة</label>
                                        <CustomSelect
                                            value={form.billingCycle}
                                            onChange={val => setForm(f => ({ ...f, billingCycle: val }))}
                                            options={BILLING_CYCLES}
                                            hideSearch={true}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>

                                {/* Auto Renew */}
                                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ position: 'relative', width: '22px', height: '22px' }}>
                                        <input
                                            type="checkbox"
                                            id="autoRenew"
                                            checked={form.autoRenew}
                                            onChange={e => setForm(f => ({ ...f, autoRenew: e.target.checked }))}
                                            style={{ width: '100%', height: '100%', opacity: 0, position: 'absolute', inset: 0, zIndex: 2, cursor: 'pointer' }}
                                        />
                                        <div style={{ position: 'absolute', inset: 0, background: form.autoRenew ? C.primary : 'transparent', border: `2px solid ${form.autoRenew ? C.primary : C.border}`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                            {form.autoRenew && <Check size={14} color="#fff" strokeWidth={3} />}
                                        </div>
                                    </div>
                                    <label htmlFor="autoRenew" style={{ fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO, cursor: 'pointer', margin: 0 }}>تجديد تلقائي</label>
                                </div>
                            </div>

                            {/* Description */}
                            <div style={SC}>
                                <p style={STitle}>الوصف والشروط</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <label style={LS}>وصف العقد</label>
                                        <textarea
                                            value={form.description}
                                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                            placeholder="وصف مختصر لنطاق الخدمة..."
                                            rows={4}
                                            style={{ ...IS, height: 'auto', padding: '12px 16px', resize: 'vertical' } as any}
                                            onFocus={focusIn} onBlur={focusOut}
                                        />
                                    </div>
                                    <div>
                                        <label style={LS}>شروط العقد</label>
                                        <textarea
                                            value={form.terms}
                                            onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                                            placeholder="البنود والشروط التعاقدية..."
                                            rows={4}
                                            style={{ ...IS, height: 'auto', padding: '12px 16px', resize: 'vertical' } as any}
                                            onFocus={focusIn} onBlur={focusOut}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={SC}>
                                <p style={STitle}>حفظ العقد</p>
                                {error && (
                                    <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: '10px', color: '#ef4444', fontSize: '13px', marginBottom: '14px', fontFamily: CAIRO }}>
                                        {error}
                                    </div>
                                )}
                                <button type="submit" disabled={saving} style={BTN_PRIMARY(false, saving)}>
                                    <Save size={16} />
                                    {saving ? 'جاري الحفظ...' : 'حفظ العقد'}
                                </button>
                                <button type="button" onClick={() => router.back()} style={{ width: '100%', height: '42px', marginTop: '10px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: CAIRO }}>
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
