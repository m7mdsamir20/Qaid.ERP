'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import {
    Receipt, Package, Printer, Loader2, ArrowRight, User, ShoppingCart,
    Calendar, Building2, Banknote, CreditCard, Info, CheckCircle2, AlertCircle, Clock, Wallet, RotateCcw
} from 'lucide-react';
import { printA4Invoice, CompanyInfo } from '@/lib/printInvoices';
import { THEME, C, CAIRO, INTER, IS, LS, PAGE_BASE, TABLE_STYLE, SC, STitle } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';
import { useSession } from 'next-auth/react';

interface ReturnInvoice {
    id: string;
    invoiceNumber: number;
    date: string;
    total: number;
}

interface SaleInvoice {
    id: string;
    invoiceNumber: number;
    date: string;
    customer: { name: string; phone?: string; balance: number } | null;
    supplier: { name: string; phone?: string; balance: number } | null;
    warehouse: { name: string } | null;
    subtotal: number;
    discount: number;
    total: number;
    paidAmount: number;
    remaining: number;
    paymentMethod: 'cash' | 'bank' | 'credit';
    taxAmount?: number;
    taxRate?: number;
    notes?: string;
    lines: {
        id: string;
        item: { name: string; code: string; unit?: { name: string } };
        quantity: number;
        price: number;
        total: number;
        taxRate?: number;
        taxAmount?: number;
        description?: string;
    }[];
    returnInvoices?: ReturnInvoice[];
}

