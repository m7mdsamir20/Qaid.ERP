'use client';
import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { useEffect, useState } from 'react';
import { FileCheck, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, PAGE_BASE } from '@/constants/theme';
import { DataTable } from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import StatCard, { StatCardGrid } from '@/components/StatCard';
import { Currency } from '@/components/Currency';
import { formatNumber } from '@/lib/currency';

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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft:     { label: 'مسودة',  color: '#94a3b8' },
    active:    { label: 'نشط',   color: '#22c55e' },
    expired:   { label: 'منتهي', color: '#ef4444' },
    cancelled: { label: 'ملغي',  color: '#f59e0b' },
    suspended: { label: 'موقوف', color: '#8b5cf6' },
};

const BILLING_LABELS: Record<string, string> = {
    monthly:     'شهري',
    quarterly:   'ربع سنوي',
    semi_annual: 'نصف سنوي',
    annual:      'سنوي',
};

export default function ServiceContractsReportPage() {
    const { t } = useTranslation();
    const { symbol: sym } = useCurrency();
    const fmt = (n: number) => formatNumber(n);

    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [q, setQ] = useState('');

    useEffect(() => {
        setLoading(true);
        fetch('/api/service-contracts')
            .then(r => r.ok ? r.json() : [])
            .then(d => setContracts(Array.isArray(d) ? d : []))
            .catch(() => setContracts([]))
            .finally(() => setLoading(false));
    }, []);

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

    const totalValue    = filtered.reduce((s, c) => s + c.contractValue, 0);
    const activeCount   = filtered.filter(c => c.status === 'active').length;
    const expiringCount = filtered.filter(c => {
        if (!c.endDate || c.status !== 'active') return false;
        const days = Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000);
        return days >= 0 && days <= 30;
    }).length;

    const columns: TableColumn[] = [
        {
            header: 'رقم العقد',
            cell: (r: Contract) => (
                <span style={{ fontFamily: OUTFIT, color: C.primary, fontWeight: 700 }}>
                    SC-{String(r.contractNumber).padStart(5, '0')}
                </span>
            ),
        },
        {
            header: 'العميل',
            cell: (r: Contract) => r.customer?.name || <span style={{ color: C.textSecondary }}>—</span>,
        },
        {
            header: 'نوع الخدمة',
            cell: (r: Contract) => r.type,
        },
        {
            header: 'الحالة',
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
            header: 'تاريخ البداية',
            cell: (r: Contract) => new Date(r.startDate).toLocaleDateString('ar-EG'),
        },
        {
            header: 'تاريخ الانتهاء',
            cell: (r: Contract) => {
                if (!r.endDate) return <span style={{ color: C.textSecondary }}>—</span>;
                const days = Math.ceil((new Date(r.endDate).getTime() - Date.now()) / 86400000);
                const isExpiring = days >= 0 && days <= 30 && r.status === 'active';
                return (
                    <span style={{ color: isExpiring ? '#f59e0b' : 'inherit', fontWeight: isExpiring ? 700 : 400 }}>
                        {new Date(r.endDate).toLocaleDateString('ar-EG')}
                        {isExpiring && <span style={{ fontSize: '10px', marginInlineStart: '6px' }}>({days} يوم)</span>}
                    </span>
                );
            },
        },
        {
            header: 'الدورية',
            cell: (r: Contract) => BILLING_LABELS[r.billingCycle] || r.billingCycle,
        },
        {
            header: 'قيمة العقد',
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

    return (
        <DashboardLayout>
            <div dir="rtl" style={PAGE_BASE}>
                <ReportHeader
                    title="تقرير عقود الخدمة"
                    subtitle="ملخص عقود الخدمة — الحالة، القيم، والعقود القاربة الانتهاء"
                    backTab="services"
                    onPrint={() => {
                        const w = window.open('', '_blank');
                        if (!w) return;
                        w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>تقرير عقود الخدمة</title></head><body>${printContent()}</body></html>`);
                        w.document.close(); w.print();
                    }}
                />

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    <input
                        type="text" value={q} onChange={e => setQ(e.target.value)}
                        placeholder="بحث برقم العقد أو العميل أو النوع..."
                        style={{ flex: '1 1 220px', height: '42px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, padding: '0 14px', fontSize: '13px', fontFamily: CAIRO, outline: 'none' }}
                    />
                    <div style={{ flex: '0 0 160px' }}>
                        <CustomSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                            hideSearch
                            options={[
                                { value: 'all',       label: 'كل الحالات' },
                                { value: 'active',    label: 'نشط' },
                                { value: 'draft',     label: 'مسودة' },
                                { value: 'expired',   label: 'منتهي' },
                                { value: 'cancelled', label: 'ملغي' },
                                { value: 'suspended', label: 'موقوف' },
                            ]}
                        />
                    </div>
                    {contractTypes.length > 0 && (
                        <div style={{ flex: '0 0 180px' }}>
                            <CustomSelect
                                value={typeFilter}
                                onChange={setTypeFilter}
                                options={[{ value: 'all', label: 'كل أنواع الخدمات' }, ...contractTypes.map(tp => ({ value: tp, label: tp }))]}
                                placeholder="نوع الخدمة..."
                            />
                        </div>
                    )}
                </div>

                {/* Stats */}
                <StatCardGrid style={{ marginBottom: '24px' }}>
                    <StatCard label="إجمالي العقود"         value={filtered.length}             icon={<FileCheck size={18} />}      color="#256af4" />
                    <StatCard label="عقود نشطة"             value={activeCount}                  icon={<CheckCircle size={18} />}    color="#22c55e" />
                    <StatCard label="تنتهي خلال 30 يوم"     value={expiringCount}                icon={<AlertTriangle size={18} />}  color="#f59e0b" />
                    <StatCard label="إجمالي القيم"          value={`${fmt(totalValue)} ${sym}`} icon={<FileCheck size={18} />}      color="#8b5cf6" />
                </StatCardGrid>

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={filtered}
                    emptyIcon={FileCheck}
                    isLoading={loading}
                    emptyMessage="لا توجد عقود تطابق الفلتر المحدد"
                    onRowClick={(row: Contract) => window.open(`/service-contracts/${row.id}`, '_blank')}
                />
            </div>
        </DashboardLayout>
    );
}
