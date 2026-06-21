'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import { ClipboardCheck, Loader2, Save } from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, SC, STitle, PAGE_BASE, BTN_PRIMARY } from '@/constants/theme';

export default function NewDailySiteReportPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        projectId: '',
        date: new Date().toISOString().split('T')[0],
        weather: '',
        workersCount: '',
        completionPercent: '',
        workDescription: '',
        issues: '',
        safetyIncidents: '',
        notes: '',
    });

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/projects?take=1000');
                if (res.ok) {
                    const d = await res.json();
                    setProjects(d.projects || []);
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.projectId) { setError('يرجى اختيار المشروع'); return; }
        if (!form.workDescription.trim()) { setError('يرجى إدخال وصف العمل المنجز'); return; }
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/daily-site-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: form.projectId,
                    date: form.date,
                    weather: form.weather || null,
                    workersCount: form.workersCount ? Number(form.workersCount) : 0,
                    completionPercent: form.completionPercent !== '' ? Number(form.completionPercent) : null,
                    workDescription: form.workDescription,
                    issues: form.issues || null,
                    safetyIncidents: form.safetyIncidents || null,
                    notes: form.notes || null,
                }),
            });
            if (res.ok) {
                window.location.href = '/daily-site-reports';
            } else {
                const d = await res.json();
                setError(d.error || 'فشل في حفظ التقرير');
            }
        } catch {
            setError('حدث خطأ في الاتصال بالخادم');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ ...PAGE_BASE, fontFamily: CAIRO }}>
                <PageHeader
                    title="تقرير يومي جديد"
                    subtitle="توثيق أعمال الموقع ليومية العمل"
                    icon={ClipboardCheck}
                    backUrl="/daily-site-reports"
                />

                {loading ? (
                    <div style={{ ...SC, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '40px' }}>
                        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                        <span style={{ color: C.textSecondary, fontSize: '13px' }}>جاري تحميل البيانات...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {error && (
                            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.danger}33`, borderRadius: '10px', color: C.danger, fontSize: '13px', fontWeight: 600 }}>
                                {error}
                            </div>
                        )}

                        <div style={SC}>
                            <div style={STitle}><ClipboardCheck size={14} /> بيانات التقرير الأساسية</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="responsive-grid">
                                <div>
                                    <label style={LS}>المشروع <span style={{ color: C.danger }}>*</span></label>
                                    <select
                                        required
                                        style={{ ...IS, cursor: 'pointer' }}
                                        value={form.projectId}
                                        onChange={e => setForm({ ...form, projectId: e.target.value })}
                                        onFocus={focusIn}
                                        onBlur={focusOut}
                                    >
                                        <option value="">اختر المشروع...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={LS}>التاريخ <span style={{ color: C.danger }}>*</span></label>
                                    <input
                                        required
                                        type="date"
                                        style={{ ...IS, fontFamily: OUTFIT }}
                                        value={form.date}
                                        onChange={e => setForm({ ...form, date: e.target.value })}
                                        onFocus={focusIn}
                                        onBlur={focusOut}
                                    />
                                </div>
                                <div>
                                    <label style={LS}>الطقس</label>
                                    <select
                                        style={{ ...IS, cursor: 'pointer' }}
                                        value={form.weather}
                                        onChange={e => setForm({ ...form, weather: e.target.value })}
                                        onFocus={focusIn}
                                        onBlur={focusOut}
                                    >
                                        <option value="">اختر حالة الطقس...</option>
                                        <option value="sunny">مشمس</option>
                                        <option value="cloudy">غائم</option>
                                        <option value="rainy">ممطر</option>
                                        <option value="stormy">عاصف</option>
                                        <option value="hot">حار</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={LS}>عدد العمال</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        style={{ ...IS, fontFamily: OUTFIT }}
                                        value={form.workersCount}
                                        onChange={e => setForm({ ...form, workersCount: e.target.value })}
                                        onFocus={focusIn}
                                        onBlur={focusOut}
                                    />
                                </div>
                                <div>
                                    <label style={LS}>نسبة الإنجاز % (0-100)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        placeholder="مثال: 35"
                                        style={{ ...IS, fontFamily: OUTFIT }}
                                        value={form.completionPercent}
                                        onChange={e => setForm({ ...form, completionPercent: e.target.value })}
                                        onFocus={focusIn}
                                        onBlur={focusOut}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={SC}>
                            <div style={STitle}><ClipboardCheck size={14} /> تفاصيل الأعمال والملاحظات</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={LS}>وصف العمل المنجز <span style={{ color: C.danger }}>*</span></label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="صف الأعمال التي تم إنجازها في الموقع اليوم..."
                                        style={{ ...IS, height: 'auto', padding: '10px 14px', resize: 'vertical' }}
                                        value={form.workDescription}
                                        onChange={e => setForm({ ...form, workDescription: e.target.value })}
                                        onFocus={focusIn}
                                        onBlur={focusOut}
                                    />
                                </div>
                                <div>
                                    <label style={LS}>المشكلات والعقبات</label>
                                    <textarea
                                        rows={3}
                                        placeholder="سجّل أي مشكلات أو عقبات واجهتها في الموقع (اختياري)..."
                                        style={{ ...IS, height: 'auto', padding: '10px 14px', resize: 'vertical' }}
                                        value={form.issues}
                                        onChange={e => setForm({ ...form, issues: e.target.value })}
                                        onFocus={focusIn}
                                        onBlur={focusOut}
                                    />
                                </div>
                                <div>
                                    <label style={LS}>حوادث السلامة</label>
                                    <textarea
                                        rows={2}
                                        placeholder="سجّل أي حوادث أو ملاحظات تتعلق بالسلامة (اختياري)..."
                                        style={{ ...IS, height: 'auto', padding: '10px 14px', resize: 'vertical' }}
                                        value={form.safetyIncidents}
                                        onChange={e => setForm({ ...form, safetyIncidents: e.target.value })}
                                        onFocus={focusIn}
                                        onBlur={focusOut}
                                    />
                                </div>
                                <div>
                                    <label style={LS}>ملاحظات</label>
                                    <textarea
                                        rows={2}
                                        placeholder="أي ملاحظات إضافية (اختياري)..."
                                        style={{ ...IS, height: 'auto', padding: '10px 14px', resize: 'vertical' }}
                                        value={form.notes}
                                        onChange={e => setForm({ ...form, notes: e.target.value })}
                                        onFocus={focusIn}
                                        onBlur={focusOut}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button disabled={submitting} type="submit" style={{ ...BTN_PRIMARY(false, submitting), flex: 1 }}>
                                {submitting ? (
                                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                    <><Save size={16} /> حفظ التقرير</>
                                )}
                            </button>
                            <Link
                                href="/daily-site-reports"
                                style={{
                                    flex: 1, height: '48px', borderRadius: '14px', border: `1px solid ${C.border}`,
                                    background: 'transparent', color: C.textSecondary, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    textDecoration: 'none', fontSize: '14px', fontFamily: CAIRO,
                                }}
                            >
                                إلغاء
                            </Link>
                        </div>
                    </form>
                )}
            </div>
            <style jsx global>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
        </DashboardLayout>
    );
}
