'use client';
import TableSkeleton from '@/components/TableSkeleton';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { useEffect, useState } from 'react';
import { BarChart3, Search, Calendar, Target, Award, ArrowUpRight, CheckCircle2, User } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, IS, PAGE_BASE, TABLE_STYLE, SC, STitle } from '@/constants/theme';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import StatCard, { StatCardGrid } from '@/components/StatCard';

interface TargetItem {
    id: string;
    name: string;
    code: string | null;
    targetAmount: number;
    actualSales: number;
    salesCount: number;
    achievementPercent: number;
}

export default function SalesRepsTargetsReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { symbol: sym } = useCurrency();
    const fmt = (n: number) => formatNumber(n);

    const [reps, setReps] = useState<any[]>([]);
    const [selectedRepId, setSelectedRepId] = useState('all');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
    
    const [reportData, setReportData] = useState<TargetItem[]>([]);
    const [summary, setSummary] = useState({ totalTarget: 0, totalAchieved: 0, percent: 0 });
    const [loading, setLoading] = useState(false);

    // Years options (5 years back and 2 years forward)
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 8 }, (_, i) => {
        const y = currentYear - 5 + i;
        return { value: y.toString(), label: y.toString() };
    });

    // Months options
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const date = new Date(2000, i, 1);
        const name = date.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { month: 'long' });
        return { value: m.toString(), label: `${m} - ${name}` };
    });

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
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('year', year);
            params.set('month', month);
            if (selectedRepId && selectedRepId !== 'all') params.set('salesRepId', selectedRepId);
            
            const res = await fetch(`/api/reports/sales-reps/targets?${params}`);
            if (res.ok) {
                const data = await res.json();
                setReportData(data.reportData || []);
                setSummary(data.summary || { totalTarget: 0, totalAchieved: 0, percent: 0 });
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
    }, [year, month, selectedRepId]);

    const columns: TableColumn[] = [
        {
            header: t('المندوب'),
            cell: (row: TargetItem) => (
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
            header: t('الهدف المستهدف'),
            type: 'number',
            cell: (row: TargetItem) => (
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>
                    <Currency amount={row.targetAmount} />
                </span>
            )
        },
        {
            header: t('المبيعات المحققة'),
            type: 'number',
            cell: (row: TargetItem) => (
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', fontFamily: OUTFIT }}>
                    <Currency amount={row.actualSales} />
                </span>
            )
        },
        {
            header: t('المتبقي للهدف'),
            type: 'number',
            cell: (row: TargetItem) => {
                const diff = row.targetAmount - row.actualSales;
                const remaining = diff > 0 ? diff : 0;
                return (
                    <span style={{ fontSize: '13px', fontWeight: 600, color: remaining > 0 ? '#ef4444' : '#10b981', fontFamily: OUTFIT }}>
                        {remaining > 0 ? <Currency amount={remaining} /> : t('مكتمل')}
                    </span>
                );
            }
        },
        {
            header: t('التقدم ونسبة الإنجاز'),
            cell: (row: TargetItem) => {
                const percent = Math.min(row.achievementPercent, 100);
                const isOverTarget = row.achievementPercent >= 100;
                const barColor = row.achievementPercent >= 100 ? '#10b981' : row.achievementPercent >= 50 ? '#f59e0b' : '#ef4444';
                
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '180px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10.5px', color: barColor, fontWeight: 700, fontFamily: OUTFIT }}>
                                {row.achievementPercent.toFixed(1)}%
                            </span>
                            <span style={{ fontSize: '9px', color: C.textMuted, fontFamily: CAIRO }}>
                                {row.salesCount} {t('فواتير')}
                            </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: barColor, borderRadius: '10px', transition: 'width 0.4s ease' }} />
                        </div>
                    </div>
                );
            }
        }
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير الأهداف")}
                    subtitle={t("نسبة إنجاز كل مندوب مقابل الهدف الشهري مع مؤشرات الأداء بصرياً.")}
                    backTab="sales_reps"
                    printTitle={t("تقرير أهداف مناديب المبيعات")}
                    printDate={`${month}/${year}`}
                    printLabel={t("الشهر:")}
                />

                {/* Filters Row */}
                <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '130px' }}>
                        <CustomSelect
                            value={year}
                            onChange={setYear}
                            placeholder={t("السنة")}
                            hideSearch
                            style={{ background: C.card, border: `1px solid ${C.border}` }}
                            options={yearOptions}
                        />
                    </div>

                    <div style={{ minWidth: '180px' }}>
                        <CustomSelect
                            value={month}
                            onChange={setMonth}
                            placeholder={t("الشهر")}
                            hideSearch
                            style={{ background: C.card, border: `1px solid ${C.border}` }}
                            options={monthOptions}
                        />
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
                        <Target size={64} style={{ opacity: 0.1, color: C.primary, marginBottom: '16px' }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t("لا توجد أهداف محددة لهذا الشهر")}</h3>
                        <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: C.textSecondary, maxWidth: '400px', lineHeight: 1.6, fontFamily: CAIRO }}>{t("لم يتم تعيين أهداف مبيعات للمناديب في هذه الفترة. يرجى تهيئتها من إدارة المناديب.")}</p>
                    </div>
                ) : (
                    <>
                        {/* KPI Cards Row — يستخدم StatCard الموحّد */}
                        <StatCardGrid data-print-include cols={3} style={{ marginBottom: '24px' }}>
                            <StatCard
                                label={t('إجمالي المبيعات المستهدفة')}
                                value={fmt(summary.totalTarget)}
                                suffix={sym}
                                icon={<Target size={18} />}
                                color="#256af4"
                            />
                            <StatCard
                                label={t('إجمالي المبيعات الفعلية')}
                                value={fmt(summary.totalAchieved)}
                                suffix={sym}
                                icon={<CheckCircle2 size={18} />}
                                color="#10b981"
                            />
                            <StatCard
                                label={t('متوسط نسبة الإنجاز')}
                                value={summary.percent.toFixed(1)}
                                suffix="%"
                                icon={<Award size={18} />}
                                color="#a78bfa"
                            />
                        </StatCardGrid>

                        {/* Targets Table */}
                        <div style={{ marginBottom: '30px' }}>
                            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.01)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', border: `1px solid ${C.border}` }}>
                                <div style={STitle}><Target size={14} /> {t('متابعة تحقيق أهداف المبيعات الشهرية')}</div>
                            </div>
                            <DataTable
                                columns={columns}
                                data={reportData}
                                emptyIcon={Target}
                                emptyMessage={t('لا توجد أهداف مسجلة')}
                            />
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
