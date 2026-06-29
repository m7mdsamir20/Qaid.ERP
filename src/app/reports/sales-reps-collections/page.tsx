'use client';
import TableSkeleton from '@/components/TableSkeleton';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { useEffect, useState } from 'react';
import { BarChart3, Search, Calendar, Wallet, CheckCircle2, AlertTriangle, User, Landmark, HelpCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, IS, PAGE_BASE, TABLE_STYLE, SC, STitle } from '@/constants/theme';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';

interface CollectionItem {
    id: string;
    date: string;
    amount: number;
    method: string;
    status: string;
    checkNumber?: string | null;
    bankName?: string | null;
    checkDueDate?: string | null;
    notes?: string | null;
    salesRep: {
        id: string;
        name: string;
        code: string | null;
    };
    customer: {
        id: string;
        name: string;
    };
    invoice?: {
        id: string;
        invoiceNumber: number;
    } | null;
}

export default function SalesRepsCollectionsReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { symbol: sym } = useCurrency();
    const fmt = (n: number) => formatNumber(n);

    const [reps, setReps] = useState<any[]>([]);
    const [selectedRepId, setSelectedRepId] = useState('all');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [method, setMethod] = useState('all');
    const [status, setStatus] = useState('all');
    
    const [reportData, setReportData] = useState<CollectionItem[]>([]);
    const [summary, setSummary] = useState({ total: 0, cash: 0, transfer: 0, check: 0, checkPending: 0 });
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
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            if (selectedRepId && selectedRepId !== 'all') params.set('salesRepId', selectedRepId);
            if (method && method !== 'all') params.set('method', method);
            if (status && status !== 'all') params.set('status', status);
            
            const res = await fetch(`/api/reports/sales-reps/collections?${params}`);
            if (res.ok) {
                const data = await res.json();
                setReportData(data.collections || []);
                setSummary(data.summary || { total: 0, cash: 0, transfer: 0, check: 0, checkPending: 0 });
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
    }, [from, to, selectedRepId, method, status]);

    const columns: TableColumn[] = [
        {
            header: t('التاريخ'),
            cell: (row: CollectionItem) => (
                <span style={{ fontSize: '12.5px', color: C.textSecondary, fontFamily: OUTFIT }}>
                    {new Date(row.date).toLocaleDateString('en-ZA')}
                </span>
            )
        },
        {
            header: t('المندوب'),
            cell: (row: CollectionItem) => (
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>
                    {row.salesRep.name}
                </span>
            )
        },
        {
            header: t('العميل'),
            cell: (row: CollectionItem) => (
                <span style={{ fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO }}>
                    {row.customer.name}
                </span>
            )
        },
        {
            header: t('الفاتورة'),
            cell: (row: CollectionItem) => (
                row.invoice ? (
                    <a href={`/sales/${row.invoice.id}`} style={{ textDecoration: 'none' }}>
                        <span style={{ background: 'rgba(37, 106, 244,0.1)', border: '1px solid rgba(37, 106, 244,0.2)', borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, color: '#60a5fa', fontFamily: OUTFIT }}>
                            {`SAL-${String(row.invoice.invoiceNumber).padStart(5, '0')}`}
                        </span>
                    </a>
                ) : <span style={{ color: C.textMuted }}>—</span>
            )
        },
        {
            header: t('طريقة الدفع'),
            cell: (row: CollectionItem) => (
                <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', fontFamily: CAIRO,
                    background: row.method === 'cash' ? 'rgba(16, 185, 129, 0.08)' : row.method === 'transfer' ? 'rgba(37, 106, 244, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                    color: row.method === 'cash' ? '#10b981' : row.method === 'transfer' ? '#3b82f6' : '#f59e0b',
                }}>
                    {row.method === 'cash' ? t('نقدي') : row.method === 'transfer' ? t('تحويل بنكي') : t('شيك')}
                </span>
            )
        },
        {
            header: t('الحالة / التفاصيل'),
            cell: (row: CollectionItem) => {
                if (row.method === 'check') {
                    const statusText = row.status === 'deposited' ? t('مودع') : row.status === 'returned' ? t('مرتجع') : t('معلق');
                    const statusColor = row.status === 'deposited' ? '#10b981' : row.status === 'returned' ? '#ef4444' : '#f59e0b';
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor, fontFamily: CAIRO }}>
                                {statusText} {row.checkNumber ? `(#${row.checkNumber})` : ''}
                            </span>
                            {row.bankName && (
                                <span style={{ fontSize: '9.5px', color: C.textMuted, fontFamily: CAIRO }}>
                                    {row.bankName} {row.checkDueDate ? `— ${new Date(row.checkDueDate).toLocaleDateString('en-ZA')}` : ''}
                                </span>
                            )}
                        </div>
                    );
                }
                return <span style={{ fontSize: '11.5px', color: C.textMuted, fontFamily: CAIRO }}>{row.notes || t('تم التحصيل')}</span>;
            }
        },
        {
            header: t('المبلغ'),
            type: 'number',
            cell: (row: CollectionItem) => (
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', fontFamily: OUTFIT }}>
                    <Currency amount={row.amount} />
                </span>
            )
        }
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير تحصيلات المناديب")}
                    subtitle={t("تفاصيل المبالغ والتحصيلات النقدية والبنكية والشيكات المودعة والمعلقة لكل مندوب.")}
                    backTab="sales_reps"
                    printTitle={t("تقرير تحصيلات المناديب")}
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
                        <div style={{ minWidth: '160px' }}>
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

                    <div style={{ minWidth: '150px' }}>
                        <CustomSelect
                            value={method}
                            onChange={setMethod}
                            placeholder={t("كل طرق الدفع")}
                            hideSearch
                            style={{ background: C.card, border: `1px solid ${C.border}` }}
                            options={[
                                { value: 'all', label: t('كل طرق الدفع') },
                                { value: 'cash', label: t('نقدي') },
                                { value: 'transfer', label: t('تحويل بنكي') },
                                { value: 'check', label: t('شيك') }
                            ]}
                        />
                    </div>

                    <div style={{ minWidth: '150px' }}>
                        <CustomSelect
                            value={status}
                            onChange={setStatus}
                            placeholder={t("كل الحالات")}
                            hideSearch
                            style={{ background: C.card, border: `1px solid ${C.border}` }}
                            options={[
                                { value: 'all', label: t('كل الحالات') },
                                { value: 'pending', label: t('معلق') },
                                { value: 'deposited', label: t('مودع') },
                                { value: 'returned', label: t('مرتجع') }
                            ]}
                        />
                    </div>
                </div>

                {loading ? (
                    <TableSkeleton />
                ) : reportData.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px 20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <BarChart3 size={64} style={{ opacity: 0.1, color: C.primary, marginBottom: '16px' }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t("لا توجد تحصيلات مسجلة")}</h3>
                        <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: C.textSecondary, maxWidth: '400px', lineHeight: 1.6, fontFamily: CAIRO }}>{t("لم يتم العثور على حركات تحصيل مطابقة للفلاتر المحددة.")}</p>
                    </div>
                ) : (
                    <>
                        {/* KPI Cards Row */}
                        <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(52,211,153,0.08)', color: '#10b981', borderRadius: '10px' }}><CheckCircle2 size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي التحصيلات')}</p>
                                    <span style={{ fontSize: '15.5px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={summary.total} /></span>
                                </div>
                            </div>
                            
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(16,185,129,0.08)', color: '#10b981', borderRadius: '10px' }}><Wallet size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('التحصيل النقدي')}</p>
                                    <span style={{ fontSize: '15.5px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={summary.cash} /></span>
                                </div>
                            </div>

                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(37,106,244,0.08)', color: '#256af4', borderRadius: '10px' }}><Landmark size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('التحويل البنكي')}</p>
                                    <span style={{ fontSize: '15.5px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={summary.transfer} /></span>
                                </div>
                            </div>

                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', borderRadius: '10px' }}><AlertTriangle size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('شيكات معلقة')}</p>
                                    <span style={{ fontSize: '15.5px', fontWeight: 600, color: '#f59e0b', fontFamily: OUTFIT }}><Currency amount={summary.checkPending} /></span>
                                </div>
                            </div>
                        </div>

                        {/* Collections Table */}
                        <div style={{ marginBottom: '30px' }}>
                            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.01)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', border: `1px solid ${C.border}` }}>
                                <div style={STitle}><Search size={14} /> {t('سجل تحصيلات مناديب المبيعات')}</div>
                            </div>
                            <DataTable
                                columns={columns}
                                data={reportData}
                                emptyIcon={Search}
                                emptyMessage={t('لا توجد تحصيلات مسجلة')}
                            />
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
