'use client';
import ContentSkeleton from '@/components/ContentSkeleton';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FileText, Printer, CheckCircle, Loader2, X, Eye, Package, Info } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, TABLE_STYLE, SC, STitle } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';

export default function QuotationViewPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const { symbol: cSymbol, fMoneyJSX } = useCurrency();
    const [quotation, setQuotation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [converting, setConverting] = useState(false);

    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const quoRes = await fetch(`/api/quotations?id=${params.id}`);
            if (quoRes.ok) setQuotation(await quoRes.json());
        } catch (error) {
            console.error('Failed to fetch:', error);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleConvert = () => {
        router.push(`/sales/new?quotationId=${params.id}`);
    };

    if (loading) { return <DashboardLayout><ContentSkeleton /></DashboardLayout>; }

    if (!quotation) return (
        <DashboardLayout>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', textAlign: 'center' }}>
                <X size={48} style={{ color: C.danger, opacity: 0.3 }} />
                <p style={{ color: C.textSecondary, fontFamily: CAIRO }}>{t('عذراً، لم يتم العثور على عرض السعر المطلوب')}</p>
            </div>
        </DashboardLayout>
    );

    const fmt = (num: number) => formatNumber(Number(num || 0));
    const quoCode = `QUO-${String(quotation.quotationNumber).padStart(5, '0')}`;
    const dateStr = new Date(quotation.date).toLocaleDateString('en-GB');

    const statusColor = quotation.status === 'converted' ? '#4ade80' : quotation.status === 'cancelled' ? '#fb7185' : '#fbbf24';
    const statusBg    = quotation.status === 'converted' ? 'rgba(74,222,128,0.08)' : quotation.status === 'cancelled' ? 'rgba(251,113,133,0.08)' : 'rgba(251,191,36,0.08)';
    const statusLabel = quotation.status === 'converted' ? t('تم تحويل هذا العرض إلى فاتورة مبيعات') : quotation.status === 'cancelled' ? t('تم إلغاء عرض السعر هذا') : t('هذا العرض قيد الانتظار لموافقة العميل');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: CAIRO, paddingBottom: '60px' }}>

                <PageHeader
                    title={t('تفاصيل عرض السعر')}
                    subtitle=""
                    icon={FileText}
                    backUrl="/quotations"
                    primaryButton={{
                        label: t('طباعة العرض'),
                        onClick: () => window.open(`/print/quotation/${quotation.id}`, '_blank'),
                        icon: Printer
                    }}
                />

                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 320px)', gap: '16px', alignItems: 'start' }}>

                    {/* ── Left Column ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                        {/* Status Bar */}
                        <div style={{
                            background: statusBg, padding: '15px 20px', borderRadius: '15px',
                            border: `1px solid ${statusColor}33`,
                            display: 'flex', alignItems: 'center', gap: '12px', color: statusColor
                        }}>
                            {quotation.status === 'converted' ? <CheckCircle size={20} /> : <FileText size={20} />}
                            <span style={{ fontWeight: 600, fontSize: '15px' }}>{statusLabel}</span>
                        </div>

                        {/* Info Card - Regions */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: '#256af4' }}><Info size={12} /> {t('معلومات العرض والعميل')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '40px' }}>
                                {/* Customer */}
                                <div>
                                    <label style={LS}>{t('معلومات العميل')}</label>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, marginBottom: '4px' }}>
                                        {quotation.customer?.name || t('عميل نقدي')}
                                    </div>
                                    {quotation.customer?.phone && (
                                        <div style={{ color: C.textSecondary, fontSize: '13px', fontFamily: OUTFIT }}>{quotation.customer.phone}</div>
                                    )}
                                </div>

                                {/* Divider */}
                                <div style={{ background: C.border }} />

                                {/* Quotation Details */}
                                <div>
                                    <label style={LS}>{t('تفاصيل المستند')}</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span style={{ color: C.textSecondary }}>{t('رقم العرض:')}</span>
                                            <span style={{ fontWeight: 600, fontFamily: OUTFIT, color: C.primary }}>{quoCode}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span style={{ color: C.textSecondary }}>{t('التاريخ:')}</span>
                                            <span style={{ fontWeight: 700, fontFamily: OUTFIT, color: C.textPrimary }}>{dateStr}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table - Region */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: '#256af4' }}><Package size={12} /> {isServices ? t('بنود الخدمة') : t('بنود الأصناف')}</div>
                            <div className="scroll-table" style={{ borderRadius: '12px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `2px solid ${C.border}` }}>
                                        <tr>
                                            <th style={{ padding: '12px 20px',  fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>{isServices ? t('اسم الخدمة') : t('اسم الصنف')}</th>
                                            <th style={{ padding: '12px 20px',  fontSize: '12px', color: C.textSecondary, width: '100px', fontWeight: 600 }}>{t('الكمية')}</th>
                                            <th style={{ padding: '12px 20px',  fontSize: '12px', color: C.textSecondary, width: '130px', fontWeight: 600 }}>{t('السعر')}</th>
                                            <th style={{ padding: '12px 20px',  fontSize: '12px', color: C.textSecondary, width: '140px', fontWeight: 600 }}>{t('الإجمالي')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quotation.lines?.map((l: any, idx: number) => (
                                            <tr key={idx} style={{ borderBottom: idx === quotation.lines.length - 1 ? 'none' : `1px solid ${C.border}44`, background: 'rgba(255,255,255,0.02)' }}>
                                                <td style={{ padding: '15px 20px' }}>
                                                    <div style={{ fontWeight: 700, color: C.textPrimary, fontSize: '13px' }}>{l.itemName}</div>
                                                    {l.description && <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '3px' }}>{l.description}</div>}
                                                </td>
                                                <td style={{ padding: '15px 20px',  fontFamily: OUTFIT, fontWeight: 600, color: C.textPrimary }}>{l.quantity}</td>
                                                <td style={{ padding: '15px 20px',  fontFamily: OUTFIT, fontWeight: 700, color: C.textSecondary }}>{fmt(l.price)}</td>
                                                <td style={{ padding: '15px 20px',  fontFamily: OUTFIT, fontWeight: 600, color: C.primary, fontSize: '15px' }}>{fmt(l.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Notes - Region */}
                        {quotation.notes && (
                            <div style={SC}>
                                <div style={STitle}><FileText size={12} /> {t('ملاحظات وشروط العرض')}</div>
                                <div style={{ fontSize: '13px', lineHeight: '1.8', color: C.textSecondary, whiteSpace: 'pre-wrap' }}>{quotation.notes}</div>
                            </div>
                        )}
                    </div>

                    {/* ── Right Column: Summary ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ ...SC, position: 'sticky', top: '20px' }}>
                            <div style={{ ...STitle, color: '#256af4', fontSize: '12px', marginBottom: '15px' }}>
                                <Info size={12} /> {t('ملخص عرض السعر')}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: C.textSecondary, fontSize: '13px', padding: '0 5px' }}>
                                    <span style={{ color: C.textSecondary, fontWeight: 700 }}>{isServices ? t('إجمالي الخدمات') : t('إجمالي الأصناف')}:</span>
                                    <span style={{ fontWeight: 600, fontFamily: OUTFIT, color: C.textPrimary }}><Currency amount={quotation.subtotal} /> </span>
                                </div>

                                {/* Discount View */}
                                {quotation.discountAmt > 0 && (
                                    <div style={{ 
                                        background: 'rgba(255,255,255,0.03)', 
                                        borderRadius: '15px', 
                                        padding: '15px', 
                                        border: `1px solid ${C.border}`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px'
                                    }}>
                                        <label style={{ ...LS, marginBottom: 0, fontSize: '11px', fontWeight: 600, color: C.textSecondary }}>{t('الخصم الممنوح')}</label>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, color: C.danger }}>- {fMoneyJSX(quotation.discountAmt)}</div>
                                            {quotation.discountPct > 0 && <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary }}>({quotation.discountPct}%)</span>}
                                        </div>
                                    </div>
                                )}

                                {/* Tax View */}
                                {quotation.taxAmount > 0 && (
                                    <div style={{ 
                                        borderRadius: '15px', 
                                        padding: '15px', 
                                        border: `1px dashed ${C.border}`,
                                        background: 'rgba(255,255,255,0.01)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px'
                                    }}>
                                        <label style={{ ...LS, marginBottom: 0, fontSize: '11px', fontWeight: 600, color: C.textSecondary }}>{quotation.taxLabel || 'VAT'} ({quotation.taxRate}%)</label>
                                        <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: OUTFIT, color: C.primary }}>+ {fMoneyJSX(quotation.taxAmount)}</div>
                                    </div>
                                )}

                                <div style={{ 
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'linear-gradient(135deg, rgba(37,106,244,0.12), rgba(37,106,244,0.05))',
                                    padding: '10px 14px', borderRadius: '12px', marginTop: '6px',
                                    border: `1px solid ${C.primaryBorder}`,
                                    boxShadow: '0 4px 12px rgba(37,106,244,0.08)',
                                }}>
                                    <span style={{ color: C.primary, fontWeight: 600, fontSize: '17px', fontFamily: OUTFIT }}>
                                        <Currency amount={quotation.total} />
                                    </span>
                                    <span style={{ color: C.textSecondary, fontWeight: 600, fontSize: '13px', fontFamily: CAIRO }}>{t('صافي العرض')}</span>
                                </div>

                                {quotation.status === 'pending' && (
                                    <button onClick={handleConvert} disabled={converting} style={{ width: '100%', height: '54px', background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 600, fontSize: '13px', marginTop: '10px', cursor: converting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(74,222,128,0.3)' }}>
                                        {converting ? <Loader2 className="animate-spin" /> : <Package size={20} />}
                                        {t('تحويل لفاتورة مبيعات')}
                                    </button>
                                )}

                                {quotation.status === 'converted' && (
                                    <button onClick={() => router.push(`/sales/${quotation.convertedInvoiceId}`)} style={{ width: '100%', height: '50px', background: 'rgba(255,255,255,0.05)', color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}>
                                        <Eye size={18} /> {t('عرض الفاتورة المرتبطة')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; } `}</style>
        </DashboardLayout>
    );
}
