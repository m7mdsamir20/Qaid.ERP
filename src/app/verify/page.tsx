'use client';
import { useState, useRef, useEffect, Suspense } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, RefreshCw, Mail, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { C, CAIRO, OUTFIT, THEME, IS, LS, focusIn, focusOut } from '@/constants/theme';

function VerifyContent() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (countdown > 0) {
            const t = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [countdown]);

    const handleChange = (idx: number, val: string) => {
        if (!/^\d*$/.test(val)) return;
        const newOtp = [...otp];
        newOtp[idx] = val.slice(-1);
        setOtp(newOtp);
        if (val && idx < 5) inputs.current[idx + 1]?.focus();
    };

    const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputs.current[idx - 1]?.focus();
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (text.length === 6) {
            setOtp(text.split(''));
            inputs.current[5]?.focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length !== 6) { setError(t('أدخل الكود كاملاً')); return; }
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: code }),
            });
            const data = await res.json();
            if (!res.ok) { setError(t(data.error) || t('حدث خطأ أثناء التحقق')); setLoading(false); return; }
            setSuccess(true);
            setTimeout(() => router.push('/login'), 2000);
        } catch (err) {
            setError(t('حدث خطأ أثناء التحقق'));
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        setError('');
        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (res.ok) {
                setCountdown(60);
                setOtp(['', '', '', '', '', '']);
                inputs.current[0]?.focus();
            } else {
                const d = await res.json();
                setError(t(d.error) || t('فشل إعادة إرسال الكود'));
            }
        } catch (err) {
            setError(t('فشل إعادة إرسال الكود'));
        } finally {
            setResending(false);
        }
    };

    return (
        <div style={{ ...THEME.glass.card, borderRadius: '28px', padding: '48px 32px', boxShadow: THEME.shadows.premium, position: 'relative', overflow: 'hidden' }}>
            {/* زخرفة داخلية */}
            <div style={{ position: 'absolute', top: '-20px', insetInlineEnd: '-20px', width: '100px', height: '100px', background: `${C.primary}10`, borderRadius: '50%', filter: 'blur(30px)' }} />
            
            {success ? (
                <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '24px', background: `${C.success}15`, border: `1px solid ${C.success}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', position: 'relative' }}>
                        <CheckCircle2 size={40} color={C.success} style={{ filter: `drop-shadow(0 0 10px ${C.success}40)` }} />
                        <div style={{ position: 'absolute', inset: -4, borderRadius: '26px', border: `1px solid ${C.success}20`, animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
                    </div>
                    <h2 style={{ margin: '0 0 12px', color: C.textPrimary, fontSize: '24px', fontWeight: 600, fontFamily: CAIRO }}>{t('تم التحقق بنجاح!')}</h2>
                    <p style={{ color: C.textSecondary, fontSize: '13px', lineHeight: 1.6, fontFamily: CAIRO }}>
                        {t('تمت عملية التحقق من هويتك بنجاح.')}<br />
                        <span style={{ color: C.primary, fontWeight: 700 }}>{t('جاري تحويلك لصفحة الدخول...')}</span>
                    </p>
                </div>
            ) : (
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 72, height: 72, borderRadius: '22px', background: `${C.primary}15`, border: `1px solid ${C.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <Mail size={32} color={C.primary} />
                    </div>
                    
                    <h2 style={{ margin: '0 0 10px', color: C.textPrimary, fontSize: '22px', fontWeight: 600, fontFamily: CAIRO }}>{t('تفعيل الحساب')}</h2>
                    <p style={{ color: C.textSecondary, fontSize: '13.5px', margin: '0 0 32px', lineHeight: 1.8, fontFamily: CAIRO }}>
                        {t('أهلاً بك! لقد أرسلنا رمز التحقق المكون من 6 أرقام إلى بريدك الإلكتروني:')}<br />
                        <span style={{ color: C.primary, fontWeight: 600, fontSize: '13px', borderBottom: `1px dashed ${C.primary}50`, paddingBottom: '2px' }}>{email}</span>
                    </p>

                    {error && (
                        <div style={{ background: `${C.danger}10`, border: `1px solid ${C.danger}30`, borderRadius: '12px', padding: '12px 16px', marginBottom: '24px', color: C.danger, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontWeight: 700, animation: 'shake 0.4s ease-in-out' }}>
                             {error}
                        </div>
                    )}

                    {/* حقول OTP */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px', direction: 'ltr' }} onPaste={handlePaste}>
                        {otp.map((digit, idx) => (
                            <input key={idx}
                                ref={el => { inputs.current[idx] = el; }}
                                type="text" inputMode="numeric" maxLength={1}
                                value={digit}
                                onChange={e => handleChange(idx, e.target.value)}
                                onKeyDown={e => handleKeyDown(idx, e)}
                                onFocus={focusIn}
                                onBlur={focusOut}
                                style={{ 
                                    width: '46px', height: '60px', fontSize: '24px', 
                                    fontWeight: 600, fontFamily: OUTFIT, borderRadius: '14px', 
                                    border: `1px solid ${digit ? C.primary : C.border}`, 
                                    background: digit ? `${C.primary}05` : C.inputBg, 
                                    color: C.textPrimary, outline: 'none', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: digit ? `0 0 15px ${C.primary}15` : 'none'
                                }}
                            />
                        ))}
                    </div>

                    <button onClick={handleVerify} disabled={loading || otp.join('').length !== 6}
                        style={{ 
                            width: '100%', height: '52px', borderRadius: '14px', border: 'none', 
                            background: loading ? C.primaryBg : `linear-gradient(135deg, ${C.primary}, ${C.primaryHover})`, 
                            color: '#fff', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
                            fontFamily: CAIRO, boxShadow: loading ? 'none' : `0 8px 20px -6px ${C.primary}50`, 
                            opacity: otp.join('').length !== 6 ? 0.6 : 1, transition: 'all 0.3s' 
                        }}
                        onMouseEnter={e => { if(!loading && otp.join('').length === 6) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        {loading ? <Loader2 size={20} style={{ animation: 'spin 1.5s linear infinite' }} /> : <ShieldCheck size={20} />}
                        {loading ? t('جاري التحقق...') : t('تأكيد الرمز وتفعيل الحساب')}
                    </button>

                    <div style={{ marginTop: '28px', fontSize: '13.5px', color: C.textMuted, fontFamily: CAIRO }}>
                        {t('لم يصلك الرمز؟')}{' '}
                        {countdown > 0 ? (
                            <span style={{ color: C.textSecondary, fontWeight: 700 }}>{t('إعادة الإرسال خلال')} {countdown} {t('ثانية')}</span>
                        ) : (
                            <button onClick={handleResend} disabled={resending}
                                style={{ background: 'none', border: 'none', color: C.primary, cursor: 'pointer', fontWeight: 600, fontSize: '13.5px', fontFamily: CAIRO, display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '8px', transition: 'all 0.2s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${C.primary}10`; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                            >
                                <RefreshCw size={14} style={{ animation: resending ? 'spin 1s linear infinite' : 'none' }} /> {t('إعادة إرسال الكود')}
                            </button>
                        )}
                    </div>
                    
                    <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '24px', color: C.textMuted, textDecoration: 'none', fontSize: '12px', fontWeight: 700, fontFamily: CAIRO }} onMouseEnter={e => e.currentTarget.style.color = C.textSecondary} onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>
                        {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />} {t('العودة لإنشاء الحساب')}
                    </Link>
                </div>
            )}
        </div>
    );
}

export default function VerifyPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CAIRO, padding: '20px' }}>
            {/* الخلفية الرسمية */}
            <div style={{ position: 'fixed', inset: 0, background: `radial-gradient(ellipse at 50% 50%, ${C.primary}12 0%, transparent 70%), radial-gradient(circle at 10% 10%, ${C.purple}08 0%, transparent 40%)`, pointerEvents: 'none' }} />

            {/* تأثيرات الجزيئات */}
            {mounted && (
                <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            width: i % 3 === 0 ? '2.5px' : '1.5px',
                            height: i % 3 === 0 ? '2.5px' : '1.5px',
                            borderRadius: '50%',
                            background: i % 5 === 0 ? C.primary : '#ffffff',
                            opacity: 0.15,
                            top: `${Math.random() * 100}%`,
                            insetInlineStart: `${Math.random() * 100}%`,
                            animation: `twinkle ${Math.random() * 3 + 3}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 5}s`
                        }} />
                    ))}
                    {/* أشكال عائمة */}
                    <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: `radial-gradient(circle, ${C.primary}05 0%, transparent 70%)`, top: '-10%', insetInlineEnd: '-5%', animation: 'float 15s ease-in-out infinite' }} />
                    <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: `radial-gradient(circle, ${C.purple}03 0%, transparent 70%)`, bottom: '5%', insetInlineStart: '5%', animation: 'float 18s ease-in-out infinite reverse' }} />
                </div>
            )}

            <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>
                <Suspense fallback={
                    <div style={{ ...THEME.glass.card, borderRadius: '24px', padding: '60px 40px' }}>
                        <Loader2 size={40} style={{ color: C.primary, margin: '0 auto', animation: 'spin 1.5s linear infinite' }} />
                        <p style={{ color: C.textSecondary, marginTop: '20px', fontFamily: CAIRO, fontWeight: 700 }}>{t('جاري التحميل...')}</p>
                    </div>
                }>
                    <VerifyContent />
                </Suspense>

                {/* تذييل الصفحة */}
                <div style={{ marginTop: '32px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '6px', background: `linear-gradient(135deg, ${C.primary}, ${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: '#fff' }}>{t('ق')}</div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: C.textSecondary, letterSpacing: '0.5px' }}>{t('قيد ERP — النظام المحاسبي المتكامل')}</span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                @keyframes twinkle {
                    0%, 100% { opacity: 0.1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.4); }
                }
                @keyframes float {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-20px, -30px); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes ping {
                    75%, 100% { transform: scale(1.2); opacity: 0; }
                }
            `}</style>
        </div>
    );
}
