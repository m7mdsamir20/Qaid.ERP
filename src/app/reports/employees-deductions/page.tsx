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
import { AlertTriangle, Search, Trash2, Activity, Loader2, ArrowDownRight, Users, Calendar } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';



interface DeductionRecord {
    id: string;
    employeeName: string;
    type: 'late' | 'penalty' | 'absence' | 'other';
    amount: number;
    reason: string;
    date: string;
}

interface ReportData {
    records: DeductionRecord[];
    totalAmount: number;
    totalCount: number;
}

const fmt = (n: number) => formatNumber(n);

const typeColors: Record<string, string> = {
    late: '#fb923c',
    penalty: '#ef4444',
    absence: '#f43f5e',
    other: '#64748b'
};

import CustomSelect from '@/components/CustomSelect';

export default function EmployeesDeductionsPage() {
    const { lang, t } = useTranslation();

    const typeLabels: Record<string, string> = {
        late: t('تأخير'),
        penalty: t('جزاء إداري'),
        absence: t('غياب'),
        other: t('أخرى')
    };

    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
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
            let url = '/api/reports/hr?type=deductions';
            if (currentBranchId && currentBranchId !== 'all') {
                url += `&branchId=${currentBranchId}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const results = await res.json();
                setData(results);
            }
        } catch (error) {
            console.error('Failed to fetch deductions report:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(branchId); }, [branchId]);

    const filtered = data ? data.records.filter(r => r.employeeName.toLowerCase().includes(q.toLowerCase()) || r.reason.toLowerCase().includes(q.toLowerCase())) : [];

    const columns: TableColumn[] = [
        {
            header: t('الموظف'),
            cell: (row: DeductionRecord) => row.employeeName,
            style: { fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, fontSize: '13px' }
        },
        {
            header: t('التاريخ'),
            cell: (row: DeductionRecord) => new Date(row.date).toLocaleDateString('en-ZA'),
            style: { fontSize: '13px', color: C.textSecondary, fontFamily: OUTFIT, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('نوع الخصم'),
            cell: (row: DeductionRecord) => (
                <span style={{ fontSize: '10px', fontWeight: 600, color: typeColors[row.type], fontFamily: CAIRO }}>{typeLabels[row.type]}</span>
            )
        },
        {
            header: t('السبب'),
            cell: (row: DeductionRecord) => row.reason,
            style: { fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }
        },
        {
            header: t('القيمة'),
            type: 'number' as const,
            cell: (row: DeductionRecord) => <><span style={{ color: '#ef4444' }}>-</span>{formatNumber(row.amount)} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{sym}</span></>,
            style: { fontWeight: 600, color: '#ef4444', fontFamily: OUTFIT, fontSize: '13px', textAlign: 'center' } as React.CSSProperties
        }
    ];

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("سجل الخصومات والجزاءات الفترية")}
                    subtitle={t("تحليل مالي وإداري لجميع الخصومات المطبقة على الموظفين (تأخيرات، غياب، وجزاءات).")}
                    backTab="hr"
                    branchName={selectedBranchName}
                    printTitle={t("سجل الخصومات والجزاءات الفترية")}
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
                </div>

                <div data-print-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: t('إجمالي مبلغ الخصومات'), value: fmt(data?.totalAmount || 0), color: '#ef4444', icon: <ArrowDownRight size={18} /> },
                        { label: t('عدد الجزاءات المسجلة'), value: String(data?.totalCount || 0), color: '#fb923c', icon: <AlertTriangle size={18} /> },
                        { label: t('متوسط قيمة الخصم'), value: fmt((data?.totalAmount || 0) / (data?.totalCount || 1)), color: '#256af4', icon: <Activity size={18} /> },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: `${s.color}08`, border: `1px solid ${s.color}22`, borderRadius: '12px',
                            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div>
                                <p style={{ fontSize: '11px', fontWeight: 600, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value} <small style={{ fontSize: '10px', color: C.textSecondary }}>{i !== 1 ? getCurrencySymbol(currency, lang) : t('جزاء')}</small></span>
                            </div>
                            <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                        </div>
                    ))}
                </div>

                <div className="no-print" style={{ position: 'relative', marginBottom: '20px' }}>
                    <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                    <input placeholder={t("ابحث باسم الموظف أو سبب الخصم...")} value={q} onChange={e => setQ(e.target.value)} style={{ ...IS, paddingInlineStart: '45px', height: '42px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }} />
                </div>

                {loading ? ( <TableSkeleton /> ) : (
                    <div className="print-table-container">
                        <DataTable
                            columns={columns}
                            data={filtered}
                            emptyIcon={AlertTriangle}
                            emptyMessage={t('لا توجد سجلات خصومات حالياً')}
                        />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
