'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import CustomSelect from '@/components/CustomSelect';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UsersIcon, Briefcase, Building2, CreditCard, Paperclip, X, Upload, Eye, Trash2, Loader2, ChevronDown, ArrowRight, Save, UserPlus, ShieldCheck, Landmark, Info, FileText, CheckCircle2 } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import PageHeader from '@/components/PageHeader';
import { THEME, C, CAIRO, OUTFIT, PAGE_BASE, focusIn, focusOut } from '@/constants/theme';

/* ── Types ── */
interface Department { id: string; name: string; }
interface Branch { id: string; name: string; isMain: boolean; }
interface Attachment { name: string; url: string; }

const EMPTY = {
    code: '', name: '', phone: '', email: '',
    nationalId: '', birthDate: '', gender: '', address: '',
    position: '', departmentId: '', branchId: '',
    hireDate: new Date().toISOString().split('T')[0],
    basicSalary: '',
    housingAllowance: '', transportAllowance: '', foodAllowance: '',
    insuranceDeduction: '', taxDeduction: '',
    bankName: '', bankAccount: '',
    status: 'active',
};

const formatWithCommas = (val: string | number) => {
    if (val === undefined || val === null || val === '') return '';
    const s = String(val).replace(/,/g, '');
    if (isNaN(Number(s))) return s;
    const [int, dec] = s.split('.');
    return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec !== undefined ? '.' + dec : '');
};

