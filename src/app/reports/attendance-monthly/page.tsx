'use client';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import TableSkeleton from '@/components/TableSkeleton';
import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, OUTFIT, IS } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { Search, Calendar, Users, CheckCircle } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

interface AttendanceSummaryRow {
    id: string;
    employeeName: string;
    department: string;
    position: string;
    present: number;
    absent: number;
    late: number;
    leave: number;
}

interface ReportData {
    records: AttendanceSummaryRow[];
}

export default function AttendanceMonthlyPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [q, setQ] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    const fetchReport = async (currentBranchId = branchId) => {
        setLoading(true);
        try {
            const [yearStr, monthStr] = month.split('-');
            let url = `/api/reports/hr?type=attendance-monthly&month=${monthStr}&year=${yearStr}`;
            if (currentBranchId && currentBranchId !== 'all') {
                url += `&branchId=${currentBranchId}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const results = await res.json();
                setData(results);
            } else {
                setData(null);
            }
        } catch (error) {
            console.error('Failed to fetch attendance report:', error);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(branchId); }, [month, branchId]);

    const filtered = data ? data.records.filter(r => r.employeeName.toLowerCase().includes(q.toLowerCase())) : [];

    const columns: TableColumn[] = [
        {
            header: t('الموظف'),
            cell: (row: AttendanceSummaryRow) => (
                <div>
                    <div style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, fontSize: '13px' }}>{row.employeeName}</div>
                    <div style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO, marginTop: '2px' }}>{row.position}</div>
                </div>
            )
        },
        {
            header: t('القسم'),
            cell: (row: AttendanceSummaryRow) => row.department,
            style: { fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }
        },
        {
            header: t('أيام الحضور'),
            cell: (row: AttendanceSummaryRow) => (
                <span style={{ fontWeight: 600, color: '#10b981', fontFamily: OUTFIT }}>{row.present}</span>
            ),
            style: { textAlign: 'center', fontSize: '13px' } as React.CSSProperties
        },
        {
            header: t('أيام الغياب'),
            cell: (row: AttendanceSummaryRow) => (
                <span style={{ fontWeight: 600, color: '#ef4444', fontFamily: OUTFIT }}>{row.absent}</span>
            ),
            style: { textAlign: 'center', fontSize: '13px' } as React.CSSProperties
        },
        {
            header: t('أيام التأخير'),
            cell: (row: AttendanceSummaryRow) => (
                <span style={{ fontWeight: 600, color: '#fb923c', fontFamily: OUTFIT }}>{row.late}</span>
            ),
            style: { textAlign: 'center', fontSize: '13px' } as React.CSSProperties
        },
        {
            header: t('أيام الإجازات'),
            cell: (row: AttendanceSummaryRow) => (
                <span style={{ fontWeight: 600, color: '#256af4', fontFamily: OUTFIT }}>{row.leave}</span>
            ),
            style: { textAlign: 'center', fontSize: '13px' } as React.CSSProperties
        }
    ];

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("كشف الحضور الشهري")}
                    subtitle={t("تقرير إجمالي يوضح عدد أيام الحضور، الغياب، التأخير، والإجازات لكل موظف خلال الشهر.")}
                    backTab="hr"
                    branchName={selectedBranchName}
                    printTitle={t("كشف الحضور الشهري")}
                    printDate={new Date(month + '-01').toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' })}
                />

                {/* Filters */}
                <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                        <div style={{ minWidth: '180px' }}>
                            <CustomSelect
                                value={branchId}
                                onChange={v => { setBranchId(v); fetchReport(v); }}
                                placeholder={t("كل الفروع")}
                                hideSearch={true}
                                options={[
                                    { value: 'all', label: t('كل الفروع') },
                                    ...branches.map((b) => ({ value: b.id, label: b.name }))
                                ]}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('الشهر:')}</span>
                        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                            style={{
                                ...IS, height: '42px', padding: '0 12px', 
                                borderRadius: '12px', border: `1px solid ${C.border}`,
                                background: C.card, color: C.textPrimary, fontSize: '13px',
                                fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                            }}
                        />
                    </div>
                </div>

                <div className="no-print" style={{ position: 'relative', marginBottom: '24px' }}>
                    <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                    <input placeholder={t("ابحث باسم الموظف...")} value={q} onChange={e => setQ(e.target.value)} style={{ ...IS, paddingInlineStart: '45px', height: '42px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }} />
                </div>

                {loading ? ( <TableSkeleton /> ) : (
                    <div className="print-table-container">
                        <DataTable
                            columns={columns}
                            data={filtered}
                            emptyIcon={CheckCircle}
                            emptyMessage={t('لا توجد سجلات حضور لهذا الشهر')}
                        />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
