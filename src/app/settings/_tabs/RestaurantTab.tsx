'use client';

import React, { useState, useEffect } from 'react';
import { C, CAIRO, OUTFIT, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import {
    Printer, Monitor, ToggleLeft, ToggleRight, Save, Loader2, Check,
    AlertCircle, UtensilsCrossed, Wifi, ChefHat, Receipt
} from 'lucide-react';

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
};

const STORAGE_KEY = 'restaurant_settings';

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            onClick={() => !disabled && onChange(!value)}
            style={{ background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', padding: 0, opacity: disabled ? 0.5 : 1 }}
        >
            {value
                ? <ToggleRight size={36} color={C.primary} />
                : <ToggleLeft size={36} color={C.textMuted} />
            }
        </button>
    );
}

export default function RestaurantTab({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) {
    const { t } = useTranslation();
    const [form, setForm] = useState<RestaurantSettings>(DEFAULTS);
    const [saved, setSaved] = useState<RestaurantSettings>(DEFAULTS);
    const [saving, setSaving] = useState(false);
    const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = { ...DEFAULTS, ...JSON.parse(stored) };
                setForm(parsed);
                setSaved(parsed);
            }
        } catch { /* ignore */ }

        // Try to enumerate printers if browser supports it
        if ('navigator' in window && (navigator as any).printing) {
            (navigator as any).printing?.getPrinters?.().then((p: any[]) => {
                setAvailablePrinters(p.map((pr: any) => pr.name ?? pr));
            }).catch(() => { });
        }
    }, []);

    const set = (key: keyof RestaurantSettings, value: any) =>
        setForm(f => ({ ...f, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 300)); // simulate async
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
            setSaved({ ...form });
            showToast('تم حفظ إعدادات المطعم ✓');
        } catch {
            showToast('فشل حفظ الإعدادات', 'error');
        }
        setSaving(false);
    };

    const hasChanges = JSON.stringify(form) !== JSON.stringify(saved);

    const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ color: C.primary }}>{icon}</div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary }}>{title}</span>
            </div>
            <div style={{ padding: '20px' }}>{children}</div>
        </div>
    );

    const Row = ({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingBlock: '10px', borderBottom: `1px solid ${C.border}` }}>
            <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>{label}</p>
                {sublabel && <p style={{ margin: '2px 0 0', fontSize: '12px', color: C.textMuted }}>{sublabel}</p>}
            </div>
            <div style={{ flexShrink: 0 }}>{children}</div>
        </div>
    );

    return (
        <div dir="rtl" style={{ fontFamily: CAIRO, maxWidth: '700px' }}>

            {/* شاشة المطبخ KDS */}
            <Section title="شاشة المطبخ (KDS)" icon={<ChefHat size={18} />}>
                <Row label="تفعيل شاشة المطبخ" sublabel="تظهر الطلبات على شاشة المطبخ تلقائياً">
                    <Toggle value={form.enableKds} onChange={v => set('enableKds', v)} />
                </Row>
                <Row label="إرسال تلقائي للمطبخ" sublabel="عند حفظ الطلب يرسل للمطبخ فوراً بدون تدخل">
                    <Toggle value={form.autoSendToKitchen} onChange={v => set('autoSendToKitchen', v)} disabled={!form.enableKds} />
                </Row>
                <Row label="عدد نسخ ورقة المطبخ" sublabel="عدد النسخ المطبوعة لكل طلب في المطبخ">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => set('kitchenCopyCount', Math.max(1, form.kitchenCopyCount - 1))} style={{ width: 30, height: 30, borderRadius: '8px', border: `1px solid ${C.border}`, background: C.bg, color: C.textSecondary, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ minWidth: 24, textAlign: 'center', fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{form.kitchenCopyCount}</span>
                        <button onClick={() => set('kitchenCopyCount', Math.min(5, form.kitchenCopyCount + 1))} style={{ width: 30, height: 30, borderRadius: '8px', border: `1px solid ${C.border}`, background: C.bg, color: C.textSecondary, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                </Row>
            </Section>

            {/* الطباعة */}
            <Section title="إعدادات الطباعة" icon={<Printer size={18} />}>
                <Row label="طابعة المطبخ" sublabel="الطابعة المستخدمة لطباعة أوامر التحضير">
                    <div style={{ minWidth: '200px' }}>
                        {availablePrinters.length > 0 ? (
                            <select value={form.kitchenPrinterName} onChange={e => set('kitchenPrinterName', e.target.value)}
                                style={{ ...IS, height: '36px', fontSize: '12px', cursor: 'pointer', fontFamily: CAIRO }}>
                                <option value="">— بدون طابعة —</option>
                                {availablePrinters.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        ) : (
                            <input
                                value={form.kitchenPrinterName}
                                onChange={e => set('kitchenPrinterName', e.target.value)}
                                placeholder="اسم الطابعة (مثال: Kitchen_Printer)"
                                style={{ ...IS, height: '36px', fontSize: '12px' }}
                            />
                        )}
                    </div>
                </Row>
                <Row label="طابعة الفاتورة" sublabel="الطابعة المستخدمة لطباعة فاتورة العميل">
                    <div style={{ minWidth: '200px' }}>
                        {availablePrinters.length > 0 ? (
                            <select value={form.receiptPrinterName} onChange={e => set('receiptPrinterName', e.target.value)}
                                style={{ ...IS, height: '36px', fontSize: '12px', cursor: 'pointer', fontFamily: CAIRO }}>
                                <option value="">— الطابعة الافتراضية —</option>
                                {availablePrinters.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        ) : (
                            <input
                                value={form.receiptPrinterName}
                                onChange={e => set('receiptPrinterName', e.target.value)}
                                placeholder="اسم الطابعة (مثال: Receipt_Printer)"
                                style={{ ...IS, height: '36px', fontSize: '12px' }}
                            />
                        )}
                    </div>
                </Row>
                <div style={{ paddingTop: '14px' }}>
                    <label style={LS}>نص ذيل الفاتورة (يظهر أسفل كل فاتورة)</label>
                    <input value={form.receiptFooter} onChange={e => set('receiptFooter', e.target.value)}
                        placeholder="شكراً لزيارتكم" style={{ ...IS, height: '40px' }} />
                </div>
                <div style={{ marginTop: '10px', padding: '12px', background: `${C.primary}06`, border: `1px solid ${C.primary}15`, borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <AlertCircle size={14} color={C.primary} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '11.5px', color: C.textSecondary, lineHeight: 1.6 }}>
                        لربط الطابعة، اكتب اسمها بالضبط كما يظهر في إعدادات الطباعة على جهازك
                        (<strong>Control Panel → Devices and Printers</strong>). في حال التطبيق على شبكة، استخدم اسم الطابعة الشبكية.
                    </p>
                </div>
            </Section>

            {/* شاشة العميل */}
            <Section title="شاشة العميل (Customer Display)" icon={<Monitor size={18} />}>
                <Row label="تفعيل شاشة العميل" sublabel="تعرض الطلب للعميل أثناء الإدخال على شاشة منفصلة">
                    <Toggle value={form.enableCustomerDisplay} onChange={v => set('enableCustomerDisplay', v)} />
                </Row>
                {form.enableCustomerDisplay && (
                    <div style={{ padding: '12px', background: '#10b98110', border: '1px solid #10b98130', borderRadius: '12px', marginTop: '8px', fontSize: '12.5px', color: '#10b981' }}>
                        💡 افتح الرابط <strong>/customer-display</strong> على شاشة العميل وصمّمه كملء شاشة (Kiosk Mode).
                    </div>
                )}
            </Section>

            {/* سلوك النظام */}
            <Section title="سلوك الكاشير" icon={<UtensilsCrossed size={18} />}>
                <Row label="إلزامية اختيار الطاولة" sublabel="لا يمكن إتمام طلب صالة بدون اختيار طاولة">
                    <Toggle value={form.requireTableForDineIn} onChange={v => set('requireTableForDineIn', v)} />
                </Row>
                <Row label="السماح بتقسيم الفاتورة" sublabel="تقسيم الطلب بين أكثر من طريقة دفع">
                    <Toggle value={form.allowSplitBill} onChange={v => set('allowSplitBill', v)} />
                </Row>
                <Row label="نوع الطلب الافتراضي" sublabel="النوع الذي يظهر محدداً عند فتح الكاشير">
                    <select value={form.defaultOrderType} onChange={e => set('defaultOrderType', e.target.value)}
                        style={{ ...IS, height: '36px', fontSize: '12px', cursor: 'pointer', fontFamily: CAIRO, minWidth: '130px' }}>
                        <option value="dine-in">🪑 صالة</option>
                        <option value="takeaway">📦 تيك أواي</option>
                        <option value="delivery">🚚 توصيل</option>
                        <option value="online">🌐 أونلاين</option>
                    </select>
                </Row>
            </Section>

            {/* زر الحفظ */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
                {hasChanges && (
                    <span style={{ alignSelf: 'center', fontSize: '12px', color: C.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
                        يوجد تغييرات غير محفوظة
                    </span>
                )}
                <button onClick={handleSave} disabled={saving || !hasChanges}
                    style={{ ...BTN_PRIMARY(saving || !hasChanges, false), height: '44px', padding: '0 24px', borderRadius: '12px', gap: '8px' }}>
                    {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</> : <><Save size={15} /> حفظ الإعدادات</>}
                </button>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
