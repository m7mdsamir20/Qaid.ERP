'use client';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import TableSkeleton from '@/components/TableSkeleton';
import { formatNumber } from '@/lib/currency';
import * as XLSX from 'xlsx';
import { applyExcelMoneyFormat } from '@/lib/excelFormat';

import DashboardLayout from '@/components/DashboardLayout';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from '@/lib/i18n';
import { navSections } from '@/constants/navigation';

const t = (s: string) => s;
const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': t('ج.م'), 'SAR': t('ر.س'), 'AED': t('د.إ'), 'USD': '$', 'KWD': t('د.ك'), 'QAR': t('ر.ق'), 'BHD': t('د.ب'), 'OMR': t('ر.ع'), 'JOD': t('د.أ') };
    return map[code] || code;
};
import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import StatCard from '@/components/StatCard';
import { useEffect, useState } from 'react';
import { Users, Truck, Phone, Search, Loader2, ArrowUpRight, ArrowDownLeft, UserCheck, TrendingUp, CheckCircle } from 'lucide-react';

interface PartnerBalance {
    id: string;
    name: string;
    phone: string | null;
    balance: number;
    type: string;
    partnerType: 'customer' | 'supplier';
}

interface ReportResult {
    data: PartnerBalance[];
    totalCustomerBalance: number;
    totalSupplierBalance: number;
}

