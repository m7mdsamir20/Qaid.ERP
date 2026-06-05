'use client';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import TableSkeleton from '@/components/TableSkeleton';
import { formatNumber, getCurrencySymbol } from '@/lib/currency';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';


import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { Package, Search, Activity, Box, DollarSign, Loader2 } from 'lucide-react';
import { SEARCH_STYLE, focusIn, focusOut } from '@/constants/theme';
import { useCurrency } from '@/hooks/useCurrency';

interface StockItem {
    id: string;
    quantity: number;
    item: { code: string; name: string; unit: string; costPrice: number; sellPrice: number };
    warehouse: { name: string };
}

interface ReportData {
    stocks: StockItem[];
    totalItems: number;
    totalQuantity: number;
    totalValue: number;
}

export default function InventoryReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const businessType = session?.user?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';
    const currency = session?.user?.currency || 'EGP';
    const { fMoneyJSX } = useCurrency();

    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch('/api/reports/inventory-report')
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(d => { if (d.error) throw new Error(d.error); setData(d); })
            .catch(() => setError(t('فشل تحميل بيانات المخزون')))
            .finally(() => setLoading(false));
    }, []);

    const filtered = data?.stocks.filter(s =>
        (s.item?.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (s.item?.code?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (s.warehouse?.name?.toLowerCase() || '').includes(search.toLowerCase())
    ) || [];

    const columns: TableColumn[] = isServices ? [
        {
            header: t('كود الخدمة'),
            cell: (row: StockItem) => (
                <span style={{ background: 'rgba(37, 106, 244,0.1)', border: '1px solid rgba(37, 106, 244,0.2)', borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, color: '#60a5fa', fontFamily: OUTFIT }}>{row.item?.code || '-'}</span>
            )
        },
        {
            header: t('اسم الخدمة'),
            cell: (row: StockItem) => row.item?.name || t('خدمة غير معرفة'),
            style: { fontWeight: 600, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }
        },
        {
            header: t('الوصف/الفئة'),
            cell: (row: StockItem) => row.item?.unit || '-',
            style: { fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }
        },
        {
            header: t('سعر الخدمة'),
            type: 'number',
            cell: (row: StockItem) => fMoneyJSX(row.item?.sellPrice || 0),
            style: { textAlign: 'center' } as React.CSSProperties
        }
    ] : [
        {
            header: t('كود الصنف'),
            cell: (row: StockItem) => (
                <span style={{ background: 'rgba(37, 106, 244,0.1)', border: '1px solid rgba(37, 106, 244,0.2)', borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, color: '#60a5fa', fontFamily: OUTFIT }}>{row.item?.code || '-'}</span>
            )
        },
        {
            header: t('اسم الصنف'),
            cell: (row: StockItem) => row.item?.name || t('صنف غير معرف'),
            style: { fontWeight: 600, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }
        },
        {
            header: t('الوحدة'),
            cell: (row: StockItem) => row.item?.unit || '-',
            style: { fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }
        },
        {
            header: t('المخزن'),
            cell: (row: StockItem) => row.warehouse?.name || t('مخزن غير معرف'),
            style: { fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }
        },
        {
            header: t('الكمية'),
            type: 'number',
            cell: (row: StockItem) => (
                <span style={{
                    fontSize: '13px', fontWeight: 600, color: row.quantity <= 0 ? '#ef4444' : row.quantity <= 10 ? '#f59e0b' : '#10b981',
                    fontFamily: OUTFIT, background: row.quantity <= 0 ? 'rgba(239, 68, 68, 0.1)' : row.quantity <= 10 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    padding: '4px 10px', borderRadius: '10px'
                }}>
                    {formatNumber(row.quantity)}
                </span>
            ),
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('التكلفة'),
            type: 'number',
            cell: (row: StockItem) => fMoneyJSX(row.item?.costPrice || 0),
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('سعر البيع'),
            type: 'number',
            cell: (row: StockItem) => fMoneyJSX(row.item?.sellPrice || 0),
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('القيمة الإجمالية'),
            type: 'number',
            cell: (row: StockItem) => fMoneyJSX(row.quantity * (row.item?.costPrice || 0), '', { fontWeight: 600, color: C.primary }),
            style: { textAlign: 'center' } as React.CSSProperties
        }
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={isServices ? t("قائمة أسعار الخدمات") : t("تقرير أرصدة المخزون")}
                    subtitle={isServices ? t("عرض قائمة بجميع الخدمات المسجلة وأسعار البيع المقترحة.") : t("عرض أرصدة جميع الأصناف في كل مخزن مع القيمة الإجمالية والتكلفة.")}
                    backTab="inventory"
                    printTitle={isServices ? t("قائمة أسعار الخدمات") : t("جرد المخازن (Inventory Statement)")}
                />

                {data && (
                    <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
                        {[
                            { label: isServices ? t('عدد الخدمات') : t('عدد الأصناف'), value: data.totalItems.toLocaleString('en-US'), color: '#256af4', icon: <Package size={20} /> },
                            ...(!isServices ? [
                                { label: t('إجمالي الكميات'), value: data.totalQuantity.toLocaleString('en-US'), color: '#10b981', icon: <Box size={20} /> },
                                { label: t('قيمة المخزون (تكلفة)'), value: formatNumber(data.totalValue), color: '#f59e0b', icon: <DollarSign size={20} /> },
                            ] : [])
                        ].map((s, i) => (
                            <div key={i} style={{
                                background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <div style={{ textAlign: 'center'}}>
                                    <p style={{ fontSize: '11px', fontWeight: 600, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                        {i === 2 && <span style={{ fontSize: '10px', color: C.textSecondary, fontWeight: 500, fontFamily: CAIRO }}>{getCurrencySymbol(currency, lang)}</span>}
                                    </div>
                                </div>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                    {s.icon}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="no-print mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={isServices ? t("ابحث باسم الخدمة أو الكود...") : t("ابحث باسم الصنف أو الكود أو المخزن...")}
                            value={search} onChange={e => setSearch(e.target.value)}
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                </div>

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', marginBottom: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                        <span style={{ fontSize: '13px' }}>⚠️</span>{error}
                        <button onClick={() => setError('')} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>×</button>
                    </div>
                )}

                {loading ? ( <TableSkeleton /> ) : (
                    <DataTable
                        columns={columns}
                        data={filtered}
                        emptyIcon={Package}
                        emptyMessage={t('لا توجد بيانات مخزون')}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
