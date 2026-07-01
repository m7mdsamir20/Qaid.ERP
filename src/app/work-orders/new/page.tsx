'use client';
import React, { useState, useEffect, Suspense } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, IS, LS, SC, STitle, BTN_PRIMARY, focusIn, focusOut } from '@/constants/theme';
import { ClipboardList, Save, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Customer { id: string; name: string; }
interface ServiceContract { id: string; contractNumber: number; type: string; customerId: string | null; }
interface Employee { id: string; name: string; position: string | null; }

const ORDER_TYPES = [
    { value: 'maintenance',  label: 'صيانة' },
    { value: 'installation', label: 'تركيب' },
    { value: 'repair',       label: 'إصلاح' },
    { value: 'inspection',   label: 'فحص وتفتيش' },
    { value: 'consulting',   label: 'استشارات' },
];

const PRIORITIES = [
    { value: 'low',    label: 'منخفضة' },
    { value: 'normal', label: 'عادية' },
    { value: 'high',   label: 'عالية' },
    { value: 'urgent', label: 'عاجلة' },
];

export default function NewWorkOrderPage() {
    return <Suspense><NewWorkOrderForm /></Suspense>;
}

function NewWorkOrderForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const presetContractId = searchParams.get('contractId') || '';
    const presetCustomerId = searchParams.get('customerId') || '';

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [contracts, setContracts] = useState<ServiceContract[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerList, setShowCustomerList] = useState(false);

    const [form, setForm] = useState({
        type: 'maintenance',
        priority: 'normal',
        customerId: presetCustomerId,
        customerName: '',
        contractId: presetContractId,
        customerPONumber: '',
        assignedTo: '',
        scheduledDate: '',
        description: '',
        notes: '',
    });

    useEffect(() => {
        Promise.all([
            fetch('/api/customers?take=1000').then(r => r.ok ? r.json() : []),
            fetch('/api/service-contracts').then(r => r.ok ? r.json() : []),
            fetch('/api/employees?take=1000').then(r => r.ok ? r.json() : []),
        ]).then(([custData, contractData, empData]) => {
            const custList: Customer[] = Array.isArray(custData) ? custData : (custData.data || []);
            const contractList: ServiceContract[] = Array.isArray(contractData) ? contractData : [];
            const empList: Employee[] = Array.isArray(empData) ? empData : (empData.data || []);
            setCustomers(custList);
            setContracts(contractList);
            setEmployees(empList);

            if (presetCustomerId) {
                const found = custList.find((c: Customer) => c.id === presetCustomerId);
                if (found) setCustomerSearch(found.name);
            }
        }).catch(console.error);
    }, [presetCustomerId]);

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase())
    );

    const filteredContracts = contracts.filter(c =>
        !form.customerId || c.customerId === form.customerId
    );

    const selectCustomer = (c: Customer) => {
        setForm(f => ({ ...f, customerId: c.id, contractId: '' }));
        setCustomerSearch(c.name);
        setShowCustomerList(false);
    };

    const clearCustomer = () => {
        setForm(f => ({ ...f, customerId: '', contractId: '' }));
        setCustomerSearch('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!form.type || !form.description.trim()) {
            setError('يرجى تعبئة الحقول المطلوبة: نوع الأمر، الوصف');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/work-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: form.type,
                    priority: form.priority,
                    customerId: form.customerId || null,
                    contractId: form.contractId || null,
                    customerPONumber: form.customerPONumber || null,
                    assignedTo: form.assignedTo || null,
                    scheduledDate: form.scheduledDate || null,
                    description: form.description,
                    notes: form.notes || null,
                }),
            });
            if (res.ok) {
                router.push('/work-orders');
            } else {
                const data = await res.json();
                setError(data.error || 'فشل في حفظ أمر العمل');
            }
        } catch {
            setError('خطأ في الاتصال بالسيرفر');
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ paddingBottom: '60px', fontFamily: CAIRO }}>
                <PageHeader
                    title="أمر عمل جديد"
                    subtitle="إنشاء أمر عمل جديد"
                    icon={ClipboardList}
                />

                <form onSubmit={handleSubmit}>
                    <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            <div style={SC}>
                                <p style={STitle}><ClipboardList size={14} /> بيانات أمر العمل</p>
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

                                    <div>
                                        <label style={LS}>نوع الأمر <span style={{ color: C.danger }}>*</span></label>
                                        <CustomSelect
                                            value={form.type}
                                            onChange={val => setForm(f => ({ ...f, type: val }))}
                                            options={ORDER_TYPES.map(t => ({ value: t.value, label: t.label }))}
                                            hideSearch
                                        />
                                    </div>

                                    <div>
                                        <label style={LS}>الأولوية</label>
                                        <CustomSelect
                                            value={form.priority}
                                            onChange={val => setForm(f => ({ ...f, priority: val }))}
                                            options={PRIORITIES.map(p => ({ value: p.value, label: p.label }))}
                                            hideSearch
                                        />
                                    </div>

                                    <div>
                                        <label style={LS}>العميل</label>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={15} style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted, pointerEvents: 'none' }} />
                                            <input
                                                type="text"
                                                placeholder="ابحث عن عميل..."
                                                value={customerSearch}
                                                onChange={e => { setCustomerSearch(e.target.value); setShowCustomerList(true); }}
                                                onFocus={() => setShowCustomerList(true)}
                                                onBlur={() => setTimeout(() => setShowCustomerList(false), 200)}
                                                style={{ ...IS, paddingInlineStart: '38px', paddingInlineEnd: form.customerId ? '36px' : '12px' }}
                                            />
                                            {form.customerId && (
                                                <button type="button" onClick={clearCustomer} style={{ position: 'absolute', insetInlineEnd: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: '2px' }}>
                                                    <X size={14} />
                                                </button>
                                            )}
                                            {showCustomerList && filteredCustomers.length > 0 && (
                                                <div style={{ position: 'absolute', top: '100%', insetInlineStart: 0, insetInlineEnd: 0, background: '#0e172a', border: `1px solid ${C.border}`, borderRadius: '10px', zIndex: 50, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                                                    {filteredCustomers.slice(0, 20).map(c => (
                                                        <div
                                                            key={c.id}
                                                            onMouseDown={() => selectCustomer(c)}
                                                            style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: C.textPrimary, borderBottom: `1px solid ${C.border}`, fontFamily: CAIRO }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                        >
                                                            {c.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={LS}>عقد الخدمة</label>
                                        <CustomSelect
                                            value={form.contractId}
                                            onChange={val => setForm(f => ({ ...f, contractId: val }))}
                                            placeholder="— بدون عقد —"
                                            options={[
                                                { value: '', label: '— بدون عقد —' },
                                                ...filteredContracts.map(c => ({ value: c.id, label: `SC-${String(c.contractNumber).padStart(5, '0')}` }))
                                            ]}
                                            hideSearch
                                        />
                                    </div>

                                    <div>
                                        <label style={LS}>رقم أمر الشراء</label>
                                        <input
                                            type="text"
                                            placeholder="اختياري"
                                            value={form.customerPONumber}
                                            onChange={e => setForm(f => ({ ...f, customerPONumber: e.target.value }))}
                                            style={{ ...IS, fontFamily: OUTFIT }}
                                            onFocus={focusIn} onBlur={focusOut}
                                        />
                                    </div>

                                    <div>
                                        <label style={LS}>الموظف المسؤول</label>
                                        <CustomSelect
                                            value={form.assignedTo}
                                            onChange={val => setForm(f => ({ ...f, assignedTo: val }))}
                                            placeholder="— غير مُسنَد —"
                                            options={[
                                                { value: '', label: '— غير مُسنَد —' },
                                                ...employees.map(emp => ({ value: emp.id, label: emp.name + (emp.position ? ` — ${emp.position}` : '') }))
                                            ]}
                                        />
                                    </div>

                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={LS}>التاريخ المجدول</label>
                                        <input
                                            type="date"
                                            value={form.scheduledDate}
                                            onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                                            style={{ ...IS, fontFamily: OUTFIT }}
                                            onFocus={focusIn} onBlur={focusOut}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={SC}>
                                <p style={STitle}>الوصف والملاحظات</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <label style={LS}>الوصف <span style={{ color: C.danger }}>*</span></label>
                                        <textarea
                                            value={form.description}
                                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                            placeholder="وصف أمر العمل والمهام المطلوبة..."
                                            rows={4}
                                            style={{ ...IS, height: 'auto', padding: '12px 16px', resize: 'vertical' } as React.CSSProperties}
                                            onFocus={focusIn} onBlur={focusOut}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={LS}>ملاحظات</label>
                                        <textarea
                                            value={form.notes}
                                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                            placeholder="ملاحظات إضافية..."
                                            rows={3}
                                            style={{ ...IS, height: 'auto', padding: '12px 16px', resize: 'vertical' } as React.CSSProperties}
                                            onFocus={focusIn} onBlur={focusOut}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={SC}>
                                <p style={STitle}>حفظ أمر العمل</p>
                                {error && (
                                    <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: '10px', color: '#ef4444', fontSize: '13px', marginBottom: '14px', fontFamily: CAIRO }}>
                                        {error}
                                    </div>
                                )}
                                <button type="submit" disabled={saving} style={BTN_PRIMARY(false, saving)}>
                                    <Save size={16} />
                                    {saving ? 'جاري الحفظ...' : 'حفظ أمر العمل'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    style={{ width: '100%', height: '42px', marginTop: '10px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: CAIRO }}
                                >
                                    إلغاء
                                </button>
                            </div>

                            <div style={SC}>
                                <p style={STitle}>معلومات</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {[
                                        { label: 'الحالة الابتدائية', value: 'جديد (سيتغير إلى مُسنَد عند تحديد موظف)' },
                                        { label: 'القسم', value: 'الخدمات' },
                                    ].map((item, i) => (
                                        <div key={i} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                                            <div style={{ fontSize: '10px', color: C.textMuted, marginBottom: '3px', fontWeight: 700 }}>{item.label}</div>
                                            <div style={{ fontSize: '12px', color: C.textSecondary }}>{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
