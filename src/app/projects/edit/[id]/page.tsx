'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { FolderKanban, Loader2, Save } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function EditProjectPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { symbol: cSymbol } = useCurrency();
    const params = useParams();
    const isContracting = (session?.user as any)?.businessType?.toUpperCase() === 'CONTRACTING';
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    // Lists for select dropdowns
    const [customers, setCustomers] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);

    const [form, setForm] = useState({
        name: '',
        description: '',
        customerId: '',
        location: '',
        projectType: 'residential',
        contractValue: '',
        estimatedCost: '',
        expectedProfit: 0,
        startDate: '',
        expectedEndDate: '',
        actualEndDate: '',
        managerId: '',
        status: 'active',
        completionPercent: '',
        notes: ''
    });

    useEffect(() => {
        const fetchDropdownsAndProject = async () => {
            try {
                // Fetch Dropdowns
                const [custRes, empRes, projRes] = await Promise.all([
                    fetch('/api/customers?take=1000'),
                    fetch('/api/employees?take=1000'),
                    fetch(`/api/projects/${id}`)
                ]);

                if (custRes.ok) {
                    const custData = await custRes.json();
                    setCustomers(custData.customers || custData || []);
                }
                if (empRes.ok) {
                    const empData = await empRes.json();
                    setEmployees(empData.employees || empData || []);
                }
                if (projRes.ok) {
                    const project = await projRes.json();
                    setForm({
                        name: project.name || '',
                        description: project.description || '',
                        customerId: project.customerId || '',
                        location: project.location || '',
                        projectType: project.projectType || 'residential',
                        contractValue: project.contractValue ? String(project.contractValue) : '',
                        estimatedCost: project.estimatedCost ? String(project.estimatedCost) : '',
                        expectedProfit: project.expectedProfit || 0,
                        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
                        expectedEndDate: project.expectedEndDate ? new Date(project.expectedEndDate).toISOString().split('T')[0] : '',
                        actualEndDate: project.actualEndDate ? new Date(project.actualEndDate).toISOString().split('T')[0] : '',
                        managerId: project.managerId || '',
                        status: project.status || 'active',
                        completionPercent: project.completionPercent ? String(project.completionPercent) : '0',
                        notes: project.notes || ''
                    });
                } else {
                    setError(t('المشروع غير موجود'));
                }
            } catch (err) {
                console.error("Error loading project edit details:", err);
                setError(t('فشل في تحميل بيانات المشروع'));
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDropdownsAndProject();
        }
    }, [id, t]);

    // Auto calculate expected profit when contractValue or estimatedCost changes
    useEffect(() => {
        const contract = parseFloat(form.contractValue) || 0;
        const cost = parseFloat(form.estimatedCost) || 0;
        setForm(prev => ({ ...prev, expectedProfit: contract - cost }));
    }, [form.contractValue, form.estimatedCost]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/projects/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    contractValue: parseFloat(form.contractValue) || 0,
                    estimatedCost: parseFloat(form.estimatedCost) || 0,
                    completionPercent: parseFloat(form.completionPercent) || 0,
                })
            });

            if (res.ok) {
                window.location.href = '/projects';
            } else {
                const data = await res.json();
                setError(data.error || t('فشل في حفظ تعديلات المشروع'));
            }
        } catch {
            setError(t('حدث خطأ في الاتصال بالخادم'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: CAIRO, background: C.bg, minHeight: '100%', paddingBottom: '60px' }}>
                <PageHeader 
                    title={t("تعديل بيانات المشروع")}
                    subtitle={t("تحديث مواصفات وتكاليف المشروع")}
                    icon={FolderKanban}
                    backUrl="/projects"
                />

                <div style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: '16px',
                    padding: '24px',
                    maxWidth: '800px',
                    margin: '0 auto',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                    {error && (
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${C.danger}33`,
                            borderRadius: '10px',
                            color: '#ef4444',
                            fontSize: '13px',
                            fontWeight: 600,
                            marginBottom: '20px',
                            fontFamily: CAIRO
                        }}>
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
                            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: C.primary, marginBottom: '10px' }} />
                            <span style={{ fontSize: '13px', color: C.textSecondary }}>{t('جاري تحميل بيانات المشروع...')}</span>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* Section 1: Basic Info */}
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.primary, borderBottom: `1px dashed ${C.border}`, paddingBottom: '6px', marginBottom: '14px' }}>
                                    {t('البيانات الأساسية للمشروع')}
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                                    <div>
                                        <label style={LS}>{t('اسم المشروع')} <span style={{ color: C.danger }}>*</span></label>
                                        <input required type="text" placeholder={t('اسم المشروع...')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div>
                                        <label style={LS}>{t('الوصف / التفاصيل')}</label>
                                        <textarea rows={3} placeholder={t('اكتب تفاصيل المشروع والمواصفات...')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...IS, height: 'auto', padding: '10px 14px' }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Clients & Location */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                                <div>
                                    <label style={LS}>{isContracting ? t('المالك / صاحب المشروع') : t('العميل / المالك')}</label>
                                    <select style={{ ...IS, cursor: 'pointer' }} value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} onFocus={focusIn} onBlur={focusOut}>
                                        <option value="">{isContracting ? t('اختر المالك...') : t('اختر العميل...')}</option>
                                        {customers.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={LS}>{t('موقع المشروع')}</label>
                                    <input type="text" placeholder={t('الموقع الجغرافي للمشروع...')} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>

                            {/* Section 3: Project Configuration */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                                <div>
                                    <label style={LS}>{t('تصنيف المشروع')}</label>
                                    <select style={{ ...IS, cursor: 'pointer' }} value={form.projectType} onChange={e => setForm({ ...form, projectType: e.target.value })} onFocus={focusIn} onBlur={focusOut}>
                                        <option value="residential">{t('سكني')}</option>
                                        <option value="commercial">{t('تجاري')}</option>
                                        <option value="government">{t('حكومي')}</option>
                                        <option value="maintenance">{t('صيانة وتشغيل')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={LS}>{t('مدير المشروع')}</label>
                                    <select style={{ ...IS, cursor: 'pointer' }} value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })} onFocus={focusIn} onBlur={focusOut}>
                                        <option value="">{t('اختر المهندس المسؤول...')}</option>
                                        {employees.map((e: any) => (
                                            <option key={e.id} value={e.id}>{e.name} ({e.position || t('موظف')})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Section 4: Finances */}
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.primary, borderBottom: `1px dashed ${C.border}`, paddingBottom: '6px', marginBottom: '14px', marginTop: '10px' }}>
                                    {t('البيانات المالية')}
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                                    <div>
                                        <label style={LS}>{t('قيمة عقد المشروع')} <span style={{ color: C.danger }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <input required type="number" step="any" placeholder="0.00" value={form.contractValue} onChange={e => setForm({ ...form, contractValue: e.target.value })} style={{ ...IS, paddingInlineEnd: '45px', fontFamily: OUTFIT, fontWeight: 700 }} onFocus={focusIn} onBlur={focusOut} />
                                            <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: C.textSecondary }}>{cSymbol}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={LS}>{t('التكلفة التقديرية')}</label>
                                        <div style={{ position: 'relative' }}>
                                            <input required type="number" step="any" placeholder="0.00" value={form.estimatedCost} onChange={e => setForm({ ...form, estimatedCost: e.target.value })} style={{ ...IS, paddingInlineEnd: '45px', fontFamily: OUTFIT, fontWeight: 700 }} onFocus={focusIn} onBlur={focusOut} />
                                            <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: C.textSecondary }}>{cSymbol}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={LS}>{t('الربح المتوقع التلقائي')}</label>
                                        <div style={{ position: 'relative', background: 'rgba(255,255,255,0.02)', borderRadius: THEME.input.radius }}>
                                            <input disabled type="text" value={form.expectedProfit.toLocaleString()} style={{ ...IS, paddingInlineEnd: '45px', fontFamily: OUTFIT, fontWeight: 700, color: form.expectedProfit >= 0 ? '#4ade80' : '#fb7185' }} />
                                            <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: C.textSecondary }}>{cSymbol}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Dates, Status and Completion */}
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.primary, borderBottom: `1px dashed ${C.border}`, paddingBottom: '6px', marginBottom: '14px', marginTop: '10px' }}>
                                    {t('التواريخ، الحالة، والإنجاز')}
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                                    <div>
                                        <label style={LS}>{t('تاريخ البدء')} <span style={{ color: C.danger }}>*</span></label>
                                        <input required type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div>
                                        <label style={LS}>{t('التاريخ المتوقع للانتهاء')}</label>
                                        <input type="date" value={form.expectedEndDate} onChange={e => setForm({ ...form, expectedEndDate: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div>
                                        <label style={LS}>{t('تاريخ الانتهاء الفعلي')}</label>
                                        <input type="date" value={form.actualEndDate} onChange={e => setForm({ ...form, actualEndDate: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div>
                                        <label style={LS}>{t('نسبة الإنجاز الكلية %')}</label>
                                        <input type="number" min="0" max="100" placeholder="0" value={form.completionPercent} onChange={e => setForm({ ...form, completionPercent: e.target.value })} style={{ ...IS, fontFamily: OUTFIT, fontWeight: 700 }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div>
                                        <label style={LS}>{t('حالة المشروع')}</label>
                                        <select style={{ ...IS, cursor: 'pointer' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} onFocus={focusIn} onBlur={focusOut}>
                                            <option value="active">{t('نشط / جاري العمل')}</option>
                                            <option value="paused">{t('متوقف مؤقتاً')}</option>
                                            <option value="completed">{t('مكتمل')}</option>
                                            <option value="cancelled">{t('ملغي')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 6: Notes */}
                            <div>
                                <label style={LS}>{t('ملاحظات إضافية')}</label>
                                <textarea rows={2} placeholder={t('أي ملاحظات أو بنود خاصة...')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...IS, height: 'auto', padding: '10px 14px' }} onFocus={focusIn} onBlur={focusOut} />
                            </div>

                            {/* Form Actions */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '20px' }}>
                                <button disabled={submitting} type="submit" style={{
                                    height: '44px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none',
                                    fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: submitting ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}>
                                    {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <><Save size={16} /> {t('حفظ التعديلات')}</>}
                                </button>
                                <Link href="/projects" style={{
                                    height: '44px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`,
                                    color: C.textSecondary, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none'
                                }}>
                                    {t('إلغاء')}
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
                
                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
                    input[type=number] { -moz-appearance:textfield; }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
