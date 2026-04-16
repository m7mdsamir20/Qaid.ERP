'use client';

import { useTranslation } from '@/lib/i18n';
import { BTN_DANGER, C, CAIRO } from '@/constants/theme';
import {
    AlignRight, Building2, FileText, Globe, Loader2, Mail, MapPin, Percent, Phone, Shield, Trash2,
    UploadCloud
} from 'lucide-react';
import { TabHeader } from './shared';
import { getCountryPlaceholders } from '@/lib/placeholders';
import { getAddressConfig } from '@/lib/addressConfig';

interface CompanyTabProps {
    countryCode: string;
    isEditMode: boolean;
    setIsEditMode: (v: boolean) => void;
    companyForm: {
        name: string; nameEn: string; phone: string; email: string;
        addressRegion: string; addressCity: string; addressDistrict: string; addressStreet: string;
        taxNumber: string; commercialRegister: string; website: string; logo: string;
    };
    setCompanyForm: (updater: any) => void;
    isSaving: boolean;
    handleCancel: () => void;
    saveSettings: (action: string, data: any) => void;
    showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function CompanyTab({
    countryCode, isEditMode, setIsEditMode, companyForm, setCompanyForm,
    isSaving, handleCancel, saveSettings, showToast
}: CompanyTabProps) {
    const { t } = useTranslation();
    const ph = getCountryPlaceholders(countryCode);
    const addrCfg = getAddressConfig(countryCode);

    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '600px' }}>
            <TabHeader
                title={t("بيانات الشركة والمؤسسة")}
                sub={t("الهوية المؤسسية، بيانات الاتصال، والبيانات القانونية")}
                isEdit={isEditMode}
                onEdit={() => setIsEditMode(true)}
                onCancel={handleCancel}
                form="companyForm"
                isSaving={isSaving}
                t={t}
            />

            <form id="companyForm" onSubmit={e => { e.preventDefault(); saveSettings('update_company', companyForm); }}>
                {/* ══ الهوية المؤسسية ══ */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 900, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Building2 size={14} /> {t('الهوية المؤسسية')}
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        {[
                            { label: t('اسم الشركة (عربي)'), key: 'name', dir: 'rtl', icon: <FileText size={15} />, placeholder: t('أدخل الاسم بالعربية') },
                            { label: t('اسم الشركة (EN)'), key: 'nameEn', dir: 'ltr', icon: <AlignRight size={15} />, placeholder: t('Enter name in English') },
                        ].map((f, i) => (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                                <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', color: C.textSecondary, borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                    <div style={{ color: isEditMode ? C.primary : C.textMuted, flexShrink: 0 }}>{f.icon}</div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{f.label}</span>
                                </div>
                                <div style={{ flex: 1, padding: '0 20px' }}>
                                    {isEditMode ? (
                                        <input placeholder={f.placeholder} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: C.textPrimary, direction: 'inherit', textAlign: 'start', padding: '14px 0', boxSizing: 'border-box', fontWeight: 700, fontFamily: CAIRO }} value={(companyForm as any)[f.key]} onChange={e => setCompanyForm((p: any) => ({ ...p, [f.key]: e.target.value }))} />
                                    ) : (
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: (companyForm as any)[f.key] ? C.textPrimary : C.textMuted, direction: 'inherit', textAlign: 'start', padding: '14px 0', fontStyle: (companyForm as any)[f.key] ? 'normal' : 'italic', fontFamily: CAIRO }}>{(companyForm as any)[f.key] || t('لم يُضف بعد')}</div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Row 3: Logo */}
                        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '20px' }}>
                            <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', borderInlineStart: `1px solid ${C.border}` }}>
                                <div style={{ color: isEditMode ? C.primary : C.textMuted, flexShrink: 0 }}><UploadCloud size={15} /></div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('شعار المؤسسة')}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '14px',
                                    border: `1.5px solid ${C.border}`, background: 'rgba(0,0,0,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.6)',
                                    position: 'relative'
                                }}>
                                    {(() => {
                                        if (!companyForm.logo) return null;
                                        // Fix any corrupted symbols from aggressive sanitization
                                        const cleanLogo = companyForm.logo
                                            .replace(/&#x2F;/g, '/')
                                            .replace(/&amp;/g, '&')
                                            .replace(/&quot;/g, '"')
                                            .replace(/&#x27;/g, "'");

                                        const finalSrc = cleanLogo.startsWith('http') || cleanLogo.startsWith('data:')
                                            ? cleanLogo
                                            : '/' + cleanLogo.replace(/^\/+/, '');

                                        return (
                                            <img
                                                src={finalSrc}
                                                alt="Logo"
                                                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }}
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                }}
                                                onLoad={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'block';
                                                }}
                                            />
                                        );
                                    })()}
                                    {!companyForm.logo && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.2 }}>
                                            <Building2 size={24} style={{ color: C.textMuted }} />
                                            <span style={{ fontSize: '8px', color: C.textMuted, fontWeight: 700 }}>{t('الشعار')}</span>
                                        </div>
                                    )}
                                    {isSaving && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite', color: C.primary }} />
                                        </div>
                                    )}
                                </div>
                                {isEditMode && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <label style={{
                                                height: '38px', padding: '0 20px', borderRadius: '12px',
                                                border: `1px solid ${C.primary}50`, background: `${C.primary}15`,
                                                color: C.primary, fontSize: '13px', fontWeight: 800, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO,
                                                transition: 'all 0.2s', boxShadow: `0 4px 12px ${C.primary}10`
                                            }}>
                                                <UploadCloud size={16} /> {t('رفع شعار')}
                                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                                                    const file = e.target.files?.[0]; if (!file) return;
                                                    const fd = new FormData(); fd.append('file', file);
                                                    try {
                                                        const r = await fetch('/api/upload', { method: 'POST', body: fd });
                                                        if (r.ok) {
                                                            const d = await r.json();
                                                            if (d.url) {
                                                                setCompanyForm((p: any) => ({ ...p, logo: d.url }));
                                                                showToast(t('تم رفع الشعار بنجاح ✓'));
                                                            }
                                                        } else {
                                                            const d = await r.json().catch(() => ({ error: '' }));
                                                            // Fallback to Base64 if it's Vercel or any other write error
                                                            if (d.error?.includes('Vercel') || r.status === 403 || r.status === 500) {
                                                                const reader = new FileReader();
                                                                reader.onload = (event) => {
                                                                    const base64 = event.target?.result as string;
                                                                    if (base64.length > 800000) { // Approx 800KB limit for safe DB storage
                                                                        showToast(t('حجم الصورة كبير جداً للحفظ ككود، يرجى استخدام صورة أصغر أو رابط خارجي'), 'error');
                                                                        return;
                                                                    }
                                                                    setCompanyForm((p: any) => ({ ...p, logo: base64 }));
                                                                    showToast(t('تم حفظ الشعار ككود (نظرًا لقيود الاستضافة) ✓'));
                                                                };
                                                                reader.readAsDataURL(file);
                                                            } else {
                                                                showToast(d.error || t('فشل رفع الملف'), 'error');
                                                            }
                                                        }
                                                    } catch (err) {
                                                        showToast(t('خطأ في الاتصال بالسيرفر'), 'error');
                                                    }
                                                }} />
                                            </label>
                                            {companyForm.logo && (
                                                <button type="button" onClick={() => setCompanyForm((p: any) => ({ ...p, logo: '' }))}
                                                    style={{
                                                        height: '38px', width: '38px', borderRadius: '12px',
                                                        border: `1px solid ${C.danger}50`, background: `${C.danger}15`,
                                                        color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = `${C.danger}25`}
                                                    onMouseLeave={e => e.currentTarget.style.background = `${C.danger}15`}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══ بيانات الاتصال ══ */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 900, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Globe size={14} /> {t('بيانات الاتصال')}
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        {[
                            { label: t('رقم الهاتف'), key: 'phone', dir: 'ltr', icon: <Phone size={15} />, placeholder: ph.phone },
                            { label: t('البريد الإلكتروني'), key: 'email', dir: 'ltr', icon: <Mail size={15} />, placeholder: 'info@company.com' },
                            { label: t('الموقع الإلكتروني'), key: 'website', dir: 'ltr', icon: <Globe size={15} />, placeholder: 'www.company.com' },
                        ].map((f, i, arr) => (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '0', borderBottom: `1px solid ${C.border}` }}>
                                <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', color: C.textSecondary, borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                    <div style={{ color: isEditMode ? C.primary : C.textMuted, flexShrink: 0 }}>{f.icon}</div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{f.label}</span>
                                </div>
                                <div style={{ flex: 1, padding: '0 20px' }}>
                                    {isEditMode ? (
                                        <input placeholder={f.placeholder} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: C.textPrimary, direction: f.dir as any, textAlign: 'start', padding: '14px 0', boxSizing: 'border-box', fontWeight: 700, fontFamily: CAIRO }} value={(companyForm as any)[f.key]} onChange={e => setCompanyForm((p: any) => ({ ...p, [f.key]: e.target.value }))} />
                                    ) : (
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: (companyForm as any)[f.key] ? C.textPrimary : C.textMuted, direction: f.dir as any, textAlign: 'start', padding: '14px 0', fontStyle: (companyForm as any)[f.key] ? 'normal' : 'italic', fontFamily: CAIRO }}>{(companyForm as any)[f.key] || t('لم يُضف بعد')}</div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* العنوان — 4 خانات */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', borderBottom: 'none' }}>
                            <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                <div style={{ color: isEditMode ? C.primary : C.textMuted, flexShrink: 0 }}><MapPin size={15} /></div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('العنوان')}</span>
                            </div>
                            <div style={{ flex: 1, padding: '12px 20px' }}>
                                {isEditMode ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {[
                                            { key: 'addressRegion',   label: addrCfg.labels[0], ph: addrCfg.placeholders[0] },
                                            { key: 'addressCity',     label: addrCfg.labels[1], ph: addrCfg.placeholders[1] },
                                            { key: 'addressDistrict', label: addrCfg.labels[2], ph: addrCfg.placeholders[2] },
                                            { key: 'addressStreet',   label: addrCfg.labels[3], ph: addrCfg.placeholders[3] },
                                        ].map(f => (
                                            <div key={f.key}>
                                                <div style={{ fontSize: '10px', color: C.textMuted, marginBottom: '3px', fontFamily: CAIRO }}>{f.label}</div>
                                                <input
                                                    value={(companyForm as any)[f.key] || ''}
                                                    onChange={e => setCompanyForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                                                    placeholder={f.ph}
                                                    style={{ width: '100%', height: '36px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.2)', color: C.textPrimary, padding: '0 10px', fontSize: '13px', fontFamily: CAIRO, outline: 'none', boxSizing: 'border-box' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        {[companyForm.addressRegion, companyForm.addressCity, companyForm.addressDistrict, companyForm.addressStreet].filter(Boolean).length > 0
                                            ? [companyForm.addressRegion, companyForm.addressCity, companyForm.addressDistrict, companyForm.addressStreet].filter(Boolean).map((line, i) => (
                                                <div key={i} style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{line}</div>
                                            ))
                                            : <span style={{ fontSize: '14px', color: C.textMuted, fontStyle: 'italic', fontFamily: CAIRO }}>{t('لم يُضف بعد')}</span>
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══ البيانات القانونية ══ */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 900, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Shield size={14} /> {t('البيانات القانونية')}
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        {[
                            { label: t('الرقم الضريبي'), key: 'taxNumber', dir: 'ltr', icon: <Percent size={15} />, placeholder: ph.taxNumber },
                            { label: t('السجل التجاري'), key: 'commercialRegister', dir: 'ltr', icon: <FileText size={15} />, placeholder: ph.cr },
                        ].map((f, i, arr) => (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', color: C.textSecondary, borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                    <div style={{ color: isEditMode ? C.primary : C.textMuted, flexShrink: 0 }}>{f.icon}</div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{f.label}</span>
                                </div>
                                <div style={{ flex: 1, padding: '0 20px' }}>
                                    {isEditMode ? (
                                        <input placeholder={f.placeholder} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: C.textPrimary, direction: 'inherit', textAlign: 'start', padding: '14px 0', boxSizing: 'border-box', fontWeight: 700, fontFamily: CAIRO }} value={(companyForm as any)[f.key]} onChange={e => setCompanyForm((p: any) => ({ ...p, [f.key]: e.target.value }))} />
                                    ) : (
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: (companyForm as any)[f.key] ? C.textPrimary : C.textMuted, direction: 'inherit', textAlign: 'start', padding: '14px 0', fontStyle: (companyForm as any)[f.key] ? 'normal' : 'italic', fontFamily: CAIRO }}>{(companyForm as any)[f.key] || t('لم يُضف بعد')}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </form>
        </div>
    );
}
