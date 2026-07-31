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
import CustomSelect from '@/components/CustomSelect';
import { useCurrency } from '@/hooks/useCurrency';
import Link from 'next/link';
import DataTable from '@/components/DataTable';

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
    const isContracting = (session?.user as any)?.businessType?.toUpperCase() === 'CONTRACTING';

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
                            placeholder={isContracting ? t("ابحث برقم المشروع، الاسم، صاحب المشروع، الموقع...") : t("ابحث برقم المشروع، الاسم، العميل، الموقع...")}
                            style={{ ...IS, paddingInlineStart: '40px', height: '40px', fontSize: '13px', background: C.card, borderRadius: '12px' }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {/* Status Filter */}
                    <div style={{ width: '160px' }}>
                        <CustomSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                            placeholder={t('كل الحالات')}
                            hideSearch={true}
                            options={[
                                { value: 'all', label: t('كل الحالات') },
                                { value: 'active', label: t('نشط') },
                                { value: 'paused', label: t('متوقف مؤقتاً') },
                                { value: 'completed', label: t('مكتمل') },
                                { value: 'cancelled', label: t('ملغي') }
                            ]}
                            style={{ height: '40px', width: '100%' }}
                        />
                    </div>
                </div>

                <DataTable
                    columns={[
                        {
                            header: t('رقم المشروع'),
                            type: 'text',
                            cell: (row) => (
                                <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.primary }}>
                                    {`PRJ-${String(row.projectNumber).padStart(5, '0')}`}
                                </span>
                            )
                        },
                        {
                            header: t('اسم المشروع'),
                            type: 'text',
                            cell: (row) => (
                                <div>
                                    <Link href={`/projects/${row.id}`} style={{ fontWeight: 600, color: C.textPrimary, textDecoration: 'none' }}
                                        onMouseEnter={e => e.currentTarget.style.color = C.primary}
                                        onMouseLeave={e => e.currentTarget.style.color = C.textPrimary}>
                                        {row.name}
                                    </Link>
                                    {row.location && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: C.textSecondary, marginTop: '2px' }}>
                                            <MapPin size={10} />
                                            <span>{row.location}</span>
                                        </div>
                                    )}
                                </div>
                            )
                        },
                        {
                            header: isContracting ? t('المالك / صاحب المشروع') : t('العميل'),
                            type: 'text',
                            cell: (row) => row.customer?.name || '—'
                        },
                        {
                            header: t('نوع المشروع'),
                            type: 'text',
                            cell: (row) => projectTypeLabels[row.projectType] || row.projectType
                        },
                        {
                            header: t('قيمة العقد'),
                            type: 'number',
                            cell: (row) => fMoney(row.contractValue)
                        },
                        {
                            header: t('نسبة الإنجاز'),
                            type: 'number',
                            cell: (row) => (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                                        <div style={{ width: `${row.completionPercent}%`, height: '100%', background: row.status === 'completed' ? C.primary : C.success, borderRadius: '10px' }} />
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{row.completionPercent}%</span>
                                </div>
                            )
                        },
                        {
                            header: t('الحالة'),
                            type: 'number',
                            cell: (row) => {
                                const status = statusLabels[row.status] || { label: row.status, color: C.textSecondary, bg: C.border };
                                return (
                                    <span style={{
                                        display: 'inline-flex', padding: '3px 12px', borderRadius: '30px', fontSize: '11px', fontWeight: 600,
                                        background: status.bg, color: status.color, border: `1px solid ${status.color}20`
                                    }}>
                                        {status.label}
                                    </span>
                                );
                            }
                        },
                        {
                            header: t('إجراءات'),
                            type: 'number',
                            cell: (row) => (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                                    <Link href={`/projects/${row.id}`} style={TABLE_STYLE.actionBtn()}><Eye size={TABLE_STYLE.actionIconSize} /></Link>
                                    <Link href={`/projects/edit/${row.id}`} style={TABLE_STYLE.actionBtn()}><Edit3 size={TABLE_STYLE.actionIconSize} /></Link>
                                    <button onClick={() => setDeleteItem(row)} style={TABLE_STYLE.actionBtn(C.danger)}><Trash2 size={TABLE_STYLE.actionIconSize} /></button>
                                </div>
                            )
                        }
                    ]}
                    data={paginated}
                    emptyIcon={FolderKanban}
                    emptyMessage={t('لا توجد مشاريع مسجلة حالياً')}
                    isLoading={loading}
                    onRowClick={(row) => window.location.href = `/projects/${row.id}`}
                />
                {!loading && filtered.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                        <Pagination
                            total={filtered.length}
                            pageSize={pageSize}
                            currentPage={currentPage}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}

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
