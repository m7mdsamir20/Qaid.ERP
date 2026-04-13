'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { 
    FileText, Plus, Search, Eye, Trash2, Loader2, 
    CheckCircle2, Clock, AlertCircle, ShoppingCart, Printer, Send
} from 'lucide-react';
import { THEME, C, CAIRO, INTER, IS, LS, focusIn, focusOut, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import { useRouter } from 'next/navigation';
import { CompanyInfo, printQuotation } from '@/lib/printInvoices';
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
    const { symbol: cSymbol } = useCurrency();
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [company, setCompany] = useState<CompanyInfo>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [quoRes, comRes] = await Promise.all([
                fetch('/api/quotations'),
                fetch('/api/company')
            ]);
            if (quoRes.ok) {
                const data = await quoRes.json();
                setQuotations(data.quotations || []);
            }
            if (comRes.ok) {
                setCompany(await comRes.json());
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
        const matchesTo = dateTo ? quoDate <= new Date(dateTo) : true;

        return matchesSearch && matchesFrom && matchesTo;
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, dateFrom, dateTo]);

    const fmt = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

                {/* Filters Section - Matched with Sales Invoice */}
                <div style={SEARCH_STYLE.container}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input 
                            placeholder={t("رقم العرض أو اسم العميل...")}
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            style={SEARCH_STYLE.input} 
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: C.textMuted, fontSize: '12px' }}>{t("من")}</span>
                        <div style={{ width: '160px' }}>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...IS, height: '36px', borderRadius: '6px', fontSize: '13px', fontFamily: INTER, background: C.card, color: C.textSecondary }} />
                        </div>
                        <span style={{ color: C.textMuted, fontSize: '12px' }}>{t("إلى")}</span>
                        <div style={{ width: '160px' }}>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...IS, height: '36px', borderRadius: '6px', fontSize: '13px', fontFamily: INTER, background: C.card, color: C.textSecondary }} />
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
                            <Trash2 size={14} /> {t("مسح")}
                        </button>
                    )}
                </div>

                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    ) : filteredAll.length === 0 ? (
                        <div style={{ padding: '80px', textAlign: 'center' }}>
                            <FileText size={48} style={{ color: C.textMuted, opacity: 0.2, margin: '0 auto 15px' }} />
                            <p style={{ fontSize: '16px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>
                                {searchTerm || dateFrom || dateTo ? t('لا توجد نتائج بحث مطابقة') : t('لا يوجد عروض أسعار مسجلة حالياً')}
                            </p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                             <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(true)}>{t("رقم العرض")}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t("العميل")}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t("التاريخ")}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t("الإجمالي")}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t("الحالة")}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t("إجراءات")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((quo, idx) => {
                                        const status = getStatusStyle(quo.status);
                                        return (
                                            <tr key={quo.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
                                            >
                                                <td style={{ ...TABLE_STYLE.td(true), fontWeight: 800, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: INTER, width: '120px', textAlign: isRtl ? 'right' : 'left' }}>
                                                    QUO-{quo.quotationNumber.toString().padStart(5, '0')}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, textAlign: isRtl ? 'right' : 'left' }}>
                                                    {quo.customer?.name || t('عميل نقدي')}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', fontFamily: INTER, color: C.textSecondary, textAlign: isRtl ? 'right' : 'left' }}>
                                                    {new Date(quo.date).toLocaleDateString('en-GB')}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 800, color: C.textPrimary, fontFamily: INTER, textAlign: isRtl ? 'right' : 'left' }}>
                                                    {fmt(quo.total)} <span style={{ fontSize: '10px', opacity: 0.6, fontFamily: CAIRO }}>{cSymbol}</span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: isRtl ? 'right' : 'left' }}>
                                                    <div style={{ 
                                                        display: 'inline-flex', alignItems: 'center', gap: '5px', 
                                                        padding: '3px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700,
                                                        background: status.bg, color: status.color, border: `1px solid ${status.color}30`, fontFamily: CAIRO
                                                    }}>
                                                        {status.text} <status.icon size={12} />
                                                    </div>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <Link href={`/quotations/${quo.id}`} title={t("عرض التفاصيل")} style={TABLE_STYLE.actionBtn()}><Eye size={TABLE_STYLE.actionIconSize} /></Link>
                                                        <button 
                                                            onClick={async () => {
                                                                let full = quo;
                                                                if (!full.lines || full.lines.length === 0) {
                                                                    const r = await fetch(`/api/quotations?id=${quo.id}`);
                                                                    if (r.ok) full = await r.json();
                                                                }
                                                                const branches = (session?.user as any)?.branches || [];
                                                                const branchName = branches.length > 1 ? (session?.user as any)?.activeBranchName : undefined;
                                                                const bizType = (session?.user as any)?.businessType || company.businessType;
                                                                printQuotation(full, { ...company, branchName, businessType: bizType });
                                                            }}
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
                    
                    {filteredAll.length > pageSize && (
                        <div style={{ padding: '15px', borderTop: `1px solid ${C.border}` }}>
                            <Pagination 
                                currentPage={currentPage} 
                                total={filteredAll.length} 
                                pageSize={pageSize} 
                                onPageChange={setCurrentPage} 
                            />
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
