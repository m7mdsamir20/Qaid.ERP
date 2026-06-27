'use client';
import TableSkeleton from '@/components/TableSkeleton';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { formatNumber } from '@/lib/currency';
import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, IS, OUTFIT, BTN_PRIMARY } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import StatCard from '@/components/StatCard';
import { Activity, RefreshCw, Landmark, Wallet, CheckCircle2, TrendingUp, TrendingDown, Search, Loader2, FileText, ClipboardList } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

const SC = '#10b981';
const DC = '#ef4444';

interface Snapshot {
    id: string; createdAt: string; notes: string | null;
    totalSystem: number; totalPhysical: number; totalShortage: number; totalSurplus: number;
    items: { treasuryName: string; type: string; systemBalance: number; physicalBalance: number; diff: number; status: string }[];
}

export default function TreasuryReconciliationReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';
    const { symbol: sym } = useCurrency();

    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
    const [historyQ, setHistoryQ] = useState('');

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    const fetchSnapshots = async () => {
        setLoading(true);
        try {
            let url = '/api/reports/reconciliation-snapshots';
            if (branchId && branchId !== 'all') {
                url += `?branchId=${branchId}`;
            }
            const res = await fetch(url);
            if (res.ok) setSnapshots(await res.json());
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchSnapshots();
    }, [branchId]);

    const filteredSnapshots = snapshots.filter(s =>
        !historyQ ||
        new Date(s.createdAt).toLocaleDateString('en-ZA').includes(historyQ) ||
        (s.notes || '').toLowerCase().includes(historyQ.toLowerCase())
    );

    const historyDetailColumns: TableColumn[] = [
        {
            header: t('الخزينة/البنك'),
            cell: (row: any) => row.treasuryName,
            style: { fontFamily: CAIRO, fontWeight: 600, color: C.textPrimary, fontSize: '13px' }
        },
        {
            header: t('النوع'),
            cell: (row: any) => (
                row.type === 'bank'
                    ? <span style={{ color: '#6366f1', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO }}>{t('بنكي')}</span>
                    : <span style={{ color: SC, fontSize: '11px', fontWeight: 600, fontFamily: CAIRO }}>{t('نقدي')}</span>
            ),
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الرصيد الدفتري'),
            type: 'number' as const,
            cell: (row: any) => (
                <>{formatNumber(row.systemBalance || 0)} <span style={{ fontFamily: CAIRO, fontSize: '10px' }}>{sym}</span></>
            ),
            style: { fontFamily: OUTFIT, fontWeight: 600, color: C.textPrimary, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الرصيد الفعلي'),
            type: 'number' as const,
            cell: (row: any) => (
                row.physicalBalance != null ? <>{formatNumber(row.physicalBalance || 0)} <span style={{ fontFamily: CAIRO, fontSize: '10px' }}>{sym}</span></> : '—'
            ),
            style: { fontFamily: OUTFIT, fontWeight: 600, color: C.textPrimary, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الفارق'),
            type: 'number' as const,
            cell: (row: any) => {
                const color = row.diff == null ? C.textMuted : row.diff > 0 ? SC : row.diff < 0 ? DC : C.primary;
                return (
                    <span style={{ color }}>
                        {row.diff != null ? <>{row.diff > 0 ? '+' : ''}{formatNumber(row.diff || 0)} <span style={{ fontFamily: CAIRO, fontSize: '10px' }}>{sym}</span></> : '—'}
                    </span>
                );
            },
            style: { fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الحالة'),
            cell: (row: any) => (
                <>
                    {row.status === 'matched' && <span style={{ color: SC, fontSize: '11px', fontWeight: 600, fontFamily: CAIRO, background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '6px' }}>{t('مطابق')}</span>}
                    {row.status === 'shortage' && <span style={{ color: DC, fontSize: '11px', fontWeight: 600, fontFamily: CAIRO, background: 'rgba(239,68,68,0.1)', padding: '3px 8px', borderRadius: '6px' }}>{t('عجز')}</span>}
                    {row.status === 'surplus' && <span style={{ color: SC, fontSize: '11px', fontWeight: 600, fontFamily: CAIRO, background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '6px' }}>{t('زيادة')}</span>}
                    {row.status === 'not_counted' && <span style={{ color: C.textSecondary, fontSize: '11px', fontWeight: 700, fontFamily: CAIRO }}>{t('غير مجرود')}</span>}
                </>
            ),
            style: { textAlign: 'center' } as React.CSSProperties
        }
    ];

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("سجل تسويات وجرد الخزينة")}
                    subtitle={t("سجلات ومطابقات الأرصدة الفعلية بالأرصدة الدفترية للخزن والحسابات البنكية.")}
                    backTab="treasury-bank"
                    branchName={selectedBranchName}
                    printTitle={selectedSnapshot ? t("تقرير تسوية وجرد الخزينة") : undefined}
                    printDate={selectedSnapshot ? new Date(selectedSnapshot.createdAt).toLocaleDateString('en-ZA') : undefined}
                />

                {!selectedSnapshot ? (
                    <>
                        {/* Filters */}
                        <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                                <div style={{ minWidth: '180px' }}>
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
                                    placeholder={t("ابحث بالتاريخ أو الملاحظات...")}
                                    value={historyQ}
                                    onChange={e => setHistoryQ(e.target.value)}
                                    style={{
                                        ...IS, width: '100%', height: '42px', padding: '0 45px 0 15px',
                                        borderRadius: '12px', border: `1px solid ${C.border}`,
                                        background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                        outline: 'none', fontFamily: CAIRO, fontWeight: 500
                                    }}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <TableSkeleton />
                        ) : filteredSnapshots.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                                <FileText size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد سجلات تسوية')}</h3>
                                <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textSecondary, fontFamily: CAIRO }}>{t('لم يتم العثور على أي مطابقات محفوظة للفترة أو الفرع المختار.')}</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {filteredSnapshots.map(snap => (
                                    <div
                                        key={snap.id}
                                        onClick={() => setSelectedSnapshot(snap)}
                                        style={{
                                            background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px',
                                            padding: '18px 24px', cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.borderColor = C.primary)}
                                        onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                                    >
                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(37, 106, 244,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                                                <ClipboardList size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '13.5px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>
                                                    {t('جرد')} — {new Date(snap.createdAt).toLocaleDateString('en-ZA')}
                                                </div>
                                                <div style={{ fontSize: '11.5px', color: C.textSecondary, fontFamily: CAIRO, marginTop: '2px' }}>
                                                    {new Date(snap.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                                    {snap.notes && ` — ${snap.notes}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                            {snap.totalShortage > 0 && <span style={{ fontSize: '12.5px', color: DC, fontWeight: 700, fontFamily: CAIRO }}>{t("عجز:")} {formatNumber(snap.totalShortage)} {sym}</span>}
                                            {snap.totalSurplus > 0 && <span style={{ fontSize: '12.5px', color: SC, fontWeight: 700, fontFamily: CAIRO }}>{t("زيادة:")} {formatNumber(snap.totalSurplus)} {sym}</span>}
                                            {snap.totalShortage === 0 && snap.totalSurplus === 0 && <span style={{ fontSize: '12px', color: SC, fontWeight: 600, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14} /> {t('مطابق تماماً')}</span>}
                                            <span style={{ fontSize: '11px', color: C.primary, fontWeight: 700, fontFamily: CAIRO }}>{t('عرض التفاصيل')} ◄</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    /* Snapshot detail view */
                    <>
                        <button
                            onClick={() => setSelectedSnapshot(null)}
                            className="no-print"
                            style={{
                                marginBottom: '16px', height: '38px', padding: '0 16px', borderRadius: '10px',
                                background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary,
                                fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex',
                                alignItems: 'center', gap: '6px', fontFamily: CAIRO
                            }}
                        >
                            ◄ {t('رجوع للسجل')}
                        </button>

                        <div data-print-stats style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            <StatCard
                                label={t('الرصيد الدفتري')}
                                value={selectedSnapshot.totalSystem}
                                suffix={sym}
                                icon={<Activity size={18} />}
                                color="#256af4"
                                formatValue={true}
                            />
                            <StatCard
                                label={t('الرصيد الفعلي')}
                                value={selectedSnapshot.totalPhysical}
                                suffix={sym}
                                icon={<CheckCircle2 size={18} />}
                                color={C.primary}
                                formatValue={true}
                            />
                            <StatCard
                                label={t('إجمالي العجز')}
                                value={selectedSnapshot.totalShortage}
                                suffix={sym}
                                icon={<TrendingDown size={18} />}
                                color={DC}
                                formatValue={true}
                            />
                            <StatCard
                                label={t('إجمالي الزيادة')}
                                value={selectedSnapshot.totalSurplus}
                                suffix={sym}
                                icon={<TrendingUp size={18} />}
                                color={SC}
                                formatValue={true}
                            />
                        </div>

                        <div className="print-table-container">
                            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card }}>
                                <span style={{ fontFamily: CAIRO, fontWeight: 600, color: C.textPrimary, fontSize: '13.5px' }}>
                                    {t('جرد')} — {new Date(selectedSnapshot.createdAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' } as any)}
                                </span>
                                {selectedSnapshot.notes && <span style={{ fontSize: '12.5px', color: C.textSecondary, fontFamily: CAIRO }}>{selectedSnapshot.notes}</span>}
                            </div>
                            <DataTable
                                columns={historyDetailColumns}
                                data={selectedSnapshot.items}
                                emptyIcon={ClipboardList}
                                emptyMessage={t('لا توجد بنود جرد مسجلة')}
                            />
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
