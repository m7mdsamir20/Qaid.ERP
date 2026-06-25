'use client';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import TableSkeleton from '@/components/TableSkeleton';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, SEARCH_STYLE, OUTFIT, IS } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { Search, Loader2, TrendingUp, FileText, CheckCircle, Clock } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import StatCard from '@/components/StatCard';

const getCurrencyName = (code: string, t: any) => {
    const map: Record<string, string> = { 'EGP': t('ج.م'), 'SAR': t('ر.س'), 'AED': t('د.إ'), 'USD': '$', 'KWD': t('د.ك'), 'QAR': t('ر.ق'), 'BHD': t('د.ب'), 'OMR': t('ر.ع'), 'JOD': t('د.أ') };
    return map[code] || code;
};

const fmt = (n: number) => formatNumber(n);

interface ReconciliationMatch {
    id: string;
    orderNumber: number;
    date: string;
    supplierName: string;
    poTotal: number;
    invoicedTotal: number;
    variance: number;
    invoicesCount: number;
}

interface BranchOption {
    id: string;
    name: string;
}

export default function POInvoiceMatchReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [matches, setMatches] = useState<ReconciliationMatch[]>([]);
    const [stats, setStats] = useState({ totalPoAmount: 0, totalInvoicedAmount: 0, totalVariance: 0 });
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [q, setQ] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            if (branchId && branchId !== 'all') params.set('branchId', branchId);
            const res = await fetch(`/api/reports/po-invoice-match?${params}`);
            if (res.ok) {
                const json = await res.json();
                setMatches(json.matches || []);
                setStats({
                    totalPoAmount: json.totalPoAmount || 0,
                    totalInvoicedAmount: json.totalInvoicedAmount || 0,
                    totalVariance: json.totalVariance || 0
                });
            }
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchReport(); }, [from, to, branchId]);

    const filteredMatches = matches.filter(m => {
        const orderCode = `PO-${String(m.orderNumber).padStart(5, '0')}`;
        return orderCode.includes(q.toUpperCase()) ||
            String(m.orderNumber).includes(q) ||
            m.supplierName.toLowerCase().includes(q.toLowerCase());
    });

    const sym = getCurrencyName(currency, t);
    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    const columns: TableColumn[] = [
        {
            header: t('أمر الشراء'),
            type: 'number' as const,
            cell: (row: ReconciliationMatch) => (
                <span style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 600, color: '#8b5cf6', fontFamily: OUTFIT }}>
                    {`PO-${String(row.orderNumber).padStart(5, '0')}`}
                </span>
            )
        },
        {
            header: t('التاريخ'),
            cell: (row: ReconciliationMatch) => new Date(row.date).toLocaleDateString('en-ZA'),
            style: { fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }
        },
        {
            header: t('المورد'),
            cell: (row: ReconciliationMatch) => row.supplierName,
            style: { fontWeight: 600, fontFamily: CAIRO, fontSize: '13px', color: C.textPrimary }
        },
        {
            header: t('قيمة أمر الشراء'),
            type: 'number',
            cell: (row: ReconciliationMatch) => <Currency amount={row.poTotal} />,
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('القيمة المفوترة فعلياً'),
            type: 'number',
            cell: (row: ReconciliationMatch) => <Currency amount={row.invoicedTotal} />,
            style: { textAlign: 'center', color: '#10b981', fontWeight: 600 } as React.CSSProperties
        },
        {
            header: t('الفجوة / الانحراف'),
            type: 'number',
            cell: (row: ReconciliationMatch) => {
                const isMatch = Math.abs(row.variance) < 0.01;
                return (
                    <span style={{ color: isMatch ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                        <Currency amount={row.variance} />
                        {!isMatch && ` (${Math.round((row.variance / row.poTotal) * 100)}%)`}
                    </span>
                );
            },
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الفواتير المربوطة'),
            cell: (row: ReconciliationMatch) => `${row.invoicesCount} ${t('فاتورة')}`,
            style: { fontFamily: CAIRO, fontSize: '13px', textAlign: 'center' } as React.CSSProperties
        }
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير المطابقة (PO vs فاتورة)")}
                    subtitle={t("مقارنة قيم أوامر الشراء المعتمدة بالفواتير الصادرة المرتبطة بها لتحديد أي فروقات مالية أو فجوات.")}
                    backTab="sales-purchases"
                    printTitle={t("تقرير المطابقة (PO vs فاتورة)")}
                    branchName={selectedBranchName}
                    printDate={(from || to) ? `${from ? t('من: ') + from : ''} ${to ? t(' إلى: ') + to : ''}` : undefined}
                />

                <div data-print-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                    <StatCard
                        label={t('إجمالي قيمة الأوامر')}
                        value={fmt(stats.totalPoAmount)}
                        suffix={sym}
                        icon={<TrendingUp size={18} />}
                        color="#256af4"
                    />
                    <StatCard
                        label={t('إجمالي القيمة المفوترة')}
                        value={fmt(stats.totalInvoicedAmount)}
                        suffix={sym}
                        icon={<CheckCircle size={18} />}
                        color="#10b981"
                    />
                    <StatCard
                        label={t('إجمالي الفجوة المتبقية')}
                        value={fmt(stats.totalVariance)}
                        suffix={sym}
                        icon={<Clock size={18} />}
                        color="#ef4444"
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                            <div style={{ minWidth: '160px' }}>
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

                        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                placeholder={t("ابحث برقم الأمر أو المورد...")}
                                value={q} onChange={e => setQ(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 45px 0 15px',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    outline: 'none', fontFamily: CAIRO, fontWeight: 500
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ color: C.textSecondary, fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{t('من:')}</span>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                                style={{
                                    ...IS, height: '42px', padding: '0 12px',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                            <span style={{ color: C.textSecondary, fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{t('إلى:')}</span>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)}
                                style={{
                                    ...IS, height: '42px', padding: '0 12px',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <TableSkeleton />
                    ) : (
                        <div className="print-table-container">
                            <DataTable
                                columns={columns}
                                data={filteredMatches}
                                emptyIcon={FileText}
                                emptyMessage={t('لا توجد حركات مطابقة متوفرة للفترة المحددة')}
                            />
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
