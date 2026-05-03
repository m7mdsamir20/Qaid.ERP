'use client';
import React, { useState, useEffect } from 'react';
import { C, CAIRO, OUTFIT, IS } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { Printer, Monitor, UtensilsCrossed, ChefHat, Truck, Plus, Trash2 } from 'lucide-react';
import { TabHeader, Toggle } from './shared';
import CustomSelect from '@/components/CustomSelect';

export interface DeliveryApp {
    id: string;
    name: string;
    markupRate: number;
}

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
    paymentTerminalIp: string;
    paymentTerminalPort: string;
    deliveryApps: DeliveryApp[];
    defaultCashTreasuryId: string;
    defaultCardTreasuryId: string;
}

const DEFAULTS: RestaurantSettings = {
    enableKds: true,
    enableCustomerDisplay: false,
    kitchenPrinterName: '',
    receiptPrinterName: '',
    autoSendToKitchen: true,
    requireTableForDineIn: true,
    allowSplitBill: true,
    defaultOrderType: 'dine-in',
    receiptFooter: 'Thank you for your visit!',
    kitchenCopyCount: 1,
    dineInPaymentPolicy: 'pre-pay',
    paymentTerminalIp: '',
    paymentTerminalPort: '5000',
    deliveryApps: [],
    defaultCashTreasuryId: '',
    defaultCardTreasuryId: ''
};

const STORAGE_KEY = 'restaurant_settings';

