'use client';
import { formatNumber } from '@/lib/currency';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import CustomSelect from '@/components/CustomSelect';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCurrency } from '@/hooks/useCurrency';
import { UsersIcon, Briefcase, Building2, CreditCard, Paperclip, X, Upload, Eye, Trash2, Loader2, ChevronDown, ArrowRight, ArrowLeft, Save } from 'lucide-react';

/* ══════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════ */
interface Department { id: string; name: string; }
interface Attachment { name: string; url: string; }

const EMPTY = {
    code: '', name: '', phone: '', email: '',
    nationalId: '', birthDate: '', gender: '', address: '',
    position: '', departmentId: '',
    hireDate: new Date().toISOString().split('T')[0],
    basicSalary: '',
    housingAllowance: '', transportAllowance: '', foodAllowance: '',
    insuranceDeduction: '', taxDeduction: '',
    bankName: '', bankAccount: '',
};

/* ══════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════ */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode; }) {
    return (
        <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
            </label>
            {children}
        </div>
    );
}

function Grid2({ children }: { children: React.ReactNode }) {
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>{children}</div>;
}
function Grid3({ children }: { children: React.ReactNode }) {
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>{children}</div>;
}

/* ══════════════════════════════════════════
   SECTION CARD
   ══════════════════════════════════════════ */
