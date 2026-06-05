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
import { Wallet, Search, Users, Activity, Loader2, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';



interface AdvanceRecord {
    id: string;
    employeeName: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    status: 'paid' | 'active' | 'partial';
    lastPaymentDate: string | null;
}

interface ReportData {
    records: AdvanceRecord[];
    totalAdvances: number;
    totalRecovered: number;
    totalOutstanding: number;
}

const fmt = (n: number) => formatNumber(n);

export default function EmployeesAdvancesPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');

    const sym = getCurrencySymbol(currency, lang);
    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reports/hr?type=advances');
            if (res.ok) {
                const results = await res.json();
                setData(results);
            }
        } catch (error) {
            console.error('Failed to fetch advances report:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(); }, []);

    const filtered = data ? data.records.filter(r => r.employeeName.toLowerCase().includes(q.toLowerCase())) : [];

    const columns: TableColumn[] = [
        {
            header: t('الموظف'),
            cell: (row: AdvanceRecord) => row.employeeName,
            style: { fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, fontSize: '13px' }
        },
        {
            header: t('مبلغ السلفة'),
            type: 'number' as const,
            cell: (row: AdvanceRecord) => <Currency amount={row.totalAmount} />,
            style: { fontWeight: 600, fontFamily: OUTFIT, fontSize: '13px', textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('المسدد'),
            type: 'number' as const,
            cell: (row: AdvanceRecord) => <Currency amount={row.paidAmount} />,
            style: { fontWeight: 600, color: '#10b981', fontFamily: OUTFIT, fontSize: '13px', textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('المتبقي'),
            type: 'number' as const,
            cell: (row: AdvanceRecord) => <Currency amount={row.remainingAmount} />,
            style: { fontWeight: 600, color: '#ef4444', fontFamily: OUTFIT, fontSize: '13px', textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('نسبة السداد'),
            cell: (row: AdvanceRecord) => {
                const pct = row.totalAmount > 0 ? (row.paidAmount / row.totalAmount) * 100 : 0;
                return (
                    <>
                        <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', margin: '0 auto' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10b981' : C.primary }} />
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '4px', fontWeight: 700, color: C.textSecondary }}>{Math.round(pct)}%</div>
                    </>
                );
            },
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الحالة'),
            cell: (row: AdvanceRecord) => {
                const label = row.status === 'paid' ? t('تم السداد') : row.status === 'partial' ? t('سداد جزئي') : t('نشطة');
                const color = row.status === 'paid' ? '#10b981' : row.status === 'partial' ? '#f59e0b' : '#256af4';
                const background = row.status === 'paid' ? 'rgba(16,185,129,0.1)' : row.status === 'partial' ? 'rgba(245,158,11,0.1)' : 'rgba(37, 106, 244,0.1)';
                return (
                    <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', border: '1px solid currentColor',
                        color, background
                    }}>
                        {label}
                    </span>
                );
            },
            style: { textAlign: 'center' } as React.CSSProperties
        }
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير سلف ومديونيات الموظفين")}
                    subtitle={t("متابعة دقيقة لجميع السلف الممنوحة للموظفين، المبالغ المسددة، والأرصدة القائمة.")}
                    backTab="hr"
                    printTitle={t("تقرير سلف ومديونيات الموظفين")}
                />

                <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: t('إجمالي السلف الممنوحة'), value: fmt(data?.totalAdvances || 0), color: C.primary, icon: <Wallet size={18} /> },
                        { label: t('إجمالي المبالغ المستردة'), value: fmt(data?.totalRecovered || 0), color: '#10b981', icon: <ArrowUpRight size={18} /> },
                        { label: t('إجمالي الأرصدة القائمة'), value: fmt(data?.totalOutstanding || 0), color: '#ef4444', icon: <Activity size={18} /> },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: `${s.color}08`, border: `1px solid ${s.color}22`, borderRadius: '12px',
                            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div>
                                <p style={{ fontSize: '11px', fontWeight: 600, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value} <small style={{ fontSize: '10px', color: C.textSecondary }}>{getCurrencySymbol(currency, lang)}</small></span>
                            </div>
                            <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                        </div>
                    ))}
                </div>

                <div className="no-print" style={{ position: 'relative', marginBottom: '20px' }}>
                    <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                    <input placeholder={t("ابحث باسم الموظف...")} value={q} onChange={e => setQ(e.target.value)} style={{ ...IS, paddingInlineStart: '45px', height: '42px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }} />
                </div>

                {loading ? ( <TableSkeleton /> ) : (
                    <DataTable
                        columns={columns}
                        data={filtered}
                        emptyIcon={Wallet}
                        emptyMessage={t('لا توجد سجلات سلف حالياً')}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
