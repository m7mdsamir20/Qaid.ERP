'use client';
import { formatNumber } from '@/lib/currency';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { Receipt, Package, Printer, Loader2, ArrowRight, ArrowLeft, User, ShoppingCart, Calendar, Building2, Banknote, CreditCard, Info, CheckCircle2, AlertCircle, Clock, Wallet } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, PAGE_BASE, TABLE_STYLE, SC, STitle } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';
import { useSession } from 'next-auth/react';

interface PurchaseInvoice {
    id: string;
    invoiceNumber: number;
    date: string;
    supplier: { name: string; phone?: string; balance: number } | null;
    customer: { name: string; phone?: string; balance: number } | null;
    warehouse: { name: string } | null;
    subtotal: number;
    discount: number;
    total: number;
    paidAmount: number;
    remaining: number;
    paymentMethod: 'cash' | 'bank' | 'credit';
    notes?: string;
    lines: {
        id: string;
        item: { name: string; code: string; unit?: { name: string } };
        quantity: number;
        price: number;
        total: number;
    }[];
}

export default function PurchaseDetailPage(props: { params: Promise<{ id: string }> }) {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const params = use(props.params);
    const router = useRouter();
    const { symbol: cSymbol, fMoneyJSX } = useCurrency();
    const { data: session } = useSession();
    const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchDetail = useCallback(async () => {
        try {
            const invR = await fetch(`/api/purchases?id=${params.id}`);
            if (invR.ok) setInvoice(await invR.json());
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
            <div style={{  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', color: C.danger }}>{t('الفاتورة غير موجودة أو تم حذفها')}</div>
        </DashboardLayout>
    );

    const fmt = (v: number) => formatNumber(v);
    const getStatus = () => {
        if (invoice.paidAmount >= invoice.total) return { label: t('مدفوعة بالكامل'), color: C.success, icon: CheckCircle2, bg: 'rgba(74,222,128,0.1)' };
        if (invoice.paidAmount > 0) return { label: t('دفع جزئي'), color: '#fbbf24', icon: Clock, bg: 'rgba(251,191,36,0.1)' };
        return { label: t('غير مدفوعة (آجل)'), color: C.danger, icon: AlertCircle, bg: 'rgba(239,68,68,0.1)' };
    };

    const status = getStatus();

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                
                <PageHeader 
                    title={`${t('تفاصيل فاتورة مشتريات')} #${invoice.invoiceNumber}`}
                    subtitle={`${t('تاريخ الفاتورة:')} ${new Date(invoice.date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-GB')} — ${t('سجل الحالة المالية والتوريد')}`}
                    icon={Receipt}
                    backUrl="/purchases"
                    primaryButton={{
                        label: t('طباعة الفاتورة'),
                        onClick: () => {
                            window.open(`/print/invoice/${invoice.id}`, '_blank');
                        },
                        icon: Printer
                    }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* ── Invoice Metadata Overview ── */}
                        <div style={{ ...SC, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(37, 106, 244,0.1)', color: '#256af4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={20} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: C.textSecondary, margin: 0 }}>{t('المورد / الشريك')}</p>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, margin: 0 }}>{invoice.supplier?.name || invoice.customer?.name || '—'}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: C.textSecondary, margin: 0 }}>{t('مخزن الاستلام')}</p>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, margin: 0 }}>{invoice.warehouse?.name || '—'}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: status.bg, color: status.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <status.icon size={20} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: C.textSecondary, margin: 0 }}>{t('حالة السداد')}</p>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: status.color, margin: 0 }}>{status.label}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── Items Table ── */}
                        <div style={TABLE_STYLE.container}>
                            <div style={{ padding: '16px 20px', textAlign: 'center', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)' }}>
                                <div style={STitle}><Package size={14} /> {t('الأصناف المدرجة')}</div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary }}>{invoice.lines.length} {t('عناصر')}</div>
                            </div>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(true)}>{t('الصنف')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('الوحدة')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('الكمية')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('التكلفة')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('الإجمالي')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.lines.map((l, idx) => (
                                        <tr key={l.id} style={TABLE_STYLE.row(idx === invoice.lines.length - 1)}>
                                            <td style={{...TABLE_STYLE.td(true)}}>
                                                <div style={{ color: C.textPrimary, fontWeight: 700 }}>{l.item.name}</div>
                                                <div style={{ fontSize: '11px', color: C.textSecondary, fontFamily: OUTFIT }}>{l.item.code}</div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false),  color: C.textSecondary, fontSize: '12px' }}>{l.item.unit?.name || t('حبة')}</td>
                                            <td style={{ ...TABLE_STYLE.td(false),  fontFamily: OUTFIT, fontWeight: 600, color: C.textPrimary }}>{l.quantity}</td>
                                            <td style={{ ...TABLE_STYLE.td(false, true),  fontFamily: OUTFIT, fontWeight: 700, color: C.textSecondary }}>{fmt(l.price)}</td>
                                            <td style={{ ...TABLE_STYLE.td(false, true),  fontFamily: OUTFIT, fontWeight: 600, fontSize: '13px', color: C.primary }}>{fmt(l.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {invoice.notes && (
                            <div style={{ ...SC, background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ ...STitle, fontSize: '11px', color: C.textSecondary }}><Info size={12} /> {t('ملاحظات إضافية')}</div>
                                <p style={{ fontSize: '13px', color: C.textSecondary, margin: '8px 0 0', lineHeight: 1.6 }}>{invoice.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* ── Financial Summary (Left Corner) ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={SC}>
                            <div style={STitle}><Wallet size={14} /> {t('ملخص الحساب')}</div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('إجمالي الأصناف')}</span>
                                    <span style={{ fontWeight: 700, fontFamily: OUTFIT }}>{fMoneyJSX(invoice.subtotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('إجمالي الخصم')}</span>
                                    <span style={{ fontWeight: 700, fontFamily: OUTFIT, color: C.danger }}>- {fMoneyJSX(invoice.discount)}</span>
                                </div>
                                <div style={{ height: '1px', background: C.border, margin: '5px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: 'rgba(37,106,244,0.08)', border: `1px solid ${C.primaryBorder}` }}>
                                    <span style={{ fontWeight: 600, fontSize: '12px' }}>{t('صافي المبلغ')}</span>
                                    <span style={{ fontWeight: 600, fontSize: '18px', color: C.primary, fontFamily: OUTFIT }}>{fMoneyJSX(invoice.total)}</span>
                                </div>
                            </div>
                        </div>

                        <div style={SC}>
                            <div style={STitle}><CreditCard size={14} /> {t('تفاصيل السداد')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('نوع الدفع')}</span>
                                    <span style={{ fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', fontSize: '11px' }}>
                                        {invoice.paymentMethod === 'cash' ? t('نقدي (كاش)') : invoice.paymentMethod === 'bank' ? t('بنكي') : t('آجل')}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('المبلغ المدفوع')}</span>
                                    <span style={{ fontWeight: 600, color: C.success, fontFamily: OUTFIT }}>{fMoneyJSX(invoice.paidAmount)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('المتبقي (آجل)')}</span>
                                    <span style={{ fontWeight: 600, color: invoice.remaining > 0 ? C.danger : C.textMuted, fontFamily: OUTFIT }}>{fMoneyJSX(invoice.remaining)}</span>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => router.push('/purchases')}
                            style={{ 
                                height: '48px', borderRadius: '12px', border: `1px solid ${C.border}`,
                                background: 'transparent', color: C.textSecondary, fontWeight: 700,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                transition: 'all 0.2s', marginTop: '10px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />} {t('العودة للقائمة')}
                        </button>
                    </div>
                </div>

            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } `}</style>
        </DashboardLayout>
    );
}
