'use client';
 
import { useTranslation } from '@/lib/i18n';
import { useState } from 'react';
import { C, CAIRO, INTER } from '@/constants/theme';
import { Globe, Coins, Calendar, Clock, ChevronDown, Check, Search, MapPin } from 'lucide-react';
import { TabHeader } from './shared';

interface GeneralTabProps {
    isEditMode: boolean;
    setIsEditMode: (v: boolean) => void;
    generalForm: {
        currency: string; timezone: string; calendarType: string; dateFormat: string; customCurrency: string; countryCode: string;
    };
    setGeneralForm: (updater: any) => void;
    savedGeneral: {
        currency: string; timezone: string; calendarType: string; dateFormat: string; customCurrency: string; countryCode: string;
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
    const { t } = useTranslation();
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const currencyOptions: Record<string, string> = {
        EGP: t('الجنيه المصري (EGP)'),
        SAR: t('الريال السعودي (SAR)'),
        AED: t('الدرهم الإماراتي (AED)'),
        USD: t('الدولار الأمريكي (USD)'),
        KWD: t('الدينار الكويتي (KWD)'),
        QAR: t('الريال القطري (QAR)'),
        BHD: t('الدينار البحريني (BHD)'),
        OMR: t('الريال العماني (OMR)'),
        JOD: t('الدينار الأردني (JOD)'),
        LYD: t('الدينار الليبي (LYD)'),
        IQD: t('الدينار العراقي (IQD)'),
        TRY: t('الليرة التركية (TRY)'),
        EUR: t('اليورو (EUR)'),
        GBP: t('الجنيه الإسترليني (GBP)'),
        LBP: t('الليرة اللبنانية (LBP)'),
        SYP: t('الليرة السورية (SYP)'),
        YER: t('الريال اليمني (YER)'),
        TND: t('الدينار التونسي (TND)'),
        DZD: t('الدينار الجزائري (DZD)'),
        MAD: t('الدرهم المغربي (MAD)'),
        SDG: t('الجنيه السوداني (SDG)'),
        OTHER: t('أخرى (من اختيارك)')
    };

    const COUNTRY_OPTIONS = [
        { code: 'EG', name: t('مصر'), flag: '🇪🇬', currency: 'EGP', timezone: 'Africa/Cairo' },
        { code: 'SA', name: t('السعودية'), flag: '🇸🇦', currency: 'SAR', timezone: 'Asia/Riyadh' },
        { code: 'AE', name: t('الإمارات'), flag: '🇦🇪', currency: 'AED', timezone: 'Asia/Dubai' },
        { code: 'KW', name: t('الكويت'), flag: '🇰🇼', currency: 'KWD', timezone: 'Asia/Kuwait' },
        { code: 'QA', name: t('قطر'), flag: '🇶🇦', currency: 'QAR', timezone: 'Asia/Qatar' },
        { code: 'BH', name: t('البحرين'), flag: '🇧🇭', currency: 'BHD', timezone: 'Asia/Bahrain' },
        { code: 'OM', name: t('عمان'), flag: '🇴🇲', currency: 'OMR', timezone: 'Asia/Muscat' },
        { code: 'JO', name: t('الأردن'), flag: '🇯🇴', currency: 'JOD', timezone: 'Asia/Amman' },
        { code: 'IQ', name: t('العراق'), flag: '🇮🇶', currency: 'IQD', timezone: 'Asia/Baghdad' },
        { code: 'LY', name: t('ليبيا'), flag: '🇱🇾', currency: 'LYD', timezone: 'Africa/Tripoli' },
        { code: 'SD', name: t('السودان'), flag: '🇸🇩', currency: 'SDG', timezone: 'Africa/Khartoum' },
        { code: 'LB', name: t('لبنان'), flag: '🇱🇧', currency: 'LBP', timezone: 'Asia/Beirut' },
        { code: 'SY', name: t('سوريا'), flag: '🇸🇾', currency: 'SYP', timezone: 'Asia/Damascus' },
        { code: 'YE', name: t('اليمن'), flag: '🇾🇪', currency: 'YER', timezone: 'Asia/Aden' },
        { code: 'TN', name: t('تونس'), flag: '🇹🇳', currency: 'TND', timezone: 'Africa/Tunis' },
        { code: 'DZ', name: t('الجزائر'), flag: '🇩🇿', currency: 'DZD', timezone: 'Africa/Algiers' },
        { code: 'MA', name: t('المغرب'), flag: '🇲🇦', currency: 'MAD', timezone: 'Africa/Casablanca' },
    ];

    const selectedCountry = COUNTRY_OPTIONS.find(c => c.code === generalForm.countryCode) || COUNTRY_OPTIONS[0];

    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '600px' }}>
            <TabHeader
                title={t("الإعدادات العامة")}
                sub={t("العملة والمنطقة الزمنية وتنسيق التاريخ")}
                isEdit={isEditMode}
                onEdit={() => setIsEditMode(true)}
                onCancel={handleCancel}
                onSave={() => {
                    const finalCurrency = generalForm.currency === 'OTHER' ? generalForm.customCurrency : generalForm.currency;
                    saveSettings('update_general', { ...generalForm, currency: finalCurrency });
                }}
                isSaving={isSaving}
                t={t}
            />

            <form onSubmit={e => {
                e.preventDefault();
                const finalCurrency = generalForm.currency === 'OTHER' ? generalForm.customCurrency : generalForm.currency;
                saveSettings('update_general', { ...generalForm, currency: finalCurrency });
            }}>

                <div style={{ fontSize: '12px', fontWeight: 900, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Globe size={14} /> {t('إعدادات النظام')}
                </div>

                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)', marginBottom: '24px' }}>

                    {/* ── الدولة ── */}
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ color: isEditMode ? C.primary : C.textMuted }}><MapPin size={15} /></div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('الدولة')}</span>
                        </div>
                        <div style={{ flex: 1, padding: '12px 20px', position: 'relative' }} className="custom-dropdown">
                            {!isEditMode ? (
                                <div style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary, padding: '6px 0', fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '18px' }}>{selectedCountry.flag}</span>
                                    {selectedCountry.name}
                                </div>
                            ) : (
                                <>
                                    <button type="button"
                                        onClick={() => setOpenDropdown(openDropdown === 'country' ? null : 'country')}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '280px', height: '40px', padding: '0 16px', borderRadius: '10px', border: `1px solid ${C.primary}40`, background: `${C.primary}10`, color: C.textPrimary, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                        <ChevronDown size={16} style={{ color: C.primary, transform: openDropdown === 'country' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '16px' }}>{selectedCountry.flag}</span>
                                            {selectedCountry.name}
                                        </span>
                                    </button>
                                    {openDropdown === 'country' && (
                                        <div style={{ position: 'absolute', top: '44px', insetInlineEnd: 20, zIndex: 999, width: '280px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                            <div style={{ maxHeight: '220px', overflowY: 'auto' }} className="custom-scrollbar">
                                                {COUNTRY_OPTIONS.map((opt, i, arr) => {
                                                    const selected = generalForm.countryCode === opt.code;
                                                    return (
                                                        <button key={opt.code} type="button"
                                                            onClick={() => {
                                                                setGeneralForm((p: any) => ({
                                                                    ...p,
                                                                    countryCode: opt.code,
                                                                    currency: opt.currency,
                                                                    timezone: opt.timezone
                                                                }));
                                                                setOpenDropdown(null);
                                                            }}
                                                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', border: 'none', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none', background: selected ? `${C.primary}15` : 'transparent', color: selected ? C.primary : C.textSecondary, fontSize: '13px', fontWeight: selected ? 800 : 600, cursor: 'pointer', textAlign: 'start', fontFamily: CAIRO }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <span style={{ fontSize: '16px' }}>{opt.flag}</span>
                                                                <span>{opt.name}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{ fontSize: '10px', color: C.textMuted, fontFamily: INTER }}>{opt.code}</span>
                                                                {selected && <Check size={14} style={{ color: C.primary }} />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '6px', fontFamily: CAIRO }}>
                                        {t('تغيير الدولة سيغيّر العملة والمنطقة الزمنية تلقائياً')}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── العملة ── */}
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ color: isEditMode ? C.primary : C.textMuted }}><Coins size={15} /></div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('العملة الأساسية')}</span>
                        </div>
                        <div style={{ flex: 1, padding: '12px 20px', position: 'relative' }} className="custom-dropdown">
                            {!isEditMode ? (
                                <div style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary, padding: '6px 0', fontFamily: CAIRO }}>
                                    {currencyOptions[generalForm.currency] || `${t('أخرى')} (${generalForm.currency})`}
                                </div>
                            ) : (
                                <>
                                    <button type="button"
                                        onClick={() => setOpenDropdown(openDropdown === 'currency' ? null : 'currency')}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '280px', height: '40px', padding: '0 16px', borderRadius: '10px', border: `1px solid ${C.primary}40`, background: `${C.primary}10`, color: C.textPrimary, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                        <ChevronDown size={16} style={{ color: C.primary, transform: openDropdown === 'currency' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                        <span>{currencyOptions[generalForm.currency] || `${t('أخرى')} (${generalForm.currency})`}</span>
                                    </button>
                                    {openDropdown === 'currency' && (
                                        <div style={{ position: 'absolute', top: '44px', insetInlineEnd: 20, zIndex: 999, width: '280px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                            {/* Search Box */}
                                            <div style={{ padding: '8px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <Search size={14} style={{ position: 'absolute', insetInlineEnd: '10px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
                                                    <input
                                                        autoFocus
                                                        placeholder={t("بحث عن عملة...")}
                                                        value={currencySearch}
                                                        onChange={e => setCurrencySearch(e.target.value)}
                                                        style={{ width: '100%', height: '34px', padding: '0 32px 0 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.2)', color: C.textPrimary, fontSize: '12px', outline: 'none', fontFamily: CAIRO }}
                                                    />
                                                </div>
                                            </div>
                                            {/* List */}
                                            <div style={{ maxHeight: '160px', overflowY: 'auto' }} className="custom-scrollbar">
                                                {[
                                                    { value: 'EGP', label: t('الجنيه المصري'), code: 'EGP' },
                                                    { value: 'SAR', label: t('الريال السعودي'), code: 'SAR' },
                                                    { value: 'AED', label: t('الدرهم الإماراتي'), code: 'AED' },
                                                    { value: 'KWD', label: t('الدينار الكويتي'), code: 'KWD' },
                                                    { value: 'USD', label: t('الدولار الأمريكي'), code: 'USD' },
                                                    { value: 'QAR', label: t('الريال القطري'), code: 'QAR' },
                                                    { value: 'BHD', label: t('الدينار البحريني'), code: 'BHD' },
                                                    { value: 'OMR', label: t('الريال العماني'), code: 'OMR' },
                                                    { value: 'JOD', label: t('الدينار الأردني'), code: 'JOD' },
                                                    { value: 'LYD', label: t('الدينار الليبي'), code: 'LYD' },
                                                    { value: 'IQD', label: t('الدينار العراقي'), code: 'IQD' },
                                                    { value: 'TRY', label: t('الليرة التركية'), code: 'TRY' },
                                                    { value: 'EUR', label: t('اليورو'), code: 'EUR' },
                                                    { value: 'GBP', label: t('الجنيه الإسترليني'), code: 'GBP' },
                                                    { value: 'LBP', label: t('الليرة اللبنانية'), code: 'LBP' },
                                                    { value: 'SYP', label: t('الليرة السورية'), code: 'SYP' },
                                                    { value: 'YER', label: t('الريال اليمني'), code: 'YER' },
                                                    { value: 'TND', label: t('الدينار التونسي'), code: 'TND' },
                                                    { value: 'DZD', label: t('الدينار الجزائري'), code: 'DZD' },
                                                    { value: 'MAD', label: t('الدرهم المغربي'), code: 'MAD' },
                                                    { value: 'SDG', label: t('الجنيه السوداني'), code: 'SDG' },
                                                    { value: 'OTHER', label: t('عملة أخرى (كتابة يدوية)'), code: '???' },
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
                                                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', border: 'none', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none', background: selected ? `${C.primary}15` : 'transparent', color: selected ? C.primary : C.textSecondary, fontSize: '13px', fontWeight: selected ? 800 : 600, cursor: 'pointer', textAlign: 'start', fontFamily: CAIRO }}>
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
                                                placeholder={t("اكتب كود العملة هنا (مثال: KWD)")}
                                                style={{ width: '280px', height: '40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.2)', color: C.textPrimary, padding: '0 16px', fontSize: '13px', fontWeight: 600, direction: 'ltr', textAlign: 'end', outline: 'none' }}
                                                value={generalForm.customCurrency}
                                                onChange={e => setGeneralForm((p: any) => ({ ...p, customCurrency: e.target.value.toUpperCase() }))}
                                            />
                                            <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '6px', fontFamily: CAIRO }}>{t('يتم استخدام هذا الكود في النظام بالكامل')}</div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── المنطقة الزمنية ── */}
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ color: isEditMode ? C.primary : C.textMuted }}><Globe size={15} /></div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('المنطقة الزمنية')}</span>
                        </div>
                        <div style={{ flex: 1, padding: '12px 20px', position: 'relative' }} className="custom-dropdown">
                            {!isEditMode ? (
                                <div style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary, padding: '6px 0', direction: 'ltr', textAlign: 'start', fontFamily: INTER }}>
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
                                        <div style={{ position: 'absolute', top: '44px', insetInlineEnd: 20, zIndex: 999, width: '280px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                            <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="custom-scrollbar">
                                                {['Africa/Cairo', 'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Bahrain', 'Asia/Muscat', 'Asia/Amman', 'Africa/Tripoli', 'Asia/Baghdad', 'Asia/Beirut', 'Asia/Damascus', 'Asia/Aden', 'Africa/Tunis', 'Africa/Algiers', 'Africa/Casablanca', 'Africa/Khartoum', 'Europe/Istanbul', 'Europe/London'].map((tz, i, arr) => {
                                                    const selected = generalForm.timezone === tz;
                                                    return (
                                                        <button key={tz} type="button"
                                                            onClick={() => { setGeneralForm((p: any) => ({ ...p, timezone: tz })); setOpenDropdown(null); }}
                                                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: 'none', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none', background: selected ? `${C.primary}15` : 'transparent', color: selected ? C.primary : C.textSecondary, fontSize: '13px', fontWeight: selected ? 800 : 600, cursor: 'pointer', direction: 'ltr', textAlign: 'end', fontFamily: INTER }}>
                                                            <Check size={14} style={{ color: C.primary, opacity: selected ? 1 : 0 }} />
                                                            <span>{tz}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── نوع التقويم ── */}
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ color: isEditMode ? C.primary : C.textMuted }}><Calendar size={15} /></div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('نوع التقويم')}</span>
                        </div>
                        <div style={{ flex: 1, padding: '12px 20px' }}>
                            {!isEditMode ? (
                                <div style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary, padding: '6px 0', fontFamily: CAIRO }}>
                                    {generalForm.calendarType === 'Gregorian' ? t('ميلادي') : t('هجري')}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {[{ v: 'Gregorian', l: t('ميلادي') }, { v: 'Hijri', l: t('هجري') }].map(opt => (
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
                        <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ color: isEditMode ? C.primary : C.textMuted }}><Clock size={15} /></div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('تنسيق التاريخ')}</span>
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
