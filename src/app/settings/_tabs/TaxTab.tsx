'use client';
 
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, OUTFIT } from '@/constants/theme';
import { Receipt } from 'lucide-react';
import { TabHeader, Toggle } from './shared';

interface TaxTabProps {
    isEditMode: boolean;
    setIsEditMode: (v: boolean) => void;
    taxForm: {
        enabled: boolean;
        type: string;
        rate: number;
        isInclusive: boolean;
        hasServiceCharge?: boolean;
        serviceChargeRate?: number;
    };
    setTaxForm: (updater: any) => void;
    savedTaxForm: {
        enabled: boolean;
        type: string;
        rate: number;
        isInclusive: boolean;
        hasServiceCharge?: boolean;
        serviceChargeRate?: number;
    };
    isSaving: boolean;
    handleCancel: () => void;
    saveSettings: (action: string, data: any) => void;
}

export default function TaxTab({
    isEditMode, setIsEditMode, taxForm, setTaxForm, savedTaxForm,
    isSaving, handleCancel, saveSettings
}: TaxTabProps) {
    const { t } = useTranslation();

    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '400px' }}>
            <TabHeader
                title={t("إعدادات الضريبة")}
                sub={t("تفعيل نظام الضرائب، تحديد النوع والنسبة الافتراضية")}
                isEdit={isEditMode}
                onEdit={() => setIsEditMode(true)}
                onCancel={handleCancel}
                onSave={() => saveSettings('update_tax', taxForm)}
                isSaving={isSaving}
                t={t}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>

                {/* ── Status Toggle ── */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: taxForm.enabled ? '#10b98120' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: taxForm.enabled ? '#10b981' : C.textMuted }}>
                            <Receipt size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{t('تفعيل النظام الضريبي')}</div>
                            <div style={{ fontSize: '11px', color: C.textMuted }}>{t('عند تفعيله سيتم إضافة حقول الضريبة في الفواتير والتقسيط')}</div>
                        </div>
                    </div>
                    <Toggle
                        checked={taxForm.enabled}
                        onChange={v => setTaxForm((p: any) => ({ ...p, enabled: v }))}
                        disabled={!isEditMode}
                    />
                </div>

                {taxForm.enabled && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', animation: 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>

                        {/* Tax Type */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: C.textMuted, marginBottom: '12px', fontFamily: CAIRO }}>{t('نوع الضريبة')}</label>
                            {!isEditMode ? (
                                <div style={{ fontSize: '15px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t(taxForm.type)}</div>
                            ) : (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {['VAT', t('ضريبة مبيعات'), t('ضريبة جدول'), t('ضريبة دمغة')].map(taxType => (
                                        <button
                                            key={taxType}
                                            onClick={() => setTaxForm((p: any) => ({ ...p, type: taxType }))}
                                            style={{
                                                padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: '0.2s',
                                                border: `1px solid ${taxForm.type === taxType ? C.primary : C.border}`,
                                                background: taxForm.type === taxType ? `${C.primary}15` : 'transparent',
                                                color: taxForm.type === taxType ? C.primary : C.textSecondary,
                                                fontFamily: CAIRO
                                            }}
                                        >{taxType}</button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Tax Rate */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: C.textMuted, marginBottom: '12px', fontFamily: CAIRO }}>{t('النسبة الافتراضية (%)')}</label>
                            {!isEditMode ? (
                                <div style={{ fontSize: '18px', fontWeight: 900, color: C.primary, fontFamily: OUTFIT }}>{taxForm.rate}%</div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="number"
                                        value={taxForm.rate}
                                        onChange={e => setTaxForm((p: any) => ({ ...p, rate: parseFloat(e.target.value) || 0 }))}
                                        style={{
                                            width: '100px', height: '40px', borderRadius: '10px', border: `1px solid ${C.border}`,
                                            background: 'rgba(0,0,0,0.2)', color: C.textPrimary, padding: '0 12px',
                                            fontSize: '15px', fontWeight: 800, textAlign: 'center', outline: 'none'
                                        }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: 800, color: C.primary }}>%</span>
                                </div>
                            )}
                        </div>

                        {/* Inclusive/Exclusive */}
                        <div style={{ gridColumn: 'span 2', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{t('الأسعار شاملة الضريبة')}</div>
                                <div style={{ fontSize: '11px', color: C.textMuted }}>{t('عند التفعيل، سيتم اعتبار سلع الفاتورة شاملة لنسبة الضريبة المسجلة')}</div>
                            </div>
                            <Toggle
                                checked={taxForm.isInclusive}
                                onChange={v => setTaxForm((p: any) => ({ ...p, isInclusive: v }))}
                                disabled={!isEditMode}
                            />
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