export default function RestaurantTab({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
    const { t } = useTranslation();
    const [isEditMode, setIsEditMode] = useState(false);
    const [form, setForm] = useState<RestaurantSettings>(DEFAULTS);
    const [saved, setSaved] = useState<RestaurantSettings>(DEFAULTS);
    const [saving, setSaving] = useState(false);
    const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
    const [treasuries, setTreasuries] = useState<any[]>([]);

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
        fetch('/api/treasuries').then(res => res.json()).then(data => setTreasuries(Array.isArray(data) ? data : [])).catch(() => {});

        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            (window as any).electronAPI.getPrinters().then((p: any[]) => {
                setAvailablePrinters(p.map((pr: any) => pr.name ?? pr));
            }).catch(() => { });
        } else if ('navigator' in window && (navigator as any).printing) {
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

                {/* ══ إعدادات الطباعة وشاشات العرض وماكينة الدفع ══ */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Monitor size={14} /> {t('الطباعة وشاشات العرض وماكينة الدفع')}
                    </div>

                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        {[
                            { label: t('IP ماكينة الدفع (ECR)'), key: 'paymentTerminalIp', desc: t('اتركها فارغة لإلغاء الربط الآلي'), placeholder: '192.168.1.50' },
                            { label: t('منفذ الماكينة (Port)'), key: 'paymentTerminalPort', placeholder: '5000' },
                            { label: t('طابعة المطبخ'), key: 'kitchenPrinterName', isPrinter: true },
                            { label: t('طابعة الفاتورة'), key: 'receiptPrinterName', isPrinter: true },
                        ].map((f, i, arr) => (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                <div style={{ width: '220px', flexShrink: 0, padding: '16px 20px', color: C.textSecondary, borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{f.label}</span>
                                </div>
                                <div style={{ flex: 1, padding: '0 20px' }}>
                                    {isEditMode ? (
                                        (f as any).isPrinter && availablePrinters.length > 0 ? (
                                            <div style={{ padding: '8px 0' }}>
                                                <CustomSelect
                                                    value={(form as any)[f.key] || ''}
                                                    onChange={val => set(f.key as any, val)}
                                                    options={[
                                                        { value: '', label: t('— الطابعة الافتراضية —') },
                                                        ...availablePrinters.map(p => ({ value: p, label: p }))
                                                    ]}
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ position: 'relative', width: '100%' }}>
                                                <input style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: C.textPrimary, padding: '14px 0', boxSizing: 'border-box', fontWeight: 700, fontFamily: CAIRO }} placeholder={(f as any).placeholder || t('اسم الطابعة')} value={(form as any)[f.key] || ''} onChange={e => set(f.key as any, e.target.value)} />
                                                {(f as any).desc && <div style={{ fontSize: '10px', color: C.textMuted, position: 'absolute', top: '14px', left: 0, pointerEvents: 'none' }}>{(f as any).desc}</div>}
                                            </div>
                                        )
                                    ) : (
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: (form as any)[f.key] ? C.textPrimary : C.textMuted, padding: '14px 0', fontStyle: (form as any)[f.key] ? 'normal' : 'italic', fontFamily: CAIRO }}>{(form as any)[f.key] || t('الافتراضية')}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ══ تذييل الفاتورة ══ */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Printer size={14} /> {t('تذييل الفاتورة')}
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', borderBottom: 'none' }}>
                            <div style={{ width: '220px', flexShrink: 0, padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('نص تذييل الفاتورة')}</span>
                                <p style={{ margin: '4px 0 0', fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{t('يظهر أسفل كل أنواع الفواتير')}</p>
                            </div>
                            <div style={{ flex: 1, padding: '12px 20px' }}>
                                {isEditMode ? (
                                    <textarea
                                        value={form.receiptFooter}
                                        onChange={e => set('receiptFooter', e.target.value)}
                                        rows={3}
                                        placeholder={t('مثال: شكراً لزيارتكم - يسعدنا خدمتكم دائماً')}
                                        style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO, resize: 'vertical', outline: 'none', lineHeight: '1.6', boxSizing: 'border-box' }}
                                    />
                                ) : (
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: form.receiptFooter ? C.textPrimary : C.textMuted, padding: '14px 0', fontFamily: CAIRO, whiteSpace: 'pre-wrap', fontStyle: form.receiptFooter ? 'normal' : 'italic' }}>
                                        {form.receiptFooter || t('لم يتم تحديد تذييل')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
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
                                {/* ══ الخزائن الافتراضية ══ */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Monitor size={14} /> {t('الخزائن الافتراضية للكاشير (الدفع)')}
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                            <div style={{ width: '220px', flexShrink: 0, padding: '16px 20px', color: C.textSecondary, borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('خزنة النقد الافتراضية')}</span>
                            </div>
                            <div style={{ flex: 1, padding: '0 20px' }}>
                                {isEditMode ? (
                                    <div style={{ padding: '8px 0' }}>
                                        <CustomSelect
                                            value={form.defaultCashTreasuryId || ''}
                                            onChange={val => set('defaultCashTreasuryId', val)}
                                            options={[
                                                { value: '', label: t('— اختر الخزنة النقدية —') },
                                                ...treasuries.filter(t => t.type === 'cash').map(t => ({ value: t.id, label: t.name }))
                                            ]}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: form.defaultCashTreasuryId ? C.textPrimary : C.textMuted, padding: '14px 0', fontStyle: form.defaultCashTreasuryId ? 'normal' : 'italic', fontFamily: CAIRO }}>
                                        {treasuries.find(t => t.id === form.defaultCashTreasuryId)?.name || t('لم يتم التحديد')}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: 'none' }}>
                            <div style={{ width: '220px', flexShrink: 0, padding: '16px 20px', color: C.textSecondary, borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('حساب الشبكة الافتراضي')}</span>
                            </div>
                            <div style={{ flex: 1, padding: '0 20px' }}>
                                {isEditMode ? (
                                    <div style={{ padding: '8px 0' }}>
                                        <CustomSelect
                                            value={form.defaultCardTreasuryId || ''}
                                            onChange={val => set('defaultCardTreasuryId', val)}
                                            options={[
                                                { value: '', label: t('— اختر حساب البنك —') },
                                                ...treasuries.filter(t => t.type === 'bank').map(t => ({ value: t.id, label: t.name }))
                                            ]}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: form.defaultCardTreasuryId ? C.textPrimary : C.textMuted, padding: '14px 0', fontStyle: form.defaultCardTreasuryId ? 'normal' : 'italic', fontFamily: CAIRO }}>
                                        {treasuries.find(t => t.id === form.defaultCardTreasuryId)?.name || t('لم يتم التحديد')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══ تطبيقات التوصيل ══ */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Truck size={14} /> {t('تطبيقات التوصيل (Aggregators)')}
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '16px', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        <p style={{ fontSize: '13px', color: C.textSecondary, marginBottom: '16px', fontFamily: CAIRO }}>
                            {t('أضف تطبيقات التوصيل (مثل طلبات، جاهز) وحدد نسبة زيادة السعر ليتم تطبيقها تلقائياً عند اختيار التطبيق في شاشة الكاشير.')}
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {(form.deliveryApps || []).map((app, index) => (
                                <div key={app.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={app.name}
                                        onChange={e => {
                                            const newApps = [...(form.deliveryApps || [])];
                                            newApps[index].name = e.target.value;
                                            set('deliveryApps', newApps);
                                        }}
                                        disabled={!isEditMode}
                                        placeholder={t('اسم التطبيق (مثال: طلبات)')}
                                        style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.bg, fontSize: '13px', fontFamily: CAIRO, outline: 'none' }}
                                    />
                                    <div style={{ position: 'relative', width: '120px' }}>
                                        <input
                                            type="number"
                                            value={app.markupRate}
                                            onChange={e => {
                                                const newApps = [...(form.deliveryApps || [])];
                                                newApps[index].markupRate = Number(e.target.value);
                                                set('deliveryApps', newApps);
                                            }}
                                            disabled={!isEditMode}
                                            placeholder="0"
                                            style={{ width: '100%', padding: '12px 16px', paddingInlineEnd: '30px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.bg, fontSize: '13px', fontFamily: OUTFIT, outline: 'none' }}
                                        />
                                        <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', insetInlineEnd: '12px', fontSize: '13px', color: C.textMuted }}>%</span>
                                    </div>
                                    {isEditMode && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newApps = (form.deliveryApps || []).filter((_, i) => i !== index);
                                                set('deliveryApps', newApps);
                                            }}
                                            style={{ width: 42, height: 42, borderRadius: '12px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            
                            {isEditMode && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newApps = [...(form.deliveryApps || []), { id: Date.now().toString(), name: '', markupRate: 0 }];
                                        set('deliveryApps', newApps);
                                    }}
                                    style={{ padding: '12px', borderRadius: '12px', border: `1px dashed ${C.primary}`, background: `${C.primary}05`, color: C.primary, fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontFamily: CAIRO, transition: 'all 0.2s' }}
                                >
                                    <Plus size={16} /> {t('إضافة تطبيق توصيل')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
