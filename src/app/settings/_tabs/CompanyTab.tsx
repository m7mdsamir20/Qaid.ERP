'use client';

import { C, CAIRO, BTN_DANGER } from '@/constants/theme';
import {
    Building2, Globe, Phone, Mail, MapPin, Percent, FileText, AlignRight,
    UploadCloud, Shield, Loader2, Trash2
} from 'lucide-react';
import { TabHeader } from './shared';

interface CompanyTabProps {
    isEditMode: boolean;
    setIsEditMode: (v: boolean) => void;
    companyForm: {
        name: string; nameEn: string; phone: string; email: string; address: string;
        taxNumber: string; commercialRegister: string; website: string; logo: string;
    };
    setCompanyForm: (updater: any) => void;
    isSaving: boolean;
    handleCancel: () => void;
    saveSettings: (action: string, data: any) => void;
    showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function CompanyTab({
    isEditMode, setIsEditMode, companyForm, setCompanyForm,
    isSaving, handleCancel, saveSettings, showToast
}: CompanyTabProps) {
    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '600px' }}>
            <TabHeader
                title="بيانات الشركة والمؤسسة"
                sub="الهوية المؤسسية، بيانات الاتصال، والبيانات القانونية"
                isEdit={isEditMode}
                onEdit={() => setIsEditMode(true)}
                onCancel={handleCancel}
                form="companyForm"
                isSaving={isSaving}
            />

            <form id="companyForm" onSubmit={e => { e.preventDefault(); saveSettings('update_company', companyForm); }}>
                {/* ══ الهوية المؤسسية ══ */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 900, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Building2 size={14} /> الهوية المؤسسية
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        {[
                            { label: 'اسم الشركة (عربي)', key: 'name', dir: 'rtl', icon: <FileText size={15} />, placeholder: 'أدخل الاسم بالعربية' },
                            { label: 'اسم الشركة (EN)', key: 'nameEn', dir: 'ltr', icon: <AlignRight size={15} />, placeholder: 'Enter name in English' },
                        ].map((f, i) => (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                                <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', color: C.textSecondary, borderLeft: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                    <div style={{ color: isEditMode ? C.primary : C.textMuted, flexShrink: 0 }}>{f.icon}</div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{f.label}</span>
                                </div>
                                <div style={{ flex: 1, padding: '0 20px' }}>
                                    {isEditMode ? (
                                        <input placeholder={f.placeholder} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: C.textPrimary, direction: 'rtl', textAlign: 'right', padding: '14px 0', boxSizing: 'border-box', fontWeight: 700, fontFamily: CAIRO }} value={(companyForm as any)[f.key]} onChange={e => setCompanyForm((p: any) => ({ ...p, [f.key]: e.target.value }))} />
                                    ) : (
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: (companyForm as any)[f.key] ? C.textPrimary : C.textMuted, direction: 'rtl', textAlign: 'right', padding: '14px 0', fontStyle: (companyForm as any)[f.key] ? 'normal' : 'italic', fontFamily: CAIRO }}>{(companyForm as any)[f.key] || 'لم يُضف بعد'}</div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Row 3: Logo */}
                        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '20px' }}>
                            <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', borderLeft: `1px solid ${C.border}` }}>
                                <div style={{ color: isEditMode ? C.primary : C.textMuted, flexShrink: 0 }}><UploadCloud size={15} /></div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>شعار المؤسسة</span>
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
                                            <span style={{ fontSize: '8px', color: C.textMuted, fontWeight: 700 }}>Logo</span>
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
                                                <UploadCloud size={16} /> رفع شعار
                                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                                                    const file = e.target.files?.[0]; if (!file) return;
                                                    const fd = new FormData(); fd.append('file', file);
                                                    try {
                                                        const r = await fetch('/api/upload', { method: 'POST', body: fd });
                                                        if (r.ok) {
                                                            const d = await r.json();
                                                            if (d.url) {
                                                                setCompanyForm((p: any) => ({ ...p, logo: d.url }));
                                                                showToast('تم رفع الشعار بنجاح ✓');
                                                            }
                                                        } else {
                                                            const d = await r.json().catch(() => ({ error: '' }));
                                                            // Fallback to Base64 if it's Vercel or any other write error
                                                            if (d.error?.includes('Vercel') || r.status === 403 || r.status === 500) {
                                                                const reader = new FileReader();
                                                                reader.onload = (event) => {
                                                                    const base64 = event.target?.result as string;
                                                                    if (base64.length > 800000) { // Approx 800KB limit for safe DB storage
                                                                        showToast('حجم الصورة كبير جداً للحفظ ككود، يرجى استخدام صورة أصغر أو رابط خارجي', 'error');
                                                                        return;
                                                                    }
                                                                    setCompanyForm((p: any) => ({ ...p, logo: base64 }));
                                                                    showToast('تم حفظ الشعار ككود (نظرًا لقيود الاستضافة) ✓');
                                                                };
                                                                reader.readAsDataURL(file);
                                                            } else {
                                                                showToast(d.error || 'فشل رفع الملف', 'error');
                                                            }
                                                        }
                                                    } catch (err) {
                                                        showToast('خطأ في الاتصال بالسيرفر', 'error');
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
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '10px', color: C.textMuted, fontFamily: CAIRO }}>أو ضع رابط الشعار المباشر هنا:</label>
                                            <input 
                                                value={companyForm.logo?.startsWith('data:') ? 'صورة محفوظة ككود (Base64)' : companyForm.logo}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === 'صورة محفوظة ككود (Base64)') return;
                                                    setCompanyForm((p: any) => ({ ...p, logo: val }));
                                                }}
                                                placeholder="https://example.com/logo.png"
                                                style={{ width: '100%', height: '32px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textPrimary, padding: '0 10px', fontSize: '11px', fontFamily: CAIRO, outline: 'none' }}
                                            />
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
                        <Globe size={14} /> بيانات الاتصال
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        {[
                            { label: 'رقم الهاتف', key: 'phone', dir: 'ltr', icon: <Phone size={15} />, placeholder: '+20 100 000 0000' },
                            { label: 'البريد الإلكتروني', key: 'email', dir: 'ltr', icon: <Mail size={15} />, placeholder: 'info@company.com' },
                            { label: 'العنوان', key: 'address', dir: 'rtl', icon: <MapPin size={15} />, placeholder: 'القاهرة، مصر' },
                            { label: 'الموقع الإلكتروني', key: 'website', dir: 'ltr', icon: <Globe size={15} />, placeholder: 'www.company.com' },
                        ].map((f, i, arr) => (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '0', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', color: C.textSecondary, borderLeft: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                    <div style={{ color: isEditMode ? C.primary : C.textMuted, flexShrink: 0 }}>{f.icon}</div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{f.label}</span>
                                </div>
                                <div style={{ flex: 1, padding: '0 20px' }}>
                                    {isEditMode ? (
                                        <input placeholder={f.placeholder} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: C.textPrimary, direction: 'rtl', textAlign: 'right', padding: '14px 0', boxSizing: 'border-box', fontWeight: 700, fontFamily: CAIRO }} value={(companyForm as any)[f.key]} onChange={e => setCompanyForm((p: any) => ({ ...p, [f.key]: e.target.value }))} />
                                    ) : (
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: (companyForm as any)[f.key] ? C.textPrimary : C.textMuted, direction: 'rtl', textAlign: 'right', padding: '14px 0', fontStyle: (companyForm as any)[f.key] ? 'normal' : 'italic', fontFamily: CAIRO }}>{(companyForm as any)[f.key] || 'لم يُضف بعد'}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ══ البيانات القانونية ══ */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 900, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Shield size={14} /> البيانات القانونية
                    </div>
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        {[
                            { label: 'الرقم الضريبي', key: 'taxNumber', dir: 'ltr', icon: <Percent size={15} />, placeholder: '000-000-000' },
                            { label: 'السجل التجاري', key: 'commercialRegister', dir: 'ltr', icon: <FileText size={15} />, placeholder: '000000' },
                        ].map((f, i, arr) => (
                            <div key={f.key} style={{ display: 'flex', alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', color: C.textSecondary, borderLeft: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                    <div style={{ color: isEditMode ? C.primary : C.textMuted, flexShrink: 0 }}>{f.icon}</div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{f.label}</span>
                                </div>
                                <div style={{ flex: 1, padding: '0 20px' }}>
                                    {isEditMode ? (
                                        <input placeholder={f.placeholder} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: C.textPrimary, direction: 'rtl', textAlign: 'right', padding: '14px 0', boxSizing: 'border-box', fontWeight: 700, fontFamily: CAIRO }} value={(companyForm as any)[f.key]} onChange={e => setCompanyForm((p: any) => ({ ...p, [f.key]: e.target.value }))} />
                                    ) : (
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: (companyForm as any)[f.key] ? C.textPrimary : C.textMuted, direction: 'rtl', textAlign: 'right', padding: '14px 0', fontStyle: (companyForm as any)[f.key] ? 'normal' : 'italic', fontFamily: CAIRO }}>{(companyForm as any)[f.key] || 'لم يُضف بعد'}</div>
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
