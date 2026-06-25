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
import { Search, Landmark, Loader2, FileText, History, TrendingUp, TrendingDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { applyExcelMoneyFormat } from '@/lib/excelFormat';

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

interface BankStatementTableItem {
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

interface SummaryCard {
    label: string;
    value: number;
    color: string;
    icon: React.ReactNode;
    sign: string;
}

export default function BankStatementPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [treasuries, setTreasuries] = useState<TreasuryOption[]>([]);
    const [data, setData] = useState<StatementData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchTreasuries = async () => {
            try {
                const res = await fetch('/api/treasuries');
                if (res.ok) {
                    const all = await res.json();
                    setTreasuries(Array.isArray(all) ? all.filter((treasury: TreasuryOption) => treasury.type === 'bank') : []);
                }
            } catch { }
        };
        fetchTreasuries();
    }, []);

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

    const movements: MovementWithBalance[] = data ? (() => {
        let running = data.openingBalance;
        return data.movements.map((m) => {
            const before = running;
            if (m.type === 'receipt') running += m.amount;
            else running -= m.amount;
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
                [t('البيان / الجهة')]: t('رصيد بنكي منقول (قبل الفترة)'),
                [t('الرصيد قبل')]: '—',
                [t('إيداع (+)')]: '—',
                [t('سحب (-)')]: '—',
                [t('الرصيد بعد')]: data.openingBalance
            },
            ...movements.map((m) => ({
                [t('التاريخ')]: new Date(m.date).toLocaleDateString('en-ZA'),
                [t('البيان / الجهة')]: `${m.party} - ${m.description}`,
                [t('الرصيد قبل')]: m.balanceBefore,
                [t('إيداع (+)')]: m.type === 'receipt' ? m.amount : 0,
                [t('سحب (-)')]: m.type === 'payment' ? m.amount : 0,
                [t('الرصيد بعد')]: m.balanceAfter
            }))
        ];
        const ws = XLSX.utils.json_to_sheet(excelData);
        applyExcelMoneyFormat(ws, currency, lang);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('كشف حساب بنكي'));
        XLSX.writeFile(
            wb,
            `${t('كشف_حساب_بنكي')}_${data.treasuryName || 'bank'}_${new Date().toLocaleDateString('en-ZA')}.xlsx`
        );
    };

    const tableData: BankStatementTableItem[] = [];
    if (data) {
        tableData.push({
            isOpeningBalance: true,
            id: 'opening-balance',
            date: '',
            party: t('رصيد منقول (قبل الفترة المستعرضة)'),
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
            cell: (row: BankStatementTableItem) => {
                if (row.isOpeningBalance) return '';
                return new Date(row.date).toLocaleDateString('en-ZA');
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('بيان العملية / التحويل'),
            cell: (row: BankStatementTableItem) => {
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
            cell: (row: BankStatementTableItem) => {
                if (row.isOpeningBalance) return '—';
                return <Currency amount={row.balanceBefore} />;
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('إيداع (+)'),
            type: 'number' as const,
            cell: (row: BankStatementTableItem) => {
                if (row.isOpeningBalance) return '—';
                return row.type === 'receipt' ? <Currency amount={row.amount} /> : '—';
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: SC, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('سحب (-)'),
            type: 'number' as const,
            cell: (row: BankStatementTableItem) => {
                if (row.isOpeningBalance) return '—';
                return row.type === 'payment' ? <Currency amount={row.amount} /> : '—';
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: DC, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الرصيد بعد'),
            type: 'number' as const,
            cell: (row: BankStatementTableItem) => {
                const color = row.balanceAfter >= 0 ? SC : DC;
                return <Currency amount={row.balanceAfter} style={{ color }} />;
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.01)' } as React.CSSProperties
        }
    ];

    const footerElement = data && (
        <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
            <td colSpan={3} style={{ padding: '20px 24px', fontSize: '13px', color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO }}>{t('تحليل الحركة البنكية الكلية')}</td>
            <td style={{ padding: '20px 20px', color: SC, fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, textAlign: 'center' }}>+<Currency amount={totalReceipts} /></td>
            <td style={{ padding: '20px 20px', color: DC, fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, textAlign: 'center' }}>-<Currency amount={totalPayments} /></td>
            <td style={{ padding: '20px 24px', color: C.textPrimary, fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}><Currency amount={data.currentBalance} /></td>
        </tr>
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("كشف حساب بنكي")}
                    subtitle={t("متابعة دقيقة لكافة العمليات البنكية، السحوبات، الإيداعات، والتحويلات المصرفية.")}
                    backTab="treasury-bank"
                    printTitle={data ? t("كشف حساب بنكي") : undefined}
                    accountName={data?.treasuryName}
                    printLabel={t('البنك:')}
                    printDate={from || to ? `${from ? `${t('من')} ${from}` : ''} ${to ? `${t('إلى')} ${to}` : ''}`.trim() : undefined}
                    onExportExcel={exportToExcel}
                />

                <div className="no-print" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', width: '100%', padding: 0 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <CustomSelect
                            value={selectedId}
                            onChange={val => { setSelectedId(val); fetchReport(val); }}
                            placeholder={t("اختر الحساب البنكي لمتابعة حركته...")}
                            options={[
                                { value: '', label: `-- ${t('اختر الحساب البنكي من القائمة')} --` },
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
                    
                    <div className="mobile-flex-row mobile-gap-sm date-filter-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '12px' }}>{t("من")}</span>
                        <div className="date-input-wrapper">
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t("من")}</span>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...IS, width: '160px' }} />
                        </div>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '12px' }}>{t("إلى")}</span>
                        <div className="date-input-wrapper">
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t("إلى")}</span>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...IS, width: '160px' }} />
                        </div>
                        <button onClick={() => fetchReport()} disabled={loading} style={{ 
                            height: '42px', padding: '0 24px', borderRadius: '12px', 
                            background: C.primary, color: '#fff', border: 'none',
                            fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO,
                            boxShadow: '0 4px 12px rgba(37, 106, 244,0.2)'
                        }}>
                            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />} 
                            {t('تحديث التقرير')}
                        </button>
                    </div>
                </div>

                {loading ? ( <TableSkeleton /> ) : !data ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <Landmark size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('بانتظار اختيار الحساب البنكي')}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textSecondary, fontFamily: CAIRO }}>{t('يرجى اختيار الحساب البنكي وتحديد الفترة الزمنية لعرض كشف الحركة التفصيلي.')}</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Stats Cards */}
                        <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: t('رصيد مرحل (قبل)'), value: data.openingBalance, color: '#256af4', icon: <History size={20} />, sign: t('الرصيد في بداية الفترة') },
                                { label: t('إجمالي الإيداعات'), value: totalReceipts, color: SC, icon: <TrendingUp size={20} />, sign: t('وارد للحساب (+)') },
                                { label: t('إجمالي السحوبات'), value: totalPayments, color: DC, icon: <TrendingDown size={20} />, sign: t('صادر من الحساب (-)') },
                                { label: t('صافي الرصيد البنكي'), value: data.currentBalance, color: data.currentBalance >= 0 ? SC : DC, icon: <FileText size={20} />, sign: t('الرصيد الدفتري الحالي') },
                            ].map((s: SummaryCard, i: number) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s', boxShadow: '0 2px 8px -4px rgba(0,0,0,0.1)'
                                }}>
                                    <div style={{ textAlign: 'center'}}>
                                        <p style={{ fontSize: '11px', fontWeight: 600, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{formatNumber(s.value)}</span>
                                            <span style={{ fontSize: '10.5px', color: C.textSecondary, fontWeight: 500, fontFamily: CAIRO }}>{sym}</span>
                                        </div>
                                        <div style={{ fontSize: '9px', fontWeight: 600, color: s.color, fontFamily: CAIRO, marginTop: '2px' }}>{s.sign}</div>
                                    </div>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <DataTable
                            columns={columns}
                            data={tableData}
                            emptyIcon={Landmark}
                            emptyMessage={t('لا توجد حركات بنكية مسجلة للفترة المحددة')}
                            footer={footerElement}
                        />
                    </>
                )}
            </div>
            <style>{`
                .print-only { display: none; }
                @media print {
                    .print-only { display: block !important; }
                    .no-print { display: none !important; }
                    .stat-value { font-size: 11px !important; color: #000 !important; }
                    .stat-label { font-size: 9px !important; color: #666 !important; }
                    div { background: #fff !important; border-color: #e2e8f0 !important; }
                    div, span, h2, h3, p, small { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; border: 1px solid #e2e8f0 !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}
