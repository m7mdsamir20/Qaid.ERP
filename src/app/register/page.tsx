'use client';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ChevronDown, Search, Check } from 'lucide-react';
import { C, CAIRO, IS, LS, focusIn, focusOut, THEME } from '@/constants/theme';
import { getCountryPlaceholders } from '@/lib/placeholders';

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

const BUSINESS_TYPES = [
    { value: "TRADING", label: 'نشاط تجاري (جملة وتجزئة)' },
    { value: "SERVICES", label: 'نشاط خدمات (استشارات، صيانة، إلخ)' },
];

export default function RegisterPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [form, setForm] = useState({
        name: '', username: '', phone: '', email: '', companyName: '', password: '', confirmPassword: '', businessType: ''
    });

    useEffect(() => {
        setMounted(true);
    }, []);
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

    const filteredCountries = COUNTRIES.filter(c =>
        t(c.name).includes(countrySearch) || c.dial.includes(countrySearch)
    );

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
                setShowCountries(false);
            if (businessTypeRef.current && !businessTypeRef.current.contains(e.target as Node))
                setShowBusinessTypes(false);
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
                body: JSON.stringify({
                    ...form,
                    phone: fullPhone,
                    countryCode: selectedCountry.code,
                    currency: selectedCountry.currency,
                    timezone: selectedCountry.timezone,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); setLoading(false); return; }

            // إرسال OTP
            try {
                await fetch('/api/auth/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: form.email }),
                });
            } catch (otpErr) {
                console.error("OTP send error:", otpErr);
            }

            router.push(`/verify?email=${encodeURIComponent(form.email)}`);
        } catch {
            setError(t('حدث خطأ، حاول مرة أخرى'));
            setLoading(false);
        }
    };

    const F = (label: string, name: string, placeholder: string, type = 'text') => (
        <div>
            <label style={LS}>{label}</label>
            <input type={type} required
                value={(form as any)[name]}
                onChange={e => setForm({ ...form, [name]: e.target.value })}
                placeholder={placeholder}
                style={{ ...IS, height: '44px' }}
                onFocus={focusIn}
                onBlur={focusOut}
                spellCheck={false}
                autoComplete={name}
            />
        </div>
    );

    const BRAND_NAME = t('قيد المطور');
    const BRAND_LOGO = '/logo-system.png'; // لوجو النظام الموحد (قيد المطور)

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CAIRO, padding: '20px' }}>
            {/* الخلفية الرسمية */}
            <div style={{ position: 'fixed', inset: 0, background: `radial-gradient(ellipse at 20% 50%, ${C.primary}15 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, ${C.purple}10 0%, transparent 50%)`, pointerEvents: 'none' }} />

            {/* نجوم - Render only on client side to avoid hydration mismatch */}
            {mounted && (
                <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                    {Array.from({ length: 60 }).map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            width: i % 3 === 0 ? '2px' : '1px',
                            height: i % 3 === 0 ? '2px' : '1px',
                            borderRadius: '50%',
                            background: i % 5 === 0 ? '#60a5fa' : '#ffffff',
                            opacity: 0.2,
                            top: `${Math.random() * 100}%`,
                            insetInlineStart: `${Math.random() * 100}%`,
                            animationName: 'twinkle',
                            animationDuration: `${Math.random() * 3 + 2}s`,
                            animationTimingFunction: 'ease-in-out',
                            animationIterationCount: 'infinite',
                            animationDelay: `${Math.random() * i * 0.1}s`
                        }} />
                    ))}
                    {/* دوائر ضبابية كبيرة */}
                    <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', top: '-200px', insetInlineEnd: '-200px', animationName: 'float1', animationDuration: '8s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }} />
                    <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', bottom: '-150px', insetInlineStart: '-150px', animationName: 'float2', animationDuration: '10s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }} />
                    <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)', top: '40%', insetInlineStart: '30%', animationName: 'float1', animationDuration: '12s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite', animationDirection: 'reverse' }} />
                </div>
            )}

            {/* أشكال هندسية */}
            <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                {/* مربعات دوارة */}
                <div style={{ position: 'absolute', width: '80px', height: '80px', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '12px', top: '10%', insetInlineStart: '8%', animationName: 'spin', animationDuration: '20s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }} />
                <div style={{ position: 'absolute', width: '50px', height: '50px', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '8px', top: '20%', insetInlineStart: '15%', animationName: 'spin', animationDuration: '15s', animationTimingFunction: 'linear', animationIterationCount: 'infinite', animationDirection: 'reverse' }} />
                <div style={{ position: 'absolute', width: '120px', height: '120px', border: '1px solid rgba(59,130,246,0.08)', borderRadius: '16px', bottom: '15%', insetInlineStart: '5%', animationName: 'spin', animationDuration: '25s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }} />
                <div style={{ position: 'absolute', width: '60px', height: '60px', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '10px', top: '60%', insetInlineStart: '20%', animationName: 'spin', animationDuration: '18s', animationTimingFunction: 'linear', animationIterationCount: 'infinite', animationDirection: 'reverse' }} />

                {/* مثلثات */}
                <div style={{ position: 'absolute', width: 0, height: 0, borderInlineStart: '30px solid transparent', borderInlineEnd: '30px solid transparent', borderBottom: '52px solid rgba(59,130,246,0.06)', top: '35%', insetInlineStart: '3%', animationName: 'float', animationDuration: '8s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }} />
                <div style={{ position: 'absolute', width: 0, height: 0, borderInlineStart: '20px solid transparent', borderInlineEnd: '20px solid transparent', borderBottom: '35px solid rgba(99,102,241,0.06)', bottom: '30%', insetInlineStart: '25%', animationName: 'float', animationDuration: '11s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite', animationDirection: 'reverse' }} />

                {/* دوائر */}
                <div style={{ position: 'absolute', width: '100px', height: '100px', borderRadius: '50%', border: '1px solid rgba(59,130,246,0.1)', top: '5%', insetInlineEnd: '10%', animationName: 'float', animationDuration: '9s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }} />
                <div style={{ position: 'absolute', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)', bottom: '20%', insetInlineEnd: '8%', animationName: 'float', animationDuration: '7s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite', animationDirection: 'reverse' }} />
                <div style={{ position: 'absolute', width: '160px', height: '160px', borderRadius: '50%', border: '1px solid rgba(99,102,241,0.06)', bottom: '5%', insetInlineEnd: '20%', animationName: 'float', animationDuration: '13s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }} />

                {/* خطوط قطرية */}
                <div style={{ position: 'absolute', width: '150px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.15), transparent)', top: '45%', insetInlineStart: '0', transform: 'rotate(-30deg)', animationName: 'fade', animationDuration: '6s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }} />
                <div style={{ position: 'absolute', width: '100px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.12), transparent)', bottom: '40%', insetInlineEnd: '5%', transform: 'rotate(45deg)', animationName: 'fade', animationDuration: '8s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite', animationDirection: 'reverse' }} />
            </div>

            <div style={{ width: '100%', maxWidth: '480px', position: 'relative', zIndex: 1 }}>
                {/* الهوية البصرية */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    {BRAND_LOGO ? (
                        <img src={BRAND_LOGO} alt={BRAND_NAME} style={{ display: 'block', margin: '0 auto 12px', width: '100%', maxWidth: '220px', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.3))' }} />
                    ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: C.primaryBg, border: `1px solid ${C.primaryBorder}`, borderRadius: '16px', padding: '12px 24px', marginBottom: '0', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                            <div style={{ width: 42, height: 42, borderRadius: '12px', background: `linear-gradient(135deg, ${C.primary}, ${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 900, color: '#fff', boxShadow: `0 8px 16px -4px ${C.primary}60` }}>{BRAND_NAME.charAt(0)}</div>
                            <span style={{ fontSize: '24px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO, letterSpacing: '0.5px' }}>{BRAND_NAME}</span>
                        </div>
                    )}
                    <p style={{ marginTop: '14px', color: C.textSecondary, fontSize: '14px', fontWeight: 600 }}>{t('إنشاء حساب جديد')}</p>
                </div>

                {/* كارت التسجيل */}
                <div style={{ ...THEME.glass.card, borderRadius: '24px', padding: '24px', boxShadow: THEME.shadows.premium }}>
                    <h2 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: 900, color: C.textPrimary, textAlign: 'center' }}>{t('إنشاء الحساب')}</h2>

                    {error && (
                        <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: C.danger, fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>{error}</div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {F(t('الاسم الكامل'), 'name', t('محمد أحمد'))}
                            {F(t('اسم المستخدم'), 'username', 'mohamed123')}
                        </div>

                        <div>
                            <label style={LS}>{t('رقم الهاتف')}</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div ref={dropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                                    <button type="button" onClick={() => setShowCountries(!showCountries)}
                                        style={{ height: '44px', padding: '0 12px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textPrimary, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', fontFamily: CAIRO, transition: 'all 0.2s', fontWeight: 500 }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = C.textMuted}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                                        <img src={`https://flagcdn.com/w20/${selectedCountry.code.toLowerCase()}.png`} alt={t(selectedCountry.name)} style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
                                        <span style={{ fontSize: '12px', direction: 'ltr', color: C.textSecondary, fontWeight: 700 }}>{selectedCountry.dial}</span>
                                        <ChevronDown size={14} color={C.textMuted} style={{ transform: showCountries ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                    </button>

                                    {showCountries && (
                                        <div style={{ position: 'absolute', top: 'calc(100% + 12px)', insetInlineEnd: 0, width: '240px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden', animation: 'fadeDown 0.2s ease', borderTop: `2px solid ${C.primary}` }}>
                                            <div style={{ padding: '12px', borderBottom: `1px solid ${C.border}`, position: 'relative', background: 'rgba(255,255,255,0.01)' }}>
                                                <Search size={14} style={{ position: 'absolute', insetInlineStart: '22px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                                                <input placeholder={t("ابحث عن الدولة...")} value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
                                                    style={{ width: '100%', height: '36px', padding: '0 32px 0 10px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textPrimary, fontSize: '12.5px', outline: 'none', fontFamily: CAIRO, direction: 'rtl', boxSizing: 'border-box' }}
                                                    autoFocus
                                                />
                                            </div>
                                            <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '6px' }}>
                                                {filteredCountries.map(c => (
                                                    <button key={c.code} type="button"
                                                        onClick={() => { setSelectedCountry(c); setShowCountries(false); setCountrySearch(''); }}
                                                        style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', background: selectedCountry.code === c.code ? `${C.primary}15` : 'transparent', border: 'none', cursor: 'pointer', transition: '0.15s', borderRadius: '10px', textAlign: 'start', color: selectedCountry.code === c.code ? C.primary : C.textSecondary, fontWeight: selectedCountry.code === c.code ? 800 : 500 }}
                                                        onMouseEnter={e => { if (selectedCountry.code !== c.code) e.currentTarget.style.background = C.hover; }}
                                                        onMouseLeave={e => { if (selectedCountry.code !== c.code) e.currentTarget.style.background = 'transparent'; }}>
                                                        <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} alt={t(c.name)} style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                                                        <span style={{ fontSize: '13.5px', fontFamily: CAIRO, flex: 1, textAlign: 'start' }}>{t(c.name)}</span>
                                                        <span style={{ fontSize: '13px', direction: 'ltr', opacity: 0.8 }}>{c.dial}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <input
                                    type="tel" required
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                                    placeholder={getCountryPlaceholders(selectedCountry.code).phone}
                                    style={{ ...IS, height: '44px', flex: 1, direction: 'ltr', textAlign: 'start' }}
                                    onFocus={focusIn}
                                    onBlur={focusOut}
                                    spellCheck={false}
                                    autoComplete="tel"
                                />
                            </div>
                        </div>

                        {F(t('البريد الإلكتروني'), 'email', 'email@example.com', 'email')}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {F(t('اسم الشركة / النشاط'), 'companyName', t('مثلاً: شركة الحلول التقنية'))}
                            <div>
                                <label style={LS}>{t('نوع النشاط')}</label>
                                <div ref={businessTypeRef} style={{ position: 'relative' }}>
                                    <button type="button" onClick={() => setShowBusinessTypes(!showBusinessTypes)}
                                        style={{ width: '100%', height: '44px', padding: '0 14px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textPrimary, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: CAIRO, transition: 'all 0.2s', fontWeight: 500 }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = C.textMuted}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                                        <span style={{ flex: 1, textAlign: 'start', color: form.businessType ? C.textPrimary : C.textMuted }}>{form.businessType ? t(BUSINESS_TYPES.find(b => b.value === form.businessType)?.label || '') : t('اختر نوع النشاط')}</span>
                                        <ChevronDown size={14} color={C.textMuted} style={{ transform: showBusinessTypes ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                    </button>

                                    {/* حقل مخفي لفرض الإجبارية عبر المتصفح */}
                                    <input type="text" required value={form.businessType} onChange={() => { }} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px', bottom: '0', insetInlineStart: '50%' }} tabIndex={-1} />

                                    {showBusinessTypes && (
                                        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', insetInlineStart: 0, insetInlineEnd: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', boxShadow: '0 -25px 50px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden', animation: 'fadeUp 0.2s ease', borderBottom: `2px solid ${C.primary}` }}>
                                            <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '6px' }}>
                                                {BUSINESS_TYPES.map(b => (
                                                    <button key={b.value} type="button"
                                                        onClick={() => { setForm({ ...form, businessType: b.value }); setShowBusinessTypes(false); }}
                                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: CAIRO, fontSize: '13.5px', textAlign: 'start', boxSizing: 'border-box', background: form.businessType === b.value ? `${C.primary}15` : 'transparent', color: form.businessType === b.value ? C.primary : C.textSecondary, transition: '0.15s', fontWeight: form.businessType === b.value ? 800 : 500 }}
                                                        onMouseEnter={e => { if (form.businessType !== b.value) e.currentTarget.style.background = C.hover; }}
                                                        onMouseLeave={e => { if (form.businessType !== b.value) e.currentTarget.style.background = 'transparent'; }}>
                                                        <span style={{ flex: 1, textAlign: 'start' }}>{t(b.label)}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={LS}>{t('كلمة المرور')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input type={showPass ? 'text' : 'password'} required minLength={8}
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        placeholder={t("8 أحرف على الأقل")}
                                        style={{ ...IS, height: '44px', paddingInlineStart: '44px', direction: 'ltr', textAlign: 'start' }}
                                        onFocus={focusIn}
                                        onBlur={focusOut}
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)}
                                        style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 0, display: 'flex' }}>
                                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label style={LS}>{t('تأكيد المرور')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input type={showConfirmPass ? 'text' : 'password'} required minLength={8}
                                        value={form.confirmPassword}
                                        onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                        placeholder={t("إعادة الكلمة")}
                                        style={{ ...IS, height: '44px', paddingInlineStart: '44px', direction: 'ltr', textAlign: 'start' }}
                                        onFocus={focusIn}
                                        onBlur={focusOut}
                                    />
                                    <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)}
                                        style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 0, display: 'flex' }}>
                                        {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            style={{ height: '48px', borderRadius: '12px', border: 'none', background: loading ? C.primaryBg : C.primary, color: '#fff', fontSize: '15px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: CAIRO, marginTop: '4px', boxShadow: loading ? 'none' : `0 4px 12px ${C.primary}40`, transition: 'all 0.2s' }}
                            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.primaryHover; }}
                            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.primary; }}>
                            {loading ? <><Loader2 size={18} style={{ animationName: 'spin', animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }} /> {t('جاري الإنشاء...')}</> : t('إنشاء الحساب')}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: C.textSecondary }}>
                        {t('لديك حساب بالفعل؟')}{' '}
                        <Link href="/login" style={{ color: C.primary, fontWeight: 800, textDecoration: 'none' }}>{t('تسجيل الدخول')}</Link>
                    </p>
                </div>
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                @keyframes twinkle {
                    0%, 100% { opacity: 0.1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.5); }
                }
                @keyframes float1 {
                    0%, 100% { transform: translateY(0px) scale(1); }
                    50% { transform: translateY(-30px) scale(1.05); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translateY(0px) scale(1); }
                    50% { transform: translateY(20px) scale(0.95); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes fade {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }
                @keyframes fadeUp {
                    0% { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                input::placeholder { color: ${C.textMuted}; opacity: 0.9; }
                input:-webkit-autofill,
                input:-webkit-autofill:hover,
                input:-webkit-autofill:focus {
                    -webkit-box-shadow: 0 0 0px 1000px ${C.card} inset !important;
                    box-shadow: 0 0 0 4px ${C.primaryBg}, 0 0 0px 1000px ${C.card} inset !important;
                    -webkit-text-fill-color: ${C.textPrimary} !important;
                    color: ${C.textPrimary} !important;
                    caret-color: ${C.textPrimary} !important;
                    border-color: ${C.primary} !important;
                    outline: none !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
                ::-webkit-scrollbar { width: 4px }
                ::-webkit-scrollbar-track { background: transparent }
                ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px }
            `}</style>
        </div>
    );
}
