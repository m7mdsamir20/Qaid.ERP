'use client';
import TableSkeleton from '@/components/TableSkeleton';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { useEffect, useState } from 'react';
import { BarChart3, Search, Calendar, Wallet, ArrowUpRight, ArrowDownRight, Activity, Loader2, User, ChevronRight, Percent, Award, Receipt } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, IS, PAGE_BASE, TABLE_STYLE, SC, STitle } from '@/constants/theme';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';

interface InvoiceDetail {
    id: string;
    invoiceNumber: number;
    date: string;
    total: number;
    paidAmount: number;
    remaining: number;
    customerName: string;
    paymentMethod: string;
}

interface RepresentativeReport {
    id: string;
    name: string;
    code: string | null;
    commissionRate: number;
    commissionType: string;
    totalSales: number;
    totalCollected: number;
    totalRemaining: number;
    commissionByTotal: number;
    commissionByCollected: number;
    invoices: InvoiceDetail[];
}

export default function SalesRepresentativesReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { symbol: sym } = useCurrency();
    const fmt = (n: number) => formatNumber(n);

    const [reps, setReps] = useState<any[]>([]);
    const [selectedRepId, setSelectedRepId] = useState('all');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [calculationBasis, setCalculationBasis] = useState<'invoice_total' | 'collected_amount'>('invoice_total');
    const [reportData, setReportData] = useState<RepresentativeReport[]>([]);
    const [totals, setTotals] = useState({ sales: 0, collected: 0, remaining: 0, commission: 0 });
    const [loading, setLoading] = useState(false);
    const [activeRepId, setActiveRepId] = useState<string | null>(null);

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
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            if (selectedRepId && selectedRepId !== 'all') params.set('salesRepId', selectedRepId);
            
            const res = await fetch(`/api/reports/sales-representatives?${params}`);
            if (res.ok) {
                const data = await res.json();
                const rData = data.reportData || [];
                setReportData(rData);
                
                // Set default active rep for details view
                if (rData.length > 0) {
                    setActiveRepId(rData[0].id);
                } else {
                    setActiveRepId(null);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    // Recompute totals whenever calculationBasis or reportData changes
    useEffect(() => {
        let sales = 0;
        let collected = 0;
        let remaining = 0;
        let commission = 0;

        reportData.forEach(rep => {
            sales += rep.totalSales;
            collected += rep.totalCollected;
            remaining += rep.totalRemaining;
            commission += calculationBasis === 'invoice_total' ? rep.commissionByTotal : rep.commissionByCollected;
        });

        setTotals({ sales, collected, remaining, commission });
    }, [reportData, calculationBasis]);

    const activeRep = reportData.find(r => r.id === activeRepId);

    const columns: TableColumn[] = [
        {
            header: t('المندوب'),
            cell: (row: RepresentativeReport) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer' }} onClick={() => setActiveRepId(row.id)}>
                    <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: activeRepId === row.id ? C.primary : C.primaryBg,
                        border: `1px solid ${C.primaryBorder}`, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: activeRepId === row.id ? '#fff' : C.primary,
                        fontSize: '12px', fontWeight: 700, fontFamily: OUTFIT, transition: 'all 0.2s'
                    }}>
                        {row.name.charAt(0)}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: activeRepId === row.id ? C.primary : C.textPrimary, fontFamily: CAIRO }}>{row.name}</div>
                        {row.code && <div style={{ fontSize: '10px', color: C.textSecondary, fontFamily: OUTFIT }}>{row.code}</div>}
                    </div>
                </div>
            )
        },
        {
            header: t('نسبة العمولة الافتراضية'),
            cell: (row: RepresentativeReport) => (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: C.textSecondary }}>
                    {row.commissionRate}%
                </span>
            )
        },
        {
            header: t('إجمالي المبيعات'),
            type: 'number',
            cell: (row: RepresentativeReport) => (
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>
                    <Currency amount={row.totalSales} />
                </span>
            )
        },
        {
            header: t('إجمالي المحصل'),
            type: 'number',
            cell: (row: RepresentativeReport) => (
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', fontFamily: OUTFIT }}>
                    <Currency amount={row.totalCollected} />
                </span>
            )
        },
        {
            header: t('العمولة المستحقة'),
            type: 'number',
            cell: (row: RepresentativeReport) => {
                const commission = calculationBasis === 'invoice_total' ? row.commissionByTotal : row.commissionByCollected;
                return (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 12px', borderRadius: '30px', fontSize: '12px', fontWeight: 700,
                        background: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.22)', fontFamily: OUTFIT
                    }}>
                        <Currency amount={commission} />
                    </span>
                );
            }
        }
    ];

    const repInvoicesColumns: TableColumn[] = [
        {
            header: t('رقم الفاتورة'),
            cell: (row: InvoiceDetail) => (
                <a href={`/sales/${row.id}`} style={{ textDecoration: 'none' }}>
                    <span style={{ background: 'rgba(37, 106, 244,0.1)', border: '1px solid rgba(37, 106, 244,0.2)', borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, color: '#60a5fa', fontFamily: OUTFIT }}>
                        {`SAL-${String(row.invoiceNumber).padStart(5, '0')}`}
                    </span>
                </a>
            )
        },
        {
            header: t('التاريخ'),
            cell: (row: InvoiceDetail) => (
                <span style={{ fontSize: '12.5px', color: C.textSecondary, fontFamily: OUTFIT }}>
                    {new Date(row.date).toLocaleDateString('en-GB')}
                </span>
            )
        },
        {
            header: t('العميل'),
            cell: (row: InvoiceDetail) => (
                <span style={{ fontSize: '12.5px', color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO }}>
                    {row.customerName}
                </span>
            )
        },
        {
            header: t('طريقة الدفع'),
            cell: (row: InvoiceDetail) => (
                <span style={{ fontSize: '11px', color: C.textSecondary, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '6px', fontFamily: CAIRO }}>
                    {row.paymentMethod === 'cash' ? t('نقدي') : row.paymentMethod === 'bank' ? t('بنكي') : t('آجل')}
                </span>
            )
        },
        {
            header: t('صافي القيمة'),
            type: 'number',
            cell: (row: InvoiceDetail) => (
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>
                    <Currency amount={row.total} />
                </span>
            )
        },
        {
            header: t('المحصل'),
            type: 'number',
            cell: (row: InvoiceDetail) => (
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#10b981', fontFamily: OUTFIT }}>
                    <Currency amount={row.paidAmount} />
                </span>
            )
        },
        {
            header: t('العمولة المستحقة'),
            type: 'number',
            cell: (row: InvoiceDetail) => {
                if (!activeRep) return '—';
                const base = calculationBasis === 'invoice_total' ? row.total : row.paidAmount;
                const comm = base * (activeRep.commissionRate / 100);
                return (
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#a78bfa', fontFamily: OUTFIT }}>
                        <Currency amount={comm} />
                    </span>
                );
            }
        }
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير عمولات مناديب المبيعات")}
                    subtitle={t("تتبع أداء المبيعات والتحصيلات للمناديب واحتساب عمولاتهم المستحقة بدقة.")}
                    backTab="sales-purchases"
                    printTitle={t("تقرير عمولات المناديب")}
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
                        <div style={{ minWidth: '200px' }}>
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

                    {/* Calculation Basis Toggle Button Group */}
                    <div style={{ display: 'flex', gap: '6px', background: C.card, padding: '4px', borderRadius: '12px', border: `1px solid ${C.border}`, height: '42px', alignItems: 'center' }}>
                        <button
                            onClick={() => setCalculationBasis('invoice_total')}
                            style={{
                                padding: '0 16px', height: '34px', borderRadius: '8px',
                                border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                                fontFamily: CAIRO, transition: 'all 0.2s',
                                background: calculationBasis === 'invoice_total' ? C.primary : 'transparent',
                                color: calculationBasis === 'invoice_total' ? '#fff' : C.textSecondary,
                            }}
                        >
                            {t('عمولة على إجمالي الفاتورة')}
                        </button>
                        <button
                            onClick={() => setCalculationBasis('collected_amount')}
                            style={{
                                padding: '0 16px', height: '34px', borderRadius: '8px',
                                border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                                fontFamily: CAIRO, transition: 'all 0.2s',
                                background: calculationBasis === 'collected_amount' ? C.primary : 'transparent',
                                color: calculationBasis === 'collected_amount' ? '#fff' : C.textSecondary,
                            }}
                        >
                            {t('عمولة على المبالغ المحصلة')}
                        </button>
                    </div>

                    <button className="update-btn" onClick={fetchReport} style={{
                        height: '42px', padding: '0 24px', borderRadius: '12px',
                        background: C.primary, color: '#fff', border: 'none',
                        fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO,
                        boxShadow: '0 4px 12px rgba(37, 106, 244,0.2)', whiteSpace: 'nowrap',
                        marginInlineStart: 'auto'
                    }}>
                        <Search size={16} /> {t('تحديث البيانات')}
                    </button>
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
                        {/* KPI Cards Row */}
                        <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(37, 106, 244,0.08)', color: '#256af4', borderRadius: '10px' }}><BarChart3 size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي مبيعات المناديب')}</p>
                                    <span style={{ fontSize: '15.5px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={totals.sales} /></span>
                                </div>
                            </div>
                            
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(52,211,153,0.08)', color: '#10b981', borderRadius: '10px' }}><Wallet size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي التحصيلات')}</p>
                                    <span style={{ fontSize: '15.5px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={totals.collected} /></span>
                                </div>
                            </div>

                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', borderRadius: '10px' }}><ArrowDownRight size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي المتبقي (آجل)')}</p>
                                    <span style={{ fontSize: '15.5px', fontWeight: 600, color: '#ef4444', fontFamily: OUTFIT }}><Currency amount={totals.remaining} /></span>
                                </div>
                            </div>

                            <div style={{ flex: 1, minWidth: '200px', background: 'rgba(139, 92, 246, 0.06)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa', borderRadius: '10px' }}><Award size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#c084fc', fontFamily: CAIRO }}>{t('إجمالي العمولات المستحقة')}</p>
                                    <span style={{ fontSize: '17px', fontWeight: 700, color: '#a78bfa', fontFamily: OUTFIT }}><Currency amount={totals.commission} /></span>
                                </div>
                            </div>
                        </div>

                        {/* Representatives Summary Table */}
                        <div style={{ marginBottom: '30px' }}>
                            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.01)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', border: `1px solid ${C.border}` }}>
                                <div style={STitle}><User size={14} /> {t('ملخص عمولات مناديب المبيعات')}</div>
                            </div>
                            <DataTable
                                columns={columns}
                                data={reportData}
                                emptyIcon={User}
                                emptyMessage={t('لا يوجد مناديب مبيعات')}
                            />
                        </div>

                        {/* Detail View of Selected Representative Invoices */}
                        {activeRep && (
                            <div style={{ animation: 'fadeUp 0.3s ease both' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '20px', background: C.primary, borderRadius: '4px' }}></div>
                                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>
                                            {t('تفاصيل فواتير وعمولات المندوب:')} <span style={{ color: C.primary }}>{activeRep.name}</span>
                                        </h3>
                                    </div>
                                    <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>
                                        {activeRep.invoices.length} {t('فواتير معتمدة')}
                                    </span>
                                </div>

                                <DataTable
                                    columns={repInvoicesColumns}
                                    data={activeRep.invoices}
                                    emptyIcon={Receipt}
                                    emptyMessage={t('لا توجد فواتير مسجلة لهذا المندوب')}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
