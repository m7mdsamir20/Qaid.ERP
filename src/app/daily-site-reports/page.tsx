'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { ClipboardCheck, Plus, Search, Eye, Trash2, Calendar, CloudSun } from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import AppModal from '@/components/AppModal';
import DataTable from '@/components/DataTable';
import Link from 'next/link';

interface DailySiteReport {
    id: string;
    reportNumber: number;
    projectId: string;
    date: string;
    weather: string | null;
    workersCount: number;
    workDescription: string;
    issues: string | null;
    safetyIncidents: string | null;
    completionPercent: number | null;
    notes: string | null;
    submittedBy: string | null;
    project: { id: string; name: string; projectNumber: number } | null;
}

const WEATHER_LABELS: Record<string, string> = {
    sunny: 'مشمس',
    cloudy: 'غائم',
    rainy: 'ممطر',
    stormy: 'عاصف',
    hot: 'حار',
};

export default function DailySiteReportsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';

    const [reports, setReports] = useState<DailySiteReport[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [projectFilter, setProjectFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const [deleteItem, setDeleteItem] = useState<DailySiteReport | null>(null);
    const [deleteError, setDeleteError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (projectFilter) params.set('projectId', projectFilter);
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);

            const [reportsRes, projRes] = await Promise.all([
                fetch(`/api/daily-site-reports?${params.toString()}`),
                fetch('/api/projects?take=1000'),
            ]);
            if (reportsRes.ok) {
                const data = await reportsRes.json();
                setReports(data.reports || []);
            }
            if (projRes.ok) {
                const d = await projRes.json();
                setProjects(d.projects || []);
            }
        } catch (e) {
            console.error('Error fetching daily site reports:', e);
        } finally {
            setLoading(false);
        }
    }, [projectFilter, dateFrom, dateTo]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, projectFilter, dateFrom, dateTo]);

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSubmitting(true);
        setDeleteError('');
        try {
            const res = await fetch(`/api/daily-site-reports/${deleteItem.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteItem(null);
                fetchData();
            } else {
                const err = await res.json();
                setDeleteError(err.error || t('فشل في حذف التقرير'));
            }
        } catch {
            setDeleteError(t('حدث خطأ في الاتصال بالخادم'));
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = reports.filter(r => {
        const term = searchTerm.toLowerCase();
        return (
            String(r.reportNumber).includes(term) ||
            (r.project?.name?.toLowerCase().includes(term))
        );
    });

    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: CAIRO, background: C.bg, minHeight: '100%', paddingBottom: '60px' }}>

                <PageHeader
                    title={t('التقارير اليومية للمواقع')}
                    subtitle={t('متابعة وتوثيق التقارير اليومية للمشاريع الإنشائية')}
                    icon={ClipboardCheck}
                    primaryButton={{
                        label: t('تقرير جديد'),
                        onClick: () => { window.location.href = '/daily-site-reports/new'; },
                        icon: Plus,
                    }}
                />

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                        <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon()} />
                        <input
                            type="text"
                            placeholder={t('ابحث برقم التقرير أو اسم المشروع...')}
                            style={{ ...IS, paddingInlineStart: '40px', height: '40px', fontSize: '13px', background: C.card, borderRadius: '12px' }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ minWidth: '180px' }}>
                        <select
                            style={{ ...IS, height: '40px', fontSize: '13px', background: C.card, borderRadius: '12px', cursor: 'pointer' }}
                            value={projectFilter}
                            onChange={e => setProjectFilter(e.target.value)}
                        >
                            <option value="">{t('كل المشاريع')}</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <Calendar size={14} style={{ position: 'absolute', insetInlineStart: '10px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted, pointerEvents: 'none' }} />
                            <input
                                type="date"
                                style={{ ...IS, paddingInlineStart: '32px', height: '40px', fontSize: '12px', background: C.card, borderRadius: '12px', width: '148px', fontFamily: OUTFIT }}
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                            />
                        </div>
                        <span style={{ color: C.textMuted, fontSize: '12px' }}>—</span>
                        <input
                            type="date"
                            style={{ ...IS, height: '40px', fontSize: '12px', background: C.card, borderRadius: '12px', width: '148px', fontFamily: OUTFIT }}
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                        />
                    </div>
                </div>

                <DataTable
                    columns={[
                        {
                            header: t('رقم التقرير'),
                            type: 'text',
                            cell: (row: DailySiteReport) => (
                                <span style={{ fontFamily: OUTFIT, fontWeight: 700, color: C.primary }}>
                                    DSR-{String(row.reportNumber).padStart(5, '0')}
                                </span>
                            ),
                        },
                        {
                            header: t('المشروع'),
                            type: 'text',
                            cell: (row: DailySiteReport) => (
                                <span style={{ fontWeight: 600, color: C.textPrimary }}>{row.project?.name || '—'}</span>
                            ),
                        },
                        {
                            header: t('التاريخ'),
                            type: 'number',
                            cell: (row: DailySiteReport) => (
                                <span style={{ fontFamily: OUTFIT, color: C.textSecondary }}>
                                    {new Date(row.date).toLocaleDateString('ar-EG')}
                                </span>
                            ),
                        },
                        {
                            header: t('الطقس'),
                            type: 'text',
                            cell: (row: DailySiteReport) => (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: C.textSecondary }}>
                                    {row.weather ? (
                                        <>
                                            <CloudSun size={13} />
                                            {WEATHER_LABELS[row.weather] || row.weather}
                                        </>
                                    ) : '—'}
                                </span>
                            ),
                        },
                        {
                            header: t('عدد العمال'),
                            type: 'number',
                            cell: (row: DailySiteReport) => (
                                <span style={{ fontFamily: OUTFIT, fontWeight: 600 }}>{row.workersCount}</span>
                            ),
                        },
                        {
                            header: t('نسبة الإنجاز'),
                            type: 'number',
                            cell: (row: DailySiteReport) => (
                                row.completionPercent !== null ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                        <div style={{ width: '60px', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div style={{ width: `${row.completionPercent}%`, height: '100%', background: C.success, borderRadius: '10px' }} />
                                        </div>
                                        <span style={{ fontFamily: OUTFIT, fontWeight: 600, fontSize: '12px' }}>{row.completionPercent}%</span>
                                    </div>
                                ) : <span style={{ color: C.textMuted }}>—</span>
                            ),
                        },
                        {
                            header: t('مقدم التقرير'),
                            type: 'text',
                            cell: (row: DailySiteReport) => (
                                <span style={{ color: C.textSecondary, fontSize: '12px' }}>{row.submittedBy || '—'}</span>
                            ),
                        },
                        {
                            header: t('الإجراءات'),
                            type: 'number',
                            cell: (row: DailySiteReport) => (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                                    <Link href={`/daily-site-reports/${row.id}`} style={TABLE_STYLE.actionBtn()}>
                                        <Eye size={TABLE_STYLE.actionIconSize} />
                                    </Link>
                                    <button onClick={() => setDeleteItem(row)} style={TABLE_STYLE.actionBtn(C.danger)}>
                                        <Trash2 size={TABLE_STYLE.actionIconSize} />
                                    </button>
                                </div>
                            ),
                        },
                    ]}
                    data={paginated}
                    emptyIcon={ClipboardCheck}
                    emptyMessage={t('لا توجد تقارير يومية مسجلة حالياً')}
                    isLoading={loading}
                    onRowClick={(row) => { window.location.href = `/daily-site-reports/${row.id}`; }}
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
                        title={t('تأكيد حذف التقرير')}
                        itemName={`DSR-${String(deleteItem.reportNumber).padStart(5, '0')}`}
                        onConfirm={handleDelete}
                        isSubmitting={submitting}
                        error={deleteError}
                    />
                )}

                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </DashboardLayout>
    );
}
