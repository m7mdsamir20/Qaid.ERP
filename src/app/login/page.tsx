'use client';
import { useState, useEffect } from 'react';
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
    // استخدام أيقونة التاب الموحدة المنسوخة لمجلد public
    const TAB_ICON = '/icon.png';

    // الشعار الصحيح حسب الثيم: dark → logo-system.png (أبيض), light → logo-light.png (أسود)
    const isDarkTheme = theme === 'dark';
    const showLogos = mounted;

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

            {/* Modern Minimal Background */}
            <div style={{ 
                position: 'fixed', 
                inset: 0, 
                background: theme === 'dark' ? 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)' : 'radial-gradient(circle at center, #f8fafc 0%, #f1f5f9 100%)',
                zIndex: 0 
            }}>
                {/* Optional Subtle Animated Glow */}
                <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    width: '800px',
                    height: '800px',
                    background: `radial-gradient(circle, ${C.primary}05 0%, transparent 70%)`,
                    pointerEvents: 'none',
                    opacity: theme === 'dark' ? 1 : 0.5
                }} />
            </div>

            <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1, animation: 'cardAppear 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                {/* الهوية البصرية */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    {showLogos ? (
                        <img
                            key={isDarkTheme ? 'logo-dark' : 'logo-light'}
                            src={isDarkTheme ? '/logo-system.png' : '/logo-light.png'}
                            alt={BRAND_NAME}
                            style={{
                                display: 'block',
                                width: '100%',
                                maxWidth: '200px',
                                height: 'auto',
                                objectFit: 'contain',
                                margin: '0 auto 12px',
                                filter: theme === 'dark' ? 'drop-shadow(0 0 20px rgba(37,106,244,0.3))' : 'none',
                            }}
                        />
                    ) : (
                        <div style={{ display: 'block', margin: '0 auto 12px', width: '220px', height: '80px' }} />
                    )}
                    <p style={{ marginTop: '16px', color: C.textSecondary, fontSize: '14px', fontWeight: 500, opacity: 0.8 }}>{t('مرحباً بعودتك لنظامك السحابي')}</p>
                </div>

                {/* كارت التسجيل */}
                <div style={{
                    background: theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                    border: `1px solid ${C.border}`,
                    boxShadow: theme === 'dark' ? '0 25px 50px -12px rgba(0,0,0,0.5)' : '0 10px 25px -5px rgba(0,0,0,0.05)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: '24px', padding: '40px',
                }}>
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
                                id="identity"
                                name="identity"
                                type="text" required
                                value={form.identity}
                                onChange={e => setForm({ ...form, identity: e.target.value })}
                                placeholder={t("username أو email@example.com")}
                                style={{ 
                                    ...IS, 
                                    height: '50px', 
                                    textAlign: 'start', 
                                    direction: isRtl ? 'rtl' : 'ltr' 
                                }}
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
                                    id="password"
                                    name="password"
                                    type={showPass ? 'text' : 'password'} required
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••"
                                    style={{
                                        ...IS, 
                                        height: '50px',
                                        paddingLeft: isRtl ? '44px' : '16px',
                                        paddingRight: isRtl ? '16px' : '44px',
                                        direction: isRtl ? 'rtl' : 'ltr', 
                                        textAlign: 'start'
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

                        <button type="submit" disabled={loading}
                             style={{ 
                                height: '52px', 
                                borderRadius: '12px', 
                                border: 'none', 
                                background: loading ? C.primaryBg : C.primary, 
                                color: '#fff', 
                                fontSize: '16px', 
                                fontWeight: 800, 
                                cursor: loading ? 'not-allowed' : 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '8px', 
                                fontFamily: CAIRO, 
                                marginTop: '8px', 
                                boxShadow: loading ? 'none' : `0 4px 14px ${C.primary}40`, 
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                            }}
                            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = C.primaryHover; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${C.primary}60`; }}}
                            onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 14px ${C.primary}40`; }}}>
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
                @keyframes cardAppear {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                input::placeholder { color: ${C.textMuted}; opacity: 0.7; }
                input:focus { 
                    border-color: ${C.primary} !important;
                    box-shadow: 0 0 0 4px ${C.primary}15 !important;
                }
                input:-webkit-autofill {
                    -webkit-box-shadow: 0 0 0px 1000px ${theme === 'dark' ? '#0f172a' : '#fff'} inset !important;
                    -webkit-text-fill-color: ${theme === 'dark' ? '#f8fafc' : '#0f172a'} !important;
                }
                a:hover { 
                    opacity: 0.8;
                    text-decoration: underline !important;
                }
            `}</style>
        </div>
    );
}
