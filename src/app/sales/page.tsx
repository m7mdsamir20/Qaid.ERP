'use client';
import { formatNumber } from '@/lib/currency';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Receipt, Plus, Search, Eye, Trash2, Loader2, CheckCircle2, Clock, AlertCircle, ShoppingCart, Printer } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/hooks/useCurrency';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { printInvoiceDirectly } from '@/lib/printDirectly';


interface Invoice {
    id: string;
    invoiceNumber: number;
    customer?: { id: string; name: string; phone?: string; address?: string; balance: number };
    date: string;
    total: number;
    subtotal: number;
    discount: number;
    paidAmount: number;
    remaining: number;
    notes?: string;
    lines: any[];
}

export default function SalesPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { symbol: cSymbol, fMoneyJSX } = useCurrency();
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';

    // Permission checks
    const userPerms = (session?.user as any)?.permissions || {};
    const userRole = (session?.user as any)?.role;
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin;
    const hasGranularPerms = Object.keys(userPerms).length > 0;
    const salesPerms = userPerms['/sales'] || {};
    const canCreate = isSuperAdmin || userRole === 'admin' || !hasGranularPerms || !!salesPerms.create;
    const canEditDelete = isSuperAdmin || userRole === 'admin' || !hasGranularPerms || !!salesPerms.editDelete;
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const salRes = await fetch('/api/sales');
            if (salRes.ok) {
                const data = await salRes.json();
                setInvoices(data.invoices || []);
            }
        } catch (error) {
            console.error('Failed to fetch sales:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredAll = invoices.filter(inv => {
        const matchesSearch =
            String(inv.invoiceNumber).includes(searchTerm) ||
            (inv.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

        const invDate = new Date(inv.date);
        const matchesFrom = dateFrom ? invDate >= new Date(dateFrom) : true;
        const matchesTo = dateTo ? invDate <= new Date(dateTo + 'T23:59:59') : true;

        return matchesSearch && matchesFrom && matchesTo;
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
        printInvoiceDirectly(inv.id)
    };

    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';

    return (
        <DashboardLayout>
            <div dir={isRtl ? "rtl" : "ltr"} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={isServices ? t("فواتير الخدمات") : t("المبيعات")}
                    subtitle={isServices ? t("سجل الخدمات المقدمة للعملاء وتحصيل الرسوم") : t("سجل فواتير المبيعات وحالات التحصيل الفعلية")}
                    icon={Receipt}
                    primaryButton={canCreate ? {
                        label: isServices ? t("إصدار فاتورة خدمة") : t("إضافة فاتورة"),
                        onClick: () => router.push('/sales/new'),
                        icon: Plus
                    } : undefined}
                />

                {/* Filters Section */}
                <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={t("رقم الفاتورة أو اسم العميل...")}
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>

                    {/* Responsive Date Filters */}
                    {/* Responsive Date Filters */}
                    <div className="mobile-flex-row mobile-gap-sm date-filter-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '12px' }}>{t("من")}</span>
                        <div className="date-input-wrapper">
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t("من")}</span>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...IS, width: '160px' }} />
                        </div>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '12px' }}>{t("إلى")}</span>
                        <div className="date-input-wrapper">
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t("إلى")}</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...IS, width: '160px' }} />
                        </div>
                    
                    </div>

                    {(searchTerm || dateFrom || dateTo) && (
                        <button
                            className="mobile-full"
                            onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); }}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0 12px', height: '36px',
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
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', textAlign: 'center' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    ) : filteredAll.length === 0 ? (
                        <div style={{ padding: '70px', textAlign: 'center' }}>
                            <Receipt size={36} style={{ color: C.textMuted, opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>{searchTerm || dateFrom || dateTo ? t('لا توجد نتائج بحث مطابقة') : (isServices ? t('لا توجد فواتير خدمات') : t('لا توجد فواتير مبيعات'))}</p>
                        </div>
                    ) : (
                        <div className="scroll-table">
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true, true) }}>{t("رقم الفاتورة")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false, false) }}>{t("التاريخ")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false, false) }}>{t("العميل")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false, true) }}>{t("الإجمالي")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false, true) }}>{t("المدفوع")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false, true) }}>{t("المتبقي")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false, true), textAlign: 'center' }}>{t("الحالة")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false, true), textAlign: 'center' }}>{t("إجراءات")}</th>
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
                                                <td style={{ ...TABLE_STYLE.td(true, true), fontWeight: 600, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: OUTFIT, width: '120px', }}>
                                                    {isServices ? 'SRV' : 'SAL'}-{String(inv.invoiceNumber).padStart(5, '0')}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, false), color: C.textSecondary, fontSize: '13px', fontFamily: OUTFIT, }}>{dateStr}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, }}>{inv.customer ? inv.customer.name : t("عميل نقدي")}</td>
                                                <td style={{ ...TABLE_STYLE.td(false, true) }}>
                                                    {fMoneyJSX(inv.total)}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, true) }}>
                                                    {fMoneyJSX(inv.paidAmount, '', { color: C.success })}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, true) }}>
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
                                                        <button onClick={() => handlePrint(inv)} style={TABLE_STYLE.actionBtn()} title={t('طباعة')}>
                                                            <Printer size={TABLE_STYLE.actionIconSize} />
                                                        </button>
                                                        <button onClick={() => router.push(`/sales/${inv.id}`)} style={TABLE_STYLE.actionBtn()} title={t('عرض')}>
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
