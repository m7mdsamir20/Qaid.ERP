'use client';
import TableSkeleton from '@/components/TableSkeleton';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { Currency } from '@/components/Currency';
import { formatNumber, getCurrencySymbol } from '@/lib/currency';
import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';

import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { Package, TrendingUp, Search, Activity } from 'lucide-react';



interface TopSellingItem {
    id: string;
    code: string;
    name: string;
    totalQuantity: number;
    totalSales: number;
    totalProfit: number;
    category: string;
    unit: string;
}

export default function TopSellingReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const businessType = session?.user?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';
    const currency = session?.user?.currency || 'EGP';

    const [data, setData] = useState<TopSellingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [q, setQ] = useState('');

    useEffect(() => {
        fetch('/api/reports/top-selling-items')
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(d => { if (d.error) throw new Error(d.error); setData(d); })
            .catch(() => setError(t('فشل تحميل بيانات الأصناف الأكثر مبيعاً')))
            .finally(() => setLoading(false));
    }, []);

    const filtered = data.filter(i => 
        (i.name || '').toLowerCase().includes(q.toLowerCase()) || 
        (i.code || '').toLowerCase().includes(q.toLowerCase()) || 
        (i.category || '').toLowerCase().includes(q.toLowerCase())
    );
    const totalSales = filtered.reduce((s, i) => s + i.totalSales, 0);

    const columns: TableColumn[] = [
        {
            header: '#',
            cell: (row: TopSellingItem, index: number) => index + 1,
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: isServices ? t("بيانات الخدمة") : t("بيانات الصنف"),
            cell: (row: TopSellingItem) => (
                <>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{row.name}</div>
                    <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '3px', fontFamily: OUTFIT }}>{row.code} — {row.category}</div>
                </>
            ),
            style: { minWidth: '150px' }
        },
        {
            header: t('الكمية'),
            cell: (row: TopSellingItem) => (
                <>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{formatNumber(row.totalQuantity)}</span>
                    <span style={{ fontSize: '11px', color: C.textSecondary, marginInlineEnd: '4px', fontFamily: CAIRO }}>{lang === 'ar' ? row.unit : t(row.unit)}</span>
                </>
            )
        },
        {
            header: t('القيمة'),
            type: 'number' as const,
            cell: (row: TopSellingItem) => <Currency amount={row.totalSales} />,
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: C.primary, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الربح التقديري'),
            type: 'number' as const,
            cell: (row: TopSellingItem) => (
                <span style={{
                    color: '#10b981', background: 'rgba(16,185,129,0.08)',
                    padding: '4px 10px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)',
                    fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT
                }}>
                    <Currency amount={row.totalProfit} />
                </span>
            ),
            style: { textAlign: 'center' } as React.CSSProperties
        }
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={isServices ? t("تحليل الخدمات الأكثر طلباً") : t("تحليل الأصناف الأكثر مبيعاً")}
                    subtitle={isServices ? t("نظرة شاملة على الخدمات الأعلى حركة وطلباً في نشاطك.") : t("نظرة شاملة على المنتجات الأعلى حركة وكفاءة ربحية في محفظة مبيعاتك.")}
                    backTab="sales-purchases"
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '24px', marginBottom: '24px', alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                                <input
                                    placeholder={t("ابحث بالاسم، الكود، أو التصنيف...")}
                                    value={q} onChange={e => setQ(e.target.value)}
                                    style={{ 
                                        ...IS, width: '100%', height: '42px', padding: '0 45px 0 15px', 
                                        borderRadius: '12px', border: `1px solid ${C.border}`, 
                                        background: C.card, color: C.textPrimary, fontSize: '13.5px', 
                                        outline: 'none', fontFamily: CAIRO, fontWeight: 500
                                    }}
                                />
                            </div>
                            <div style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, whiteSpace: 'nowrap' }}>
                                {t('تم العثور على:')} <span style={{ color: C.primary, fontWeight: 600, fontFamily: OUTFIT }}>{filtered.length}</span> {isServices ? t("خدمة") : t("صنف")}
                            </div>
                        </div>

                        {error && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', marginBottom: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                                <span style={{ fontSize: '13px' }}>⚠️</span>{error}
                                <button onClick={() => setError('')} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>×</button>
                            </div>
                        )}

                        <DataTable
                            columns={columns}
                            data={filtered}
                            emptyIcon={Package}
                            emptyMessage={isServices ? t('لا توجد خدمات منفذة') : t('لا توجد أصناف مباعة')}
                            isLoading={loading}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: 'linear-gradient(145deg, rgba(37, 106, 244,0.1), rgba(37, 106, 244,0.05))', border: `1px solid rgba(37, 106, 244,0.2)`, borderRadius: '18px', padding: '24px', boxShadow: '0 10px 25px -10px rgba(0,0,0,0.3)' }}>
                            <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: 'rgba(37, 106, 244,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', marginBottom: '16px' }}>
                                <TrendingUp size={24} />
                            </div>
                            <div style={{ fontSize: '11.5px', color: C.textSecondary, fontWeight: 700, marginBottom: '6px', fontFamily: CAIRO }}>{isServices ? t("إجمالي قيمة الخدمات") : t("إجمالي القيمة البيعية")}</div>
                            <div style={{ fontSize: '20px', fontWeight: 600, color: '#60a5fa', fontFamily: OUTFIT, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                <Currency amount={totalSales} />
                            </div>
                        </div>

                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '18px', padding: '20px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fb923c', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                <Activity size={16} /> {isServices ? t("أعلى 5 خدمات") : t("أعلى 5 أصناف")}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {filtered.slice(0, 5).map((item, idx) => (
                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: idx < 3 ? '#000' : C.textMuted, fontFamily: OUTFIT }}>{idx + 1}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '12px', color: C.textPrimary, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: CAIRO }}>{item.name}</div>
                                            <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginTop: '6px' }}>
                                                <div style={{ width: `${(item.totalSales / (filtered[0]?.totalSales || 1)) * 100}%`, height: '100%', background: C.primary, borderRadius: '10px' }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
