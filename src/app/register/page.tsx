'use client';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ChevronDown, Search, Sun, Moon } from 'lucide-react';
import { C, CAIRO, IS, LS, focusIn, focusOut } from '@/constants/theme';
import { getCountryPlaceholders } from '@/lib/placeholders';
import { useTheme } from '@/components/Providers';

const COUNTRIES = [
    { code: 'EG', dial: '+20', name: 'مصر', flag: '🇪🇬', currency: 'EGP', timezone: 'Africa/Cairo' },
    { code: 'SA', dial: '+966', name: 'السعودية', flag: '🇸🇦', currency: 'SAR', timezone: 'Asia/Riyadh' },
    { code: 'AE', dial: '+971', name: 'الإمارات', flag: '🇦🇪', currency: 'AED', timezone: 'Asia/Dubai' },
    { code: 'KW', dial: '+965', name: 'الكويت', flag: '🇰🇼', currency: 'KWD', timezone: 'Asia/Kuwait' },
    { code: 'QA', dial: '+974', name: 'قطر', flag: '🇶🇦', currency: 'QAR', timezone: 'Asia/Qatar' },
    { code: 'BH', dial: '+973', name: 'البحرين', flag: '🇧🇭', currency: 'BHD', timezone: 'Asia/Bahrain' },
    { code: 'OM', dial: '+968', name: 'عُمان', flag: '🇴🇲', currency: 'OMR', timezone: 'Asia/Muscat' },
    { code: 'JO', dial: '+962', name: 'الأردن', flag: '🇯🇴', currency: 'JOD', timezone: 'Asia/Amman' },
    { code: 'LB', dial: '+961', name: 'لبنان', flag: '🇱🇧', currency: 'LBP', timezone: 'Asia/Beirut' },
    { code: 'IQ', dial: '+964', name: 'العراق', flag: '🇮🇶', currency: 'IQD', timezone: 'Asia/Baghdad' },
    { code: 'SY', dial: '+963', name: 'سوريا', flag: '🇸🇾', currency: 'SYP', timezone: 'Asia/Damascus' },
    { code: 'YE', dial: '+967', name: 'اليمن', flag: '🇾🇪', currency: 'YER', timezone: 'Asia/Aden' },
    { code: 'LY', dial: '+218', name: 'ليبيا', flag: '🇱🇾', currency: 'LYD', timezone: 'Africa/Tripoli' },
    { code: 'TN', dial: '+216', name: 'تونس', flag: '🇹🇳', currency: 'TND', timezone: 'Africa/Tunis' },
    { code: 'DZ', dial: '+213', name: 'الجزائر', flag: '🇩🇿', currency: 'DZD', timezone: 'Africa/Algiers' },
    { code: 'MA', dial: '+212', name: 'المغرب', flag: '🇲🇦', currency: 'MAD', timezone: 'Africa/Casablanca' },
    { code: 'SD', dial: '+249', name: 'السودان', flag: '🇸🇩', currency: 'SDG', timezone: 'Africa/Khartoum' },
];

const BUSINESS_TYPES = (t: any) => [
    { value: "TRADING", label: t('نشاط تجاري (جملة وتجزئة)') },
    { value: "SERVICES", label: t('نشاط خدمات (استشارات، صيانة، إلخ)') },
];

