'use client';
import TableSkeleton from '@/components/TableSkeleton';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { Currency } from '@/components/Currency';
import { formatNumber } from '@/lib/currency';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import ReportHeader from '@/components/ReportHeader';
import StatCard from '@/components/StatCard';
import { Search, Wallet, Loader2, FileText, History, TrendingUp, TrendingDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { applyExcelMoneyFormat } from '@/lib/excelFormat';

import { useCurrency } from '@/hooks/useCurrency';

const t = (s: string) => s;
const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': t('ج.م'), 'SAR': t('ر.س'), 'AED': t('د.إ'), 'USD': '$', 'KWD': t('د.ك'), 'QAR': t('ر.ق'), 'BHD': t('د.ب'), 'OMR': t('ر.ع'), 'JOD': t('د.أ') };
    return map[code] || code;
};

const SC = '#10b981';
const DC = '#ef4444';

type StatementMovementType = 'receipt' | 'payment' | string;

interface TreasuryOption {
    id: string;
    name: string;
    type: string;
}

interface StatementMovement {
    id: string;
    date: string;
    party: string;
    description: string;
    amount: number;
    type: StatementMovementType;
}

interface StatementData {
    openingBalance: number;
    currentBalance: number;
    treasuryName?: string;
    movements: StatementMovement[];
}

interface MovementWithBalance extends StatementMovement {
    balanceBefore: number;
    balanceAfter: number;
}

interface CashStatementTableItem {
    isOpeningBalance?: boolean;
    id: string;
    date: string;
    party: string;
    description: string;
    amount: number;
    type: string;
    balanceBefore: number;
    balanceAfter: number;
}

