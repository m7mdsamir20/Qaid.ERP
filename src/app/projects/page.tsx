'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { FolderKanban, Plus, Search, Loader2, Edit3, Trash2, Eye, User, Calendar, MapPin, DollarSign, BarChart2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, TABLE_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import AppModal from '@/components/AppModal';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';

interface Project {
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
    customer: { name: string } | null;
    manager: { name: string } | null;
    _count: { phases: number; progressBills: number } | null;
}

export default function ProjectsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { fMoney } = useCurrency();

    const [projects, setProjects] = useState<Project[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;
    const [deleteItem, setDeleteItem] = useState<Project | null>(null);
    const [deleteError, setDeleteError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [projRes, statsRes] = await Promise.all([
                fetch('/api/projects?take=1000'),
                fetch('/api/projects/stats')
            ]);
            
            if (projRes.ok) {
                const projData = await projRes.json();
                setProjects(projData.projects || []);
            }
            if (statsRes.ok) {
                setStats(await statsRes.json());
            }
        } catch (error) {
            console.error("Error fetching projects data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSubmitting(true);
        setDeleteError('');
        try {
            const res = await fetch(`/api/projects/${deleteItem.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setDeleteItem(null);
                fetchData();
            } else {
                const err = await res.json();
                setDeleteError(err.error || t('فشل في حذف المشروع'));
            }
        } catch {
            setDeleteError(t('حدث خطأ في الاتصال بالخادم'));
        } finally {
            setSubmitting(false);
        }
    };

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

    const filtered = projects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.projectNumber && String(p.projectNumber).includes(searchTerm)) ||
            (p.customer?.name && p.customer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.location && p.location.toLowerCase().includes(searchTerm.toLowerCase()));
            
        const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const kpis = [
        { label: t('إجمالي المشاريع'), value: stats?.projects?.total || 0, icon: FolderKanban, color: C.primary, suffix: t('مشروع') },
        { label: t('مشاريع نشطة'), value: stats?.projects?.active || 0, icon: BarChart2, color: C.success, suffix: t('مشروع') },
        { label: t('قيمة العقود الإجمالية'), value: stats?.finances?.contractValue || 0, icon: DollarSign, color: C.blue, isCurrency: true },
        { label: t('إجمالي المستخلصات المعتمدة'), value: stats?.finances?.totalBilled || 0, icon: DollarSign, color: C.warning, isCurrency: true },
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: CAIRO, background: C.bg, minHeight: '100%', paddingBottom: '60px' }}>
                
                <PageHeader 
                    title={t("المشاريع")}
                    subtitle={t("إدارة المشاريع الإنشائية، المراحل، والتكاليف")}
                    icon={FolderKanban}
                    primaryButton={{
                        label: t("مشروع جديد"),
                        onClick: () => window.location.href = '/projects/new',
                        icon: Plus
                    }}
                />

                {/* KPIs grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                    {kpis.map((kpi, idx) => (
                        <div key={idx} style={{
                            background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px',
                            padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div>
                                <p style={{ fontSize: '11px', fontWeight: 500, color: C.textSecondary, margin: '0 0 4px' }}>{kpi.label}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>
                                        {kpi.isCurrency ? fMoney(kpi.value) : kpi.value.toLocaleString()}
                                    </span>
                                    {!kpi.isCurrency && <span style={{ fontSize: '11px', color: C.textSecondary }}>{kpi.suffix}</span>}
                                </div>
                            </div>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                                <kpi.icon size={18} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {/* Search Input */}
                    <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder={t("ابحث برقم المشروع، الاسم، العميل، الموقع...")}
                            style={{ ...IS, paddingInlineStart: '40px', height: '40px', fontSize: '13px', background: C.card, borderRadius: '12px' }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Status Filter */}
                    <div style={{ width: '160px' }}>
                        <select
                            style={{ ...IS, height: '40px', fontSize: '13px', background: C.card, borderRadius: '12px', cursor: 'pointer' }}
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="all">{t('كل الحالات')}</option>
                            <option value="active">{t('نشط')}</option>
                            <option value="paused">{t('متوقف مؤقتاً')}</option>
                            <option value="completed">{t('مكتمل')}</option>
                            <option value="cancelled">{t('ملغي')}</option>
                        </select>
                    </div>
                </div>

                {/* Projects Table */}
                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '70px', textAlign: 'center' }}>
                            <FolderKanban size={36} style={{ color: C.textMuted, opacity: 0.3, margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>{t('لا توجد مشاريع مسجلة حالياً')}</p>
                        </div>
                    ) : (
                        <div className="scroll-table" style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true) }}>{t('رقم المشروع')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('اسم المشروع')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('العميل')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('نوع المشروع')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('قيمة العقد')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), width: '150px' }}>{t('نسبة الإنجاز')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('الحالة')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('إجراءات')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((p, idx) => {
                                        const status = statusLabels[p.status] || { label: p.status, color: C.textSecondary, bg: C.border };
                                        return (
                                            <tr key={p.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {/* Project Number */}
                                                <td style={{ ...TABLE_STYLE.td(true), fontFamily: OUTFIT, fontWeight: 700, color: C.primary }}>
                                                    PRJ-{String(p.projectNumber).padStart(5, '0')}
                                                </td>
                                                {/* Project Name */}
                                                <td style={{ ...TABLE_STYLE.td(false) }}>
                                                    <Link href={`/projects/${p.id}`} style={{ fontWeight: 600, color: C.textPrimary, textDecoration: 'none' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = C.primary}
                                                        onMouseLeave={e => e.currentTarget.style.color = C.textPrimary}>
                                                        {p.name}
                                                    </Link>
                                                    {p.location && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: C.textSecondary, marginTop: '2px' }}>
                                                            <MapPin size={10} />
                                                            <span>{p.location}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                {/* Customer */}
                                                <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', color: C.textSecondary }}>
                                                    {p.customer?.name || '—'}
                                                </td>
                                                {/* Project Type */}
                                                <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', color: C.textSecondary }}>
                                                    {projectTypeLabels[p.projectType] || p.projectType}
                                                </td>
                                                {/* Contract Value */}
                                                <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, fontWeight: 600, color: C.textPrimary, textAlign: 'center' }}>
                                                    {fMoney(p.contractValue)}
                                                </td>
                                                {/* Progress Percent */}
                                                <td style={{ ...TABLE_STYLE.td(false) }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                                                            <div style={{ width: `${p.completionPercent}%`, height: '100%', background: p.status === 'completed' ? C.primary : C.success, borderRadius: '10px' }} />
                                                        </div>
                                                        <span style={{ fontSize: '11px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{p.completionPercent}%</span>
                                                    </div>
                                                </td>
                                                {/* Status */}
                                                <td style={{ ...TABLE_STYLE.td(false) }}>
                                                    <span style={{
                                                        display: 'inline-flex', padding: '3px 12px', borderRadius: '30px', fontSize: '11px', fontWeight: 600,
                                                        background: status.bg, color: status.color, border: `1px solid ${status.color}20`
                                                    }}>
                                                        {status.label}
                                                    </span>
                                                </td>
                                                {/* Actions */}
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <Link href={`/projects/${p.id}`} style={TABLE_STYLE.actionBtn()}><Eye size={TABLE_STYLE.actionIconSize} /></Link>
                                                        <Link href={`/projects/edit/${p.id}`} style={TABLE_STYLE.actionBtn()}><Edit3 size={TABLE_STYLE.actionIconSize} /></Link>
                                                        <button onClick={() => setDeleteItem(p)} style={TABLE_STYLE.actionBtn(C.danger)}><Trash2 size={TABLE_STYLE.actionIconSize} /></button>
                                                    </div>
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

                {deleteItem && (
                    <AppModal
                        show={!!deleteItem}
                        onClose={() => { setDeleteItem(null); setDeleteError(''); }}
                        isDelete={true}
                        title={t("تأكيد حذف المشروع")}
                        itemName={deleteItem.name}
                        onConfirm={handleDelete}
                        isSubmitting={submitting}
                        error={deleteError}
                    />
                )}

                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