export default function ClientsSuppliersBalancesPage() {
    const { fMoney, fMoneyJSX } = useCurrency();
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

    const [result, setResult] = useState<ReportResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState<'all' | 'customer' | 'supplier' | 'debtor' | 'creditor'>('all');
    const [search, setSearch] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (branchId && branchId !== 'all') params.set('branchId', branchId);
        fetch(`/api/reports/balances?${params}`)
            .then(res => {
                if (!res.ok) throw new Error('server_error');
                return res.json();
            })
            .then(d => {
                if (d && Array.isArray(d.data)) setResult(d);
                else setError(t("استجابة غير متوقعة من الخادم"));
            })
            .catch(() => setError(t("فشل تحميل بيانات الأرصدة، يرجى المحاولة لاحقاً")))
            .finally(() => setLoading(false));
    }, [branchId]);

    let filteredData = result?.data || [];
    
    if (!hasSuppliers) {
        filteredData = filteredData.filter(d => d.partnerType !== 'supplier');
    }
    if (!hasCustomers) {
        filteredData = filteredData.filter(d => d.partnerType !== 'customer');
    }

    // Search filter
    if (search) {
        filteredData = filteredData.filter(d => 
            d.name.toLowerCase().includes(search.toLowerCase()) || 
            (d.phone && d.phone.includes(search))
        );
    }

    // Type/Status filter
    if (filter === 'customer') filteredData = filteredData.filter(d => d.partnerType === 'customer');
    if (filter === 'supplier') filteredData = filteredData.filter(d => d.partnerType === 'supplier');
    if (filter === 'debtor') filteredData = filteredData.filter(d => (d.partnerType === 'customer' && d.balance > 0) || (d.partnerType === 'supplier' && d.balance < 0));
    if (filter === 'creditor') filteredData = filteredData.filter(d => (d.partnerType === 'customer' && d.balance < 0) || (d.partnerType === 'supplier' && d.balance > 0));

    // Summary calculation for the filtered list
    let summaryMaden = 0; // مدين (عليه فلوس لنا) -> (Customer with + balance) OR (Supplier with - balance)
    let summaryDaen = 0;  // دائن (له فلوس عندنا) -> (Customer with - balance) OR (Supplier with + balance)

    filteredData.forEach(p => {
        if (p.partnerType === 'customer') {
            if (p.balance > 0) summaryMaden += p.balance; // عليه
            else summaryDaen += Math.abs(p.balance); // له
        } else {
            if (p.balance > 0) summaryDaen += p.balance; // له (المورد يطالبنا)
            else summaryMaden += Math.abs(p.balance); // عليه (لنا فلوس عند المورد)
        }
    });

    const sym = t(getCurrencyName(currency));
    const exportToExcel = () => {
        if (!filteredData.length) return;
        const excelData = filteredData.map(p => {
            let maden = 0;
            let daen = 0;
            if (p.partnerType === 'customer') {
                if (p.balance > 0) maden = p.balance;
                else daen = Math.abs(p.balance);
            } else {
                if (p.balance > 0) daen = p.balance;
                else maden = Math.abs(p.balance);
            }
            return {
                ...(hasCustomers && hasSuppliers ? { [t('النوع')]: p.partnerType === 'customer' ? t('عميل') : t('مورد') } : {}),
                [t('الاسم')]: p.name,
                [t('الهاتف')]: p.phone || '—',
                [t('مدين (عليه)')]: maden,
                [t('دائن (له)')]: daen,
                [t('صافي الرصيد')]: p.balance
            };
        });
        const ws = XLSX.utils.json_to_sheet(excelData);
        applyExcelMoneyFormat(ws, currency, lang);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('الأرصدة'));
        const fileName = hasCustomers && hasSuppliers
            ? t('ارصدة_العملاء_والموردين')
            : hasCustomers
                ? t('ارصدة_العملاء')
                : t('ارصدة_الموردين');
        XLSX.writeFile(wb, `${fileName}_${new Date().toLocaleDateString('en-ZA')}.xlsx`);
    };

    const columns: TableColumn[] = [
        ...(hasCustomers && hasSuppliers ? [
            {
                header: t('النوع'),
                cell: (row: PartnerBalance) => (
                    <span style={{
                        padding: '4px 10px', borderRadius: '8px', fontSize: '10.5px', fontWeight: 600, fontFamily: CAIRO,
                        background: row.partnerType === 'customer' ? 'rgba(37, 106, 244,0.1)' : 'rgba(245,158,11,0.1)',
                        color: row.partnerType === 'customer' ? '#256af4' : '#f59e0b'
                    }}>
                        {row.partnerType === 'customer' ? t('عميل') : t('مورد')}
                    </span>
                )
            }
        ] : []),
        {
            header: t('الاسم'),
            cell: (row: PartnerBalance) => row.name,
            style: { fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, fontSize: '13px' }
        },
        {
            header: t('الهاتف'),
            cell: (row: PartnerBalance) => row.phone || '—',
            style: { fontSize: '12.5px', color: C.textSecondary, fontFamily: OUTFIT, textAlign: 'center' } as React.CSSProperties
        },
        ...(filter === 'all' ? [
            {
                header: t('عليه (مدين)'),
                type: 'number' as const,
                cell: (row: PartnerBalance) => {
                    let maden = 0;
                    if (row.partnerType === 'customer') {
                        if (row.balance > 0) maden = row.balance;
                    } else {
                        if (row.balance < 0) maden = Math.abs(row.balance);
                    }
                    return maden > 0 ? fMoneyJSX(maden) : '—';
                },
                style: { fontWeight: 600, color: '#ef4444', fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' } as React.CSSProperties
            },
            {
                header: t('له (دائن)'),
                type: 'number' as const,
                cell: (row: PartnerBalance) => {
                    let daen = 0;
                    if (row.partnerType === 'customer') {
                        if (row.balance < 0) daen = Math.abs(row.balance);
                    } else {
                        if (row.balance > 0) daen = row.balance;
                    }
                    return daen > 0 ? fMoneyJSX(daen) : '—';
                },
                style: { fontWeight: 600, color: '#10b981', fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' } as React.CSSProperties
            }
        ] : [
            {
                header: t('الوضع المالي'),
                cell: (row: PartnerBalance) => {
                    const owesUs = (row.partnerType === 'customer' && row.balance > 0) || (row.partnerType === 'supplier' && row.balance < 0);
                    return row.balance === 0 ? (
                        <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{t('رصيد صفري')}</span>
                    ) : (
                        <span style={{
                            padding: '4px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO,
                            background: owesUs ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                            border: `1px solid ${owesUs ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                            color: owesUs ? '#ef4444' : '#10b981'
                        }}>
                            {owesUs ? t('عليه (مدين لنا)') : t('له (دائن يطالبنا)')}
                        </span>
                    );
                }
            },
            {
                header: t('صافي الرصيد'),
                type: 'number' as const,
                cell: (row: PartnerBalance) => {
                    const owesUs = (row.partnerType === 'customer' && row.balance > 0) || (row.partnerType === 'supplier' && row.balance < 0);
                    const weOweThem = (row.partnerType === 'customer' && row.balance < 0) || (row.partnerType === 'supplier' && row.balance > 0);
                    const owesColor = owesUs ? '#ef4444' : weOweThem ? '#10b981' : C.textMuted;
                    return (
                        <span style={{ color: owesColor }}>
                            {formatNumber(Math.abs(row.balance))} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                        </span>
                    );
                },
                style: { fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT, textAlign: 'center' } as React.CSSProperties
            }
        ])
    ];

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={hasCustomers && hasSuppliers 
                        ? t("أرصدة العملاء والموردين") 
                        : hasCustomers 
                            ? t("أرصدة العملاء") 
                            : t("أرصدة الموردين")}
                    subtitle={hasCustomers && hasSuppliers 
                        ? t("تقرير شامل يعرض جميع المستحقات (ما لنا وما علينا) لكل حساب.") 
                        : hasCustomers 
                            ? t("تقرير شامل يعرض أرصدة ومستحقات جميع العملاء.") 
                            : t("تقرير شامل يعرض أرصدة ومستحقات جميع الموردين.")}
                    backTab="partners"
                    printTitle={hasCustomers && hasSuppliers 
                        ? t("تقرير أرصدة العملاء والموردين") 
                        : hasCustomers 
                            ? t("تقرير أرصدة العملاء") 
                            : t("تقرير أرصدة الموردين")}
                    branchName={selectedBranchName}
                    onExportExcel={exportToExcel}
                />

                {!loading && (
                    <div data-print-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '24px' }}>
                        <StatCard
                            label={t('إجمالي مديونيات الغير (أرصدة مدينة)')}
                            value={summaryMaden}
                            suffix={sym}
                            icon={<TrendingUp size={18} />}
                            color="#ef4444"
                            formatValue={true}
                        />
                        <StatCard
                            label={t('إجمالي التزامات الشركة (أرصدة دائنة)')}
                            value={summaryDaen}
                            suffix={sym}
                            icon={<CheckCircle size={18} />}
                            color="#10b981"
                            formatValue={true}
                        />
                    </div>
                )}

                <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                        <div style={{ position: 'relative', width: '240px', flexShrink: 0 }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                placeholder={t("ابحث باسم الحساب أو رقم الهاتف...")}
                                value={search} onChange={e => setSearch(e.target.value)}
                                style={{ 
                                    ...IS, width: '100%', height: '42px', padding: '0 45px 0 15px', 
                                    borderRadius: '12px', border: `1px solid ${C.border}`, 
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px', 
                                    outline: 'none', fontFamily: CAIRO, fontWeight: 500 
                                }}
                            />
                        </div>

                        {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                            <div style={{ minWidth: '150px', flexShrink: 0 }}>
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

                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: 1, paddingBottom: '4px', alignItems: 'center', minWidth: '280px' }}>
                            {[
                                { key: 'all', label: t('الكل'), icon: UserCheck, color: C.primary },
                                ...(hasCustomers ? [{ key: 'customer', label: t('العملاء'), icon: Users, color: '#256af4' }] : []),
                                ...(hasSuppliers ? [{ key: 'supplier', label: t('الموردين'), icon: Truck, color: '#fb923c' }] : []),
                                { key: 'debtor', label: t('المدينون'), icon: ArrowUpRight, color: '#ef4444' },
                                { key: 'creditor', label: t('الدائنون'), icon: ArrowDownLeft, color: '#10b981' },
                            ].map(t_btn => (
                                <button
                                    key={t_btn.key}
                                    onClick={() => setFilter(t_btn.key as 'all' | 'customer' | 'supplier' | 'debtor' | 'creditor')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '7px 14px', borderRadius: '10px',
                                        background: filter === t_btn.key ? `${t_btn.color}15` : C.card,
                                        color: filter === t_btn.key ? t_btn.color : C.textSecondary,
                                        border: `1px solid ${filter === t_btn.key ? `${t_btn.color}30` : C.border}`,
                                        fontWeight: filter === t_btn.key ? 800 : 700, fontSize: '12.5px',
                                        fontFamily: CAIRO, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
                                    }}
                                >
                                    <t_btn.icon size={14} /> {t_btn.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', marginBottom: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                        <span style={{ fontSize: '13px' }}>⚠️</span>
                        {t(error)}
                        <button onClick={() => setError('')} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}></button>
                    </div>
                )}

                {loading ? ( <TableSkeleton /> ) : (
                    <div className="print-table-container">
                        <DataTable
                            columns={columns}
                            data={filteredData}
                            emptyIcon={Users}
                            emptyMessage={t('لا توجد حسابات حالياً')}
                        />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
