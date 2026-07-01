'use client';
import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { useEffect, useState } from 'react';
import { FileCheck, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, PAGE_BASE, IS } from '@/constants/theme';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import StatCard, { StatCardGrid } from '@/components/StatCard';
import { Currency } from '@/components/Currency';
import { formatNumber } from '@/lib/currency';
import TableSkeleton from '@/components/TableSkeleton';

interface Contract {
    id: string;
    contractNumber: number;
    type: string;
    status: string;
    startDate: string;
    endDate: string | null;
    contractValue: number;
    billingCycle: string;
    autoRenew: boolean;
    customer: { id: string; name: string } | null;
}

interface BranchOption {
    id: string;
    name: string;
}

export default function ServiceContractsReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { symbol: sym } = useCurrency();
    const fmt = (n: number) => formatNumber(n);

    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [q, setQ] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.ok ? r.json() : []).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (branchId && branchId !== 'all') params.set('branchId', branchId);
        fetch(`/api/service-contracts?${params}`)
            .then(r => r.ok ? r.json() : [])
            .then(d => setContracts(Array.isArray(d) ? d : []))
            .catch(() => setContracts([]))
            .finally(() => setLoading(false));
    }, [branchId]);

    const contractTypes = Array.from(new Set(contracts.map(c => c.type))).filter(Boolean);

    const filtered = contracts.filter(c => {
        if (statusFilter !== 'all' && c.status !== statusFilter) return false;
        if (typeFilter !== 'all' && c.type !== typeFilter) return false;
        if (q) {
            const term = q.toLowerCase();
            const num = `SC-${String(c.contractNumber).padStart(5, '0')}`;
            if (!num.includes(term) && !(c.customer?.name || '').toLowerCase().includes(term) && !c.type.toLowerCase().includes(term)) return false;
        }
        return true;
    });

    const STATUS_LABELS: Record<string, { label: string; color: string }> = {
        draft:     { label: t('مسودة'),  color: '#94a3b8' },
        active:    { label: t('نشط'),   color: '#22c55e' },
        expired:   { label: t('منتهي'), color: '#ef4444' },
        cancelled: { label: t('ملغي'),  color: '#f59e0b' },
        suspended: { label: t('موقوف'), color: '#8b5cf6' },
    };

    const BILLING_LABELS: Record<string, string> = {
        monthly:     t('شهري'),
        quarterly:   t('ربع سنوي'),
        semi_annual: t('نصف سنوي'),
        annual:      t('سنوي'),
    };

    const totalValue    = filtered.reduce((s, c) => s + c.contractValue, 0);
    const activeCount   = filtered.filter(c => c.status === 'active').length;
    const expiringCount = filtered.filter(c => {
        if (!c.endDate || c.status !== 'active') return false;
        const days = Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000);
        return days >= 0 && days <= 30;
    }).length;

    const columns: TableColumn[] = [
        {
            header: t('رقم العقد'),
            cell: (r: Contract) => (
                <span style={{ fontFamily: OUTFIT, color: C.primary, fontWeight: 700 }}>
                    SC-{String(r.contractNumber).padStart(5, '0')}
                </span>
            ),
        },
        {
            header: t('العميل'),
            cell: (r: Contract) => r.customer?.name || <span style={{ color: C.textSecondary }}>—</span>,
        },
        {
            header: t('نوع الخدمة'),
            cell: (r: Contract) => r.type,
        },
        {
            header: t('الحالة'),
            cell: (r: Contract) => {
                const s = STATUS_LABELS[r.status] || { label: r.status, color: C.textSecondary };
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', background: `${s.color}18`, color: s.color, fontSize: '11px', fontWeight: 700 }}>
                        {s.label}
                    </span>
                );
            },
        },
        {
            header: t('تاريخ البداية'),
            cell: (r: Contract) => new Date(r.startDate).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US'),
        },
        {
            header: t('تاريخ الانتهاء'),
            cell: (r: Contract) => {
                if (!r.endDate) return <span style={{ color: C.textSecondary }}>—</span>;
                const days = Math.ceil((new Date(r.endDate).getTime() - Date.now()) / 86400000);
                const isExpiring = days >= 0 && days <= 30 && r.status === 'active';
                return (
                    <span style={{ color: isExpiring ? '#f59e0b' : 'inherit', fontWeight: isExpiring ? 700 : 400 }}>
                        {new Date(r.endDate).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                        {isExpiring && <span style={{ fontSize: '10px', marginInlineStart: '6px' }}>({days} {t('يوم')})</span>}
                    </span>
                );
            },
        },
        {
            header: t('الدورية'),
            cell: (r: Contract) => BILLING_LABELS[r.billingCycle] || r.billingCycle,
        },
        {
            header: t('قيمة العقد'),
            cell: (r: Contract) => <Currency amount={r.contractValue} />,
        },
    ];

    const printContent = () => {
        const tableRows = filtered.map(c => {
            const num = `SC-${String(c.contractNumber).padStart(5, '0')}`;
            const s = STATUS_LABELS[c.status] || { label: c.status };
            const endDate = c.endDate ? new Date(c.endDate).toLocaleDateString('ar-EG') : '—';
            return `<tr>
                <td>${num}</td>
                <td>${c.customer?.name || '—'}</td>
                <td>${c.type}</td>
                <td>${s.label}</td>
                <td>${new Date(c.startDate).toLocaleDateString('ar-EG')}</td>
                <td>${endDate}</td>
                <td>${BILLING_LABELS[c.billingCycle] || c.billingCycle}</td>
                <td>${fmt(c.contractValue)} ${sym}</td>
            </tr>`;
        }).join('');
        return `<table border="1" cellpadding="6" style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:12px;">
            <thead style="background:#f1f5f9;"><tr>
                <th>رقم العقد</th><th>العميل</th><th>نوع الخدمة</th><th>الحالة</th>
                <th>تاريخ البداية</th><th>تاريخ الانتهاء</th><th>الدورية</th><th>القيمة</th>
            </tr></thead>
            <tbody>${tableRows}</tbody>
            <tfoot><tr><td colspan="7" style="text-align:right;font-weight:700;">الإجمالي</td>
                <td style="font-weight:700;">${fmt(totalValue)} ${sym}</td></tr></tfoot>
        </table>`;
    };

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير عقود الخدمة")}
                    subtitle={t("ملخص عقود الخدمة — الحالة، القيم، والعقود القاربة الانتهاء")}
                    backTab="services"
                    printTitle={t("تقرير عقود الخدمة")}
                    branchName={selectedBranchName}
                    onPrint={() => {
                        const w = window.open('', '_blank');
                        if (!w) return;
                        w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير عقود الخدمة</title></head><body>${printContent()}</body></html>`);
                        w.document.close(); w.print();
                    }}
                />

                {/* Filters */}
                <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center' }}>
                    {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                        <div style={{ minWidth: '160px', flex: '0 0 160px' }}>
                            <CustomSelect
                                value={branchId}
                                onChange={(v: string) => setBranchId(v)}
                                placeholder={t("كل الفروع")}
                                hideSearch
                                options={[
                                    { value: 'all', label: t('كل الفروع') },
                                    ...branches.map((b) => ({ value: b.id, label: b.name }))
                                ]}
                            />
                        </div>
                    )}
                    <div style={{ flex: '0 0 160px' }}>
                        <CustomSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                            hideSearch
                            options={[
                                { value: 'all',       label: t('كل الحالات') },
                                { value: 'active',    label: t('نشط') },
                                { value: 'draft',     label: t('مسودة') },
                                { value: 'expired',   label: t('منتهي') },
                                { value: 'cancelled', label: t('ملغي') },
                                { value: 'suspended', label: t('موقوف') },
                            ]}
                        />
                    </div>
                    {contractTypes.length > 0 && (
                        <div style={{ flex: '0 0 180px' }}>
                            <CustomSelect
                                value={typeFilter}
                                onChange={setTypeFilter}
                                options={[{ value: 'all', label: t('كل أنواع الخدمات') }, ...contractTypes.map(tp => ({ value: tp, label: tp }))]}
                                placeholder={t("نوع الخدمة...")}
                            />
                        </div>
                    )}
                </div>

                {loading ? (
                    <TableSkeleton />
                ) : contracts.length === 0 ? (
                    <div className="no-print" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <FileCheck size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t("لا توجد عقود خدمة")}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textSecondary, maxWidth: '400px', marginInline: 'auto', lineHeight: 1.6, fontFamily: CAIRO }}>{t("برجاء تعديل معايير البحث لعرض تفاصيل عقود الخدمة.")}</p>
                    </div>
                ) : (
                    <>
                        {/* Stats - 4 columns side by side */}
                        <StatCardGrid data-print-include cols={4} style={{ marginBottom: '24px' }}>
                            <StatCard label={t("إجمالي العقود")}         value={formatNumber(filtered.length)}             suffix={t("عقد")} icon={<FileCheck size={18} />}      color="#256af4" />
                            <StatCard label={t("عقود نشطة")}             value={formatNumber(activeCount)}                  suffix={t("عقد")} icon={<CheckCircle size={18} />}    color="#10b981" />
                            <StatCard label={t("تنتهي خلال 30 يوم")}     value={formatNumber(expiringCount)}                suffix={t("عقد")} icon={<AlertTriangle size={18} />}  color="#fb7185" />
                            <StatCard label={t("إجمالي القيم")}          value={formatNumber(totalValue)}                   suffix={sym}                        icon={<FileCheck size={18} />}      color="#8b5cf6" />
                        </StatCardGrid>

                        {/* Search Input Bar (Placed below cards, above the table) */}
                        <div className="no-print" style={{ position: 'relative', width: '100%', marginBottom: '20px' }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                type="text"
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                placeholder={t("بحث برقم العقد أو العميل أو النوع...")}
                                style={{
                                    width: '100%',
                                    height: '44px',
                                    paddingInlineStart: '42px',
                                    paddingInlineEnd: '14px',
                                    borderRadius: '12px',
                                    border: `1px solid ${C.border}`,
                                    background: C.card,
                                    color: C.textPrimary,
                                    fontSize: '13px',
                                    outline: 'none',
                                    fontFamily: CAIRO
                                }}
                            />
                        </div>

                        {/* Table */}
                        <DataTable
                            columns={columns}
                            data={filtered}
                            emptyIcon={FileCheck}
                            isLoading={loading}
                            emptyMessage={t("لا توجد عقود تطابق الفلتر المحدد")}
                            onRowClick={(row: Contract) => window.open(`/service-contracts/${row.id}`, '_blank')}
                        />
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
