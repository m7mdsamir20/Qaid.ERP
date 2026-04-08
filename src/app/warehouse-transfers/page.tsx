'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import {
    ArrowRightLeft, Plus, Loader2, Building2, Package, History
} from 'lucide-react';
import {
    C, CAIRO, INTER, PAGE_BASE, TABLE_STYLE, STitle
} from '@/constants/theme';
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
                    <div style={{ textAlign: 'center', padding: '100px 0', color: C.textMuted }}>
                        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                        <p style={{ fontFamily: CAIRO, fontWeight: 600 }}>{t('جاري تحميل سجل التحويلات...')}</p>
                    </div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <table style={TABLE_STYLE.table}>
                            <thead>
                                <tr style={TABLE_STYLE.thead}>
                                    <th style={{ ...TABLE_STYLE.th(true), width: '120px' }}>{t('رقم التحويل')}</th>
                                    <th style={TABLE_STYLE.th(false)}>{t('التاريخ')}</th>
                                    <th style={TABLE_STYLE.th(false)}>{t('من مخزن')}</th>
                                    <th style={TABLE_STYLE.th(false)}>{t('إلى مخزن')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'start' }}>{t('الأصناف المحولة')}</th>
                                    <th style={TABLE_STYLE.th(false)}>{t('الملاحظات')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transfers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '80px 0', textAlign: 'center', color: C.textMuted }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                                <History size={48} style={{ opacity: 0.2 }} />
                                                <div style={{ fontFamily: CAIRO, fontSize: '14px', fontWeight: 600 }}>{t('لا توجد عمليات تحويل مسجلة حالياً')}</div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : transfers.map((tf, idx) => (
                                    <tr 
                                        key={tf.id} 
                                        style={TABLE_STYLE.row(idx === transfers.length - 1)}
                                        onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
                                    >
                                        <td style={TABLE_STYLE.td(true)}>
                                            <div style={{ color: C.primary, fontWeight: 900, fontFamily: INTER, fontSize: '11px', opacity: 0.8 }}>
                                                {tf.code || `TRF-${tf.transferNumber}`}
                                            </div>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', color: C.textSecondary, fontSize: '12px', fontWeight: 600 }}>
                                            {new Date(tf.date).toLocaleDateString('en-GB')}
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(251,113,133,0.05)', color: '#fb7185', fontSize: '12px', fontWeight: 800 }}>
                                                <Building2 size={12} /> {tf.fromWarehouse?.name || '—'}
                                            </div>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(52,211,153,0.05)', color: '#34d399', fontSize: '12px', fontWeight: 800 }}>
                                                <Building2 size={12} /> {tf.toWarehouse?.name || '—'}
                                            </div>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), textAlign: 'start' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {tf.lines.map((l, i) => (
                                                    <div key={i} style={{ 
                                                        fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', 
                                                        border: `1px solid ${C.border}`, color: C.textPrimary,
                                                        fontWeight: 600, width: 'fit-content'
                                                    }}>
                                                        {l.item?.name} <span style={{ color: C.primary, marginInlineStart: '4px' }}>({l.quantity})</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', color: C.textMuted, fontSize: '11px', maxWidth: '150px' }}>
                                            {tf.notes || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <style jsx global>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}

