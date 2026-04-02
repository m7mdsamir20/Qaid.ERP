'use client';

import { C, CAIRO } from '@/constants/theme';
import { Package, BellRing, Clock, AlertCircle, Check } from 'lucide-react';
import { TabHeader, Toggle } from './shared';

interface NotificationsTabProps {
    notificationsForm: any;
    setNotificationsForm: (updater: any) => void;
    isSaving: boolean;
    saveSettings: (action: string, data: any) => void;
    isEditMode: boolean;
    setIsEditMode: (v: boolean) => void;
    fetchData: () => void;
    hasInstallmentsAccess: boolean;
    isServices?: boolean;
}

export default function NotificationsTab(props: NotificationsTabProps) {
    const {
        notificationsForm, setNotificationsForm, isSaving, saveSettings,
        isEditMode, setIsEditMode, fetchData, hasInstallmentsAccess, isServices
    } = props;
    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '600px' }}>
            <TabHeader
                title="الإشعارات"
                sub="تحكم في أنواع التنبيهات التي تظهر في النظام"
                isEdit={isEditMode}
                onEdit={() => setIsEditMode(true)}
                onCancel={() => { setIsEditMode(false); fetchData(); }}
                onSave={() => saveSettings('update_notifications', notificationsForm)}
                isSaving={isSaving}
            />

            <form onSubmit={e => { e.preventDefault(); saveSettings('update_notifications', notificationsForm); }}>

                {/* ── إشعارات المخزون (فقط للأنشطة التجارية) ── */}
                {!isServices && (
                    <>
                        <div style={{ fontSize: '12px', fontWeight: 900, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <Package size={14} /> إدارة تنبيهات المخزون
                        </div>

                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)', marginBottom: '24px' }}>
                            {/* تفعيل */}
                            <div style={{ display: 'flex', alignItems: 'center', borderBottom: notificationsForm.lowStock?.enabled ? `1px solid ${C.border}` : 'none' }}>
                                <div style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderLeft: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                    <div style={{ color: notificationsForm.lowStock?.enabled ? '#f59e0b' : C.textMuted }}>
                                        <Package size={16} />
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>تنبيه انخفاض المخزون</span>
                                </div>
                                <div style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '14px', color: notificationsForm.lowStock?.enabled ? '#f59e0b' : C.textMuted, fontWeight: 900, fontFamily: CAIRO }}>
                                        {notificationsForm.lowStock?.enabled ? 'مفعّل — نظام التتبع النشط' : 'معطّل'}
                                    </span>
                                    <Toggle
                                        checked={notificationsForm.lowStock?.enabled || false}
                                        onChange={v => setNotificationsForm((p: any) => ({ ...p, lowStock: { ...p.lowStock, enabled: v } }))}
                                        disabled={!isEditMode}
                                    />
                                </div>
                            </div>

                            {/* حد التنبيه */}
                            {notificationsForm.lowStock?.enabled && (
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderLeft: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                        <div style={{ color: isEditMode ? C.primary : C.textMuted }}><AlertCircle size={15} /></div>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>حد التنبيه</span>
                                    </div>
                                    <div style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {!isEditMode ? (
                                            <div style={{ fontSize: '14px', fontWeight: 900, color: C.textPrimary, padding: '6px 0', fontFamily: CAIRO }}>
                                                {notificationsForm.lowStock?.threshold || 10} وحدة متوفرة
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {[5, 10, 20, 50].map(v => (
                                                        <button key={v} type="button"
                                                            onClick={() => setNotificationsForm((p: any) => ({ ...p, lowStock: { ...p.lowStock, threshold: v } }))}
                                                            style={{ height: '34px', padding: '0 14px', borderRadius: '10px', border: `1px solid ${notificationsForm.lowStock?.threshold === v ? `${C.primary}40` : C.border}`, background: notificationsForm.lowStock?.threshold === v ? `${C.primary}15` : 'transparent', color: notificationsForm.lowStock?.threshold === v ? C.primary : C.textSecondary, fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO, transition: 'all 0.2s' }}>
                                                            {notificationsForm.lowStock?.threshold === v && <Check size={12} />}
                                                            {v}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                                                    <input type="number" min={1}
                                                        value={notificationsForm.lowStock?.threshold || 10}
                                                        onChange={e => setNotificationsForm((p: any) => ({ ...p, lowStock: { ...p.lowStock, threshold: +e.target.value } }))}
                                                        style={{ width: '80px', height: '34px', padding: '0 12px', borderRadius: '10px', border: `1px solid ${C.primary}30`, background: `${C.primary}05`, color: C.textPrimary, fontSize: '14px', fontWeight: 800, outline: 'none', textAlign: 'center', fontFamily: CAIRO }} />
                                                    <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>وحدة</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ── إشعارات المدفوعات ── */}
                {hasInstallmentsAccess && (
                    <>
                        <div style={{ fontSize: '12px', fontWeight: 900, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <BellRing size={14} /> المدفوعات والمديونيات
                        </div>

                        <div style={{ background: C.card, border: `1px solid ${isEditMode ? `${C.primary}30` : C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)', marginBottom: '16px' }}>
                            {[
                                {
                                    key: 'latePayment', icon: <Clock size={16} />,
                                    label: 'المتأخرات والأقساط',
                                    desc: 'تنبيه بالأقساط والمديونيات التي تجاوزت موعد استحقاقها',
                                    activeColor: '#f59e0b',
                                },
                            ].map((item, i, arr) => (
                                <div key={item.key} style={{ display: 'flex', alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                    <div style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderLeft: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                        <div style={{ color: notificationsForm[item.key]?.enabled ? item.activeColor : C.textMuted }}>
                                            {item.icon}
                                        </div>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{item.label}</span>
                                    </div>
                                    <div style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '14px', color: notificationsForm[item.key]?.enabled ? item.activeColor : C.textMuted, fontWeight: 800, fontFamily: CAIRO }}>
                                            {notificationsForm[item.key]?.enabled ? `مفعّل — ${item.desc}` : 'معطّل'}
                                        </span>
                                        <Toggle
                                            checked={notificationsForm[item.key]?.enabled || false}
                                            onChange={v => setNotificationsForm((p: any) => ({ ...p, [item.key]: { ...p[item.key], enabled: v } }))}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

            </form>
        </div>
    );
}