export default function CashStatementPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';
    const { fMoneyJSX } = useCurrency();

    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [treasuries, setTreasuries] = useState<TreasuryOption[]>([]);
    const [data, setData] = useState<StatementData | null>(null);
    const [loading, setLoading] = useState(false);
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        const fetchTreasuries = async () => {
            try {
                let url = '/api/treasuries';
                if (branchId && branchId !== 'all') {
                    url += `?branchId=${branchId}`;
                }
                const res = await fetch(url);
                if (res.ok) {
                    const all = await res.json();
                    setTreasuries(Array.isArray(all) ? all.filter((treasury: TreasuryOption) => treasury.type === 'cash') : []);
                }
            } catch { }
        };
        fetchTreasuries();
        setSelectedId('');
        setData(null);
    }, [branchId]);

    const fetchReport = useCallback(async (id: string = selectedId) => {
        if (!id) { setData(null); return; }
        setLoading(true);
        try {
            const params = new URLSearchParams({ treasuryId: id });
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            const res = await fetch(`/api/reports/treasury-bank-report?${params.toString()}`);
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch { 
        } finally { 
            setLoading(false); 
        }
    }, [selectedId, from, to]);

    // Auto-fetch on parameters change
    useEffect(() => {
        if (selectedId) {
            fetchReport(selectedId);
        }
    }, [selectedId, from, to, fetchReport]);

    const movements: MovementWithBalance[] = (data && Array.isArray(data.movements)) ? (() => {
        let running = data.openingBalance || 0;
        return data.movements.map((m) => {
            const before = running;
            if (m.type === 'receipt') running += (m.amount || 0);
            else running -= (m.amount || 0);
            return { ...m, balanceBefore: before, balanceAfter: running };
        });
    })() : [];

    const totalReceipts = data?.movements.reduce((sum, m) => (m.type === 'receipt' ? sum + m.amount : sum), 0) || 0;
    const totalPayments = data?.movements.reduce((sum, m) => (m.type === 'payment' ? sum + m.amount : sum), 0) || 0;
    const sym = t(getCurrencyName(currency));

    const exportToExcel = () => {
        if (!data || !movements.length) return;
        const excelData = [
            {
                [t('التاريخ')]: '—',
                [t('البيان / الجهة')]: t('رصيد افتتاحي (قبل الفترة)'),
                [t('الرصيد قبل')]: '—',
                [t('وارد (+)')]: '—',
                [t('صادر (-)')]: '—',
                [t('الرصيد بعد')]: data.openingBalance
            },
            ...movements.map((m) => ({
                [t('التاريخ')]: new Date(m.date).toLocaleDateString('en-ZA'),
                [t('البيان / الجهة')]: `${m.party} - ${m.description}`,
                [t('الرصيد قبل')]: m.balanceBefore,
                [t('وارد (+)')]: m.type === 'receipt' ? m.amount : 0,
                [t('صادر (-)')]: m.type === 'payment' ? m.amount : 0,
                [t('الرصيد بعد')]: m.balanceAfter
            }))
        ];
        const ws = XLSX.utils.json_to_sheet(excelData);
        applyExcelMoneyFormat(ws, currency, lang);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('كشف حركة الخزينة'));
        XLSX.writeFile(
            wb,
            `${t('كشف_حركة_الخزينة')}_${data.treasuryName || 'cash'}_${new Date().toLocaleDateString('en-ZA')}.xlsx`
        );
    };

    const tableData: CashStatementTableItem[] = [];
    if (data) {
        tableData.push({
            isOpeningBalance: true,
            id: 'opening-balance',
            date: '',
            party: t('رصيد افتتاحي (قبل الفترة المحددة)'),
            description: '',
            amount: 0,
            type: '',
            balanceBefore: 0,
            balanceAfter: data.openingBalance
        });
        tableData.push(...movements);
    }

    const columns: TableColumn[] = [
        {
            header: t('التاريخ'),
            cell: (row: CashStatementTableItem) => {
                if (row.isOpeningBalance) return '';
                return new Date(row.date).toLocaleDateString('en-ZA');
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('البيان والتفاصيل'),
            cell: (row: CashStatementTableItem) => {
                if (row.isOpeningBalance) {
                    return <span style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{row.party}</span>;
                }
                return (
                    <>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{row.party}</div>
                        <div style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO, marginTop: '2px' }}>{row.description}</div>
                    </>
                );
            },
            style: { minWidth: '150px' }
        },
        {
            header: t('الرصيد قبل'),
            cell: (row: CashStatementTableItem) => {
                if (row.isOpeningBalance) return '—';
                return <Currency amount={row.balanceBefore} />;
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('وارد (+)'),
            type: 'number' as const,
            cell: (row: CashStatementTableItem) => {
                if (row.isOpeningBalance) return '—';
                return row.type === 'receipt' ? <Currency amount={row.amount} /> : '—';
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: SC, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('صادر (-)'),
            type: 'number' as const,
            cell: (row: CashStatementTableItem) => {
                if (row.isOpeningBalance) return '—';
                return row.type === 'payment' ? <Currency amount={row.amount} /> : '—';
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: DC, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الرصيد بعد'),
            type: 'number' as const,
            cell: (row: CashStatementTableItem) => {
                const color = row.balanceAfter >= 0 ? SC : DC;
                return <Currency amount={row.balanceAfter} style={{ color }} />;
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.01)' } as React.CSSProperties
        }
    ];

    const footerElement = data && (
        <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
            <td colSpan={3} style={{ padding: '20px 24px', fontSize: '13px', color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO }}>{t('إجمالي حركة التداول والتحويلات')}</td>
            <td style={{ padding: '20px 20px', color: SC, fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, textAlign: 'center' }}>+<Currency amount={totalReceipts} /></td>
            <td style={{ padding: '20px 20px', color: DC, fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, textAlign: 'center' }}>-<Currency amount={totalPayments} /></td>
            <td style={{ padding: '20px 24px', color: C.textPrimary, fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}><Currency amount={data.currentBalance} /></td>
        </tr>
    );

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("كشف حركة الخزينة")}
                    subtitle={t("بيان تفصيلي بجميع المقبوضات والمدفوعات النقدية مع رصيد تراكمي لحظي.")}
                    backTab="treasury-bank"
                    onExportExcel={exportToExcel}
                    printTitle={t("كشف حركة الخزينة")}
                    accountName={data?.treasuryName}
                    printLabel={t('الخزينة:')}
                    branchName={selectedBranchName}
                    printDate={from || to ? `${from ? `${t('من')} ${from}` : ''} ${to ? `${t('إلى')} ${to}` : ''}`.trim() : undefined}
                />

                <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', width: '100%', padding: 0, flexWrap: 'wrap' }}>
                    {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                        <div style={{ minWidth: '180px' }}>
                            <CustomSelect
                                value={branchId}
                                onChange={v => setBranchId(v)}
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
                            onChange={val => { setSelectedId(val); if (val) fetchReport(val); else setData(null); }}
                            placeholder={t("اختر الخزينة لمتابعة حركتها...")}
                            options={[
                                { value: '', label: `-- ${t('اختر الخزينة من القائمة')} --` },
                                ...treasuries.map(t => ({ value: t.id, label: t.name }))
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
                        <div className="date-input-wrapper" style={{ width: '160px' }}>
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t('من:')}</span>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                                style={{ 
                                    ...IS, width: '100%', height: '42px', padding: '0 12px',  direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('إلى:')}</span>
                        <div className="date-input-wrapper" style={{ width: '160px' }}>
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t('إلى:')}</span>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)}
                                style={{ 
                                    ...IS, width: '100%', height: '42px', padding: '0 12px',  direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                    </div>
                </div>

                {loading ? ( <TableSkeleton /> ) : !data ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <Wallet size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('بانتظار اختيار الخزينة')}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textSecondary, fontFamily: CAIRO }}>{t('يرجى اختيار الخزينة وتحديد الفترة الزمنية لعرض كشف الحركة التفصيلي.')}</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Stats Cards */}
                        <div data-print-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            <StatCard
                                label={t('رصيد أول المدة')}
                                value={data.openingBalance}
                                suffix={sym}
                                icon={<History size={18} />}
                                color="#256af4"
                                formatValue={true}
                            />
                            <StatCard
                                label={t('إجمالي المقبوضات')}
                                value={totalReceipts}
                                suffix={sym}
                                icon={<TrendingUp size={18} />}
                                color={SC}
                                formatValue={true}
                            />
                            <StatCard
                                label={t('إجمالي المدفوعات')}
                                value={totalPayments}
                                suffix={sym}
                                icon={<TrendingDown size={18} />}
                                color={DC}
                                formatValue={true}
                            />
                            <StatCard
                                label={t('الرصيد النهائي الآن')}
                                value={data.currentBalance}
                                suffix={sym}
                                icon={<FileText size={18} />}
                                color={data.currentBalance >= 0 ? SC : DC}
                                formatValue={true}
                            />
                        </div>

                        <div className="print-table-container">
                            <DataTable
                                columns={columns}
                                data={tableData}
                                emptyIcon={Wallet}
                                emptyMessage={t('لا توجد حركات نقدية مسجلة للفترة المحددة')}
                                footer={footerElement}
                            />
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
