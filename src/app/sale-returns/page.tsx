'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { RotateCcw, Plus, Printer, Loader2, Search, ChevronDown, Package, Trash2, Calendar, Eye, X } from 'lucide-react';

import { useSession } from 'next-auth/react';

import { THEME, C, CAIRO, INTER, IS, LS, focusIn, focusOut, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';

interface ReturnInvoice {
    id: string; invoiceNumber: number; date: string;
    customer: { id: string; name: string; phone?: string } | null;
    subtotal: number; discount: number; total: number;
    paidAmount: number; remaining: number;
    paymentMethod?: 'cash' | 'bank' | 'credit';
    notes?: string;
    lines: { item: { name: string; code?: string; unit?: { name: string } }; quantity: number; price: number; total: number }[];
}

export default function SaleReturnsListPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { data: session } = useSession();
    const { symbol: cSymbol } = useCurrency();
    const [returns, setReturns] = useState<ReturnInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';

    const isAdmin = session?.user?.role === 'admin';
    const perms = (session?.user as any)?.permissions || {};
    const canCreate = isAdmin || perms['/sale-returns']?.create;

    const fetchAll = useCallback(async () => {
        try {
            const retRes = await fetch('/api/sale-returns');
            const data = await retRes.json();
            setReturns(Array.isArray(data) ? data : (data.returns || []));
        } catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = returns.filter(r => {
        const matchSearch = (r.customer?.name || '').includes(searchTerm) || String(r.invoiceNumber).includes(searchTerm);
        const rDate = new Date(r.date);
        const matchFrom = !dateFrom || rDate >= new Date(dateFrom);
        const matchTo = !dateTo || rDate <= new Date(dateTo + 'T23:59:59');
        return matchSearch && matchFrom && matchTo;
    });

    const handlePrint = (r: ReturnInvoice) => {
        window.open(`/print/invoice/${r.id}`, '_blank');
    };

    /* ─── Status badge ─── */
    const getStatusStyle = (r: ReturnInvoice) => {
        if (r.paidAmount >= r.total && r.total > 0) return { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', text: 'مكتمل' };
        if (r.paidAmount > 0) return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', text: 'جزئي' };
        return { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', text: 'تسوية رصيد' };
    };

    /* ─── RENDER ─── */
    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', paddingTop: THEME.header.pt, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={isServices ? "مرتجعات الخدمات" : "مرتجعات المبيعات"}
                    subtitle={isServices ? "إدارة إلغاء الخدمات أو رد قيمتها للعملاء — تسوية مبالغ خدمات سابقة" : "إدارة المرتجعات من العملاء — رد قيمة الأصناف نقداً أو تسوية مبيعات سابقة"}
                    icon={RotateCcw}
                    primaryButton={canCreate ? {
                        label: isServices ? "مرتجع خدمة جديد" : "مرتجع جديد",
                        onClick: () => router.push('/sale-returns/new'),
                        icon: Plus
                    } : undefined}
                />

                <div style={SEARCH_STYLE.container}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder="ابحث برقم المرتجع أو اسم العميل..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: C.textMuted, fontSize: '12px' }}>من</span>
                        <div style={{ width: '160px' }}>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...IS, height: '36px', borderRadius: '6px', fontSize: '13px', fontFamily: CAIRO, background: C.card, color: C.textSecondary }} />
                        </div>
                        <span style={{ color: C.textMuted, fontSize: '12px' }}>إلى</span>
                        <div style={{ width: '160px' }}>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...IS, height: '36px', borderRadius: '6px', fontSize: '13px', fontFamily: CAIRO, background: C.card, color: C.textSecondary }} />
                        </div>
                    </div>

                    {(searchTerm || dateFrom || dateTo) && (
                        <button
                            onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px', height: '36px',
                                background: 'transparent', border: `1px solid ${C.danger}40`, color: C.danger,
                                borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: '0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = `${C.danger}10`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Trash2 size={14} /> مسح

                        </button>
                    )}
                </div>


                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '70px', textAlign: 'center' }}>
                            <RotateCcw size={36} style={{ color: C.textMuted, opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>{`لا توجد ${isServices ? 'مرتجعات خدمات' : 'مرتجعات مبيعات'}`}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(true)}>رقم المرتجع</th>
                                        <th style={TABLE_STYLE.th(false)}>التاريخ</th>
                                        <th style={TABLE_STYLE.th(false)}>العميل</th>
                                        <th style={TABLE_STYLE.th(false)}>الإجمالي</th>
                                        <th style={TABLE_STYLE.th(false)}>تم رده</th>
                                        <th style={TABLE_STYLE.th(false)}>المتبقي</th>
                                        <th style={TABLE_STYLE.th(false)}>الحالة</th>
                                        <th style={TABLE_STYLE.th(false)}>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((r, idx) => {
                                        const st = getStatusStyle(r);
                                        const dateStr = new Date(r.date).toLocaleDateString('en-GB');
                                        return (
                                            <tr key={r.id} style={TABLE_STYLE.row(idx === filtered.length - 1)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ ...TABLE_STYLE.td(true), fontWeight: 800, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: CAIRO, width: '120px' }}>
                                                    RET-{String(r.invoiceNumber).padStart(5, '0')}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), color: C.textSecondary, fontSize: '13px', fontFamily: CAIRO }}>{dateStr}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: 'rgba(255,255,255,0.92)', fontFamily: CAIRO }}>{r.customer?.name || '—'}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: 'rgba(255,255,255,0.92)', fontFamily: CAIRO }}>
                                                    {r.total.toLocaleString()} <span style={{ fontSize: '10px', opacity: 0.6, fontFamily: CAIRO }}>{cSymbol}</span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: C.success, fontFamily: CAIRO }}>
                                                    {r.paidAmount.toLocaleString()} <span style={{ fontSize: '10px', opacity: 0.6, fontFamily: CAIRO }}>{cSymbol}</span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: (r.remaining > 0) ? C.danger : C.textMuted, fontFamily: CAIRO }}>
                                                    {r.remaining.toLocaleString()} <span style={{ fontSize: '10px', opacity: 0.6, fontFamily: CAIRO }}>{cSymbol}</span>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <div style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                        padding: '3px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700,
                                                        background: st.bg, color: st.color, border: `1px solid ${st.color}30`, fontFamily: CAIRO
                                                    }}>
                                                        {st.text}
                                                    </div>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button onClick={() => handlePrint(r)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.color = C.primary} onMouseLeave={e => e.currentTarget.style.color = '#64748b'} title="طباعة">
                                                            <Printer size={16} />
                                                        </button>
                                                        <button onClick={() => router.push(`/sale-returns/${r.id}`)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.color = C.primary} onMouseLeave={e => e.currentTarget.style.color = '#64748b'} title="عرض">
                                                            <Eye size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <style jsx global>{` 
                    @keyframes spin { to { transform:rotate(360deg); } } 
                    input[type="date"]::-webkit-calendar-picker-indicator {
                        cursor: pointer;
                        opacity: 0.45;
                        transition: opacity 0.2s;
                    }
                    input[type="date"]::-webkit-calendar-picker-indicator:hover {
                        opacity: 1;
                    }
                `}</style>
            </div>
        </DashboardLayout>
    );
}

