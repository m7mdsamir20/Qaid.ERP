'use client';
import TableSkeleton from '@/components/TableSkeleton';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { formatNumber } from '@/lib/currency';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { Search, Phone, Clock, AlertTriangle, TrendingDown, History } from 'lucide-react';
import * as XLSX from 'xlsx';
import { applyExcelMoneyFormat } from '@/lib/excelFormat';
import CustomSelect from '@/components/CustomSelect';
import StatCard from '@/components/StatCard';
import { navSections } from '@/constants/navigation';

const t = (s: string) => s;
const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': t('ج.م'), 'SAR': t('ر.س'), 'AED': t('د.إ'), 'USD': '$', 'KWD': t('د.ك'), 'QAR': t('ر.ق'), 'BHD': t('د.ب'), 'OMR': t('ر.ع'), 'JOD': t('د.أ') };
    return map[code] || code;
};

interface AgingInvoice {
    id: string;
    invoiceNumber: number;
    date: string;
    customer: string;
    phone: string;
    remaining: number;
    ageDays: number;
    category: string;
}

interface BranchOption {
    id: string;
    name: string;
}

interface AgingBucket {
    total: number;
    count: number;
}

interface AgingBuckets {
    '0-30': AgingBucket;
    '31-60': AgingBucket;
    '61-90': AgingBucket;
    '91+': AgingBucket;
}

