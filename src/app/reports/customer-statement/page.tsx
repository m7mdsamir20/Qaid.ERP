'use client';
import TableSkeleton from '@/components/TableSkeleton';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import ReportHeader from '@/components/ReportHeader';
import { ScrollText, Calendar, Loader2, Users, Search, TrendingUp, TrendingDown, History, Printer, FileText, UserCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

import { useCurrency } from '@/hooks/useCurrency';
import { formatNumber } from '@/lib/currency';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

interface Customer { id: string; name: string; balance: number; createdAt: string; }

interface StatementRow {
    id: string;
    date: string;
    type: string;
    ref?: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
}

interface CustomerStatementData {
    customer: Customer;
    initialBalance: number;
    finalBalance: number;
    statement: StatementRow[];
}

export default function CustomerStatementPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { fMoney, symbol, currency } = useCurrency();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<CustomerStatementData | null>(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [error, setError] = useState('');

    const fetchLedger = useCallback(async (customerId: string = selectedId) => {
        if (!customerId) { setData(null); return; }
        setLoading(true);
        try {
            let url = `/api/reports/customer-statement?customerId=${customerId}`;
            const q = new URLSearchParams();
            if (dateFrom) q.append('from', dateFrom);
            if (dateTo) q.append('to', dateTo);
            if (q.toString()) url += `&${q.toString()}`;
            const res = await fetch(url);
            if (!res.ok) { const e = await res.json(); setError(e.error || t('فشل جلب كشف الحساب')); }
            else { const d = await res.json(); setData(d); setError(''); }
        } catch { setError(t('خطأ في الاتصال بالخادم')); } finally { setLoading(false); }
    }, [selectedId, dateFrom, dateTo]);

    // 1. Initial Load: Fetch All Customers
    useEffect(() => {
        fetch('/api/reports/customer-statement')
            .then(res => res.json())
            .then(d => { if (Array.isArray(d.customers)) setCustomers(d.customers); })
            .catch(() => { });
    }, []);

    // 2. Initial Selection from URL (Run only ONCE on mount)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get('customerId');
        if (urlId) {
            setSelectedId(urlId);
            fetchLedger(urlId);
        }
    }, []);

    const exportToExcel = () => {
        if (!data || !data.statement.length) return;
        const excelData = data.statement.map((row: StatementRow) => ({
            [t('التاريخ')]: new Date(row.date).toLocaleDateString('en-GB'),
            [t('طبيعة الحركة')]: row.type,
            [t('المرجع')]: row.ref || '—',
            [t('البيان')]: row.description,
            [t('مدين (عليه)')]: fMoney(row.debit),
            [t('دائن (له)')]: fMoney(row.credit),
            [t('الرصيد')]: fMoney(row.balance)
        }));

        if (data.initialBalance !== 0) {
            excelData.unshift({
                [t('التاريخ')]: data.customer?.createdAt ? new Date(data.customer.createdAt).toLocaleDateString('en-GB') : '—',
                [t('طبيعة الحركة')]: t('رصيد افتتاحي'),
                [t('المرجع')]: '—',
                [t('البيان')]: t('رصيد ما قبل فترة التقرير'),
                [t('مدين (عليه)')]: data.initialBalance > 0 ? fMoney(data.initialBalance) : '—',
                [t('دائن (له)')]: data.initialBalance < 0 ? fMoney(Math.abs(data.initialBalance)) : '—',
                [t('الرصيد')]: fMoney(data.initialBalance)
            });
        }

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('كشف الحساب'));
        XLSX.writeFile(wb, `${t('كشف_حساب')}_${data.customer.name}_${new Date().toLocaleDateString('en-GB')}.xlsx`);
    };

    const tdS = (isHeader: boolean) => ({ padding: '14px 20px' });

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("كشف حساب عميل تفصيلي")}
                    subtitle={t("استخراج بيان بكافة مبيعات، مدفوعات، ومرتجعات عميل محدد خلال فترة زمنية مختارة.")}
                    backTab="partners"
                    onExportExcel={exportToExcel}
                    printTitle={t("كشف حساب عميل تفصيلي")}
                    accountName={data ? data.customer.name : undefined}
                    printLabel={t('العميل:')}
                    printDate={dateFrom || dateTo ? `${dateFrom ? `من ${dateFrom}` : ''} ${dateTo ? `إلى ${dateTo}` : ''}`.trim() : undefined}
                />

                <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', width: '100%', padding: 0, flexWrap: 'wrap' }}>
                    <div className="account-select-wrapper" style={{ flex: 2, position: 'relative', minWidth: '250px' }}>
                        <CustomSelect
                            value={selectedId}
                            onChange={val => { setSelectedId(val); if (val) fetchLedger(val); else setData(null); }}
                            placeholder={t("اختر العميل لمتابعة حسابه...")}
                            options={[
                                { value: '', label: `-- ${t('اختر عميلاً من القائمة')} --` },
                                ...customers.map(c => ({ value: c.id, label: c.name }))
                            ]}
                            style={{
                                width: '100%', height: '42.5px', padding: '0 15px',
                                borderRadius: '12px', border: `1px solid ${C.border}`,
                                background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                fontFamily: CAIRO, fontWeight: 500
                            }}
                        />
                    </div>

                    <div className="date-filter-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('من:')}</span>
                        <div className="date-input-wrapper" style={{ width: '170px' }}>
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t('من:')}</span>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 12px',  direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('إلى:')}</span>
                        <div className="date-input-wrapper" style={{ width: '170px' }}>
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t('إلى:')}</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 12px',  direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                        <button className="update-btn" onClick={() => fetchLedger()} disabled={loading} style={{
                            height: '42px', padding: '0 24px', borderRadius: '12px',
                            background: C.primary, color: '#fff', border: 'none',
                            fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO,
                            boxShadow: '0 4px 12px rgba(37, 106, 244,0.2)', whiteSpace: 'nowrap'
                        }}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            {t('تحديث البيانات')}
                        </button>
                    </div>
                </div>

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', marginBottom: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                        <span style={{ fontSize: '13px' }}>⚠️</span>
                        {error}
                        <button onClick={() => setError('')} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>×</button>
                    </div>
                )}

                {loading ? ( <TableSkeleton /> ) : !data ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <UserCircle size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('بانتظار اختيار العميل')}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textSecondary, fontFamily: CAIRO }}>{t('يرجى اختيار العميل وتحديد الفترة الزمنية لعرض كشف الحساب التفصيلي.')}</p>
                    </div>
                ) : (
                    <>
                        <div data-print-include className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: t('رصيد سابق (منقول)'), value: Math.abs(data.initialBalance), sign: data.initialBalance > 0 ? t('عليه (مدين)') : t('له (دائن)'), color: data.initialBalance > 0 ? '#ef4444' : '#10b981', icon: <History size={20} /> },
                                { label: t('إجمالي المبيعات (عليه)'), value: data.statement.reduce((s: number, l: StatementRow) => s + l.debit, 0), sign: t('فواتير مبيعات'), color: '#ef4444', icon: <TrendingDown size={20} /> },
                                { label: t('إجمالي المدفوعات (له)'), value: data.statement.reduce((s: number, l: StatementRow) => s + l.credit, 0), sign: t('سندات قبض'), color: '#10b981', icon: <TrendingUp size={20} /> },
                                { label: t('الرصيد النهائي (الآن)'), value: Math.abs(data.finalBalance), sign: data.finalBalance > 0 ? t('عليه (مدين)') : t('له (دائن)'), color: data.finalBalance > 0 ? '#ef4444' : '#10b981', icon: <FileText size={20} /> },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s'
                                }}>
                                    <div style={{ textAlign: 'center'}}>
                                        <p style={{ fontSize: '11px', fontWeight: 600, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{formatNumber(s.value)}</span>
                                            <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 500, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                        </div>
                                        <div style={{ fontSize: '9px', fontWeight: 600, color: s.color, fontFamily: CAIRO, marginTop: '2px' }}>{s.sign}</div>
                                    </div>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <div className="scroll-table" style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                            {[t('التاريخ'), t('طبيعة الحركة'), t('المـرجع'), t('البيان والتفاصيل'), t('عليه (+)'), t('لـه (-)'), t('الرصيد')].map((h, i) => (
                                                <th key={i} style={{
                                                    padding: '16px 20px',  fontSize: '12px', color: C.textSecondary,
                                                    
                                                    fontWeight: 600, fontFamily: CAIRO
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.initialBalance !== 0 && (
                                            <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                                                <td style={{ padding: '14px 20px',   color: C.textSecondary, fontSize: '13px', fontFamily: OUTFIT }}>
                                                    {dateFrom || (data.customer?.createdAt ? new Date(data.customer.createdAt).toLocaleDateString('en-GB') : '—')}
                                                </td>
                                                <td style={{ padding: '14px 20px',  }}>
                                                    <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: C.textSecondary, fontSize: '11px', fontWeight: 600, fontFamily: CAIRO }}>{t('رصيد افتتاحي')}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center',  color: C.textSecondary }}>—</td>
                                                <td style={{ padding: '14px 20px',  fontSize: '13px', color: C.textSecondary, fontWeight: 600, fontFamily: CAIRO, }}>{t('رصيد ما قبل فترة التقرير')}</td>
                                                <td style={{ padding: '14px 20px',   color: data.initialBalance > 0 ? '#10b981' : C.textMuted, fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT }}>{data.initialBalance > 0 ? <>{formatNumber(Math.abs(data.initialBalance))} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span></> : '—'}</td>
                                                <td style={{ padding: '14px 20px',   color: data.initialBalance < 0 ? '#ef4444' : C.textMuted, fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT }}>{data.initialBalance < 0 ? <>{formatNumber(Math.abs(data.initialBalance))} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span></> : '—'}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center',  fontWeight: 600, color: data.initialBalance >= 0 ? '#10b981' : '#ef4444', fontSize: '13px', fontFamily: OUTFIT }}>{formatNumber(Math.abs(data.initialBalance))} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span></td>
                                            </tr>
                                        )}
                                        {data.statement.map((row: StatementRow, i: number) => (
                                            <tr key={row.id + i}
                                                style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                <td style={{ padding: '14px 20px',   color: C.textSecondary, fontSize: '13px', fontFamily: OUTFIT }}>
                                                    {new Date(row.date).toLocaleDateString('en-GB')}
                                                </td>
                                                <td style={{ padding: '14px 20px',  }}>
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 600, fontFamily: CAIRO,
                                                        background: row.type.includes('مبيعات') ? 'rgba(16,185,129,0.1)' : row.type.includes('قبض') ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                                                        color: row.type.includes('مبيعات') ? '#10b981' : row.type.includes('قبض') ? '#ef4444' : C.textMuted
                                                    }}>
                                                        {t(row.type)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 20px',  }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{row.ref || '—'}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', color: C.textSecondary, fontWeight: 600, fontFamily: CAIRO, }}>{row.description}</td>
                                                <td style={{ padding: '14px 20px',   color: row.debit > 0 ? '#10b981' : C.textMuted, fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT }}>{row.debit > 0 ? <>{formatNumber(row.debit)} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span></> : '—'}</td>
                                                <td style={{ padding: '14px 20px',   color: row.credit > 0 ? '#ef4444' : C.textMuted, fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT }}>{row.credit > 0 ? <>{formatNumber(row.credit)} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span></> : '—'}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center',  fontWeight: 600, color: row.balance >= 0 ? '#10b981' : '#ef4444', fontSize: '13px', fontFamily: OUTFIT }}>{formatNumber(Math.abs(row.balance))} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
                                        <tr>
                                            <td colSpan={4} style={{ padding: '20px 24px',  fontSize: '13px', color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO }}>{t('إجمالي كامل الحساب')}</td>
                                            <td style={{ padding: '20px 20px',  color: '#10b981', fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT }}>
                                                {formatNumber(data.statement.reduce((s: number, l: StatementRow) => s + l.debit, 0) + (data.initialBalance > 0 ? data.initialBalance : 0))} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span>
                                            </td>
                                            <td style={{ padding: '20px 20px',  color: '#ef4444', fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT }}>
                                                {formatNumber(data.statement.reduce((s: number, l: StatementRow) => s + l.credit, 0) + (data.initialBalance < 0 ? Math.abs(data.initialBalance) : 0))} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span>
                                            </td>
                                            <td style={{ padding: '20px 24px',  color: data.finalBalance >= 0 ? '#10b981' : '#ef4444', fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, background: 'rgba(255,255,255,0.02)' }}>
                                                {formatNumber(Math.abs(data.finalBalance))} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
            
        </DashboardLayout>
    );
}