export default function SaleDetailPage(props: { params: Promise<{ id: string }> }) {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const params = use(props.params);
    const router = useRouter();
    const { symbol: cSymbol } = useCurrency();
    const { data: session } = useSession();
    const [invoice, setInvoice] = useState<SaleInvoice | null>(null);
    const [company, setCompany] = useState<CompanyInfo>({});
    const [loading, setLoading] = useState(true);

    const fetchDetail = useCallback(async () => {
        try {
            const [invR, coR] = await Promise.all([
                fetch(`/api/sales/${params.id}`),
                fetch('/api/company')
            ]);
            if (invR.ok) {
                const data = await invR.json();
                setInvoice(data);
            }
            if (coR.ok) setCompany(await coR.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.textSecondary }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        </DashboardLayout>
    );

    if (!invoice) return (
        <DashboardLayout>
            <div style={{ textAlign: 'center', padding: '100px', color: C.danger }}>{t('الفاتورة غير موجودة أو تم حذفها')}</div>
        </DashboardLayout>
    );

    const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const getStatus = () => {
        if (invoice.paidAmount >= invoice.total) return { label: t('مدفوعة بالكامل'), color: C.success, icon: CheckCircle2, bg: 'rgba(74,222,128,0.1)' };
        if (invoice.paidAmount > 0) return { label: t('تحصيل جزئي'), color: '#fbbf24', icon: Clock, bg: 'rgba(251,191,36,0.1)' };
        return { label: t('غير مدفوعة (آجل)'), color: C.danger, icon: AlertCircle, bg: 'rgba(239,68,68,0.1)' };
    };

    const status = getStatus();

    const isServices = (session?.user as any)?.businessType?.toUpperCase() === 'SERVICES';
    const invLabel = isServices ? t('فاتورة خدمات') : t('فاتورة مبيعات');
    const invPrefix = isServices ? 'SRV' : 'SAL';
    const invNumFmt = `${invPrefix}-${String(invoice.invoiceNumber).padStart(5, '0')}`;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>

                <PageHeader
                    title={`${t('تفاصيل')} ${invLabel}`}
                    subtitle={`${t('تاريخ الفاتورة:')} ${new Date(invoice.date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')} — ${t('سجل العميل والتحصيل المالي')}`}
                    icon={Receipt}
                    backUrl="/sales"
                    primaryButton={{
                        label: t('طباعة الفاتورة'),
                        onClick: () => {
                            const branches = (session?.user as any)?.branches || [];
                            const branchName = branches.length > 1 ? (session?.user as any)?.activeBranchName : undefined;

                            if (invoice.notes?.includes('POS الكاشير السريع')) {
                                const printWindow = window.open('', '_blank', 'width=350,height=600');
                                if (printWindow) {
                                    const receiptDate = new Date(invoice.date).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
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
                                                    <p>رقم الفاتورة: #${invoice.invoiceNumber}</p>
                                                    <p>تاريخ: ${receiptDate}</p>
                                                </div>
                                                <div class="divider"></div>
                                                <div style="font-weight: bold; font-size:12px; display:flex; margin-bottom: 5px;">
                                                    <span class="item-name">الصنف</span>
                                                    <span class="item-qty">كمية</span>
                                                    <span class="item-total">إجمالي</span>
                                                </div>
                                                ${invoice.lines.map(line => `
                                                    <div class="item-row">
                                                        <span class="item-name">
                                                            ${line.item?.name || 'صنف'}
                                                            ${line.description ? `<br/><small style="font-size: 10px; opacity: 0.8; font-weight: normal">${line.description}</small>` : ''}
                                                        </span>
                                                        <span class="item-qty">${line.quantity}</span>
                                                        <span class="item-total">${fmt(line.total)}</span>
                                                    </div>
                                                `).join('')}
                                                <div class="divider"></div>
                                                <div class="totals-row">
                                                    <span>المجموع:</span>
                                                    <span>${fmt(invoice.subtotal)} ${cSymbol}</span>
                                                </div>
                                                ${invoice.discount > 0 ? `
                                                <div class="totals-row">
                                                    <span>الخصم:</span>
                                                    <span>- ${fmt(invoice.discount)} ${cSymbol}</span>
                                                </div>` : ''}
                                                <div class="totals-row" style="font-size: 18px; margin-top: 10px; border-top: 1px solid #000; padding-top: 5px;">
                                                    <span>الإجمالي:</span>
                                                    <span>${fmt(invoice.total)} ${cSymbol}</span>
                                                </div>
                                                <div class="footer">
                                                    <p>شكراً لزيارتكم!</p>
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

                            const bizType = (session?.user as any)?.businessType || company.businessType;
                            printA4Invoice(invoice, 'sale', { ...company, branchName, businessType: bizType }, { partyBalance: invoice.customer?.balance });
                        },
                        icon: Printer
                    }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* ── Metadata Icons ── */}
                        <div style={{ ...SC, display: 'grid', gridTemplateColumns: isServices ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={18} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '10px', color: C.textMuted, margin: 0 }}>{t('العميل / المستلم')}</p>
                                    <p style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, margin: 0 }}>{invoice.customer?.name || invoice.supplier?.name || '—'}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Receipt size={18} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '10px', color: C.textMuted, margin: 0 }}>{t('رقم الفاتورة')}</p>
                                    <div style={{ color: C.primary, fontWeight: 900, fontSize: '14px', fontFamily: INTER }}>{invNumFmt}</div>
                                </div>
                            </div>

                            {!isServices && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Building2 size={18} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '10px', color: C.textMuted, margin: 0 }}>{t('المستودع / المخزن')}</p>
                                        <p style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, margin: 0 }}>{invoice.warehouse?.name || '—'}</p>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: status.bg, color: status.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <status.icon size={18} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '10px', color: C.textMuted, margin: 0 }}>{t('حالة التحصيل')}</p>
                                    <p style={{ fontSize: '13px', fontWeight: 800, color: status.color, margin: 0 }}>{status.label}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── Items Table ── */}
                        <div style={TABLE_STYLE.container}>
                            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)' }}>
                                <div style={STitle}><Package size={14} /> {t('بنود الفاتورة')}</div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary }}>{invoice.lines.length} {t('عناصر')}</div>
                            </div>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(true)}>{isServices ? t('الخدمة') : t('الصنف')}</th>
                                        {!isServices && <th style={TABLE_STYLE.th(false)}>{t('الوحدة')}</th>}
                                        <th style={TABLE_STYLE.th(false)}>{t('الكمية')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{isServices ? t('سعر الخدمة') : t('سعر البيع')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('الضريبة')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('الإجمالي')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.lines.map((l, idx) => (
                                        <tr key={l.id} style={TABLE_STYLE.row(idx === invoice.lines.length - 1)}>
                                            <td style={{ ...TABLE_STYLE.td(true), textAlign: 'start' }}>
                                                <div style={{ color: C.textPrimary, fontWeight: 700 }}>{l.item.name}</div>
                                                {l.description && <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px', fontWeight: 400 }}>{l.description}</div>}
                                                <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: INTER }}>{l.item.code}</div>
                                            </td>
                                            {!isServices && (
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', color: C.textSecondary, fontSize: '12px' }}>{l.item.unit?.name || t('حبة')}</td>
                                            )}
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', fontFamily: INTER, fontWeight: 800, color: C.textPrimary }}>{l.quantity}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', fontFamily: INTER, fontWeight: 700, color: C.textSecondary }}>{fmt(l.price)}</td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#fb7185', fontSize: '12px', fontWeight: 600, fontFamily: INTER }}>
                                                {l.taxAmount ? l.taxAmount.toLocaleString() : '0.00'} <span style={{ fontSize: '10px', opacity: 0.7 }}>({l.taxRate || 0}%)</span>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', fontFamily: INTER, fontWeight: 900, fontSize: '14px', color: C.primary }}>{fmt(l.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {invoice.notes && (
                            <div style={{ ...SC, background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ ...STitle, fontSize: '11px', color: C.textMuted }}><Info size={12} /> {t('ملاحظات')}</div>
                                <p style={{ fontSize: '13px', color: C.textSecondary, margin: '8px 0 0', lineHeight: 1.6 }}>{invoice.notes}</p>
                            </div>
                        )}

                        {invoice.returnInvoices && invoice.returnInvoices.length > 0 && (
                            <div style={TABLE_STYLE.container}>
                                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239,68,68,0.04)' }}>
                                    <div style={{ ...STitle, color: C.danger }}><RotateCcw size={14} /> {t('مرتجعات هذه الفاتورة')}</div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: C.danger }}>{invoice.returnInvoices.length} {t('مرتجع')}</div>
                                </div>
                                <table style={TABLE_STYLE.table}>
                                    <thead>
                                        <tr style={TABLE_STYLE.thead}>
                                            <th style={TABLE_STYLE.th(true)}>{t('رقم المرتجع')}</th>
                                            <th style={TABLE_STYLE.th(false)}>{t('التاريخ')}</th>
                                            <th style={TABLE_STYLE.th(false)}>{t('قيمة المرتجع')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoice.returnInvoices.map((ret, idx) => (
                                            <tr key={ret.id} style={TABLE_STYLE.row(idx === (invoice.returnInvoices?.length ?? 0) - 1)}>
                                                <td style={TABLE_STYLE.td(true)}>
                                                    <span style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 900, color: '#f87171', fontFamily: INTER }}>
                                                        SRET-{String(ret.invoiceNumber).padStart(5, '0')}
                                                    </span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), color: C.textSecondary, fontSize: '12px' }}>
                                                    {new Date(ret.date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontFamily: INTER, fontWeight: 900, color: C.danger }}>
                                                    {fmt(ret.total)} {cSymbol}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── Side Summary ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={SC}>
                            <div style={STitle}><Wallet size={14} /> {t('ملخص الحساب')}</div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('إجمالي القيمة')}</span>
                                    <span style={{ fontWeight: 700, fontFamily: INTER }}>{fmt(invoice.subtotal)} {cSymbol}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('إجمالي الخصم')}</span>
                                    <span style={{ fontWeight: 700, fontFamily: INTER, color: C.danger }}>- {fmt(invoice.discount)} {cSymbol}</span>
                                </div>
                                {(invoice.taxAmount || 0) > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <span style={{ color: C.textSecondary }}>{t('إجمالي الضريبة')}</span>
                                        <span style={{ fontWeight: 700, fontFamily: INTER, color: '#f87171' }}>+ {fmt(invoice.taxAmount || 0)} {cSymbol}</span>
                                    </div>
                                )}
                                <div style={{ height: '1px', background: C.border, margin: '5px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: 'rgba(37,106,244,0.08)', border: `1px solid ${C.primaryBorder}` }}>
                                    <span style={{ fontWeight: 800, fontSize: '12px' }}>{t('صافي الفاتورة')}</span>
                                    <span style={{ fontWeight: 900, fontSize: '18px', color: C.primary, fontFamily: INTER }}>{fmt(invoice.total)} {cSymbol}</span>
                                </div>
                            </div>
                        </div>

                        <div style={SC}>
                            <div style={STitle}><CreditCard size={14} /> {t('تفاصيل السداد')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('نوع البيع')}</span>
                                    <span style={{ fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', fontSize: '11px' }}>
                                        {invoice.paymentMethod === 'cash' ? t('نقدي') : invoice.paymentMethod === 'bank' ? t('بنكي') : t('آجل')}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('المقبوض فعلياً')}</span>
                                    <span style={{ fontWeight: 800, color: C.success, fontFamily: INTER }}>{fmt(invoice.paidAmount)} {cSymbol}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('المتبقي (مدين)')}</span>
                                    <span style={{ fontWeight: 800, color: invoice.remaining > 0 ? C.danger : C.textMuted, fontFamily: INTER }}>{fmt(invoice.remaining)} {cSymbol}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } `}</style>
        </DashboardLayout>
    );
}
