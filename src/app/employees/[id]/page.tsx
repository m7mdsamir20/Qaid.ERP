'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    UsersIcon, Briefcase, Building2,
    CreditCard, Paperclip, Eye, Pencil,
    ArrowRight, Phone, Mail, MapPin, 
    Calendar, ShieldCheck, Landmark,
    FileText, User, Download, ExternalLink,
    AlertCircle, Printer, CheckCircle2,
    ChevronLeft
} from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import PageHeader from '@/components/PageHeader';
import { THEME, C, CAIRO, INTER, PAGE_BASE } from '@/constants/theme';

/* ── Types ── */
interface Department { id: string; name: string; }
interface Attachment { name: string; url: string; }

interface Employee {
    id: string; code: string; name: string;
    phone: string | null; email: string | null;
    nationalId: string | null; birthDate: string | null;
    gender: string | null; address: string | null;
    position: string | null; hireDate: string;
    basicSalary: number;
    housingAllowance: number; transportAllowance: number; foodAllowance: number;
    insuranceDeduction: number; taxDeduction: number;
    bankName: string | null; bankAccount: string | null;
    attachments: Attachment[];
    department?: Department;
}

/* ══════════════════════════════════════════ */
export default function EmployeeDetailPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { symbol: currencySymbol } = useCurrency();
    const params = useParams();
    const id = params.id as string;
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const fetchEmp = async () => {
            try {
                const res = await fetch(`/api/employees/${id}`);
                if (res.ok) setEmployee(await res.json());
                else {
                    alert('عذراً، تعذر العثور على بيانات الموظف');
                    router.push('/employees');
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchEmp();
    }, [id, router]);

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.textMuted }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '48px', height: '48px', border: `4px solid ${C.primaryBg}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                        <span style={{ fontSize: '15px', fontWeight: 800 }}>جاري استرجاع الملف الشخصي للموظف...</span>
                    </div>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </DashboardLayout>
        );
    }

    if (!employee) return null;

    const allowances = (employee.housingAllowance || 0) + (employee.transportAllowance || 0) + (employee.foodAllowance || 0);
    const deductions = (employee.insuranceDeduction || 0) + (employee.taxDeduction || 0);
    const net = employee.basicSalary + allowances - deductions;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, fontFamily: CAIRO }}>
                
                {/* Custom Page Header */}
                <PageHeader 
                    title="ملف الموظف" 
                    subtitle={`عرض البيانات الوظيفية للموظف: ${employee.name}`}
                    icon={User}
                    backUrl="/employees"
                    primaryButton={{
                        label: 'تعديل الملف',
                        onClick: () => router.push(`/employees/${id}/edit`),
                        icon: Pencil
                    }}
                    actions={[
                        <button 
                            key="print-btn"
                            onClick={() => window.print()}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 20px', borderRadius: '14px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', color: C.textSecondary, fontSize: '13px', fontWeight: 800, cursor: 'pointer', transition: '0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = C.textSecondary; }}
                        >
                            <Printer size={18} /> طباعة
                        </button>
                    ]}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '24px', alignItems: 'start' }}>
                    
                    {/* Left Column / Main Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Summary Stats Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                            <StatCard icon={ShieldCheck} label="كود الموظف" value={employee.code} color={C.primary} family={INTER} />
                            <StatCard icon={Briefcase} label="المسمى الوظيفي" value={employee.position || '—'} color="#8b5cf6" />
                            <StatCard icon={Building2} label="القسم الإداري" value={employee.department?.name || 'غير محدد'} color="#f59e0b" />
                        </div>

                        {/* Personal Details */}
                        <ProfileSection title="البيانات الشخصية" icon={User} color={C.primary}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                                <InfoItem label="الرقم القومي" value={employee.nationalId} icon={ShieldCheck} family={INTER} />
                                <InfoItem label="تاريخ الميلاد" value={employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('en-GB') : '—'} icon={Calendar} />
                                <InfoItem label="الجنس" value={employee.gender === 'male' ? 'ذكر' : employee.gender === 'female' ? 'أنثى' : '—'} icon={User} />
                                <InfoItem label="تاريخ التعيين" value={new Date(employee.hireDate).toLocaleDateString('en-GB')} icon={FileText} />
                                <InfoItem label="رقم الهاتف" value={employee.phone} icon={Phone} family={INTER} />
                                <InfoItem label="البريد الإلكتروني" value={employee.email} icon={Mail} family={INTER} />
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <InfoItem label="العنوان السكني" value={employee.address} icon={MapPin} />
                                </div>
                            </div>
                        </ProfileSection>

                        {/* Finance & Salary */}
                        <ProfileSection title="الأجور والبيانات المالية" icon={CreditCard} color="#10b981">
                            <div style={{ 
                                background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)', 
                                border: '1px solid rgba(16,185,129,0.15)', 
                                padding: '24px', 
                                borderRadius: '18px', 
                                marginBottom: '24px', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                position: 'relative', 
                                overflow: 'hidden' 
                            }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 900, marginBottom: '8px', opacity: 0.8 }}>صافي الراتب المتوقع</div>
                                    <div style={{ fontSize: '24px', fontWeight: 950, color: '#fff', fontFamily: INTER }} dir="ltr">
                                        <span style={{ fontSize: '16px', color: C.textMuted, marginInlineEnd: '8px' }}>{currencySymbol}</span>
                                        {net.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'end', zIndex: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <SummaryRow label="الراتب الأساسي" value={employee.basicSalary} color={C.textPrimary} unit={currencySymbol} />
                                        <SummaryRow label="إجمالي البدلات" value={allowances} color="#10b981" prefix="+" unit={currencySymbol} />
                                        <SummaryRow label="إجمالي الاستقطاعات" value={deductions} color={THEME.colors.danger} prefix="-" unit={currencySymbol} />
                                    </div>
                                </div>
                                <CreditCard size={120} style={{ position: 'absolute', left: -20, top: -20, opacity: 0.04, transform: 'rotate(-15deg)', pointerEvents: 'none' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <InfoItem label="البنك المعتمد" value={employee.bankName} icon={Landmark} />
                                <InfoItem label="رقم الحساب / IBAN" value={employee.bankAccount} icon={CreditCard} family={INTER} />
                            </div>
                        </ProfileSection>
                    </div>

                    {/* Right Column / Quick Actions */}
                    <aside style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Status Card */}
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '25px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: C.primary }}>
                                <User size={40} />
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 950, color: '#fff', margin: '0 0 6px' }}>{employee.name}</h2>
                            <p style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 700, margin: '0 0 20px' }}>{employee.position}</p>
                            
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '20px 0' }} />
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: C.textMuted, fontWeight: 800 }}>الحالة الوظيفية</span>
                                    <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '11px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> نشط
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: C.textMuted, fontWeight: 800 }}>تاريخ الانضمام</span>
                                    <span style={{ fontSize: '12px', color: '#fff', fontWeight: 800, fontFamily: INTER }}>{new Date(employee.hireDate).getFullYear()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Attachments Card */}
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                                <Paperclip size={18} style={{ color: C.blue }} />
                                <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff' }}>ملف المرفقات</span>
                            </div>
                            {employee.attachments?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {employee.attachments.map((a, i) => (
                                        <a 
                                            key={i} href={a.url} target="_blank" rel="noreferrer"
                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, textDecoration: 'none', transition: '0.2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = C.blue; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = C.border; }}
                                        >
                                            <FileText size={20} style={{ color: C.blue }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '12px', color: '#f1f5f9', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                                                <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 600 }}>{a.name.split('.').pop()?.toUpperCase()}</div>
                                            </div>
                                            <ExternalLink size={14} style={{ color: C.textMuted }} />
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '24px', color: C.textMuted, background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: `1px dashed ${C.border}` }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700 }}>لا توجد مرفقات</div>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
            <style jsx global>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}

/* ── UI Components ── */
function StatCard({ icon: Icon, label, value, color, family }: any) {
    return (
        <div style={{ 
            background: `${color}08`, border: `1px solid ${color}33`, borderRadius: '12px',
            padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
        }}>
            <div style={{ textAlign: 'start' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', whiteSpace: 'nowrap' }}>{label}</p>
                <div style={{ fontSize: '15px', fontWeight: 800, color: C.textPrimary, fontFamily: family }}>{value}</div>
            </div>
            <div style={{ 
                width: '38px', height: '38px', borderRadius: '10px', 
                background: `${color}15`, border: `1px solid ${color}30`, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', color 
            }}>
                <Icon size={18} />
            </div>
        </div>
    );
}

function ProfileSection({ title, icon: Icon, color, children }: any) {
    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 30px -15px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: `${color}10` }}><Icon size={15} /></div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#fff' }}>{title}</h3>
            </div>
            <div style={{ padding: '24px' }}>{children}</div>
        </div>
    );
}

function InfoItem({ label, value, icon: Icon, family }: any) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: `1px solid ${C.border}`, transition: '0.2s' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, opacity: 0.8 }}>
                <Icon size={14} />
            </div>
            <div>
                <div style={{ fontSize: '10px', color: C.textMuted, fontWeight: 700, marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '13px', color: '#f1f5f9', fontWeight: 800, fontFamily: family }}>{value || '—'}</div>
            </div>
        </div>
    );
}

function SummaryRow({ label, value, color, prefix = '', unit }: any) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 700 }}>{label}:</span>
            <span style={{ fontSize: '13px', color, fontWeight: 800, fontFamily: INTER }}>
                {prefix} {(+value || 0).toLocaleString('en-US')} <span style={{ fontSize: '10px', opacity: 0.7 }}>{unit}</span>
            </span>
        </div>
    );
}
