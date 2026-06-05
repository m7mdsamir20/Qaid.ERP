'use client';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import TableSkeleton from '@/components/TableSkeleton';
import { formatNumber } from '@/lib/currency';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, IS, OUTFIT } from '@/constants/theme';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { Search, FileText, Loader2 } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

const DC = '#ef4444';

interface ExpenseRow {
    id: string;
    entryNumber: number | string;
    date: string;
    description: string;
    expenseAccountName: string;
    sourceType: string;
    sourceName: string;
    amount: number;
}

interface ExpensesReportData {
    totalAmount: number;
    rows: ExpenseRow[];
}

export default function ExpensesReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { symbol: cSymbol } = useCurrency();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [data, setData] = useState<ExpensesReportData | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            const res = await fetch(`/api/reports/expenses-report?${params}`);
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || t('فشل في استخراج التقرير'));
                return;
            }
            setData(await res.json());
        } catch { alert(t('فشل الاتصال بالخادم')); }
        finally { setLoading(false); }
    };

    const columns: TableColumn[] = [
        {
            header: t('رقم القيد'),
            cell: (row: ExpenseRow) => `#${row.entryNumber}`,
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('التاريخ'),
            cell: (row: ExpenseRow) => new Date(row.date).toLocaleDateString('en-GB'),
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('البيان'),
            cell: (row: ExpenseRow) => row.description,
            style: { fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO }
        },
        {
            header: t('حساب المصروف'),
            cell: (row: ExpenseRow) => row.expenseAccountName,
            style: { fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO }
        },
        {
            header: t('المصدر'),
            cell: (row: ExpenseRow) => (
                <span style={{
                    padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                    background: row.sourceType === 'bank' ? 'rgba(37, 106, 244,0.1)' : 'rgba(16,185,129,0.1)',
                    color: row.sourceType === 'bank' ? '#60a5fa' : '#34d399',
                }}>
                    {row.sourceName}
                </span>
            ),
            style: { fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }
        },
        {
            header: t('المبلغ'),
            type: 'number',
            cell: (row: ExpenseRow) => formatNumber(Number(row.amount)),
            style: { fontWeight: 600, fontSize: '13px', color: DC, fontFamily: OUTFIT, textAlign: 'center' } as React.CSSProperties
        }
    ];

    const footerElement = data && (
        <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
            <td colSpan={5} style={{ padding: '18px 16px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('الإجمالي')}</td>
            <td style={{ padding: '18px 16px', fontWeight: 600, fontSize: '13px', color: DC, fontFamily: OUTFIT, textAlign: 'center' }}>
                {formatNumber(Number(data.totalAmount))} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{cSymbol}</span>
            </td>
        </tr>
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ width: '100%', paddingBottom: '60px' }}>
                <ReportHeader
                    title={t("تقرير المصروفات")}
                    subtitle={t("عرض تفصيلي لجميع المصروفات المسجلة خلال فترة زمنية محددة.")}
                    backTab="treasury-bank"
                    printTitle={t("تقرير المصروفات")}
                    printDate={from || to ? `${from ? `${t('من')} ${from}` : ''} ${to ? `${t('إلى')} ${to}` : ''}`.trim() : undefined}
                />

                {/* Filters */}
                <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="date-filter-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO, whiteSpace: 'nowrap' }}>{t('من:')}</span>
                        <div className="date-input-wrapper" style={{ width: '170px' }}>
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t('من:')}</span>
                            <input
                                type="date"
                                value={from}
                                onChange={e => setFrom(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 12px',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO, whiteSpace: 'nowrap' }}>{t('إلى:')}</span>
                        <div className="date-input-wrapper" style={{ width: '170px' }}>
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t('إلى:')}</span>
                            <input
                                type="date"
                                value={to}
                                onChange={e => setTo(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 12px',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                    </div>
                    <button className="update-btn"
                        onClick={fetchReport}
                        style={{
                            height: '42px', padding: '0 24px', borderRadius: '12px',
                            background: C.primary, color: '#fff', border: 'none',
                            fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO,
                            boxShadow: '0 4px 12px rgba(37, 106, 244,0.2)', whiteSpace: 'nowrap'
                        }}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        {t('عرض التقرير')}
                    </button>
                </div>

                {loading ? ( <TableSkeleton /> ) : !data ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', textAlign: 'center', background: C.card, borderRadius: '24px', border: `1px dashed ${C.border}` }}>
                        <FileText size={60} style={{ opacity: 0.1, marginBottom: '20px', color: C.primary }} />
                        <h3 style={{ color: C.textSecondary, fontSize: '15px', fontFamily: CAIRO }}>{t('حدد الفترة الزمنية واضغط "عرض التقرير"')}</h3>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div data-print-include className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            <div style={{ background: `${DC}08`, border: `1px solid ${DC}33`, borderRadius: '12px', padding: '20px 24px' }}>
                                <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '6px', fontFamily: CAIRO, fontWeight: 600 }}>{t('إجمالي المصروفات')}</div>
                                <div style={{ fontSize: '22px', fontWeight: 600, color: DC, fontFamily: OUTFIT }}>
                                    {formatNumber(Number(data.totalAmount))} <span style={{ fontSize: '12px', fontFamily: CAIRO }}>{cSymbol}</span>
                                </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px 24px' }}>
                                <div style={{ fontSize: '11px', color: C.textSecondary, marginBottom: '6px', fontFamily: CAIRO, fontWeight: 600 }}>{t('عدد العمليات')}</div>
                                <div style={{ fontSize: '22px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{data.rows.length}</div>
                            </div>
                        </div>

                        {/* Table using DataTable */}
                        <DataTable
                            columns={columns}
                            data={data.rows}
                            emptyIcon={FileText}
                            emptyMessage={t('لا توجد مصروفات في هذه الفترة')}
                            footer={footerElement}
                        />
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