function FormSection({ label, icon: Icon, color, children, description }: {
    label: string; icon: any; color: string; description?: string; children: React.ReactNode;
}) {
    return (
        <div style={{ background: 'var(--surface-800)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                        <Icon size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f1f5f9' }}>{label}</h3>
                        {description && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>{description}</p>}
                    </div>
                </div>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {children}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════
   ATTACHMENT UPLOADER
   ══════════════════════════════════════════ */
function AttachmentUploader({ attachments, onAdd, onRemove }: {
    attachments: Attachment[]; onAdd: (f: Attachment) => void; onRemove: (i: number) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handle = async (file: File) => {
        if (file.size > 10 * 1024 * 1024) { setError('الحجم الأقصى 10MB'); return; }
        setError(''); setUploading(true);
        try {
            const fd = new FormData(); fd.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.url) onAdd({ name: file.name, url: data.url });
            else throw new Error(data.error || 'فشل الرفع');
        } catch (e: any) { setError(e.message); }
        finally { setUploading(false); }
    };

    const icon = (name: string) => {
        const ext = name.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return '🖼️';
        if (ext === 'pdf') return '📄';
        if (['doc', 'docx'].includes(ext || '')) return '📝';
        return '📎';
    };

    return (
        <div>
            <div
                onClick={() => !uploading && inputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
                style={{ border: '2px dashed rgba(99,102,241,0.2)', borderRadius: '14px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: uploading ? 'wait' : 'pointer', background: 'rgba(99,102,241,0.02)', transition: 'all 0.2s' }}
                onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; e.currentTarget.style.background = 'rgba(99,102,241,0.02)'; }}
            >
                {uploading
                    ? <><Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} /><span style={{ fontSize: '14px', color: '#6366f1', fontWeight: 600 }}>جاري الرفع...</span></>
                    : <><div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', marginBottom: '8px' }}><Upload size={24} /></div>
                        <span style={{ fontSize: '15px', color: '#cbd5e1', fontWeight: 600 }}>اسحب الملف هنا أو <span style={{ color: '#818cf8', textDecoration: 'underline' }}>اضغط للاختيار</span></span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>PDF · Word · صور — حتى 10MB</span></>
                }
                <input ref={inputRef} type="file" style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ''; }}
                />
            </div>
            {error && <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>⚠ {error}</p>}
            {attachments.length > 0 && (
                <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {attachments.map((a, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px' }}>
                            <span style={{ fontSize: '24px' }}>{icon(a.name)}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', color: '#f1f5f9', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>تم الرفع بنجاح</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <a href={a.url} target="_blank" rel="noreferrer" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}><Eye size={16} /></a>
                                <button type="button" onClick={() => onRemove(i)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════
   EDIT EMPLOYEE PAGE
   ══════════════════════════════════════════ */
export default function EditEmployeePage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { symbol: cSymbol, fMoneyJSX } = useCurrency();
    const router = useRouter();
    const { id } = useParams();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({ ...EMPTY });
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    const set = (k: keyof typeof EMPTY) => (v: string) => setForm(p => ({ ...p, [k]: v }));

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const [dRes, eRes] = await Promise.all([
                    fetch('/api/departments'),
                    fetch(`/api/employees/${id}`)
                ]);
                
                if (dRes.ok) setDepartments(await dRes.json());
                
                if (eRes.ok) {
                    const emp = await eRes.json();
                    setForm({
                        code: emp.code,
                        name: emp.name,
                        phone: emp.phone || '',
                        email: emp.email || '',
                        nationalId: emp.nationalId || '',
                        birthDate: emp.birthDate ? emp.birthDate.split('T')[0] : '',
                        gender: emp.gender || '',
                        address: emp.address || '',
                        position: emp.position || '',
                        departmentId: emp.departmentId || '',
                        hireDate: emp.hireDate ? emp.hireDate.split('T')[0] : '',
                        basicSalary: String(emp.basicSalary),
                        housingAllowance: String(emp.housingAllowance || ''),
                        transportAllowance: String(emp.transportAllowance || ''),
                        foodAllowance: String(emp.foodAllowance || ''),
                        insuranceDeduction: String(emp.insuranceDeduction || ''),
                        taxDeduction: String(emp.taxDeduction || ''),
                        bankName: emp.bankName || '',
                        bankAccount: emp.bankAccount || '',
                    });
                    setAttachments(emp.attachments || []);
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchContent();
    }, [id]);

    const submit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch(`/api/employees/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, attachments }),
            });
            if (res.ok) {
                router.push('/employees');
                router.refresh();
            } else {
                const d = await res.json();
                alert(d.error || 'فشل في الحفظ');
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ marginInlineEnd: '12px' }}>جاري تحميل بيانات الموظف...</span>
                </div>
            </DashboardLayout>
        );
    }

    const allowances = (+form.housingAllowance || 0) + (+form.transportAllowance || 0) + (+form.foodAllowance || 0);
    const deductions = (+form.insuranceDeduction || 0) + (+form.taxDeduction || 0);
    const net = (+form.basicSalary || 0) + allowances - deductions;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '40px' }}>

                {/* Top Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button type="button" onClick={() => router.push('/employees')}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#e2e8f0'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}>
                            {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />} {t('العودة')}
                        </button>
                        <div>
                            <h1 className="page-title">تعديل بيانات الموظف</h1>
                            <p className="page-subtitle">تحديث الملف الشخصي والبيانات الوظيفية والمالية</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={submit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

                        {/* Main Content Area */}
                        <div>
                            {/* ① شخصية */}
                            <FormSection label="البيانات الشخصية" icon={UsersIcon} color="#256af4" description="المعلومات الأساسية وبيانات التواصل والتعريف">
                                <Grid2>
                                    <Field label="كود الموظف">
                                        <input type="text" className="input" disabled value={form.code} style={{ height: '48px', fontSize: '15px', background: 'rgba(255,255,255,0.02)', color: '#64748b' }} />
                                    </Field>
                                    <Field label="الاسم الرباعي" required>
                                        <input type="text" className="input" required value={form.name} onChange={e => set('name')(e.target.value)} placeholder="محمد أحمد علي محمود" style={{ height: '48px', fontSize: '15px' }} />
                                    </Field>
                                </Grid2>
                                <Grid2>
                                    <Field label="الرقم القومي">
                                        <input type="text" className="input" value={form.nationalId} onChange={e => set('nationalId')(e.target.value)} placeholder="29xxxxxxxxxxxxxxx" maxLength={14} style={{ direction: 'ltr', fontFamily: 'monospace', height: '45px' }} />
                                    </Field>
                                    <Field label="تاريخ الميلاد">
                                        <input type="date" className="input" value={form.birthDate} onChange={e => set('birthDate')(e.target.value)} style={{ height: '45px' }} />
                                    </Field>
                                </Grid2>
                                <Grid2>
                                    <Field label="الجنس">
                                        <select className="input" value={form.gender} onChange={e => set('gender')(e.target.value)} style={{ height: '45px' }}>
                                            <option value="">اختر</option>
                                            <option value="male">ذكر</option>
                                            <option value="female">أنثى</option>
                                        </select>
                                    </Field>
                                    <Field label="رقم الهاتف">
                                        <input type="text" className="input" value={form.phone} onChange={e => set('phone')(e.target.value)} placeholder="01xxxxxxxxx" style={{ direction: 'ltr', fontFamily: 'monospace', height: '45px' }} />
                                    </Field>
                                </Grid2>
                                <Grid2>
                                    <Field label="البريد الإلكتروني">
                                        <input type="email" className="input" value={form.email} onChange={e => set('email')(e.target.value)} placeholder="name@company.com" style={{ direction: 'ltr', height: '45px' }} />
                                    </Field>
                                    <Field label="العنوان">
                                        <input type="text" className="input" value={form.address} onChange={e => set('address')(e.target.value)} placeholder="المدينة، الحي، الشارع" style={{ height: '45px' }} />
                                    </Field>
                                </Grid2>
                            </FormSection>

                            {/* ② وظيفية */}
                            <FormSection label="البيانات الوظيفية" icon={Briefcase} color="#8b5cf6" description="تفاصيل التعيين والمسمى الوظيفي والقسم">
                                <Grid2>
                                    <Field label="القسم الإداري">
                                        <CustomSelect value={form.departmentId} onChange={set('departmentId')} icon={Building2} placeholder="(بدون قسم)" options={departments.map(d => ({ value: d.id, label: d.name }))} />
                                    </Field>
                                    <Field label="المسمى الوظيفي">
                                        <input type="text" className="input" value={form.position} onChange={e => set('position')(e.target.value)} placeholder="محاسب أول" style={{ height: '45px' }} />
                                    </Field>
                                </Grid2>
                                <Field label="تاريخ التعيين" required>
                                    <input type="date" className="input" required value={form.hireDate} onChange={e => set('hireDate')(e.target.value)} style={{ height: '45px' }} />
                                </Field>
                            </FormSection>

                            {/* ③ مالي */}
                            <FormSection label="الراتب والبدلات والخصومات" icon={CreditCard} color="#10b981" description="تفاصيل الراتب الشهري والحوافز والاستقطاعات">
                                <Field label={`الراتب الأساسي الشهري (${cSymbol})`} required>
                                    <div style={{ position: 'relative' }}>
                                        <input type="number" step="0.01" min="0" className="input" required value={form.basicSalary} onChange={e => set('basicSalary')(e.target.value)} placeholder="0.00" style={{ fontSize: '20px', fontWeight: 900, height: '56px', paddingInlineEnd: '16px', color: '#10b981', background: 'rgba(16,185,129,0.02)', borderColor: 'rgba(16,185,129,0.2)' }} />
                                        <span style={{ position: 'absolute', insetInlineStart: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748b' }}>{cSymbol}</span>
                                    </div>
                                </Field>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>+ البدلات الإضافية</span>
                                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                                </div>
                                <Grid3>
                                    <Field label="بدل سكن">
                                        <input type="number" step="0.01" min="0" className="input" value={form.housingAllowance} onChange={e => set('housingAllowance')(e.target.value)} placeholder="0.00" />
                                    </Field>
                                    <Field label="بدل مواصلات">
                                        <input type="number" step="0.01" min="0" className="input" value={form.transportAllowance} onChange={e => set('transportAllowance')(e.target.value)} placeholder="0.00" />
                                    </Field>
                                    <Field label="بدل غذاء">
                                        <input type="number" step="0.01" min="0" className="input" value={form.foodAllowance} onChange={e => set('foodAllowance')(e.target.value)} placeholder="0.00" />
                                    </Field>
                                </Grid3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>− الخصومات والاستقطاعات</span>
                                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                                </div>
                                <Grid2>
                                    <Field label="خصم التأمينات">
                                        <input type="number" step="0.01" min="0" className="input" value={form.insuranceDeduction} onChange={e => set('insuranceDeduction')(e.target.value)} placeholder="0.00" />
                                    </Field>
                                    <Field label="خصم الضرائب">
                                        <input type="number" step="0.01" min="0" className="input" value={form.taxDeduction} onChange={e => set('taxDeduction')(e.target.value)} placeholder="0.00" />
                                    </Field>
                                </Grid2>
                            </FormSection>

                            {/* ④ بنكية */}
                            <FormSection label="بيانات الحساب البنكي" icon={CreditCard} color="#f59e0b" description="معلومات تحويل الراتب والبيانات البنكية">
                                <Grid2>
                                    <Field label="اسم البنك">
                                        <input type="text" className="input" value={form.bankName} onChange={e => set('bankName')(e.target.value)} placeholder="البنك الأهلي المصري" style={{ height: '45px' }} />
                                    </Field>
                                    <Field label="رقم الحساب / IBAN">
                                        <input type="text" className="input" value={form.bankAccount} onChange={e => set('bankAccount')(e.target.value)} placeholder="xxxxxxxxxxxx" style={{ direction: 'ltr', fontFamily: 'monospace', height: '45px' }} />
                                    </Field>
                                </Grid2>
                            </FormSection>
                        </div>

                        {/* Sidebar / Attachments & Summary */}
                        <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                            {/* Summary Card */}
                            <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                                <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#94a3b8' }}>ملخص الراتب</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#64748b' }}>الأساسي:</span>
                                        <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{formatNumber((+form.basicSalary || 0))} {cSymbol}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#10b981' }}>إجمالي البدلات:</span>
                                        <span style={{ color: '#10b981', fontWeight: 600 }}>+ {fMoneyJSX(allowances)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#ef4444' }}>إجمالي الخصومات:</span>
                                        <span style={{ color: '#ef4444', fontWeight: 600 }}>- {fMoneyJSX(deductions)}</span>
                                    </div>
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px' }}>
                                        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>صافي الراتب المتوقع</span>
                                        <span style={{ fontSize: '28px', fontWeight: 950, color: '#fff', letterSpacing: '-0.5px' }} dir="ltr">
                                            {fMoneyJSX(net)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Attachments Section */}
                            <div style={{ background: 'var(--surface-800)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <Paperclip size={18} color="#6366f1" />
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>الوثائق والمرفقات</h4>
                                </div>
                                <AttachmentUploader
                                    attachments={attachments}
                                    onAdd={f => setAttachments(p => [...p, f])}
                                    onRemove={i => setAttachments(p => p.filter((_, idx) => idx !== i))}
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSaving}
                                style={{ width: '100%', height: '56px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #256af4, #256af4)', color: '#fff', fontSize: '16px', fontWeight: 800, cursor: isSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(37, 106, 244,0.2)', transition: 'all 0.2s', fontFamily: 'inherit' }}
                                onMouseEnter={e => { if (!isSaving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(37, 106, 244,0.3)'; } }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(37, 106, 244,0.2)'; }}
                            >
                                {isSaving ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</> : <><Save size={20} /> حفظ التغييرات</>}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/employees')}
                                style={{ width: '100%', height: '48px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', background: 'transparent', color: '#64748b', fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = '#94a3b8'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                            >
                                إلغاء التعديلات
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </DashboardLayout>
    );
}
