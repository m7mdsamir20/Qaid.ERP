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

export default function ProfilePage() {
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
                // We pass the new values explicitly to the trigger to update the JWT and Session.
                await update({
                    user: {
                        ...session?.user,
                        name: form.name,
                        email: form.email,
                        gender: form.gender,
                        avatar: form.avatar,
                    }
                });

                showToast('تم تحديث البيانات بنجاح');
                setIsEditMode(false);

                // Force a small delay then refresh if needed, but update() should handle it.
                // router.refresh(); // Optional fallback if UI is stubborn
            } else {
                const data = await res.json();
                showToast(data.error || 'فشل تحديث البيانات', 'error');
            }
        } catch (error) {
            showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b', gap: '10px' }}>
                <Loader2 className="animate-spin" size={24} /> جاري التحميل...
            </div>
        </DashboardLayout>
    );

    const roleLabel: Record<string, string> = {
        admin: 'مدير النظام',
        accountant: 'محاسب',
        sales: 'مبيعات',
        storekeeper: 'أمين مستودع',
    };

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 0', fontFamily: "'Cairo', sans-serif" }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h1 className="page-title">الملف الشخصي</h1>
                        <p className="page-subtitle">عرض وإدارة بياناتك الشخصية في النظام</p>
                    </div>
                </div>

                {/* Profile Card */}
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>

                    {/* Cover Photo Placeholder */}
                    <div style={{ height: '140px', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', position: 'relative' }}>
                        {/* Avatar */}
                        <div style={{ position: 'absolute', bottom: '-40px', right: '40px', width: '110px', height: '110px', borderRadius: '30px', background: '#0f172a', border: '5px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                            <Avatar id={form.avatar} size={110} />
                        </div>
                    </div>

                    <div style={{ padding: '60px 40px 40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#f8fafc', margin: 0 }}>{session?.user?.name}</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '8px', color: '#94a3b8', fontSize: '14px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}><Shield size={12} /> {roleLabel[session?.user?.role || 'user']}</span>
                                    <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.1)' }} />
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Mail size={14} /> {session?.user?.email}</span>
                                </div>
                            </div>

                            <button onClick={() => isEditMode ? handleSave() : setIsEditMode(true)} disabled={isSaving}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: isEditMode ? '#10b981' : 'rgba(255,255,255,0.05)', border: isEditMode ? 'none' : '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: isEditMode ? '0 4px 15px rgba(16,185,129,0.3)' : 'none' }}>
                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : (isEditMode ? <Save size={16} /> : <Edit3 size={16} />)}
                                {isEditMode ? 'حفظ التغييرات' : 'تعديل الملف'}
                            </button>
                        </div>

                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '40px 0' }} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
                            {/* Form side */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', paddingRight: '4px' }}>الاسم الكامل</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={16} style={{ position: 'absolute', top: '12px', right: '14px', color: '#6366f1' }} />
                                        <input
                                            readOnly={!isEditMode}
                                            value={form.name}
                                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                            style={{ width: '100%', padding: '10px 40px 10px 14px', background: isEditMode ? 'rgba(255,255,255,0.03)' : 'transparent', border: isEditMode ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent', borderRadius: '10px', color: '#e2e8f0', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', paddingRight: '4px' }}>البريد الإلكتروني</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={16} style={{ position: 'absolute', top: '12px', right: '14px', color: '#6366f1' }} />
                                        <input
                                            readOnly={!isEditMode}
                                            value={form.email}
                                            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                            style={{ width: '100%', padding: '10px 40px 10px 14px', background: isEditMode ? 'rgba(255,255,255,0.03)' : 'transparent', border: isEditMode ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent', borderRadius: '10px', color: '#e2e8f0', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', paddingRight: '4px' }}>رقم الهاتف</label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={16} style={{ position: 'absolute', top: '12px', right: '14px', color: '#6366f1' }} />
                                        <input
                                            readOnly={!isEditMode}
                                            value={form.phone}
                                            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                            placeholder="لا يوجد"
                                            style={{ width: '100%', padding: '10px 40px 10px 14px', background: isEditMode ? 'rgba(255,255,255,0.03)' : 'transparent', border: isEditMode ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent', borderRadius: '10px', color: '#e2e8f0', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Avatar selector side */}
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Grid size={16} color="#6366f1" /> اختر الأفاتار المفضل
                                </h3>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(6, 1fr)',
                                    gap: '10px',
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.05)'
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
                                                    boxShadow: form.avatar === opt.id ? `0 0 20px rgba(99,102,241,0.4)` : 'none',
                                                    border: form.avatar === opt.id ? '3px solid #818cf8' : '2px solid rgba(255,255,255,0.1)'
                                                }}
                                            />
                                            {form.avatar === opt.id && (
                                                <div style={{ position: 'absolute', top: '-4px', left: '-4px', background: '#10b981', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0f172a' }}>
                                                    <Check size={10} color="#fff" />
                                                </div>
                                            )}
                                            {/* <span style={{ fontSize: '9px', color: '#64748b' }}>{opt.label}</span> */}
                                        </button>
                                    ))}
                                </div>

                                {isEditMode && (
                                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '12px', textAlign: 'center' }}>
                                        انقر على الأفاتار الذي يشبهك لتغيير مظهرك في النظام
                                    </p>
                                )}
                            </div>
                        </div>

                        {isEditMode && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '40px', gap: '10px' }}>
                                <button onClick={() => setIsEditMode(false)}
                                    style={{ padding: '10px 24px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', color: '#f87171', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                                    إلغاء
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Additional Sidebar Info */}

                {/* Toast Notification */}
                {toast && (
                    <div style={{ position: 'fixed', bottom: '30px', left: '30px', padding: '14px 28px', borderRadius: '15px', background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 2000, animation: 'fadeLeft 0.3s ease' }}>
                        {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <span style={{ fontWeight: 700 }}>{toast.msg}</span>
                    </div>
                )}

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
                    .animate-spin { animation: spin 1s linear infinite; }
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    @keyframes fadeLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
