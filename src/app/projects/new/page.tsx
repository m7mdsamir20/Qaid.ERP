'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { FolderKanban, Loader2, Save, DollarSign } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, SC, STitle, PAGE_BASE, BTN_PRIMARY } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';
import CustomSelect from '@/components/CustomSelect';

export default function NewProjectPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { symbol: cSymbol } = useCurrency();
    const isContracting = (session?.user as any)?.businessType?.toUpperCase() === 'CONTRACTING';

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    // Lists for select dropdowns
    const [customers, setCustomers] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loadingLists, setLoadingLists] = useState(true);

    const [form, setForm] = useState({
        name: '',
        description: '',
        customerId: '',
        location: '',
        projectType: 'residential',
        contractValue: '',
        estimatedCost: '',
        expectedProfit: 0,
        startDate: new Date().toISOString().split('T')[0],
        expectedEndDate: '',
        managerId: '',
        status: 'active',
        notes: ''
    });

    useEffect(() => {
        const fetchLists = async () => {
            try {
                const [custRes, empRes] = await Promise.all([
                    fetch('/api/customers?take=1000'),
                    fetch('/api/employees?take=1000')
                ]);
                if (custRes.ok) {
                    const custData = await custRes.json();
                    setCustomers(custData.customers || custData || []);
                }
                if (empRes.ok) {
                    const empData = await empRes.json();
                    setEmployees(empData.employees || empData || []);
                }
            } catch (err) {
                console.error("Error loading dropdown data:", err);
            } finally {
                setLoadingLists(false);
            }
        };
        fetchLists();
    }, []);

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
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    contractValue: parseFloat(form.contractValue) || 0,
                    estimatedCost: parseFloat(form.estimatedCost) || 0,
                })
            });

            if (res.ok) {
                window.location.href = '/projects';
            } else {
                const data = await res.json();
                setError(data.error || t('فشل في حفظ المشروع الجديد'));
            }
        } catch {
            setError(t('حدث خطأ في الاتصال بالخادم'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, fontFamily: CAIRO }}>
                <PageHeader 
                    title={t("إنشاء مشروع جديد")}
                    subtitle={t("إدخال بيانات المشروع، القيمة، والتكلفة التقديرية")}
                    icon={FolderKanban}
                    backUrl="/projects"
                />

                {loadingLists ? (
                    <div style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: '16px',
                        padding: '40px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }}>
                        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: C.primary, marginBottom: '10px' }} />
                        <span style={{ fontSize: '13px', color: C.textSecondary }}>{t('جاري تحميل القوائم...')}</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px', alignItems: 'start' }}>
                        
                        {/* ══ Left Column: Main Form Details ══ */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            
                            {error && (
                                <div style={{
                                    padding: '12px 16px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: `1px solid ${C.danger}33`,
                                    borderRadius: '10px',
                                    color: '#ef4444',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    fontFamily: CAIRO
                                }}>
                                    {error}
                                </div>
                            )}

                            {/* Card 1: بيانات المشروع الأساسية */}
                            <div style={SC}>
                                <div style={{ ...STitle, color: '#256af4' }}>
                                    <FolderKanban size={14} /> {t('البيانات الأساسية للمشروع')}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <label style={LS}>{t('اسم المشروع')} <span style={{ color: C.danger }}>*</span></label>
                                        <input required type="text" placeholder={t('مثال: مشروع برج الياسمين')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div>
                                        <label style={LS}>{t('الوصف / التفاصيل')}</label>
                                        <textarea rows={3} placeholder={t('اكتب تفاصيل المشروع والمواصفات...')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...IS, height: 'auto', padding: '10px 14px', resize: 'none' }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="responsive-grid">
                                        <div>
                                            <label style={LS}>{isContracting ? t('المالك / صاحب المشروع') : t('العميل / المالك')}</label>
                                            <CustomSelect
                                                onCreate={(val) => {
                                                    setSubmitting(true);
                                                    fetch('/api/customers', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ name: val })
                                                    })
                                                    .then(res => {
                                                        if (res.ok) return res.json();
                                                        throw new Error();
                                                    })
                                                    .then(newCustomer => {
                                                        if (newCustomer && newCustomer.id) {
                                                            setCustomers(prev => [...(Array.isArray(prev) ? prev : []), newCustomer]);
                                                            setForm(f => ({ ...f, customerId: newCustomer.id }));
                                                        }
                                                    })
                                                    .catch(() => alert(t('فشل في إضافة العميل')))
                                                    .finally(() => setSubmitting(false));
                                                }}
                                                value={form.customerId}
                                                onChange={val => setForm({ ...form, customerId: val })}
                                                placeholder={isContracting ? t('اختر المالك...') : t('اختر العميل...')}
                                                options={customers.map((c: any) => ({ value: c.id, label: c.name }))}
                                                minWidth="100%"
                                            />
                                        </div>
                                        <div>
                                            <label style={LS}>{t('موقع المشروع')}</label>
                                            <input type="text" placeholder={t('مثال: التجمع الخامس، القاهرة')} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="responsive-grid">
                                        <div>
                                            <label style={LS}>{t('تصنيف المشروع')}</label>
                                            <CustomSelect
                                                value={form.projectType}
                                                onChange={val => setForm({ ...form, projectType: val })}
                                                placeholder={t('اختر التصنيف...')}
                                                options={[
                                                    { value: 'residential', label: t('سكني') },
                                                    { value: 'commercial', label: t('تجاري') },
                                                    { value: 'government', label: t('حكومي') },
                                                    { value: 'maintenance', label: t('صيانة وتشغيل') },
                                                ]}
                                                minWidth="100%"
                                            />
                                        </div>
                                        <div>
                                            <label style={LS}>{t('مدير المشروع')}</label>
                                            <CustomSelect
                                                value={form.managerId}
                                                onChange={val => setForm({ ...form, managerId: val })}
                                                placeholder={t('اختر المهندس المسؤول...')}
                                                options={employees.map((e: any) => ({
                                                    value: e.id,
                                                    label: `${e.name} (${e.position || t('موظف')})`
                                                }))}
                                                minWidth="100%"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: البيانات المالية التقديرية */}
                            <div style={SC}>
                                <div style={{ ...STitle, color: '#256af4' }}>
                                    <DollarSign size={14} /> {t('البيانات المالية التقديرية')}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="responsive-grid">
                                    <div>
                                        <label style={LS}>{isContracting ? t('قيمة عقد المشروع') : t('قيمة عقد المشروع (سعر البيع)')} <span style={{ color: C.danger }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <input required type="number" step="any" placeholder="0.00" value={form.contractValue} onChange={e => setForm({ ...form, contractValue: e.target.value })} style={{ ...IS, paddingInlineEnd: '45px', fontFamily: OUTFIT, fontWeight: 700 }} onFocus={focusIn} onBlur={focusOut} />
                                            <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: C.textSecondary }}>{cSymbol}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={LS}>{t('التكلفة التقديرية للمشروع')} <span style={{ color: C.danger }}>*</span></label>
                                        <div style={{ position: 'relative' }}>
                                            <input required type="number" step="any" placeholder="0.00" value={form.estimatedCost} onChange={e => setForm({ ...form, estimatedCost: e.target.value })} style={{ ...IS, paddingInlineEnd: '45px', fontFamily: OUTFIT, fontWeight: 700 }} onFocus={focusIn} onBlur={focusOut} />
                                            <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: C.textSecondary }}>{cSymbol}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: ملاحظات إضافية */}
                            <div style={SC}>
                                <label style={LS}>{t('ملاحظات إضافية')}</label>
                                <textarea rows={3} placeholder={t('أي ملاحظات أو بنود خاصة بالعقد...')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...IS, height: 'auto', padding: '10px 14px', resize: 'none' }} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>

                        {/* ══ Right Column: Sticky Summary & Info & Actions ══ */}
                        <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            
                            {/* Card 4: ملخص الربحية المتوقعة */}
                            <div style={SC}>
                                <div style={{ ...STitle, color: '#256af4', marginBottom: '12px' }}>{t('ملخص المشروع')}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                        <span style={{ color: C.textSecondary }}>{t('قيمة العقد')}:</span>
                                        <span style={{ color: C.textPrimary, fontWeight: 700, fontFamily: OUTFIT }}>{(parseFloat(form.contractValue) || 0).toLocaleString()} {cSymbol}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: `1px solid ${C.border}`, paddingBottom: '10px' }}>
                                        <span style={{ color: C.textSecondary }}>{t('التكلفة التقديرية')}:</span>
                                        <span style={{ color: C.textPrimary, fontWeight: 700, fontFamily: OUTFIT }}>{(parseFloat(form.estimatedCost) || 0).toLocaleString()} {cSymbol}</span>
                                    </div>
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        background: form.expectedProfit >= 0 ? 'rgba(74,222,128,0.06)' : 'rgba(239,68,68,0.06)',
                                        border: `1px solid ${form.expectedProfit >= 0 ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                        padding: '10px 12px', borderRadius: '10px', marginTop: '4px'
                                    }}>
                                        <span style={{ color: C.textSecondary, fontSize: '12px', fontWeight: 600 }}>{t('الربح المتوقع')}</span>
                                        <span style={{ color: form.expectedProfit >= 0 ? '#4ade80' : '#ef4444', fontWeight: 700, fontSize: '15px', fontFamily: OUTFIT }}>
                                            {form.expectedProfit.toLocaleString()} {cSymbol}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 5: الحالة والتواريخ */}
                            <div style={SC}>
                                <div style={{ ...STitle, color: '#256af4' }}>{t('التواريخ والحالة')}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('حالة المشروع')}</label>
                                        <CustomSelect
                                            value={form.status}
                                            onChange={val => setForm({ ...form, status: val })}
                                            placeholder={t('حالة المشروع')}
                                            options={[
                                                { value: 'active', label: t('نشط / جاري العمل') },
                                                { value: 'paused', label: t('متوقف مؤقتاً') },
                                                { value: 'completed', label: t('مكتمل') },
                                                { value: 'cancelled', label: t('ملغي') }
                                            ]}
                                            minWidth="100%"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('تاريخ البدء')} <span style={{ color: C.danger }}>*</span></label>
                                        <input required type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, fontSize: '11px' }}>{t('التاريخ المتوقع للانتهاء')}</label>
                                        <input type="date" value={form.expectedEndDate} onChange={e => setForm({ ...form, expectedEndDate: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                                <button disabled={submitting} type="submit" style={BTN_PRIMARY(false, submitting)}>
                                    {submitting ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><Save size={18} /> {t('إنشاء المشروع الآن')}</>}
                                </button>
                                <Link href="/projects" style={{
                                    height: '42px', borderRadius: '12px', background: 'transparent', border: `1px solid ${C.border}`,
                                    color: C.textSecondary, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    textDecoration: 'none', fontSize: '13px', fontFamily: CAIRO, transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    {t('إلغاء')}
                                </Link>
                            </div>
                        </div>

                    </form>
                )}
            </div>

            <style jsx global>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
                input[type=number] { -moz-appearance:textfield; }
            `}</style>
        </DashboardLayout>
    );
}
