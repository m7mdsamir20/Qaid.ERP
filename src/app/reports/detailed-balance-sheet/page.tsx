'use client';
import { formatNumber } from '@/lib/currency';
import ContentSkeleton from '@/components/ContentSkeleton';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { Currency } from '@/components/Currency';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { useSession } from 'next-auth/react';
import { Landmark, Scale, Sigma, AlertCircle, Info } from 'lucide-react';
import { C, CAIRO, OUTFIT, PAGE_BASE } from '@/constants/theme';

interface BalanceSheetRow {
    code: string;
    name: string;
    balance: number;
}

interface BalanceSheetData {
    assets: BalanceSheetRow[];
    liabilities: BalanceSheetRow[];
    equities: BalanceSheetRow[];
    totalAssets: number;
    totalLiabilities: number;
    totalEquities: number;
    totalLiabilitiesAndEquities: number;
    netIncome: number;
}

export default function DetailedBalanceSheetPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [data, setData] = useState<BalanceSheetData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reports/balance-sheet');
            if (res.ok) {
                const d = await res.json();
                if (!d.error) setData(d);
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const isBalanced = data ? Math.abs(data.totalAssets - data.totalLiabilitiesAndEquities) < 0.01 : false;

    if (loading) { return <DashboardLayout><ContentSkeleton /></DashboardLayout>; }

    if (!data) return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader 
                    title={t("الميزانية العمومية التفصيلية")} 
                    subtitle={t("حدث خطأ أثناء محاولة جلب بيانات التقرير.")}
                    backTab="financial" 
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', textAlign: 'center', background: C.card, borderRadius: '24px', border: `1px solid ${C.border}` }}>
                    <AlertCircle size={60} style={{ opacity: 0.2, marginBottom: '20px' }} />
                    <h3 style={{ fontFamily: CAIRO }}>{t('خطأ في تحميل البيانات')}</h3>
                </div>
            </div>
        </DashboardLayout>
    );

    // Assets Table columns
    const assetsColumns: TableColumn[] = [
        {
            header: t('كود الحساب'),
            cell: (row: BalanceSheetRow) => (
                <span className="notranslate" translate="no" style={{ fontSize: '11px', fontFamily: OUTFIT, color: C.textSecondary, background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px' }}>{row.code}</span>
            ),
            style: { width: '100px' }
        },
        {
            header: t('اسم الحساب'),
            cell: (row: BalanceSheetRow) => row.name,
            style: { fontFamily: CAIRO, fontSize: '13px', fontWeight: 600, color: C.textSecondary }
        },
        {
            header: t('الرصيد'),
            type: 'number' as const,
            cell: (row: BalanceSheetRow) => <Currency amount={row.balance} />,
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: C.textPrimary, textAlign: 'center' } as React.CSSProperties
        }
    ];

    const assetsFooter = (
        <tr style={{ background: 'rgba(16, 185, 129, 0.08)', borderTop: `2px solid #10b98133` }}>
            <td colSpan={2} style={{ padding: '16px 24px', fontWeight: 600, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}>{t('إجمالي الأصول')}</td>
            <td style={{ padding: '16px 24px', fontWeight: 950, color: '#10b981', fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={data.totalAssets} /></td>
        </tr>
    );

    // Liabilities Table columns
    const liabilitiesColumns: TableColumn[] = [
        {
            header: t('كود الحساب'),
            cell: (row: BalanceSheetRow) => (
                <span className="notranslate" translate="no" style={{ fontSize: '11px', fontFamily: OUTFIT, color: C.textSecondary }}>{row.code}</span>
            ),
            style: { width: '100px' }
        },
        {
            header: t('اسم الحساب'),
            cell: (row: BalanceSheetRow) => row.name,
            style: { fontFamily: CAIRO, fontSize: '13px', fontWeight: 600, color: C.textSecondary }
        },
        {
            header: t('الرصيد'),
            type: 'number' as const,
            cell: (row: BalanceSheetRow) => <Currency amount={row.balance} />,
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: C.textPrimary, textAlign: 'center' } as React.CSSProperties
        }
    ];

    const liabilitiesFooter = (
        <tr style={{ background: 'rgba(251, 113, 133, 0.05)', borderTop: `1px solid #fb718533` }}>
            <td colSpan={2} style={{ padding: '12px 20px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي الخصوم')}</td>
            <td style={{ padding: '12px 20px', fontWeight: 600, color: '#fb7185', fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={data.totalLiabilities} /></td>
        </tr>
    );

    // Equities Table columns & virtual row
    const equitiesData: (BalanceSheetRow & { isNetIncome?: boolean })[] = [
        ...data.equities,
        {
            code: '—',
            name: t('صافي الربح / الخسارة'),
            balance: data.netIncome,
            isNetIncome: true
        }
    ];

    const equitiesColumns: TableColumn[] = [
        {
            header: t('كود الحساب'),
            cell: (row: any) => <span className="notranslate" translate="no">{row.code}</span>,
            style: { width: '100px' }
        },
        {
            header: t('اسم الحساب'),
            cell: (row: any) => (
                <span style={{ color: row.isNetIncome ? C.textPrimary : C.textSecondary }}>
                    {row.name}
                </span>
            ),
            style: { fontFamily: CAIRO, fontSize: '13px', fontWeight: 600 }
        },
        {
            header: t('الرصيد'),
            type: 'number' as const,
            cell: (row: any) => (
                <Currency 
                    amount={row.balance} 
                    style={row.isNetIncome ? { color: row.balance >= 0 ? '#10b981' : '#fb7185' } : undefined} 
                />
            ),
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: C.textPrimary, textAlign: 'center' } as React.CSSProperties
        }
    ];

    const equitiesFooter = (
        <tr style={{ background: 'rgba(37, 106, 244, 0.08)', borderTop: `1px solid #256af433` }}>
            <td colSpan={2} style={{ padding: '12px 20px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي حقوق الملكية')}</td>
            <td style={{ padding: '12px 20px', fontWeight: 950, color: '#256af4', fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' }}><Currency amount={data.totalEquities} /></td>
        </tr>
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("الميزانية العمومية التفصيلية")}
                    subtitle={t("عرض شامل لموجودات الشركة (الأصول) والتزاماتها (الخصوم) وحقوق المساهمين.")}
                    backTab="financial"
                    printTitle={t("الميزانية التفصيلية (Detailed Balance Sheet)")}
                />

                <div className="print-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                    {/* ASSETS SIDE */}
                    <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 24px', background: 'rgba(16, 185, 129, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981' }}>
                            <Landmark size={20} />
                            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('الأصول (Assets)')}</h3>
                        </div>
                        <DataTable
                            columns={assetsColumns}
                            data={data.assets}
                            emptyIcon={Landmark}
                            emptyMessage={t('لا توجد أصول مسجلة')}
                            footer={assetsFooter}
                        />
                    </div>

                    {/* LIABILITIES & EQUITY SIDE */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Liabilities Table */}
                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', background: 'rgba(251, 113, 133, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px', color: '#fb7185' }}>
                                <Scale size={18} />
                                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('الخصوم (Liabilities)')}</h3>
                            </div>
                            <DataTable
                                columns={liabilitiesColumns}
                                data={data.liabilities}
                                emptyIcon={Scale}
                                emptyMessage={t('لا توجد التزامات جارية')}
                                footer={liabilitiesFooter}
                            />
                        </div>

                        {/* Equity Table */}
                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', background: 'rgba(37, 106, 244, 0.05)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '10px', color: '#256af4' }}>
                                <Sigma size={18} />
                                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('حقوق الملكية (Equity)')}</h3>
                            </div>
                            <DataTable
                                columns={equitiesColumns}
                                data={equitiesData}
                                emptyIcon={Sigma}
                                emptyMessage={t('لا توجد حقوق ملكية مسجلة')}
                                rowStyle={(row) => row.isNetIncome ? { background: 'rgba(37, 106, 244, 0.02)' } : {}}
                                footer={equitiesFooter}
                            />
                        </div>

                        {/* Grand Total Row */}
                        <div style={{
                            padding: '16px 24px',
                            background: isBalanced ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            borderRadius: '16px',
                            border: `1.5px solid ${isBalanced ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                             <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('إجمالي الخصوم وحقوق الملكية')}</span>
                             <span style={{ fontSize: '18px', fontWeight: 950, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={data.totalLiabilitiesAndEquities} /></span>
                        </div>
                    </div>
                </div>

                <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '24px', padding: '14px 18px', background: 'rgba(255, 255, 255, 0.01)', border: `1px solid ${C.border}`, borderRadius: '12px' }}>
                    <Info size={16} style={{ color: C.primary }} />
                    <p style={{ margin: 0, fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>
                        {t('الميزانية متزنة تفصيلياً:')} <span style={{ color: C.success, fontWeight: 600 }}>{t('الأصول')} ({data.totalAssets > 0 ? formatNumber(data.totalAssets) : '0.00'})</span> = <span style={{ color: C.primary, fontWeight: 600 }}>{t('الخصوم وحقوق الملكية')} ({data.totalLiabilitiesAndEquities > 0 ? formatNumber(data.totalLiabilitiesAndEquities) : '0.00'})</span>
                    </p>
                </div>
            </div>

            <style>{`
                .print-only { display: none; }
                @media print {
                    .print-only { display: block !important; }
                    .no-print { display: none !important; }
                    .print-main-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 20px !important; }
                    .print-table-container { background: white !important; border: 1px solid #e2e8f0 !important; border-radius: 0 !important; }
                    div { background: #fff !important; border-color: #e2e8f0 !important; }
                    div, span, h2, h3, p, small { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}
