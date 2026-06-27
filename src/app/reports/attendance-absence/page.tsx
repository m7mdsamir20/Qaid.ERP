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
import { Search, ShieldAlert, AlertCircle, Calendar } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

interface AbsenceRecordRow {
    id: string;
    employeeName: string;
    department: string;
    position: string;
    absenceCount: number;
}

interface ReportData {
    records: AbsenceRecordRow[];
}

export default function AttendanceAbsencePage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    useEffect(() => {
        setMonth(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`);
    }, [selectedYear, selectedMonth]);

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
            let url = `/api/reports/hr?type=attendance-absence&month=${monthStr}&year=${yearStr}`;
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
            console.error('Failed to fetch absence report:', error);
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
            cell: (row: AbsenceRecordRow) => (
                <div>
                    <div style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, fontSize: '13px' }}>{row.employeeName}</div>
                    <div style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO, marginTop: '2px' }}>{row.position}</div>
                </div>
            )
        },
        {
            header: t('القسم'),
            cell: (row: AbsenceRecordRow) => row.department,
            style: { fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }
        },
        {
            header: t('أيام الغياب'),
            cell: (row: AbsenceRecordRow) => (
                <span style={{ fontWeight: 600, color: '#ef4444', fontFamily: OUTFIT }}>{row.absenceCount} {t('أيام')}</span>
            ),
            style: { textAlign: 'center', fontSize: '13px' } as React.CSSProperties
        }
    ];

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير الغيابات")}
                    subtitle={t("تقرير تفصيلي برصد حالات غياب الموظفين وإجمالي عدد أيام الغياب خلال الشهر المختار.")}
                    backTab="hr"
                    branchName={selectedBranchName}
                    printTitle={t("تقرير الغيابات")}
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
                        <span style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO, whiteSpace: 'nowrap' }}>{t('الشهر:')}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                                    style={{
                                        ...IS, height: '42px', padding: isRtl ? '0 34px 0 20px' : '0 20px 0 34px',
                                        borderRadius: '12px', border: `1px solid ${C.border}`,
                                        background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                        fontWeight: 600, outline: 'none', fontFamily: CAIRO,
                                        appearance: 'none', cursor: 'pointer'
                                    }}>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m} style={{ background: C.card }}>
                                            {isRtl 
                                                ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][m - 1]
                                                : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]
                                            }
                                        </option>
                                    ))}
                                </select>
                                <Calendar size={14} style={{ position: 'absolute', insetInlineStart: '12px', color: '#256af4', pointerEvents: 'none' }} />
                            </div>

                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                                    style={{
                                        ...IS, height: '42px', padding: isRtl ? '0 34px 0 20px' : '0 20px 0 34px',
                                        borderRadius: '12px', border: `1px solid ${C.border}`,
                                        background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                        fontWeight: 600, outline: 'none', fontFamily: OUTFIT,
                                        appearance: 'none', cursor: 'pointer'
                                    }}>
                                    {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                                        <option key={y} value={y} style={{ background: C.card }}>{y}</option>
                                    ))}
                                </select>
                                <Calendar size={14} style={{ position: 'absolute', insetInlineStart: '12px', color: '#256af4', pointerEvents: 'none' }} />
                            </div>
                        </div>
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
                            emptyIcon={ShieldAlert}
                            emptyMessage={t('لا توجد سجلات غياب لهذا الشهر')}
                        />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
