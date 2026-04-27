'use client';

import React, { useState, useEffect } from 'react';
import { C, CAIRO, OUTFIT, IS } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { Printer, Monitor, UtensilsCrossed, ChefHat } from 'lucide-react';
import { TabHeader, Toggle } from './shared';

interface RestaurantSettings {
    enableKds: boolean;
    enableCustomerDisplay: boolean;
    kitchenPrinterName: string;
    receiptPrinterName: string;
    autoSendToKitchen: boolean;
    requireTableForDineIn: boolean;
    allowSplitBill: boolean;
    defaultOrderType: string;
    receiptFooter: string;
    kitchenCopyCount: number;
    dineInPaymentPolicy: 'pre-pay' | 'post-pay';
}

const DEFAULTS: RestaurantSettings = {
    enableKds: true,
    enableCustomerDisplay: false,
    kitchenPrinterName: '',
    receiptPrinterName: '',
    autoSendToKitchen: true,
    requireTableForDineIn: true,
    allowSplitBill: false,
    defaultOrderType: 'dine-in',
    receiptFooter: 'شكراً لزيارتكم - يسعدنا خدمتكم دائماً',
    kitchenCopyCount: 1,
    dineInPaymentPolicy: 'pre-pay',
};

const STORAGE_KEY = 'restaurant_settings';

