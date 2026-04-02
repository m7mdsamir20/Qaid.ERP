'use client';

import { C, CAIRO, INTER } from '@/constants/theme';
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
    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '400px' }}>
            <TabHeader
                title="إعدادات الضريبة"
                sub="تفعيل نظام الضرائب، تحديد النوع والنسبة الافتراضية"
                isEdit={isEditMode}
                onEdit={() => setIsEditMode(true)}
                onCancel={handleCancel}
                onSave={() => saveSettings('update_tax', taxForm)}
                isSaving={isSaving}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>

                {/* ── Status Toggle ── */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: taxForm.enabled ? '#10b98120' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: taxForm.enabled ? '#10b981' : C.textMuted }}>
                            <Receipt size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>تفعيل النظام الضريبي</div>
                            <div style={{ fontSize: '11px', color: C.textMuted }}>عند تفعيله سيتم إضافة حقول الضريبة في الفواتير والتقسيط</div>
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
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: C.textMuted, marginBottom: '12px', fontFamily: CAIRO }}>نوع الضريبة</label>
                            {!isEditMode ? (
                                <div style={{ fontSize: '15px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{taxForm.type}</div>
                            ) : (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {['VAT', 'ضريبة مبيعات', 'ضريبة جدول', 'ضريبة دمغة'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setTaxForm((p: any) => ({ ...p, type: t }))}
                                            style={{
                                                padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: '0.2s',
                                                border: `1px solid ${taxForm.type === t ? C.primary : C.border}`,
                                                background: taxForm.type === t ? `${C.primary}15` : 'transparent',
                                                color: taxForm.type === t ? C.primary : C.textSecondary,
                                                fontFamily: CAIRO
                                            }}
                                        >{t}</button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Tax Rate */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: C.textMuted, marginBottom: '12px', fontFamily: CAIRO }}>النسبة الافتراضية (%)</label>
                            {!isEditMode ? (
                                <div style={{ fontSize: '18px', fontWeight: 900, color: C.primary, fontFamily: INTER }}>{taxForm.rate}%</div>
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
                                <div style={{ fontSize: '14px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>الأسعار شاملة الضريبة</div>
                                <div style={{ fontSize: '11px', color: C.textMuted }}>عند التفعيل، سيتم اعتبار سلع الفاتورة شاملة لنسبة الضريبة المسجلة</div>
                            </div>
                            <Toggle
                                checked={taxForm.isInclusive}
                                onChange={v => setTaxForm((p: any) => ({ ...p, isInclusive: v }))}
                                disabled={!isEditMode}
                            />
                        </div>

                    </div>
                )}

                {/* ── POS Service Charge Toggle ── */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: taxForm.hasServiceCharge ? '#3b82f620' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: taxForm.hasServiceCharge ? '#3b82f6' : C.textMuted }}>
                            <Receipt size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>تفعيل رسوم الخدمة (POS)</div>
                            <div style={{ fontSize: '11px', color: C.textMuted }}>عند تفعيلها، سيتم إضافة حقل 'خدمة' بنسبة مئوية في شاشة الكاشير السريع (المطاعم/الكافيهات)</div>
                        </div>
                    </div>
                    <Toggle
                        checked={!!taxForm.hasServiceCharge}
                        onChange={v => setTaxForm((p: any) => ({ ...p, hasServiceCharge: v }))}
                        disabled={!isEditMode}
                    />
                </div>

                {taxForm.hasServiceCharge && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', animation: 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: C.textMuted, marginBottom: '12px', fontFamily: CAIRO }}>نسبة الخدمة الافتراضية (%)</label>
                        {!isEditMode ? (
                            <div style={{ fontSize: '18px', fontWeight: 900, color: C.primary, fontFamily: INTER }}>{taxForm.serviceChargeRate || 0}%</div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                    type="number"
                                    value={taxForm.serviceChargeRate || 0}
                                    onChange={e => setTaxForm((p: any) => ({ ...p, serviceChargeRate: parseFloat(e.target.value) || 0 }))}
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
                )}

            </div>
        </div>
    );
}