export default function RegisterPage() {
    const { lang, t, toggleLang } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [form, setForm] = useState({
        name: '', username: '', phone: '', email: '', companyName: '', password: '', confirmPassword: '', businessType: ''
    });

    useEffect(() => { setMounted(true); }, []);
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
    const [showCountries, setShowCountries] = useState(false);
    const [showBusinessTypes, setShowBusinessTypes] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const businessTypeRef = useRef<HTMLDivElement>(null);

    const filteredCountries = COUNTRIES.filter(c => t(c.name).includes(countrySearch) || c.dial.includes(countrySearch));

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowCountries(false);
            if (businessTypeRef.current && !businessTypeRef.current.contains(e.target as Node)) setShowBusinessTypes(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        if (form.password !== form.confirmPassword) {
            setError(t('كلمتا المرور غير متطابقتين، يرجى التأكد'));
            setLoading(false);
            return;
        }
        try {
            const fullPhone = `${selectedCountry.dial}${form.phone}`;
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, phone: fullPhone, countryCode: selectedCountry.code, currency: selectedCountry.currency, timezone: selectedCountry.timezone }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); setLoading(false); return; }
            try {
                await fetch('/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email }) });
            } catch (otpErr) { console.error("OTP error:", otpErr); }
            router.push(`/verify?email=${encodeURIComponent(form.email)}`);
        } catch { setError(t('حدث خطأ، حاول مرة أخرى')); setLoading(false); }
    };

    const F = (label: string, name: string, placeholder: string, type = 'text') => (
        <div>
            <label style={LS}>{label}</label>
            <input id={name} name={name} type={type} required value={(form as any)[name]} onChange={e => setForm({ ...form, [name]: e.target.value })} placeholder={placeholder}
                style={{ ...IS, height: '50px', textAlign: 'start', direction: isRtl ? 'rtl' : 'ltr' }}
                onFocus={focusIn} onBlur={focusOut} spellCheck={false} autoComplete={name} />
        </div>
    );

    const BRAND_NAME = t('قيد المطور');
    const BRAND_LOGO = mounted ? (theme === 'light' ? '/logo-light.png?v=3' : '/logo-system.png?v=3') : null;

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CAIRO, padding: '20px', position: 'relative' }}>
            {/* Modern Minimal Background */}
            <div style={{ position: 'fixed', inset: 0, background: theme === 'dark' ? 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)' : 'radial-gradient(circle at center, #f8fafc 0%, #f1f5f9 100%)', zIndex: 0 }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', background: `radial-gradient(circle, ${C.primary}05 0%, transparent 70%)`, pointerEvents: 'none', opacity: theme === 'dark' ? 1 : 0.5 }} />
            </div>

            <div style={{ position: 'absolute', top: '24px', insetInlineEnd: '24px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
                <button onClick={() => toggleLang()} style={{ height: '36px', padding: '0 12px', borderRadius: '10px', border: `1px solid ${C.primary}30`, background: `${C.primary}10`, color: C.primary, cursor: 'pointer', transition: 'all 0.2s', fontSize: '13px', fontWeight: 900, fontFamily: lang === 'ar' ? 'sans-serif' : CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {lang === 'ar' ? 'EN' : 'ع'}
                </button>
                <button onClick={toggleTheme} title={theme === 'dark' ? t('تفعيل الوضع الفاتح') : t('تفعيل الوضع الداكن')} style={{ width: '36px', height: '36px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>

            <div style={{ width: '100%', maxWidth: '480px', position: 'relative', zIndex: 1, animation: 'cardAppear 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    {BRAND_LOGO ? <img src={BRAND_LOGO} alt={BRAND_NAME} style={{ display: 'block', margin: '0 auto 12px', width: '100%', maxWidth: '200px', height: 'auto', objectFit: 'contain', filter: theme === 'dark' ? 'drop-shadow(0 0 20px rgba(37,106,244,0.3))' : 'none' }} /> : <div style={{ height: '50px' }} />}
                    <p style={{ marginTop: '12px', color: C.textSecondary, fontSize: '14px', fontWeight: 500, opacity: 0.8 }}>{t('إنشاء حساب جديد')}</p>
                </div>

                <div style={{ background: theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)', border: `1px solid ${C.border}`, boxShadow: theme === 'dark' ? '0 25px 50px -12px rgba(0,0,0,0.5)' : '0 10px 25px -5px rgba(0,0,0,0.05)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '24px', padding: '32px' }}>
                    <h2 style={{ margin: '0 0 20px', fontSize: '22px', fontWeight: 900, color: C.textPrimary, textAlign: 'center' }}>{t('إنشاء الحساب')}</h2>
                    {error && <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: C.danger, fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>{error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {F(t('الاسم الكامل'), 'name', t('محمد أحمد'))}
                            {F(t('اسم المستخدم'), 'username', 'mohamed123')}
                        </div>

                        <div>
                            <label style={LS}>{t('رقم الهاتف')}</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                                    <button type="button" onClick={() => setShowCountries(!showCountries)} style={{ height: '50px', padding: '0 12px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textPrimary, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', fontFamily: CAIRO, transition: 'all 0.2s', fontWeight: 500 }}>
                                        <img src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`} alt={t(selectedCountry.name)} style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 3 }} />
                                        <span style={{ fontSize: '12px', direction: 'ltr', color: C.textSecondary, fontWeight: 700 }}>{selectedCountry.dial}</span>
                                        <ChevronDown size={14} color={C.textMuted} style={{ transform: showCountries ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                    </button>
                                    {showCountries && (
                                        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', insetInlineEnd: 0, width: '240px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', zIndex: 1000, overflow: 'hidden', animation: 'fadeDown 0.2s ease' }}>
                                            <div style={{ padding: '10px', borderBottom: `1px solid ${C.border}` }}>
                                                <input placeholder={t("ابحث...") || 'Search...'} value={countrySearch} onChange={e => setCountrySearch(e.target.value)} style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textPrimary, fontSize: '12px', outline: 'none', fontFamily: CAIRO, boxSizing: 'border-box' }} autoFocus />
                                            </div>
                                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {filteredCountries.map(c => (
                                                    <button key={c.code} type="button" onClick={() => { setSelectedCountry(c); setShowCountries(false); setCountrySearch(''); }} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', cursor: 'pointer', transition: '0.15s', textAlign: 'start', color: C.textSecondary }}>
                                                        <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} alt={t(c.name)} style={{ width: 20, height: 14 }} />
                                                        <span style={{ fontSize: '13px', flex: 1 }}>{t(c.name)}</span>
                                                        <span style={{ fontSize: '12px', opacity: 0.6 }}>{c.dial}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <input id="phone" name="phone" type="tel" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} placeholder={getCountryPlaceholders(selectedCountry.code).phone} style={{ ...IS, height: '50px', flex: 1, direction: isRtl ? 'rtl' : 'ltr', textAlign: 'start' }} onFocus={focusIn} onBlur={focusOut} spellCheck={false} autoComplete="tel" />
                            </div>
                        </div>

                        {F(t('البريد الإلكتروني'), 'email', 'email@example.com', 'email')}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {F(t('اسم الشركة'), 'companyName', t('شركة الحلول'))}
                            <div>
                                <label style={LS}>{t('نوع النشاط')}</label>
                                <div ref={businessTypeRef} style={{ position: 'relative' }}>
                                    <button type="button" onClick={() => setShowBusinessTypes(!showBusinessTypes)} style={{ width: '100%', height: '50px', padding: '0 14px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textPrimary, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: CAIRO, transition: 'all 0.2s' }}>
                                        <span style={{ flex: 1, textAlign: 'start', opacity: form.businessType ? 1 : 0.5 }}>{form.businessType ? BUSINESS_TYPES(t).find(b => b.value === form.businessType)?.label || '' : t('اختر النشاط')}</span>
                                        <ChevronDown size={14} color={C.textMuted} style={{ transform: showBusinessTypes ? 'rotate(180deg)' : 'none' }} />
                                    </button>
                                    {showBusinessTypes && (
                                        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', insetInlineStart: 0, insetInlineEnd: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', boxShadow: '0 -20px 40px rgba(0,0,0,0.4)', zIndex: 1000, overflow: 'hidden', animation: 'fadeUp 0.2s ease' }}>
                                            {BUSINESS_TYPES(t).map(b => (
                                                <button key={b.value} type="button" onClick={() => { setForm({ ...form, businessType: b.value }); setShowBusinessTypes(false); }} style={{ width: '100%', padding: '12px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: CAIRO, fontSize: '13px', textAlign: 'start', color: C.textSecondary, transition: '0.15s' }} onMouseEnter={e => e.currentTarget.style.background = C.hover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{b.label}</button>
                                            ))}
                                        </div>
                                    )}
                                    <input type="text" required value={form.businessType} onChange={() => { }} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ position: 'relative' }}>
                                <label style={LS}>{t('كلمة المرور')}</label>
                                <input type={showPass ? 'text' : 'password'} required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" style={{ ...IS, height: '50px', paddingInlineEnd: '40px', direction: isRtl ? 'rtl' : 'ltr', textAlign: 'start' }} onFocus={focusIn} onBlur={focusOut} />
                                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', insetInlineEnd: '12px', top: '38px', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <label style={LS}>{t('تأكيد المرور')}</label>
                                <input type={showConfirmPass ? 'text' : 'password'} required minLength={8} value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="••••••••" style={{ ...IS, height: '50px', paddingInlineEnd: '40px', direction: isRtl ? 'rtl' : 'ltr', textAlign: 'start' }} onFocus={focusIn} onBlur={focusOut} />
                                <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} style={{ position: 'absolute', insetInlineEnd: '12px', top: '38px', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer' }}>{showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} style={{ height: '52px', borderRadius: '12px', border: 'none', background: loading ? C.primaryBg : C.primary, color: '#fff', fontSize: '16px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: CAIRO, marginTop: '8px', boxShadow: loading ? 'none' : `0 4px 14px ${C.primary}40`, transition: 'all 0.3s' }}
                            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${C.primary}60`; } }}
                            onMouseLeave={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 14px ${C.primary}40`; } }}>
                            {loading ? <Loader2 size={18} className="animate-spin" /> : t('إنشاء الحساب')}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: C.textSecondary }}>
                        {t('لديك حساب بالفعل؟')}{' '}
                        <Link href="/login" style={{ color: C.primary, fontWeight: 800, textDecoration: 'none' }}>{t('تسجيل الدخول')}</Link>
                    </p>
                </div>
            </div>
            <style>{`
                @keyframes cardAppear { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                input::placeholder { color: ${C.textMuted}; opacity: 0.7; }
                input:focus { border-color: ${C.primary} !important; box-shadow: 0 0 0 4px ${C.primary}15 !important; }
                input:-webkit-autofill { -webkit-box-shadow: 0 0 0px 1000px ${theme === 'dark' ? '#0f172a' : '#fff'} inset !important; -webkit-text-fill-color: ${theme === 'dark' ? '#f8fafc' : '#0f172a'} !important; }
                a:hover { opacity: 0.8; text-decoration: underline !important; }
            `}</style>
        </div>
    );
}

