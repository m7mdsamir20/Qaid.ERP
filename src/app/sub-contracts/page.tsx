'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { HardHat, Plus, Search, Loader2, Calendar, DollarSign, Edit3, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, TABLE_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import AppModal from '@/components/AppModal';
import { useCurrency } from '@/hooks/useCurrency';

interface SubContract {
    id: string;
    contractNumber: number;
    projectId: string;
    subcontractorId: string;
    description: string | null;
    contractValue: number;
    paidAmount: number;
    remaining: number;
    startDate: string | null;
    endDate: string | null;
    status: string;
    notes: string | null;
    project: { name: string } | null;
    subcontractor: { name: string } | null;
}

export default function SubContractsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { fMoney, symbol: cSymbol } = useCurrency();

    const [contracts, setContracts] = useState<SubContract[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [subcontractors, setSubcontractors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    // Modal controls
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [deleteItem, setDeleteItem] = useState<SubContract | null>(null);
    const [deleteError, setDeleteError] = useState('');

    const [form, setForm] = useState({
        projectId: '',
        subcontractorId: '',
        description: '',
        contractValue: '',
        startDate: '',
        endDate: '',
        notes: '',
        status: 'active'
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [cntRes, projRes, subRes] = await Promise.all([
                fetch('/api/sub-contracts'),
                fetch('/api/projects?take=1000'),
                fetch('/api/subcontractors?take=1000')
            ]);
            if (cntRes.ok) setContracts(await cntRes.json());
            if (projRes.ok) {
                const projData = await projRes.json();
                setProjects(projData.projects || projData || []);
            }
            if (subRes.ok) setSubcontractors(await subRes.json());
        } catch (e) {
            console.error("Error fetching sub-contracts details:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openNew = () => {
        setForm({
            projectId: '',
            subcontractorId: '',
            description: '',
            contractValue: '',
            startDate: '',
            endDate: '',
            notes: '',
            status: 'active'
        });
        setError('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.projectId || !form.subcontractorId || !form.contractValue) {
            setError(t('يرجى تعبئة كافة الحقول المطلوبة'));
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/sub-contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    contractValue: parseFloat(form.contractValue) || 0
                })
            });

            if (res.ok) {
                setShowModal(false);
                fetchData();
            } else {
                const data = await res.json();
                setError(data.error || t('فشل في حفظ العقد'));
            }
        } catch {
            setError(t('حدث خطأ في الاتصال بالخادم'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/sub-contracts/${deleteItem.id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setDeleteItem(null);
                setDeleteError('');
                fetchData();
            } else {
                const data = await res.json();
                setDeleteError(data.error || t('فشل في حذف العقد'));
            }
        } catch {
            setDeleteError(t('حدث خطأ في الاتصال بالخادم'));
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = contracts.filter(c => {
        const matchesSearch = c.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.subcontractor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            String(c.contractNumber).includes(searchTerm);
        return matchesSearch;
    });

    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
        active: { label: t('نشط'), color: C.success, bg: C.successBg },
        completed: { label: t('مكتمل'), color: C.primary, bg: C.primaryBg },
        cancelled: { label: t('ملغي'), color: C.danger, bg: C.dangerBg }
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: CAIRO, background: C.bg, minHeight: '100%', paddingBottom: '60px' }}>
                
                <PageHeader 
                    title={t("عقود مقاولي الباطن")}
                    subtitle={t("إصدار ومتابعة عقود مقاولي الباطن لمختلف مراحل ومشاريع الشركة")}
                    icon={HardHat}
                    primaryButton={{
                        label: t("عقد باطن جديد"),
                        onClick: openNew,
                        icon: Plus
                    }}
                />

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder={t("ابحث برقم العقد، اسم المقاول، المشروع...")}
                            style={{ ...IS, paddingInlineStart: '40px', height: '40px', fontSize: '13px', background: C.card, borderRadius: '12px' }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '70px', textAlign: 'center' }}>
                            <HardHat size={36} style={{ color: C.textMuted, opacity: 0.3, margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>{t('لا توجد عقود باطن مسجلة حالياً')}</p>
                        </div>
                    ) : (
                        <div className="scroll-table" style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true) }}>{t('رقم العقد')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('المشروع')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('المقاول')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('توصيف الأعمال')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('قيمة العقد')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('المدفوع')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('المتبقي')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('الحالة')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((c, idx) => {
                                        const status = statusLabels[c.status] || { label: c.status, color: C.textSecondary, bg: C.border };
                                        return (
                                            <tr key={c.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}>
                                                <td style={{ ...TABLE_STYLE.td(true), fontFamily: OUTFIT, fontWeight: 700 }}>CNT-{String(c.contractNumber).padStart(5, '0')}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600 }}>{c.project?.name}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600 }}>{c.subcontractor?.name}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', color: C.textSecondary }}>{c.description || '—'}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center' }}>{fMoney(c.contractValue)}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center', color: C.success }}>{fMoney(c.paidAmount)}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center', color: c.remaining > 0 ? '#fb7185' : C.textMuted }}>{fMoney(c.remaining)}</td>
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

                {/* MODAL: ADD SUB-CONTRACT */}
                <AppModal show={showModal} onClose={() => setShowModal(false)} icon={HardHat} title={t('إنشاء عقد مقاول باطن جديد')} maxWidth="600px">
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {error && (
                                <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.danger}33`, borderRadius: '8px', color: '#ef4444', fontSize: '12px' }}>
                                    {error}
                                </div>
                            )}

                            {/* Project & Subcontractor */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={LS}>{t('المشروع')} <span style={{ color: C.danger }}>*</span></label>
                                    <select required style={{ ...IS, cursor: 'pointer' }} value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                                        <option value="">{t('اختر المشروع...')}</option>
                                        {projects.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={LS}>{t('مقاول الباطن')} <span style={{ color: C.danger }}>*</span></label>
                                    <select required style={{ ...IS, cursor: 'pointer' }} value={form.subcontractorId} onChange={e => setForm({ ...form, subcontractorId: e.target.value })}>
                                        <option value="">{t('اختر المقاول...')}</option>
                                        {subcontractors.map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.specialty || t('بدون تخصص')})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Description & Value */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                                <div>
                                    <label style={LS}>{t('توصيف الأعمال')} <span style={{ color: C.danger }}>*</span></label>
                                    <input required type="text" placeholder={t('مثال: أعمال التأسيسات الكهربائية للبرج')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={LS}>{t('قيمة عقد الباطن')} <span style={{ color: C.danger }}>*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <input required type="number" step="any" placeholder="0.00" value={form.contractValue} onChange={e => setForm({ ...form, contractValue: e.target.value })} style={{ ...IS, paddingInlineEnd: '40px', fontFamily: OUTFIT, fontWeight: 700 }} onFocus={focusIn} onBlur={focusOut} />
                                        <span style={{ position: 'absolute', insetInlineEnd: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: C.textSecondary }}>{cSymbol}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Dates */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={LS}>{t('تاريخ البدء')}</label>
                                    <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={LS}>{t('تاريخ الانتهاء')}</label>
                                    <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label style={LS}>{t('ملاحظات وشروط إضافية')}</label>
                                <textarea rows={2} placeholder={t('أي شروط دفع أو مواصفات خاصة بالباطن...')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...IS, height: 'auto', padding: '10px 14px' }} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '24px' }}>
                            <button disabled={submitting} type="submit" style={{
                                height: '42px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none',
                                fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: submitting ? 'not-allowed' : 'pointer'
                            }}>
                                {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : t('حفظ العقد')}
                            </button>
                            <button type="button" onClick={() => setShowModal(false)} style={{ height: '42px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{t('إلغاء')}</button>
                        </div>
                    </form>
                </AppModal>

                {deleteItem && (
                    <AppModal
                        show={!!deleteItem}
                        onClose={() => { setDeleteItem(null); setDeleteError(''); }}
                        isDelete={true}
                        title={t("تأكيد حذف العقد")}
                        itemName={`CNT-${String(deleteItem.contractNumber).padStart(5, '0')}`}
                        onConfirm={handleDelete}
                        isSubmitting={submitting}
                        error={deleteError}
                    />
                )}

                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
                    input[type=number] { -moz-appearance:textfield; }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
