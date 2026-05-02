'use client';
import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { Truck, Plus, Edit2, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, PAGE_BASE, BTN_DANGER, IS, LS, BTN_PRIMARY, TABLE_STYLE } from '@/constants/theme';
import AppModal from '@/components/AppModal';

export default function DriversPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formModal, setFormModal] = useState<{ show: boolean, isEdit: boolean, data: any }>({ show: false, isEdit: false, data: {} });
    const [isSaving, setIsSaving] = useState(false);
    const [toastMsg, setToastMsg] = useState('');

    useEffect(() => { fetchDrivers(); }, []);

    const fetchDrivers = async () => {
        try {
            const res = await fetch('/api/drivers');
            if (res.ok) {
                const data = await res.json();
                setDrivers(data);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const method = formModal.isEdit ? 'PUT' : 'POST';
            const res = await fetch('/api/drivers', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formModal.data),
            });
            if (res.ok) {
                showToast(t('تم الحفظ بنجاح'));
                setFormModal({ show: false, isEdit: false, data: {} });
                fetchDrivers();
            } else {
                const d = await res.json();
                showToast(d.error || t('حدث خطأ أثناء الحفظ'));
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('هل أنت متأكد من حذف هذا السائق؟'))) return;
        try {
            const res = await fetch(`/api/drivers?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast(t('تم الحذف بنجاح'));
                fetchDrivers();
            }
        } catch (e: any) {
            showToast(e.message || t('حدث خطأ أثناء الحذف'));
        }
    };

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(''), 3000);
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={t("إدارة السائقين")}
                    subtitle={t("إدارة سائقي التوصيل الخاصين بالمطعم وتتبع حالاتهم")}
                    icon={Truck}
                    primaryButton={{
                        label: t("إضافة سائق"),
                        icon: Plus,
                        onClick: () => setFormModal({ show: true, isEdit: false, data: { name: '', phone: '', status: 'available' } })
                    }}
                />

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="spin" /></div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <table style={TABLE_STYLE.table}>
                            <thead>
                                <tr style={TABLE_STYLE.thead}>
                                    <th style={TABLE_STYLE.th(true)}>{t('اسم السائق')}</th>
                                    <th style={TABLE_STYLE.th(false)}>{t('رقم الهاتف')}</th>
                                    <th style={TABLE_STYLE.th(false)}>{t('الحالة')}</th>
                                    <th style={TABLE_STYLE.th(false)}>{t('الطلبات الموصلة')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('إجراءات')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drivers.map((d, i) => (
                                    <tr key={d.id} style={TABLE_STYLE.row(i === drivers.length - 1)}
                                        onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ ...TABLE_STYLE.td(true), fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: C.primaryBg, border: `1px solid ${C.primaryBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, fontSize: '12px', fontWeight: 700, fontFamily: OUTFIT }}>
                                                    {d.name.charAt(0)}
                                                </div>
                                                {d.name}
                                            </div>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, color: C.textSecondary, fontSize: '13px' }}>{d.phone || '—'}</td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{
                                                display: 'inline-flex', padding: '3px 12px', borderRadius: '30px', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO,
                                                background: d.status === 'available' ? 'rgba(74,222,128,0.12)' : d.status === 'busy' ? 'rgba(245,158,11,0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                color: d.status === 'available' ? '#4ade80' : d.status === 'busy' ? '#f59e0b' : '#fb7185',
                                                border: `1px solid ${d.status === 'available' ? 'rgba(74,222,128,0.22)' : d.status === 'busy' ? 'rgba(245,158,11,0.22)' : 'rgba(239, 68, 68, 0.22)'}`
                                            }}>
                                                {d.status === 'available' ? t('متاح') : d.status === 'busy' ? t('مشغول') : t('غير متصل')}
                                            </span>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, fontWeight: 700, color: C.textPrimary }}>{d._count?.orders || 0}</td>
                                        <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button onClick={() => setFormModal({ show: true, isEdit: true, data: d })} style={TABLE_STYLE.actionBtn()}>
                                                    <Edit2 size={TABLE_STYLE.actionIconSize} />
                                                </button>
                                                <button onClick={() => handleDelete(d.id)} style={TABLE_STYLE.actionBtn(C.danger)}>
                                                    <Trash2 size={TABLE_STYLE.actionIconSize} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {drivers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '60px 0', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                <Truck size={36} style={{ color: C.textMuted, opacity: 0.3, margin: '0 auto 10px' }} />
                                                <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0, fontFamily: CAIRO }}>{t('لا يوجد سائقين مضافين حالياً')}</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Modal */}
                <AppModal show={formModal.show} onClose={() => setFormModal(p => ({ ...p, show: false }))} title={formModal.isEdit ? t('تعديل سائق') : t('إضافة سائق')} maxWidth="520px">
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={LS}>{t('اسم السائق')} <span style={{ color: C.danger }}>*</span></label>
                            <input required type="text" value={formModal.data.name || ''} onChange={e => setFormModal(p => ({ ...p, data: { ...p.data, name: e.target.value } }))} placeholder={t('مثال: أحمد محمد')} style={IS} />
                        </div>
                        <div>
                            <label style={LS}>{t('رقم الهاتف')}</label>
                            <input type="text" value={formModal.data.phone || ''} onChange={e => setFormModal(p => ({ ...p, data: { ...p.data, phone: e.target.value } }))} placeholder="05xxxxxxxx" style={IS} />
                        </div>
                        <div>
                            <label style={LS}>{t('الحالة')}</label>
                            <CustomSelect
                                value={formModal.data.status || 'available'}
                                onChange={(v) => setFormModal(p => ({ ...p, data: { ...p.data, status: v } }))}
                                hideSearch
                                options={[
                                    { value: 'available', label: t('متاح') },
                                    { value: 'busy', label: t('مشغول') },
                                    { value: 'offline', label: t('غير متصل') }
                                ]}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '28px' }}>
                            <button type="submit" disabled={isSaving} style={{ height: '44px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                                {isSaving ? <Loader2 className="spin" size={18} /> : t('حفظ البيانات')}
                            </button>
                            <button type="button" onClick={() => setFormModal(p => ({ ...p, show: false }))} style={{ height: '44px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, cursor: 'pointer' }}>{t('إلغاء')}</button>
                        </div>
                    </form>
                </AppModal>

                {toastMsg && (
                    <div style={{ position: 'fixed', bottom: '24px', insetInlineStart: '24px', background: '#10b981', color: '#fff', padding: '12px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 9999, fontWeight: 600 }}>
                        <CheckCircle2 size={18} /> {toastMsg}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
