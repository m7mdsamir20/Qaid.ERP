'use client';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { C, CAIRO, IS, LS, focusIn, focusOut, THEME } from '@/constants/theme';

export default function LoginPage() {
    const { lang, t } = useTranslation();
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
            {/* الخلفية الرسمية */}
            <div style={{ position: 'fixed', inset: 0, background: `radial-gradient(ellipse at 20% 50%, ${C.primary}15 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, ${C.purple}10 0%, transparent 50%)`, pointerEvents: 'none', zIndex: 0 }} />

            {/* نجوم - Render only on client side */}
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
                    <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', top: '-100px', insetInlineEnd: '-200px', animation: 'float1 8s ease-in-out infinite' }} />
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
                                style={{ ...IS, height: '48px' }}
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
                                    style={{ ...IS, height: '48px', paddingInlineStart: '44px', direction: 'ltr', textAlign: 'start' }}
                                    onFocus={focusIn}
                                    onBlur={focusOut}
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)}
                                    style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 0, display: 'flex' }}>
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