export default function AgingReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const isSuperAdmin = session?.user?.isSuperAdmin;
    const featuresRaw = session?.user?.subscription?.features;
    const hasSubscription = !!session?.user?.subscription;
    const userPermissions = session?.user?.permissions || {};

    const enabledFeatures: Record<string, string[]> = (() => {
        if (!featuresRaw) return {};
        try {
            const parsed = typeof featuresRaw === 'string' ? JSON.parse(featuresRaw) : featuresRaw;
            if (Array.isArray(parsed)) {
                return {};
            }
            return parsed || {};
        }
        catch { return {}; }
    })();

    const hasPageAccess = (pageId: string, featureKey?: string): boolean => {
        if (hasSubscription && featureKey) {
            const pagesInSub = enabledFeatures[featureKey] || [];
            if (!pagesInSub.includes(pageId)) return false;
        }
        if (isSuperAdmin) return true;
        if (session?.user?.role === 'admin') return true;
        const perms = userPermissions as Record<string, { view?: boolean }>;
        return !!perms[pageId]?.view;
    };

    const hasCustomers = hasPageAccess('/customers', 'sales') || hasPageAccess('/partners', 'partners');
    const hasSuppliers = hasPageAccess('/suppliers', 'purchases');

    const [data, setData] = useState<AgingInvoice[]>([]);
    const [buckets, setBuckets] = useState<AgingBuckets | null>(null);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        const run = async () => {
            const params = new URLSearchParams();
            if (branchId && branchId !== 'all') params.set('branchId', branchId);
            try {
                const res = await fetch(`/api/reports/aging-report?${params}`);
                const d = await res.json();
                if (!d.error) {
                    setData(d.invoices);
                    setBuckets(d.buckets);
                }
            } catch {
            } finally {
                setLoading(false);
            }
        };
        void run();
    }, [branchId]);

    const filtered = data.filter(inv => inv.customer.toLowerCase().includes(q.toLowerCase()) || String(inv.invoiceNumber).includes(q));
    const sym = t(getCurrencyName(currency));

    const exportToExcel = () => {
        if (!data.length) return;
        const excelData = data.map(inv => ({
            [t('رقم الفاتورة')]: `SAL-${String(inv.invoiceNumber).padStart(5, '0')}`,
            [t('التاريخ')]: new Date(inv.date).toLocaleDateString('en-ZA'),
            [t('العميل')]: inv.customer,
            [t('عمر الدين (يوم)')]: inv.ageDays,
            [t('المبلغ المتبقي')]: inv.remaining,
            [t('التصنيف')]: inv.ageDays > 90 ? t("متأخر جداً") : inv.ageDays > 60 ? t("حذر") : t("اعتيادي")
        }));
        const ws = XLSX.utils.json_to_sheet(excelData);
        applyExcelMoneyFormat(ws, currency, lang);
        const wb = XLSX.utils.book_new();
        const sheetName = hasCustomers && hasSuppliers 
            ? t("أعمار الديون") 
            : hasCustomers 
                ? t("أعمار ديون العملاء") 
                : t("أعمار ديون الموردين");
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        const fileName = hasCustomers && hasSuppliers 
            ? t("تقرير_أعمار_الديون") 
            : hasCustomers 
                ? t("تقرير_أعمار_ديون_العملاء") 
                : t("تقرير_أعمار_ديون_الموردين");
        XLSX.writeFile(wb, `${fileName}_${new Date().toLocaleDateString('en-ZA')}.xlsx`);
    };

    const columns: TableColumn[] = [
        {
            header: t('رقم الفاتورة'),
            type: 'number' as const,
            cell: (row: AgingInvoice) => (
                <span style={{ fontSize: '12px', color: C.primary, fontWeight: 600, fontFamily: OUTFIT, background: 'rgba(37, 106, 244,0.08)', padding: '4px 10px', borderRadius: '6px' }}>
                    {`SAL-${String(row.invoiceNumber).padStart(5, '0')}`}
                </span>
            )
        },
        {
            header: t('تاريخ الإصدار'),
            cell: (row: AgingInvoice) => new Date(row.date).toLocaleDateString('en-ZA'),
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('العميل المستحق'),
            cell: (row: AgingInvoice) => (
                <>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{row.customer}</div>
                    {row.phone && <div style={{ fontSize: '11px', color: C.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '4px', fontFamily: OUTFIT, marginTop: '2px' }}><Phone size={10} /> {row.phone}</div>}
                </>
            ),
            style: { minWidth: '150px' }
        },
        {
            header: t('عمر الدين'),
            cell: (row: AgingInvoice) => (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{row.ageDays}</span>
                    <span style={{ fontSize: '10px', fontFamily: CAIRO, fontWeight: 700, color: C.textSecondary }}>{t('يوم متأخر')}</span>
                </div>
            ),
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('المبلغ المتبقي'),
            type: 'number' as const,
            cell: (row: AgingInvoice) => (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#ef4444', fontSize: '13px', fontFamily: OUTFIT }}>{formatNumber(row.remaining)}</span>
                    <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{sym}</span>
                </div>
            ),
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('حالة التصنيف'),
            cell: (row: AgingInvoice) => (
                <span style={{
                    padding: '5px 12px', borderRadius: '8px', fontSize: '10.5px', fontWeight: 600, fontFamily: CAIRO,
                    background: row.ageDays > 90 ? 'rgba(239, 68, 68, 0.1)' : row.ageDays > 60 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    color: row.ageDays > 90 ? '#ef4444' : row.ageDays > 60 ? '#f59e0b' : '#10b981',
                    border: `1px solid ${row.ageDays > 90 ? '#ef444422' : row.ageDays > 60 ? '#f59e0b22' : '#10b98122'}`
                }}>
                    {row.ageDays > 90 ? t('متأخر جداً') : row.ageDays > 60 ? t('حذر') : t('اعتيادي')}
                </span>
            ),
            style: { textAlign: 'center' } as React.CSSProperties
        }
    ];

    const footerElement = (
        <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
            <td colSpan={4} style={{ padding: '20px 24px', fontSize: '13px', color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO }}>{t('إجمالي المديونيات المتأخرة المستحقة')}</td>
            <td style={{ padding: '20px 20px', color: '#ef4444', fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, textAlign: 'center' }}>
                {formatNumber(filtered.reduce((s, i) => s + i.remaining, 0))} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{sym}</span>
            </td>
            <td style={{ padding: '20px 24px' }}></td>
        </tr>
    );

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={hasCustomers && hasSuppliers 
                        ? t("تقرير أعمار الديون") 
                        : hasCustomers 
                            ? t("أعمار ديون العملاء") 
                            : t("أعمار ديون الموردين")}
                    subtitle={hasCustomers && hasSuppliers 
                        ? t("تحليل المديونيات المتأخرة وتصنيفها حسب المدة الزمنية لتسهيل عمليات التحصيل.") 
                        : hasCustomers 
                            ? t("تحليل مديونيات العملاء المتأخرة وتصنيفها حسب المدة الزمنية لتسهيل عمليات التحصيل.") 
                            : t("تحليل مستحقات الموردين المتأخرة وتصنيفها حسب المدة الزمنية.")}
                    backTab="partners"
                    printTitle={hasCustomers && hasSuppliers 
                        ? t("تقرير أعمار الديون") 
                        : hasCustomers 
                            ? t("أعمار ديون العملاء") 
                            : t("أعمار ديون الموردين")}
                    branchName={selectedBranchName}
                    onExportExcel={exportToExcel}
                />

                {/* Summary Cards */}
                {buckets && (
                    <div data-print-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                        <StatCard
                            label={t('مديونية (0 - 30 يوم)')}
                            value={buckets['0-30'].total}
                            suffix={`${sym} (${buckets['0-30'].count} ${t('فاتورة')})`}
                            icon={<Clock size={18} />}
                            color="#256af4"
                            formatValue={true}
                        />
                        <StatCard
                            label={t('مديونية (31 - 60 يوم)')}
                            value={buckets['31-60'].total}
                            suffix={`${sym} (${buckets['31-60'].count} ${t('فاتورة')})`}
                            icon={<History size={18} />}
                            color="#eab308"
                            formatValue={true}
                        />
                        <StatCard
                            label={t('مديونية (61 - 90 يوم)')}
                            value={buckets['61-90'].total}
                            suffix={`${sym} (${buckets['61-90'].count} ${t('فاتورة')})`}
                            icon={<TrendingDown size={18} />}
                            color="#f59e0b"
                            formatValue={true}
                        />
                        <StatCard
                            label={t('متأخرات (91+ يوم)')}
                            value={buckets['91+'].total}
                            suffix={`${sym} (${buckets['91+'].count} ${t('فاتورة')})`}
                            icon={<AlertTriangle size={18} />}
                            color="#ef4444"
                            formatValue={true}
                        />
                    </div>
                )}

                <div className="no-print" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                        <div style={{ minWidth: '180px' }}>
                            <CustomSelect
                                value={branchId}
                                onChange={(v) => { setLoading(true); setBranchId(v); }}
                                placeholder={t("كل الفروع")}
                                hideSearch={true}
                                options={[
                                    { value: 'all', label: t('كل الفروع') },
                                    ...branches.map((b) => ({ value: b.id, label: b.name }))
                                ]}
                            />
                        </div>
                    )}
                    <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                        <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                        <input
                            placeholder={t("ابحث باسم العميل أو رقم الفاتورة للفلترة السريعة...")}
                            value={q} onChange={e => setQ(e.target.value)}
                            style={{
                                ...IS, width: '100%', height: '42px', padding: '0 45px 0 15px',
                                borderRadius: '12px', border: `1px solid ${C.border}`,
                                background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                outline: 'none', fontFamily: CAIRO, fontWeight: 500
                            }}
                        />
                    </div>
                </div>

                <div className="print-table-container">
                    <DataTable
                        columns={columns}
                        data={filtered}
                        emptyIcon={Clock}
                        emptyMessage={t('لم يتم العثور على مديونيات متأخرة حالياً في النظام')}
                        isLoading={loading}
                        footer={footerElement}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}
