'use client';
import TableSkeleton from '@/components/TableSkeleton';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { useEffect, useState } from 'react';
import { BarChart3, Search, Calendar, Wallet, CheckCircle2, ArrowDownRight, Target } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, IS, PAGE_BASE, TABLE_STYLE, SC, STitle } from '@/constants/theme';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import StatCard, { StatCardGrid } from '@/components/StatCard';

interface PerformanceItem {
    id: string;
    name: string;
    code: string | null;
    targetAmount: number;
    totalSales: number;
    totalCollected: number;
    totalRemaining: number;
    achievementPercent: number;
}

export default function SalesRepsPerformanceReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { symbol: sym } = useCurrency();
    const fmt = (n: number) => formatNumber(n);

    const [reps, setReps] = useState<any[]>([]);
    const [selectedRepId, setSelectedRepId] = useState('all');
    const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
    
    const [reportData, setReportData] = useState<PerformanceItem[]>([]);
    const [totals, setTotals] = useState({ sales: 0, collected: 0, remaining: 0, target: 0 });
    const [loading, setLoading] = useState(false);

    // Fetch representatives list for dropdown filter
    useEffect(() => {
        fetch('/api/sales-reps')
            .then(r => r.json())
            .then(d => {
                if (Array.isArray(d)) setReps(d);
            })
            .catch(() => {});
    }, []);

    const fetchReport = async () => {
        if (!from || !to) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('from', from);
            params.set('to', to);
            if (selectedRepId && selectedRepId !== 'all') params.set('salesRepId', selectedRepId);
            
            const res = await fetch(`/api/reports/sales-reps/performance?${params}`);
            if (res.ok) {
                const data = await res.json();
                setReportData(data.reportData || []);
                setTotals(data.totals || { sales: 0, collected: 0, remaining: 0, target: 0 });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch on filter changes
    useEffect(() => {
        fetchReport();
    }, [from, to, selectedRepId]);

    const columns: TableColumn[] = [
        {
            header: t('المندوب'),
            cell: (row: PerformanceItem) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: `${C.primary}20`,
                        border: `1px solid ${C.primary}30`, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: C.primary,
                        fontSize: '12px', fontWeight: 700, fontFamily: OUTFIT
                    }}>
                        {row.name.charAt(0)}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{row.name}</div>
                        {row.code && <div style={{ fontSize: '10px', color: C.textSecondary, fontFamily: OUTFIT }}>{row.code}</div>}
                    </div>
                </div>
            )
        },
        {
            header: t('المستهدف'),
            type: 'number',
            cell: (row: PerformanceItem) => (
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: OUTFIT }}>
                    {row.targetAmount > 0 ? <Currency amount={row.targetAmount} /> : <span style={{ color: C.textMuted }}>—</span>}
                </span>
            )
        },
        {
            header: t('المبيعات'),
            type: 'number',
            cell: (row: PerformanceItem) => (
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>
                    <Currency amount={row.totalSales} />
                </span>
            )
        },
        {
            header: t('نسبة التحقيق'),
            cell: (row: PerformanceItem) => {
                if (row.targetAmount <= 0) return <span style={{ fontSize: '12px', color: C.textMuted }}>—</span>;
                const percent = Math.min(row.achievementPercent, 100);
                const barColor = row.achievementPercent >= 100 ? '#10b981' : row.achievementPercent >= 50 ? '#f59e0b' : '#ef4444';
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '120px' }}>
                        <span style={{ fontSize: '11px', color: barColor, fontWeight: 700, fontFamily: OUTFIT }}>
                            {row.achievementPercent.toFixed(1)}%
                        </span>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: barColor, borderRadius: '10px' }} />
                        </div>
                    </div>
                );
            }
        },
        {
            header: t('المحصل'),
            type: 'number',
            cell: (row: PerformanceItem) => (
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', fontFamily: OUTFIT }}>
                    <Currency amount={row.totalCollected} />
                </span>
            )
        },
        {
            header: t('المتبقي'),
            type: 'number',
            cell: (row: PerformanceItem) => (
                <span style={{ fontSize: '13px', fontWeight: 600, color: row.totalRemaining > 0 ? '#ef4444' : C.textPrimary, fontFamily: OUTFIT }}>
                    <Currency amount={row.totalRemaining} />
                </span>
            )
        }
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("أداء المناديب")}
                    subtitle={t("مقارنة مبيعات وتحصيلات كل مندوب مقابل هدفه خلال فترة زمنية محددة.")}
                    backTab="sales_reps"
                    printTitle={t("تقرير أداء مناديب المبيعات")}
                    printDate={(from || to) ? `${from ? t('من: ') + from : ''} ${to ? t(' إلى: ') + to : ''}` : undefined}
                />

                {/* Filters Row */}
                <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="date-filter-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('من:')}</span>
                        <div className="date-input-wrapper" style={{ width: '160px' }}>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 12px',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('إلى:')}</span>
                        <div className="date-input-wrapper" style={{ width: '160px' }}>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 12px',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                    </div>

                    {reps.length > 0 && (
                        <div style={{ minWidth: '180px' }}>
                            <CustomSelect
                                value={selectedRepId}
                                onChange={(v: string) => setSelectedRepId(v)}
                                placeholder={t("كل المناديب")}
                                hideSearch
                                style={{ background: C.card, border: `1px solid ${C.border}` }}
                                options={[
                                    { value: 'all', label: t('كل المناديب') },
                                    ...reps.map(r => ({ value: r.id, label: r.name }))
                                ]}
                            />
                        </div>
                    )}
                </div>

                {loading ? (
                    <TableSkeleton />
                ) : reportData.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px 20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <BarChart3 size={64} style={{ opacity: 0.1, color: C.primary, marginBottom: '16px' }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t("لا توجد مبيعات للمناديب مسجلة")}</h3>
                        <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: C.textSecondary, maxWidth: '400px', lineHeight: 1.6, fontFamily: CAIRO }}>{t("لم يتم تسجيل فواتير معتمدة مرتبطة بمناديب مبيعات في هذه الفترة.")}</p>
                    </div>
                ) : (
                    <>
                        {/* KPI Cards Row — يستخدم StatCard الموحّد */}
                        <StatCardGrid cols={4} style={{ marginBottom: '24px' }}>
                            <StatCard
                                label={t('إجمالي المبيعات')}
                                value={fmt(totals.sales)}
                                suffix={sym}
                                icon={<BarChart3 size={18} />}
                                color="#256af4"
                            />
                            <StatCard
                                label={t('إجمالي المحصل')}
                                value={fmt(totals.collected)}
                                suffix={sym}
                                icon={<CheckCircle2 size={18} />}
                                color="#10b981"
                            />
                            <StatCard
                                label={t('المتبقي (آجل)')}
                                value={fmt(totals.remaining)}
                                suffix={sym}
                                icon={<ArrowDownRight size={18} />}
                                color="#ef4444"
                            />
                            <StatCard
                                label={t('المبيعات المستهدفة')}
                                value={fmt(totals.target)}
                                suffix={sym}
                                icon={<Target size={18} />}
                                color="#f59e0b"
                            />
                        </StatCardGrid>

                        {/* Performance Table */}
                        <div style={{ marginBottom: '30px' }}>
                            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.01)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', border: `1px solid ${C.border}` }}>
                                <div style={STitle}><BarChart3 size={14} /> {t('مقارنة أداء المبيعات والتحصيل والهدف لكل مندوب')}</div>
                            </div>
                            <DataTable
                                columns={columns}
                                data={reportData}
                                emptyIcon={BarChart3}
                                emptyMessage={t('لا توجد بيانات أداء')}
                            />
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
