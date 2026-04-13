'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FileText, Printer, CheckCircle, Loader2, X, Eye, Package, Info } from 'lucide-react';
import { THEME, C, CAIRO, INTER, IS, LS, TABLE_STYLE, SC, STitle } from '@/constants/theme';
import { printQuotation, CompanyInfo } from '@/lib/printInvoices';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';

export default function QuotationViewPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const { symbol: cSymbol } = useCurrency();
    const [quotation, setQuotation] = useState<any>(null);
    const [company, setCompany] = useState<CompanyInfo>({});
    const [loading, setLoading] = useState(true);
    const [converting, setConverting] = useState(false);

    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [quoRes, comRes] = await Promise.all([
                fetch(`/api/quotations?id=${params.id}`),
                fetch('/api/company')
            ]);
            if (quoRes.ok) setQuotation(await quoRes.json());
            if (comRes.ok) setCompany(await comRes.json());
        } catch (error) {
            console.error('Failed to fetch:', error);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleConvert = async () => {
        if (!confirm(t('هل تريد تحويل عرض السعر هذا إلى فاتورة مبيعات نهائية؟\nسيتم نسخ كافة البيانات وإنشاء فاتورة جديدة.'))) return;
        setConverting(true);
        try {
            const res = await fetch('/api/quotations/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quotationId: params.id })
            });
            if (res.ok) {
                const data = await res.json();
                router.push(`/sales/${data.invoiceId}`);
            } else {
                const err = await res.json();
                alert(err.error || t('فشل تحويل عرض السعر'));
            }
        } catch {
            alert(t('خطأ في الاتصال بالسيرفر'));
        } finally {
            setConverting(false);
        }
    };

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.textMuted }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
            </div>
        </DashboardLayout>
    );

    if (!quotation) return (
        <DashboardLayout>
            <div style={{ padding: '60px', textAlign: 'center' }}>
                <X size={48} style={{ color: C.danger, opacity: 0.3 }} />
                <p style={{ color: C.textMuted, fontFamily: CAIRO }}>{t('عذراً، لم يتم العثور على عرض السعر المطلوب')}</p>
            </div>
        </DashboardLayout>
    );

    const fmt = (num: number) => Number(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
                        onClick: () => printQuotation(quotation, company),
                        icon: Printer
                    }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '20px', padding: '0 20px' }}>

                    {/* ── Left Column ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Status Bar */}
                        <div style={{
                            background: statusBg, padding: '15px 20px', borderRadius: '15px',
                            border: `1px solid ${statusColor}33`,
                            display: 'flex', alignItems: 'center', gap: '12px', color: statusColor
                        }}>
                            {quotation.status === 'converted' ? <CheckCircle size={20} /> : <FileText size={20} />}
                            <span style={{ fontWeight: 800, fontSize: '15px' }}>{statusLabel}</span>
                        </div>

                        {/* Info Card - Regions */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: '#3b82f6' }}><Info size={12} /> {t('معلومات العرض والعميل')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '40px' }}>
                                {/* Customer */}
                                <div>
                                    <label style={LS}>{t('معلومات العميل')}</label>
                                    <div style={{ fontSize: '18px', fontWeight: 900, color: C.textPrimary, marginBottom: '4px' }}>
                                        {quotation.customer?.name || t('عميل نقدي')}
                                    </div>
                                    {quotation.customer?.phone && (
                                        <div style={{ color: C.textSecondary, fontSize: '13px', fontFamily: INTER }}>{quotation.customer.phone}</div>
                                    )}
                                </div>

                                {/* Divider */}
                                <div style={{ background: C.border }} />

                                {/* Quotation Details */}
                                <div>
                                    <label style={LS}>{t('تفاصيل المستند')}</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: C.textMuted }}>{t('رقم العرض:')}</span>
                                            <span style={{ fontWeight: 900, fontFamily: INTER, color: C.primary }}>{quoCode}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                            <span style={{ color: C.textMuted }}>{t('التاريخ:')}</span>
                                            <span style={{ fontWeight: 700, fontFamily: INTER, color: C.textPrimary }}>{dateStr}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table - Region */}
                        <div style={SC}>
                            <div style={{ ...STitle, color: '#3b82f6' }}><Package size={12} /> {isServices ? t('بنود الخدمة') : t('بنود الأصناف')}</div>
                            <div style={{ borderRadius: '12px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `2px solid ${C.border}` }}>
                                        <tr>
                                            <th style={{ padding: '12px 20px', textAlign: 'start', fontSize: '12px', color: C.textMuted, fontWeight: 800 }}>{isServices ? t('اسم الخدمة') : t('اسم الصنف')}</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', color: C.textMuted, width: '100px', fontWeight: 800 }}>{t('الكمية')}</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', color: C.textMuted, width: '130px', fontWeight: 800 }}>{t('السعر')}</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', color: C.textMuted, width: '140px', fontWeight: 800 }}>{t('الإجمالي')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quotation.lines?.map((l: any, idx: number) => (
                                            <tr key={idx} style={{ borderBottom: idx === quotation.lines.length - 1 ? 'none' : `1px solid ${C.border}44`, background: 'rgba(0,0,0,0.1)' }}>
                                                <td style={{ padding: '15px 20px' }}>
                                                    <div style={{ fontWeight: 700, color: C.textPrimary, fontSize: '14px' }}>{l.itemName}</div>
                                                    {l.description && <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '3px' }}>{l.description}</div>}
                                                </td>
                                                <td style={{ padding: '15px 20px', textAlign: 'center', fontFamily: INTER, fontWeight: 900, color: C.textPrimary }}>{l.quantity}</td>
                                                <td style={{ padding: '15px 20px', textAlign: 'center', fontFamily: INTER, fontWeight: 700, color: C.textSecondary }}>{fmt(l.price)}</td>
                                                <td style={{ padding: '15px 20px', textAlign: 'center', fontFamily: INTER, fontWeight: 900, color: C.primary, fontSize: '15px' }}>{fmt(l.total)}</td>
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
                                <div style={{ fontSize: '14px', lineHeight: '1.8', color: C.textSecondary, whiteSpace: 'pre-wrap' }}>{quotation.notes}</div>
                            </div>
                        )}
                    </div>

                    {/* ── Right Column: Summary ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', position: 'sticky', top: '20px' }}>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: '#3b82f6', marginBottom: '8px', textAlign: 'center' }}>{t('ملخص عرض السعر')}</div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: C.textSecondary, fontSize: '14px', padding: '0 5px' }}>
                                <span style={{ color: C.textMuted, fontWeight: 700 }}>{isServices ? t('إجمالي الخدمات') : t('إجمالي الأصناف')}:</span>
                                <span style={{ fontWeight: 800, fontFamily: INTER, color: C.textPrimary }}>{fmt(quotation.subtotal)} <small style={{fontFamily: CAIRO}}>{cSymbol}</small> </span>
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
                                    <label style={{ ...LS, marginBottom: 0, fontSize: '12px', fontWeight: 800, color: C.textMuted }}>{t('الخصم الممنوح')}</label>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: INTER, color: C.danger }}>- {fmt(quotation.discountAmt)} {cSymbol}</div>
                                        {quotation.discountPct > 0 && <span style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted }}>({quotation.discountPct}%)</span>}
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
                                    <label style={{ ...LS, marginBottom: 0, fontSize: '12px', fontWeight: 800, color: C.textMuted }}>{quotation.taxLabel || 'VAT'} ({quotation.taxRate}%)</label>
                                    <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: INTER, color: C.primary }}>+ {fmt(quotation.taxAmount)} {cSymbol}</div>
                                </div>
                            )}

                            {/* Net Total Box - Exactly like the New page */}
                            <div style={{ 
                                background: '#0f172a', /* Dark slate background */
                                color: '#fff', 
                                padding: '20px 18px', 
                                borderRadius: '18px', 
                                border: '1px solid #1e293b',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                            }}>
                                <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px' }}>{t('صافي العرض')}</div>
                                <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: INTER, color: '#3b82f6', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                    {fmt(quotation.total)} <span style={{ fontSize: '14px', fontWeight: 700, opacity: 0.8 }}>{cSymbol}</span>
                                </div>
                            </div>

                            {quotation.status === 'pending' && (
                                <button onClick={handleConvert} disabled={converting} style={{ width: '100%', height: '54px', background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '16px', marginTop: '10px', cursor: converting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(74,222,128,0.3)' }}>
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
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; } `}</style>
        </DashboardLayout>
    );
}
