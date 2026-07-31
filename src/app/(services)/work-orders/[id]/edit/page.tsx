'use client';
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, IS, LS, SC, STitle, BTN_PRIMARY, focusIn, focusOut } from '@/constants/theme';
import { ClipboardList, Save, Search, X, Package, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

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

const STATUS_OPTIONS = [
    { value: 'new',         label: 'جديد' },
    { value: 'assigned',    label: 'مُسنَد' },
    { value: 'in_progress', label: 'قيد التنفيذ' },
    { value: 'completed',   label: 'مكتمل' },
    { value: 'cancelled',   label: 'ملغى' },
];

export default function EditWorkOrderPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [contracts, setContracts] = useState<ServiceContract[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [items, setItems] = useState<any[]>([]);
    
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerList, setShowCustomerList] = useState(false);

    interface MaterialLine { itemId: string; name: string; code: string; quantity: number; unitPrice: number; total: number; unit: string; }
    const [lines, setLines] = useState<MaterialLine[]>([]);
    const [itemSelectId, setItemSelectId] = useState('');
    const [itemQty, setItemQty] = useState<number | ''>(1);
    const [itemPrice, setItemPrice] = useState<number | ''>(0);

    const [form, setForm] = useState({
        type: 'maintenance',
        priority: 'normal',
        status: 'new',
        customerId: '',
        customerName: '',
        contractId: '',
        customerPONumber: '',
        assignedTo: '',
        scheduledDate: '',
        description: '',
        notes: '',
        resolution: '',
    });

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetch(`/api/work-orders/${id}`).then(r => r.ok ? r.json() : null),
            fetch('/api/customers?take=1000').then(r => r.ok ? r.json() : []),
            fetch('/api/service-contracts').then(r => r.ok ? r.json() : []),
            fetch('/api/employees?take=1000').then(r => r.ok ? r.json() : []),
            fetch('/api/items?all=true').then(r => r.ok ? r.json() : []),
        ]).then(([wo, custData, contractData, empData, itemData]) => {
            if (!wo) {
                setError('تعذر تحميل بيانات أمر العمل');
                setLoading(false);
                return;
            }

            const custList: Customer[] = Array.isArray(custData) ? custData : (custData.data || []);
            const contractList: ServiceContract[] = Array.isArray(contractData) ? contractData : [];
            const empList: Employee[] = Array.isArray(empData) ? empData : (empData.data || []);
            const itemList: any[] = Array.isArray(itemData) ? itemData : [];
            
            setCustomers(custList);
            setContracts(contractList);
            setEmployees(empList);
            setItems(itemList);

            setForm({
                type: wo.type,
                priority: wo.priority,
                status: wo.status,
                customerId: wo.customerId || '',
                customerName: wo.customer?.name || '',
                contractId: wo.contractId || '',
                customerPONumber: wo.customerPONumber || '',
                assignedTo: wo.assignedTo || '',
                scheduledDate: wo.scheduledDate ? wo.scheduledDate.split('T')[0] : '',
                description: wo.description || '',
                notes: wo.notes || '',
                resolution: wo.resolution || '',
            });

            if (wo.customer) {
                setCustomerSearch(wo.customer.name);
            }

            if (wo.materials?.length) {
                setLines(wo.materials.map((m: any) => ({
                    itemId: m.itemId,
                    name: m.item?.name || '',
                    code: m.item?.code || '',
                    quantity: m.quantity,
                    unitPrice: m.unitPrice,
                    total: m.total,
                    unit: m.unit || m.item?.unit?.name || '',
                })));
            }

            setLoading(false);
        }).catch(err => {
            console.error(err);
            setError('خطأ أثناء تحميل البيانات');
            setLoading(false);
        });
    }, [id]);

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

    const addMaterialLine = () => {
        if (!itemSelectId) return;
        const matched = items.find(i => i.id === itemSelectId);
        if (!matched) return;
        
        const qty = Number(itemQty) || 1;
        const price = Number(itemPrice) || 0;
        
        const existsIdx = lines.findIndex(l => l.itemId === itemSelectId);
        if (existsIdx > -1) {
            setLines(prev => prev.map((l, i) => i === existsIdx ? {
                ...l,
                quantity: l.quantity + qty,
                total: (l.quantity + qty) * l.unitPrice
            } : l));
        } else {
            setLines(prev => [...prev, {
                itemId: itemSelectId,
                name: matched.name,
                code: matched.code || '',
                quantity: qty,
                unitPrice: price,
                total: qty * price,
                unit: matched.unit?.name || matched.unitName || '',
            }]);
        }
        
        setItemSelectId('');
        setItemQty(1);
        setItemPrice(0);
    };

    const removeMaterialLine = (idx: number) => {
        setLines(prev => prev.filter((_, i) => i !== idx));
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
            const res = await fetch(`/api/work-orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: form.type,
                    priority: form.priority,
                    status: form.status,
                    customerId: form.customerId || null,
                    contractId: form.contractId || null,
                    customerPONumber: form.customerPONumber || null,
                    assignedTo: form.assignedTo || null,
                    scheduledDate: form.scheduledDate || null,
                    description: form.description,
                    notes: form.notes || null,
                    resolution: form.resolution || null,
                    materials: lines.map(l => ({
                        itemId: l.itemId,
                        quantity: l.quantity,
                        unitPrice: l.unitPrice,
                        unit: l.unit || null
                    }))
                }),
            });
            if (res.ok) {
                router.push(`/work-orders/${id}`);
            } else {
                const data = await res.json();
                setError(data.error || 'فشل في حفظ التعديلات');
            }
        } catch {
            setError('خطأ في الاتصال بالسيرفر');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ paddingBottom: '60px', fontFamily: CAIRO }}>
                <PageHeader
                    title="تعديل أمر العمل"
                    subtitle="تحديث تفاصيل أمر العمل والقطع والحلول"
                    icon={ClipboardList}
                    backUrl={`/work-orders/${id}`}
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
                                <p style={STitle}>الوصف والتفاصيل</p>
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
                                        <label style={LS}>الحل والإجراء المتخذ (Resolution)</label>
                                        <textarea
                                            value={form.resolution}
                                            onChange={e => setForm(f => ({ ...f, resolution: e.target.value }))}
                                            placeholder="اكتب ما تم إنجازه أو خطوات حل المشكلة..."
                                            rows={4}
                                            style={{ ...IS, height: 'auto', padding: '12px 16px', resize: 'vertical' } as React.CSSProperties}
                                            onFocus={focusIn} onBlur={focusOut}
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

                            <div style={SC}>
                                <p style={STitle}><Package size={14} /> المواد المستخدمة (المخزن والقطع)</p>
                                
                                {/* Form to add new material */}
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px auto', gap: '10px', alignItems: 'end', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>اختر الصنف</label>
                                        <CustomSelect
                                            value={itemSelectId}
                                            onChange={v => {
                                                setItemSelectId(v);
                                                const matched = items.find(i => i.id === v);
                                                if (matched) setItemPrice(matched.sellPrice || 0);
                                            }}
                                            placeholder="ابحث عن صنف..."
                                            options={items.map(i => ({ value: i.id, label: `${i.name} (${i.code || ''})` }))}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>الكمية</label>
                                        <input
                                            type="number"
                                            value={itemQty}
                                            onChange={e => setItemQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            style={{ ...IS, height: '38px', fontSize: '13px' }}
                                            placeholder="1"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>سعر الوحدة</label>
                                        <input
                                            type="number"
                                            value={itemPrice}
                                            onChange={e => setItemPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            style={{ ...IS, height: '38px', fontSize: '13px' }}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addMaterialLine}
                                        style={{ height: '38px', padding: '0 20px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        إضافة
                                    </button>
                                </div>

                                {/* Table of added materials */}
                                {lines.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: C.textMuted, fontSize: '12px' }}>
                                        لم يتم إضافة أية قطع أو مواد مستهلكة بعد
                                    </div>
                                ) : (
                                    <div className="table-container" style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
                                                    <th style={{ textAlign: 'right', padding: '8px', fontSize: '12px', color: C.textSecondary }}>الصنف</th>
                                                    <th style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: C.textSecondary, width: '80px' }}>الكمية</th>
                                                    <th style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: C.textSecondary, width: '70px' }}>الوحدة</th>
                                                    <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: C.textSecondary, width: '100px' }}>سعر الوحدة</th>
                                                    <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: C.textSecondary, width: '100px' }}>الإجمالي</th>
                                                    <th style={{ textAlign: 'center', padding: '8px', width: '50px' }}>✓</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lines.map((line, idx) => (
                                                    <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                                                        <td style={{ padding: '8px', fontSize: '13px', color: C.textPrimary }}>
                                                            {line.name} <span style={{ fontSize: '11px', color: C.textMuted }}>({line.code})</span>
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'center', fontSize: '13px', color: C.textPrimary, fontFamily: OUTFIT }}>{line.quantity}</td>
                                                        <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: C.textSecondary }}>{line.unit || '—'}</td>
                                                        <td style={{ padding: '8px', textAlign: 'left', fontSize: '13px', color: C.textPrimary, fontFamily: OUTFIT }}>{line.unitPrice.toLocaleString()}</td>
                                                        <td style={{ padding: '8px', textAlign: 'left', fontSize: '13px', color: C.textPrimary, fontFamily: OUTFIT, fontWeight: 700 }}>{line.total.toLocaleString()}</td>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeMaterialLine(idx)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger }}
                                                            >
                                                                <X size={15} />
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={SC}>
                                <p style={STitle}>حفظ التغييرات</p>
                                {error && (
                                    <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: '10px', color: '#ef4444', fontSize: '13px', marginBottom: '14px', fontFamily: CAIRO }}>
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label style={LS}>حالة أمر العمل</label>
                                    <CustomSelect
                                        value={form.status}
                                        onChange={val => setForm(f => ({ ...f, status: val }))}
                                        options={STATUS_OPTIONS}
                                        hideSearch
                                    />
                                </div>

                                <button type="submit" disabled={saving} style={{ ...BTN_PRIMARY(false, saving), marginTop: '16px' }}>
                                    <Save size={16} />
                                    {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    style={{ width: '100%', height: '42px', marginTop: '10px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: CAIRO }}
                                >
                                    إلغاء التعديل
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
