'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import CustomSelect from '@/components/CustomSelect';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { C, CAIRO, OUTFIT, IS, LS, SC, BTN_PRIMARY, focusIn, focusOut, PAGE_BASE } from '@/constants/theme';
import { Hash, Save, Loader2, Plus, Minus, CheckCircle2, AlertCircle, ListPlus } from 'lucide-react';

interface Item {
    id: string;
    name: string;
    code: string;
}

interface Warehouse {
    id: string;
    name: string;
}

export default function NewSerialNumberPage() {
    const { lang } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();

    const [items, setItems] = useState<Item[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const [inputMode, setInputMode] = useState<'single' | 'bulk'>('single');

    const [form, setForm] = useState({
        itemId: '',
        warehouseId: '',
        serial: '',
        warrantyEnd: '',
        notes: '',
    });
    const [bulkSerials, setBulkSerials] = useState('');

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [itemsRes, whRes] = await Promise.all([
                fetch('/api/items?all=true'),
                fetch('/api/warehouses'),
            ]);
            if (itemsRes.ok) {
                const d = await itemsRes.json();
                setItems(Array.isArray(d) ? d : (d.items || []));
            }
            if (whRes.ok) {
                const d = await whRes.json();
                setWarehouses(Array.isArray(d) ? d : []);
            }
        } catch {
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getSerialsList = (): string[] => {
        if (inputMode === 'single') {
            return form.serial.trim() ? [form.serial.trim()] : [];
        }
        return bulkSerials
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const serials = getSerialsList();

        if (!form.itemId) {
            showToast('يجب اختيار الصنف', 'error');
            return;
        }
        if (serials.length === 0) {
            showToast('يجب إدخال رقم تسلسلي واحد على الأقل', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                itemId: form.itemId,
                warehouseId: form.warehouseId || null,
                serials,
                warrantyEnd: form.warrantyEnd || null,
                notes: form.notes || null,
            };

            const res = await fetch('/api/serial-numbers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const d = await res.json();
                showToast(`تم إضافة ${d.count} رقم تسلسلي بنجاح`);
                setTimeout(() => router.push('/serial-numbers'), 1200);
            } else {
                const d = await res.json();
                showToast(d.error || 'فشل في الإضافة', 'error');
            }
        } catch {
            showToast('خطأ في الاتصال بالسيرفر', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const itemOptions = items.map(i => ({ value: i.id, label: `${i.name} (${i.code})` }));
    const warehouseOptions = [
        { value: '', label: 'بدون مخزن (اختياري)' },
        ...warehouses.map(w => ({ value: w.id, label: w.name })),
    ];

    const serialCount = getSerialsList().length;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, fontFamily: CAIRO }}>
                <PageHeader
                    title="إضافة أرقام تسلسلية"
                    subtitle="تسجيل رقم تسلسلي جديد أو مجموعة أرقام دفعة واحدة"
                    icon={Hash}
                    backUrl="/serial-numbers"
                />

                {toast && (
                    <div style={{
                        position: 'fixed', bottom: '24px', insetInlineStart: '24px',
                        background: toast.type === 'success' ? '#10b981' : '#ef4444',
                        color: '#fff', padding: '12px 24px', borderRadius: '10px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.2)', display: 'flex',
                        alignItems: 'center', gap: '10px', zIndex: 9999, fontSize: '13px', fontWeight: 600,
                        fontFamily: CAIRO,
                    }}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        {toast.msg}
                    </div>
                )}

                {loadingData ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: '12px', color: C.textMuted }}>
                        <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                        جاري تحميل البيانات...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={SC}>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: C.primary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Hash size={15} /> بيانات الصنف والمخزن
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <label style={LS}>الصنف <span style={{ color: C.danger }}>*</span></label>
                                            <CustomSelect
                                                value={form.itemId}
                                                onChange={val => setForm(f => ({ ...f, itemId: val }))}
                                                options={itemOptions}
                                                placeholder="اختر الصنف..."
                                                style={{ height: '42px', fontSize: '13px', width: '100%', minWidth: '100%' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={LS}>المخزن</label>
                                            <CustomSelect
                                                value={form.warehouseId}
                                                onChange={val => setForm(f => ({ ...f, warehouseId: val }))}
                                                options={warehouseOptions}
                                                hideSearch
                                                style={{ height: '42px', fontSize: '13px', width: '100%', minWidth: '100%' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={SC}>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: C.primary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ListPlus size={15} /> الأرقام التسلسلية
                                    </div>

                                    <div style={{
                                        display: 'flex', gap: '4px', marginBottom: '16px',
                                        background: 'rgba(255,255,255,0.03)', padding: '4px',
                                        borderRadius: '10px', border: `1px solid ${C.border}`,
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => setInputMode('single')}
                                            style={{
                                                flex: 1, height: '34px', borderRadius: '8px', border: 'none',
                                                background: inputMode === 'single' ? C.primary : 'transparent',
                                                color: inputMode === 'single' ? '#fff' : C.textSecondary,
                                                fontWeight: 700, fontSize: '12px', fontFamily: CAIRO, cursor: 'pointer',
                                                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            }}
                                        >
                                            <Plus size={14} /> رقم واحد
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setInputMode('bulk')}
                                            style={{
                                                flex: 1, height: '34px', borderRadius: '8px', border: 'none',
                                                background: inputMode === 'bulk' ? C.primary : 'transparent',
                                                color: inputMode === 'bulk' ? '#fff' : C.textSecondary,
                                                fontWeight: 700, fontSize: '12px', fontFamily: CAIRO, cursor: 'pointer',
                                                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            }}
                                        >
                                            <ListPlus size={14} /> إضافة متعددة
                                        </button>
                                    </div>

                                    {inputMode === 'single' ? (
                                        <div>
                                            <label style={LS}>الرقم التسلسلي <span style={{ color: C.danger }}>*</span></label>
                                            <input
                                                type="text"
                                                value={form.serial}
                                                onChange={e => setForm(f => ({ ...f, serial: e.target.value }))}
                                                style={{ ...IS, fontFamily: OUTFIT, letterSpacing: '0.5px' }}
                                                onFocus={focusIn}
                                                onBlur={focusOut}
                                                placeholder="مثال: SN123456789"
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <label style={LS}>
                                                الأرقام التسلسلية <span style={{ color: C.danger }}>*</span>
                                                <span style={{ color: C.textMuted, fontWeight: 500, marginInlineStart: '6px' }}>
                                                    (رقم واحد في كل سطر)
                                                </span>
                                            </label>
                                            <textarea
                                                value={bulkSerials}
                                                onChange={e => setBulkSerials(e.target.value)}
                                                onFocus={focusIn}
                                                onBlur={focusOut}
                                                placeholder={'SN123456789\nSN987654321\nSN111222333'}
                                                style={{
                                                    width: '100%', minHeight: '160px', padding: '12px 16px',
                                                    borderRadius: '10px', border: `1px solid ${C.border}`,
                                                    background: C.card, color: C.textPrimary,
                                                    fontSize: '13px', fontFamily: OUTFIT, fontWeight: 500,
                                                    outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                                                    letterSpacing: '0.5px', lineHeight: 1.8,
                                                    transition: 'all var(--transition-fast)',
                                                }}
                                            />
                                            {serialCount > 0 && (
                                                <div style={{ fontSize: '12px', color: C.primary, marginTop: '6px', fontWeight: 600 }}>
                                                    {serialCount} رقم تسلسلي سيتم إضافته
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={SC}>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: C.primary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Hash size={15} /> بيانات إضافية
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={LS}>تاريخ انتهاء الضمان (اختياري)</label>
                                        <input
                                            type="date"
                                            value={form.warrantyEnd}
                                            onChange={e => setForm(f => ({ ...f, warrantyEnd: e.target.value }))}
                                            style={{ ...IS, fontFamily: OUTFIT, fontSize: '13px' }}
                                            onFocus={focusIn}
                                            onBlur={focusOut}
                                        />
                                    </div>

                                    <div>
                                        <label style={LS}>ملاحظات (اختياري)</label>
                                        <textarea
                                            value={form.notes}
                                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                            onFocus={focusIn}
                                            onBlur={focusOut}
                                            placeholder="ملاحظات إضافية..."
                                            style={{
                                                width: '100%', minHeight: '100px', padding: '12px 16px',
                                                borderRadius: '10px', border: `1px solid ${C.border}`,
                                                background: C.card, color: C.textPrimary,
                                                fontSize: '13px', fontFamily: CAIRO, fontWeight: 500,
                                                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                                                transition: 'all var(--transition-fast)',
                                            }}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting || !form.itemId || (inputMode === 'single' ? !form.serial.trim() : serialCount === 0)}
                                    style={BTN_PRIMARY(submitting || !form.itemId || (inputMode === 'single' ? !form.serial.trim() : serialCount === 0), submitting)}
                                >
                                    {submitting
                                        ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</>
                                        : <><Save size={18} /> حفظ {serialCount > 1 ? `(${serialCount} أرقام)` : 'الرقم التسلسلي'}</>
                                    }
                                </button>

                                <button
                                    type="button"
                                    onClick={() => router.push('/serial-numbers')}
                                    style={{
                                        width: '100%', height: '48px', borderRadius: '14px',
                                        border: `1px solid ${C.border}`, background: 'transparent',
                                        color: C.textSecondary, fontWeight: 700, fontSize: '14px',
                                        fontFamily: CAIRO, cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
