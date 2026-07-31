'use client';
import { formatNumber } from '@/lib/currency';

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { Activity, ArrowDownRight, ArrowUpRight, Search, FileText, Loader2, Filter, ArrowRightLeft, Package, Warehouse } from 'lucide-react';
import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { DataTable } from '@/components/DataTable';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';

interface StockMovement {
    id: string;
    type: string;
    date: string;
    quantity: number;
    reference: string;
    notes: string;
    item: { name: string; code: string };
    warehouse: { name: string };
}

interface BranchOption {
    id: string;
    name: string;
}

export default function StockMovementsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (dateFrom) params.set('from', dateFrom);
            if (dateTo) params.set('to', dateTo);
            if (branchId && branchId !== 'all') params.set('branchId', branchId);
            const url = `/api/stock-movements${params.toString() ? '?' + params.toString() : ''}`;
            const res = await fetch(url);
            if (res.ok) {
                setMovements(await res.json());
            }
        } catch { } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, branchId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredMovements = movements.filter(m =>
        (m.item?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.warehouse?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTypeLabel = (type: string, reference?: string) => {
        const ref = (reference || '').toUpperCase();

        // Distinguish by reference source
        if (ref.startsWith('POS-')) {
            return { label: t('استهلاك مبيعات'), icon: <ArrowUpRight size={15} />, bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.2)' };
        }
        if (ref.startsWith('CANCEL-')) {
            return { label: t('مرتجع إلغاء طلب'), icon: <ArrowDownRight size={15} />, bg: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: 'rgba(167,139,250,0.2)' };
        }
        if (ref.startsWith('PUR-') || ref.startsWith('PURCH-')) {
            return { label: t('وارد مشتريات'), icon: <ArrowDownRight size={15} />, bg: 'rgba(52,211,153,0.1)', color: '#34d399', border: 'rgba(52,211,153,0.2)' };
        }
        if (ref.startsWith('SAL-')) {
            return { label: t('صادر مبيعات'), icon: <ArrowUpRight size={15} />, bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.2)' };
        }
        if (ref.startsWith('FIX-STOCK') || ref.startsWith('OP-BAL') || ref.startsWith('OPEN-INV')) {
            return { label: t('رصيد افتتاحي'), icon: <Package size={15} />, bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.2)' };
        }

        // Fallback to generic type
        switch (type) {
            case 'in': return { label: t('وارد +'), icon: <ArrowDownRight size={15} />, bg: 'rgba(52,211,153,0.1)', color: '#34d399', border: 'rgba(52,211,153,0.2)' };
            case 'out': return { label: t('صادر -'), icon: <ArrowUpRight size={15} />, bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.2)' };
            case 'transfer': return { label: t('تحويل مخزني'), icon: <ArrowRightLeft size={15} />, bg: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: 'rgba(96,165,250,0.2)' };
            case 'adjustment': return { label: t('تسوية الجرد'), icon: <Activity size={15} />, bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.2)' };
            case 'return_in': return { label: t('مرتجع وارد'), icon: <ArrowDownRight size={15} />, bg: 'rgba(52,211,153,0.1)', color: '#34d399', border: 'rgba(52,211,153,0.2)' };
            case 'return_out': return { label: t('مرتجع صادر'), icon: <ArrowUpRight size={15} />, bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.2)' };
            case 'opening': return { label: t('رصيد افتتاحي'), icon: <Package size={15} />, bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.2)' };
            case 'stocktaking': return { label: t('جرد مخزني'), icon: <Activity size={15} />, bg: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: 'rgba(167,139,250,0.2)' };
            default: return { label: type, icon: <FileText size={15} />, bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.2)' };
        }
    };

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("حركات المخزون")}
                    subtitle={t("سجل كامل لجميع العمليات الصادرة والواردة، التحويلات الداخلية، وتسويات الجرد.")}
                    backTab="inventory"
                    printTitle={t("تقرير حركات المخزون")}
                    branchName={selectedBranchName}
                    printDate={(dateFrom || dateTo) ? `${dateFrom ? t('من: ') + dateFrom : ''} ${dateTo ? t(' إلى: ') + dateTo : ''}` : undefined}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
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

                        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                placeholder={t("ابحث باسم الصنف، رقم المرجع، أو المخزن...")}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ 
                                    ...IS, width: '100%', height: '42px', padding: '0 45px 0 15px', 
                                    borderRadius: '12px', border: `1px solid ${C.border}`, 
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px', 
                                    outline: 'none', fontFamily: CAIRO, fontWeight: 500 
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO, fontWeight: 600 }}>{t('من')}</label>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...IS, height: '42px', padding: '0 12px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '13px', outline: 'none', fontFamily: OUTFIT }} />
                            <label style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO, fontWeight: 600 }}>{t('إلى')}</label>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...IS, height: '42px', padding: '0 12px', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '13px', outline: 'none', fontFamily: OUTFIT }} />
                            {(dateFrom || dateTo) && (
                                <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{ height: '42px', padding: '0 14px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>{t('مسح')}</button>
                            )}
                        </div>
                    </div>

                    <div className="print-table-container">
                        <DataTable
                            columns={[
                                { header: t('التاريخ والوقت'), type: 'date', cell: (row) => <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: OUTFIT }}>{new Date(row.date).toLocaleDateString('en-ZA')} {new Date(row.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</span> },
                                { header: t('نوع الحركة'), type: 'status', cell: (row) => {
                                    const tc = getTypeLabel(row.type, row.reference);
                                    return (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '10px', background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, fontSize: '11px', fontWeight: 600, fontFamily: CAIRO }}>
                                            {tc.icon} {tc.label}
                                        </span>
                                    );
                                }},
                                { header: t('المرجع'), type: 'text', cell: (row) => <span style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 600, color: C.textSecondary, fontFamily: OUTFIT }}>{row.reference || '—'}</span> },
                                { header: t('الصنف'), type: 'text', cell: (row) => <span style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{row.item?.name || '—'}</span> },
                                { header: t('المخزن'), type: 'text', cell: (row) => <span style={{ fontSize: '12.5px', color: C.textSecondary, fontFamily: CAIRO }}>{row.warehouse?.name || '—'}</span> },
                                { header: t('الكمية'), type: 'number', cell: (row) => {
                                    const tc = getTypeLabel(row.type, row.reference);
                                    return <span style={{ fontSize: '13px', fontWeight: 600, color: tc.color, fontFamily: OUTFIT }}>{row.quantity > 0 ? '+' : ''}{formatNumber(row.quantity)}</span>;
                                }},
                            ]}
                            data={filteredMovements}
                            emptyIcon={Activity}
                            emptyMessage={t('لا توجد حركات مخزنية')}
                            isLoading={loading}
                            loadingSkeleton={
                                <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                                    <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                                    <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري تحميل حركات المخزون...')}</span>
                                </div>
                            }
                        />
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </DashboardLayout>
    );
}
