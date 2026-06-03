'use client';
import TableSkeleton from '@/components/TableSkeleton';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { Currency } from '@/components/Currency';
import { formatNumber } from '@/lib/currency';
import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { useEffect, useState } from 'react';
import { BarChart3, Search, Clock, Wallet } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, IS, PAGE_BASE } from '@/constants/theme';

interface ShiftData {
    id: string;
    shiftNumber: number;
    openedAt: string;
    closedAt: string | null;
    openingBalance: number;
    closingBalance: number | null;
    expectedBalance: number | null;
    difference: number | null;
    totalSales: number;
    totalOrders: number;
    status: string;
    user: { name: string } | null;
}

interface ReportData {
    shifts: ShiftData[];
    totalSales: number;
    totalExpected: number;
    totalActual: number;
    totalDiff: number;
}

interface BranchOption { id: string; name: string; }

export default function ShiftSalesReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const { data: session } = useSession();

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            if (branchId && branchId !== 'all') params.set('branchId', branchId);
            const res = await fetch(`/api/reports/shift-sales?${params}`);
            if (res.ok) setData(await res.json());
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchReport(); }, []);

    const columns: TableColumn[] = [
        {
            header: t('الوردية'),
            cell: (row: ShiftData) => (
                <>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>#{row.shiftNumber}</div>
                    <div style={{ fontSize: '10px', color: C.textMuted }}>{new Date(row.openedAt).toLocaleString('en-GB')}</div>
                </>
            )
        },
        {
            header: t('الكاشير'),
            cell: (row: ShiftData) => row.user?.name || '—',
            style: { fontFamily: CAIRO, fontSize: '13px', color: C.textPrimary, fontWeight: 600 }
        },
        {
            header: t('الحالة'),
            cell: (row: ShiftData) => (
                <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: row.status === 'open' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', color: row.status === 'open' ? '#10b981' : '#64748b' }}>
                    {row.status === 'open' ? t('مفتوحة') : t('مغلقة')}
                </span>
            ),
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الطلبات'),
            cell: (row: ShiftData) => row.totalOrders,
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textPrimary, fontWeight: 600, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('المبيعات'),
            type: 'number' as const,
            cell: (row: ShiftData) => <Currency amount={row.totalSales} />,
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: C.textPrimary, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('عهدة الفتح'),
            type: 'number' as const,
            cell: (row: ShiftData) => <Currency amount={row.openingBalance} />,
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: C.textMuted, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('المتوقع'),
            type: 'number' as const,
            cell: (row: ShiftData) => row.status === 'closed' ? <Currency amount={row.expectedBalance || 0} /> : '—',
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: '#10b981', textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الفعلي'),
            type: 'number' as const,
            cell: (row: ShiftData) => row.status === 'closed' ? <Currency amount={row.closingBalance || 0} /> : '—',
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: C.primary, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الفرق'),
            type: 'number' as const,
            cell: (row: ShiftData) => {
                if (row.status !== 'closed') return '—';
                const diff = row.difference || 0;
                return (
                    <span style={{ color: diff < 0 ? '#ef4444' : (diff > 0 ? '#10b981' : C.textMuted) }}>
                        <Currency amount={diff} />
                    </span>
                );
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 700, textAlign: 'center' } as React.CSSProperties
        }
    ];

    const footerElement = data && (
        <tr style={{ background: 'rgba(255,255,255,0.03)', borderTop: `2px solid ${C.border}` }}>
            <td colSpan={4} style={{ padding: '18px 24px', fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{t('الإجماليات')}</td>
            <td style={{ padding: '18px 20px', fontSize: '14px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={data.totalSales} /></td>
            <td colSpan={1}></td>
            <td style={{ padding: '18px 20px', fontSize: '14px', fontWeight: 700, color: '#10b981', fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={data.totalExpected} /></td>
            <td style={{ padding: '18px 20px', fontSize: '14px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={data.totalActual} /></td>
            <td style={{ padding: '18px 20px', fontSize: '14px', fontWeight: 700, color: data.totalDiff < 0 ? '#ef4444' : '#10b981', fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={data.totalDiff} /></td>
        </tr>
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("التقرير المالي للورديات")}
                    subtitle={t("تحليل تفصيلي لمبيعات الورديات وحركة الكاشير والعجز/الزيادة في الدرج")}
                    backTab="restaurant"
                    printTitle={t("التقرير المالي للورديات")}
                    printDate={(from || to) ? `${from ? t('من: ') + from : ''} ${to ? t(' إلى: ') + to : ''}` : undefined}
                />

                <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="date-filter-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className="date-label-desktop" style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('من:')}</span>
                        <div className="date-input-wrapper" style={{ width: '170px' }}>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...IS, width: '100%', height: '42px', padding: '0 12px', textAlign: 'start', direction: 'inherit', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '13.5px', fontWeight: 600, outline: 'none', fontFamily: OUTFIT }} />
                        </div>
                        <span className="date-label-desktop" style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('إلى:')}</span>
                        <div className="date-input-wrapper" style={{ width: '170px' }}>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...IS, width: '100%', height: '42px', padding: '0 12px', textAlign: 'start', direction: 'inherit', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '13.5px', fontWeight: 600, outline: 'none', fontFamily: OUTFIT }} />
                        </div>
                    </div>

                    <div className="branch-filter-wrapper" style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                        {branches.length > 1 && (
                            <div style={{ minWidth: '180px', flex: 1 }}>
                                <CustomSelect
                                    value={branchId}
                                    onChange={(v: string) => setBranchId(v)}
                                    placeholder={t("كل الفروع")}
                                    hideSearch
                                    style={{ background: C.card, border: `1px solid ${C.border}` }}
                                    options={[{ value: 'all', label: t('كل الفروع') }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
                                />
                            </div>
                        )}
                        <button className="update-btn" onClick={fetchReport} style={{ height: '42px', padding: '0 24px', borderRadius: '12px', background: C.primary, color: '#fff', border: 'none', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO, boxShadow: '0 4px 12px rgba(37, 106, 244,0.2)', whiteSpace: 'nowrap' }}>
                            <Search size={16} /> {t('تحديث')}
                        </button>
                    </div>
                </div>

                {loading ? ( <TableSkeleton /> ) : !data || data.shifts.length === 0 ? (
                    <div className="no-print" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <Clock size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px', display: 'inline-block' }} />
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t("لا توجد ورديات متاحة")}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '13px', color: C.textMuted, maxWidth: '400px', marginInline: 'auto', lineHeight: 1.6, fontFamily: CAIRO }}>{t("برجاء تعديل الفلاتر أو التاريخ لعرض الورديات المطلوبة.")}</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(37, 106, 244,0.08)', color: '#256af4', borderRadius: '10px' }}><BarChart3 size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي مبيعات الورديات')}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                        <span style={{ fontSize: '15.5px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={data.totalSales} /></span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(16,185,129,0.08)', color: '#10b981', borderRadius: '10px' }}><Wallet size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي النقدية المتوقعة')}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                        <span style={{ fontSize: '15.5px', fontWeight: 600, color: '#10b981', fontFamily: OUTFIT }}><Currency amount={data.totalExpected} /></span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderRadius: '10px' }}><Wallet size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('صافي العجز والزيادة')}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                        <span style={{ fontSize: '15.5px', fontWeight: 600, color: data.totalDiff < 0 ? '#ef4444' : (data.totalDiff > 0 ? '#10b981' : C.textPrimary), fontFamily: OUTFIT }}><Currency amount={data.totalDiff} /></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DataTable
                            columns={columns}
                            data={data.shifts}
                            emptyIcon={Clock}
                            emptyMessage={t('لا توجد ورديات متاحة')}
                            isLoading={loading}
                            footer={footerElement}
                        />
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
