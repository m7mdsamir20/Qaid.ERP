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
import { ScrollText, Calendar, Loader2, Users, Search, TrendingUp, TrendingDown, History, Printer, FileText, ArrowRightLeft, FileDown, Activity, UserCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { applyExcelMoneyFormat } from '@/lib/excelFormat';

import { formatNumber } from '@/lib/currency';

const t = (s: string) => s;
const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': t('ج.م'), 'SAR': t('ر.س'), 'AED': t('د.إ'), 'USD': '$', 'KWD': t('د.ك'), 'QAR': t('ر.ق'), 'BHD': t('د.ب'), 'OMR': t('ر.ع'), 'JOD': t('د.أ') };
    return map[code] || code;
};

interface Supplier { id: string; name: string; balance: number; createdAt: string; }

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

interface SupplierStatementData {
    supplier: Supplier;
    initialBalance: number;
    finalBalance: number;
    statement: StatementRow[];
}

export default function SupplierStatementPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedId, setSelectedId] = useState(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('supplierId') || '';
        }
        return '';
    });
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SupplierStatementData | null>(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [error, setError] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    const fetchStatement = useCallback(async (supplierId: string = selectedId, currentBranchId = branchId) => {
        if (!supplierId) { setData(null); return; }
        setLoading(true);
        try {
            let url = `/api/reports/supplier-statement?supplierId=${supplierId}`;
            const q = new URLSearchParams();
            if (dateFrom) q.append('from', dateFrom);
            if (dateTo) q.append('to', dateTo);
            if (currentBranchId && currentBranchId !== 'all') q.append('branchId', currentBranchId);
            if (q.toString()) url += `&${q.toString()}`;
            const res = await fetch(url);
            if (!res.ok) { const e = await res.json(); setError(e.error || t('فشل جلب كشف الحساب')); }
            else { const d = await res.json(); setData(d); setError(''); }
        } catch { setError(t('خطأ في الاتصال بالخادم')); } finally { setLoading(false); }
    }, [selectedId, dateFrom, dateTo, branchId]);

    // 1. Initial Load: Fetch All Suppliers
    useEffect(() => {
        fetch('/api/reports/supplier-statement')
            .then(res => res.json())
            .then(d => { if (Array.isArray(d.suppliers)) setSuppliers(d.suppliers); })
            .catch(() => { });
    }, []);

    // 2. Auto-fetch on selection/dates/branch changes
    useEffect(() => {
        if (selectedId) {
            fetchStatement(selectedId, branchId);
        }
    }, [selectedId, dateFrom, dateTo, branchId, fetchStatement]);

    const sym = t(getCurrencyName(currency));
    const handlePrint = () => window.print();

    const exportToExcel = () => {
        if (!data || !data.statement.length) return;
        const excelData = data.statement.map((row: StatementRow) => ({
            [t('التاريخ')]: new Date(row.date).toLocaleDateString('en-ZA'),
            [t('طبيعة الحركة')]: row.type,
            [t('المرجع')]: row.ref || '—',
            [t('البيان')]: row.description,
            [t('مدين (المسدد)')]: row.debit,
            [t('دائن (المستحق)')]: row.credit,
            [t('الرصيد')]: row.balance
        }));

        if (data.initialBalance !== 0) {
            excelData.unshift({
                [t('التاريخ')]: data.supplier?.createdAt ? new Date(data.supplier.createdAt).toLocaleDateString('en-ZA') : '—',
                [t('طبيعة الحركة')]: t('رصيد افتتاحي'),
                [t('المرجع')]: '—',
                [t('البيان')]: t('رصيد ما قبل فترة التقرير'),
                [t('مدين (المسدد)')]: data.initialBalance < 0 ? Math.abs(data.initialBalance) : 0,
                [t('دائن (المستحق)')]: data.initialBalance > 0 ? data.initialBalance : 0,
                [t('الرصيد')]: data.initialBalance
            });
        }

        const ws = XLSX.utils.json_to_sheet(excelData);
        applyExcelMoneyFormat(ws, currency, lang);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('كشف الحساب'));
        XLSX.writeFile(wb, `${t('كشف_حساب_مورد')}_${data.supplier.name}_${new Date().toLocaleDateString('en-ZA')}.xlsx`);
    };

    const tableData: StatementTableItem[] = [];
    if (data) {
        if (data.initialBalance !== 0) {
            tableData.push({
                isInitialBalance: true,
                id: 'initial-balance',
                date: dateFrom || (data.supplier?.createdAt || ''),
                type: t('رصيد افتتاحي'),
                ref: '—',
                description: t('رصيد ما قبل فترة التقرير'),
                debit: data.initialBalance < 0 ? Math.abs(data.initialBalance) : 0,
                credit: data.initialBalance > 0 ? data.initialBalance : 0,
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
                        background: row.type.includes(t("مشتريات")) ? 'rgba(239,68,68,0.1)' : row.type.includes(t("صرف")) ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                        color: row.type.includes(t("مشتريات")) ? '#ef4444' : row.type.includes(t("صرف")) ? '#10b981' : C.textMuted
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
            header: t('مسدد (مدين)'),
            type: 'number',
            cell: (row: StatementTableItem) => {
                const val = row.isInitialBalance ? (row.balance < 0 ? Math.abs(row.balance) : 0) : row.debit;
                return val > 0 ? <>{formatNumber(val)} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{sym}</span></> : '—';
            },
            style: { fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('مستحق (دائن)'),
            type: 'number',
            cell: (row: StatementTableItem) => {
                const val = row.isInitialBalance ? (row.balance > 0 ? row.balance : 0) : row.credit;
                return val > 0 ? <>{formatNumber(val)} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{sym}</span></> : '—';
            },
            style: { fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الرصيد'),
            type: 'number',
            cell: (row: StatementTableItem) => {
                const val = Math.abs(row.balance);
                const color = row.balance >= 0 ? '#ef4444' : '#10b981';
                return <span style={{ color, fontWeight: 600 }}>{formatNumber(val)} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{sym}</span></span>;
            },
            style: { fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' } as React.CSSProperties
        }
    ];

    const footerElement = data && (
        <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
            <td colSpan={4} style={{ padding: '20px 24px', fontSize: '13px', color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO }}>{t('إجمالي كامل الحساب')}</td>
            <td style={{ padding: '20px 20px', color: '#10b981', fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, textAlign: 'center' }}>
                {formatNumber(data.statement.reduce((s: number, l: StatementRow) => s + l.debit, 0) + (data.initialBalance < 0 ? Math.abs(data.initialBalance) : 0))} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{sym}</span>
            </td>
            <td style={{ padding: '20px 20px', color: '#ef4444', fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, textAlign: 'center' }}>
                {formatNumber((data.statement.reduce((s: number, l: StatementRow) => s + l.credit, 0) + (data.initialBalance > 0 ? data.initialBalance : 0)))} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{sym}</span>
            </td>
            <td style={{ padding: '20px 24px', color: data.finalBalance >= 0 ? '#ef4444' : '#10b981', fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                {formatNumber(Math.abs(data.finalBalance))} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{sym}</span>
            </td>
        </tr>
    );

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("كشف حساب مورد تفصيلي")}
                    subtitle={t("استخراج بيان بكافة مشتريات، مدفوعات، ومرتجعات مورد محدد خلال فترة زمنية مختارة.")}
                    backTab="partners"
                    onExportExcel={exportToExcel}
                    printTitle={t("كشف حساب مورد تفصيلي")}
                    accountName={data ? data.supplier.name : undefined}
                    printLabel={t('المورد:')}
                    branchName={selectedBranchName}
                    printDate={dateFrom || dateTo ? `${dateFrom ? `${t('من')} ${dateFrom}` : ''} ${dateTo ? `${t('إلى')} ${dateTo}` : ''}`.trim() : undefined}
                />

                <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                    {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                        <div style={{ minWidth: '180px' }}>
                            <CustomSelect
                                value={branchId}
                                onChange={v => { setBranchId(v); if (selectedId) fetchStatement(selectedId, v); }}
                                placeholder={t("كل الفروع")}
                                hideSearch={true}
                                options={[
                                    { value: 'all', label: t('كل الفروع') },
                                    ...branches.map((b) => ({ value: b.id, label: b.name }))
                                ]}
                            />
                        </div>
                    )}

                    <div className="account-select-wrapper" style={{ flex: 1, position: 'relative', minWidth: '250px' }}>
                        <CustomSelect
                            value={selectedId}
                            onChange={val => { setSelectedId(val); if (val) fetchStatement(val, branchId); else setData(null); }}
                            placeholder={t("اختر المورد لمتابعة حسابه...")}
                            options={[
                                { value: '', label: `-- ${t('اختر مورداً من القائمة')} --` },
                                ...suppliers.map(s => ({ value: s.id, label: s.name }))
                            ]}
                            style={{
                                width: '100%', height: '42px', padding: '0 15px',
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

                {loading && !suppliers.length ? (
                    <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري تحميل البيانات...')}</span>
                    </div>
                ) : !data ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <UserCircle size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('بانتظار اختيار المورد')}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textSecondary, fontFamily: CAIRO }}>{t('يرجى اختيار المورد وتحديد الفترة الزمنية لعرض كشف الحساب التفصيلي.')}</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Stats Cards */}
                        <div data-print-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            <StatCard
                                label={t('رصيد سابق (منقول)')}
                                value={Math.abs(data.initialBalance)}
                                suffix={`${getCurrencyName(currency)} (${data.initialBalance >= 0 ? t('له') : t('عليه')})`}
                                icon={<History size={18} />}
                                color={data.initialBalance >= 0 ? '#ef4444' : '#10b981'}
                                formatValue={true}
                            />
                            <StatCard
                                label={t('إجمالي التوريدات (له)')}
                                value={data.statement.reduce((s: number, l: StatementRow) => s + l.credit, 0)}
                                suffix={getCurrencyName(currency)}
                                icon={<TrendingDown size={18} />}
                                color="#ef4444"
                                formatValue={true}
                            />
                            <StatCard
                                label={t('إجمالي المدفوعات (عليه)')}
                                value={data.statement.reduce((s: number, l: StatementRow) => s + l.debit, 0)}
                                suffix={getCurrencyName(currency)}
                                icon={<TrendingUp size={18} />}
                                color="#10b981"
                                formatValue={true}
                            />
                            <StatCard
                                label={t('الرصيد النهائي (الآن)')}
                                value={Math.abs(data.finalBalance)}
                                suffix={`${getCurrencyName(currency)} (${data.finalBalance >= 0 ? t('له') : t('عليه')})`}
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
