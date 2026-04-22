'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { Package, Activity, Search, Loader2, Warehouse } from 'lucide-react';
import { C, CAIRO, PAGE_BASE, OUTFIT } from '@/constants/theme';

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

interface BranchOption {
    id: string;
    name: string;
}

export default function ItemMovementReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';

    const [items, setItems] = useState<{ id: string, name: string, code: string }[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [movements, setMovements] = useState<Movement[]>([]);
    const [itemDetails, setItemDetails] = useState<Item | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        fetch('/api/reports/item-movement')
            .then(res => res.json())
            .then(d => { if (!d.error) setItems(d.items); })
            .catch(() => { });
    }, []);

    const fetchMovements = (id: string, targetBranchId = branchId) => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('itemId', id);
        if (targetBranchId && targetBranchId !== 'all') params.set('branchId', targetBranchId);
        fetch(`/api/reports/item-movement?${params}`)
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(d => {
                if (d.error) throw new Error(d.error);
                setMovements(d.movements);
                setItemDetails(d.item);
                setError('');
            })
            .catch(() => setError(t('فشل تحميل بيانات حركة الصنف')))
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
                label: t('تحويل'),
                color: '#60a5fa',
                background: 'rgba(37, 106, 244,0.1)',
                sign: qty < 0 ? '-' : '+',
                quantity: Math.abs(qty),
            };
        }

        if (isAdjustment) {
            return {
                label: t('تعديل'),
                color: '#a78bfa',
                background: 'rgba(167,139,250,0.15)',
                sign: qty < 0 ? '-' : '+',
                quantity: Math.abs(qty),
            };
        }

        return {
            label: isOutgoing ? t('صادر -') : t('وارد +'),
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
                    title={t("تقرير حركة صنف")}
                    subtitle={t("متابعة تفصيلية لكافة عمليات الصادر والوارد لكل قطعة بالاسم أو الكود.")}
                    backTab="inventory"
                    printTitle={t("تقرير حركة صنف تفصيلي")}
                    accountName={itemDetails ? `${itemDetails.name} (${itemDetails.code})` : undefined}
                    printLabel={t('الصنف:')}
                    branchName={branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '')}
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
                            placeholder={t("ابحث عن الصنف بالاسم أو الكود لمتابعة حركته...")}
                            options={[
                                { value: '', label: t('-- اختر صنف من القائمة --') },
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
                            placeholder={t("كل الفروع")}
                            options={[
                                { value: 'all', label: t('كل الفروع') },
                                ...branches.map(b => ({ value: b.id, label: b.name }))
                            ]}
                        />
                    )}
                </div>

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', marginBottom: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                        <span style={{ fontSize: '16px' }}>⚠️</span>{error}
                        <button onClick={() => setError('')} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
                    </div>
                )}

                {loading ? (
                    <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري استرجاع سجل الحركات...')}</span>
                    </div>
                ) : !itemDetails ? (
                    <div style={{ padding: '100px', textAlign: 'start', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <Activity size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('جاهز للعرض')}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, fontFamily: CAIRO }}>{t('برجاء اختيار صنف من القائمة أعلاه لعرض السجل التفصيلي لحركاته.')}</p>
                    </div>
                ) : (
                    <>
                        <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: t('الرصيد الكلي المتوفر'), value: itemDetails.totalStock.toLocaleString('en-US'), unit: t(itemDetails.unit), color: '#10b981', icon: <Package size={20} /> },
                                { label: t('إجمالي الحركات'), value: movements.length.toLocaleString('en-US'), unit: t('حركة'), color: C.primary, icon: <Activity size={20} /> },
                                { label: t('إجمالي الوارد'), value: movements.filter(m => Number(m.quantity) > 0).reduce((s, m) => s + Math.abs(Number(m.quantity)), 0).toLocaleString('en-US'), unit: t(itemDetails.unit), color: '#10b981', icon: <Activity size={20} /> },
                                { label: t('إجمالي الصادر'), value: movements.filter(m => Number(m.quantity) < 0).reduce((s, m) => s + Math.abs(Number(m.quantity)), 0).toLocaleString('en-US'), unit: t(itemDetails.unit), color: '#ef4444', icon: <Activity size={20} /> },
                            ].map((s, i) => (
                                <div key={i} style={{ background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '20px', fontWeight: 900, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                            <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>{s.unit}</span>
                                        </div>
                                    </div>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <div className="no-print" style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{t('سجل الحركات')}</h3>
                                <div style={{ fontSize: '12px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO }}>{t('إجمالي الحركات:')} <span style={{ color: C.primary, fontFamily: OUTFIT }}>{movements.length}</span></div>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                                            {[t('التاريخ والوقت'), t('نوع الحركة'), t('المخزن'), t('الكمية'), t('البيان')].map((h, i) => (
                                                <th key={i} style={{ 
                                                    padding: '16px 20px', fontSize: '12px', color: C.textSecondary, 
                                                     fontWeight: 800, fontFamily: CAIRO 
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
                                                <td style={{ padding: '14px 20px', fontSize: '12px', color: C.textMuted, fontFamily: OUTFIT }}>
                                                    {movementDate ? `${new Date(movementDate).toLocaleDateString('en-GB')} ${new Date(movementDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}` : '—'}
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
                                                <td style={{ padding: '14px 20px', }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 900, color: meta.color, fontFamily: OUTFIT }}>
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
                                    <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(37, 106, 244,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{itemDetails.name}</div>
                                        <div style={{ fontSize: '12px', color: C.textMuted, fontFamily: OUTFIT, fontWeight: 600 }}>{itemDetails.code}</div>
                                    </div>
                                </div>

                                <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'start'}}>
                                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 800, marginBottom: '6px', fontFamily: CAIRO }}>{t('الرصيد الكلي المتوفر')}</div>
                                    <div style={{ fontSize: '32px', fontWeight: 1000, color: '#10b981', fontFamily: OUTFIT, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
                                        {itemDetails.totalStock.toLocaleString('en-US')}
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981', fontFamily: CAIRO }}>{t(itemDetails.unit)}</span>
                                    </div>
                                </div>

                                <div style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                    <Warehouse size={16} color={C.primary} /> {t('أرصدة المخازن:')}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {itemDetails.stockByWarehouse.map(sw => (
                                        <div key={sw.warehouse} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px', fontSize: '13px' }}>
                                            <span style={{ color: C.textSecondary, fontFamily: CAIRO, fontWeight: 600 }}>{sw.warehouse}</span>
                                            <span style={{ color: C.textPrimary, fontWeight: 900, fontFamily: OUTFIT }}>{sw.quantity.toLocaleString('en-US')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    </>
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


