'use client';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import TableSkeleton from '@/components/TableSkeleton';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import ReportHeader from '@/components/ReportHeader';
import StatCard from '@/components/StatCard';
import { ScrollText, Calendar, Loader2, Users, Search, TrendingUp, TrendingDown, History, Printer, FileText, UserCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { applyExcelMoneyFormat } from '@/lib/excelFormat';

import { useCurrency } from '@/hooks/useCurrency';
import { formatNumber } from '@/lib/currency';
import { useActivity } from '@/modules/useActivity';

const t = (s: string) => s;
const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': t('ج.م'), 'SAR': t('ر.س'), 'AED': t('د.إ'), 'USD': '$', 'KWD': t('د.ك'), 'QAR': t('ر.ق'), 'BHD': t('د.ب'), 'OMR': t('ر.ع'), 'JOD': t('د.أ') };
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

interface StatementTableItem {
    isInitialBalance?: boolean;
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
    const { isServices } = useActivity();
    const { fMoney, symbol, currency } = useCurrency();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedId, setSelectedId] = useState(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('customerId') || '';
        }
        return '';
    });
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<CustomerStatementData | null>(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [error, setError] = useState('');
    const [company, setCompany] = useState<any>({});

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

    useEffect(() => {
        fetch('/api/company')
            .then(res => res.json())
            .then(d => { if (d && !d.error) setCompany(d); })
            .catch(() => { });
    }, []);

    // 2. Auto-fetch on selection/dates changes
    useEffect(() => {
        if (selectedId) {
            fetchLedger(selectedId);
        }
    }, [selectedId, dateFrom, dateTo, fetchLedger]);

    const exportToExcel = () => {
        if (!data || !data.statement.length) return;
        const debitLabel = isServices ? t('الخدمات (عليه)') : t('مدين (عليه)');
        const creditLabel = t('دائن (له)');
        const excelData = data.statement.map((row: StatementRow) => ({
            [t('التاريخ')]: new Date(row.date).toLocaleDateString('en-ZA'),
            [t('طبيعة الحركة')]: row.type,
            [t('المرجع')]: row.ref || '—',
            [t('البيان')]: row.description,
            [debitLabel]: row.debit,
            [creditLabel]: row.credit,
            [t('الرصيد')]: row.balance,
        }));

        if (data.initialBalance !== 0) {
            excelData.unshift({
                [t('التاريخ')]: data.customer?.createdAt ? new Date(data.customer.createdAt).toLocaleDateString('en-ZA') : '—',
                [t('طبيعة الحركة')]: t('رصيد افتتاحي'),
                [t('المرجع')]: '—',
                [t('البيان')]: t('رصيد ما قبل فترة التقرير'),
                [debitLabel]: data.initialBalance > 0 ? data.initialBalance : 0,
                [creditLabel]: data.initialBalance < 0 ? Math.abs(data.initialBalance) : 0,
                [t('الرصيد')]: data.initialBalance,
            });
        }

        const ws = XLSX.utils.json_to_sheet(excelData);
        applyExcelMoneyFormat(ws, currency, lang);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('كشف الحساب'));
        XLSX.writeFile(wb, `${t('كشف_حساب')}_${data.customer.name}_${new Date().toLocaleDateString('en-ZA')}.xlsx`);
    };

    // ── نسخة الطباعة / PDF: تصميم مخصص لكشف الحساب بدل نسخ جدول الشاشة ──
    const buildStatementHTML = () => {
        if (!data) return '';
        const dir = isRtl ? 'rtl' : 'ltr';
        const start = isRtl ? 'right' : 'left';
        const end = isRtl ? 'left' : 'right';
        const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const money = (n: number) => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-ZA') : '—';
        const amountCell = (n: number) => n > 0.004 ? money(n) : '<span class="muted">—</span>';
        const side = (n: number) => n > 0.004 ? t('عليه') : n < -0.004 ? t('له') : '';
        const balanceCell = (n: number) => `${money(n)}${side(n) ? ` <span class="tag ${n > 0 ? 'dr' : 'cr'}">${side(n)}</span>` : ''}`;

        const sym = getCurrencyName(currency);
        const now = new Date();
        const toWD = (s: string) => s.replace(/[٠-٩]/g, (d: string) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
        const printedAt = `${now.toLocaleDateString('en-ZA')} — ${toWD(now.toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true }))}`;
        const period = dateFrom || dateTo
            ? `${dateFrom ? `${t('من')} ${dateFrom.replace(/-/g, '/')}` : ''} ${dateTo ? `${t('إلى')} ${dateTo.replace(/-/g, '/')}` : ''}`.trim()
            : t('كل الفترات');

        const opening = data.initialBalance;
        const totalDebit = data.statement.reduce((s, l) => s + l.debit, 0);
        const totalCredit = data.statement.reduce((s, l) => s + l.credit, 0);
        const closing = data.finalBalance;

        const cust: any = data.customer;
        const custAddress = [cust.addressStreet, cust.addressDistrict, cust.addressCity, cust.addressRegion].filter(Boolean).join('، ');
        const coName = company.name || company.companyName || '';
        const coAddress = [company.addressStreet, company.addressDistrict, company.addressCity].filter(Boolean).join('، ');
        const coLines = [
            company.taxNumber ? `${t('الرقم الضريبي')}: ${esc(company.taxNumber)}` : '',
            company.commercialRegister ? `${t('السجل التجاري')}: ${esc(company.commercialRegister)}` : '',
        ].filter(Boolean).join(' &nbsp;|&nbsp; ');
        const coContact = [coAddress ? esc(coAddress) : '', company.phone ? `<span dir="ltr">${esc(company.phone)}</span>` : ''].filter(Boolean).join(' &nbsp;|&nbsp; ');

        const infoRow = (label: string, value: string) => value ? `<div class="info-row"><span>${label}</span><b>${value}</b></div>` : '';

        const rows = data.statement.map((r, i) => `<tr>
            <td class="c num">${i + 1}</td>
            <td class="c num">${fmtDate(r.date)}</td>
            <td class="c num ref">${esc(r.ref || '—')}</td>
            <td class="c">${esc(t(r.type))}</td>
            <td class="desc">${esc(r.description)}</td>
            <td class="amt">${amountCell(r.debit)}</td>
            <td class="amt">${amountCell(r.credit)}</td>
            <td class="amt bal">${balanceCell(r.balance)}</td>
        </tr>`).join('');

        const closingText = closing > 0.004
            ? `${t('الرصيد المستحق على العميل')}`
            : closing < -0.004 ? `${t('الرصيد المستحق للعميل')}` : t('الحساب مسدد بالكامل');

        return `<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${dir}">
<head>
<meta charset="UTF-8"/>
<title>${esc(t('كشف حساب عميل'))} - ${esc(cust.name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:A4 portrait;margin:12mm 10mm 14mm;
  @bottom-center{content:"${t('صفحة')} " counter(page) " / " counter(pages);font-family:'Cairo',sans-serif;font-size:8.5px;color:#64748b}}
html,body{background:#fff;color:#0f172a}
body{font-family:'Cairo',sans-serif;direction:${dir};font-size:10px;line-height:1.55}
.page{max-width:190mm;margin:0 auto}
.num{font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}
.muted{color:#94a3b8}

.top{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-bottom:10px;border-bottom:3px solid #0f3d6e}
.co{display:flex;align-items:center;gap:12px;min-width:0}
.co img{max-height:58px;max-width:130px;object-fit:contain}
.co-name{font-size:14px;font-weight:900;color:#0f3d6e;line-height:1.3}
.co-sub{font-size:8.5px;color:#475569;margin-top:2px}
.doc{text-align:${end};flex-shrink:0}
.doc-title{font-size:19px;font-weight:900;color:#0f3d6e;line-height:1.2}
.doc-sub{font-size:9px;color:#64748b;margin-top:3px}

.info{display:grid;grid-template-columns:1.3fr 1fr;gap:10px;margin:12px 0}
.box{border:1px solid #cbd5e1;border-radius:6px;overflow:hidden}
.box-h{background:#f1f5f9;padding:4px 10px;font-size:9px;font-weight:800;color:#0f3d6e;border-bottom:1px solid #cbd5e1}
.box-b{padding:6px 10px}
.info-row{display:flex;gap:6px;padding:1.5px 0;font-size:9.5px}
.info-row span{color:#64748b;min-width:70px}
.info-row b{font-weight:700;color:#0f172a}
.cust-name{font-size:13px;font-weight:900;color:#0f172a;margin-bottom:2px}

.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
.kpi{border:1px solid #cbd5e1;border-radius:6px;padding:7px 10px;text-align:center}
.kpi .l{font-size:8.5px;color:#64748b;font-weight:700}
.kpi .v{font-size:13px;font-weight:900;margin-top:2px}
.kpi .v small{font-size:8.5px;font-weight:700;color:#64748b}
.kpi.main{background:#0f3d6e;border-color:#0f3d6e}
.kpi.main .l,.kpi.main .v,.kpi.main .v small{color:#fff}

table{width:100%;border-collapse:collapse;font-size:9.5px}
thead{display:table-header-group}
tr{break-inside:avoid;page-break-inside:avoid}
th{background:#0f3d6e;color:#fff;font-weight:700;padding:6px 5px;border:1px solid #0f3d6e;font-size:9px;text-align:center;white-space:nowrap}
td{padding:5px 5px;border:1px solid #e2e8f0;vertical-align:middle}
tbody tr:nth-child(even) td{background:#f8fafc}
td.c{text-align:center;white-space:nowrap}
td.ref{font-weight:700}
td.desc{text-align:${start};color:#334155}
td.amt{text-align:center;white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:600}
td.bal{font-weight:800}
tr.opening td{background:#eef2f7!important;font-weight:800;color:#0f172a}
tr.total td{background:#e2e8f0!important;font-weight:900;border-top:2px solid #0f3d6e;font-size:10px}
.tag{display:inline-block;font-size:7.5px;font-weight:800;padding:0 5px;border-radius:3px;margin-${start}:3px;vertical-align:middle;line-height:1.6}
.tag.dr{background:#fee2e2;color:#b91c1c}
.tag.cr{background:#dcfce7;color:#15803d}

.closing{margin-top:12px;display:flex;justify-content:space-between;align-items:center;border:2px solid #0f3d6e;border-radius:6px;padding:8px 14px;break-inside:avoid}
.closing .l{font-size:11px;font-weight:800;color:#0f3d6e}
.closing .v{font-size:15px;font-weight:900}
.closing .v small{font-size:9px;color:#64748b;font-weight:700}

.sign{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:34px;break-inside:avoid}
.sign div{border-top:1px dashed #94a3b8;padding-top:5px;text-align:center;font-size:9px;color:#475569;font-weight:700}
.foot-note{margin-top:14px;font-size:8px;color:#94a3b8;text-align:center}

@media screen{body{padding:12mm 10mm;background:#fff}}
</style>
</head>
<body>
<div class="page">

<div class="top">
  <div class="co">
    ${company.logo ? `<img src="${esc(company.logo)}" alt=""/>` : ''}
    <div>
      <div class="co-name">${esc(coName)}</div>
      ${coLines ? `<div class="co-sub">${coLines}</div>` : ''}
      ${coContact ? `<div class="co-sub">${coContact}</div>` : ''}
    </div>
  </div>
  <div class="doc">
    <div class="doc-title">${t('كشف حساب عميل')}</div>
    <div class="doc-sub">${isRtl ? 'Customer Account Statement' : ''}</div>
  </div>
</div>

<div class="info">
  <div class="box">
    <div class="box-h">${t('بيانات العميل')}</div>
    <div class="box-b">
      <div class="cust-name">${esc(cust.name)}</div>
      ${infoRow(t('الهاتف'), cust.phone ? `<span dir="ltr">${esc(cust.phone)}</span>` : '')}
      ${infoRow(t('الرقم الضريبي'), esc(cust.taxNumber || ''))}
      ${infoRow(t('السجل التجاري'), esc(cust.crNumber || ''))}
      ${infoRow(t('العنوان'), esc(custAddress))}
    </div>
  </div>
  <div class="box">
    <div class="box-h">${t('بيانات الكشف')}</div>
    <div class="box-b">
      ${infoRow(t('الفترة'), esc(period))}
      ${infoRow(t('العملة'), esc(sym))}
      ${infoRow(t('عدد الحركات'), String(data.statement.length))}
      ${infoRow(t('تاريخ الطباعة'), printedAt)}
    </div>
  </div>
</div>

<div class="kpis">
  <div class="kpi"><div class="l">${t('الرصيد الافتتاحي')}</div><div class="v">${money(opening)} <small>${side(opening)}</small></div></div>
  <div class="kpi"><div class="l">${t('إجمالي المدين (عليه)')}</div><div class="v">${money(totalDebit)}</div></div>
  <div class="kpi"><div class="l">${t('إجمالي الدائن (له)')}</div><div class="v">${money(totalCredit)}</div></div>
  <div class="kpi main"><div class="l">${t('الرصيد الختامي')}</div><div class="v">${money(closing)} <small>${side(closing)}</small></div></div>
</div>

<table>
  <thead><tr>
    <th style="width:24px">#</th>
    <th>${t('التاريخ')}</th>
    <th>${t('رقم المستند')}</th>
    <th>${t('نوع الحركة')}</th>
    <th>${t('البيان')}</th>
    <th>${t('مدين (عليه)')}</th>
    <th>${t('دائن (له)')}</th>
    <th>${t('الرصيد')}</th>
  </tr></thead>
  <tbody>
    <tr class="opening">
      <td class="c">—</td>
      <td class="c num">${dateFrom ? dateFrom.replace(/-/g, '/') : '—'}</td>
      <td class="c">—</td>
      <td class="c">${t('رصيد افتتاحي')}</td>
      <td class="desc">${t('رصيد ما قبل فترة التقرير')}</td>
      <td class="amt">${amountCell(opening)}</td>
      <td class="amt">${amountCell(-opening)}</td>
      <td class="amt bal">${balanceCell(opening)}</td>
    </tr>
    ${rows || `<tr><td colspan="8" class="c muted" style="padding:14px">${t('لا توجد حركات في الحساب حالياً')}</td></tr>`}
    <tr class="total">
      <td colspan="5" style="text-align:${start}">${t('إجمالي حركات الفترة')}</td>
      <td class="amt">${money(totalDebit)}</td>
      <td class="amt">${money(totalCredit)}</td>
      <td class="amt bal">${balanceCell(closing)}</td>
    </tr>
  </tbody>
</table>

<div class="closing">
  <span class="l">${closingText}</span>
  <span class="v">${money(closing)} <small>${esc(sym)}</small></span>
</div>

<div class="sign">
  <div>${t('المحاسب')}</div>
  <div>${t('توقيع وختم العميل')}</div>
</div>

<div class="foot-note">${t('يرجى مراجعة الكشف وإبلاغنا بأي ملاحظات')}</div>

</div>
</body>
</html>`;
    };

    const statementFileTitle = () => `${t('كشف حساب')} - ${(data?.customer.name || '').replace(/[\\/:*?"<>|]/g, '-')}`;

    const handlePrint = async () => {
        const html = buildStatementHTML();
        if (!html) return;
        const { printReportDirectly } = await import('@/lib/printDirectly');
        printReportDirectly(html, statementFileTitle());
    };

    const handleDownloadPDF = async () => {
        const html = buildStatementHTML();
        if (!html) return;
        const { downloadReportPDF } = await import('@/lib/printDirectly');
        await downloadReportPDF(html, statementFileTitle(), { silent: true });
    };

    const tableData: StatementTableItem[] = [];
    if (data) {
        if (data.initialBalance !== 0) {
            tableData.push({
                isInitialBalance: true,
                id: 'initial-balance',
                date: dateFrom || (data.customer?.createdAt || ''),
                type: t('رصيد افتتاحي'),
                ref: '—',
                description: t('رصيد ما قبل فترة التقرير'),
                debit: data.initialBalance > 0 ? Math.abs(data.initialBalance) : 0,
                credit: data.initialBalance < 0 ? Math.abs(data.initialBalance) : 0,
                balance: data.initialBalance,
            });
        }
        tableData.push(...data.statement);
    }

    const columns: TableColumn[] = [
        {
            header: t('التاريخ'),
            cell: (row: StatementTableItem) => {
                if (row.isInitialBalance) {
                    return row.date ? new Date(row.date).toLocaleDateString('en-ZA') : '—';
                }
                return new Date(row.date).toLocaleDateString('en-ZA');
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('طبيعة الحركة'),
            cell: (row: StatementTableItem) => {
                if (row.isInitialBalance) {
                    return (
                        <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: C.textSecondary, fontSize: '11px', fontWeight: 600, fontFamily: CAIRO }}>{row.type}</span>
                    );
                }
                return (
                    <span style={{
                        padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 600, fontFamily: CAIRO,
                        background: (row.type.includes(t("مبيعات")) || row.type.includes(t("خدمات"))) ? 'rgba(16,185,129,0.1)' : row.type.includes(t("قبض")) ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                        color: (row.type.includes(t("مبيعات")) || row.type.includes(t("خدمات"))) ? '#10b981' : row.type.includes(t("قبض")) ? '#ef4444' : C.textMuted
                    }}>
                        {t(row.type)}
                    </span>
                );
            }
        },
        {
            header: t('المـرجع'),
            cell: (row: StatementTableItem) => row.ref || '—',
            style: { fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }
        },
        {
            header: t('البيان والتفاصيل'),
            cell: (row: StatementTableItem) => row.description,
            style: { fontSize: '13px', color: C.textSecondary, fontWeight: 600, fontFamily: CAIRO }
        },
        {
            header: t('عليه (+)'),
            type: 'number',
            cell: (row: StatementTableItem) => {
                const val = row.isInitialBalance ? (row.balance > 0 ? Math.abs(row.balance) : 0) : row.debit;
                return val > 0 ? <>{formatNumber(val)} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span></> : '—';
            },
            style: { fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('لـه (-)'),
            type: 'number',
            cell: (row: StatementTableItem) => {
                const val = row.isInitialBalance ? (row.balance < 0 ? Math.abs(row.balance) : 0) : row.credit;
                return val > 0 ? <>{formatNumber(val)} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span></> : '—';
            },
            style: { fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الرصيد'),
            type: 'number',
            cell: (row: StatementTableItem) => {
                const val = Math.abs(row.balance);
                const color = row.balance >= 0 ? '#10b981' : '#ef4444';
                return <span style={{ color, fontWeight: 600 }}>{formatNumber(val)} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span></span>;
            },
            style: { fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' } as React.CSSProperties
        }
    ];

    const footerElement = data && (
        <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
            <td colSpan={4} style={{ padding: '20px 24px', fontSize: '13px', color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO }}>{t('إجمالي كامل الحساب')}</td>
            <td style={{ padding: '20px 20px', color: '#10b981', fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, textAlign: 'center' }}>
                {formatNumber(data.statement.reduce((s: number, l: StatementRow) => s + l.debit, 0) + (data.initialBalance > 0 ? data.initialBalance : 0))} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span>
            </td>
            <td style={{ padding: '20px 20px', color: '#ef4444', fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, textAlign: 'center' }}>
                {formatNumber(data.statement.reduce((s: number, l: StatementRow) => s + l.credit, 0) + (data.initialBalance < 0 ? Math.abs(data.initialBalance) : 0))} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span>
            </td>
            <td style={{ padding: '20px 24px', color: data.finalBalance >= 0 ? '#10b981' : '#ef4444', fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                {formatNumber(Math.abs(data.finalBalance))} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{symbol}</span>
            </td>
        </tr>
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("كشف حساب عميل تفصيلي")}
                    subtitle={isServices ? t("استخراج بيان بكافة الخدمات المقدمة، المدفوعات، ومرتجعات الخدمات لعميل محدد خلال فترة زمنية مختارة.") : t("استخراج بيان بكافة مبيعات، مدفوعات، ومرتجعات عميل محدد خلال فترة زمنية مختارة.")}
                    backTab="partners"
                    onExportExcel={exportToExcel}
                    onPrint={data ? handlePrint : undefined}
                    onExportPdf={data ? handleDownloadPDF : undefined}
                    printTitle={t("كشف حساب عميل تفصيلي")}
                    accountName={data ? data.customer.name : undefined}
                    printLabel={t('العميل:')}
                    printDate={dateFrom || dateTo ? `${dateFrom ? `${t('من')} ${dateFrom}` : ''} ${dateTo ? `${t('إلى')} ${dateTo}` : ''}`.trim() : undefined}
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
                                    ...IS, width: '100%', height: '42px', padding: '0 12px', direction: 'inherit',
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
                                    ...IS, width: '100%', height: '42px', padding: '0 12px', direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
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
                        <div data-print-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            <StatCard
                                label={t('رصيد سابق (منقول)')}
                                value={Math.abs(data.initialBalance)}
                                suffix={`${getCurrencyName(currency)} (${data.initialBalance > 0 ? t('عليه') : t('له')})`}
                                icon={<History size={18} />}
                                color={data.initialBalance > 0 ? '#ef4444' : '#10b981'}
                                formatValue={true}
                            />
                            <StatCard
                                label={isServices ? t('إجمالي الخدمات (عليه)') : t('إجمالي المبيعات (عليه)')}
                                value={data.statement.reduce((s: number, l: StatementRow) => s + l.debit, 0)}
                                suffix={getCurrencyName(currency)}
                                icon={<TrendingDown size={18} />}
                                color="#ef4444"
                                formatValue={true}
                            />
                            <StatCard
                                label={t('إجمالي المدفوعات (له)')}
                                value={data.statement.reduce((s: number, l: StatementRow) => s + l.credit, 0)}
                                suffix={getCurrencyName(currency)}
                                icon={<TrendingUp size={18} />}
                                color="#10b981"
                                formatValue={true}
                            />
                            <StatCard
                                label={t('الرصيد النهائي (الآن)')}
                                value={Math.abs(data.finalBalance)}
                                suffix={`${getCurrencyName(currency)} (${data.finalBalance >= 0 ? t('عليه') : t('له')})`}
                                icon={<FileText size={18} />}
                                color={data.finalBalance >= 0 ? '#ef4444' : '#10b981'}
                                formatValue={true}
                            />
                        </div>

                        <div className="print-table-container">
                            <DataTable
                                columns={columns}
                                data={tableData}
                                emptyIcon={ScrollText}
                                emptyMessage={t('لا توجد حركات في الحساب حالياً')}
                                footer={footerElement}
                            />
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
