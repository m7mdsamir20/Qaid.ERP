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
import PageHeader from '@/components/PageHeader';
import { Activity, Landmark, Wallet, CheckCircle2, TrendingUp, TrendingDown, Save, ClipboardList, Loader2 } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

const SC = '#10b981';
const DC = '#ef4444';

interface TreasuryItem { id: string; name: string; type: string; balance: number; branchId?: string | null; }

export default function TreasuryReconciliationFormPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';
    const { fMoneyJSX, symbol: sym } = useCurrency();

    const [treasuries, setTreasuries] = useState<TreasuryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [physicalBalances, setPhysicalBalances] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState('');

    const fetchTreasuries = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/treasuries');
            if (res.ok) setTreasuries(await res.json());
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchTreasuries(); }, []);

    const totals = treasuries.reduce((acc, t) => {
        const sys = t.balance;
        const act = parseFloat(physicalBalances[t.id]) || 0;
        const hasAct = physicalBalances[t.id] !== undefined && physicalBalances[t.id] !== '';
        acc.systemTotal += sys;
        if (hasAct) {
            acc.actualTotal += act;
            const diff = act - sys;
            if (diff < 0) acc.totalShortage += Math.abs(diff);
            if (diff > 0) acc.totalSurplus += diff;
            acc.reconciledCount++;
        }
        return acc;
    }, { systemTotal: 0, actualTotal: 0, totalShortage: 0, totalSurplus: 0, reconciledCount: 0 });

    const handleSave = async () => {
        const hasAny = treasuries.some(t => physicalBalances[t.id] !== undefined && physicalBalances[t.id] !== '');
        if (!hasAny) { alert(t('أدخل رصيداً فعلياً لخزينة واحدة على الأقل')); return; }
        setSaving(true);
        try {
            const items = treasuries.map(t => {
                const sys = t.balance;
                const act = parseFloat(physicalBalances[t.id]) || 0;
                const hasAct = physicalBalances[t.id] !== undefined && physicalBalances[t.id] !== '';
                const diff = hasAct ? act - sys : 0;
                return {
                    treasuryId: t.id, treasuryName: t.name, type: t.type,
                    branchId: t.branchId || null,
                    systemBalance: sys, physicalBalance: hasAct ? act : null,
                    diff: hasAct ? diff : null,
                    status: !hasAct ? 'not_counted' : diff === 0 ? 'matched' : diff < 0 ? 'shortage' : 'surplus'
                };
            });
            const body = {
                notes: notes || null, items,
                totalSystem: totals.systemTotal,
                totalPhysical: totals.actualTotal,
                totalShortage: totals.totalShortage,
                totalSurplus: totals.totalSurplus,
            };
            const res = await fetch('/api/reports/reconciliation-snapshots', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
            });
            if (res.ok) {
                alert(t('تم حفظ نتيجة الجرد بنجاح'));
                setPhysicalBalances({});
                setNotes('');
                fetchTreasuries();
            } else { alert(t('فشل في حفظ الجرد')); }
        } catch { alert(t('خطأ في الاتصال')); } finally { setSaving(false); }
    };

    const columns: TableColumn[] = [
        {
            header: t('المرجع المالي'),
            cell: (row: TreasuryItem) => (
                <>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{row.name}</div>
                    <div style={{ fontSize: '11px', color: C.textSecondary, fontFamily: OUTFIT }}>ID: {row.id.substring(0, 8)}</div>
                </>
            )
        },
        {
            header: t('النوع'),
            cell: (row: TreasuryItem) => (
                row.type === 'bank'
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6366f1', padding: '4px 10px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO }}><Landmark size={14} /> {t('بنكي')}</span>
                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: SC, padding: '4px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO }}><Wallet size={14} /> {t('نقدي')}</span>
            ),
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الرصيد الدفتري'),
            type: 'number' as const,
            cell: (row: TreasuryItem) => fMoneyJSX(row.balance),
            style: { fontWeight: 600, fontSize: '14.5px', fontFamily: OUTFIT, color: C.textPrimary, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الرصيد الفعلي (عَدّ يدوي)'),
            cell: (row: TreasuryItem) => (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <input type="number" placeholder={t("أدخل المبلغ...")}
                        value={physicalBalances[row.id] || ''}
                        onChange={e => setPhysicalBalances(prev => ({ ...prev, [row.id]: e.target.value }))}
                        style={{ width: '140px', height: '36px', borderRadius: '8px', border: `1px solid ${physicalBalances[row.id] ? C.primary : C.border}`, background: physicalBalances[row.id] ? `${C.primary}08` : C.card, color: C.textPrimary, fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, outline: 'none', textAlign: 'center' }} />
                </div>
            ),
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الفارق (عجز/زيادة)'),
            type: 'number' as const,
            cell: (row: TreasuryItem) => {
                const sys = row.balance;
                const act = parseFloat(physicalBalances[row.id]) || 0;
                const diff = act - sys;
                const hasActual = physicalBalances[row.id] !== undefined && physicalBalances[row.id] !== '';
                if (!hasActual) return '—';
                return (
                    <span style={{ fontWeight: 600, color: diff > 0 ? SC : diff < 0 ? DC : C.primary, fontSize: '15px', fontFamily: OUTFIT }}>
                        {diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff)} <span style={{ fontFamily: CAIRO, fontSize: '10px' }}>{sym}</span>
                    </span>
                );
            },
            style: { textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('حالة الجرد'),
            cell: (row: TreasuryItem) => {
                const sys = row.balance;
                const act = parseFloat(physicalBalances[row.id]) || 0;
                const diff = act - sys;
                const hasActual = physicalBalances[row.id] !== undefined && physicalBalances[row.id] !== '';
                if (!hasActual) return <span style={{ color: C.textSecondary, fontSize: '11px', fontWeight: 700, fontFamily: CAIRO }}>{t('غير مجرود')}</span>;
                if (diff === 0) return <span style={{ color: SC, display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO, background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '8px' }}><CheckCircle2 size={14} /> {t('مطابق')}</span>;
                if (diff < 0) return <span style={{ color: DC, display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO, background: 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: '8px' }}><TrendingDown size={14} /> {t('عجز')}</span>;
                return <span style={{ color: SC, display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO, background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '8px' }}><TrendingUp size={14} /> {t('زيادة')}</span>;
            },
            style: { textAlign: 'center' } as React.CSSProperties
        }
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <PageHeader
                    title={t("مطابقة الخزائن والدرج")}
                    subtitle={t("أدخل المبالغ النقدية الفعلية لمطابقتها مع الأرصدة الدفترية وتأكيد تسوية اليوم.")}
                    icon={ClipboardList}
                />

                {loading ? <TableSkeleton /> : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                            <div style={{ padding: '16px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 600, fontFamily: CAIRO }}>{t('الرصيد الدفتري الإجمالي')}</span>
                                <span style={{ fontSize: '20px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{formatNumber(totals.systemTotal)} <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{sym}</span></span>
                            </div>
                            <div style={{ padding: '16px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 600, fontFamily: CAIRO }}>{t('الرصيد الفعلي الإجمالي')}</span>
                                <span style={{ fontSize: '20px', fontWeight: 600, color: SC, fontFamily: OUTFIT }}>{formatNumber(totals.actualTotal)} <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{sym}</span></span>
                            </div>
                            <div style={{ padding: '16px', background: 'rgba(239,68,68,0.04)', border: `1px solid ${DC}25`, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 600, fontFamily: CAIRO }}>{t('إجمالي العجز')}</span>
                                <span style={{ fontSize: '20px', fontWeight: 600, color: DC, fontFamily: OUTFIT }}>{formatNumber(totals.totalShortage)} <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{sym}</span></span>
                            </div>
                            <div style={{ padding: '16px', background: 'rgba(16,185,129,0.04)', border: `1px solid ${SC}25`, borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 600, fontFamily: CAIRO }}>{t('إجمالي الزيادة')}</span>
                                <span style={{ fontSize: '20px', fontWeight: 600, color: SC, fontFamily: OUTFIT }}>{formatNumber(totals.totalSurplus)} <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{sym}</span></span>
                            </div>
                        </div>

                        <DataTable
                            columns={columns}
                            data={treasuries}
                            emptyIcon={Wallet}
                            emptyMessage={t('لا توجد خزن أو بنوك حالياً لإجراء الجرد والمطابقة')}
                        />

                        <div style={{ marginTop: '24px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.textSecondary, marginBottom: '8px', fontFamily: CAIRO }}>{t('ملاحظات وتوصيات التسوية')}</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder={t("أضف أي تفاصيل أو أسباب لوجود عجز أو زيادة...")}
                                    style={{ width: '100%', minHeight: '80px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.subtle, color: C.textPrimary, padding: '10px', fontSize: '13px', fontFamily: CAIRO, outline: 'none', resize: 'vertical' }}
                                />
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{ ...BTN_PRIMARY, alignSelf: 'flex-end', height: '42px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontFamily: CAIRO }}
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {t('حفظ واعتماد المطابقة')}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
