'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, IS, INTER } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import ReportHeader from '@/components/ReportHeader';
import { ScrollText, Calendar, Loader2, Users, Search, TrendingUp, TrendingDown, History, Printer, FileText, ArrowRightLeft, FileDown, Activity, UserCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

import { useCurrency } from '@/hooks/useCurrency';
import { formatMoney } from '@/lib/currency';
import { generateReportHTML } from '@/lib/printInvoices';

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

    const handlePrint = () => {
        if (!data) return;
        const fmt = (v: number) => formatMoney(v, currency, lang);
        const company = session?.user ?? {};

        const content = `
            <table>
                <thead>
                    <tr>
                        <th>${t('التاريخ')}</th>
                        <th>${t('طبيعة الحركة')}</th>
                        <th>${t('المرجع')}</th>
                        <th>${t('البيان')}</th>
                        <th>${t('مدين (عليه)')}</th>
                        <th>${t('دائن (له)')}</th>
                        <th>${t('الرصيد')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.initialBalance !== 0 ? `
                        <tr style="background:#fcfcfc; font-style:italic">
                            <td>${new Date(data.customer.createdAt).toLocaleDateString('en-GB')}</td>
                            <td>${t('رصيد افتتاحي')}</td>
                            <td>—</td>
                            <td>${t('رصيد ما قبل فترة التقرير')}</td>
                            <td>${data.initialBalance > 0 ? fmt(data.initialBalance) : '—'}</td>
                            <td>${data.initialBalance < 0 ? fmt(Math.abs(data.initialBalance)) : '—'}</td>
                            <td>${fmt(data.initialBalance)}</td>
                        </tr>
                    ` : ''}
                    ${data.statement.map(row => `
                        <tr>
                            <td>${new Date(row.date).toLocaleDateString('en-GB')}</td>
                            <td>${row.type}</td>
                            <td>${row.ref || '—'}</td>
                            <td>${row.description}</td>
                            <td style="color:#166534">${row.debit > 0 ? fmt(row.debit) : '—'}</td>
                            <td style="color:#991b1b">${row.credit > 0 ? fmt(row.credit) : '—'}</td>
                            <td style="font-weight:900">${fmt(row.balance)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        const html = generateReportHTML(t("كشف حساب عميل تفصيلي"), content, company, {
            lang,
            dateFrom: dateFrom || '',
            dateTo: dateTo || t('الآن'),
            generatedBy: session?.user?.name || '',
            metadata: [
                { label: t('العميل'), value: data.customer.name },
                { label: t('كود العميل'), value: data.customer.id.split('-')[0].toUpperCase() },
                { label: t('الرصيد الافتتاحي'), value: fmt(data.initialBalance) },
                { label: t('الرصيد النهائي'), value: fmt(data.finalBalance) },
            ],
            summary: [
                { label: t('إجمالي مسحوبات مدين'), value: fMoney(data.statement.reduce((s, r) => s + r.debit, 0)) },
                { label: t('إجمالي مدفوعات دائن'), value: fMoney(data.statement.reduce((s, r) => s + r.credit, 0)) },
                { label: t('الرصيد الحالي المستحق'), value: fMoney(data.finalBalance), isTotal: true },
            ]
        });

        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
    };

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
                    onPrint={handlePrint}
                    onExportExcel={exportToExcel}
                    printTitle={t("كشف حساب عميل تفصيلي")}
                    printDate={data ? data.customer.name : undefined}
                />

                <div className="no-print" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', width: '100%', padding: 0 }}>
                    <div style={{ flex: 2, position: 'relative' }}>
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

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('من:')}</span>
                        <div style={{ width: '170px' }}>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 12px', textAlign: 'start', direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: INTER
                                }}
                            />
                        </div>
                        <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('إلى:')}</span>
                        <div style={{ width: '170px' }}>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 12px', textAlign: 'start', direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: INTER
                                }}
                            />
                        </div>
                        <button onClick={() => fetchLedger()} disabled={loading} style={{
                            height: '42px', padding: '0 24px', borderRadius: '12px',
                            background: C.primary, color: '#fff', border: 'none',
                            fontSize: '13.5px', fontWeight: 800, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO,
                            boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                        }}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            {t('تحديث البيانات')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري استخراج السجلات...')}</span>
                    </div>
                ) : !data ? (
                    <div style={{ padding: '120px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <UserCircle size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('بانتظار اختيار العميل')}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, fontFamily: CAIRO }}>{t('يرجى اختيار العميل وتحديد الفترة الزمنية لعرض كشف الحساب التفصيلي.')}</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '220px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '10px', background: '#ecfdf5', color: '#10b981', borderRadius: '12px' }}><TrendingUp size={22} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textMuted, fontFamily: CAIRO }}>{t('الرصيد الافتتاحي')}</p>
                                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{fMoney(data.initialBalance)}</p>
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: '220px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '10px', background: '#eef2ff', color: C.primary, borderRadius: '12px' }}><ArrowRightLeft size={22} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textMuted, fontFamily: CAIRO }}>{t('الرصيد النهائي')}</p>
                                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: C.primary, fontFamily: INTER }}>{fMoney(data.finalBalance)}</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                            {[t('التاريخ'), t('طبيعة الحركة'), t('المـرجع'), t('البيان والتفاصيل'), t('عليه (+)'), t('لـه (-)'), t('الرصيد')].map((h, i) => (
                                                <th key={i} style={{
                                                    padding: '16px 20px', fontSize: '12px', color: C.textSecondary,
                                                    textAlign: i === 3 ? 'start' : i >= 4 ? 'end' : 'center',
                                                    fontWeight: 800, fontFamily: CAIRO
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.initialBalance !== 0 && (
                                            <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', color: C.textMuted, fontSize: '11.5px', fontFamily: INTER }}>
                                                    {dateFrom || (data.customer?.createdAt ? new Date(data.customer.createdAt).toLocaleDateString('en-GB') : '—')}
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: C.textSecondary, fontSize: '11px', fontWeight: 900, fontFamily: CAIRO }}>{t('رصيد افتتاحي')}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', color: C.textMuted }}>—</td>
                                                <td style={{ padding: '14px 20px', fontSize: '12px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO, textAlign: 'start' }}>{t('رصيد ما قبل فترة التقرير')}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'end', color: data.initialBalance > 0 ? '#10b981' : C.textMuted, fontWeight: 900, fontSize: '14px', fontFamily: INTER }}>{data.initialBalance > 0 ? fMoney(data.initialBalance) : '—'}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'end', color: data.initialBalance < 0 ? '#ef4444' : C.textMuted, fontWeight: 900, fontSize: '14px', fontFamily: INTER }}>{data.initialBalance < 0 ? fMoney(Math.abs(data.initialBalance)) : '—'}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'end', fontWeight: 1000, color: data.initialBalance >= 0 ? '#10b981' : '#ef4444', fontSize: '14px', fontFamily: INTER }}>{fMoney(data.initialBalance)}</td>
                                            </tr>
                                        )}
                                        {data.statement.map((row: StatementRow, i: number) => (
                                            <tr key={row.id + i}
                                                style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', color: C.textMuted, fontSize: '11.5px', fontFamily: INTER }}>
                                                    {new Date(row.date).toLocaleDateString('en-GB')}
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 900, fontFamily: CAIRO,
                                                        background: row.type.includes('مبيعات') ? 'rgba(16,185,129,0.1)' : row.type.includes('قبض') ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                                                        color: row.type.includes('مبيعات') ? '#10b981' : row.type.includes('قبض') ? '#ef4444' : C.textMuted
                                                    }}>
                                                        {t(row.type)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>{row.ref || '—'}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px', fontSize: '12px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, textAlign: 'start' }}>{row.description}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'end', color: row.debit > 0 ? '#10b981' : C.textMuted, fontWeight: 900, fontSize: '14px', fontFamily: INTER }}>{row.debit > 0 ? fMoney(row.debit) : '—'}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'end', color: row.credit > 0 ? '#ef4444' : C.textMuted, fontWeight: 900, fontSize: '14px', fontFamily: INTER }}>{row.credit > 0 ? fMoney(row.credit) : '—'}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'end', fontWeight: 1000, color: row.balance >= 0 ? '#10b981' : '#ef4444', fontSize: '14.5px', fontFamily: INTER }}>{fMoney(row.balance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
                                        <tr>
                                            <td colSpan={4} style={{ padding: '20px 24px', textAlign: 'start', fontSize: '13px', color: C.textPrimary, fontWeight: 900, fontFamily: CAIRO }}>{t('إجمالي كامل الحساب')}</td>
                                            <td style={{ padding: '20px 20px', textAlign: 'end', color: '#10b981', fontSize: '15px', fontWeight: 1000, fontFamily: INTER }}>
                                                {fMoney(data.statement.reduce((s: number, l: StatementRow) => s + l.debit, 0) + (data.initialBalance > 0 ? data.initialBalance : 0))}
                                            </td>
                                            <td style={{ padding: '20px 20px', textAlign: 'end', color: '#ef4444', fontSize: '15px', fontWeight: 1000, fontFamily: INTER }}>
                                                {fMoney(data.statement.reduce((s: number, l: StatementRow) => s + l.credit, 0) + (data.initialBalance < 0 ? Math.abs(data.initialBalance) : 0))}
                                            </td>
                                            <td style={{ padding: '20px 24px', textAlign: 'end', color: data.finalBalance >= 0 ? '#10b981' : '#ef4444', fontSize: '17px', fontWeight: 1000, fontFamily: INTER, background: 'rgba(255,255,255,0.02)' }}>
                                                {fMoney(data.finalBalance)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
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
                input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.5; cursor: pointer; }
            `}</style>
        </DashboardLayout>
    );
}