/* ══════════════════════════════════════════ */
export default function NewEmployeePage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { symbol: cSymbol } = useCurrency();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({ ...EMPTY });
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    const set = (k: keyof typeof EMPTY) => (v: string) => setForm(p => ({ ...p, [k]: v }));

    useEffect(() => {
        fetch('/api/departments').then(res => res.json()).then(d => setDepartments(Array.isArray(d) ? d : []));
        fetch('/api/employees/next-code').then(res => res.json()).then(data => {
            if (data.nextCode) set('code')(data.nextCode);
        });
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => {});
    }, []);

    const submit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/employees', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, attachments }),
            });
            if (res.ok) {
                router.push('/employees');
                router.refresh();
            } else {
                const d = await res.json();
                alert(d.error || t('فشل في الحفظ'));
            }
        } finally {
            setIsSaving(false);
        }
    };

    const allowances = (+form.housingAllowance || 0) + (+form.transportAllowance || 0) + (+form.foodAllowance || 0);
    const deductions = (+form.insuranceDeduction || 0) + (+form.taxDeduction || 0);
    const net = (+form.basicSalary || 0) + allowances - deductions;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, fontFamily: CAIRO }}>

                <PageHeader 
                    title={t("إضافة موظف")} 
                    subtitle={t("تسجيل بيانات الموظف الجديد والعقود الوظيفية")}
                    icon={UserPlus}
                    backUrl="/employees"
                />

                <form onSubmit={submit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '24px', alignItems: 'start' }}>

                        {/* Main Content Area */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* ① البيانات الشخصية */}
                            <FormSection label={t("البيانات الشخصية والتعريفية")} icon={UsersIcon} color="#256af4">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <Field label={t("كود الموظف")}>
                                        <input type="text" readOnly value={form.code} style={{ height: '44px', width: '100%', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', color: C.textMuted, fontSize: '14px', fontWeight: 800, padding: '0 16px', cursor: 'not-allowed', fontFamily: OUTFIT }} />
                                    </Field>
                                    <Field label={t("الاسم الكامل")} required>
                                        <input type="text" required value={form.name} onChange={e => set('name')(e.target.value)} onFocus={focusIn} onBlur={focusOut} placeholder={t("أدخل اسم الموظف الرباعي")} style={{ height: '44px', width: '100%', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textSecondary, fontSize: '14px', fontWeight: 700, padding: '0 16px', outline: 'none', transition: '0.2s' }} />
                                    </Field>
                                    <Field label={t("الرقم القومي")}>
                                        <input type="text" value={form.nationalId} onChange={e => set('nationalId')(e.target.value)} onFocus={focusIn} onBlur={focusOut} placeholder={t("الرقم القومي المكون من 14 رقم")} maxLength={14} style={{ height: '44px', width: '100%', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textSecondary, fontSize: '14px', fontWeight: 800, padding: '0 16px', direction: 'ltr', fontFamily: OUTFIT }} />
                                    </Field>
                                    <Field label={t("تاريخ الميلاد")}>
                                        <input type="date" value={form.birthDate} onChange={e => set('birthDate')(e.target.value)} onFocus={focusIn} onBlur={focusOut} style={{ height: '44px', width: '100%', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textSecondary, fontSize: '14px', fontWeight: 700, padding: '0 16px', direction: 'inherit' }} />
                                    </Field>
                                    <Field label={t("الجنس")}>
                                        <CustomSelect 
                                            value={form.gender} 
                                            onChange={set('gender')} 
                                            placeholder={t("اختر الجنس")} 
                                            hideSearch={true}
                                            style={{ background: C.inputBg, border: `1px solid ${C.border}` }}
                                            options={[
                                                { value: 'male', label: t('ذكر') },
                                                { value: 'female', label: t('أنثى') }
                                            ]} 
                                        />
                                    </Field>
                                    <Field label={t("رقم الهاتف")}>
                                        <input type="text" value={form.phone} onChange={e => set('phone')(e.target.value)} onFocus={focusIn} onBlur={focusOut} placeholder="01xxxxxxxxx" style={{ height: '44px', width: '100%', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textSecondary, fontSize: '14px', fontWeight: 800, padding: '0 16px', direction: 'ltr', fontFamily: OUTFIT }} />
                                    </Field>
                                    <Field label={t("البريد الإلكتروني")}>
                                        <input type="email" value={form.email} onChange={e => set('email')(e.target.value)} onFocus={focusIn} onBlur={focusOut} placeholder="name@company.com" style={{ height: '44px', width: '100%', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textSecondary, fontSize: '14px', fontWeight: 700, padding: '0 16px', direction: 'ltr', fontFamily: OUTFIT }} />
                                    </Field>
                                    <Field label={t("العنوان السكني الحالي")}>
                                        <input type="text" value={form.address} onChange={e => set('address')(e.target.value)} onFocus={focusIn} onBlur={focusOut} placeholder={t("المدينة، الحي، الشارع")} style={{ height: '44px', width: '100%', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textSecondary, fontSize: '14px', fontWeight: 700, padding: '0 16px' }} />
                                    </Field>
                                </div>
                            </FormSection>

                            {/* ② البيانات الوظيفية */}
                            <FormSection label={t("البيانات الوظيفية والتعاقدية")} icon={Briefcase} color="#8b5cf6">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <Field label={t("القسم الإداري")}>
                                        <CustomSelect value={form.departmentId} onChange={set('departmentId')} icon={Building2} placeholder={t("اختر القسم أو الإدارة")} style={{ background: C.inputBg, border: `1px solid ${C.border}` }} options={departments.map(d => ({ value: d.id, label: d.name }))} />
                                    </Field>
                                    {branches.length > 1 && (
                                        <Field label={t("الفرع")}>
                                            <CustomSelect value={form.branchId} onChange={set('branchId')} placeholder={t("اختر الفرع")} style={{ background: C.inputBg, border: `1px solid ${C.border}` }} options={branches.map(b => ({ value: b.id, label: b.name }))} />
                                        </Field>
                                    )}
                                    <Field label={t("المسمى الوظيفي")}>
                                        <input type="text" value={form.position} onChange={e => set('position')(e.target.value)} onFocus={focusIn} onBlur={focusOut} placeholder={t("مثال: محاسب أول")} style={{ height: '44px', width: '100%', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textSecondary, fontSize: '14px', fontWeight: 700, padding: '0 16px' }} />
                                    </Field>
                                    <Field label={t("تاريخ التعيين")} required>
                                        <input type="date" required value={form.hireDate} onChange={e => set('hireDate')(e.target.value)} onFocus={focusIn} onBlur={focusOut} style={{ height: '44px', width: '100%', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textSecondary, fontSize: '14px', fontWeight: 700, padding: '0 16px', direction: 'inherit' }} />
                                    </Field>
                                    <Field label={t("حالة الموظف")}>
                                        <CustomSelect 
                                            value={form.status} 
                                            onChange={set('status')} 
                                            placeholder={t("اختر الحالة")} 
                                            hideSearch={true}
                                            style={{ background: C.inputBg, border: `1px solid ${C.border}` }}
                                            options={[
                                                { value: 'active', label: t('نشط') },
                                                { value: 'inactive', label: t('متوقف') }
                                            ]} 
                                        />
                                    </Field>
                                </div>
                            </FormSection>

                            {/* ③ الراتب والبيانات المالية */}
                            <FormSection label={t("سلم الرواتب والبدلات")} icon={CreditCard} color="#10b981">
                                <div style={{ background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.1)', padding: '20px', borderRadius: '14px', marginBottom: '10px' }}>
                                    <Field label={t("الراتب الأساسي المعتمد")} required>
                                        <div style={{ position: 'relative' }}>
                                            <input 
                                                type="text" 
                                                inputMode="decimal"
                                                required 
                                                value={formatWithCommas(form.basicSalary)} 
                                                onChange={e => {
                                                    const v = e.target.value.replace(/[^0-9.]/g, '');
                                                    if ((v.match(/\./g) || []).length > 1) return;
                                                    set('basicSalary')(v);
                                                }} 
                                                onFocus={focusIn} onBlur={focusOut} 
                                                placeholder="0.00" 
                                                style={{ height: '48px', width: '100%', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.inputBg, color: '#10b981', fontSize: '18px', fontWeight: 900, padding: '0 16px', fontFamily: OUTFIT }} 
                                            />
                                            <span style={{ position: 'absolute', insetInlineStart: '16px', top: '50%', transform: 'translateY(-50%)', fontFamily: CAIRO, 
                                        fontWeight: 800, color: C.textMuted, fontSize: '13px' }}>{cSymbol}</span>
                                        </div>
                                    </Field>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                    <Field label={t("بدل سكن")}>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" inputMode="decimal" value={formatWithCommas(form.housingAllowance)} onChange={e => set('housingAllowance')(e.target.value.replace(/[^0-9.]/g, ''))} onFocus={focusIn} onBlur={focusOut} placeholder="0.00" style={{ height: '40px', width: '100%', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textSecondary, fontSize: '13px', paddingInlineStart: '32px', fontFamily: OUTFIT }} />
                                            <span style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', fontFamily: CAIRO, 
                                            fontWeight: 700, color: C.textMuted, fontSize: '10px' }}>{cSymbol}</span>
                                        </div>
                                    </Field>
                                    <Field label={t("بدل مواصلات")}>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" inputMode="decimal" value={formatWithCommas(form.transportAllowance)} onChange={e => set('transportAllowance')(e.target.value.replace(/[^0-9.]/g, ''))} onFocus={focusIn} onBlur={focusOut} placeholder="0.00" style={{ height: '40px', width: '100%', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textSecondary, fontSize: '13px', paddingInlineStart: '32px', fontFamily: OUTFIT }} />
                                            <span style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', fontFamily: CAIRO, 
                                            fontWeight: 700, color: C.textMuted, fontSize: '10px' }}>{cSymbol}</span>
                                        </div>
                                    </Field>
                                    <Field label={t("بدل غذاء")}>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" inputMode="decimal" value={formatWithCommas(form.foodAllowance)} onChange={e => set('foodAllowance')(e.target.value.replace(/[^0-9.]/g, ''))} onFocus={focusIn} onBlur={focusOut} placeholder="0.00" style={{ height: '40px', width: '100%', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textSecondary, fontSize: '13px', paddingInlineStart: '32px', fontFamily: OUTFIT }} />
                                            <span style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', fontFamily: CAIRO, 
                                            fontWeight: 700, color: C.textMuted, fontSize: '10px' }}>{cSymbol}</span>
                                        </div>
                                    </Field>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '10px' }}>
                                    <Field label={t("خصم التأمينات")}>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" inputMode="decimal" value={formatWithCommas(form.insuranceDeduction)} onChange={e => set('insuranceDeduction')(e.target.value.replace(/[^0-9.]/g, ''))} onFocus={focusIn} onBlur={focusOut} placeholder="0.00" style={{ height: '40px', width: '100%', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.inputBg, color: THEME.colors.danger, fontSize: '13px', paddingInlineStart: '32px', fontFamily: OUTFIT }} />
                                            <span style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', fontFamily: CAIRO, 
                                            fontWeight: 700, color: C.textMuted, fontSize: '10px' }}>{cSymbol}</span>
                                        </div>
                                    </Field>
                                    <Field label={t("خصم الضرائب")}>
                                        <div style={{ position: 'relative' }}>
                                            <input type="text" inputMode="decimal" value={formatWithCommas(form.taxDeduction)} onChange={e => set('taxDeduction')(e.target.value.replace(/[^0-9.]/g, ''))} onFocus={focusIn} onBlur={focusOut} placeholder="0.00" style={{ height: '40px', width: '100%', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.inputBg, color: THEME.colors.danger, fontSize: '13px', paddingInlineStart: '32px', fontFamily: OUTFIT }} />
                                            <span style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', fontFamily: CAIRO, 
                                            fontWeight: 700, color: C.textMuted, fontSize: '10px' }}>{cSymbol}</span>
                                        </div>
                                    </Field>
                                </div>
                            </FormSection>

                            {/* ④ البيانات البنكية */}
                            <FormSection label={t("معلومات التحويل البنكي")} icon={Landmark} color="#f59e0b">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <Field label={t("اسم البنك")}>
                                        <input type="text" value={form.bankName} onChange={e => set('bankName')(e.target.value)} onFocus={focusIn} onBlur={focusOut} placeholder={t("اسم البنك المعتمد")} style={{ height: '44px', width: '100%', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textSecondary, fontSize: '14px', fontWeight: 700, padding: '0 16px' }} />
                                    </Field>
                                    <Field label={t("رقم الحساب / IBAN")}>
                                        <input type="text" value={form.bankAccount} onChange={e => set('bankAccount')(e.target.value)} onFocus={focusIn} onBlur={focusOut} placeholder={t("رقم الحساب البنكي")} style={{ height: '44px', width: '100%', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textSecondary, fontSize: '14px', fontWeight: 800, padding: '0 16px', direction: 'ltr', fontFamily: OUTFIT }} />
                                    </Field>
                                </div>
                            </FormSection>
                        </div>

                        {/* Sidebar */}
                        <aside style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* Live Salary Counter Card */}
                            <div style={{ 
                                background: C.card, 
                                border: `1px solid ${C.border}`, 
                                borderRadius: '24px', 
                                overflow: 'hidden',
                                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)'
                            }}>
                                <div style={{ 
                                    padding: '24px', 
                                    background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.02) 100%)',
                                    borderBottom: `1px solid ${C.border}`,
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 900, marginBottom: '6px' }}>{t('صافي الراتب المتوقع')}</div>
                                    <div style={{ fontSize: '24px', fontWeight: 950, color: '#fff', fontFamily: OUTFIT, display: 'flex', alignItems: 'baseline', gap: '8px' }} dir="ltr">
                                        <span style={{ fontSize: '15px', color: C.textMuted, fontFamily: CAIRO }}>{cSymbol}</span>
                                        <span>{net.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <CreditCard size={80} style={{ position: 'absolute', left: -10, top: -10, opacity: 0.05, transform: 'rotate(-20deg)', pointerEvents: 'none' }} />
                                </div>
                                
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <SummaryItem label={t("الراتب الأساسي")} value={form.basicSalary} color={C.textPrimary} unit={cSymbol} />
                                    <SummaryItem label={t("إجمالي البدلات")} value={allowances} color="#10b981" prefix="+" unit={cSymbol} />
                                    <SummaryItem label={t("إجمالي الخصومات")} value={deductions} color={THEME.colors.danger} prefix="-" unit={cSymbol} />
                                    
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
                                    <div style={{ fontSize: '11px', color: C.textMuted, lineHeight: 1.6 }}>
                                        <Info size={12} style={{ verticalAlign: 'middle', marginInlineStart: '6px' }} />
                                        {t('يتم احتساب الصافي بناءً على المدخلات الحالية')}
                                    </div>
                                </div>
                            </div>

                            {/* Attachments Section */}
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <Paperclip size={18} style={{ color: C.blue }} />
                                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff' }}>{t('ملفات ووثائق الموظف')}</span>
                                </div>
                                <AttachmentUploader
                                    attachments={attachments}
                                    onAdd={(f: Attachment) => setAttachments(p => [...p, f])}
                                    onRemove={(i: number) => setAttachments(p => p.filter((_, idx) => idx !== i))}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    style={{ width: '100%', height: '52px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #256af4, #256af4)', color: '#fff', fontSize: '15px', fontWeight: 800, cursor: isSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 8px 20px rgba(37, 106, 244,0.3)', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { if (!isSaving) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                                >
                                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                    {isSaving ? t('جاري الحفظ...') : t('حفظ الموظف الجديد')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.push('/employees')}
                                    style={{ width: '100%', height: '48px', borderRadius: '16px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', color: C.textSecondary, fontSize: '14px', fontWeight: 800, cursor: 'pointer', transition: '0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = C.textSecondary; }}
                                >
                                    {t('إلغاء العملية')}
                                </button>
                            </div>
                        </aside>
                    </div>
                </form>
            </div>
            <style jsx global>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                input::placeholder, textarea::placeholder {
                    font-weight: 500 !important;
                    font-size: 13px !important;
                    opacity: 0.5 !important;
                }
            `}</style>
        </DashboardLayout>
    );
}

/* ── Sub-Components ── */
function FormSection({ label, icon: Icon, color, children }: any) {
    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', boxShadow: '0 10px 30px -15px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '10px', background: `${color}10` }}><Icon size={16} /></div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#fff' }}>{label}</h3>
            </div>
            <div style={{ padding: '24px' }}>{children}</div>
        </div>
    );
}

function Field({ label, required, children }: any) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, marginInlineEnd: '4px' }}>{label}{required && <span style={{ color: THEME.colors.danger }}> *</span>}</label>
            {children}
        </div>
    );
}

function SummaryItem({ label, value, color, prefix = '', unit }: any) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
            <span style={{ color: C.textSecondary, fontWeight: 700 }}>{label}:</span>
            <span style={{ color, fontWeight: 800, fontFamily: OUTFIT }}>
                {prefix} {(+value || 0).toLocaleString('en-US')} <span style={{ fontSize: '10px', opacity: 0.7, fontFamily: CAIRO }}>{unit}</span>
            </span>
        </div>
    );
}

function AttachmentUploader({ attachments, onAdd, onRemove }: any) {
    const { t } = useTranslation();
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const handle = async (file: File) => {
        setUploading(true);
        try {
            const fd = new FormData(); fd.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.url) onAdd({ name: file.name, url: data.url });
        } finally { setUploading(false); }
    };
    return (
        <div>
            <div onClick={() => !uploading && inputRef.current?.click()} style={{ border: `2px dashed ${C.border}`, borderRadius: '14px', padding: '20px', cursor: 'pointer', background: 'rgba(255,255,255,0.01)', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = C.blue}>
                {uploading ? <Loader2 className="animate-spin" style={{ color: C.blue, margin: '0 auto' }} /> : <Upload size={24} style={{ color: C.textMuted, margin: '0 auto 8px' }} />}
                <div style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 700 }}>{uploading ? t('جاري الرفع...') : t('اضغط لرفع وثيقة الموظف')}</div>
            </div>
            <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handle(e.target.files[0])} />
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {attachments.map((a: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: `1px solid ${C.border}` }}>
                        <FileText size={16} style={{ color: C.blue }} />
                        <span style={{ flex: 1, fontSize: '11px', color: '#f1f5f9', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                        <button type="button" onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={14} /></button>
                    </div>
                ))}
            </div>
        </div>
    );
}
