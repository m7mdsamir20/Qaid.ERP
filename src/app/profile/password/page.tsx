'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import {
    KeyRound, Lock, Eye, EyeOff, Save, Loader2,
    CheckCircle2, AlertCircle, ShieldCheck
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function ChangePasswordPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
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
            showToast('كلمة المرور الجديدة غير متطابقة', 'error');
            return;
        }

        if (form.newPassword.length < 6) {
            showToast('يجب أن تكون كلمة المرور 6 أحرف على الأقل', 'error');
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
                showToast('تم تغيير كلمة المرور بنجاح ✓');
                setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                const data = await res.json();
                showToast(data.error || 'فشل تغيير كلمة المرور', 'error');
            }
        } catch (error) {
            showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const togglePass = (key: keyof typeof showPasswords) => {
        setShowPasswords(p => ({ ...p, [key]: !p[key] }));
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ maxWidth: '600px', margin: '0 auto', padding: '20px 0', fontFamily: "'Cairo', sans-serif" }}>

                {/* Header */}
                <div style={{ marginBottom: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ padding: '10px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', borderRadius: '12px' }}>
                            <Lock size={24} />
                        </div>
                        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#f1f5f9', margin: 0 }}>تغيير كلمة المرور</h1>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b' }}>يفضل اختيار كلمة مرور قوية تحتوي على أحرف وأرقام لضمان أمان حسابك</p>
                </div>

                {/* Form Card */}
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '30px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>

                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', paddingInlineEnd: '4px' }}>كلمة المرور الحالية</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPasswords.old ? 'text' : 'password'}
                                    value={form.oldPassword}
                                    onChange={e => setForm(p => ({ ...p, oldPassword: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '12px 14px 12px 45px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                                    onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                                <button type="button" onClick={() => togglePass('old')} style={{ position: 'absolute', top: '13px', insetInlineStart: '14px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                                    {showPasswords.old ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '5px 0' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', paddingInlineEnd: '4px' }}>كلمة المرور الجديدة</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPasswords.new ? 'text' : 'password'}
                                    value={form.newPassword}
                                    onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '12px 14px 12px 45px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                                    onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                                <button type="button" onClick={() => togglePass('new')} style={{ position: 'absolute', top: '13px', insetInlineStart: '14px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', paddingInlineEnd: '4px' }}>تأكيد كلمة المرور الجديدة</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    value={form.confirmPassword}
                                    onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                    required
                                    style={{ width: '100%', padding: '12px 14px 12px 45px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f1f5f9', fontSize: '14px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
                                    onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                                <button type="button" onClick={() => togglePass('confirm')} style={{ position: 'absolute', top: '13px', insetInlineStart: '14px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{ margin: '15px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #4338ca)', border: 'none', color: '#fff', fontSize: '16px', fontWeight: 800, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 8px 16px rgba(99,102,241,0.2)' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 20px rgba(99,102,241,0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(99,102,241,0.2)'; }}
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={20} />}
                            {isSaving ? 'جاري الحفظ...' : 'تغيير كلمة المرور الآن'}
                        </button>

                    </form>
                </div>

                {/* Status Box */}
                <div style={{ display: 'flex', gap: '12px', padding: '16px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '15px', marginTop: '24px' }}>
                    <ShieldCheck size={20} style={{ color: '#10b981', flexShrink: 0 }} />
                    <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
                        سيتم تحديث سجل الأمان الخاص بك فور تغيير كلمة المرور. تأكد من عدم مشاركتها مع أي شخص آخر.
                    </div>
                </div>

                {/* Toast Notification */}
                {toast && (
                    <div style={{ position: 'fixed', bottom: '30px', insetInlineStart: '30px', padding: '12px 24px', borderRadius: '12px', background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2000 }}>
                        {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        {toast.msg}
                    </div>
                )}

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
                    .animate-spin { animation: spin 1s linear infinite; }
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
