'use client';
import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { Truck, Plus, Edit2, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { C, CAIRO, PAGE_BASE, BTN_DANGER } from '@/constants/theme';
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
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
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
                    <div className="table-card">
                        <table className="app-table">
                            <thead>
                                <tr>
                                    <th>{t('اسم السائق')}</th>
                                    <th>{t('رقم الهاتف')}</th>
                                    <th>{t('الحالة')}</th>
                                    <th>{t('الطلبات الموصلة')}</th>
                                    <th style={{ width: '100px' }}>{t('إجراءات')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {drivers.map(d => (
                                    <tr key={d.id}>
                                        <td style={{ fontWeight: 600 }}>{d.name}</td>
                                        <td>{d.phone || '-'}</td>
                                        <td>
                                            <span style={{
                                                padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                                background: d.status === 'available' ? '#10b98120' : d.status === 'busy' ? '#f59e0b20' : '#ef444420',
                                                color: d.status === 'available' ? '#10b981' : d.status === 'busy' ? '#f59e0b' : '#ef4444'
                                            }}>
                                                {d.status === 'available' ? t('متاح') : d.status === 'busy' ? t('مشغول') : t('غير متصل')}
                                            </span>
                                        </td>
                                        <td>{d._count?.orders || 0}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button className="icon-btn edit-btn" onClick={() => setFormModal({ show: true, isEdit: true, data: d })}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="icon-btn delete-btn" onClick={() => handleDelete(d.id)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {drivers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>{t('لا يوجد سائقين')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Modal */}
                <AppModal show={formModal.show} onClose={() => setFormModal(p => ({ ...p, show: false }))} title={formModal.isEdit ? t('تعديل سائق') : t('إضافة سائق')}>
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>{t('اسم السائق')}</label>
                            <input required type="text" value={formModal.data.name || ''} onChange={e => setFormModal(p => ({ ...p, data: { ...p.data, name: e.target.value } }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textPrimary }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>{t('رقم الهاتف')}</label>
                            <input type="text" value={formModal.data.phone || ''} onChange={e => setFormModal(p => ({ ...p, data: { ...p.data, phone: e.target.value } }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textPrimary }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>{t('الحالة')}</label>
                            <select value={formModal.data.status || 'available'} onChange={e => setFormModal(p => ({ ...p, data: { ...p.data, status: e.target.value } }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textPrimary }}>
                                <option value="available" style={{ color: '#000' }}>{t('متاح')}</option>
                                <option value="busy" style={{ color: '#000' }}>{t('مشغول')}</option>
                                <option value="offline" style={{ color: '#000' }}>{t('غير متصل')}</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <button type="button" onClick={() => setFormModal(p => ({ ...p, show: false }))} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer' }}>{t('إلغاء')}</button>
                            <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: C.primary, border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                {isSaving ? <Loader2 className="spin" size={18} /> : t('حفظ البيانات')}
                            </button>
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