export default function RestaurantTab({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
    const { t } = useTranslation();
    const [isEditMode, setIsEditMode] = useState(false);
    const [form, setForm] = useState<RestaurantSettings>(DEFAULTS);
    const [saved, setSaved] = useState<RestaurantSettings>(DEFAULTS);
    const [saving, setSaving] = useState(false);
    const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);

    useEffect(() => {
        // Load from DB first, fall back to localStorage for migration
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const data = await res.json();
                    if (data.restaurantSettings) {
                        const parsed = { ...DEFAULTS, ...data.restaurantSettings };
                        setForm(parsed);
                        setSaved(parsed);
                        return;
                    }
                }
            } catch { /* fallback to localStorage */ }
            
            // Fallback: migrate from localStorage if exists
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = { ...DEFAULTS, ...JSON.parse(stored) };
                    setForm(parsed);
                    setSaved(parsed);
                }
            } catch { /* ignore */ }
        };
        loadSettings();

        if ('navigator' in window && (navigator as any).printing) {
            (navigator as any).printing?.getPrinters?.().then((p: any[]) => {
                setAvailablePrinters(p.map((pr: any) => pr.name ?? pr));
            }).catch(() => { });
        }
    }, []);

    const set = (key: keyof RestaurantSettings, value: any) =>
        setForm(f => ({ ...f, [key]: value }));

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            // Save to database
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_restaurant', data: form })
            });
            if (res.ok) {
                // Also keep localStorage as cache for quick load
                localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
                setSaved({ ...form });
                setIsEditMode(false);
                showToast(t('تم حفظ إعدادات المطعم ✓'));
            } else {
                showToast(t('فشل حفظ الإعدادات'), 'error');
            }
        } catch {
            showToast(t('فشل حفظ الإعدادات'), 'error');
        }
        setSaving(false);
    };

    const handleCancel = () => {
        setForm({ ...saved });
        setIsEditMode(false);
    };

    const orderTypeMap: Record<string, string> = {
        'dine-in': '🪑 صالة',
        'takeaway': '📦 تيك أواي',
        'delivery': '🚚 توصيل',
        'online': '🌐 أونلاين'
    };

    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '600px' }}>
            <TabHeader
                title={t("إعدادات المطعم")}
                sub={t("إدارة الشاشات الجانبية وأجهزة الطباعة والمطبخ")}
                isEdit={isEditMode}
                onEdit={() => setIsEditMode(true)}
                onCancel={handleCancel}
                form="restaurantForm"
                isSaving={saving}
                t={t}
            />

            <form id="restaurantForm" onSubmit={handleSave}>
                {/* ══ شاشة المطبخ (KDS) ══ */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <ChefHat size={14} /> {t('شاشة المطبخ (KDS)')}
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        {[
                            { label: t('تفعيل شاشة المطبخ'), key: 'enableKds', type: 'toggle' },
                            { label: t('إرسال تلقائي للمطبخ'), key: 'autoSendToKitchen', type: 'toggle', disabled: !form.enableKds },
                            { label: t('عدد نسخ ورقة المطبخ'), key: 'kitchenCopyCount', type: 'number' },
                        ].map((f, i, arr) => (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                <div style={{ width: '220px', flexShrink: 0, padding: '16px 20px', color: C.textSecondary, borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{f.label}</span>
                                </div>
                                <div style={{ flex: 1, padding: '0 20px' }}>
                                    {f.type === 'toggle' ? (
                                        <div style={{ padding: '14px 0', display: 'flex', justifyContent: 'flex-end' }}>
                                            <Toggle checked={(form as any)[f.key]} onChange={v => set(f.key as any, v)} disabled={!isEditMode || f.disabled} />
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 0' }}>
                                            {isEditMode ? (
                                                <>
                                                    <button type="button" onClick={() => set('kitchenCopyCount', Math.max(1, form.kitchenCopyCount - 1))} style={{ width: 30, height: 30, borderRadius: '8px', border: `1px solid ${C.border}`, background: C.bg, color: C.textSecondary, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                                    <span style={{ minWidth: 24, textAlign: 'center', fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{form.kitchenCopyCount}</span>
                                                    <button type="button" onClick={() => set('kitchenCopyCount', Math.min(5, form.kitchenCopyCount + 1))} style={{ width: 30, height: 30, borderRadius: '8px', border: `1px solid ${C.border}`, background: C.bg, color: C.textSecondary, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: OUTFIT, color: C.textPrimary }}>{form.kitchenCopyCount}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ══ إعدادات الطباعة ══ */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Printer size={14} /> {t('إعدادات الطباعة')}
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        {[
                            { label: t('طابعة المطبخ'), key: 'kitchenPrinterName' },
                            { label: t('طابعة الفاتورة'), key: 'receiptPrinterName' },
                            { label: t('نص ذيل الفاتورة'), key: 'receiptFooter' },
                        ].map((f, i, arr) => (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                <div style={{ width: '220px', flexShrink: 0, padding: '16px 20px', color: C.textSecondary, borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{f.label}</span>
                                </div>
                                <div style={{ flex: 1, padding: '0 20px' }}>
                                    {isEditMode ? (
                                        f.key === 'receiptFooter' ? (
                                            <input style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: C.textPrimary, padding: '14px 0', boxSizing: 'border-box', fontWeight: 700, fontFamily: CAIRO }} placeholder={t('نص الذيل')} value={(form as any)[f.key]} onChange={e => set(f.key as any, e.target.value)} />
                                        ) : availablePrinters.length > 0 ? (
                                            <select style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: C.textPrimary, padding: '14px 0', boxSizing: 'border-box', fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }} value={(form as any)[f.key]} onChange={e => set(f.key as any, e.target.value)}>
                                                <option value="">{t('— الطابعة الافتراضية —')}</option>
                                                {availablePrinters.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        ) : (
                                            <input style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: C.textPrimary, padding: '14px 0', boxSizing: 'border-box', fontWeight: 700, fontFamily: CAIRO }} placeholder={t('اسم الطابعة')} value={(form as any)[f.key]} onChange={e => set(f.key as any, e.target.value)} />
                                        )
                                    ) : (
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: (form as any)[f.key] ? C.textPrimary : C.textMuted, padding: '14px 0', fontStyle: (form as any)[f.key] ? 'normal' : 'italic', fontFamily: CAIRO }}>{(form as any)[f.key] || t('الافتراضية')}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ══ شاشة العميل (Customer Display) ══ */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Monitor size={14} /> {t('شاشة العميل')}
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '220px', flexShrink: 0, padding: '16px 20px', color: C.textSecondary, borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('تفعيل شاشة العميل')}</span>
                            </div>
                            <div style={{ flex: 1, padding: '0 20px' }}>
                                <div style={{ padding: '14px 0', display: 'flex', justifyContent: 'flex-end' }}>
                                    <Toggle checked={form.enableCustomerDisplay} onChange={v => set('enableCustomerDisplay', v)} disabled={!isEditMode} />
                                </div>
                            </div>
                        </div>
                    </div>
                    {form.enableCustomerDisplay && (
                        <div style={{ padding: '12px', background: '#10b98110', border: '1px solid #10b98130', borderRadius: '12px', marginTop: '12px', fontSize: '12.5px', color: '#10b981', fontFamily: CAIRO }}>
                            💡 {t('افتح الرابط')} <strong>/customer-display</strong> {t('على شاشة العميل وصمّمه كملء شاشة')}
                        </div>
                    )}
                </div>

                {/* ══ سلوك الكاشير ══ */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <UtensilsCrossed size={14} /> {t('سلوك الكاشير')}
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        {[
                            { label: t('إلزامية اختيار الطاولة'), key: 'requireTableForDineIn', type: 'toggle' },
                            { label: t('السماح بتقسيم الفاتورة'), key: 'allowSplitBill', type: 'toggle' },
                            { label: t('سياسة الدفع للصالة'), key: 'dineInPaymentPolicy', type: 'select-policy' },
                            { label: t('نوع الطلب الافتراضي'), key: 'defaultOrderType', type: 'select' },
                        ].map((f, i, arr) => (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                <div style={{ width: '220px', flexShrink: 0, padding: '16px 20px', color: C.textSecondary, borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{f.label}</span>
                                </div>
                                <div style={{ flex: 1, padding: '0 20px' }}>
                                    {f.type === 'toggle' ? (
                                        <div style={{ padding: '14px 0', display: 'flex', justifyContent: 'flex-end' }}>
                                            <Toggle checked={(form as any)[f.key]} onChange={v => set(f.key as any, v)} disabled={!isEditMode} />
                                        </div>
                                    ) : (
                                        isEditMode ? (
                                            f.type === 'select-policy' ? (
                                                <div style={{ display: 'flex', gap: '8px', padding: '14px 0', flexWrap: 'wrap' }}>
                                                    {[
                                                        { v: 'pre-pay', l: 'الدفع مقدماً (فاست فود)' },
                                                        { v: 'post-pay', l: 'الدفع بعد الأكل (مطعم كلاسيكي)' },
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.v}
                                                            type="button"
                                                            onClick={() => set(f.key as any, opt.v)}
                                                            style={{
                                                                padding: '8px 16px',
                                                                borderRadius: '10px',
                                                                border: `1px solid ${(form as any)[f.key] === opt.v ? C.primary : C.border}`,
                                                                background: (form as any)[f.key] === opt.v ? `${C.primary}15` : 'transparent',
                                                                color: (form as any)[f.key] === opt.v ? C.primary : C.textSecondary,
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                fontFamily: CAIRO,
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            {opt.l}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '8px', padding: '14px 0', flexWrap: 'wrap' }}>
                                                    {[
                                                        { v: 'dine-in', l: '🪑 صالة' },
                                                        { v: 'takeaway', l: '📦 تيك أواي' },
                                                        { v: 'delivery', l: '🚚 توصيل' },
                                                        { v: 'online', l: '🌐 أونلاين' },
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.v}
                                                            type="button"
                                                            onClick={() => set(f.key as any, opt.v)}
                                                            style={{
                                                                padding: '8px 16px',
                                                                borderRadius: '10px',
                                                                border: `1px solid ${(form as any)[f.key] === opt.v ? C.primary : C.border}`,
                                                                background: (form as any)[f.key] === opt.v ? `${C.primary}15` : 'transparent',
                                                                color: (form as any)[f.key] === opt.v ? C.primary : C.textSecondary,
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                fontFamily: CAIRO,
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            {opt.l}
                                                        </button>
                                                    ))}
                                                </div>
                                            )
                                        ) : (
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, padding: '14px 0', fontFamily: CAIRO }}>
                                                {f.type === 'select-policy' 
                                                    ? ((form as any)[f.key] === 'pre-pay' ? 'الدفع مقدماً' : 'الدفع بعد الأكل')
                                                    : orderTypeMap[(form as any)[f.key]] || ''}
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </form>
        </div>
    );
}
