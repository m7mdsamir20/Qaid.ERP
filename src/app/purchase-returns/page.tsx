'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { RotateCcw, Plus, Printer, Loader2, Search, ChevronDown, Package, CheckCircle2, Clock, AlertCircle, Trash2, Eye } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { THEME, C, CAIRO, INTER, IS, focusIn, focusOut, PAGE_BASE, SC, STitle, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import { printA4Invoice, CompanyInfo } from '@/lib/printInvoices';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';

interface PurchaseReturn {
    id: string; invoiceNumber: number; date: string;
    supplier: { id: string; name: string; phone?: string } | null;
    subtotal: number; discount: number; total: number;
    paidAmount: number; remaining: number;
    paymentMethod?: 'cash' | 'bank' | 'credit';
    notes?: string;
    lines: { item: { name: string; code?: string; unit?: { name: string } }; quantity: number; price: number; total: number }[];
}



export default function PurchaseReturnsListPage() {
    const { symbol: cSymbol } = useCurrency();
    const router = useRouter();
    const { data: session } = useSession();
    const [returns, setReturns] = useState<PurchaseReturn[]>([]);
    const [company, setCompany] = useState<CompanyInfo>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const isAdmin = session?.user?.role === 'admin';
    const perms = (session?.user as any)?.permissions || {};
    const canCreate = isAdmin || perms['/purchase-returns']?.create;

    const fetchAll = useCallback(async () => {
        try {
            const [res, coR] = await Promise.all([
                fetch('/api/purchase-returns'),
                fetch('/api/company')
            ]);
            const data = await res.json();
            setReturns(Array.isArray(data) ? data : (data.returns || []));
            if (coR.ok) setCompany(await coR.json());
        } catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = returns.filter(r => {
        const matchSearch = (r.supplier?.name || '').includes(searchTerm) || String(r.invoiceNumber).includes(searchTerm);
        const rDate = new Date(r.date);
        const matchFrom = !dateFrom || rDate >= new Date(dateFrom);
        const matchTo = !dateTo || rDate <= new Date(dateTo + 'T23:59:59');
        return matchSearch && matchFrom && matchTo;
    });

    const fmt = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const getStatusStyle = (total: number, paid: number) => {
        if (paid >= total && total > 0) return { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', text: 'مدفوعة', icon: CheckCircle2 };
        if (paid > 0) return { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', text: 'جزئي', icon: Clock };
        return { bg: 'rgba(251,113,133,0.1)', color: '#fb7185', text: 'غير مدفوعة', icon: AlertCircle };
    };

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader 
                    title="مرتجعات المشتريات" 
                    subtitle="إدارة المرتجعات للموردين — رد الأصناف المشتراة وتسوية المديونيات" 
                    icon={RotateCcw} 
                    primaryButton={canCreate ? {
                        label: 'مرتجع جديد',
                        onClick: () => router.push('/purchase-returns/new'),
                        icon: Plus
                    } : undefined}
                />

                <div style={SEARCH_STYLE.container}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input 
                            placeholder="رقم المرتجع أو اسم المورد..." 
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
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>لا توجد مرتجعات مشتريات</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(true)}>رقم المرتجع</th>
                                        <th style={TABLE_STYLE.th(false)}>التاريخ</th>
                                        <th style={TABLE_STYLE.th(false)}>المورد</th>
                                        <th style={TABLE_STYLE.th(false)}>الإجمالي</th>
                                        <th style={TABLE_STYLE.th(false)}>المدفوع</th>
                                        <th style={TABLE_STYLE.th(false)}>المتبقي</th>
                                        <th style={TABLE_STYLE.th(false)}>الحالة</th>
                                        <th style={TABLE_STYLE.th(false)}>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((inv, idx) => {
                                        const st = getStatusStyle(inv.total, inv.paidAmount);
                                        const dateStr = new Date(inv.date).toLocaleDateString('en-GB');
                                        return (
                                            <tr key={inv.id} style={TABLE_STYLE.row(idx === filtered.length - 1)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
                                            >
                                                <td style={{ ...TABLE_STYLE.td(true), fontWeight: 800, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: CAIRO, width: '120px' }}>
                                                    RTN-{String(inv.invoiceNumber).padStart(5, '0')}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), color: C.textSecondary, fontSize: '13px', fontFamily: CAIRO }}>{dateStr}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{inv.supplier?.name || '—'}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>
                                                    {fmt(inv.total)} <span style={{ fontSize: '10px', opacity: 0.6, fontFamily: CAIRO }}>{cSymbol}</span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: C.success, fontFamily: CAIRO }}>
                                                    {fmt(inv.paidAmount)} <span style={{ fontSize: '10px', opacity: 0.6, fontFamily: CAIRO }}>{cSymbol}</span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: (inv.remaining > 0) ? C.danger : C.textMuted, fontFamily: CAIRO }}>
                                                    {fmt(inv.remaining)} <span style={{ fontSize: '10px', opacity: 0.6, fontFamily: CAIRO }}>{cSymbol}</span>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <div style={{ 
                                                        display: 'inline-flex', alignItems: 'center', gap: '5px', 
                                                        padding: '3px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700,
                                                        background: st.bg, color: st.color, border: `1px solid ${st.color}30`, fontFamily: CAIRO
                                                    }}>
                                                        {st.text} <st.icon size={12} />
                                                    </div>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button onClick={() => printA4Invoice(inv, 'purchase-return', company)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.color = C.primary} onMouseLeave={e => e.currentTarget.style.color = '#64748b'} title="طباعة">
                                                            <Printer size={16} />
                                                        </button>
                                                        <button onClick={() => router.push(`/purchase-returns/${inv.id}`)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.color = C.primary} onMouseLeave={e => e.currentTarget.style.color = '#64748b'} title="عرض">
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
            </div>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                input[type="date"]::-webkit-calendar-picker-indicator {
                    cursor: pointer;
                    opacity: 0.45;
                    transition: opacity 0.2s;
                }
                input[type="date"]::-webkit-calendar-picker-indicator:hover {
                    opacity: 1;
                }
            `}</style>
        </DashboardLayout>
    );
}
