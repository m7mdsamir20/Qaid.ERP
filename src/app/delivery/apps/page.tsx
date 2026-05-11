'use client';
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, OUTFIT, PAGE_BASE, TABLE_STYLE, IS, LS } from '@/constants/theme';
import { Truck, Plus, Trash2, CheckCircle2, AlertCircle, Save, Edit2, Loader2 } from 'lucide-react';
import ContentSkeleton from '@/components/ContentSkeleton';
import AppModal from '@/components/AppModal';

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
    
    const [formModal, setFormModal] = useState<{ show: boolean, isEdit: boolean, data: DeliveryApp }>({ 
        show: false, 
        isEdit: false, 
        data: { id: '', name: '', markupPercent: 0 } 
    });

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
            let newApps = [...deliveryApps];
            if (formModal.isEdit) {
                newApps = newApps.map(app => app.id === formModal.data.id ? formModal.data : app);
            } else {
                newApps.push({ ...formModal.data, id: Date.now().toString() });
            }

            const updatedSettings = { ...settings, deliveryApps: newApps };
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_restaurant', data: updatedSettings })
            });
            
            if (res.ok) {
                setSettings(updatedSettings);
                setDeliveryApps(newApps);
                setFormModal({ show: false, isEdit: false, data: { id: '', name: '', markupPercent: 0 } });
                showToast(t('تم حفظ تطبيقات التوصيل بنجاح ✓'));
            } else {
                showToast(t('فشل حفظ الإعدادات'), 'error');
            }
        } catch {
            showToast(t('فشل حفظ الإعدادات'), 'error');
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('هل أنت متأكد من حذف هذا التطبيق؟'))) return;
        setLoading(true);
        try {
            const newApps = deliveryApps.filter(app => app.id !== id);
            const updatedSettings = { ...settings, deliveryApps: newApps };
            
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_restaurant', data: updatedSettings })
            });
            
            if (res.ok) {
                setSettings(updatedSettings);
                setDeliveryApps(newApps);
                showToast(t('تم الحذف بنجاح ✓'));
            } else {
                showToast(t('فشل الحذف'), 'error');
            }
        } catch {
            showToast(t('فشل الحذف'), 'error');
        }
        setLoading(false);
    };

    if (loading && !settings) {
        return <DashboardLayout><ContentSkeleton /></DashboardLayout>;
    }

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={t('تطبيقات التوصيل (Aggregators)')}
                    subtitle={t('إدارة تطبيقات التوصيل ونسب الزيادة الخاصة بها')}
                    icon={Truck}
                    primaryButton={{
                        label: t("إضافة تطبيق"),
                        icon: Plus,
                        onClick: () => setFormModal({ show: true, isEdit: false, data: { id: '', name: '', markupPercent: 0 } })
                    }}
                />

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="spin" /></div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <table style={TABLE_STYLE.table}>
                            <thead>
                                <tr style={TABLE_STYLE.thead}>
                                    <th style={TABLE_STYLE.th(true)}>{t('اسم التطبيق')}</th>
                                    <th style={TABLE_STYLE.th(false)}>{t('نسبة الزيادة')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('إجراءات')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deliveryApps.map((app, i) => (
                                    <tr key={app.id} style={TABLE_STYLE.row(i === deliveryApps.length - 1)}
                                        onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ ...TABLE_STYLE.td(true), fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: C.primaryBg, border: `1px solid ${C.primaryBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, fontSize: '12px', fontWeight: 700, fontFamily: OUTFIT }}>
                                                    {app.name.charAt(0)}
                                                </div>
                                                {app.name}
                                            </div>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary, fontSize: '13px' }}>
                                            {app.markupPercent}%
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button onClick={() => setFormModal({ show: true, isEdit: true, data: app })} style={TABLE_STYLE.actionBtn()}>
                                                    <Edit2 size={TABLE_STYLE.actionIconSize} />
                                                </button>
                                                <button onClick={() => handleDelete(app.id)} style={TABLE_STYLE.actionBtn(C.danger)}>
                                                    <Trash2 size={TABLE_STYLE.actionIconSize} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {deliveryApps.length === 0 && (
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: 'center', padding: '60px 0', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                <Truck size={36} style={{ color: C.textMuted, opacity: 0.3, margin: '0 auto 10px' }} />
                                                <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0, fontFamily: CAIRO }}>{t('لا يوجد تطبيقات توصيل مضافة حالياً')}</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Modal */}
                <AppModal show={formModal.show} onClose={() => setFormModal(p => ({ ...p, show: false }))} title={formModal.isEdit ? t('تعديل تطبيق التوصيل') : t('إضافة تطبيق توصيل')} maxWidth="520px">
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={LS}>{t('اسم التطبيق')} <span style={{ color: C.danger }}>*</span></label>
                            <input 
                                required 
                                type="text" 
                                value={formModal.data.name || ''} 
                                onChange={e => setFormModal(p => ({ ...p, data: { ...p.data, name: e.target.value } }))} 
                                placeholder={t('مثال: طلبات')} 
                                style={IS} 
                            />
                        </div>
                        <div>
                            <label style={LS}>{t('نسبة الزيادة')} <span style={{ color: C.danger }}>*</span></label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    required
                                    type="number" 
                                    min="0"
                                    max="100"
                                    value={formModal.data.markupPercent === 0 && !formModal.isEdit && !formModal.data.markupPercent.toString().includes('0') ? '' : formModal.data.markupPercent} 
                                    onChange={e => setFormModal(p => ({ ...p, data: { ...p.data, markupPercent: Number(e.target.value) } }))} 
                                    placeholder="0" 
                                    style={{ ...IS, paddingInlineEnd: '30px', fontFamily: OUTFIT }} 
                                />
                                <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', insetInlineEnd: '12px', fontSize: '14px', color: C.textMuted, fontWeight: 700 }}>%</span>
                            </div>
                            <p style={{ fontSize: '11px', color: C.textMuted, marginTop: '6px', fontFamily: CAIRO }}>
                                {t('سيتم زيادة أسعار الأصناف والإضافات تلقائياً في شاشة الكاشير بهذه النسبة عند اختيار هذا التطبيق.')}
                            </p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '28px' }}>
                            <button type="submit" disabled={saving} style={{ height: '44px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: saving ? 'not-allowed' : 'pointer' }}>
                                {saving ? <Loader2 className="spin" size={18} /> : t('حفظ البيانات')}
                            </button>
                            <button type="button" onClick={() => setFormModal(p => ({ ...p, show: false }))} style={{ height: '44px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>{t('إلغاء')}</button>
                        </div>
                    </form>
                </AppModal>

                {toastMsg && (
                    <div style={{ position: 'fixed', bottom: '24px', insetInlineStart: '24px', background: toastType === 'success' ? '#10b981' : '#ef4444', color: '#fff', padding: '12px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 9999, fontWeight: 600 }}>
                        {toastType === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {toastMsg}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
