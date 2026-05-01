'use client';
import { formatNumber } from '@/lib/currency';

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { Activity, ArrowDownRight, ArrowUpRight, Search, FileText, Loader2, Filter, ArrowRightLeft, Package, Warehouse } from 'lucide-react';
import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';

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

export default function StockMovementsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/stock-movements');
            if (res.ok) {
                setMovements(await res.json());
            }
        } catch { } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredMovements = movements.filter(m =>
        (m.item?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.warehouse?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'in': return { label: t('وارد المشتريات'), icon: <ArrowDownRight size={15} />, bg: 'rgba(52,211,153,0.1)', color: '#34d399', border: 'rgba(52,211,153,0.2)' };
            case 'out': return { label: t('صادر مبيعات'), icon: <ArrowUpRight size={15} />, bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.2)' };
            case 'transfer': return { label: t('تحويل مخزني'), icon: <ArrowRightLeft size={15} />, bg: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: 'rgba(96,165,250,0.2)' };
            case 'adjustment': return { label: t('تسوية الجرد'), icon: <Activity size={15} />, bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.2)' };
            case 'return_in': return { label: t('مرتجع وارد'), icon: <ArrowDownRight size={15} />, bg: 'rgba(52,211,153,0.1)', color: '#34d399', border: 'rgba(52,211,153,0.2)' };
            case 'return_out': return { label: t('مرتجع صادر'), icon: <ArrowUpRight size={15} />, bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.2)' };
            case 'opening': return { label: t('رصيد افتتاحي'), icon: <Package size={15} />, bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.2)' };
            case 'stocktaking': return { label: t('جرد مخزني'), icon: <Activity size={15} />, bg: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: 'rgba(167,139,250,0.2)' };
            default: return { label: type, icon: <FileText size={15} />, bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.2)' };
        }
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("حركات المخزون")}
                    subtitle={t("سجل كامل لجميع العمليات الصادرة والواردة، التحويلات الداخلية، وتسويات الجرد.")}
                    backTab="inventory"
                    onExportPdf={() => window.print()}
                />

                {/* Header للطباعة فقط */}
                <div className="print-only">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '2px solid #000' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 600, color: '#000', fontFamily: CAIRO }}>{(session?.user as any)?.companyName || ''}</h2>
                            {(session?.user as any)?.taxNumber && <div style={{ fontSize: '11px', color: '#333', margin: '2px 0', fontFamily: CAIRO }}>{t('الرقم الضريبي')}: {(session?.user as any)?.taxNumber}</div>}
                            {(session?.user as any)?.commercialRegister && <div style={{ fontSize: '11px', color: '#333', margin: '2px 0', fontFamily: CAIRO }}>{t('السجل التجاري')}: {(session?.user as any)?.commercialRegister}</div>}
                            {(session?.user as any)?.phone && <div style={{ fontSize: '11px', color: '#333', margin: '2px 0', fontFamily: CAIRO }}>{t('الهاتف')}: {(session?.user as any)?.phone}</div>}
                        </div>
                        <div style={{ }}>
                            <h3 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, color: '#000', fontFamily: CAIRO }}>{t('سجل حركات المخزون الشامل')}</h3>
                        </div>
                        <div style={{ maxWidth: '150px', textAlign: 'end' }}>
                            {(session?.user as any)?.companyLogo && <img src={(session?.user as any)?.companyLogo} alt="logo" style={{ maxWidth: '150px', maxHeight: '70px', objectFit: 'contain' }} />}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ position: 'relative', width: '100%', marginBottom: '20px' }}>
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

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                            <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                            <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري تحميل حركات المخزون...')}</span>
                        </div>
                    ) : filteredMovements.length === 0 ? (
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                            <Activity size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد حركات مخزنية')}</h3>
                            <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textSecondary, fontFamily: CAIRO }}>{t('لم يتم تسجيل أي عمليات مخزنية تطابق بحثك.')}</p>
                        </div>
                    ) : (
                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        {[t('التاريخ والوقت'), t('نوع الحركة'), t('المرجع'), t('الصنف'), t('المخزن'), t('الكمية')].map((h, i) => (
                                            <th key={i} style={{ 
                                                padding: '16px 20px', textAlign: 'center', textAlign: 'center', fontSize: '12px', color: C.textSecondary, 
                                                textAlign: i === 5 ? 'center' : 'start',
                                                fontWeight: 600, fontFamily: CAIRO 
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMovements.map((m, idx) => {
                                        const typeConfig = getTypeLabel(m.type);
                                        return (
                                            <tr key={m.id} 
                                                style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', textAlign: 'center', textAlign: 'center', fontSize: '12px', color: C.textSecondary, fontFamily: OUTFIT }}>
                                                    {new Date(m.date).toLocaleDateString('en-GB')} {new Date(m.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                </td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        padding: '4px 12px', borderRadius: '10px',
                                                        background: typeConfig.bg, border: `1px solid ${typeConfig.border}`,
                                                        color: typeConfig.color, fontSize: '11px', fontWeight: 600, fontFamily: CAIRO
                                                    }}>
                                                        {typeConfig.icon}
                                                        {typeConfig.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <span style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 600, color: C.textSecondary, fontFamily: OUTFIT }}>{m.reference || '—'}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', textAlign: 'center', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{m.item?.name || '—'}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', textAlign: 'center', textAlign: 'center', fontSize: '12.5px', color: C.textSecondary, fontFamily: CAIRO }}>{m.warehouse?.name || '—'}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', textAlign: 'center', textAlign: 'center', }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: typeConfig.color, fontFamily: OUTFIT }}>
                                                        {m.quantity > 0 ? '+' : ''}{formatNumber(m.quantity)}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
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
