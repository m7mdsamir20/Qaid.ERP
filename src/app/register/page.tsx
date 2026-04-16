'use client';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ChevronDown, Search, Check, Sun, Moon } from 'lucide-react';
import { C, CAIRO, IS, LS, focusIn, focusOut, THEME } from '@/constants/theme';
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
            <input 
                id={name}
                name={name}
                type={type} required
                value={(form as any)[name]}
                onChange={e => setForm({ ...form, [name]: e.target.value })}
                placeholder={placeholder}
                style={{ ...IS, height: '44px', textAlign: 'start' }}
                onFocus={focusIn}
                onBlur={focusOut}
                spellCheck={false}
                autoComplete={name}
            />
        </div>
    );

    const BRAND_NAME = t('قيد المطور'); // اسم البراند (النظام)
    const BRAND_LOGO = mounted ? (theme === 'light' ? '/logo-light.png?v=3' : '/logo-system.png?v=3') : null;

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CAIRO, padding: '20px', position: 'relative' }}>
            {/* أزرار التحكم (اللغة والثيم) */}
            <div style={{ position: 'absolute', top: '24px', insetInlineEnd: '24px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
                {/* مفتاح اللغة */}
                <button
                    onClick={() => toggleLang()}
                    style={{
                        height: '36px', padding: '0 12px', borderRadius: '10px',
                        border: `1px solid ${C.primary}30`, background: `${C.primary}10`,
                        color: C.primary, cursor: 'pointer', transition: 'all 0.2s',
                        fontSize: '13px', fontWeight: 900, fontFamily: lang === 'ar' ? 'sans-serif' : CAIRO,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${C.primary}20`}
                    onMouseLeave={e => e.currentTarget.style.background = `${C.primary}10`}
                >
                    {lang === 'ar' ? 'EN' : 'ع'}
                </button>

                {/* مفتاح الثيم */}
                <button
                    onClick={toggleTheme}
                    title={theme === 'dark' ? t('تفعيل الوضع الفاتح') : t('تفعيل الوضع الداكن')}
                    style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        border: `1px solid ${C.border}`, background: C.card,
                        color: C.textSecondary, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
            {/* Premium Moving Background */}
            <div style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 0, overflow: 'hidden' }}>
                {/* Layer 1: Animated Mesh Gradient */}
                <div style={{ position: 'absolute', inset: '-50%', background: `radial-gradient(circle at 70% 30%, ${C.primary}10 0%, transparent 40%), radial-gradient(circle at 30% 70%, ${C.purple}08 0%, transparent 40%)`, animation: 'meshRotate 30s linear infinite', opacity: 0.6 }} />

                {/* Layer 2: Moving Glow Orbs */}
                {mounted && Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        width: `${200 + i * 100}px`, height: `${200 + i * 100}px`,
                        borderRadius: '50%',
                        background: theme === 'dark'
                            ? `radial-gradient(circle, ${i % 2 === 0 ? C.primary : C.purple}05 0%, transparent 70%)`
                            : `radial-gradient(circle, ${i % 2 === 0 ? C.primary : '#fff'}30 0%, transparent 70%)`,
                        top: `${Math.random() * 80}%`,
                        insetInlineStart: `${Math.random() * 80}%`,
                        animation: `floatAround ${20 + i * 5}s ease-in-out infinite`,
                        animationDelay: `-${i * 2}s`,
                        filter: theme === 'dark' ? 'blur(40px)' : 'blur(60px)',
                        opacity: theme === 'light' ? 0.6 : 1
                    }} />
                ))}

                {/* Layer 3: Dynamic Stellar Field */}
                {mounted && Array.from({ length: 60 }).map((_, i) => {
                    const size = Math.random() * 2 + 1;
                    const duration = 3 + Math.random() * 7;
                    const starColor = theme === 'dark' ? '#fff' : C.primary;
                    return (
                        <div key={i} style={{
                            position: 'absolute',
                            width: `${size}px`, height: `${size}px`,
                            background: starColor,
                            borderRadius: '50%',
                            opacity: theme === 'dark' ? Math.random() * 0.4 + 0.1 : 0.4,
                            top: `${Math.random() * 100}%`,
                            insetInlineStart: `${Math.random() * 100}%`,
                            animation: `twinkleAndMove ${duration}s ease-in-out infinite`,
                            animationDelay: `${-Math.random() * 10}s`,
                            boxShadow: theme === 'dark' && size > 2 ? `0 0 ${size * 4}px #fff` : (theme === 'light' ? `0 0 ${size * 3}px ${C.primary}50` : 'none'),
                        }} />
                    );
                })}
            </div>

            <div style={{ width: '100%', maxWidth: '480px', position: 'relative', zIndex: 1 }}>
                {/* الهوية البصرية */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    {BRAND_LOGO ? (
                        <img key={theme} src={BRAND_LOGO} alt={BRAND_NAME} style={{ display: 'block', margin: '0 auto 12px', width: '100%', maxWidth: '240px', height: 'auto', objectFit: 'contain', filter: theme === 'dark' ? 'drop-shadow(0 15px 35px rgba(0,0,0,0.3))' : 'none', mixBlendMode: theme === 'light' ? 'multiply' : 'normal' }} />
                    ) : (
                        <div style={{ display: 'block', margin: '0 auto 12px', width: '240px', height: '80px' }} />
                    )}
                    <p style={{ marginTop: '14px', color: C.textSecondary, fontSize: '14px', fontWeight: 600 }}>{t('إنشاء حساب جديد')}</p>
                </div>

                {/* كارت التسجيل */}
                <div style={{
                    background: 'var(--c-auth-card-bg)',
                    border: 'var(--c-auth-card-border)',
                    boxShadow: 'var(--c-auth-card-shadow)',
                    backdropFilter: 'var(--c-auth-card-blur)',
                    WebkitBackdropFilter: 'var(--c-auth-card-blur)',
                    borderRadius: '24px', padding: '32px',
                }}>
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
                                                    style={{ width: '100%', height: '36px', padding: '0 32px 0 10px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textPrimary, fontSize: '12.5px', outline: 'none', fontFamily: CAIRO, direction: 'inherit', boxSizing: 'border-box' }}
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
                                    id="phone"
                                    name="phone"
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
                                        <span style={{ flex: 1, textAlign: 'start', color: form.businessType ? C.textPrimary : C.textMuted }}>{form.businessType ? BUSINESS_TYPES(t).find(b => b.value === form.businessType)?.label || '' : t('اختر نوع النشاط')}</span>
                                        <ChevronDown size={14} color={C.textMuted} style={{ transform: showBusinessTypes ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                    </button>

                                    {/* حقل مخفي لفرض الإجبارية عبر المتصفح */}
                                    <input type="text" required value={form.businessType} onChange={() => { }} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px', bottom: '0', insetInlineStart: '50%' }} tabIndex={-1} />

                                    {showBusinessTypes && (
                                        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', insetInlineStart: 0, insetInlineEnd: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', boxShadow: '0 -25px 50px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden', animation: 'fadeUp 0.2s ease', borderBottom: `2px solid ${C.primary}` }}>
                                            <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '6px' }}>
                                                {BUSINESS_TYPES(t).map(b => (
                                                    <button key={b.value} type="button"
                                                        onClick={() => { setForm({ ...form, businessType: b.value }); setShowBusinessTypes(false); }}
                                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: CAIRO, fontSize: '13.5px', textAlign: 'start', boxSizing: 'border-box', background: form.businessType === b.value ? `${C.primary}15` : 'transparent', color: form.businessType === b.value ? C.primary : C.textSecondary, transition: '0.15s', fontWeight: form.businessType === b.value ? 800 : 500 }}
                                                        onMouseEnter={e => { if (form.businessType !== b.value) e.currentTarget.style.background = C.hover; }}
                                                        onMouseLeave={e => { if (form.businessType !== b.value) e.currentTarget.style.background = 'transparent'; }}>
                                                        <span style={{ flex: 1, textAlign: 'start' }}>{b.label}</span>
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
                                    <input 
                                        id="password"
                                        name="password"
                                        type={showPass ? 'text' : 'password'} required minLength={8}
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        placeholder={t("8 أحرف على الأقل")}
                                        style={{
                                            ...IS, height: '44px',
                                            paddingLeft: isRtl ? '44px' : '16px',
                                            paddingRight: isRtl ? '16px' : '44px',
                                            direction: 'ltr', textAlign: 'start'
                                        }}
                                        onFocus={focusIn}
                                        onBlur={focusOut}
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)}
                                        style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 0, display: 'flex' }}>
                                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label style={LS}>{t('تأكيد المرور')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPass ? 'text' : 'password'} required minLength={8}
                                        value={form.confirmPassword}
                                        onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                        placeholder={t("إعادة الكلمة")}
                                        style={{
                                            ...IS, height: '44px',
                                            paddingLeft: isRtl ? '44px' : '16px',
                                            paddingRight: isRtl ? '16px' : '44px',
                                            direction: 'ltr', textAlign: 'start'
                                        }}
                                        onFocus={focusIn}
                                        onBlur={focusOut}
                                    />
                                    <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)}
                                        style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 0, display: 'flex' }}>
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
                @keyframes meshRotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes floatAround {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }
                @keyframes twinkleAndMove {
                    0%, 100% { opacity: 0.1; transform: translateY(0); }
                    50% { opacity: 0.4; transform: translateY(-20px); }
                }
                @keyframes fadeUp {
                    0% { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                input::placeholder { color: ${C.textMuted}; opacity: 0.9; }
                input:-webkit-autofill,
                input:-webkit-autofill:hover,
                input:-webkit-autofill:focus {
                    -webkit-box-shadow: 0 0 0px 1000px var(--c-autofill-bg) inset !important;
                    -webkit-text-fill-color: var(--c-text-primary) !important;
                    caret-color: var(--c-text-primary) !important;
                    border-color: var(--c-primary) !important;
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
