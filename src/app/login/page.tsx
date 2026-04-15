'use client';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Sun, Moon } from 'lucide-react';
import { C, CAIRO, IS, LS, focusIn, focusOut, THEME } from '@/constants/theme';
import { useTheme } from '@/components/Providers';

export default function LoginPage() {
    const { lang, t, toggleLang } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [form, setForm] = useState({ identity: '', password: '' });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // قراءة callbackUrl من الـ URL لإعادة التوجيه بعد الدخول
    const [callbackUrl, setCallbackUrl] = useState('/');
    useEffect(() => {
        setMounted(true);
        const params = new URLSearchParams(window.location.search);
        const cb = params.get('callbackUrl');
        if (cb) setCallbackUrl(cb);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await signIn('credentials', {
                username: form.identity,
                password: form.password,
                redirect: false,
            });
            if (res?.error) {
                setError(res.error);
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } finally {
            setLoading(false);
        }
    };

    const BRAND_NAME = t('قيد المطور'); // اسم البراند (النظام)
    const BRAND_LOGO = '/logo-system.png'; // لوجو النظام الموحد (قيد المطور)

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
                        background: `radial-gradient(circle, ${i % 2 === 0 ? C.primary : C.purple}05 0%, transparent 70%)`,
                        top: `${Math.random() * 80}%`,
                        insetInlineStart: `${Math.random() * 80}%`,
                        animation: `floatAround ${20 + i * 5}s ease-in-out infinite`,
                        animationDelay: `-${i * 2}s`,
                        filter: 'blur(40px)',
                    }} />
                ))}

                {/* Layer 3: Subtle Particles */}
                {mounted && Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        width: '2px', height: '2px', background: '#fff', borderRadius: '50%',
                        opacity: 0.1,
                        top: `${Math.random() * 100}%`,
                        insetInlineStart: `${Math.random() * 100}%`,
                        animation: `twinkleAndMove ${5 + Math.random() * 5}s ease-in-out infinite`,
                        animationDelay: `${-Math.random() * 5}s`,
                    }} />
                ))}
            </div>

            <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
                {/* الهوية البصرية */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    {BRAND_LOGO ? (
                        <img src={BRAND_LOGO} alt={BRAND_NAME} style={{ display: 'block', margin: '0 auto 12px', width: '100%', maxWidth: '220px', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.3))' }} />
                    ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: C.primaryBg, border: `1px solid ${C.primaryBorder}`, borderRadius: '16px', padding: '12px 24px', marginBottom: '0', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                            <div style={{ width: 42, height: 42, borderRadius: '12px', background: `linear-gradient(135deg, ${C.primary}, ${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 900, color: '#fff', boxShadow: `0 8px 16px -4px ${C.primary}60` }}>{BRAND_NAME.charAt(0)}</div>
                            <span style={{ fontSize: '24px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO, letterSpacing: '0.5px' }}>{BRAND_NAME}</span>
                        </div>
                    )}
                    <p style={{ marginTop: '16px', color: C.textSecondary, fontSize: '14px', fontWeight: 600 }}>{t('مرحباً بعودتك لنظامك السحابي')}</p>
                </div>

                {/* كارت التسجيل */}
                <div style={{ ...THEME.glass.card, borderRadius: '24px', padding: '32px', boxShadow: THEME.shadows.premium }}>
                    <h2 style={{ margin: '0 0 24px', fontSize: '22px', fontWeight: 900, color: C.textPrimary, textAlign: 'center' }}>{t('تسجيل الدخول')}</h2>

                    {error && (
                        <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerBorder}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: C.danger, fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={LS}>{t('اسم المستخدم أو البريد الإلكتروني')}</label>
                            <input
                                type="text" required
                                value={form.identity}
                                onChange={e => setForm({ ...form, identity: e.target.value })}
                                placeholder={t("username أو email@example.com")}
                                style={{ ...IS, height: '48px', textAlign: isRtl ? 'right' : 'left' }}
                                onFocus={focusIn}
                                onBlur={focusOut}
                                spellCheck={false}
                                autoComplete="username"
                            />
                        </div>

                        <div>
                            <label style={LS}>{t('كلمة المرور')}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPass ? 'text' : 'password'} required
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••"
                                    style={{ ...IS, height: '48px', paddingInlineEnd: '44px', direction: 'ltr', textAlign: isRtl ? 'right' : 'left' }}
                                    onFocus={focusIn}
                                    onBlur={focusOut}
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 0, display: 'flex' }}>
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            style={{ height: '50px', borderRadius: '12px', border: 'none', background: loading ? C.primaryBg : C.primary, color: '#fff', fontSize: '16px', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: CAIRO, marginTop: '8px', boxShadow: loading ? 'none' : `0 4px 12px ${C.primary}40`, transition: 'all 0.2s' }}
                            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = C.primaryHover; }}
                            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = C.primary; }}>
                            {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> {t('جاري الدخول...')}</> : t('تسجيل الدخول')}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: C.textSecondary }}>
                        {t('ليس لديك حساب؟')}{' '}
                        <Link href="/register" style={{ color: C.primary, fontWeight: 800, textDecoration: 'none' }}>{t('إنشاء حساب جديد')}</Link>
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
                input::placeholder { color: ${C.textMuted}; opacity: 0.9; }
                input:-webkit-autofill {
                    -webkit-box-shadow: 0 0 0px 1000px ${C.card} inset !important;
                    -webkit-text-fill-color: ${C.textPrimary} !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
            `}</style>
        </div>
    );
}
