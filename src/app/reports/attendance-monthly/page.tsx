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
import { Search, Calendar, Users, CheckCircle, Loader2 } from 'lucide-react';
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

const STATUS_COLORS: Record<string, string> = {
    present: '#10b981',
    late: '#f59e0b',
    absent: '#ef4444',
    on_leave: '#6366f1',
    holiday: '#64748b',
};

const STATUS_LABELS: Record<string, string> = {
    present: 'حاضر',
    late: 'متأخر',
    absent: 'غائب',
    on_leave: 'إجازة',
    holiday: 'عطلة',
};

export default function AttendanceMonthlyPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    const [activeTab, setActiveTab] = useState<'summary' | 'detailed'>('summary');
    const [detailedData, setDetailedData] = useState<any | null>(null);
    const [detailedLoading, setDetailedLoading] = useState(false);

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

    const fetchDetailedReport = async (currentBranchId = branchId) => {
        setDetailedLoading(true);
        try {
            const [yearStr, monthStr] = month.split('-');
            let url = `/api/attendance/monthly?month=${monthStr}&year=${yearStr}`;
            if (currentBranchId && currentBranchId !== 'all') {
                url += `&branchId=${currentBranchId}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                setDetailedData(await res.json());
            } else {
                setDetailedData(null);
            }
        } catch (error) {
            console.error('Failed to fetch detailed report:', error);
            setDetailedData(null);
        } finally {
            setDetailedLoading(false);
        }
    };

    useEffect(() => {
        fetchReport(branchId);
        fetchDetailedReport(branchId);
    }, [month, branchId]);

    const filtered = data ? data.records.filter(r => r.employeeName.toLowerCase().includes(q.toLowerCase())) : [];

    const filteredDetailedEmployees = detailedData
        ? detailedData.employees.filter((emp: any) => emp.name.toLowerCase().includes(q.toLowerCase()))
        : [];

    const totalsByDay = detailedData?.days.map((dateStr: string) => {
        const counts: Record<string, number> = {};
        filteredDetailedEmployees.forEach((emp: any) => {
            const rec = emp.records.find((r: any) => r.date === dateStr);
            const s = rec?.status || 'null';
            counts[s] = (counts[s] || 0) + 1;
        });
        return counts;
    }) || [];

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
                    title={activeTab === 'summary' ? t("كشف الحضور الشهري") : t("تقرير الحضور الشهري التفصيلي")}
                    subtitle={activeTab === 'summary' 
                        ? t("تقرير إجمالي يوضح عدد أيام الحضور، الغياب، التأخير، والإجازات لكل موظف خلال الشهر.")
                        : t("تقرير تفصيلي يوضح حالة الحضور والغياب اليومية لكل موظف كجدول متكامل خلال الشهر.")
                    }
                    backTab="hr"
                    branchName={selectedBranchName}
                    printTitle={activeTab === 'summary' ? t("كشف الحضور الشهري") : t("تقرير الحضور الشهري التفصيلي")}
                    printDate={new Date(month + '-01').toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long' })}
                />

                {/* Tabs Switcher */}
                <div className="no-print" style={{ display: 'flex', gap: '8px', borderBottom: `1px solid ${C.border}`, marginBottom: '24px', paddingBottom: '2px' }}>
                    {[
                        { id: 'summary', name: t('ملخص الحضور الشهري') },
                        { id: 'detailed', name: t('تقرير الحضور الشهري التفصيلي') }
                    ].map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                style={{
                                    padding: '10px 20px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: active ? C.primary : C.textSecondary,
                                    fontWeight: active ? 700 : 500,
                                    fontSize: '14px',
                                    fontFamily: CAIRO,
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: 'color 0.2s'
                                }}
                            >
                                {tab.name}
                                {active && (
                                    <div style={{ position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '3px', background: C.primary, borderRadius: '3px' }} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Filters */}
                <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                        <div style={{ minWidth: '180px' }}>
                            <CustomSelect
                                value={branchId}
                                onChange={v => { setBranchId(v); }}
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
                                        ...IS, height: '42px',
                                        paddingRight: isRtl ? '34px' : '20px',
                                        paddingLeft: isRtl ? '20px' : '34px',
                                        minWidth: '130px',
                                        textIndent: isRtl ? '24px' : '0px',
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
                                <Calendar size={14} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px', color: '#256af4', pointerEvents: 'none' }} />
                            </div>

                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                                    style={{
                                        ...IS, height: '42px',
                                        paddingRight: isRtl ? '34px' : '20px',
                                        paddingLeft: isRtl ? '20px' : '34px',
                                        minWidth: '110px',
                                        textIndent: isRtl ? '20px' : '0px',
                                        borderRadius: '12px', border: `1px solid ${C.border}`,
                                        background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                        fontWeight: 600, outline: 'none', fontFamily: OUTFIT,
                                        appearance: 'none', cursor: 'pointer'
                                    }}>
                                    {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                                        <option key={y} value={y} style={{ background: C.card }}>{y}</option>
                                    ))}
                                </select>
                                <Calendar size={14} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px', color: '#256af4', pointerEvents: 'none' }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="no-print" style={{ position: 'relative', marginBottom: '24px' }}>
                    <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                    <input placeholder={t("ابحث باسم الموظف...")} value={q} onChange={e => setQ(e.target.value)} style={{ ...IS, paddingInlineStart: '45px', height: '42px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }} />
                </div>

                {activeTab === 'summary' ? (
                    loading ? ( <TableSkeleton /> ) : (
                        <div className="print-table-container">
                            <DataTable
                                columns={columns}
                                data={filtered}
                                emptyIcon={CheckCircle}
                                emptyMessage={t('لا توجد سجلات حضور لهذا الشهر')}
                            />
                        </div>
                    )
                ) : (
                    detailedLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', color: C.textSecondary, fontFamily: CAIRO }}>
                            <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', marginLeft: '12px' }} />
                            {t('جاري التحميل...')}
                        </div>
                    ) : detailedData ? (
                        <div className="print-table-container">
                            {/* Legend */}
                            <div className="no-print" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', fontFamily: CAIRO }}>
                                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.textSecondary }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: STATUS_COLORS[key] }} />
                                        {label}
                                    </div>
                                ))}
                            </div>

                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${200 + detailedData.days.length * 38}px`, fontFamily: CAIRO }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'start', fontSize: '12px', fontWeight: 700, color: C.textSecondary, minWidth: '180px', position: 'sticky', [isRtl ? 'right' : 'left']: 0, background: C.card, zIndex: 10, borderInlineEnd: `1px solid ${C.border}` }}>
                                                {t('الموظف')}
                                            </th>
                                            {detailedData.days.map((d: string) => {
                                                const parsedDate = new Date(d);
                                                const dayNum = parsedDate.getUTCDate();
                                                const monthNum = parsedDate.getUTCMonth() + 1;
                                                const dayName = parsedDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
                                                const isWeekend = !(detailedData.workDays || ["Sun", "Mon", "Tue", "Wed", "Thu", "Sat"]).includes(dayName);
                                                const WEEKDAY_ARABIC: Record<string, string> = {
                                                    Sun: 'الأحد',
                                                    Mon: 'الإثنين',
                                                    Tue: 'الثلاثاء',
                                                    Wed: 'الأربعاء',
                                                    Thu: 'الخميس',
                                                    Fri: 'الجمعة',
                                                    Sat: 'السبت'
                                                };
                                                const dayNameAr = WEEKDAY_ARABIC[dayName] || dayName;
                                                return (
                                                    <th key={d} style={{ padding: '6px 2px', textAlign: 'center', minWidth: '46px' }}>
                                                        <div style={{ fontSize: '10px', fontWeight: 700, color: isWeekend ? '#f59e0b' : C.textPrimary }}>{dayNameAr}</div>
                                                        <div style={{ fontSize: '9px', marginTop: '2px', color: isWeekend ? '#f59e0b' : C.textSecondary, fontFamily: OUTFIT }}>{`${dayNum}/${monthNum}`}</div>
                                                    </th>
                                                );
                                            })}
                                            <th style={{ padding: '12px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#818cf8', minWidth: '180px', borderInlineStart: `2px solid #6366f1`, background: C.card, position: 'sticky', [isRtl ? 'left' : 'right']: 0, zIndex: 10, letterSpacing: '0.5px' }}>
                                                {t('الملخص')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredDetailedEmployees.map((emp: any, ei: number) => (
                                            <tr key={emp.id} style={{ borderBottom: ei === filteredDetailedEmployees.length - 1 ? 'none' : `1px solid ${C.border}` }}>
                                                {/* Employee name - sticky */}
                                                <td style={{ padding: '10px 16px', position: 'sticky', [isRtl ? 'right' : 'left']: 0, background: C.card, zIndex: 5, borderInlineEnd: `1px solid ${C.border}` }}>
                                                    <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px' }}>{emp.name}</div>
                                                    <div style={{ fontSize: '11px', color: C.textSecondary }}>{emp.department || '—'}</div>
                                                </td>
                                                {/* Day cells */}
                                                {emp.records.map((rec: any) => (
                                                    <td
                                                        key={rec.date}
                                                        title={rec.status ? STATUS_LABELS[rec.status] || rec.status : ''}
                                                        style={{ padding: '4px', textAlign: 'center' }}
                                                    >
                                                        <div style={{
                                                            width: '32px', height: '32px', borderRadius: '6px', margin: '0 auto',
                                                            background: rec.status ? `${STATUS_COLORS[rec.status]}20` : 'rgba(255,255,255,0.03)',
                                                            border: `1px solid ${rec.status ? `${STATUS_COLORS[rec.status]}40` : C.border}`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '10px', fontWeight: 700,
                                                            color: rec.status ? STATUS_COLORS[rec.status] : C.textMuted,
                                                            transition: 'all 0.15s'
                                                        }}>
                                                            {rec.status ? (rec.status === 'present' ? 'ح' : rec.status === 'late' ? 'ت' : rec.status === 'absent' ? 'غ' : rec.status === 'on_leave' ? 'إ' : 'ع') : '—'}
                                                        </div>
                                                    </td>
                                                ))}
                                                {/* Summary */}
                                                <td style={{ padding: '10px', borderInlineStart: `2px solid #6366f1`, background: C.card, position: 'sticky', [isRtl ? 'left' : 'right']: 0, zIndex: 5 }}>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                                        {[
                                                            { key: 'present', val: emp.summary.present, color: '#10b981', label: 'ح' },
                                                            { key: 'absent', val: emp.summary.absent, color: '#ef4444', label: 'غ' },
                                                            { key: 'late', val: emp.summary.late, color: '#f59e0b', label: 'ت' },
                                                            { key: 'leaves', val: emp.summary.leaves, color: '#6366f1', label: 'إ' },
                                                        ].map(s => (
                                                            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: s.color, fontWeight: 700 }}>
                                                                <span>{s.label}:</span>
                                                                <span style={{ fontFamily: OUTFIT }}>{s.val}</span>
                                                            </div>
                                                        ))}
                                                        {emp.summary.overtime > 0 && (
                                                            <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 700, display: 'flex', gap: '3px' }}>
                                                                <span>إ.إض:</span>
                                                                <span style={{ fontFamily: OUTFIT }}>{emp.summary.overtime.toFixed(1)}س</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Totals row */}
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
                                            <td style={{ padding: '10px 16px', fontWeight: 700, color: C.textPrimary, fontSize: '12px', position: 'sticky', [isRtl ? 'right' : 'left']: 0, background: 'rgba(14,23,42,0.9)', borderInlineEnd: `1px solid ${C.border}` }}>
                                                {t('الإجماليات')}
                                            </td>
                                            {totalsByDay.map((counts: any, i: number) => (
                                                <td key={i} style={{ padding: '4px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '10px', fontFamily: OUTFIT }}>
                                                        {counts['present'] ? <div style={{ color: '#10b981', fontWeight: 700 }}>{counts['present']}</div> : null}
                                                        {counts['absent'] ? <div style={{ color: '#ef4444', fontWeight: 700 }}>{counts['absent']}</div> : null}
                                                    </div>
                                                </td>
                                            ))}
                                            <td style={{ borderInlineStart: `2px solid #6366f1`, background: 'rgba(14,23,42,0.9)', position: 'sticky', [isRtl ? 'left' : 'right']: 0 }} />
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px', color: C.textSecondary, fontFamily: CAIRO }}>
                            <Users size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                            <p>{t('اختر الشهر والسنة لعرض البيانات')}</p>
                        </div>
                    )
                )}
            </div>
        </DashboardLayout>
    );
}
