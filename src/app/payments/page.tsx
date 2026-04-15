'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { Printer, X, Info, Receipt, TrendingDown, Plus, Search, ChevronDown, Lock, Loader2, UserCheck, Building2, Banknote, CheckCircle2, ArrowRight, Trash2, Eye } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { 
    THEME, C, CAIRO, INTER, IS, focusIn, focusOut, PAGE_BASE, SC, STitle, 
    TABLE_STYLE, SEARCH_STYLE 
} from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import { useCurrency } from '@/hooks/useCurrency';

/* ── Types ── */
interface Voucher {
    id: string; voucherNumber: number; date: string; amount: number;
    description: string; paymentType: 'cash' | 'bank';
    supplier?: { id: string; name: string };
    treasury?: { id: string; name: string; type: string };
}
interface Supplier { id: string; name: string; balance: number; }
interface Treasury { id: string; name: string; type: string; balance: number; }

/* ── List Page ── */
export default function PaymentVouchersPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { symbol: cSymbol } = useCurrency();
    const { data: session } = useSession();
    const router = useRouter();
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [treasuries, setTreasuries] = useState<Treasury[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const isAdmin = session?.user?.role === 'admin';
    const perms = (session?.user as any)?.permissions || {};
    const canCreate = isAdmin || perms['/payments']?.create;

    const fetchAll = useCallback(async () => {
        try {
            const [vR, sR, tR] = await Promise.all([
                fetch('/api/vouchers?type=payment'),
                fetch('/api/suppliers'),
                fetch('/api/treasuries'),
            ]);
            setVouchers(await vR.json());
            setSuppliers(await sR.json());
            setTreasuries(await tR.json());
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handlePrint = (v: Voucher) => {
        window.open(`/print/voucher/${v.id}`, '_blank');
    };


    const filteredAll = vouchers.filter(v => {
        const matchSearch = String(v.voucherNumber).includes(searchTerm) || (v.supplier?.name || '').includes(searchTerm) || (v.description || '').includes(searchTerm);
        const rDate = new Date(v.date);
        const matchFrom = !dateFrom || rDate >= new Date(dateFrom);
        const matchTo = !dateTo || rDate <= new Date(dateTo + 'T23:59:59');
        return matchSearch && matchFrom && matchTo;
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, dateFrom, dateTo]);

    const fmt = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title="سندات الصرف"
                    subtitle="إدارة المدفوعات النقدية والبنكية للموردين — تتبع المنصرف من الخزينة والبنوك"
                    icon={TrendingDown}
                    primaryButton={canCreate ? {
                        label: 'سند صرف جديد',
                        onClick: () => router.push('/payments/new'),
                        icon: Plus
                    } : undefined}
                    backButton={{ label: 'العودة للرئيسية', onClick: () => router.push('/') }}
                />

                {/* Filters Section */}
                {/* ── Search & Filter ── */}
                {/* ── Search & Filter ── */}
                <div style={SEARCH_STYLE.container}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input 
                            placeholder="رقم السند أو اسم المورد..." 
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

                {/* Table Section */}
                <div style={{
                    background: C.card,
                    borderRadius: '16px',
                    border: `1px solid ${C.border}`,
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                }}>
                    {loading ? (
                        <div style={{ padding: '80px', textAlign: 'center' }}>
                            <Loader2 size={36} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, display: 'block', margin: '0 auto 10px' }} />
                            <span style={{ fontSize: '14px', color: C.textSecondary, fontWeight: 600 }}>جاري تحميل البيانات...</span>
                        </div>
                    ) : filteredAll.length === 0 ? (
                        <div style={{ padding: '70px', textAlign: 'center' }}>
                            <Receipt size={36} style={{ color: C.textMuted, opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>{searchTerm || dateFrom || dateTo ? 'لا توجد نتائج' : 'لا توجد سندات صرف'}</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '14px', minWidth: '1000px' }}>
                                    <thead>
                                        <tr style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
                                            <th style={{ padding: '11px 16px', fontSize: '12px', fontWeight: 500, color: C.textMuted, textAlign: 'start', fontFamily: CAIRO, width: '120px' }}>رقم السند</th>
                                            <th style={{ padding: '11px 16px', fontSize: '12px', fontWeight: 500, color: C.textMuted, fontFamily: CAIRO }}>التاريخ</th>
                                            <th style={{ padding: '11px 16px', fontSize: '12px', fontWeight: 500, color: C.textMuted, textAlign: 'start', fontFamily: CAIRO }}>المورد</th>
                                            <th style={{ padding: '11px 16px', fontSize: '12px', fontWeight: 500, color: C.textMuted, fontFamily: CAIRO }}>طريقة الدفع</th>
                                            <th style={{ padding: '11px 16px', fontSize: '12px', fontWeight: 500, color: C.textMuted, textAlign: 'start', fontFamily: CAIRO }}>الخزينة / البنك</th>
                                            <th style={{ padding: '11px 16px', fontSize: '12px', fontWeight: 500, color: C.textMuted, textAlign: 'start', fontFamily: CAIRO }}>البيان</th>
                                            <th style={{ padding: '11px 16px', fontSize: '12px', fontWeight: 500, color: C.textMuted, fontFamily: CAIRO }}>المبلغ</th>
                                            <th style={{ padding: '11px 16px', fontSize: '12px', fontWeight: 500, color: C.textMuted, fontFamily: CAIRO }}>إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginated.map((v, idx) => {
                                            const dateStr = new Date(v.date).toLocaleDateString('en-GB');
                                            return (
                                                <tr key={v.id} style={{ background: 'rgba(0,0,0,0.15)', borderBottom: idx < paginated.length - 1 ? `1px solid ${C.border}` : 'none' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={{ padding: '11px 16px', textAlign: 'start', fontWeight: 500, fontSize: '11px', color: 'rgba(59, 130, 246, 0.65)', fontFamily: CAIRO, width: '120px' }}>
                                                        PMT-{String(v.voucherNumber).padStart(5, '0')}
                                                    </td>
                                                    <td style={{ padding: '11px 16px', color: C.textSecondary, fontSize: '13px', fontFamily: CAIRO }}>{dateStr}</td>
                                                    <td style={{ padding: '11px 16px', textAlign: 'start', color: 'rgba(255,255,255,0.92)', fontFamily: CAIRO }}>{v.supplier?.name || '—'}</td>
                                                    <td style={{ padding: '11px 16px' }}>
                                                        <div style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                            padding: '3px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700,
                                                            background: v.treasury?.type === 'bank' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(52, 211, 153, 0.1)',
                                                            color: v.treasury?.type === 'bank' ? '#60a5fa' : '#34d399',
                                                            border: `1px solid ${v.treasury?.type === 'bank' ? '#60a5fa' : '#34d399'}30`, fontFamily: CAIRO
                                                        }}>
                                                            {v.treasury?.type === 'bank' ? 'بنكي' : 'نقدي'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '11px 16px', textAlign: 'start', color: C.textSecondary, fontSize: '13px', fontFamily: CAIRO }}>{v.treasury?.name || '—'}</td>
                                                    <td style={{ padding: '11px 16px', textAlign: 'start', color: C.textMuted, fontSize: '12px', fontFamily: CAIRO, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.description || '—'}</td>
                                                    <td style={{ padding: '11px 16px', fontWeight: 500, color: '#fb7185', fontFamily: CAIRO }}>
                                                        {fmt(v.amount)} <span style={{ fontSize: '11px', opacity: 0.6, fontFamily: CAIRO }}>{cSymbol}</span>
                                                    </td>
                                                    <td style={{ padding: '11px 16px' }}>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                            <button onClick={() => handlePrint(v)} style={TABLE_STYLE.actionBtn()} title="طباعة">
                                                                <Printer size={TABLE_STYLE.actionIconSize} />
                                                            </button>
<button onClick={() => router.push(`/payments/${v.id}`)} style={TABLE_STYLE.actionBtn()} title="عرض">
                                                                <Eye size={TABLE_STYLE.actionIconSize} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination 
                                total={filteredAll.length}
                                pageSize={pageSize}
                                currentPage={currentPage}
                                onPageChange={setCurrentPage}
                            />
                        </>
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
