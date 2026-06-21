'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { FolderKanban, Plus, Loader2, Calendar, MapPin, DollarSign, BarChart2, Layers, HardHat, FileText, User, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, TABLE_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import CustomSelect from '@/components/CustomSelect';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Phase {
    id: string;
    name: string;
    sortOrder: number;
    estimatedCost: number;
    actualCost: number;
    startDate: string | null;
    endDate: string | null;
    completionPercent: number;
    status: string;
    notes: string | null;
}

interface Bill {
    id: string;
    billNumber: number;
    date: string;
    subtotal: number;
    netAmount: number;
    paidAmount: number;
    remaining: number;
    status: string;
}

interface SubContract {
    id: string;
    contractNumber: number;
    description: string | null;
    contractValue: number;
    paidAmount: number;
    remaining: number;
    status: string;
    subcontractor: { name: string; specialty: string | null } | null;
}

interface ProjectDetails {
    id: string;
    projectNumber: number;
    name: string;
    description: string | null;
    customerId: string | null;
    location: string | null;
    projectType: string;
    contractValue: number;
    estimatedCost: number;
    actualCost: number;
    expectedProfit: number;
    startDate: string;
    expectedEndDate: string | null;
    actualEndDate: string | null;
    managerId: string | null;
    status: string;
    completionPercent: number;
    notes: string | null;
    customer: { name: string; phone: string | null } | null;
    manager: { name: string; phone: string | null } | null;
    phases: Phase[];
    progressBills: Bill[];
    subContracts: SubContract[];
}

