'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import {
    User, Mail, Phone, Shield, Calendar,
    Edit3, Save, X, Loader2, CheckCircle2,
    AlertCircle, Camera, Building2, MapPin,
    Grid,
    Check
} from 'lucide-react';
import { Avatar, AVATAR_OPTIONS } from '@/components/UserAvatar';
import { useTranslation } from '@/lib/i18n';
import { useTheme } from '@/components/Providers';

export default function ProfilePage() {
    const { lang, t } = useTranslation();
    const { theme } = useTheme();
    const isRtl = lang === 'ar';
    const isLight = theme === 'light';
    const { data: session, update } = useSession();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        gender: 'male',
        avatar: 'm1'
    });

    useEffect(() => {
        if (session?.user) {
            setForm({
                name: session.user.name || '',
                email: session.user.email || '',
                phone: (session.user as any).phone || '',
                gender: (session.user as any).gender || 'male',
                avatar: (session.user as any).avatar || 'm1',
            });
            setLoading(false);
        }
    }, [session]);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                const result = await res.json();

                // Important: NextAuth update() trigger. 
                await update({
                    user: {
                        ...session?.user,
                        name: form.name,
                        email: form.email,
                        gender: form.gender,
                        avatar: form.avatar,
                    }
                });

                showToast(t('تم تحديث البيانات بنجاح'));
                setIsEditMode(false);
            } else {
                const data = await res.json();
                showToast(data.error || t('فشل تحديث البيانات'), 'error');
            }
        } catch (error) {
            showToast(t('حدث خطأ أثناء الاتصال بالخادم'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--c-text-secondary)', gap: '10px' }}>
                <Loader2 className="animate-spin" size={24} /> {t('جاري التحميل...')}
            </div>
        </DashboardLayout>
    );

    const roles: Record<string, string> = {
        admin: 'مدير النظام',
        accountant: 'محاسب',
        sales: 'مندوب مبيعات',
        storekeeper: 'أمين مستودع',
        user: 'مستخدم'
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 0', fontFamily: "'Cairo', sans-serif" }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h1 className="page-title" style={{ color: theme === 'light' ? '#1e293b' : 'var(--c-text-primary)' }}>{t('الملف الشخصي')}</h1>
                        <p className="page-subtitle">{t('عرض وإدارة بياناتك الشخصية في النظام')}</p>
                    </div>
                </div>

                {/* Profile Card */}
                <div style={{ 
                    background: 'var(--c-auth-card-bg)', 
                    backdropFilter: 'var(--c-auth-card-blur)', 
                    border: 'var(--c-auth-card-border)', 
                    borderRadius: '24px', 
                    overflow: 'hidden', 
                    boxShadow: 'var(--c-auth-card-shadow)' 
                }}>

                    <div style={{ padding: '16px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        {/* Avatar */}
                        <div style={{ 
                            width: '80px', 
                            height: '80px', 
                            borderRadius: '24px', 
                            background: 'var(--c-card)', 
                            border: '3px solid var(--c-primary-border)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            overflow: 'hidden', 
                            boxShadow: '0 6px 20px var(--c-shadow)',
                            marginBottom: '12px'
                        }}>
                            <Avatar id={form.avatar} size={80} />
                        </div>

                        <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--c-text-primary)', margin: 0 }}>{session?.user?.name}</h2>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '6px', color: 'var(--c-text-secondary)', fontSize: '12px', flexWrap: 'wrap' }}>
                            <span style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '5px', 
                                background: 'var(--c-primary-bg)', 
                                color: 'var(--c-primary)', 
                                padding: '2px 8px', 
                                borderRadius: '20px', 
                                fontSize: '10px', 
                                fontWeight: 700 
                            }}>
                                <Shield size={12} /> {t(roles[session?.user?.role || 'user'])}
                            </span>
                            <span style={{ width: '1px', height: '10px', background: 'var(--c-border)' }} />
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Mail size={12} /> {session?.user?.email}
                            </span>
                        </div>

                        <div style={{ marginTop: '12px' }}>
                            <button onClick={() => isEditMode ? handleSave() : setIsEditMode(true)} disabled={isSaving}
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    padding: '8px 20px', 
                                    borderRadius: '8px', 
                                    background: isEditMode ? 'var(--c-success)' : 'var(--c-hover)', 
                                    border: isEditMode ? 'none' : '1px solid var(--c-border)', 
                                    color: isEditMode ? '#fff' : 'var(--c-text-primary)', 
                                    fontSize: '12px', 
                                    fontWeight: 700, 
                                    cursor: 'pointer', 
                                    transition: 'all 0.2s', 
                                    boxShadow: isEditMode ? '0 4px 15px var(--c-success-bg)' : 'none' 
                                }}>
                                {isSaving ? <Loader2 className="animate-spin" size={12} /> : (isEditMode ? <Save size={12} /> : <Edit3 size={12} />)}
                                <span>{isEditMode ? t('حفظ التعديلات') : t('تعديل الملف')}</span>
                            </button>
                        </div>
                    </div>

                    <div style={{ height: '1px', background: 'var(--c-border)', margin: '0 40px' }} />

                    <div style={{ padding: '40px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
                            {/* Form side */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--c-text-secondary)', [isRtl ? 'paddingRight' : 'paddingLeft']: '4px' }}>{t('الاسم الكامل')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={16} style={{ position: 'absolute', top: '12px', [isRtl ? 'right' : 'left']: '14px', color: 'var(--c-primary)' }} />
                                        <input
                                            readOnly={!isEditMode}
                                            value={form.name}
                                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                            style={{ 
                                                width: '100%', 
                                                paddingBlock: '10px', 
                                                [isRtl ? 'paddingRight' : 'paddingLeft']: '40px', 
                                                [isRtl ? 'paddingLeft' : 'paddingRight']: '14px', 
                                                background: isEditMode ? 'var(--c-input-bg)' : 'transparent', 
                                                border: isEditMode ? '1px solid var(--c-primary-border)' : '1px solid transparent', 
                                                borderRadius: '12px', 
                                                color: 'var(--c-text-primary)', 
                                                fontSize: '14px', 
                                                boxSizing: 'border-box', 
                                                outline: 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--c-text-secondary)', [isRtl ? 'paddingRight' : 'paddingLeft']: '4px' }}>{t('البريد الإلكتروني')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={16} style={{ position: 'absolute', top: '12px', [isRtl ? 'right' : 'left']: '14px', color: 'var(--c-primary)' }} />
                                        <input
                                            readOnly={!isEditMode}
                                            value={form.email}
                                            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                            style={{ 
                                                width: '100%', 
                                                paddingBlock: '10px', 
                                                [isRtl ? 'paddingRight' : 'paddingLeft']: '40px', 
                                                [isRtl ? 'paddingLeft' : 'paddingRight']: '14px', 
                                                background: isEditMode ? 'var(--c-input-bg)' : 'transparent', 
                                                border: isEditMode ? '1px solid var(--c-primary-border)' : '1px solid transparent', 
                                                borderRadius: '12px', 
                                                color: 'var(--c-text-primary)', 
                                                fontSize: '14px', 
                                                boxSizing: 'border-box', 
                                                outline: 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--c-text-secondary)', [isRtl ? 'paddingRight' : 'paddingLeft']: '4px' }}>{t('رقم الهاتف')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={16} style={{ position: 'absolute', top: '12px', [isRtl ? 'right' : 'left']: '14px', color: 'var(--c-primary)' }} />
                                        <input
                                            readOnly={!isEditMode}
                                            value={form.phone}
                                            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                            placeholder={t('لا يوجد')}
                                            style={{ 
                                                width: '100%', 
                                                paddingBlock: '10px', 
                                                [isRtl ? 'paddingRight' : 'paddingLeft']: '40px', 
                                                [isRtl ? 'paddingLeft' : 'paddingRight']: '14px', 
                                                background: isEditMode ? 'var(--c-input-bg)' : 'transparent', 
                                                border: isEditMode ? '1px solid var(--c-primary-border)' : '1px solid transparent', 
                                                borderRadius: '12px', 
                                                color: 'var(--c-text-primary)', 
                                                fontSize: '14px', 
                                                boxSizing: 'border-box', 
                                                outline: 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Avatar selector side */}
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--c-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Grid size={16} color="var(--c-primary)" /> {t('اختر الأفاتار المفضل')}
                                </h3>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(6, 1fr)',
                                    gap: '10px',
                                    padding: '16px',
                                    background: 'var(--c-hover)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--c-border)'
                                }}>
                                    {AVATAR_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            disabled={!isEditMode}
                                            onClick={() => setForm(p => ({ ...p, avatar: opt.id, gender: opt.gender }))}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                cursor: isEditMode ? 'pointer' : 'default',
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s',
                                                transform: form.avatar === opt.id ? 'scale(1.1)' : 'scale(1)',
                                                opacity: !isEditMode && form.avatar !== opt.id ? 0.4 : 1
                                            }}
                                        >
                                            <Avatar
                                                id={opt.id}
                                                size={55}
                                                style={{
                                                    boxShadow: form.avatar === opt.id ? `0 0 20px var(--c-primary-bg)` : 'none',
                                                    border: form.avatar === opt.id ? '3px solid var(--c-primary)' : '2px solid var(--c-border)'
                                                }}
                                            />
                                            {form.avatar === opt.id && (
                                                <div style={{ position: 'absolute', top: '-4px', [isRtl ? 'right' : 'left']: '-4px', background: 'var(--c-success)', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--c-card)' }}>
                                                    <Check size={10} color="#fff" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {isEditMode && (
                                    <p style={{ fontSize: '11px', color: 'var(--c-text-muted)', marginTop: '12px', textAlign: 'center' }}>
                                        {t('انقر على الأفاتار الذي يشبهك لتغيير مظهرك في النظام')}
                                    </p>
                                )}
                            </div>
                        </div>

                        {isEditMode && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '40px', gap: '10px' }}>
                                <button onClick={() => setIsEditMode(false)}
                                    style={{ 
                                        padding: '10px 24px', 
                                        background: 'var(--c-danger-bg)', 
                                        border: '1px solid var(--c-danger-border)', 
                                        borderRadius: '12px', 
                                        color: 'var(--c-danger)', 
                                        fontSize: '14px', 
                                        fontWeight: 700, 
                                        cursor: 'pointer' 
                                    }}>
                                    {t('إلغاء')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Toast Notification */}
                {toast && (
                    <div style={{ position: 'fixed', bottom: '30px', [isRtl ? 'right' : 'left']: '30px', padding: '14px 28px', borderRadius: '15px', background: toast.type === 'success' ? 'var(--c-success)' : 'var(--c-danger)', color: '#fff', boxShadow: '0 10px 40px var(--c-shadow)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 2000, animation: 'fadeLeft 0.3s ease' }}>
                        {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <span style={{ fontWeight: 700 }}>{toast.msg}</span>
                    </div>
                )}

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
                    .animate-spin { animation: spin 1s linear infinite; }
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    @keyframes fadeLeft { from { opacity: 0; transform: ${isRtl ? 'translateX(20px)' : 'translateX(-20px)'}; } to { opacity: 1; transform: translateX(0); } }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
