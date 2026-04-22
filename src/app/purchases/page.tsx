'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Plus, Printer, Info, Loader2, Search, ChevronDown, Package, TrendingUp, Wallet, Clock, CheckCircle2, History, Filter, Calendar, Trash2, Receipt, Eye, AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/hooks/useCurrency';
import { getCurrencySymbol, formatNumber } from '@/lib/currency';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, PAGE_BASE, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import { useTranslation } from '@/lib/i18n';

interface Invoice {
    id: string; invoiceNumber: number; date: string;
    supplier: { id: string; name: string; phone?: string; balance: number } | null;
    customer: { id: string; name: string; phone?: string; balance: number } | null;
    subtotal: number; discount: number; total: number;
    paidAmount: number; remaining: number;
    paymentMethod?: 'cash' | 'bank' | 'credit';
    notes?: string;
    lines: { item: { name: string; code?: string }; quantity: number; price: number; total: number; unit?: any }[];
}



// Removed local focusIn/focusOut as they are now imported from theme

export default function PurchasesListPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { symbol: cSymbol, fMoneyJSX } = useCurrency();
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [activeYear, setActiveYear] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;
    const [expanded, setExpanded] = useState<string | null>(null);

    const isAdmin = session?.user?.role === 'admin';
    const perms = (session?.user as any)?.permissions || {};
    const canCreate = isAdmin || perms['/purchases']?.create;
    const canAct = activeYear && canCreate;

    const fetchAll = useCallback(async () => {
        try {
            const purRes = await fetch('/api/purchases');
            const data = await purRes.json();
            setInvoices(data.invoices || []);
            setActiveYear(data.activeYear || null);
        } catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filteredAll = invoices.filter(inv => {
        const partnerName = inv.supplier?.name || inv.customer?.name || '';
        const matchSearch = partnerName.toLowerCase().includes(searchTerm.toLowerCase()) || String(inv.invoiceNumber).includes(searchTerm);
        const invDate = new Date(inv.date);
        const matchFrom = !dateFrom || invDate >= new Date(dateFrom);
        const matchTo = !dateTo || invDate <= new Date(dateTo + 'T23:59:59');
        return matchSearch && matchFrom && matchTo;
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, dateFrom, dateTo]);

    const fmt = (num: number) => formatNumber(num);

    const getStatusStyle = (total: number, paid: number) => {
        if (paid >= total && total > 0) return { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', text: t('مدفوعة'), icon: CheckCircle2 };
        if (paid > 0) return { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', text: t('دفع جزئي'), icon: Clock };
        return { bg: 'rgba(251,113,133,0.1)', color: '#fb7185', text: t('غير مدفوعة'), icon: AlertCircle };
    };

    const handlePrint = (inv: Invoice) => {
        window.open(`/print/invoice/${inv.id}`, '_blank');
    };


    return (
        <DashboardLayout>
            <div dir={isRtl ? "rtl" : "ltr"} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={t("المشتريات")}
                    subtitle={t("سجل فواتير المشتريات وحالات السداد الفعلية")}
                    icon={ShoppingCart}
                    primaryButton={{
                        label: t('إضافة فاتورة'),
                        onClick: () => router.push('/purchases/new'),
                        icon: Plus
                    }}
                />

                <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={t("رقم الفاتورة أو اسم المورد...")}
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                    <div className="mobile-column mobile-gap-sm" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <span style={{ color: C.textMuted, fontSize: '12px', whiteSpace: 'nowrap' }}>{t("من")}</span>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...IS, borderRadius: '8px', fontSize: '13px', fontFamily: OUTFIT, color: C.textSecondary, flex: 1 }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <span style={{ color: C.textMuted, fontSize: '12px', whiteSpace: 'nowrap' }}>{t("إلى")}</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...IS, borderRadius: '8px', fontSize: '13px', fontFamily: OUTFIT, color: C.textSecondary, flex: 1 }} />
                        </div>
                    </div>

                    {(searchTerm || dateFrom || dateTo) && (
                        <button
                            className="mobile-full"
                            onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px', height: '36px',
                                background: 'transparent', border: `1px solid ${C.danger}40`, color: C.danger,
                                borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: '0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = `${C.danger}10`}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Trash2 size={14} /> {t("مسح")}
                        </button>
                    )}
                </div>

                {/* Table Section */}
                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ padding: '60px' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    ) : filteredAll.length === 0 ? (
                        <div style={{ padding: '70px' }}>
                            <Receipt size={36} style={{ color: C.textMuted, opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>{searchTerm || dateFrom || dateTo ? t('لا توجد نتائج بحث مطابقة') : t('لا توجد فواتير مشتريات')}</p>
                        </div>
                    ) : (
                        <div className="scroll-table">
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true) }}>{t("رقم الفاتورة")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false, true) }}>{t("التاريخ")}</th>
                                        <th style={{...TABLE_STYLE.th(false)}}>{t("المورد")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false, true), }}>{t("الإجمالي")}</th>
                                        <th style={{...TABLE_STYLE.th(false, true)}}>{t("المدفوع")}</th>
                                        <th style={{...TABLE_STYLE.th(false, true)}}>{t("المتبقي")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t("الحالة")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t("إجراءات")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((inv, idx) => {
                                        const st = getStatusStyle(inv.total, inv.paidAmount);
                                        const dateStr = new Date(inv.date).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB');
                                        return (
                                            <tr key={inv.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ ...TABLE_STYLE.td(true), fontWeight: 600, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: OUTFIT, width: '120px', }}>
                                                    PUR-{String(inv.invoiceNumber).padStart(5, '0')}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, true), color: C.textSecondary, fontSize: '13px', fontFamily: OUTFIT, }}>{dateStr}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, }}>{inv.supplier?.name || inv.customer?.name || '—'}</td>
                                                <td style={{...TABLE_STYLE.td(false, true)}}>
                                                    {fMoneyJSX(inv.total)}
                                                </td>
                                                <td style={{...TABLE_STYLE.td(false, true)}}>
                                                    {fMoneyJSX(inv.paidAmount, '', { color: C.success })}
                                                </td>
                                                <td style={{...TABLE_STYLE.td(false, true)}}>
                                                    {fMoneyJSX(inv.remaining, '', { color: (inv.remaining > 0) ? C.danger : C.textMuted })}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                        padding: '3px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700,
                                                        background: st.bg, color: st.color, border: `1px solid ${st.color}30`, fontFamily: CAIRO
                                                    }}>
                                                        {st.text} <st.icon size={12} />
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button onClick={() => handlePrint(inv)} style={TABLE_STYLE.actionBtn()} title={t("طباعة")}>
                                                            <Printer size={TABLE_STYLE.actionIconSize} />
                                                        </button>
                                                        <button onClick={() => router.push(`/purchases/${inv.id}`)} style={TABLE_STYLE.actionBtn()} title={t("عرض")}>
                                                            <Eye size={TABLE_STYLE.actionIconSize} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <Pagination 
                                total={filteredAll.length}
                                pageSize={pageSize}
                                currentPage={currentPage}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>
            </div>
            
        </DashboardLayout>
    );
}
