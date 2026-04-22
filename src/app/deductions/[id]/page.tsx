'use client';
import { C } from '@/constants/theme';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Calendar, User, Banknote, ArrowRight, ArrowLeft, Loader2, Trash2, CheckCircle2, Clock, FileText, ShieldAlert, AlertTriangle } from 'lucide-react';
import AppModal from '@/components/AppModal';

interface Employee { id: string; name: string; code: string; }
interface Deduction {
    id: string;
    date: string;
    amount: number;
    reason: string | null;
    status: string;
    employee: Employee;
}

export default function DeductionDetailPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const [deduction, setDeduction] = useState<Deduction | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchDeduction = async () => {
            try {
                const res = await fetch(`/api/deductions/${id}`);
                if (res.ok) setDeduction(await res.json());
                else {
                    alert(t('عذراً، تعذر العثور على بيانات الخصم'));
                    router.push('/deductions');
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchDeduction();
    }, [id, router]);

    const handleUpdateStatus = async (newStatus: string) => {
        setIsUpdating(true);
        try {
            const res = await fetch(`/api/deductions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) setDeduction(await res.json());
            else alert(t('فشل في تحديث حالة الخصم'));
        } catch (e) { console.error(e); }
        finally { setIsUpdating(false); }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/deductions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setShowDeleteModal(false);
                router.push('/deductions');
            } else {
                alert(t('فشل في حذف الخصم'));
            }
        } catch (e) { 
            console.error(e); 
        } finally { 
            setIsDeleting(false); 
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: '#256af4' }} />
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </DashboardLayout>
        );
    }

    if (!deduction) return null;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button onClick={() => router.push('/deductions')} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}>
                            {isRtl ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                        </button>
                        <div>
                            <h1 className="page-title">{t('تفاصيل الخصم / الجزاء')}</h1>
                            <p className="page-subtitle">{t('عرض وتحليل بيانات الخصم الإداري المسجل على الموظف')}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {deduction.status === 'pending' && (
                            <button 
                                onClick={() => handleUpdateStatus('deducted')} 
                                disabled={isUpdating}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '36px', padding: '0 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #256af4, #256af4)', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: isUpdating ? 'wait' : 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                            >
                                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} {t('اعتماد الخصم')}
                            </button>
                        )}
                        <button onClick={() => setShowDeleteModal(true)} disabled={isDeleting} style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '36px', padding: '0 16px', borderRadius: '8px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '12px', fontWeight: 700, cursor: isDeleting ? 'wait' : 'pointer' }}>
                            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {t('حذف الخصم')}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ background: 'var(--surface-800)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ color: '#256af4' }}><ShieldAlert size={20} /></div>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>{t('بيانات الخصم')}</h3>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>{t('تاريخ الخصم')}</label>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={14} style={{ color: C.primary }} /> {new Date(deduction.date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>{t('مبلغ الخصم')}</label>
                                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#256af4' }} dir="ltr">
                                        {deduction.amount.toLocaleString('en-US')} <span style={{ fontSize: '12px' }}></span>
                                    </div>
                                </div>
                                <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>{t('السبب / الملاحظات')}</label>
                                    <div style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                        {deduction.reason || t('لا يوجد سبب مسجل')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ padding: '24px', borderRadius: '20px', background: 'var(--surface-800)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(37, 106, 244,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#256af4', margin: '0 auto 16px' }}>
                                <User size={30} />
                            </div>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#fff' }}>{deduction.employee.name}</h2>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6366f1', fontWeight: 700 }}>{deduction.employee.code}</p>
                            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '16px 0' }} />
                            <button onClick={() => router.push(`/employees/${deduction.employee.id}`)} style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f1f5f9'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
                                {t('عرض ملف الموظف')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <AppModal
                show={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title={t("تأكيد حذف الخصم")}
                itemName={`${t('هذا الخصم الخاص بـ')} ${deduction.employee.name}`}
                isDelete={true}
                isSubmitting={isDeleting}
            />
        </DashboardLayout>
    );
}
