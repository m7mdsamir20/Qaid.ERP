'use client';
import { useTranslation } from '@/lib/i18n';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { ArrowRightLeft, Plus, Trash2, Lock, Loader2, Building2, Package, ArrowRight, Save, AlertCircle } from 'lucide-react';
import { C, CAIRO, OUTFIT, PAGE_BASE, BTN_PRIMARY, TABLE_STYLE, focusIn, focusOut, LS, IS, SC } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';

interface Warehouse { id: string; name: string; }
interface Item { id: string; name: string; }
interface StockRecord { itemId: string; warehouseId: string; quantity: number; }

export default function NewTransferPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [stocks, setStocks] = useState<StockRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState({
        code: '',
        date: new Date().toISOString().split('T')[0],
        fromWarehouseId: '',
        toWarehouseId: '',
        notes: ''
    });

    const [lines, setLines] = useState<{ itemId: string, quantity: number }[]>([]);

    const fetchData = useCallback(async () => {
        try {
            const [trRes, whRes, itemsRes, stockRes] = await Promise.all([
                fetch('/api/warehouse-transfers'), 
                fetch('/api/warehouses'), 
                fetch('/api/items?all=true'),
                fetch('/api/stocks')
            ]);

            const transfers = await trRes.json();
            let maxNum = 0;
            transfers.forEach((t: any) => { if (t.transferNumber > maxNum) maxNum = t.transferNumber; });

            setForm(f => ({ ...f, code: `TRF-${String(maxNum + 1).padStart(4, '0')}` }));
            const whs = await whRes.json();
            setWarehouses(whs);
            const itsData = await itemsRes.json();
            setItems(Array.isArray(itsData) ? itsData : (itsData.items || []));
            setStocks(await stockRes.json());

            const lastWh = localStorage.getItem('last_warehouse_id');
            if (lastWh && whs.some((w: any) => w.id === lastWh)) {
                setForm(f => ({ ...f, fromWarehouseId: lastWh }));
            }
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getAvailableStock = useCallback((itemId: string, whId: string) => {
        if (!itemId || !whId) return 0;
        const record = stocks.find(s => s.itemId === itemId && s.warehouseId === whId);
        return record ? record.quantity : 0;
    }, [stocks]);

    const addLine = () => setLines([...lines, { itemId: '', quantity: 1 }]);
    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], [field]: value };
        setLines(newLines);
    };
    const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // 1. Basic validation
        if (!form.fromWarehouseId || !form.toWarehouseId || lines.length === 0) {
            alert(t('يرجى اختيار المخازن وإضافة صنف واحد على الأقل'));
            return;
        }

        if (form.fromWarehouseId === form.toWarehouseId) {
            alert(t('لا يمكن التحويل لنفس المخزن'));
            return;
        }

        // 2. Stock validation
        for (const line of lines) {
            if (!line.itemId) {
                alert(t('يرجى اختيار الصنف لجميع السطور'));
                return;
            }
            const available = getAvailableStock(line.itemId, form.fromWarehouseId);
            if (line.quantity > available) {
                const item = items.find(i => i.id === line.itemId);
                alert(t('الكمية المطلوبة للصنف') + ` (${item?.name}) ` + t('غير متوفرة. المتاح حالياً:') + ` ${available}`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/warehouse-transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, lines }),
            });
            
            if (res.ok) {
                router.push('/warehouse-transfers');
            } else {
                const data = await res.json();
                alert(data.error || t('فشل حفظ التحويل'));
                setIsSubmitting(false);
            }
        } catch {
            alert(t('حدث خطأ أثناء الاتصال بالخادم'));
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={PAGE_BASE}>
                    <div style={{ textAlign: 'center', padding: '100px 0', color: C.textMuted }}>
                        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                        <p style={{ fontFamily: CAIRO, fontWeight: 600 }}>{t('جاري تهيئة نموذج التحويل...')}</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div style={PAGE_BASE}>
                <PageHeader 
                    title={t("تحويل مخزني جديد")} 
                    subtitle={t("نقل البضائع والأصناف من مخزن لآخر مع توثيق العملية وتحديث الأرصدة")} 
                    icon={ArrowRightLeft} 
                    backUrl="/warehouse-transfers"
                />

                <div style={{ ...SC, background: C.card, borderRadius: '20px', padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                    <form onSubmit={handleSubmit} dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Session Header Fields */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 1fr 1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ ...LS, fontSize: '11px' }}>{t('رقم التحويل')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text" readOnly disabled value={form.code} dir="ltr"
                                        style={{ ...IS, paddingInlineStart: '36px', color: C.textMuted, opacity: 0.6, fontSize: '11px', fontFamily: OUTFIT, fontWeight: 900 }}
                                    />
                                    <Lock size={14} style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ ...LS, fontSize: '11px' }}>{t('تاريخ التحويل')} <span style={{ color: C.danger }}>*</span></label>
                                <input
                                    type="date" required
                                    value={form.date}
                                    onChange={e => setForm({ ...form, date: e.target.value })}
                                    style={{ ...IS, fontSize: '12px', height: '38px' }}
                                    onFocus={focusIn} onBlur={focusOut}
                                />
                            </div>
                            <div>
                                <label style={{ ...LS, fontSize: '11px' }}>{t('من مخزن (الصرف)')} <span style={{ color: C.danger }}>*</span></label>
                                <CustomSelect
                                    value={form.fromWarehouseId}
                                    onChange={v => { setForm({ ...form, fromWarehouseId: v }); localStorage.setItem('last_warehouse_id', v); }}
                                    icon={Building2}
                                    placeholder={t("اختر المخزن المصدر")}
                                    options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                                />
                            </div>
                            <div>
                                <label style={{ ...LS, fontSize: '11px' }}>{t('إلى مخزن (الاستلام)')} <span style={{ color: C.danger }}>*</span></label>
                                <CustomSelect
                                    value={form.toWarehouseId}
                                    onChange={v => { setForm({ ...form, toWarehouseId: v }); localStorage.setItem('last_warehouse_id', v); }}
                                    icon={Building2}
                                    placeholder={t("اختر المخزن المستقبل")}
                                    options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                                />
                            </div>
                        </div>

                        {/* Items Section */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Package size={18} style={{ color: C.primary }} />
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t('الأصناف المحولة')}</h4>
                                </div>
                                <button
                                    type="button" onClick={addLine}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(37,106,244,0.1)', border: '1px solid rgba(37,106,244,0.2)', color: C.primary, padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,106,244,0.15)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(37,106,244,0.1)'}
                                >
                                    <Plus size={14} /> {t('إضافة صنف جديد')}
                                </button>
                            </div>

                            <div style={{ ...TABLE_STYLE.container, overflow: 'visible' }}>
                                <table style={TABLE_STYLE.table}>
                                    <thead>
                                        <tr style={TABLE_STYLE.thead}>
                                            <th style={{ ...TABLE_STYLE.th(true), fontSize: '11px' }}>{t('الصنف')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false, true), fontSize: '11px', width: '120px' }}>{t('الرصيد المتاح')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false), fontSize: '11px', width: '150px' }}>{t('الكمية المحولة')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false), fontSize: '11px', width: '60px' }}>{t('إجراء')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} style={{ padding: '40px',  color: C.textMuted }}>
                                                    <p style={{ fontSize: '12px', fontWeight: 600 }}>{t('لم يتم إضافة أصناف بعد. اضغط على أضف صنف للبدء.')}</p>
                                                </td>
                                            </tr>
                                        ) : lines.map((line, index) => {
                                            const available = getAvailableStock(line.itemId, form.fromWarehouseId);
                                            const isOverstock = line.quantity > available;

                                            return (
                                                <tr key={index} style={TABLE_STYLE.row(index === lines.length - 1)}>
                                                    <td style={{ ...TABLE_STYLE.td(true), width: '40%' }}>
                                                        <CustomSelect
                                                            value={line.itemId}
                                                            onChange={v => updateLine(index, 'itemId', v)}
                                                            placeholder={t("اختر الصنف من القائمة...")}
                                                            options={items.map(i => ({ value: i.id, label: i.name }))}
                                                        />
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(false), }}>
                                                        <div style={{ 
                                                            fontSize: '12px', fontWeight: 800, fontFamily: OUTFIT, 
                                                            color: available > 0 ? C.success : C.danger,
                                                            background: available > 0 ? 'rgba(74,222,128,0.05)' : 'rgba(251,113,133,0.05)',
                                                            padding: '4px 8px', borderRadius: '6px', display: 'inline-block'
                                                        }}>
                                                            {available.toLocaleString()}
                                                        </div>
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(false), padding: '8px 16px' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <input
                                                                required type="number" step="0.01" min="0.01"
                                                                value={line.quantity || ''} 
                                                                onChange={e => updateLine(index, 'quantity', parseFloat(e.target.value))}
                                                                style={{ 
                                                                    ...IS, height: '34px', textAlign: 'center', fontSize: '12px',
                                                                    borderColor: isOverstock ? C.danger : C.border,
                                                                    background: isOverstock ? 'rgba(251,113,133,0.03)' : 'rgba(255,255,255,0.01)'
                                                                }}
                                                                onFocus={focusIn} onBlur={focusOut}
                                                                placeholder="0.00"
                                                            />
                                                            {isOverstock && (
                                                                <AlertCircle size={14} style={{ position: 'absolute', insetInlineStart: '-22px', top: '50%', transform: 'translateY(-50%)', color: C.danger }} />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(false), }}>
                                                        <button
                                                            type="button" onClick={() => removeLine(index)}
                                                            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(251,113,133,0.05)', border: '1px solid rgba(251,113,133,0.1)', color: C.danger, borderRadius: '8px', cursor: 'pointer', transition: '0.2s' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,113,133,0.1)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,113,133,0.05)'}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div>
                            <label style={{ ...LS, fontSize: '11px' }}>{t('ملاحظات التحويل')}</label>
                            <input
                                type="text"
                                placeholder={t("أدخل أي ملاحظات إضافية بخصوص هذه العملية...")}
                                value={form.notes}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                                style={{ ...IS, fontSize: '12px', height: '38px' }}
                                onFocus={focusIn} onBlur={focusOut}
                            />
                        </div>

                        {/* Submit Button */}
                        <div style={{ display: 'flex', borderTop: `1px solid ${C.border}`, paddingTop: '20px' }}>
                            <button type="submit" disabled={isSubmitting || lines.length === 0} 
                                style={{ 
                                    ...BTN_PRIMARY(isSubmitting || lines.length === 0, isSubmitting), 
                                    height: '48px', 
                                    fontSize: '14px',
                                    background: (isSubmitting || lines.length === 0) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #256af4, #1a56d6)',
                                    boxShadow: (isSubmitting || lines.length === 0) ? 'none' : '0 8px 24px rgba(37,106,244,0.2)'
                                }}>
                                {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                        <Save size={18} />
                                        {t('تأكيد عملية التحويل وتحديث الأرصدة')}
                                    </div>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <style jsx global>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}
