'use client';
import React, { useState, useEffect, Suspense } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, IS, LS, SC, STitle, BTN_PRIMARY, focusIn, focusOut } from '@/constants/theme';
import { ClipboardList, Save, X, Package, Wrench } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Customer { id: string; name: string; }
interface ServiceContract { id: string; contractNumber: number; type: string; customerId: string | null; }
interface Employee { id: string; name: string; position: string | null; }
interface CatalogItem { id: string; code: string; name: string; }

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
    const [serviceCatalog, setServiceCatalog] = useState<CatalogItem[]>([]);

    interface MaterialLine { itemId: string; name: string; code: string; quantity: number; unitPrice: number; total: number; unit: string; }
    const [items, setItems] = useState<any[]>([]);
    const [lines, setLines] = useState<MaterialLine[]>([]);
    const [itemSelectId, setItemSelectId] = useState('');
    const [itemQty, setItemQty] = useState<number | ''>(1);
    const [itemPrice, setItemPrice] = useState<number | ''>(0);

    const [form, setForm] = useState({
        type: '',
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
            fetch('/api/items?all=true').then(r => r.ok ? r.json() : []),
            fetch('/api/service-catalog').then(r => r.ok ? r.json() : []),
        ]).then(([custData, contractData, empData, itemData, catalogData]) => {
            const custList: Customer[] = Array.isArray(custData) ? custData : (custData.data || []);
            const contractList: ServiceContract[] = Array.isArray(contractData) ? contractData : [];
            const empList: Employee[] = Array.isArray(empData) ? empData : (empData.data || []);
            const itemList: any[] = Array.isArray(itemData) ? itemData : [];
            const catalog: CatalogItem[] = Array.isArray(catalogData) ? catalogData : [];
            setCustomers(custList);
            setContracts(contractList);
            setEmployees(empList);
            setItems(itemList);
            setServiceCatalog(catalog);
        }).catch(console.error);
    }, [presetCustomerId]);

    const filteredContracts = contracts.filter(c =>
        !form.customerId || c.customerId === form.customerId
    );

    const addMaterialLine = () => {
        if (!itemSelectId) return;
        const matched = items.find(i => i.id === itemSelectId);
        if (!matched) return;
        const qty = Number(itemQty) || 1;
        const price = Number(itemPrice) || 0;
        const existsIdx = lines.findIndex(l => l.itemId === itemSelectId);
        if (existsIdx > -1) {
            setLines(prev => prev.map((l, i) => i === existsIdx ? { ...l, quantity: l.quantity + qty, total: (l.quantity + qty) * l.unitPrice } : l));
        } else {
            setLines(prev => [...prev, { itemId: itemSelectId, name: matched.name, code: matched.code || '', quantity: qty, unitPrice: price, total: qty * price, unit: matched.unit?.name || matched.unitName || '' }]);
        }
        setItemSelectId('');
        setItemQty(1);
        setItemPrice(0);
    };

    const removeMaterialLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

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
                    materials: lines.map(l => ({ itemId: l.itemId, quantity: l.quantity, unitPrice: l.unitPrice, unit: l.unit || null }))
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
                <PageHeader title="أمر عمل جديد" subtitle="إنشاء أمر عمل جديد" icon={ClipboardList} backUrl="/work-orders" />

                <form onSubmit={handleSubmit}>
                    <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            <div style={SC}>
                                <p style={STitle}><ClipboardList size={14} /> بيانات أمر العمل</p>
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

                                    <div>
                                        <label style={LS}>نوع الأمر <span style={{ color: C.danger }}>*</span></label>
                                        {serviceCatalog.length > 0 ? (
                                            <CustomSelect
                                                value={form.type}
                                                onChange={val => setForm(f => ({ ...f, type: val }))}
                                                options={serviceCatalog.map(s => ({ value: s.name, label: s.name, sub: s.code }))}
                                                placeholder="اختر من كاتلوج الخدمات..."
                                            />
                                        ) : (
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="اكتب نوع الأمر..."
                                                    value={form.type}
                                                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                                    style={IS}
                                                    onFocus={focusIn} onBlur={focusOut}
                                                />
                                                <p style={{ fontSize: '10px', color: C.textMuted, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Wrench size={10} /> أضف خدمات في كاتلوج الخدمات لتظهر هنا كقائمة
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label style={LS}>الأولوية</label>
                                        <CustomSelect
                                            value={form.priority}
                                            onChange={val => setForm(f => ({ ...f, priority: val }))}
                                            options={PRIORITIES}
                                            hideSearch
                                        />
                                    </div>

                                    <div>
                                        <label style={LS}>العميل</label>
                                        <CustomSelect
                                            value={form.customerId}
                                            onChange={val => {
                                                const c = customers.find(cust => cust.id === val);
                                                setForm(f => ({ ...f, customerId: val, customerName: c ? c.name : '' }));
                                            }}
                                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                                            placeholder="ابحث عن عميل..."
                                        />
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
                                        <input type="text" placeholder="اختياري" value={form.customerPONumber} onChange={e => setForm(f => ({ ...f, customerPONumber: e.target.value }))} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
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
                                        <input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                </div>
                            </div>

                            <div style={SC}>
                                <p style={STitle}>الوصف والملاحظات</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <label style={LS}>الوصف <span style={{ color: C.danger }}>*</span></label>
                                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف أمر العمل والمهام المطلوبة..." rows={4} style={{ ...IS, height: 'auto', padding: '12px 16px', resize: 'vertical' } as React.CSSProperties} onFocus={focusIn} onBlur={focusOut} required />
                                    </div>
                                    <div>
                                        <label style={LS}>ملاحظات</label>
                                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات إضافية..." rows={3} style={{ ...IS, height: 'auto', padding: '12px 16px', resize: 'vertical' } as React.CSSProperties} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                </div>
                            </div>

                            <div style={SC}>
                                <p style={STitle}><Package size={14} /> المواد المستخدمة (المخزن والقطع)</p>
                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px auto', gap: '10px', alignItems: 'end', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>اختر الصنف</label>
                                        <CustomSelect value={itemSelectId} onChange={v => { setItemSelectId(v); const matched = items.find(i => i.id === v); if (matched) setItemPrice(matched.sellPrice || 0); }} placeholder="ابحث عن صنف..." options={items.map(i => ({ value: i.id, label: `${i.name} (${i.code || ''})` }))} />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>الكمية</label>
                                        <input type="number" value={itemQty} onChange={e => setItemQty(e.target.value === '' ? '' : parseFloat(e.target.value))} style={{ ...IS, height: '38px', fontSize: '13px' }} placeholder="1" />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>سعر الوحدة</label>
                                        <input type="number" value={itemPrice} onChange={e => setItemPrice(e.target.value === '' ? '' : parseFloat(e.target.value))} style={{ ...IS, height: '38px', fontSize: '13px' }} placeholder="0.00" />
                                    </div>
                                    <button type="button" onClick={addMaterialLine} style={{ height: '38px', padding: '0 20px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>إضافة</button>
                                </div>

                                {lines.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: C.textMuted, fontSize: '12px' }}>لم يتم إضافة أية قطع أو مواد مستهلكة بعد</div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
                                                    {['الصنف', 'الكمية', 'الوحدة', 'سعر الوحدة', 'الإجمالي', ''].map((h, i) => (
                                                        <th key={i} style={{ textAlign: i === 0 ? 'right' : 'center', padding: '8px', fontSize: '12px', color: C.textSecondary }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lines.map((line, idx) => (
                                                    <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                                                        <td style={{ padding: '8px', fontSize: '13px', color: C.textPrimary }}>{line.name} <span style={{ fontSize: '11px', color: C.textMuted }}>({line.code})</span></td>
                                                        <td style={{ padding: '8px', textAlign: 'center', fontFamily: OUTFIT }}>{line.quantity}</td>
                                                        <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: C.textSecondary }}>{line.unit || '—'}</td>
                                                        <td style={{ padding: '8px', textAlign: 'center', fontFamily: OUTFIT }}>{line.unitPrice.toLocaleString()}</td>
                                                        <td style={{ padding: '8px', textAlign: 'center', fontFamily: OUTFIT, fontWeight: 700 }}>{line.total.toLocaleString()}</td>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                            <button type="button" onClick={() => removeMaterialLine(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.danger }}><X size={15} /></button>
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
                                <p style={STitle}>حفظ أمر العمل</p>
                                {error && <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: '10px', color: '#ef4444', fontSize: '13px', marginBottom: '14px', fontFamily: CAIRO }}>{error}</div>}
                                <button type="submit" disabled={saving} style={BTN_PRIMARY(false, saving)}>
                                    <Save size={16} />
                                    {saving ? 'جاري الحفظ...' : 'حفظ أمر العمل'}
                                </button>
                                <button type="button" onClick={() => router.back()} style={{ width: '100%', height: '42px', marginTop: '10px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: CAIRO }}>إلغاء</button>
                            </div>

                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
