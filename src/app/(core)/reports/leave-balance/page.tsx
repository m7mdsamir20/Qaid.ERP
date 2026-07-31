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
import { Search, CalendarDays, UserCheck, Calendar } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

interface LeaveBalanceRow {
    id: string;
    employeeName: string;
    department: string;
    position: string;
    type: string;
    entitled: number;
    used: number;
    remaining: number;
}

interface ReportData {
    records: LeaveBalanceRow[];
}

export default function LeaveBalancePage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [year, setYear] = useState(String(new Date().getFullYear()));
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
            let url = `/api/reports/hr?type=leave-balance&year=${year}`;
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
            console.error('Failed to fetch leave balance report:', error);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(branchId); }, [year, branchId]);

    const filtered = data ? data.records.filter(r => r.employeeName.toLowerCase().includes(q.toLowerCase())) : [];

    const columns: TableColumn[] = [
        {
            header: t('الموظف'),
            cell: (row: LeaveBalanceRow) => (
                <div>
                    <div style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, fontSize: '13px' }}>{row.employeeName}</div>
                    <div style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO, marginTop: '2px' }}>{row.position}</div>
                </div>
            )
        },
        {
            header: t('القسم'),
            cell: (row: LeaveBalanceRow) => row.department,
            style: { fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }
        },
        {
            header: t('نوع الإجازة'),
            cell: (row: LeaveBalanceRow) => {
                const types: Record<string, string> = {
                    annual: t('سنوية'),
                    sick: t('مرضية'),
                    unpaid: t('بدون راتب'),
                    maternity: t('وضع'),
                };
                return types[row.type] || row.type;
            },
            style: { fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }
        },
        {
            header: t('الرصيد المستحق'),
            cell: (row: LeaveBalanceRow) => (
                <span style={{ fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{row.entitled} {t('أيام')}</span>
            ),
            style: { textAlign: 'center', fontSize: '13px' } as React.CSSProperties
        },
        {
            header: t('الرصيد المستهلك'),
            cell: (row: LeaveBalanceRow) => (
                <span style={{ fontWeight: 600, color: '#fb923c', fontFamily: OUTFIT }}>{row.used} {t('أيام')}</span>
            ),
            style: { textAlign: 'center', fontSize: '13px' } as React.CSSProperties
        },
        {
            header: t('الرصيد المتبقي'),
            cell: (row: LeaveBalanceRow) => (
                <span style={{ fontWeight: 600, color: '#10b981', fontFamily: OUTFIT }}>{row.remaining} {t('أيام')}</span>
            ),
            style: { textAlign: 'center', fontSize: '13px' } as React.CSSProperties
        }
    ];

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير رصيد الإجازات")}
                    subtitle={t("تقرير يوضح الرصيد المستحق، المستهلك، والمتبقي من الإجازات السنوية والمرضية لكل موظف.")}
                    backTab="hr"
                    branchName={selectedBranchName}
                    printTitle={t("تقرير رصيد الإجازات")}
                    printDate={year}
                    printLabel={t('السنة المالية:')}
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
                        <span style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('السنة المالية:')}</span>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <select value={year} onChange={e => setYear(e.target.value)}
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
                                    <option key={y} value={String(y)} style={{ background: C.card }}>{y}</option>
                                ))}
                            </select>
                            <Calendar size={14} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px', color: '#256af4', pointerEvents: 'none' }} />
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
                            emptyIcon={CalendarDays}
                            emptyMessage={t('لا توجد أرصدة إجازات مسجلة لهذه السنة')}
                        />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
