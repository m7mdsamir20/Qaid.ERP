'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
    Receipt, Plus, Search, Eye, Trash2, Loader2, 
    CheckCircle2, Clock, AlertCircle, ShoppingCart, Printer
} from 'lucide-react';
import { THEME, C, CAIRO, INTER, IS, LS, focusIn, focusOut, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import { useRouter } from 'next/navigation';
import { printA4Invoice, CompanyInfo } from '@/lib/printInvoices';
import { useCurrency } from '@/hooks/useCurrency';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

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
    const { symbol: cSymbol } = useCurrency();
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [invoices, setInvoices] = useState<Invoice[]>([]);
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
            const [salRes, comRes] = await Promise.all([
                fetch('/api/sales'),
                fetch('/api/company')
            ]);
            if (salRes.ok) {
                const data = await salRes.json();
                setInvoices(data.invoices || []);
            }
            if (comRes.ok) {
                setCompany(await comRes.json());
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
        const matchesTo = dateTo ? invDate <= new Date(dateTo) : true;

        return matchesSearch && matchesFrom && matchesTo;
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, dateFrom, dateTo]);

    const fmt = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const getStatusStyle = (total: number, paid: number) => {
        if (paid >= total && total > 0) return { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', text: 'مدفوعة', icon: CheckCircle2 };
        if (paid > 0) return { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', text: 'دفع جزئي', icon: Clock };
        return { bg: 'rgba(251,113,133,0.1)', color: '#fb7185', text: 'غير مدفوعة', icon: AlertCircle };
    };

    const handlePrint = async (inv: Invoice) => {
        // Find if we already have lines, if not fetch them
        let fullInv = inv;
        if (!inv.lines || inv.lines.length === 0) {
            try {
                const res = await fetch(`/api/sales?id=${inv.id}`);
                if (res.ok) {
                    fullInv = await res.json();
                } else {
                    alert('تعذر جلب تفاصيل الفاتورة للطباعة');
                    return;
                }
            } catch (err) {
                alert('خطأ في الاتصال');
                return;
            }
        }

        if (fullInv.notes?.includes('POS الكاشير السريع')) {
            const printWindow = window.open('', '_blank', 'width=350,height=600');
            if (printWindow) {
                const receiptDate = new Date(fullInv.date).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>فاتورة مبيعات</title>
                        <style>
                            body { font-family: 'Tahoma', sans-serif; padding: 10px; margin: 0; background: #fff; color: #000; direction: rtl; text-align: center; }
                            .receipt-container { width: 100%; max-width: 300px; margin: 0 auto; text-align: center; }
                            .header h2 { margin: 0; font-size: 18px; font-weight: bold; }
                            .header p { margin: 2px 0; font-size: 12px; }
                            .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
                            .item-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; text-align: right; }
                            .item-name { flex: 1; padding-insetInlineStart: 5px; }
                            .item-qty { width: 30px; text-align: center; }
                            .item-total { width: 70px; text-align: left; }
                            .totals-row { display: flex; justify-content: space-between; font-size: 14px; margin-top: 5px; font-weight: bold; }
                            .footer { font-size: 12px; margin-top: 15px; text-align: center; }
                        </style>
                    </head>
                    <body onload="window.print(); window.close();">
                        <div class="receipt-container">
                            <div class="header">
                                ${company.logo ? `<img src="${company.logo}" style="max-height: 60px; max-width: 120px; object-fit: contain; margin: 0 auto 5px;" alt="Logo" />` : ''}
                                <h2>${company.name || 'الشركة للأنظمة'}</h2>
                                <p>فاتورة كاشير POS</p>
                                <p>رقم الفاتورة: #${fullInv.invoiceNumber}</p>
                                <p>تاريخ: ${receiptDate}</p>
                             </div>
                            <div class="divider"></div>
                             <div style="font-weight: bold; font-size:12px; display:flex; margin-bottom: 5px;">
                                <span class="item-name">الصنف</span>
                                <span class="item-qty">كمية</span>
                                <span class="item-total">إجمالي</span>
                            </div>
                            ${(fullInv.lines || []).map(line => `
                                <div class="item-row">
                                    <span class="item-name">${line.item?.name || line.itemName || 'صنف'}</span>
                                    <span class="item-qty">${line.quantity}</span>
                                    <span class="item-total">${fmt(line.total)}</span>
                                </div>
                            `).join('')}
                            <div class="divider"></div>
                            <div class="totals-row">
                                <span>المجموع:</span>
                                <span>${fmt(fullInv.subtotal)} ${cSymbol}</span>
                            </div>
                            ${fullInv.discount > 0 ? `
                            <div class="totals-row">
                                <span>الخصم:</span>
                                <span>- ${fmt(fullInv.discount)} ${cSymbol}</span>
                            </div>` : ''}
                            <div class="totals-row" style="font-size: 18px; margin-top: 10px; border-top: 1px solid #000; padding-top: 5px;">
                                <span>الإجمالي:</span>
                                <span>${fmt(fullInv.total)} ${cSymbol}</span>
                            </div>
                            <div class="footer">
                                <p>شکراً لزيارتكم!</p>
                                <p style="font-size: 10px; color: #555;">Powered By ERP</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            }
            return;
        }

        printA4Invoice(fullInv, 'sale', company, {
            partyBalance: fullInv.customer?.balance
        });
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
                    primaryButton={{
                        label: isServices ? t("إصدار فاتورة خدمة") : t("إضافة فاتورة"),
                        onClick: () => router.push('/sales/new'),
                        icon: Plus
                    }}
                />

                {/* Filters Section */}
                <div style={SEARCH_STYLE.container}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input 
                            placeholder={t("رقم الفاتورة أو اسم العميل...")}
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

                {/* Table Section */}
                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto' }} />
                        </div>
                    ) : filteredAll.length === 0 ? (
                        <div style={{ padding: '70px', textAlign: 'center' }}>
                            <Receipt size={36} style={{ color: C.textMuted, opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>{searchTerm || dateFrom || dateTo ? t('لا توجد نتائج بحث مطابقة') : (isServices ? t('لا توجد فواتير خدمات') : t('لا توجد فواتير مبيعات'))}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true), textAlign: isRtl ? 'right' : 'left' }}>{t("رقم الفاتورة")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: isRtl ? 'right' : 'left' }}>{t("التاريخ")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: isRtl ? 'right' : 'left' }}>{t("العميل")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: isRtl ? 'right' : 'left' }}>{t("الإجمالي")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: isRtl ? 'right' : 'left' }}>{t("المدفوع")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: isRtl ? 'right' : 'left' }}>{t("المتبقي")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: isRtl ? 'right' : 'left' }}>{t("الحالة")}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t("إجراءات")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((inv, idx) => {
                                        const st = getStatusStyle(inv.total, inv.paidAmount);
                                        const dateStr = new Date(inv.date).toLocaleDateString('en-GB');
                                        return (
                                            <tr key={inv.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
                                            >
                                                <td style={{ ...TABLE_STYLE.td(true), fontWeight: 800, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: INTER, width: '120px', textAlign: isRtl ? 'right' : 'left' }}>
                                                    SAL-{String(inv.invoiceNumber).padStart(5, '0')}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), color: C.textSecondary, fontSize: '13px', fontFamily: INTER, textAlign: isRtl ? 'right' : 'left' }}>{dateStr}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, textAlign: isRtl ? 'right' : 'left' }}>{inv.customer ? inv.customer.name : t("عميل نقدي")}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: C.textPrimary, fontFamily: INTER, textAlign: isRtl ? 'right' : 'left' }}>
                                                    {fmt(inv.total)} <span style={{ fontSize: '10px', opacity: 0.6, fontFamily: CAIRO }}>{cSymbol}</span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: C.success, fontFamily: INTER, textAlign: isRtl ? 'right' : 'left' }}>
                                                    {fmt(inv.paidAmount)} <span style={{ fontSize: '10px', opacity: 0.6, fontFamily: CAIRO }}>{cSymbol}</span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontWeight: 600, color: (inv.remaining > 0) ? C.danger : C.textMuted, fontFamily: INTER, textAlign: isRtl ? 'right' : 'left' }}>
                                                    {fmt(inv.remaining)} <span style={{ fontSize: '10px', opacity: 0.6, fontFamily: CAIRO }}>{cSymbol}</span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: isRtl ? 'right' : 'left' }}>
                                                    <div style={{ 
                                                        display: 'inline-flex', alignItems: 'center', gap: '5px', 
                                                        padding: '3px 10px', borderRadius: '30px', fontSize: '11px', fontWeight: 700,
                                                        background: st.bg, color: st.color, border: `1px solid ${st.color}30`, fontFamily: CAIRO
                                                    }}>
                                                        {t(st.text)} <st.icon size={12} />
                                                    </div>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button onClick={() => handlePrint(inv)} style={TABLE_STYLE.actionBtn()} title="طباعة">
                                                            <Printer size={TABLE_STYLE.actionIconSize} />
                                                        </button>
                                                        <button onClick={() => router.push(`/sales/${inv.id}`)} style={TABLE_STYLE.actionBtn()} title="عرض">
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
        </DashboardLayout>
    );
}
