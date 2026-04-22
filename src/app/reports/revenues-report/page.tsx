'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, IS, INTER } from '@/constants/theme';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { Search, FileText, Loader2 } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import * as XLSX from 'xlsx';

const SC = '#10b981';

interface RevenueRow {
    id: string;
    entryNumber: number | string;
    date: string;
    description: string;
    revenueAccountName: string;
    sourceType: string;
    sourceName: string;
    amount: number;
}

interface RevenuesReportData {
    totalAmount: number;
    rows: RevenueRow[];
}

export default function RevenuesReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { symbol: cSymbol } = useCurrency();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [data, setData] = useState<RevenuesReportData | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            const res = await fetch(`/api/reports/revenues-report?${params}`);
            if (!res.ok) { const err = await res.json(); alert(err.error || t('فشل في استخراج التقرير')); return; }
            setData(await res.json());
        } catch { alert(t('فشل الاتصال بالخادم')); }
        finally { setLoading(false); }
    };

    const exportToExcel = () => {
        if (!data?.rows.length) return;
        const excelData = data.rows.map(row => ({
            [t('رقم القيد')]: `#${row.entryNumber}`,
            [t('التاريخ')]: new Date(row.date).toLocaleDateString('en-GB'),
            [t('البيان')]: row.description,
            [t('حساب الإيراد')]: row.revenueAccountName,
            [t('المصدر')]: row.sourceName,
            [t('المبلغ')]: row.amount,
        }));
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('تقرير الإيرادات'));
        XLSX.writeFile(wb, `${t('تقرير_الإيرادات')}_${new Date().toLocaleDateString('en-GB')}.xlsx`);
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ width: '100%', paddingBottom: '60px' }}>
                <ReportHeader
                    title={t("تقرير الإيرادات الأخرى")}
                    subtitle={t("عرض تفصيلي لجميع الإيرادات الأخرى المسجلة خلال فترة زمنية محددة.")}
                    backTab="treasury-bank"
                    printTitle={t("تقرير الإيرادات الأخرى")}
                    printDate={from || to ? `${from ? `من ${from}` : ''} ${to ? `إلى ${to}` : ''}`.trim() : undefined}
                    onExportExcel={exportToExcel}
                />

                {/* Filters */}
                <div className="no-print" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center' }}>
                    <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO, whiteSpace: 'nowrap' }}>{t('من:')}</span>
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                        style={{ ...IS, width: '170px', height: '42px', padding: '0 12px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '13.5px', fontWeight: 600, outline: 'none', fontFamily: INTER, textAlign: 'start', direction: 'ltr' }} />
                    <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO, whiteSpace: 'nowrap' }}>{t('إلى:')}</span>
                    <input type="date" value={to} onChange={e => setTo(e.target.value)}
                        style={{ ...IS, width: '170px', height: '42px', padding: '0 12px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '13.5px', fontWeight: 600, outline: 'none', fontFamily: INTER, textAlign: 'start', direction: 'ltr' }} />
                    <button onClick={fetchReport}
                        style={{ height: '42px', padding: '0 24px', borderRadius: '12px', background: C.primary, color: '#fff', border: 'none', fontSize: '13.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO, boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        {t('عرض التقرير')}
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '100px', textAlign: 'start'}}>
                        <Loader2 size={40} className="animate-spin" style={{ color: SC }} />
                        <p style={{ marginTop: '20px', color: C.textMuted, fontFamily: CAIRO }}>{t('جاري استخراج التقرير...')}</p>
                    </div>
                ) : !data ? (
                    <div style={{ padding: '80px', textAlign: 'start', background: C.card, borderRadius: '24px', border: `1px dashed ${C.border}` }}>
                        <FileText size={60} style={{ opacity: 0.1, marginBottom: '20px', color: SC }} />
                        <h3 style={{ color: C.textMuted, fontSize: '15px', fontFamily: CAIRO }}>{t('حدد الفترة الزمنية واضغط "عرض التقرير"')}</h3>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            <div style={{ background: `${SC}08`, border: `1px solid ${SC}33`, borderRadius: '12px', padding: '20px 24px' }}>
                                <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '6px', fontFamily: CAIRO, fontWeight: 600 }}>{t('إجمالي الإيرادات')}</div>
                                <div style={{ fontSize: '22px', fontWeight: 900, color: SC, fontFamily: INTER }}>
                                    {Number(data.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '12px', fontFamily: CAIRO }}>{cSymbol}</span>
                                </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px 24px' }}>
                                <div style={{ fontSize: '11px', color: C.textMuted, marginBottom: '6px', fontFamily: CAIRO, fontWeight: 600 }}>{t('عدد العمليات')}</div>
                                <div style={{ fontSize: '22px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{data.rows.length}</div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="print-table-container" style={{ background: C.card, borderRadius: '18px', overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('تفاصيل الإيرادات')}</h3>
                            </div>
                            {data.rows.length === 0 ? (
                                <div style={{ padding: '60px', textAlign: 'start', color: C.textMuted, fontFamily: CAIRO }}>{t('لا توجد إيرادات في هذه الفترة')}</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                                {[t('رقم القيد'), t('التاريخ'), t('البيان'), t('حساب الإيراد'), t('المصدر'), t('المبلغ')].map((h, i) => (
                                                    <th key={i} style={{ padding: '14px 16px', fontSize: '12px',  color: i === 5 ? SC : C.textSecondary, fontFamily: CAIRO, fontWeight: 700 }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.rows.map((row, idx) => (
                                                <tr key={row.id}
                                                    style={{ borderBottom: `1px solid ${C.border}`, background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                    <td style={{ padding: '14px 16px', fontSize: '13px', color: C.textMuted, fontFamily: INTER }}>#{row.entryNumber}</td>
                                                    <td style={{ padding: '14px 16px', fontSize: '13px', color: C.textMuted, fontFamily: INTER, direction: 'ltr' }}>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                                                    <td style={{ padding: '14px 16px', fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO }}>{row.description}</td>
                                                    <td style={{ padding: '14px 16px', fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO }}>{row.revenueAccountName}</td>
                                                    <td style={{ padding: '14px 16px', fontSize: '13px', color: C.textMuted, fontFamily: CAIRO }}>
                                                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: row.sourceType === 'bank' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)', color: row.sourceType === 'bank' ? '#60a5fa' : '#34d399' }}>
                                                            {row.sourceName}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 16px',  fontSize: '14px', fontWeight: 600, color: SC, fontFamily: INTER }}>
                                                        {Number(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
                                            <tr>
                                                <td colSpan={5} style={{ padding: '18px 16px',  fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{t('الإجمالي')}</td>
                                                <td style={{ padding: '18px 16px',  fontWeight: 900, fontSize: '14px', color: SC, fontFamily: INTER }}>
                                                    {Number(data.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{cSymbol}</span>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                .print-only { display: none; }
                @media print {
                    .print-only { display: block !important; }
                    .no-print { display: none !important; }
                    div { background: #fff !important; border-color: #e2e8f0 !important; }
                    div, span, h2, h3, p { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; border: 1px solid #e2e8f0 !important; }
                }
                input[type="date"]::-webkit-calendar-picker-indicator { filter: brightness(0) saturate(100%) invert(67%) sepia(43%) saturate(1042%) hue-rotate(186deg) brightness(103%) contrast(97%); cursor: pointer; }
            `}</style>
        </DashboardLayout>
    );
}
