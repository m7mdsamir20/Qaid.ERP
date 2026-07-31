'use client';
import TableSkeleton from '@/components/TableSkeleton';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { Currency } from '@/components/Currency';
import { formatNumber } from '@/lib/currency';
import CustomSelect from '@/components/CustomSelect';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { Search, Loader2, FileText } from 'lucide-react';

const PC = '#4f46e5';
const SC = '#10b981';
const DC = '#ef4444';

interface TreasuryOption {
    id: string;
    name: string;
    type: string;
}

interface Movement {
    id: string;
    date: string;
    type: 'receipt' | 'payment' | string;
    description: string;
    party: string;
    amount: number;
}

interface MovementWithBalance extends Movement {
    runningBalance: number;
}

interface TreasuryReportData {
    openingBalance: number;
    currentBalance: number;
    treasuryName: string;
    movements: Movement[];
}

interface TreasuryStatementTableItem {
    isOpeningBalance?: boolean;
    id: string;
    date: string;
    type: string;
    description: string;
    party: string;
    amount: number;
    runningBalance: number;
}

export default function TreasuryBankReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [selectedTreasuryId, setSelectedTreasuryId] = useState('');
    const [treasuries, setTreasuries] = useState<TreasuryOption[]>([]);
    const [data, setData] = useState<TreasuryReportData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchTreasuries = async () => {
            try {
                const res = await fetch('/api/treasuries');
                if (res.ok) setTreasuries(await res.json());
            } catch { }
        };
        fetchTreasuries();
    }, []);

    const fetchReport = async () => {
        if (!selectedTreasuryId) {
            alert(t('يرجى اختيار الخزينة أو البنك أولاً'));
            return;
        }
        setLoading(true);
        try {
            const params = new URLSearchParams({ treasuryId: selectedTreasuryId });
            if (from) params.set('from', from);
            if (to) params.set('to', to);

            const res = await fetch(`/api/reports/treasury-bank-report?${params}`);
            if (res.ok) setData(await res.json());
        } catch { 
            alert(t('فشل الاتصال بالخادم')); 
        } finally { 
            setLoading(false); 
        }
    };

    // Calculate Running Balance
    const getRunningMovements = (): MovementWithBalance[] => {
        if (!data) return [];
        let balance = data.openingBalance;
        return data.movements.map((m) => {
            if (m.type === 'receipt') balance += m.amount;
            else balance -= m.amount;
            return { ...m, runningBalance: balance };
        });
    };

    const movements = getRunningMovements();
    const totalReceipts = data?.movements.filter((m) => m.type === 'receipt').reduce((sum, m) => sum + m.amount, 0) || 0;
    const totalPayments = data?.movements.filter((m) => m.type === 'payment').reduce((sum, m) => sum + m.amount, 0) || 0;

    const tableData: TreasuryStatementTableItem[] = [];
    if (data) {
        tableData.push({
            isOpeningBalance: true,
            id: 'opening-balance',
            date: '',
            type: '',
            description: '',
            party: t('رصيد افتتاحي (ما قبـل الفترة)'),
            amount: 0,
            runningBalance: data.openingBalance
        });
        tableData.push(...movements);
    }

    const columns: TableColumn[] = [
        {
            header: t('التاريخ'),
            cell: (row: TreasuryStatementTableItem) => {
                if (row.isOpeningBalance) return '';
                return new Date(row.date).toLocaleDateString('en-ZA');
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('النوع'),
            cell: (row: TreasuryStatementTableItem) => {
                if (row.isOpeningBalance) return '';
                return (
                    <span style={{
                        padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                        background: row.type === 'receipt' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: row.type === 'receipt' ? SC : DC
                    }}>
                        {row.type === 'receipt' ? t('سند قبض') : t('سند صرف')}
                    </span>
                );
            },
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('البيان'),
            cell: (row: TreasuryStatementTableItem) => {
                if (row.isOpeningBalance) {
                    return <span style={{ fontWeight: 700, color: '#64748b', fontFamily: CAIRO }}>{row.party}</span>;
                }
                return row.description;
            },
            style: { fontFamily: CAIRO, fontSize: '13px', color: '#e2e8f0' }
        },
        {
            header: t('الجهة'),
            cell: (row: TreasuryStatementTableItem) => {
                if (row.isOpeningBalance) return '';
                return row.party;
            },
            style: { fontFamily: CAIRO, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('مدين (+)'),
            type: 'number' as const,
            cell: (row: TreasuryStatementTableItem) => {
                if (row.isOpeningBalance) return '';
                return row.type === 'receipt' ? <Currency amount={row.amount} /> : '';
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: SC, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('دائن (-)'),
            type: 'number' as const,
            cell: (row: TreasuryStatementTableItem) => {
                if (row.isOpeningBalance) return '';
                return row.type === 'payment' ? <Currency amount={row.amount} /> : '';
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: DC, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الرصيد'),
            type: 'number' as const,
            cell: (row: TreasuryStatementTableItem) => <Currency amount={row.runningBalance} />,
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.01)' } as React.CSSProperties
        }
    ];

    const footerElement = data && (
        <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
            <td colSpan={4} style={{ padding: '20px 24px', fontSize: '13px', color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO }}>{t('إجماليات الحركات المحددة')}</td>
            <td style={{ padding: '20px 20px', color: SC, fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={totalReceipts} /></td>
            <td style={{ padding: '20px 20px', color: DC, fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={totalPayments} /></td>
            <td style={{ padding: '20px 24px', color: PC, fontSize: '13px', fontWeight: 950, fontFamily: OUTFIT, background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}><Currency amount={data.currentBalance} /></td>
        </tr>
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, paddingBottom: '60px' }}>
                <ReportHeader
                    title={t("كشف حساب الخزن والبنوك")}
                    subtitle={t("تحليل تفصيلي للحركات المالية والمقبوضات والمدفوعات لكل خزينة أو حساب بنكي.")}
                    backTab="financial"
                    printTitle={t("كشف حركة الخزينة")}
                    accountName={data ? data.treasuryName : undefined}
                    printLabel={t('الخزينة:')}
                    printDate={from || to ? `${from ? `${t('من')} ${from}` : ''} ${to ? `${t('إلى')} ${to}` : ''}`.trim() : undefined}
                />

                {/* Filters */}
                <div className="no-print" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <label style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#94a3b8', fontFamily: CAIRO, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{t('اختر الخزينة / البنك')}</label>
                            <CustomSelect
                                value={selectedTreasuryId}
                                onChange={setSelectedTreasuryId}
                                placeholder={t('اختر المرجع المالي...')}
                                options={treasuries.map(t_sys => ({
                                    value: t_sys.id,
                                    label: `${t_sys.name} (${t_sys.type === 'bank' ? t('بنك') : t('خزينة')})`
                                }))}
                                style={{ flex: 1 }}
                            />
                        </div>
                        <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <label style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#94a3b8', fontFamily: CAIRO, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{t('من')}</label>
                            <div className="date-input-wrapper" style={{ flex: 1 }}>
                                <span className="date-label-mobile" style={{ display: 'none' }}>{t("من")}</span>
                                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: '100%', height: '42px', padding: '0 15px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: '#fff', textAlign: 'center' }} />
                            </div>
                        </div>
                        <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <label style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#94a3b8', fontFamily: CAIRO, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{t('إلى')}</label>
                            <div className="date-input-wrapper" style={{ flex: 1 }}>
                                <span className="date-label-mobile" style={{ display: 'none' }}>{t("إلى")}</span>
                                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: '100%', height: '42px', padding: '0 15px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: '#fff', textAlign: 'center' }} />
                            </div>
                        </div>
                        <button onClick={fetchReport} className="btn btn-primary" style={{ height: '42px', padding: '0 30px', fontWeight: 600, gap: '10px', borderRadius: '12px', fontFamily: CAIRO, display: 'flex', alignItems: 'center' }}>
                            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={18} />} {t('عرض التقرير')}
                        </button>
                    </div>
                </div>

                {loading ? ( <TableSkeleton /> ) : !data ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', textAlign: 'center', background: C.card, borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <FileText size={60} style={{ opacity: 0.1, marginBottom: '20px' }} />
                        <h3 style={{ color: '#64748b', fontSize: '15px' , fontFamily: CAIRO}}>{t('يرجى اختيار الخزينة وتحديد الفترة لعرض التقرير')}</h3>
                    </div>
                ) : (
                    <div>
                        {/* Summary Header */}
                        <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                            <div className="card" style={{ padding: '20px', borderInlineEnd: `4px solid #64748b`, background: C.card, border: `1px solid ${C.border}` }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px' , fontFamily: CAIRO}}>{t('رصيد أول المدة')}</div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff' , fontFamily: CAIRO}}><Currency amount={data.openingBalance} /></div>
                            </div>
                            <div className="card" style={{ padding: '20px', borderInlineEnd: `4px solid ${SC}`, background: C.card, border: `1px solid ${C.border}` }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px' , fontFamily: CAIRO}}>{t('إجمالي المقبوضات (وارد)')}</div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: SC , fontFamily: CAIRO}}>+ <Currency amount={totalReceipts} /></div>
                            </div>
                            <div className="card" style={{ padding: '20px', borderInlineEnd: `4px solid ${DC}`, background: C.card, border: `1px solid ${C.border}` }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px' , fontFamily: CAIRO}}>{t('إجمالي المدفوعات (صادر)')}</div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: DC , fontFamily: CAIRO}}>- <Currency amount={totalPayments} /></div>
                            </div>
                            <div className="card" style={{ padding: '20px', borderInlineEnd: `4px solid ${PC}`, background: 'rgba(79, 70, 229, 0.05)', border: `1px solid ${C.border}` }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px' , fontFamily: CAIRO}}>{t('الرصيد الحالي')}</div>
                                <div style={{ fontSize: '12px', fontWeight: 950, color: PC , fontFamily: CAIRO}}><Currency amount={data.currentBalance} /></div>
                            </div>
                        </div>

                        {/* Movements Table */}
                        <div className="print-table-container table-container shadow-xl" style={{ background: C.card, borderRadius: '18px', overflow: 'hidden', border: `1px solid ${C.border}` }}>
                            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#f1f5f9' , fontFamily: CAIRO}}>{t('حركات')} {data.treasuryName}</h3>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 , fontFamily: CAIRO}}>{t('إجمالي')} {data.movements.length} {t('حركة مسجلة')}</div>
                            </div>
                            <DataTable
                                columns={columns}
                                data={tableData}
                                emptyIcon={FileText}
                                emptyMessage={t('لا توجد حركات مسجلة للفترة المحددة')}
                                footer={footerElement}
                            />
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @media print {
                    .no-print { display: none !important; }
                    body { background: #fff !important; color: #000 !important; }
                    .card { border: 1px solid #eee !important; box-shadow: none !important; }
                    .table-container { border: 1px solid #eee !important; box-shadow: none !important; }
                    th, td { color: #000 !important; border-bottom: 1px solid #eee !important; }
                    h3, h1, p { color: #000 !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}
