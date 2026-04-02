'use client';

import { useState } from 'react';
import { C, CAIRO, INTER } from '@/constants/theme';
import { Globe, Coins, Calendar, Clock, ChevronDown, Check, Search } from 'lucide-react';
import { TabHeader } from './shared';

interface GeneralTabProps {
    isEditMode: boolean;
    setIsEditMode: (v: boolean) => void;
    generalForm: {
        currency: string; timezone: string; calendarType: string; dateFormat: string; customCurrency: string;
    };
    setGeneralForm: (updater: any) => void;
    savedGeneral: {
        currency: string; timezone: string; calendarType: string; dateFormat: string; customCurrency: string;
    };
    isSaving: boolean;
    handleCancel: () => void;
    saveSettings: (action: string, data: any) => void;
    currencySearch: string;
    setCurrencySearch: (v: string) => void;
}

export default function GeneralTab({
    isEditMode, setIsEditMode, generalForm, setGeneralForm, savedGeneral,
    isSaving, handleCancel, saveSettings, currencySearch, setCurrencySearch
}: GeneralTabProps) {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '600px' }}>
            <TabHeader
                title="الإعدادات العامة"
                sub="العملة والمنطقة الزمنية وتنسيق التاريخ"
                isEdit={isEditMode}
                onEdit={() => setIsEditMode(true)}
                onCancel={handleCancel}
                onSave={() => {
                    const finalCurrency = generalForm.currency === 'OTHER' ? generalForm.customCurrency : generalForm.currency;
                    saveSettings('update_general', { ...generalForm, currency: finalCurrency });
                }}
                isSaving={isSaving}
            />

            <form onSubmit={e => {
                e.preventDefault();
                const finalCurrency = generalForm.currency === 'OTHER' ? generalForm.customCurrency : generalForm.currency;
                saveSettings('update_general', { ...generalForm, currency: finalCurrency });
            }}>

                <div style={{ fontSize: '12px', fontWeight: 900, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Globe size={14} /> إعدادات النظام
                </div>

                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)', marginBottom: '24px' }}>

                    {/* ── العملة ── */}
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderLeft: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ color: isEditMode ? C.primary : C.textMuted }}><Coins size={15} /></div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>العملة الأساسية</span>
                        </div>
                        <div style={{ flex: 1, padding: '12px 20px', position: 'relative' }} className="custom-dropdown">
                            {!isEditMode ? (
                                <div style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary, padding: '6px 0', fontFamily: CAIRO }}>
                                    {{
                                        EGP: 'الجنيه المصري (EGP)',
                                        SAR: 'الريال السعودي (SAR)',
                                        AED: 'الدرهم الإماراتي (AED)',
                                        USD: 'الدولار الأمريكي (USD)',
                                        KWD: 'الدينار الكويتي (KWD)',
                                        QAR: 'الريال القطري (QAR)',
                                        BHD: 'الدينار البحريني (BHD)',
                                        OMR: 'الريال العماني (OMR)',
                                        JOD: 'الدينار الأردني (JOD)',
                                        LYD: 'الدينار الليبي (LYD)',
                                        IQD: 'الدينار العراقي (IQD)',
                                        TRY: 'الليرة التركية (TRY)',
                                        EUR: 'اليورو (EUR)',
                                        GBP: 'الجنيه الإسترليني (GBP)',
                                        OTHER: `أخرى (${generalForm.currency})`
                                    }[generalForm.currency] || `أخرى (${generalForm.currency})`}
                                </div>
                            ) : (
                                <>
                                    <button type="button"
                                        onClick={() => setOpenDropdown(openDropdown === 'currency' ? null : 'currency')}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '280px', height: '40px', padding: '0 16px', borderRadius: '10px', border: `1px solid ${C.primary}40`, background: `${C.primary}10`, color: C.textPrimary, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                        <ChevronDown size={16} style={{ color: C.primary, transform: openDropdown === 'currency' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                        <span>{{
                                            EGP: 'الجنيه المصري (EGP)',
                                            SAR: 'الريال السعودي (SAR)',
                                            AED: 'الدرهم الإماراتي (AED)',
                                            USD: 'الدولار الأمريكي (USD)',
                                            KWD: 'الدينار الكويتي (KWD)',
                                            QAR: 'الريال القطري (QAR)',
                                            BHD: 'الدينار البحريني (BHD)',
                                            OMR: 'الريال العماني (OMR)',
                                            JOD: 'الدينار الأردني (JOD)',
                                            LYD: 'الدينار الليبي (LYD)',
                                            IQD: 'الدينار العراقي (IQD)',
                                            TRY: 'الليرة التركية (TRY)',
                                            EUR: 'اليورو (EUR)',
                                            GBP: 'الجنيه الإسترليني (GBP)',
                                            OTHER: 'أخرى (من اختيارك)'
                                        }[generalForm.currency] || `أخرى (${generalForm.currency})`}</span>
                                    </button>
                                    {openDropdown === 'currency' && (
                                        <div style={{ position: 'absolute', top: '44px', right: 20, zIndex: 999, width: '280px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                            {/* Search Box */}
                                            <div style={{ padding: '8px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <Search size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
                                                    <input
                                                        autoFocus
                                                        placeholder="بحث عن عملة..."
                                                        value={currencySearch}
                                                        onChange={e => setCurrencySearch(e.target.value)}
                                                        style={{ width: '100%', height: '34px', padding: '0 32px 0 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.2)', color: C.textPrimary, fontSize: '12px', outline: 'none', fontFamily: CAIRO }}
                                                    />
                                                </div>
                                            </div>
                                            {/* List */}
                                            <div style={{ maxHeight: '160px', overflowY: 'auto' }} className="custom-scrollbar">
                                                {[
                                                    { value: 'EGP', label: 'الجنيه المصري', code: 'EGP' },
                                                    { value: 'SAR', label: 'الريال السعودي', code: 'SAR' },
                                                    { value: 'AED', label: 'الدرهم الإماراتي', code: 'AED' },
                                                    { value: 'KWD', label: 'الدينار الكويتي', code: 'KWD' },
                                                    { value: 'USD', label: 'الدولار الأمريكي', code: 'USD' },
                                                    { value: 'QAR', label: 'الريال القطري (QAR)', code: 'QAR' },
                                                    { value: 'BHD', label: 'الدينار البحريني (BHD)', code: 'BHD' },
                                                    { value: 'OMR', label: 'الريال العماني (OMR)', code: 'OMR' },
                                                    { value: 'JOD', label: 'الدينار الأردني (JOD)', code: 'JOD' },
                                                    { value: 'LYD', label: 'الدينار الليبي (LYD)', code: 'LYD' },
                                                    { value: 'IQD', label: 'الدينار العراقي (IQD)', code: 'IQD' },
                                                    { value: 'TRY', label: 'الليرة التركية (TRY)', code: 'TRY' },
                                                    { value: 'EUR', label: 'اليورو (EUR)', code: 'EUR' },
                                                    { value: 'GBP', label: 'الجنيه الإسترليني (GBP)', code: 'GBP' },
                                                    { value: 'OTHER', label: 'عملة أخرى (كتابة يدوية)', code: '???' },
                                                ].filter(opt =>
                                                    opt.label.includes(currencySearch) ||
                                                    opt.code.toLowerCase().includes(currencySearch.toLowerCase())
                                                ).map((opt, i, arr) => {
                                                    const selected = generalForm.currency === opt.value;
                                                    return (
                                                        <button key={opt.value} type="button"
                                                            onClick={() => {
                                                                if (opt.value === 'OTHER') {
                                                                    setGeneralForm((p: any) => ({ ...p, currency: 'OTHER' }));
                                                                } else {
                                                                    setGeneralForm((p: any) => ({ ...p, currency: opt.value }));
                                                                }
                                                                setOpenDropdown(null);
                                                                setCurrencySearch('');
                                                            }}
                                                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', border: 'none', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none', background: selected ? `${C.primary}15` : 'transparent', color: selected ? C.primary : C.textSecondary, fontSize: '13px', fontWeight: selected ? 800 : 600, cursor: 'pointer', textAlign: 'right', fontFamily: CAIRO }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <span style={{ fontSize: '11px', color: selected ? C.primary : C.textMuted, fontFamily: INTER, opacity: 0.7 }}>{opt.code}</span>
                                                                <span>{opt.label}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                {selected && <Check size={14} style={{ color: C.primary }} />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {generalForm.currency === 'OTHER' && (
                                        <div style={{ marginTop: '12px' }}>
                                            <input
                                                placeholder="اكتب كود العملة هنا (مثال: KWD)"
                                                style={{ width: '280px', height: '40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.2)', color: C.textPrimary, padding: '0 16px', fontSize: '13px', fontWeight: 600, direction: 'ltr', textAlign: 'left', outline: 'none' }}
                                                value={generalForm.customCurrency}
                                                onChange={e => setGeneralForm((p: any) => ({ ...p, customCurrency: e.target.value.toUpperCase() }))}
                                            />
                                            <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '6px', fontFamily: CAIRO }}>يتم استخدام هذا الكود في النظام بالكامل</div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── المنطقة الزمنية ── */}
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderLeft: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ color: isEditMode ? C.primary : C.textMuted }}><Globe size={15} /></div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>المنطقة الزمنية</span>
                        </div>
                        <div style={{ flex: 1, padding: '12px 20px', position: 'relative' }} className="custom-dropdown">
                            {!isEditMode ? (
                                <div style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary, padding: '6px 0', direction: 'ltr', textAlign: 'right', fontFamily: INTER }}>
                                    {generalForm.timezone}
                                </div>
                            ) : (
                                <>
                                    <button type="button"
                                        onClick={() => setOpenDropdown(openDropdown === 'timezone' ? null : 'timezone')}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '280px', height: '40px', padding: '0 16px', borderRadius: '10px', border: `1px solid ${C.primary}40`, background: `${C.primary}10`, color: C.textPrimary, fontSize: '13px', fontWeight: 700, cursor: 'pointer', direction: 'ltr' }}>
                                        <ChevronDown size={16} style={{ color: C.primary, transform: openDropdown === 'timezone' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                        <span>{generalForm.timezone}</span>
                                    </button>
                                    {openDropdown === 'timezone' && (
                                        <div style={{ position: 'absolute', top: '44px', right: 20, zIndex: 999, width: '280px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                            {['Africa/Cairo', 'Asia/Riyadh', 'Asia/Dubai', 'Europe/London'].map((tz, i, arr) => {
                                                const selected = generalForm.timezone === tz;
                                                return (
                                                    <button key={tz} type="button"
                                                        onClick={() => { setGeneralForm((p: any) => ({ ...p, timezone: tz })); setOpenDropdown(null); }}
                                                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: 'none', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none', background: selected ? `${C.primary}15` : 'transparent', color: selected ? C.primary : C.textSecondary, fontSize: '13px', fontWeight: selected ? 800 : 600, cursor: 'pointer', direction: 'ltr', textAlign: 'left', fontFamily: INTER }}>
                                                        <Check size={14} style={{ color: C.primary, opacity: selected ? 1 : 0 }} />
                                                        <span>{tz}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── نوع التقويم ── */}
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderLeft: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ color: isEditMode ? C.primary : C.textMuted }}><Calendar size={15} /></div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>نوع التقويم</span>
                        </div>
                        <div style={{ flex: 1, padding: '12px 20px' }}>
                            {!isEditMode ? (
                                <div style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary, padding: '6px 0', fontFamily: CAIRO }}>
                                    {generalForm.calendarType === 'Gregorian' ? 'ميلادي' : 'هجري'}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {[{ v: 'Gregorian', l: 'ميلادي' }, { v: 'Hijri', l: 'هجري' }].map(opt => (
                                        <button key={opt.v} type="button"
                                            onClick={() => setGeneralForm((p: any) => ({ ...p, calendarType: opt.v }))}
                                            style={{ height: '36px', padding: '0 20px', borderRadius: '10px', border: `1px solid ${generalForm.calendarType === opt.v ? `${C.primary}40` : C.border}`, background: generalForm.calendarType === opt.v ? `${C.primary}15` : 'transparent', color: generalForm.calendarType === opt.v ? C.primary : C.textSecondary, fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, transition: 'all 0.2s' }}>
                                            {generalForm.calendarType === opt.v && <Check size={14} />}
                                            {opt.l}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── تنسيق التاريخ ── */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderLeft: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ color: isEditMode ? C.primary : C.textMuted }}><Clock size={15} /></div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>تنسيق التاريخ</span>
                        </div>
                        <div style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            {!isEditMode ? (
                                <div style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary, padding: '6px 0', direction: 'ltr', fontFamily: INTER }}>
                                    {generalForm.dateFormat}
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map(fmt => (
                                            <button key={fmt} type="button"
                                                onClick={() => setGeneralForm((p: any) => ({ ...p, dateFormat: fmt }))}
                                                style={{ height: '36px', padding: '0 14px', borderRadius: '10px', border: `1px solid ${generalForm.dateFormat === fmt ? `${C.primary}40` : C.border}`, background: generalForm.dateFormat === fmt ? `${C.primary}15` : 'transparent', color: generalForm.dateFormat === fmt ? C.primary : C.textSecondary, fontSize: '12px', fontWeight: 800, cursor: 'pointer', fontFamily: INTER, direction: 'ltr', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
                                                {generalForm.dateFormat === fmt && <Check size={14} />}
                                                {fmt}
                                            </button>
                                        ))}
                                    </div>
                                    <span style={{ fontSize: '11px', color: C.primary, fontFamily: INTER, direction: 'ltr', background: `${C.primary}10`, padding: '6px 12px', borderRadius: '8px', fontWeight: 700 }}>
                                        {{ 'DD/MM/YYYY': '15/03/2026', 'MM/DD/YYYY': '03/15/2026', 'YYYY-MM-DD': '2026-03-15' }[generalForm.dateFormat]}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

            </form>
        </div>
    );
}
