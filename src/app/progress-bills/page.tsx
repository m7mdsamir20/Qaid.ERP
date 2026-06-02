'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Plus, Search, Loader2, Calendar, DollarSign, ArrowUpDown, Trash2, Edit3, Eye, User, Settings } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, TABLE_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import AppModal from '@/components/AppModal';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';

interface BillLine {
    phaseId: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    previousPercent: number;
    currentPercent: number;
    completionPercent: number;
    amount: number;
}

interface ProgressBill {
    id: string;
    billNumber: number;
    projectId: string;
    date: string;
    subtotal: number;
    retentionRate: number;
    retentionAmount: number;
    advanceDeduction: number;
    otherDeductions: number;
    netAmount: number;
    paidAmount: number;
    remaining: number;
    status: string;
    notes: string | null;
    project: { name: string } | null;
    lines: BillLine[];
}

export default function ProgressBillsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { fMoney, symbol: cSymbol } = useCurrency();

    const [bills, setBills] = useState<ProgressBill[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [selectedProjectPhases, setSelectedProjectPhases] = useState<any[]>([]);
    const [loadingPhases, setLoadingPhases] = useState(false);

    // Form state
    const [form, setForm] = useState({
        projectId: '',
        date: new Date().toISOString().split('T')[0],
        retentionRate: '10', // 10% retention by default
        advanceDeduction: '',
        otherDeductions: '',
        notes: '',
        status: 'draft'
    });

    const [lines, setLines] = useState<BillLine[]>([]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [billsRes, projRes] = await Promise.all([
                fetch('/api/progress-bills'),
                fetch('/api/projects?take=1000')
            ]);
            if (billsRes.ok) setBills(await billsRes.ok ? await billsRes.json() : []);
            if (projRes.ok) {
                const projData = await projRes.json();
                setProjects(projData.projects || projData || []);
            }
        } catch (e) {
            console.error("Error fetching progress bills:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle project selection to load its phases
    const handleProjectChange = async (projectId: string) => {
        setForm(prev => ({ ...prev, projectId }));
        if (!projectId) {
            setSelectedProjectPhases([]);
            setLines([]);
            return;
        }

        setLoadingPhases(true);
        try {
            const res = await fetch(`/api/projects/${projectId}`);
            if (res.ok) {
                const projectDetails = await res.json();
                const phases = projectDetails.phases || [];
                setSelectedProjectPhases(phases);

                // Build bill lines from project phases
                const initialLines = phases.map((phase: any) => ({
                    phaseId: phase.id,
                    description: phase.name,
                    quantity: 1,
                    unitPrice: phase.estimatedCost || 0,
                    previousPercent: phase.completionPercent || 0,
                    currentPercent: 0,
                    completionPercent: phase.completionPercent || 0,
                    amount: 0
                }));
                setLines(initialLines);
            }
        } catch (err) {
            console.error("Error fetching project phases:", err);
        } finally {
            setLoadingPhases(false);
        }
    };

    // Update current percent for a line
    const handleLinePercentChange = (idx: number, currentVal: string) => {
        const currentPercent = parseFloat(currentVal) || 0;
        const newLines = [...lines];
        const line = newLines[idx];
        
        line.currentPercent = currentPercent;
        line.completionPercent = Math.min(100, line.previousPercent + currentPercent);
        // Calculate amount: unitPrice * (currentPercent / 100)
        line.amount = line.unitPrice * (currentPercent / 100);
        
        setLines(newLines);
    };

    // Calculate totals
    const subtotal = lines.reduce((acc, line) => acc + line.amount, 0);
    const retentionRateVal = parseFloat(form.retentionRate) || 0;
    const retentionAmount = subtotal * (retentionRateVal / 100);
    const advanceDec = parseFloat(form.advanceDeduction) || 0;
    const otherDec = parseFloat(form.otherDeductions) || 0;
    const netAmount = Math.max(0, subtotal - retentionAmount - advanceDec - otherDec);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.projectId) {
            setError(t('يجب اختيار المشروع'));
            return;
        }
        if (lines.length === 0) {
            setError(t('لا توجد بنود مستخلص للإرسال'));
            return;
        }
        
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/progress-bills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: form.projectId,
                    date: form.date,
                    subtotal,
                    retentionRate: retentionRateVal,
                    retentionAmount,
                    advanceDeduction: advanceDec,
                    otherDeductions: otherDec,
                    netAmount,
                    status: form.status,
                    notes: form.notes,
                    lines: lines.filter(l => l.currentPercent > 0) // only send lines with actual progress
                })
            });

            if (res.ok) {
                setShowModal(false);
                setForm({
                    projectId: '',
                    date: new Date().toISOString().split('T')[0],
                    retentionRate: '10',
                    advanceDeduction: '',
                    otherDeductions: '',
                    notes: '',
                    status: 'draft'
                });
                setLines([]);
                fetchData();
            } else {
                const data = await res.json();
                setError(data.error || t('فشل في حفظ المستخلص'));
            }
        } catch {
            setError(t('حدث خطأ في الاتصال بالخادم'));
        } finally {
            setSubmitting(false);
        }
    };

    const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
        draft: { label: t('مسودة'), color: C.textSecondary, bg: 'rgba(255,255,255,0.06)' },
        approved: { label: t('معتمد'), color: C.warning, bg: C.warningBg },
        paid: { label: t('مدفوع'), color: C.success, bg: C.successBg },
    };

    const filtered = bills.filter(b => {
        const matchesSearch = b.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(b.billNumber).includes(searchTerm);
        return matchesSearch;
    });

    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: CAIRO, background: C.bg, minHeight: '100%', paddingBottom: '60px' }}>
                
                <PageHeader 
                    title={t("مستخلصات المالك")}
                    subtitle={t("إصدار ومتابعة مستخلصات الأعمال المرفوعة لمالك المشروع")}
                    icon={FileText}
                    primaryButton={{
                        label: t("مستخلص جديد"),
                        onClick: () => setShowModal(true),
                        icon: Plus
                    }}
                />

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder={t("ابحث برقم المستخلص أو اسم المشروع...")}
                            style={{ ...IS, paddingInlineStart: '40px', height: '40px', fontSize: '13px', background: C.card, borderRadius: '12px' }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Bills Table */}
                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '70px', textAlign: 'center' }}>
                            <FileText size={36} style={{ color: C.textMuted, opacity: 0.3, margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>{t('لا توجد مستخلصات مسجلة حالياً')}</p>
                        </div>
                    ) : (
                        <div className="scroll-table" style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true) }}>{t('رقم المستخلص')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('المشروع')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('التاريخ')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('مبلغ الأعمال')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('ضمان الأعمال %')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('صافي المستحق')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('المحصل')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('الحالة')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((b, idx) => {
                                        const status = statusLabels[b.status] || { label: b.status, color: C.textSecondary, bg: C.border };
                                        return (
                                            <tr key={b.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}>
                                                <td style={{ ...TABLE_STYLE.td(true), fontFamily: OUTFIT, fontWeight: 700 }}>BIL-{String(b.billNumber).padStart(5, '0')}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600 }}>{b.project?.name}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT }}>{new Date(b.date).toLocaleDateString()}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center' }}>{fMoney(b.subtotal)}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center', color: C.warning }}>{fMoney(b.retentionAmount)} ({b.retentionRate}%)</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center', fontWeight: 600, color: C.primary }}>{fMoney(b.netAmount)}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center', color: C.success }}>{fMoney(b.paidAmount)}</td>
                                                <td style={{ ...TABLE_STYLE.td(false) }}>
                                                    <span style={{
                                                        display: 'inline-flex', padding: '3px 12px', borderRadius: '30px', fontSize: '11px', fontWeight: 600,
                                                        background: status.bg, color: status.color, border: `1px solid ${status.color}20`
                                                    }}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <Pagination
                                total={filtered.length}
                                pageSize={pageSize}
                                currentPage={currentPage}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>

                {/* MODAL: CREATE PROGRESS BILL */}
                <AppModal show={showModal} onClose={() => setShowModal(false)} icon={FileText} title={t('إنشاء مستخلص مالك جديد')} maxWidth="800px">
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {error && (
                                <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.danger}33`, borderRadius: '8px', color: '#ef4444', fontSize: '12px' }}>
                                    {error}
                                </div>
                            )}

                            {/* Row 1: Project & Date */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                                <div>
                                    <label style={LS}>{t('المشروع')} <span style={{ color: C.danger }}>*</span></label>
                                    <select required style={{ ...IS, cursor: 'pointer' }} value={form.projectId} onChange={e => handleProjectChange(e.target.value)}>
                                        <option value="">{t('اختر المشروع لرفع الأعمال عليه...')}</option>
                                        {projects.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={LS}>{t('التاريخ')} <span style={{ color: C.danger }}>*</span></label>
                                    <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} />
                                </div>
                            </div>

                            {/* Section 2: Bill Lines (Phases Progress) */}
                            {form.projectId && (
                                <div>
                                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: C.primary, marginBottom: '10px', borderBottom: `1px dashed ${C.border}`, paddingBottom: '6px' }}>
                                        {t('إثبات نسب إنجاز بنود الأعمال')}
                                    </h4>
                                    
                                    {loadingPhases ? (
                                        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                                            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                                        </div>
                                    ) : lines.length === 0 ? (
                                        <p style={{ fontSize: '12px', color: C.textSecondary, textAlign: 'center', margin: '20px 0' }}>
                                            {t('لا توجد مراحل عمل مضافة لهذا المشروع. يرجى إضافة مراحل عمل للمشروع أولاً.')}
                                        </p>
                                    ) : (
                                        <div style={{ maxHeight: '250px', overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: '10px', background: 'rgba(255,255,255,0.01)' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                <thead>
                                                    <tr style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
                                                        <th style={{ padding: '8px 10px', textAlign: 'start' }}>{t('بند العمل / المرحلة')}</th>
                                                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>{t('قيمة التقدير')}</th>
                                                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>{t('الإنجاز السابق')}</th>
                                                        <th style={{ padding: '8px 10px', textAlign: 'center', width: '100px' }}>{t('الإنجاز الحالي %')}</th>
                                                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>{t('الإنجاز الكلي')}</th>
                                                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>{t('القيمة المستحقة')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {lines.map((line, idx) => (
                                                        <tr key={idx} style={{ borderBottom: idx < lines.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                                            <td style={{ padding: '10px', fontWeight: 600 }}>{line.description}</td>
                                                            <td style={{ padding: '10px', fontFamily: OUTFIT, textAlign: 'center' }}>{fMoney(line.unitPrice)}</td>
                                                            <td style={{ padding: '10px', fontFamily: OUTFIT, textAlign: 'center', color: C.textSecondary }}>{line.previousPercent}%</td>
                                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={100 - line.previousPercent}
                                                                    step="any"
                                                                    placeholder="0"
                                                                    value={line.currentPercent || ''}
                                                                    onChange={e => handleLinePercentChange(idx, e.target.value)}
                                                                    style={{ ...IS, height: '28px', padding: '2px 6px', textAlign: 'center', fontFamily: OUTFIT, fontSize: '12px' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '10px', fontFamily: OUTFIT, textAlign: 'center', fontWeight: 600 }}>{line.completionPercent}%</td>
                                                            <td style={{ padding: '10px', fontFamily: OUTFIT, textAlign: 'center', color: C.primary, fontWeight: 700 }}>{fMoney(line.amount)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Section 3: Financial Calculations */}
                            {form.projectId && lines.length > 0 && (
                                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                                        <div>
                                            <label style={LS}>{t('نسبة الضمان %')}</label>
                                            <input type="number" min="0" max="100" value={form.retentionRate} onChange={e => setForm({ ...form, retentionRate: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} />
                                        </div>
                                        <div>
                                            <label style={LS}>{t('خصم دفعة مقدمة')}</label>
                                            <div style={{ position: 'relative' }}>
                                                <input type="number" step="any" placeholder="0.00" value={form.advanceDeduction} onChange={e => setForm({ ...form, advanceDeduction: e.target.value })} style={{ ...IS, paddingInlineEnd: '30px', fontFamily: OUTFIT }} />
                                                <span style={{ position: 'absolute', insetInlineEnd: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: C.textSecondary }}>{cSymbol}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={LS}>{t('خصومات أخرى')}</label>
                                            <div style={{ position: 'relative' }}>
                                                <input type="number" step="any" placeholder="0.00" value={form.otherDeductions} onChange={e => setForm({ ...form, otherDeductions: e.target.value })} style={{ ...IS, paddingInlineEnd: '30px', fontFamily: OUTFIT }} />
                                                <span style={{ position: 'absolute', insetInlineEnd: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: C.textSecondary }}>{cSymbol}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={LS}>{t('حالة المستخلص')}</label>
                                            <select style={{ ...IS, cursor: 'pointer' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                                <option value="draft">{t('مسودة')}</option>
                                                <option value="approved">{t('معتمد للمطالبة')}</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Calculations Breakdown */}
                                    <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: C.textSecondary }}>{t('قيمة الأعمال المنفذة (الإجمالي)')}:</span>
                                            <span style={{ fontFamily: OUTFIT, fontWeight: 600 }}>{fMoney(subtotal)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fb7185' }}>
                                            <span>{t('ضمان الأعمال المخصوم')}:</span>
                                            <span style={{ fontFamily: OUTFIT }}>- {fMoney(retentionAmount)}</span>
                                        </div>
                                        {(advanceDec > 0 || otherDec > 0) && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fb7185' }}>
                                                <span>{t('إجمالي الاستقطاعات الأخرى')}:</span>
                                                <span style={{ fontFamily: OUTFIT }}>- {fMoney(advanceDec + otherDec)}</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.border}`, paddingTop: '8px', fontSize: '15px', fontWeight: 700 }}>
                                            <span style={{ color: C.primary }}>{t('صافي القيمة المستحقة للمالك')}:</span>
                                            <span style={{ color: C.primary, fontFamily: OUTFIT }}>{fMoney(netAmount)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Row 4: Notes */}
                            <div>
                                <label style={LS}>{t('ملاحظات المستخلص')}</label>
                                <textarea rows={2} placeholder={t('أي ملاحظات فنية أو إدارية تخص هذا المستخلص...')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...IS, height: 'auto', padding: '8px 12px' }} />
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '24px' }}>
                            <button disabled={submitting} type="submit" style={{
                                height: '42px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none',
                                fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: submitting ? 'not-allowed' : 'pointer'
                            }}>
                                {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : t('حفظ المستخلص')}
                            </button>
                            <button type="button" onClick={() => setShowModal(false)} style={{ height: '42px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{t('إلغاء')}</button>
                        </div>
                    </form>
                </AppModal>

                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
                    input[type=number] { -moz-appearance:textfield; }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
