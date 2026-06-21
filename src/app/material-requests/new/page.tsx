'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import { ClipboardList, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, SC, STitle, PAGE_BASE, BTN_PRIMARY } from '@/constants/theme';

interface LineItem {
    itemId: string;
    quantity: string;
    unit: string;
    notes: string;
}

export default function NewMaterialRequestPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [phases, setPhases] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        projectId: '',
        phaseId: '',
        requiredDate: '',
        notes: '',
    });

    const [lines, setLines] = useState<LineItem[]>([
        { itemId: '', quantity: '', unit: '', notes: '' },
    ]);

    useEffect(() => {
        const load = async () => {
            try {
                const [projRes, itemsRes] = await Promise.all([
                    fetch('/api/projects?take=1000'),
                    fetch('/api/items?take=1000'),
                ]);
                if (projRes.ok) { const d = await projRes.json(); setProjects(d.projects || []); }
                if (itemsRes.ok) { const d = await itemsRes.json(); setItems(d.items || d || []); }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (!form.projectId) { setPhases([]); return; }
        fetch(`/api/projects/${form.projectId}/phases`)
            .then(r => r.ok ? r.json() : [])
            .then(d => setPhases(Array.isArray(d) ? d : d.phases || []))
            .catch(() => setPhases([]));
    }, [form.projectId]);

    const addLine = () => setLines(prev => [...prev, { itemId: '', quantity: '', unit: '', notes: '' }]);
    const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));
    const updateLine = (i: number, field: keyof LineItem, val: string) => {
        setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.projectId) { setError('يرجى اختيار المشروع'); return; }
        const validLines = lines.filter(l => l.itemId && Number(l.quantity) > 0);
        if (validLines.length === 0) { setError('يرجى إضافة صنف واحد على الأقل بكمية صحيحة'); return; }
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/material-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, lines: validLines }),
            });
            if (res.ok) {
                window.location.href = '/material-requests';
            } else {
                const d = await res.json();
                setError(d.error || 'فشل في حفظ الطلب');
            }
        } catch { setError('حدث خطأ في الاتصال'); }
        finally { setSubmitting(false); }
    };

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ ...PAGE_BASE, fontFamily: CAIRO }}>
                <PageHeader
                    title="طلب مواد جديد"
                    subtitle="إنشاء طلب مواد لمشروع إنشائي"
                    icon={ClipboardList}
                    backUrl="/material-requests"
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

                        {/* بيانات أساسية */}
                        <div style={SC}>
                            <div style={{ ...STitle }}><ClipboardList size={14} /> بيانات الطلب</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="responsive-grid">
                                <div>
                                    <label style={LS}>المشروع <span style={{ color: C.danger }}>*</span></label>
                                    <select required style={{ ...IS, cursor: 'pointer' }} value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value, phaseId: '' })} onFocus={focusIn} onBlur={focusOut}>
                                        <option value="">اختر المشروع...</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={LS}>المرحلة</label>
                                    <select style={{ ...IS, cursor: 'pointer' }} value={form.phaseId} onChange={e => setForm({ ...form, phaseId: e.target.value })} onFocus={focusIn} onBlur={focusOut} disabled={!form.projectId || phases.length === 0}>
                                        <option value="">اختر المرحلة (اختياري)...</option>
                                        {phases.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={LS}>تاريخ المطلوب</label>
                                    <input type="date" style={{ ...IS, fontFamily: OUTFIT }} value={form.requiredDate} onChange={e => setForm({ ...form, requiredDate: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>
                            <div style={{ marginTop: '14px' }}>
                                <label style={LS}>ملاحظات</label>
                                <textarea rows={3} style={{ ...IS, height: 'auto', padding: '10px 14px', resize: 'none' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} onFocus={focusIn} onBlur={focusOut} placeholder="أي ملاحظات على الطلب..." />
                            </div>
                        </div>

                        {/* الأصناف */}
                        <div style={SC}>
                            <div style={{ ...STitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={14} /> الأصناف المطلوبة</span>
                                <button type="button" onClick={addLine} style={{ padding: '4px 12px', borderRadius: '8px', border: `1px solid ${C.primary}`, background: 'transparent', color: C.primary, cursor: 'pointer', fontSize: '12px', fontFamily: CAIRO, fontWeight: 600 }}>
                                    + إضافة صنف
                                </button>
                            </div>

                            {/* Header */}
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 40px', gap: '8px', marginBottom: '8px' }}>
                                {['الصنف', 'الكمية', 'الوحدة', 'ملاحظات', ''].map((h, i) => (
                                    <span key={i} style={{ fontSize: '11px', fontWeight: 700, color: C.textSecondary }}>{h}</span>
                                ))}
                            </div>

                            {lines.map((line, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 40px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                    <select style={{ ...IS, height: '38px', fontSize: '12px' }} value={line.itemId} onChange={e => updateLine(idx, 'itemId', e.target.value)} onFocus={focusIn} onBlur={focusOut}>
                                        <option value="">اختر الصنف...</option>
                                        {items.map((it: any) => <option key={it.id} value={it.id}>{it.name}</option>)}
                                    </select>
                                    <input type="number" min="0" step="any" placeholder="0" style={{ ...IS, height: '38px', fontSize: '12px', fontFamily: OUTFIT }} value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} onFocus={focusIn} onBlur={focusOut} />
                                    <input type="text" placeholder="وحدة" style={{ ...IS, height: '38px', fontSize: '12px' }} value={line.unit} onChange={e => updateLine(idx, 'unit', e.target.value)} onFocus={focusIn} onBlur={focusOut} />
                                    <input type="text" placeholder="ملاحظة..." style={{ ...IS, height: '38px', fontSize: '12px' }} value={line.notes} onChange={e => updateLine(idx, 'notes', e.target.value)} onFocus={focusIn} onBlur={focusOut} />
                                    <button type="button" onClick={() => removeLine(idx)} disabled={lines.length === 1} style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.danger, cursor: lines.length === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: lines.length === 1 ? 0.4 : 1 }}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button disabled={submitting} type="submit" style={{ ...BTN_PRIMARY(false, submitting), flex: 1 }}>
                                {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><Save size={16} /> حفظ الطلب</>}
                            </button>
                            <Link href="/material-requests" style={{ flex: 1, height: '48px', borderRadius: '14px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: '14px', fontFamily: CAIRO }}>
                                إلغاء
                            </Link>
                        </div>
                    </form>
                )}
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } } input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance:none; } input[type=number] { -moz-appearance:textfield; }`}</style>
        </DashboardLayout>
    );
}
