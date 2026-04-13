'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { Package, Activity, Search, Loader2, Warehouse, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { C, CAIRO, PAGE_BASE, IS, INTER } from '@/constants/theme';
import { useSession } from 'next-auth/react';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

interface Movement {
    id: string;
    type: string;
    quantity: number;
    description?: string;
    notes?: string;
    createdAt?: string;
    date?: string;
    warehouse: { name: string };
}

interface Item {
    id: string;
    name: string;
    code: string;
    unit: string;
    category: string;
    totalStock: number;
    stockByWarehouse: { warehouse: string; quantity: number }[];
}

export default function ItemMovementReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = (session?.user as any)?.currency || 'EGP';

    const [items, setItems] = useState<{ id: string, name: string, code: string }[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [movements, setMovements] = useState<Movement[]>([]);
    const [itemDetails, setItemDetails] = useState<Item | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingItems, setLoadingItems] = useState(true);
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        fetch('/api/reports/item-movement')
            .then(res => res.json())
            .then(d => { if (!d.error) setItems(d.items); })
            .catch(() => { })
            .finally(() => setLoadingItems(false));
    }, []);

    const fetchMovements = (id: string, targetBranchId = branchId) => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('itemId', id);
        if (targetBranchId && targetBranchId !== 'all') params.set('branchId', targetBranchId);
        fetch(`/api/reports/item-movement?${params}`)
            .then(res => res.json())
            .then(d => {
                if (!d.error) {
                    setMovements(d.movements);
                    setItemDetails(d.item);
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    const getMovementMeta = (movement: Movement) => {
        const rawType = String(movement.type || '').toLowerCase();
        const qty = Number(movement.quantity || 0);
        const isTransfer = rawType === 'transfer';
        const isAdjustment = rawType === 'adjustment';
        const isOutgoing = rawType === 'out' || qty < 0;

        if (isTransfer) {
            return {
                label: 'تحويل',
                color: '#60a5fa',
                background: 'rgba(59,130,246,0.1)',
                sign: qty < 0 ? '-' : '+',
                quantity: Math.abs(qty),
            };
        }

        if (isAdjustment) {
            return {
                label: 'تعديل',
                color: '#a78bfa',
                background: 'rgba(167,139,250,0.15)',
                sign: qty < 0 ? '-' : '+',
                quantity: Math.abs(qty),
            };
        }

        return {
            label: isOutgoing ? 'صادر -' : 'وارد +',
            color: isOutgoing ? '#ef4444' : '#10b981',
            background: isOutgoing ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            sign: isOutgoing ? '-' : '+',
            quantity: Math.abs(qty),
        };
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title="تقرير حركة صنف"
                    subtitle="متابعة تفصيلية لكافة عمليات الصادر والوارد لكل قطعة بالاسم أو الكود."
                    backTab="inventory"
                    onExportPdf={() => window.print()}
                    printTitle="تقرير حركة صنف تفصيلي"
                    printDate={itemDetails ? `${itemDetails.name} (${itemDetails.code})` : undefined}
                />

                <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <CustomSelect
                            value={selectedId}
                            onChange={val => {
                                setSelectedId(val);
                                if (val) {
                                    fetchMovements(val, branchId);
                                } else {
                                    setMovements([]);
                                    setItemDetails(null);
                                }
                            }}
                            icon={Search}
                            placeholder="ابحث عن الصنف بالاسم أو الكود لمتابعة حركته..."
                            options={[
                                { value: '', label: '-- اختر صنف من القائمة --' },
                                ...items.map(i => ({ value: i.id, label: `${i.name} (${i.code})` }))
                            ]}
                            style={{
                                width: '100%', height: '42px',
                                borderRadius: '12px', border: `1px solid ${C.border}`,
                                background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                fontFamily: CAIRO, fontWeight: 500
                            }}
                        />
                    </div>
                    {branches.length > 1 && (
                        <CustomSelect
                            value={branchId}
                            onChange={v => {
                                setBranchId(v);
                                if (selectedId) fetchMovements(selectedId, v);
                            }}
                            placeholder="كل الفروع"
                            options={[
                                { value: 'all', label: 'كل الفروع' },
                                ...branches.map((b: any) => ({ value: b.id, label: b.name }))
                            ]}
                        />
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>جاري استرجاع سجل الحركات...</span>
                    </div>
                ) : !itemDetails ? (
                    <div style={{ padding: '100px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <Activity size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>جاهز للعرض</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, fontFamily: CAIRO }}>برجاء اختيار صنف من القائمة أعلاه لعرض السجل التفصيلي لحركاته.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>سجل الحركات</h3>
                                <div style={{ fontSize: '12px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO }}>إجمالي الحركات: <span style={{ color: C.primary, fontFamily: INTER }}>{movements.length}</span></div>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                                            {['التاريخ والوقت', 'نوع الحركة', 'المخزن', 'الكمية', 'البيان'].map((h, i) => (
                                                <th key={i} style={{ 
                                                    padding: '16px 20px', fontSize: '12px', color: C.textSecondary, 
                                                    textAlign: i === 3 ? 'center' : 'right', fontWeight: 800, fontFamily: CAIRO 
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.map((m, idx) => {
                                            const meta = getMovementMeta(m);
                                            const movementDate = m.date || m.createdAt;
                                            return (
                                            <tr key={m.id}
                                                style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                <td style={{ padding: '14px 20px', fontSize: '12px', color: C.textMuted, fontFamily: INTER }}>
                                                    {movementDate ? new Date(movementDate).toLocaleString('en-GB') : '—'}
                                                </td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 900, fontFamily: CAIRO,
                                                        background: meta.background,
                                                        color: meta.color
                                                    }}>
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{m.warehouse.name}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 900, color: meta.color, fontFamily: INTER }}>
                                                        {meta.sign}{meta.quantity.toLocaleString('en-US')}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 20px', fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>{m.description || m.notes || '—'}</td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', boxShadow: '0 10px 30px -15px rgba(0,0,0,0.4)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                                    <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{itemDetails.name}</div>
                                        <div style={{ fontSize: '12px', color: C.textMuted, fontFamily: INTER, fontWeight: 600 }}>{itemDetails.code}</div>
                                    </div>
                                </div>

                                <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 800, marginBottom: '6px', fontFamily: CAIRO }}>الرصيد الكلي المتوفر</div>
                                    <div style={{ fontSize: '32px', fontWeight: 1000, color: '#10b981', fontFamily: INTER, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
                                        {itemDetails.totalStock.toLocaleString('en-US')}
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981', fontFamily: CAIRO }}>{itemDetails.unit}</span>
                                    </div>
                                </div>

                                <div style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                    <Warehouse size={16} color={C.primary} /> أرصدة المخازن:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {itemDetails.stockByWarehouse.map(sw => (
                                        <div key={sw.warehouse} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px', fontSize: '13px' }}>
                                            <span style={{ color: C.textSecondary, fontFamily: CAIRO, fontWeight: 600 }}>{sw.warehouse}</span>
                                            <span style={{ color: C.textPrimary, fontWeight: 900, fontFamily: INTER }}>{sw.quantity.toLocaleString('en-US')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                .print-only { display: none; }
                @media print {
                    .print-only { display: block !important; }
                    .no-print { display: none !important; }
                    div { background: #fff !important; border-color: #e2e8f0 !important; }
                    div, span, h2, h3, p { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; border: 1px solid #e2e8f0 !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}
