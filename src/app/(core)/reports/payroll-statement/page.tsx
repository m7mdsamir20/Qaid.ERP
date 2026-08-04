'use client';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import TableSkeleton from '@/components/TableSkeleton';
import { formatNumber, getCurrencySymbol } from '@/lib/currency';
import { Currency } from '@/components/Currency';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, OUTFIT, IS } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { DollarSign, Search, Calendar, Wallet, ArrowUpRight, TrendingDown, Loader2, Users } from 'lucide-react';



import CustomSelect from '@/components/CustomSelect';

interface PayrollRecord {
    id: string;
    employeeName: string;
    basicSalary: number;
    allowances: number;
    deductions: number;
    netSalary: number;
}

interface ReportData {
    records: PayrollRecord[];
    summary: {
        totalSalaries: number;
        totalAllowances: number;
        totalDiscounts: number;
        netTotal: number;
    };
}

const fmt = (n: number) => formatNumber(n);

export default function PayrollStatementPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';
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

    const sym = getCurrencySymbol(currency, lang);
    const fetchReport = async (currentBranchId = branchId) => {
        setLoading(true);
        try {
            const [yearStr, monthStr] = month.split('-');
            let url = `/api/reports/hr?type=payroll-statement&month=${monthStr}&year=${yearStr}`;
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
            console.error('Failed to fetch payroll report:', error);
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
            cell: (row: PayrollRecord) => row.employeeName,
            style: { fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, fontSize: '13px' }
        },
        {
            header: t('الراتب الأساسي'),
            type: 'number' as const,
            cell: (row: PayrollRecord) => <>{formatNumber(row.basicSalary)} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{sym}</span></>,
            style: { fontWeight: 600, fontFamily: OUTFIT, fontSize: '13px', textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('البدلات'),
            type: 'number' as const,
            cell: (row: PayrollRecord) => <><span style={{ color: '#10b981' }}>+</span>{formatNumber(row.allowances)} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{sym}</span></>,
            style: { fontWeight: 600, color: '#10b981', fontFamily: OUTFIT, fontSize: '13px', textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الاستقطاعات'),
            type: 'number' as const,
            cell: (row: PayrollRecord) => <><span style={{ color: '#ef4444' }}>-</span>{formatNumber(row.deductions)} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{sym}</span></>,
            style: { fontWeight: 600, color: '#ef4444', fontFamily: OUTFIT, fontSize: '13px', textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الصافي'),
            type: 'number' as const,
            cell: (row: PayrollRecord) => <>{formatNumber(row.netSalary)} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{sym}</span></>,
            style: { fontWeight: 600, color: C.primary, fontFamily: OUTFIT, fontSize: '13px', textAlign: 'center' } as React.CSSProperties
        }
    ];

    const footerElement = data && (
        <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
            <td style={{ padding: '16px 20px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('الإجمالي')}</td>
            <td style={{ padding: '16px 20px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT, textAlign: 'center' }}>{formatNumber(data.summary.totalSalaries)} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{sym}</span></td>
            <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#10b981', fontFamily: OUTFIT }}>+{formatNumber(data.summary.totalAllowances)} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{sym}</span></td>
            <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: '#ef4444', fontFamily: OUTFIT }}>-{formatNumber(data.summary.totalDiscounts)} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{sym}</span></td>
            <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 600, color: C.primary, fontFamily: OUTFIT }}>{formatNumber(data.summary.netTotal)} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{sym}</span></td>
        </tr>
    );

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("كشف رواتب الموظفين التفصيلي")}
                    subtitle={t("مراجعة شاملة لمسيرات الرواتب، الحوافز، الاستقطاعات، وصافي المستحقات لفترة محددة.")}
                    backTab="hr"
                    branchName={selectedBranchName}
                    printTitle={data && data.records.length > 0 ? t("مسير رواتب الموظفين") : undefined}
                    printDate={new Date(month + '-01').toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' })}
                    printLabel={t('الشهر:')}
                />

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
                        <span style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO, whiteSpace: 'nowrap' }}>{t('اختر الشهر:')}</span>
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

                {loading ? ( <TableSkeleton /> ) : !data || data.records.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <DollarSign size={60} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد مسيرات رواتب لهذا الشهر')}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{t('تأكد من اختيار الشهر الصحيح أو ترحيل الرواتب أولاً.')}</p>
                    </div>
                ) : (
                    <>
                        <div data-print-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: t('إجمالي الأجور الأساسية'), value: fmt(data.summary.totalSalaries), color: '#256af4', icon: <Users size={18} /> },
                                { label: t('إجمالي البدلات'), value: fmt(data.summary.totalAllowances), color: '#10b981', icon: <ArrowUpRight size={18} /> },
                                { label: t('إجمالي الاستقطاعات'), value: fmt(data.summary.totalDiscounts), color: '#f59e0b', icon: <TrendingDown size={18} /> },
                                { label: t('صافي المنصرف'), value: fmt(data.summary.netTotal), color: C.primary, icon: <Wallet size={18} /> },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}22`, borderRadius: '12px',
                                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}>
                                    <div>
                                        <p style={{ fontSize: '11px', fontWeight: 600, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                            <span style={{ fontSize: '10px', color: C.textSecondary }}>{getCurrencySymbol(currency, lang)}</span>
                                        </div>
                                    </div>
                                    <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                                </div>
                            ))}
                        </div>

                        <div className="no-print" style={{ position: 'relative', width: '100%', marginBottom: '20px' }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                            <input placeholder={t("ابحث باسم الموظف...")} value={q} onChange={e => setQ(e.target.value)} style={{ ...IS, paddingInlineStart: '45px', height: '42px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }} />
                        </div>

                        <div className="print-table-container">
                            <DataTable
                                columns={columns}
                                data={filtered}
                                emptyIcon={DollarSign}
                                emptyMessage={t('لا توجد سجلات رواتب حالياً')}
                                footer={footerElement}
                            />
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