export default function ProjectDetailsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { fMoney, symbol: cSymbol } = useCurrency();
    const params = useParams();
    const id = params.id as string;

    const [project, setProject] = useState<ProjectDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'phases' | 'contracts' | 'bills'>('overview');
    
    // Add Phase Modal
    const [showPhaseModal, setShowPhaseModal] = useState(false);
    const [submittingPhase, setSubmittingPhase] = useState(false);
    const [phaseError, setPhaseError] = useState('');
    const [phaseForm, setPhaseForm] = useState({
        name: '',
        sortOrder: '1',
        estimatedCost: '',
        startDate: '',
        endDate: '',
        status: 'pending',
        notes: ''
    });

    const fetchProjectDetails = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/projects/${id}`);
            if (res.ok) {
                setProject(await res.json());
            }
        } catch (error) {
            console.error("Error fetching project details:", error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchProjectDetails();
        }
    }, [id, fetchProjectDetails]);

    const handleAddPhase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phaseForm.name.trim()) return;
        setSubmittingPhase(true);
        setPhaseError('');

        try {
            const res = await fetch(`/api/projects/${id}/phases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: phaseForm.name,
                    sortOrder: parseInt(phaseForm.sortOrder) || 0,
                    estimatedCost: parseFloat(phaseForm.estimatedCost) || 0,
                    startDate: phaseForm.startDate || null,
                    endDate: phaseForm.endDate || null,
                    status: phaseForm.status,
                    notes: phaseForm.notes
                })
            });

            if (res.ok) {
                setShowPhaseModal(false);
                setPhaseForm({
                    name: '',
                    sortOrder: '1',
                    estimatedCost: '',
                    startDate: '',
                    endDate: '',
                    status: 'pending',
                    notes: ''
                });
                fetchProjectDetails();
            } else {
                const data = await res.json();
                setPhaseError(data.error || t('فشل في إضافة المرحلة'));
            }
        } catch {
            setPhaseError(t('حدث خطأ في الاتصال بالخادم'));
        } finally {
            setSubmittingPhase(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                    <p style={{ color: C.textSecondary, fontSize: '15px', fontFamily: CAIRO }}>{t('جاري تحميل تفاصيل المشروع...')}</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!project) {
        return (
            <DashboardLayout>
                <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                    <FolderKanban size={40} style={{ color: C.danger }} />
                    <p style={{ color: C.textSecondary, fontSize: '15px', fontFamily: CAIRO }}>{t('المشروع غير موجود')}</p>
                    <Link href="/projects" style={{ color: C.primary, textDecoration: 'none', fontWeight: 600 }}>{t('العودة لقائمة المشاريع')}</Link>
                </div>
            </DashboardLayout>
        );
    }

    const projectTypeLabels: Record<string, string> = {
        residential: t('سكني'),
        commercial: t('تجاري'),
        government: t('حكومي'),
        maintenance: t('صيانة وتشغيل'),
    };

    const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
        active: { label: t('نشط'), color: C.success, bg: C.successBg },
        paused: { label: t('متوقف مؤقتاً'), color: C.warning, bg: C.warningBg },
        completed: { label: t('مكتمل'), color: C.primary, bg: C.primaryBg },
        cancelled: { label: t('ملغي'), color: C.danger, bg: C.dangerBg },
    };

    const phaseStatusLabels: Record<string, { label: string; color: string; bg: string }> = {
        pending: { label: t('قيد الانتظار'), color: C.textSecondary, bg: 'rgba(255,255,255,0.06)' },
        in_progress: { label: t('جاري التنفيذ'), color: C.warning, bg: C.warningBg },
        completed: { label: t('مكتملة'), color: C.success, bg: C.successBg },
    };

    const billStatusLabels: Record<string, { label: string; color: string; bg: string }> = {
        draft: { label: t('مسودة'), color: C.textSecondary, bg: 'rgba(255,255,255,0.06)' },
        approved: { label: t('معتمد'), color: C.warning, bg: C.warningBg },
        paid: { label: t('مدفوع'), color: C.success, bg: C.successBg },
    };

    const tabs = [
        { id: 'overview', label: t('نظرة عامة'), icon: FolderKanban },
        { id: 'phases', label: t('مراحل العمل'), icon: Layers },
        { id: 'contracts', label: t('عقود مقاولي الباطن'), icon: HardHat },
        { id: 'bills', label: t('المستخلصات'), icon: FileText },
    ] as const;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: CAIRO, background: C.bg, minHeight: '100%', paddingBottom: '60px' }}>
                
                <PageHeader 
                    title={project.name}
                    subtitle={`PRJ-${String(project.projectNumber).padStart(5, '0')} | ${projectTypeLabels[project.projectType] || project.projectType}`}
                    icon={FolderKanban}
                    backUrl="/projects"
                />


                {/* Tab Navigation Buttons */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${C.border}`, marginBottom: '20px', paddingBottom: '1px', flexWrap: 'wrap' }}>
                    {tabs.map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px',
                                    border: 'none', borderBottom: `2px solid ${active ? C.primary : 'transparent'}`,
                                    background: 'transparent', color: active ? C.primary : C.textSecondary,
                                    fontWeight: active ? 700 : 500, fontSize: '13px', fontFamily: CAIRO,
                                    cursor: 'pointer', transition: 'all 0.2s', marginBottom: '-1px'
                                }}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Contents */}
                
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Financial Statistics Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px' }}>
                                <p style={{ fontSize: '11px', color: C.textSecondary, margin: '0 0 4px' }}>{t('قيمة عقد المشروع')}</p>
                                <span style={{ fontSize: '16px', fontWeight: 600, color: C.primary, fontFamily: OUTFIT }}>{fMoney(project.contractValue)}</span>
                            </div>
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px' }}>
                                <p style={{ fontSize: '11px', color: C.textSecondary, margin: '0 0 4px' }}>{t('التكلفة التقديرية للعمل')}</p>
                                <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{fMoney(project.estimatedCost)}</span>
                            </div>
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px' }}>
                                <p style={{ fontSize: '11px', color: C.textSecondary, margin: '0 0 4px' }}>{t('التكلفة الفعلية المسجلة')}</p>
                                <span style={{ fontSize: '16px', fontWeight: 600, color: C.danger, fontFamily: OUTFIT }}>{fMoney(project.actualCost)}</span>
                            </div>
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px' }}>
                                <p style={{ fontSize: '11px', color: C.textSecondary, margin: '0 0 4px' }}>{t('الربح التقديري المتوقع')}</p>
                                <span style={{ fontSize: '16px', fontWeight: 600, color: '#4ade80', fontFamily: OUTFIT }}>{fMoney(project.expectedProfit)}</span>
                            </div>
                        </div>

                        {/* Split columns: Left = Project Info, Right = Client & Manager Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                            {/* Project details card */}
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.primary, borderBottom: `1px solid ${C.border}`, paddingBottom: '8px', marginBottom: '14px' }}>{t('تفاصيل المشروع')}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span style={{ color: C.textSecondary }}>{t('حالة المشروع')}:</span>
                                        <span style={{
                                            fontWeight: 600, color: (statusLabels[project.status] || {}).color,
                                            background: (statusLabels[project.status] || {}).bg, padding: '2px 10px', borderRadius: '20px', fontSize: '11px'
                                        }}>
                                            {(statusLabels[project.status] || {}).label || project.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span style={{ color: C.textSecondary }}>{t('تاريخ البدء')}:</span>
                                        <span style={{ color: C.textPrimary, fontFamily: OUTFIT, fontWeight: 500 }}>{new Date(project.startDate).toLocaleDateString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span style={{ color: C.textSecondary }}>{t('تاريخ الانتهاء المتوقع')}:</span>
                                        <span style={{ color: C.textPrimary, fontFamily: OUTFIT, fontWeight: 500 }}>
                                            {project.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString() : t('غير محدد')}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span style={{ color: C.textSecondary }}>{t('الموقع الجغرافي')}:</span>
                                        <span style={{ color: C.textPrimary, fontWeight: 500 }}>
                                            {project.location ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} color={C.primary} /> {project.location}</div>
                                            ) : t('غير محدد')}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', marginTop: '10px' }}>
                                        <span style={{ color: C.textSecondary }}>{t('نسبة الإنجاز الكلية')}:</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{ width: `${project.completionPercent}%`, height: '100%', background: C.success, borderRadius: '10px' }} />
                                            </div>
                                            <span style={{ fontWeight: 600, fontFamily: OUTFIT }}>{project.completionPercent}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Client & Manager details card */}
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.primary, borderBottom: `1px solid ${C.border}`, paddingBottom: '8px', marginBottom: '14px' }}>{t('الجهات المعنية')}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Client */}
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: C.primaryBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '11px', color: C.textSecondary, display: 'block' }}>{t('العميل / المالك')}</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>{project.customer?.name || t('غير محدد')}</span>
                                            {project.customer?.phone && <span style={{ fontSize: '11px', color: C.textSecondary, display: 'block', fontFamily: OUTFIT, direction: 'ltr', textAlign: 'start' }}>{project.customer.phone}</span>}
                                        </div>
                                    </div>
                                    
                                    {/* Manager */}
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: '14px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9' }}>
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '11px', color: C.textSecondary, display: 'block' }}>{t('المهندس / مدير المشروع')}</span>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>{project.manager?.name || t('غير محدد')}</span>
                                            {project.manager?.phone && <span style={{ fontSize: '11px', color: C.textSecondary, display: 'block', fontFamily: OUTFIT, direction: 'ltr', textAlign: 'start' }}>{project.manager.phone}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Project Description/Notes card */}
                        {(project.description || project.notes) && (
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.primary, borderBottom: `1px solid ${C.border}`, paddingBottom: '8px', marginBottom: '14px' }}>{t('مواصفات وملاحظات إضافية')}</h3>
                                {project.description && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <span style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 700, display: 'block', marginBottom: '4px' }}>{t('الوصف')}:</span>
                                        <p style={{ fontSize: '13px', color: C.textPrimary, margin: 0, whiteSpace: 'pre-line' }}>{project.description}</p>
                                    </div>
                                )}
                                {project.notes && (
                                    <div>
                                        <span style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 700, display: 'block', marginBottom: '4px' }}>{t('ملاحظات العقد')}:</span>
                                        <p style={{ fontSize: '13px', color: C.textPrimary, margin: 0, whiteSpace: 'pre-line' }}>{project.notes}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. PHASES TAB */}
                {activeTab === 'phases' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary }}>{t('مراحل عمل المشروع')}</h3>
                            <button
                                onClick={() => setShowPhaseModal(true)}
                                style={{
                                    height: '34px', padding: '0 14px', background: C.primary, color: '#fff',
                                    border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '12px',
                                    fontFamily: CAIRO, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                <Plus size={14} />
                                {t('إضافة مرحلة جديدة')}
                            </button>
                        </div>

                        <div style={TABLE_STYLE.container}>
                            {project.phases.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <Layers size={28} style={{ color: C.textMuted, opacity: 0.3, margin: '0 auto 8px' }} />
                                    <p style={{ fontSize: '13px', color: C.textSecondary, margin: 0 }}>{t('لا توجد مراحل مسجلة لهذا المشروع بعد')}</p>
                                </div>
                            ) : (
                                <table style={TABLE_STYLE.table}>
                                    <thead>
                                        <tr style={TABLE_STYLE.thead}>
                                            <th style={{ ...TABLE_STYLE.th(true) }}>{t('الترتيب')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false) }}>{t('اسم المرحلة')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false) }}>{t('الفترة الزمنية')}</th>
                                            <th style={TABLE_STYLE.th(false, true)}>{t('التكلفة التقديرية')}</th>
                                            <th style={TABLE_STYLE.th(false, true)}>{t('التكلفة الفعلية')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false), width: '140px' }}>{t('نسبة الإنجاز')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false) }}>{t('الحالة')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {project.phases.map((phase, idx) => {
                                            const status = phaseStatusLabels[phase.status] || { label: phase.status, color: C.textSecondary, bg: C.border };
                                            return (
                                                <tr key={phase.id} style={TABLE_STYLE.row(idx === project.phases.length - 1)}>
                                                    <td style={{ ...TABLE_STYLE.td(true), fontFamily: OUTFIT, fontWeight: 700 }}>#{phase.sortOrder}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600 }}>{phase.name}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontSize: '11px', color: C.textSecondary, fontFamily: OUTFIT }}>
                                                        {phase.startDate ? new Date(phase.startDate).toLocaleDateString() : '—'} 
                                                        {phase.endDate ? ` ➔ ${new Date(phase.endDate).toLocaleDateString()}` : ''}
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center' }}>{fMoney(phase.estimatedCost)}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center', color: C.danger }}>{fMoney(phase.actualCost)}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false) }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${phase.completionPercent}%`, height: '100%', background: C.success, borderRadius: '10px' }} />
                                                            </div>
                                                            <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: OUTFIT }}>{phase.completionPercent}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(false) }}>
                                                        <span style={{
                                                            display: 'inline-flex', padding: '2px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 600,
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
                            )}
                        </div>
                    </div>
                )}

                {/* 3. CONTRACTS TAB */}
                {activeTab === 'contracts' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary }}>{t('عقود مقاولي الباطن للمشروع')}</h3>
                            <Link
                                href={`/sub-contracts`}
                                style={{
                                    height: '34px', padding: '0 14px', background: C.primary, color: '#fff',
                                    border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '12px',
                                    fontFamily: CAIRO, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                    textDecoration: 'none'
                                }}
                            >
                                <Plus size={14} />
                                {t('عقد باطن جديد')}
                            </Link>
                        </div>

                        <div style={TABLE_STYLE.container}>
                            {project.subContracts.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <HardHat size={28} style={{ color: C.textMuted, opacity: 0.3, margin: '0 auto 8px' }} />
                                    <p style={{ fontSize: '13px', color: C.textSecondary, margin: 0 }}>{t('لا توجد عقود باطن مسجلة لهذا المشروع بعد')}</p>
                                </div>
                            ) : (
                                <table style={TABLE_STYLE.table}>
                                    <thead>
                                        <tr style={TABLE_STYLE.thead}>
                                            <th style={{ ...TABLE_STYLE.th(true) }}>{t('رقم العقد')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false) }}>{t('المقاول')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false) }}>{t('العمل / التخصص')}</th>
                                            <th style={TABLE_STYLE.th(false, true)}>{t('قيمة العقد')}</th>
                                            <th style={TABLE_STYLE.th(false, true)}>{t('المدفوع')}</th>
                                            <th style={TABLE_STYLE.th(false, true)}>{t('المتبقي')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false) }}>{t('الحالة')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {project.subContracts.map((contract, idx) => {
                                            const isDone = contract.status === 'completed';
                                            return (
                                                <tr key={contract.id} style={TABLE_STYLE.row(idx === project.subContracts.length - 1)}>
                                                    <td style={{ ...TABLE_STYLE.td(true), fontFamily: OUTFIT, fontWeight: 700 }}>CNT-{String(contract.contractNumber).padStart(5, '0')}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600 }}>{contract.subcontractor?.name}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', color: C.textSecondary }}>{contract.subcontractor?.specialty || contract.description || '—'}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center' }}>{fMoney(contract.contractValue)}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center', color: '#4ade80' }}>{fMoney(contract.paidAmount)}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center', color: contract.remaining > 0 ? '#fb7185' : C.textMuted }}>{fMoney(contract.remaining)}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false) }}>
                                                        <span style={{
                                                            display: 'inline-flex', padding: '2px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 600,
                                                            background: isDone ? C.primaryBg : C.successBg, color: isDone ? C.primary : C.success
                                                        }}>
                                                            {isDone ? t('مكتمل') : t('نشط')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. BILLS TAB */}
                {activeTab === 'bills' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary }}>{t('مستخلصات المالك المعتمدة')}</h3>
                            <Link
                                href={`/progress-bills`}
                                style={{
                                    height: '34px', padding: '0 14px', background: C.primary, color: '#fff',
                                    border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '12px',
                                    fontFamily: CAIRO, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                    textDecoration: 'none'
                                }}
                            >
                                <Plus size={14} />
                                {t('مستخلص جديد')}
                            </Link>
                        </div>

                        <div style={TABLE_STYLE.container}>
                            {project.progressBills.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <FileText size={28} style={{ color: C.textMuted, opacity: 0.3, margin: '0 auto 8px' }} />
                                    <p style={{ fontSize: '13px', color: C.textSecondary, margin: 0 }}>{t('لا توجد مستخلصات مسجلة لهذا المشروع بعد')}</p>
                                </div>
                            ) : (
                                <table style={TABLE_STYLE.table}>
                                    <thead>
                                        <tr style={TABLE_STYLE.thead}>
                                            <th style={{ ...TABLE_STYLE.th(true) }}>{t('رقم المستخلص')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false) }}>{t('التاريخ')}</th>
                                            <th style={TABLE_STYLE.th(false, true)}>{t('المبلغ الإجمالي')}</th>
                                            <th style={TABLE_STYLE.th(false, true)}>{t('الصافي المستحق')}</th>
                                            <th style={TABLE_STYLE.th(false, true)}>{t('المحصل')}</th>
                                            <th style={TABLE_STYLE.th(false, true)}>{t('المتبقي')}</th>
                                            <th style={{ ...TABLE_STYLE.th(false) }}>{t('الحالة')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {project.progressBills.map((bill, idx) => {
                                            const status = billStatusLabels[bill.status] || { label: bill.status, color: C.textSecondary, bg: C.border };
                                            return (
                                                <tr key={bill.id} style={TABLE_STYLE.row(idx === project.progressBills.length - 1)}>
                                                    <td style={{ ...TABLE_STYLE.td(true), fontFamily: OUTFIT, fontWeight: 700 }}>BIL-{String(bill.billNumber).padStart(5, '0')}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT }}>{new Date(bill.date).toLocaleDateString()}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center' }}>{fMoney(bill.subtotal)}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center', fontWeight: 600 }}>{fMoney(bill.netAmount)}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center', color: '#4ade80' }}>{fMoney(bill.paidAmount)}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center', color: bill.remaining > 0 ? '#fb7185' : C.textMuted }}>{fMoney(bill.remaining)}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false) }}>
                                                        <span style={{
                                                            display: 'inline-flex', padding: '2px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 600,
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
                            )}
                        </div>
                    </div>
                )}

                {/* MODAL: ADD PHASE */}
                <AppModal show={showPhaseModal} onClose={() => setShowPhaseModal(false)} icon={Layers} title={t('إضافة مرحلة عمل جديدة')} maxWidth="500px">
                    <form onSubmit={handleAddPhase}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {phaseError && (
                                <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: `1px solid ${C.danger}33`, borderRadius: '8px', color: '#ef4444', fontSize: '12px' }}>
                                    {phaseError}
                                </div>
                            )}
                            <div>
                                <label style={LS}>{t('اسم المرحلة')} <span style={{ color: C.danger }}>*</span></label>
                                <input required type="text" placeholder={t('مثال: الحفر وتجهيز التربة')} value={phaseForm.name} onChange={e => setPhaseForm({ ...phaseForm, name: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={LS}>{t('ترتيب المرحلة')} <span style={{ color: C.danger }}>*</span></label>
                                    <input required type="number" min="1" value={phaseForm.sortOrder} onChange={e => setPhaseForm({ ...phaseForm, sortOrder: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={LS}>{t('التكلفة التقديرية')}</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type="number" step="any" placeholder="0.00" value={phaseForm.estimatedCost} onChange={e => setPhaseForm({ ...phaseForm, estimatedCost: e.target.value })} style={{ ...IS, paddingInlineEnd: '45px', fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                        <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: C.textSecondary }}>{cSymbol}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={LS}>{t('تاريخ البدء')}</label>
                                    <input type="date" value={phaseForm.startDate} onChange={e => setPhaseForm({ ...phaseForm, startDate: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={LS}>{t('تاريخ الانتهاء')}</label>
                                    <input type="date" value={phaseForm.endDate} onChange={e => setPhaseForm({ ...phaseForm, endDate: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>
                            <div>
                                <label style={LS}>{t('الحالة')}</label>
                                <CustomSelect
                                    value={phaseForm.status}
                                    onChange={val => setPhaseForm({ ...phaseForm, status: val })}
                                    placeholder={t('اختر الحالة')}
                                    hideSearch={true}
                                    options={[
                                        { value: 'pending', label: t('قيد الانتظار') },
                                        { value: 'in_progress', label: t('جاري التنفيذ') },
                                        { value: 'completed', label: t('مكتملة') }
                                    ]}
                                    style={{ height: '42px', width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={LS}>{t('ملاحظات')}</label>
                                <textarea rows={2} placeholder={t('أي شروط أو تفاصيل لهذه المرحلة...')} value={phaseForm.notes} onChange={e => setPhaseForm({ ...phaseForm, notes: e.target.value })} style={{ ...IS, height: 'auto', padding: '10px 14px' }} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '24px' }}>
                            <button disabled={submittingPhase} type="submit" style={{
                                height: '42px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none',
                                fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: submittingPhase ? 'not-allowed' : 'pointer'
                            }}>
                                {submittingPhase ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : t('إضافة المرحلة')}
                            </button>
                            <button type="button" onClick={() => setShowPhaseModal(false)} style={{ height: '42px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{t('إلغاء')}</button>
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
