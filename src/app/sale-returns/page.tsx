'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { RotateCcw, Plus, Printer, Loader2, Search, ChevronDown, Package, Trash2, Calendar, Eye, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { useCurrency } from '@/hooks/useCurrency';
import { formatNumber } from '@/lib/currency';
import { printInvoiceDirectly } from '@/lib/printDirectly';


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
    const { symbol: cSymbol, fMoneyJSX } = useCurrency();
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
        printInvoiceDirectly(r.id)
    };

    const getStatusStyle = (r: ReturnInvoice) => {
        if (r.paidAmount >= r.total && r.total > 0) return { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', text: t('مكتمل') };
        if (r.paidAmount > 0) return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', text: t('جزئي') };
        return { bg: 'rgba(37, 106, 244,0.1)', color: '#256af4', text: t('تسوية رصيد') };
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader
                    title={isServices ? t("مرتجعات الخدمات") : t("مرتجعات المبيعات")}
                    subtitle={isServices ? t("إدارة إلغاء الخدمات أو رد قيمتها للعملاء — تسوية مبالغ خدمات سابقة") : t("إدارة المرتجعات من العملاء — رد قيمة الأصناف نقداً أو تسوية مبيعات سابقة")}
                    icon={RotateCcw}
                    primaryButton={canCreate ? {
                        label: isServices ? t("مرتجع خدمة جديد") : t("مرتجع جديد"),
                        onClick: () => router.push('/sale-returns/new'),
                        icon: Plus
                    } : undefined}
                />

                <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={t("ابحث برقم المرتجع أو اسم العميل...")}
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>

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

                <DataTable
                    columns={[
                        { header: t('رقم المرتجع'), type: 'number', cell: (row) => <span style={{ fontWeight: 600, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: OUTFIT }}>{`RET-${String(row.invoiceNumber).padStart(5, '0')}`}</span> },
                        { header: t('التاريخ'), type: 'date', cell: (row) => <span style={{ color: C.textSecondary, fontSize: '13px', fontFamily: OUTFIT }}>{new Date(row.date).toLocaleDateString('en-GB')}</span> },
                        { header: t('العميل'), type: 'text', cell: (row) => <span style={{ fontWeight: 600, fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO }}>{row.customer?.name || '—'}</span> },
                        { header: t('الإجمالي'), type: 'number', cell: (row) => fMoneyJSX(row.total) },
                        { header: t('تم رده'), type: 'number', cell: (row) => fMoneyJSX(row.paidAmount, '', { color: C.success }) },
                        { header: t('المتبقي'), type: 'number', cell: (row) => fMoneyJSX(row.remaining, '', { color: (row.remaining > 0) ? C.danger : C.textMuted }) },
                        {
                            header: t('الحالة'), type: 'status', cell: (row) => {
                                const st = getStatusStyle(row);
                                return (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.color}30`, fontFamily: CAIRO }}>
                                        {st.text}
                                    </div>
                                );
                            }
                        },
                        {
                            header: t('إجراءات'), type: 'action', cell: (row) => (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                    <button onClick={() => handlePrint(row)} style={TABLE_STYLE.actionBtn()} title={t("طباعة")}><Printer size={TABLE_STYLE.actionIconSize} /></button>
                                    <button onClick={() => router.push(`/sale-returns/${row.id}`)} style={TABLE_STYLE.actionBtn()} title={t("عرض")}><Eye size={TABLE_STYLE.actionIconSize} /></button>
                                </div>
                            )
                        },
                    ]}
                    data={filtered}
                    emptyIcon={RotateCcw}
                    emptyMessage={searchTerm || dateFrom || dateTo ? t('لا توجد نتائج بحث مطابقة') : (isServices ? t("لا توجد مرتجعات خدمات") : t("لا توجد مرتجعات مبيعات"))}
                    isLoading={loading}
                    loadingSkeleton={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', textAlign: 'center' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    }
                />
            </div>

        </DashboardLayout>
    );
}
