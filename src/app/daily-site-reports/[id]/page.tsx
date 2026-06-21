'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import CustomSelect from '@/components/CustomSelect';
import { useParams } from 'next/navigation';
import { ClipboardCheck, Loader2, Edit3, Trash2, Save, X, Calendar, Users, CloudSun, BarChart2, FileText, AlertTriangle, ShieldAlert, MessageSquare } from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, SC, STitle, BTN_PRIMARY } from '@/constants/theme';

const WEATHER_LABELS: Record<string, string> = {
    sunny: 'مشمس',
    cloudy: 'غائم',
    rainy: 'ممطر',
    stormy: 'عاصف',
    hot: 'حار',
};

export default function DailySiteReportDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showDelete, setShowDelete] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [deleting, setDeleting] = useState(false);

    const [editForm, setEditForm] = useState({
        weather: '',
        workersCount: '',
        completionPercent: '',
        workDescription: '',
        issues: '',
        safetyIncidents: '',
        notes: '',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/daily-site-reports/${id}`);
            if (res.ok) {
                const data = await res.json();
                setReport(data);
                setEditForm({
                    weather: data.weather || '',
                    workersCount: String(data.workersCount ?? ''),
                    completionPercent: data.completionPercent !== null && data.completionPercent !== undefined ? String(data.completionPercent) : '',
                    workDescription: data.workDescription || '',
                    issues: data.issues || '',
                    safetyIncidents: data.safetyIncidents || '',
                    notes: data.notes || '',
                });
            }
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async () => {
        if (!editForm.workDescription.trim()) { setError('وصف العمل المنجز مطلوب'); return; }
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`/api/daily-site-reports/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weather: editForm.weather || null,
                    workersCount: editForm.workersCount !== '' ? Number(editForm.workersCount) : 0,
                    completionPercent: editForm.completionPercent !== '' ? Number(editForm.completionPercent) : null,
                    workDescription: editForm.workDescription,
                    issues: editForm.issues || null,
                    safetyIncidents: editForm.safetyIncidents || null,
                    notes: editForm.notes || null,
                }),
            });
            if (res.ok) {
                setEditing(false);
                fetchData();
            } else {
                const d = await res.json();
                setError(d.error || 'فشل في حفظ التعديلات');
            }
        } catch {
            setError('حدث خطأ في الاتصال بالخادم');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setDeleteError('');
        try {
            const res = await fetch(`/api/daily-site-reports/${id}`, { method: 'DELETE' });
            if (res.ok) {
                window.location.href = '/daily-site-reports';
            } else {
                const d = await res.json();
                setDeleteError(d.error || 'فشل في حذف التقرير');
            }
        } catch {
            setDeleteError('حدث خطأ في الاتصال بالخادم');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) return (
        <DashboardLayout>
            <div dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px', fontFamily: CAIRO }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                <span style={{ color: C.textSecondary }}>جاري التحميل...</span>
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );

    if (!report) return (
        <DashboardLayout>
            <div dir="rtl" style={{ textAlign: 'center', padding: '60px', fontFamily: CAIRO, color: C.textSecondary }}>
                التقرير غير موجود
            </div>
        </DashboardLayout>
    );

    const ref = `DSR-${String(report.reportNumber).padStart(5, '0')}`;

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ fontFamily: CAIRO, paddingBottom: '60px' }}>
                <PageHeader
                    title={ref}
                    subtitle={report.project?.name || ''}
                    icon={ClipboardCheck}
                    backUrl="/daily-site-reports"
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', alignItems: 'start' }} className="responsive-grid">

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {error && (
                            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.danger}33`, borderRadius: '10px', color: C.danger, fontSize: '13px', fontWeight: 600 }}>
                                {error}
                            </div>
                        )}

                        <div style={SC}>
                            <div style={{ ...STitle, justifyContent: 'space-between' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ClipboardCheck size={14} /> تفاصيل التقرير
                                </span>
                                {!editing && (
                                    <button
                                        onClick={() => { setEditing(true); setError(''); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', border: `1px solid ${C.primary}40`, background: 'rgba(37,106,244,0.08)', color: C.primary, cursor: 'pointer', fontSize: '12px', fontFamily: CAIRO, fontWeight: 600 }}
                                    >
                                        <Edit3 size={12} /> تعديل
                                    </button>
                                )}
                            </div>

                            {!editing ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    {[
                                        { label: 'رقم التقرير', value: ref, icon: ClipboardCheck },
                                        { label: 'المشروع', value: report.project?.name || '—', icon: FileText },
                                        { label: 'التاريخ', value: new Date(report.date).toLocaleDateString('ar-EG'), icon: Calendar },
                                        { label: 'الطقس', value: report.weather ? (WEATHER_LABELS[report.weather] || report.weather) : '—', icon: CloudSun },
                                        { label: 'عدد العمال', value: String(report.workersCount), icon: Users },
                                        { label: 'نسبة الإنجاز', value: report.completionPercent !== null ? `${report.completionPercent}%` : '—', icon: BarChart2 },
                                        { label: 'مقدم التقرير', value: report.submittedBy || '—', icon: FileText },
                                    ].map((item, i) => (
                                        <div key={i}>
                                            <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <item.icon size={10} />
                                                {item.label}
                                            </div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: i >= 4 ? OUTFIT : CAIRO }}>
                                                {item.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="responsive-grid">
                                    <div>
                                        <label style={LS}>الطقس</label>
                                        <CustomSelect
                                            value={editForm.weather}
                                            onChange={val => setEditForm({ ...editForm, weather: val })}
                                            placeholder="اختر حالة الطقس..."
                                            hideSearch={true}
                                            options={[
                                                { value: '', label: 'اختر حالة الطقس...' },
                                                { value: 'sunny', label: 'مشمس' },
                                                { value: 'cloudy', label: 'غائم' },
                                                { value: 'rainy', label: 'ممطر' },
                                                { value: 'stormy', label: 'عاصف' },
                                                { value: 'hot', label: 'حار' }
                                            ]}
                                            style={{ height: '42px', width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={LS}>عدد العمال</label>
                                        <input type="number" min="0" placeholder="0" style={{ ...IS, fontFamily: OUTFIT }} value={editForm.workersCount} onChange={e => setEditForm({ ...editForm, workersCount: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div>
                                        <label style={LS}>نسبة الإنجاز % (0-100)</label>
                                        <input type="number" min="0" max="100" step="0.1" placeholder="مثال: 35" style={{ ...IS, fontFamily: OUTFIT }} value={editForm.completionPercent} onChange={e => setEditForm({ ...editForm, completionPercent: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={SC}>
                            <div style={{ ...STitle }}>
                                <FileText size={14} /> وصف العمل المنجز
                            </div>
                            {!editing ? (
                                <p style={{ fontSize: '13px', color: C.textPrimary, lineHeight: '1.7', margin: 0, background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                                    {report.workDescription || '—'}
                                </p>
                            ) : (
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="صف الأعمال التي تم إنجازها في الموقع اليوم..."
                                    style={{ ...IS, height: 'auto', padding: '10px 14px', resize: 'vertical' }}
                                    value={editForm.workDescription}
                                    onChange={e => setEditForm({ ...editForm, workDescription: e.target.value })}
                                    onFocus={focusIn}
                                    onBlur={focusOut}
                                />
                            )}
                        </div>

                        {(!editing && (report.issues || report.safetyIncidents)) && (
                            <div style={SC}>
                                <div style={{ ...STitle }}><AlertTriangle size={14} /> المشكلات والسلامة</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {report.issues && (
                                        <div>
                                            <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <AlertTriangle size={10} /> المشكلات والعقبات
                                            </div>
                                            <p style={{ fontSize: '13px', color: C.textPrimary, lineHeight: '1.7', margin: 0, background: 'rgba(251,191,36,0.05)', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.warning}33` }}>
                                                {report.issues}
                                            </p>
                                        </div>
                                    )}
                                    {report.safetyIncidents && (
                                        <div>
                                            <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <ShieldAlert size={10} /> حوادث السلامة
                                            </div>
                                            <p style={{ fontSize: '13px', color: C.textPrimary, lineHeight: '1.7', margin: 0, background: 'rgba(239,68,68,0.05)', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.danger}33` }}>
                                                {report.safetyIncidents}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {editing && (
                            <div style={SC}>
                                <div style={{ ...STitle }}><AlertTriangle size={14} /> المشكلات والسلامة والملاحظات</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <label style={LS}>المشكلات والعقبات</label>
                                        <textarea rows={3} placeholder="سجّل أي مشكلات أو عقبات واجهتها في الموقع (اختياري)..." style={{ ...IS, height: 'auto', padding: '10px 14px', resize: 'vertical' }} value={editForm.issues} onChange={e => setEditForm({ ...editForm, issues: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div>
                                        <label style={LS}>حوادث السلامة</label>
                                        <textarea rows={2} placeholder="سجّل أي حوادث أو ملاحظات تتعلق بالسلامة (اختياري)..." style={{ ...IS, height: 'auto', padding: '10px 14px', resize: 'vertical' }} value={editForm.safetyIncidents} onChange={e => setEditForm({ ...editForm, safetyIncidents: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div>
                                        <label style={LS}>ملاحظات</label>
                                        <textarea rows={2} placeholder="أي ملاحظات إضافية (اختياري)..." style={{ ...IS, height: 'auto', padding: '10px 14px', resize: 'vertical' }} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {!editing && report.notes && (
                            <div style={SC}>
                                <div style={{ ...STitle }}><MessageSquare size={14} /> ملاحظات</div>
                                <p style={{ fontSize: '13px', color: C.textPrimary, lineHeight: '1.7', margin: 0, background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                                    {report.notes}
                                </p>
                            </div>
                        )}

                        {editing && (
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button disabled={submitting} onClick={handleSave} style={{ ...BTN_PRIMARY(false, submitting), flex: 1 }}>
                                    {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><Save size={16} /> حفظ التعديلات</>}
                                </button>
                                <button
                                    onClick={() => { setEditing(false); setError(''); fetchData(); }}
                                    style={{ flex: 1, height: '48px', borderRadius: '14px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontFamily: CAIRO }}
                                >
                                    <X size={16} /> إلغاء
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={SC}>
                            <div style={STitle}>ملخص التقرير</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Calendar size={11} /> التاريخ
                                    </span>
                                    <span style={{ fontFamily: OUTFIT, fontWeight: 600 }}>
                                        {new Date(report.date).toLocaleDateString('ar-EG')}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={11} /> العمال
                                    </span>
                                    <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.primary }}>
                                        {report.workersCount}
                                    </span>
                                </div>
                                {report.completionPercent !== null && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <BarChart2 size={11} /> الإنجاز
                                            </span>
                                            <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.success }}>
                                                {report.completionPercent}%
                                            </span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div style={{ width: `${report.completionPercent}%`, height: '100%', background: C.success, borderRadius: '10px' }} />
                                        </div>
                                    </div>
                                )}
                                {report.weather && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: C.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <CloudSun size={11} /> الطقس
                                        </span>
                                        <span style={{ fontWeight: 600 }}>
                                            {WEATHER_LABELS[report.weather] || report.weather}
                                        </span>
                                    </div>
                                )}
                                {report.submittedBy && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: C.textSecondary }}>مقدم التقرير</span>
                                        <span style={{ fontWeight: 600, fontSize: '12px' }}>{report.submittedBy}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={SC}>
                            <div style={STitle}>الإجراءات</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {!editing && (
                                    <button
                                        onClick={() => { setEditing(true); setError(''); }}
                                        style={{ width: '100%', height: '42px', borderRadius: '10px', border: `1px solid ${C.primary}40`, background: 'rgba(37,106,244,0.08)', color: C.primary, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontFamily: CAIRO }}
                                    >
                                        <Edit3 size={15} /> تعديل التقرير
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowDelete(true)}
                                    style={{ width: '100%', height: '42px', borderRadius: '10px', border: `1px solid ${C.danger}40`, background: 'rgba(239,68,68,0.08)', color: C.danger, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', fontFamily: CAIRO }}
                                >
                                    <Trash2 size={15} /> حذف التقرير
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <AppModal
                    show={showDelete}
                    onClose={() => { setShowDelete(false); setDeleteError(''); }}
                    isDelete={true}
                    title="تأكيد حذف التقرير"
                    itemName={ref}
                    onConfirm={handleDelete}
                    isSubmitting={deleting}
                    error={deleteError}
                />
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } } input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; } input[type=number] { -moz-appearance: textfield; }`}</style>
        </DashboardLayout>
    );
}
