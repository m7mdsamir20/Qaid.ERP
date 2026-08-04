"use client";
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Plus, Loader2, Building2, Package, History } from 'lucide-react';
import { C, CAIRO, OUTFIT, PAGE_BASE, TABLE_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useTranslation } from '@/lib/i18n';

interface TransferLine {
    item: { name: string };
    quantity: number;
}

interface Transfer {
    id: string;
    code: string;
    transferNumber: number;
    date: string;
    fromWarehouse: { name: string };
    toWarehouse: { name: string };
    notes: string;
    lines: TransferLine[];
}

export default function WarehouseTransfersPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/warehouse-transfers');
            if (res.ok) setTransfers(await res.json());
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const columns: TableColumn[] = [
        {
            header: t('رقم التحويل'),
            cell: (row: Transfer) => (
                <div style={{ color: C.primary, fontWeight: 600, fontFamily: OUTFIT, fontSize: '11px', opacity: 0.8 }}>
                    {row.code || `TRF-${String(row.transferNumber).padStart(5, '0')}`}
                </div>
            ),
            style: { width: '120px' }
        },
        {
            header: t('التاريخ'),
            type: 'date',
            cell: (row: Transfer) => new Date(row.date).toLocaleDateString('en-ZA')
        },
        {
            header: t('من مخزن'),
            cell: (row: Transfer) => (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(251,113,133,0.05)', color: '#fb7185', fontSize: '12px', fontWeight: 600 }}>
                    <Building2 size={12} /> {row.fromWarehouse?.name || '—'}
                </div>
            )
        },
        {
            header: t('إلى مخزن'),
            cell: (row: Transfer) => (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(52,211,153,0.05)', color: '#34d399', fontSize: '12px', fontWeight: 600 }}>
                    <Building2 size={12} /> {row.toWarehouse?.name || '—'}
                </div>
            )
        },
        {
            header: t('الأصناف المحولة'),
            cell: (row: Transfer) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                    {row.lines.map((l, i) => (
                        <div key={i} style={{ 
                            fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', 
                            border: `1px solid ${C.border}`, color: C.textPrimary,
                            fontWeight: 600, width: 'fit-content'
                        }}>
                            {l.item?.name} <span style={{ color: C.primary, marginInlineStart: '4px' }}>({l.quantity})</span>
                        </div>
                    ))}
                </div>
            )
        },
        {
            header: t('الملاحظات'),
            cell: (row: Transfer) => row.notes || '—',
            style: { maxWidth: '150px' }
        }
    ];

    return (
        <DashboardLayout>
            <div style={PAGE_BASE}>
                <PageHeader
                    title={t("التحويل بين المخازن")}
                    subtitle={t("متابعة حركة المخزون ونقل البضائع بين الفروع والمستودعات بشكل دقيق")}
                    icon={ArrowRightLeft}
                    primaryButton={{
                        label: t("تحويل جديد"),
                        onClick: () => router.push('/warehouse-transfers/new'),
                        icon: Plus
                    }}
                />

                {loading ? (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: C.textSecondary }}>
                        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                        <p style={{ fontFamily: CAIRO, fontWeight: 600 }}>{t('جاري تحميل سجل التحويلات...')}</p>
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={transfers}
                        emptyIcon={History}
                        emptyMessage={t('لا توجد عمليات تحويل مسجلة حالياً')}
                    />
                )}
            </div>
            <style jsx global>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}

