'use client';
import { formatNumber } from '@/lib/currency';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Plus, Search, Eye, Trash2, Loader2, CheckCircle2, Clock, AlertCircle, ShoppingCart, Printer, Send } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/hooks/useCurrency';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Quotation {
    id: string;
    quotationNumber: number;
    customer?: { id: string; name: string; phone?: string; address?: string; balance: number };
    date: string;
    total: number;
    subtotal: number;
    discount: number;
    status: string;
    notes?: string;
    lines: any[];
}

export default function QuotationsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { data: session } = useSession();
    const { symbol: cSymbol, fMoneyJSX } = useCurrency();
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const quoRes = await fetch('/api/quotations');
            if (quoRes.ok) {
                const data = await quoRes.json();
                setQuotations(data.quotations || []);
            }
        } catch (error) {
            console.error('Failed to fetch quotations:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredAll = quotations.filter(quo => {
        const matchesSearch =
            String(quo.quotationNumber).includes(searchTerm) ||
            (quo.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

        const quoDate = new Date(quo.date);
        const matchesFrom = dateFrom ? quoDate >= new Date(dateFrom) : true;
        const matchesTo = dateTo ? quoDate <= new Date(dateTo + 'T23:59:59') : true;

        return matchesSearch && matchesFrom && matchesTo;
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, dateFrom, dateTo]);

    const fmt = (num: number) => formatNumber(num);

    const getStatusStyle = (status: string) => {
        if (status === 'converted') return { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', text: t('تم التحويل لفاتورة'), icon: CheckCircle2 };
        if (status === 'cancelled') return { bg: 'rgba(251,113,133,0.1)', color: '#fb7185', text: t('ملغي'), icon: AlertCircle };
        return { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', text: t('قيد الانتظار'), icon: Clock };
    };

    const handleDelete = async (id: string, num: number) => {
        if (!confirm(`${t('هل أنت متأكد من حذف عرض السعر رقم')} ${num}؟`)) return;
        try {
            const res = await fetch(`/api/quotations?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchData();
            } else {
                alert(t('فشل حذف عرض السعر'));
            }
        } catch (error) {
            alert(t('خطأ في الاتصال بالسيرفر'));
        }
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>

                <PageHeader
                    title={t("عروض الأسعار")}
                    subtitle={t("إدارة عروض الأسعار المقدمة للعملاء وتحويلها لفواتير")}
                    icon={FileText}
                    primaryButton={{
                        label: t("عرض سعر جديد"),
                        onClick: () => router.push('/quotations/new'),
                        icon: Plus
                    }}
                />

                {/* Filters Section */}
                <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={t("رقم العرض أو اسم العميل...")}
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                    
                    {/* Responsive Date Filters */}
                    {/* Responsive Date Filters */}
                    <div className="mobile-flex-row mobile-gap-sm date-filter-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="date-label-desktop" style={{ color: C.textMuted, fontSize: '12px' }}>{t("من")}</span>
                        <div className="date-input-wrapper">
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t("من")}</span>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...IS, width: '160px' }} />
                        </div>
                        <span className="date-label-desktop" style={{ color: C.textMuted, fontSize: '12px' }}>{t("إلى")}</span>
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

                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ padding: '60px' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    ) : filteredAll.length === 0 ? (
                        <div style={{ padding: '80px' }}>
                            <FileText size={48} style={{ color: C.textMuted, opacity: 0.2, margin: '0 auto 15px' }} />
                            <p style={{ fontSize: '13px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>
                                {searchTerm || dateFrom || dateTo ? t('لا توجد نتائج بحث مطابقة') : t('لا يوجد عروض أسعار مسجلة حالياً')}
                            </p>
                        </div>
                    ) : (
                        <div className="scroll-table">
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true) }}>{t("رقم العرض")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t("العميل")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false, true) }}>{t("التاريخ")}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t("الإجمالي")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t("الحالة")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t("إجراءات")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((quo, idx) => {
                                        const status = getStatusStyle(quo.status);
                                        return (
                                            <tr key={quo.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ ...TABLE_STYLE.td(true), fontWeight: 600, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: OUTFIT, width: '120px', }}>
                                                    QUO-{quo.quotationNumber.toString().padStart(5, '0')}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, }}>
                                                    {quo.customer?.name || t('عميل نقدي')}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, true), fontSize: '13px', fontFamily: OUTFIT, color: C.textSecondary, }}>
                                                    {new Date(quo.date).toLocaleDateString('en-GB')}
                                                </td>
                                                <td style={{...TABLE_STYLE.td(false, true)}}>
                                                    {fMoneyJSX(quo.total)}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                        padding: '3px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700,
                                                        background: status.bg, color: status.color, border: `1px solid ${status.color}30`, fontFamily: CAIRO
                                                    }}>
                                                        {status.text} <status.icon size={12} />
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <Link href={`/quotations/${quo.id}`} title={t("عرض التفاصيل")} style={TABLE_STYLE.actionBtn()}><Eye size={TABLE_STYLE.actionIconSize} /></Link>
                                                        <button
                                                            onClick={() => window.open(`/print/quotation/${quo.id}`, '_blank')}
                                                            title={t("طباعة")}
                                                            style={TABLE_STYLE.actionBtn()}
                                                        >
                                                            <Printer size={TABLE_STYLE.actionIconSize} />
                                                        </button>
                                                        {quo.status === 'pending' && (
                                                            <Link href={`/sales/new?quotationId=${quo.id}`} title={t("تحويل لفاتورة")} style={TABLE_STYLE.actionBtn(C.success)}><Send size={TABLE_STYLE.actionIconSize} /></Link>
                                                        )}
                                                        <button onClick={() => handleDelete(quo.id, quo.quotationNumber)} title={t("حذف")} style={TABLE_STYLE.actionBtn(C.danger)}><Trash2 size={TABLE_STYLE.actionIconSize} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <Pagination
                        currentPage={currentPage}
                        total={filteredAll.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>
            
        </DashboardLayout>
    );
}
