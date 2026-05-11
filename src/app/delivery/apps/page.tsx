'use client';
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, OUTFIT, PAGE_BASE } from '@/constants/theme';
import { Truck, Plus, Trash2, CheckCircle2, AlertCircle, Save, X } from 'lucide-react';
import ContentSkeleton from '@/components/ContentSkeleton';

interface DeliveryApp {
    id: string;
    name: string;
    markupPercent: number;
}

interface RestaurantSettings {
    deliveryApps: DeliveryApp[];
    [key: string]: any;
}

export default function DeliveryAppsPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<RestaurantSettings | null>(null);
    const [deliveryApps, setDeliveryApps] = useState<DeliveryApp[]>([]);
    
    // Toast state
    const [toastMsg, setToastMsg] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToastMsg(msg);
        setToastType(type);
        setTimeout(() => setToastMsg(''), 3500);
    };

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const data = await res.json();
                    if (data.restaurantSettings) {
                        setSettings(data.restaurantSettings);
                        setDeliveryApps(data.restaurantSettings.deliveryApps || []);
                    }
                }
            } catch (error) {
                showToast(t('فشل تحميل الإعدادات'), 'error');
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, [t]);

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const updatedSettings = { ...settings, deliveryApps };
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_restaurant', data: updatedSettings })
            });
            
            if (res.ok) {
                setSettings(updatedSettings);
                showToast(t('تم حفظ تطبيقات التوصيل بنجاح ✓'));
            } else {
                showToast(t('فشل حفظ الإعدادات'), 'error');
            }
        } catch {
            showToast(t('فشل حفظ الإعدادات'), 'error');
        }
        setSaving(false);
    };

    if (loading) {
        return <DashboardLayout><ContentSkeleton /></DashboardLayout>;
    }

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <PageHeader
                    title={t('تطبيقات التوصيل (Aggregators)')}
                    subtitle={t('إدارة تطبيقات التوصيل ونسب الزيادة الخاصة بها')}
                    icon={Truck}
                />

                {toastMsg && (
                    <div style={{ position: 'fixed', bottom: '24px', insetInlineStart: '24px', background: toastType === 'success' ? '#10b981' : '#ef4444', color: '#fff', padding: '12px 24px', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 9999, fontSize: '13px', fontWeight: 600 }}>
                        {toastType === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {toastMsg}
                    </div>
                )}

                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${C.border}` }}>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: C.textPrimary, margin: '0 0 8px 0', fontFamily: CAIRO }}>{t('التطبيقات المضافة')}</h2>
                            <p style={{ fontSize: '13px', color: C.textSecondary, margin: 0, fontFamily: CAIRO }}>
                                {t('أضف تطبيقات التوصيل (مثل طلبات، جاهز) وحدد نسبة زيادة السعر ليتم تطبيقها تلقائياً عند اختيار التطبيق في شاشة الكاشير.')}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDeliveryApps([...deliveryApps, { id: Date.now().toString(), name: '', markupPercent: 0 }])}
                            style={{ padding: '10px 16px', borderRadius: '12px', background: C.primary, color: '#fff', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none', transition: 'all 0.2s', fontFamily: CAIRO }}
                        >
                            <Plus size={16} /> {t('إضافة تطبيق')}
                        </button>
                    </div>

                    <form onSubmit={handleSave}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                            {deliveryApps.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', background: `${C.border}33`, borderRadius: '16px', color: C.textMuted }}>
                                    <Truck size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                                    <p style={{ fontSize: '14px', fontWeight: 600, fontFamily: CAIRO, margin: 0 }}>{t('لم يتم إضافة أي تطبيقات توصيل بعد')}</p>
                                </div>
                            ) : (
                                deliveryApps.map((app, index) => (
                                    <div key={app.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '16px' }}>
                                        <div style={{ flex: 2 }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.textSecondary, marginBottom: '8px', fontFamily: CAIRO }}>{t('اسم التطبيق')}</label>
                                            <input
                                                type="text"
                                                value={app.name}
                                                onChange={e => {
                                                    const newApps = [...deliveryApps];
                                                    newApps[index].name = e.target.value;
                                                    setDeliveryApps(newApps);
                                                }}
                                                placeholder={t('مثال: طلبات')}
                                                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.bg, fontSize: '14px', fontFamily: CAIRO, outline: 'none', color: C.textPrimary }}
                                                required
                                            />
                                        </div>
                                        <div style={{ flex: 1, position: 'relative' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.textSecondary, marginBottom: '8px', fontFamily: CAIRO }}>{t('نسبة الزيادة')}</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="number"
                                                    value={app.markupPercent || ''}
                                                    onChange={e => {
                                                        const newApps = [...deliveryApps];
                                                        newApps[index].markupPercent = Number(e.target.value);
                                                        setDeliveryApps(newApps);
                                                    }}
                                                    placeholder="0"
                                                    min="0"
                                                    max="100"
                                                    style={{ width: '100%', padding: '12px 16px', paddingInlineEnd: '30px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.bg, fontSize: '14px', fontFamily: OUTFIT, outline: 'none', color: C.textPrimary }}
                                                />
                                                <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', insetInlineEnd: '12px', fontSize: '14px', color: C.textMuted, fontWeight: 700 }}>%</span>
                                            </div>
                                        </div>
                                        <div style={{ paddingTop: '24px' }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newApps = deliveryApps.filter((_, i) => i !== index);
                                                    setDeliveryApps(newApps);
                                                }}
                                                style={{ width: '45px', height: '45px', borderRadius: '12px', border: `1px solid ${C.dangerBorder}`, background: C.dangerBg, color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                                title={t('حذف التطبيق')}
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: `1px solid ${C.border}`, paddingTop: '24px' }}>
                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    padding: '12px 32px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: C.primary,
                                    color: '#fff',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontFamily: CAIRO,
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? t('جاري الحفظ...') : <><Save size={18} /> {t('حفظ التعديلات')}</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
