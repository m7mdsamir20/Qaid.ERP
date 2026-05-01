'use client';
 
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO } from '@/constants/theme';
import { Package, BellRing, Clock, AlertCircle, Check, AlertTriangle } from 'lucide-react';
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
    const { t } = useTranslation();

    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '600px' }}>
            <TabHeader
                title={t("الإشعارات")}
                sub={t("تحكم في أنواع التنبيهات التي تظهر في النظام")}
                isEdit={isEditMode}
                onEdit={() => setIsEditMode(true)}
                onCancel={() => { setIsEditMode(false); fetchData(); }}
                onSave={() => saveSettings('update_notifications', notificationsForm)}
                isSaving={isSaving}
                t={t}
            />

            <form onSubmit={e => { e.preventDefault(); saveSettings('update_notifications', notificationsForm); }}>

                {/* ── إشعارات المخزون (فقط للأنشطة التجارية) ── */}
                {!isServices && (
                    <>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <Package size={14} /> {t('إدارة تنبيهات المخزون')}
                        </div>

                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)', marginBottom: '24px' }}>
                            {/* تفعيل */}
                            <div className="mobile-setting-row" style={{ display: 'flex', alignItems: 'center', borderBottom: notificationsForm.lowStock?.enabled ? `1px solid ${C.border}` : 'none' }}>
                                <div className="mobile-setting-label" style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                    <div style={{ color: notificationsForm.lowStock?.enabled ? '#f59e0b' : C.textMuted }}>
                                        <Package size={16} />
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('تنبيه انخفاض المخزون')}</span>
                                </div>
                                <div className="mobile-setting-value" style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '13px', color: notificationsForm.lowStock?.enabled ? '#f59e0b' : C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>
                                        {notificationsForm.lowStock?.enabled ? t('مفعّل — نظام التتبع النشط') : t('معطّل')}
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
                                <div className="mobile-setting-row" style={{ display: 'flex', alignItems: 'center' }}>
                                    <div className="mobile-setting-label" style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                        <div style={{ color: isEditMode ? C.primary : C.textMuted }}><AlertCircle size={15} /></div>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('حد التنبيه')}</span>
                                    </div>
                                    <div className="mobile-setting-value" style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {!isEditMode ? (
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, padding: '6px 0', fontFamily: CAIRO }}>
                                                {notificationsForm.lowStock?.threshold || 10} {t('وحدة متوفرة')}
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {[5, 10, 20, 50].map(v => (
                                                        <button key={v} type="button"
                                                            onClick={() => setNotificationsForm((p: any) => ({ ...p, lowStock: { ...p.lowStock, threshold: v } }))}
                                                            style={{ height: '34px', padding: '0 14px', borderRadius: '10px', border: `1px solid ${notificationsForm.lowStock?.threshold === v ? `${C.primary}40` : C.border}`, background: notificationsForm.lowStock?.threshold === v ? `${C.primary}15` : 'transparent', color: notificationsForm.lowStock?.threshold === v ? C.primary : C.textSecondary, fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO, transition: 'all 0.2s' }}>
                                                            {notificationsForm.lowStock?.threshold === v && <Check size={12} />}
                                                            {v}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginInlineStart: 'auto' }}>
                                                    <input type="number" min={1}
                                                        value={notificationsForm.lowStock?.threshold || 10}
                                                        onChange={e => setNotificationsForm((p: any) => ({ ...p, lowStock: { ...p.lowStock, threshold: +e.target.value } }))}
                                                        style={{ width: '80px', height: '34px', padding: '0 12px', borderRadius: '10px', border: `1px solid ${C.primary}30`, background: `${C.primary}05`, color: C.textPrimary, fontSize: '13px', fontWeight: 600, outline: 'none', fontFamily: CAIRO }} />
                                                    <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{t('وحدة')}</span>
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
                        <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <BellRing size={14} /> {t('المدفوعات والمديونيات')}
                        </div>

                        <div style={{ background: C.card, border: `1px solid ${isEditMode ? `${C.primary}30` : C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)', marginBottom: '16px' }}>
                            {[
                                {
                                    key: 'latePayment', icon: <Clock size={16} />,
                                    label: t('المتأخرات والأقساط'),
                                    desc: t('تنبيه بالأقساط والمديونيات التي تجاوزت موعد استحقاقها'),
                                    activeColor: '#f59e0b',
                                },
                            ].map((item, i, arr) => (
                                <div key={item.key} className="mobile-setting-row" style={{ display: 'flex', alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                    <div className="mobile-setting-label" style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                        <div style={{ color: notificationsForm[item.key]?.enabled ? item.activeColor : C.textMuted }}>
                                            {item.icon}
                                        </div>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{item.label}</span>
                                    </div>
                                    <div className="mobile-setting-value" style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '13px', color: notificationsForm[item.key]?.enabled ? item.activeColor : C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>
                                            {notificationsForm[item.key]?.enabled ? `${t('مفعّل')} — ${item.desc}` : t('معطّل')}
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

                {/* ── إشعارات أعمار الديون ── */}
                {!isServices && (
                    <>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <AlertTriangle size={14} /> {t('أعمار الديون والمديونيات المتأخرة')}
                        </div>

                        <div style={{ background: C.card, border: `1px solid ${isEditMode ? `${C.primary}30` : C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)', marginBottom: '24px' }}>
                            <div className="mobile-setting-row" style={{ display: 'flex', alignItems: 'center' }}>
                                <div className="mobile-setting-label" style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                    <div style={{ color: notificationsForm.agingDebt?.enabled ? '#ef4444' : C.textMuted }}>
                                        <AlertTriangle size={16} />
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('تنبيه الديون المتأخرة')}</span>
                                </div>
                                <div className="mobile-setting-value" style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '13px', color: notificationsForm.agingDebt?.enabled ? '#ef4444' : C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>
                                        {notificationsForm.agingDebt?.enabled
                                            ? t('مفعّل — تنبيه بالفواتير المتأخرة أكثر من 60 يوم')
                                            : t('معطّل')}
                                    </span>
                                    <Toggle
                                        checked={notificationsForm.agingDebt?.enabled || false}
                                        onChange={v => setNotificationsForm((p: any) => ({ ...p, agingDebt: { ...p.agingDebt, enabled: v } }))}
                                        disabled={!isEditMode}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

            </form>
        </div>
    );
}
