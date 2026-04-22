'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { KeyRound, Lock, Eye, EyeOff, Save, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useTheme } from '@/components/Providers';

export default function ChangePasswordPage() {
    const { lang, t } = useTranslation();
    const { theme } = useTheme();
    const isRtl = lang === 'ar';
    const isLight = theme === 'light';
    const { data: session } = useSession();
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false });

    const [form, setForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.newPassword !== form.confirmPassword) {
            showToast(t('كلمة المرور الجديدة غير متطابقة'), 'error');
            return;
        }

        if (form.newPassword.length < 6) {
            showToast(t('يجب أن تكون كلمة المرور 6 أحرف على الأقل'), 'error');
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch('/api/profile/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                showToast(t('تم تغيير كلمة المرور بنجاح ✓'));
                setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                const data = await res.json();
                showToast(data.error || t('فشل تغيير كلمة المرور'), 'error');
            }
        } catch (error) {
            showToast(t('حدث خطأ أثناء الاتصال بالخادم'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const togglePass = (key: keyof typeof showPasswords) => {
        setShowPasswords(p => ({ ...p, [key]: !p[key] }));
    };

    // Color logic for light mode visibility
    const textColor = isLight ? '#1e293b' : 'var(--c-text-primary)';
    const subColor = isLight ? '#64748b' : 'var(--c-text-secondary)';

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 0', fontFamily: "'Cairo', sans-serif" }}>

                {/* Header */}
                <div style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ padding: '10px', background: 'var(--c-primary-bg)', color: 'var(--c-primary)', borderRadius: '12px' }}>
                            <Lock size={24} />
                        </div>
                        <h1 style={{ fontSize: '24px', fontWeight: 600, color: textColor, margin: 0 }}>{t('تغيير كلمة المرور')}</h1>
                    </div>
                    <p style={{ fontSize: '13px', color: subColor }}>{t('يفضل اختيار كلمة مرور قوية تحتوي على أحرف وأرقام لضمان أمان حسابك')}</p>
                </div>

                {/* Form Card */}
                <div style={{ 
                    background: 'var(--c-auth-card-bg, #fff)', 
                    backdropFilter: 'var(--c-auth-card-blur)', 
                    border: 'var(--c-auth-card-border)', 
                    borderRadius: '20px', 
                    padding: '30px', 
                    boxShadow: 'var(--c-auth-card-shadow)',
                    position: 'relative',
                    zIndex: 10
                }}>

                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: textColor, paddingInlineEnd: '4px' }}>{t('كلمة المرور الحالية')}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPasswords.old ? 'text' : 'password'}
                                    value={form.oldPassword}
                                    onChange={e => setForm(p => ({ ...p, oldPassword: e.target.value }))}
                                    required
                                    style={{ 
                                        width: '100%', 
                                        paddingBlock: '12px',
                                        paddingInlineStart: '45px',
                                        paddingInlineEnd: '14px',
                                        background: 'var(--c-input-bg)', 
                                        border: '1px solid var(--c-border)', 
                                        borderRadius: '12px', 
                                        color: textColor, 
                                        fontSize: '13px', 
                                        boxSizing: 'border-box', 
                                        outline: 'none', 
                                        transition: 'all 0.2s' 
                                    }}
                                />
                                <button type="button" onClick={() => togglePass('old')} style={{ position: 'absolute', top: '13px', insetInlineStart: '14px', background: 'none', border: 'none', color: isLight ? '#94a3b8' : 'var(--c-text-muted)', cursor: 'pointer' }}>
                                    {showPasswords.old ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ height: '1px', background: 'var(--c-border)', margin: '5px 0' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: textColor, paddingInlineEnd: '4px' }}>{t('كلمة المرور الجديدة')}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPasswords.new ? 'text' : 'password'}
                                    value={form.newPassword}
                                    onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
                                    required
                                    style={{ 
                                        width: '100%', 
                                        paddingBlock: '12px',
                                        paddingInlineStart: '45px',
                                        paddingInlineEnd: '14px',
                                        background: 'var(--c-input-bg)', 
                                        border: '1px solid var(--c-border)', 
                                        borderRadius: '12px', 
                                        color: textColor, 
                                        fontSize: '13px', 
                                        boxSizing: 'border-box', 
                                        outline: 'none', 
                                        transition: 'all 0.2s' 
                                    }}
                                />
                                <button type="button" onClick={() => togglePass('new')} style={{ position: 'absolute', top: '13px', insetInlineStart: '14px', background: 'none', border: 'none', color: isLight ? '#94a3b8' : 'var(--c-text-muted)', cursor: 'pointer' }}>
                                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: textColor, paddingInlineEnd: '4px' }}>{t('تأكيد كلمة المرور الجديدة')}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    value={form.confirmPassword}
                                    onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                    required
                                    style={{ 
                                        width: '100%', 
                                        paddingBlock: '12px',
                                        paddingInlineStart: '45px',
                                        paddingInlineEnd: '14px',
                                        background: 'var(--c-input-bg)', 
                                        border: '1px solid var(--c-border)', 
                                        borderRadius: '12px', 
                                        color: textColor, 
                                        fontSize: '13px', 
                                        boxSizing: 'border-box', 
                                        outline: 'none', 
                                        transition: 'all 0.2s' 
                                    }}
                                />
                                <button type="button" onClick={() => togglePass('confirm')} style={{ position: 'absolute', top: '13px', insetInlineStart: '14px', background: 'none', border: 'none', color: isLight ? '#94a3b8' : 'var(--c-text-muted)', cursor: 'pointer' }}>
                                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{ 
                                margin: '15px 0 0', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '10px', 
                                padding: '14px', 
                                borderRadius: '12px', 
                                background: 'linear-gradient(135deg, var(--c-primary), var(--c-primary-hover))', 
                                border: 'none', 
                                color: '#fff', 
                                fontSize: '13px', 
                                fontWeight: 600, 
                                cursor: 'pointer', 
                                transition: 'all 0.2s', 
                                boxShadow: '0 8px 16px var(--c-primary-bg)' 
                            }}
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={20} />}
                            {isSaving ? t('جاري الحفظ...') : t('تغيير كلمة المرور الآن')}
                        </button>

                    </form>
                </div>

                {/* Status Box */}
                <div style={{ display: 'flex', gap: '12px', padding: '16px', background: 'var(--c-success-bg)', border: '1px solid var(--c-success-border)', borderRadius: '15px', marginTop: '24px' }}>
                    <ShieldCheck size={20} style={{ color: 'var(--c-success)', flexShrink: 0 }} />
                    <div style={{ fontSize: '13px', color: isLight ? '#475569' : 'var(--c-text-secondary)', lineHeight: 1.6 }}>
                        {t('سيتم تحديث سجل الأمان الخاص بك فور تغيير كلمة المرور. تأكد من عدم مشاركتها مع أي شخص آخر.')}
                    </div>
                </div>

                {/* Toast Notification */}
                {toast && (
                    <div style={{ position: 'fixed', bottom: '30px', insetInlineStart: '30px', padding: '12px 24px', borderRadius: '12px', background: toast.type === 'success' ? 'var(--c-success)' : 'var(--c-danger)', color: '#fff', boxShadow: 'var(--c-auth-card-shadow)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2000, animation: 'fadeUp 0.3s ease' }}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        {toast.msg}
                    </div>
                )}

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
                    .animate-spin { animation: spin 1s linear infinite; }
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
