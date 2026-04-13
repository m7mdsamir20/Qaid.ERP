'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FileText, Printer, CheckCircle, Loader2, X, Eye } from 'lucide-react';
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

    const fmt = (num: number) => Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const quoCode = `QR-${String(quotation.quotationNumber).padStart(5, '0')}`;
    const dateStr = new Date(quotation.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    const statusColor = quotation.status === 'converted' ? '#4ade80' : quotation.status === 'cancelled' ? '#fb7185' : '#fbbf24';
    const statusBg    = quotation.status === 'converted' ? 'rgba(74,222,128,0.08)' : quotation.status === 'cancelled' ? 'rgba(251,113,133,0.08)' : 'rgba(251,191,36,0.08)';
    const statusLabel = quotation.status === 'converted' ? t('تم تحويل عرض السعر هذا إلى فاتورة بنجاح') : quotation.status === 'cancelled' ? t('هذا العرض ملغي') : t('هذا العرض قيد الانتظار لموافقة العميل');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: CAIRO, paddingBottom: '60px', paddingTop: THEME.header.pt }}>

                <PageHeader
                    title={t('عرض سعر')}
                    subtitle={`${quoCode} — ${dateStr}`}
                    icon={FileText}
                    backUrl="/quotations"
                    primaryButton={{
                        label: t('طباعة العرض'),
                        onClick: () => printQuotation(quotation, company),
                        icon: Printer
                    }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '16px', alignItems: 'start' }}>

                    {/* ── Left Column ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                        {/* Status Bar */}
                        <div style={{
                            background: statusBg, padding: '12px 20px', borderRadius: '12px',
                            border: `1px solid ${statusColor}44`,
                            display: 'flex', alignItems: 'center', gap: '10px', color: statusColor
                        }}>
                            {quotation.status === 'converted' ? <CheckCircle size={18} /> : <FileText size={18} />}
                            <span style={{ fontWeight: 800, fontSize: '14px', fontFamily: CAIRO }}>{statusLabel}</span>
                        </div>

                        {/* Info Card */}
                        <div style={{ ...SC }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '24px' }}>
                                {/* Customer */}
                                <div>
                                    <div style={{ ...STitle, fontSize: '12px', marginBottom: '12px' }}>{t('معلومات العميل')}</div>
                                    <div style={{ fontSize: '17px', fontWeight: 800, color: C.textPrimary, marginBottom: '4px' }}>
                                        {quotation.customer?.name || t('عميل نقدي')}
                                    </div>
                                    {quotation.customer?.phone && (
                                        <div style={{ color: C.textSecondary, fontSize: '13px', fontFamily: INTER }}>{quotation.customer.phone}</div>
                                    )}
                                    {quotation.customer?.address && (
                                        <div style={{ color: C.textMuted, fontSize: '12px', marginTop: '2px' }}>{quotation.customer.address}</div>
                                    )}
                                </div>

                                {/* Divider */}
                                <div style={{ background: C.border }} />

                                {/* Quotation Details */}
                                <div>
                                    <div style={{ ...STitle, fontSize: '12px', marginBottom: '12px' }}>{t('تفاصيل العرض')}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span style={{ color: C.textMuted }}>{t('كود العرض')}</span>
                                            <span style={{ fontWeight: 800, fontFamily: INTER, color: C.primary }}>{quoCode}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span style={{ color: C.textMuted }}>{t('تاريخ العرض')}</span>
                                            <span style={{ fontWeight: 700, fontFamily: INTER, color: C.textPrimary }}>{dateStr}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div style={TABLE_STYLE.container}>
                            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ ...STitle, marginBottom: 0 }}>{t('بنود العرض')}</div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary }}>{quotation.lines?.length || 0} {t('عناصر')}</div>
                            </div>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(true)}>{t('الخدمة / الصنف')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('الكمية')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('السعر')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('الإجمالي')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quotation.lines?.map((l: any, idx: number) => (
                                        <tr key={idx} style={TABLE_STYLE.row(idx === quotation.lines.length - 1)}>
                                            <td style={{ ...TABLE_STYLE.td(true), textAlign: 'start' }}>
                                                <div style={{ fontWeight: 700, color: C.textPrimary }}>{l.item?.name || t('خدمة / صنف')}</div>
                                                {l.description && <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{l.description}</div>}
                                                <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: INTER, opacity: 0.5 }}>{l.item?.code || ''}</div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', fontFamily: INTER, fontWeight: 700 }}>{l.quantity}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', fontFamily: INTER, fontWeight: 700, color: C.textSecondary }}>{fmt(l.price)}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', fontFamily: INTER, fontWeight: 900, color: C.primary }}>{fmt(l.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Notes */}
                        {quotation.notes && (
                            <div style={SC}>
                                <div style={{ ...STitle, fontSize: '12px', marginBottom: '10px' }}>{t('ملاحظات العرض')}</div>
                                <p style={{ fontSize: '13px', lineHeight: '1.7', color: C.textSecondary, margin: 0 }}>{quotation.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* ── Right Column ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={SC}>
                            <div style={{ ...STitle, marginBottom: '16px' }}>{t('ملخص الحساب')}</div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: C.textSecondary }}>
                                    <span>{t('المجموع الفرعي:')}</span>
                                    <span style={{ fontWeight: 700, fontFamily: INTER }}>{fmt(quotation.subtotal)}</span>
                                </div>
                                {quotation.discount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: C.danger }}>
                                        <span>{t('إجمالي الخصم:')}</span>
                                        <span style={{ fontWeight: 700, fontFamily: INTER }}>- {fmt(quotation.discount)}</span>
                                    </div>
                                )}
                                {quotation.taxAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: C.textSecondary }}>
                                        <span>{quotation.taxLabel || t('الضريبة')} ({quotation.taxRate}%):</span>
                                        <span style={{ fontWeight: 700, fontFamily: INTER, color: '#fb7185' }}>+ {fmt(quotation.taxAmount)}</span>
                                    </div>
                                )}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    fontSize: '20px', fontWeight: 900, color: C.primary,
                                    marginTop: '8px', paddingTop: '12px', borderTop: `1px solid ${C.border}`
                                }}>
                                    <span style={{ fontFamily: CAIRO }}>{t('الإجمالي:')}</span>
                                    <span style={{ fontFamily: INTER }}>{fmt(quotation.total)} {cSymbol}</span>
                                </div>
                            </div>

                            {quotation.status === 'pending' && (
                                <button
                                    onClick={handleConvert}
                                    disabled={converting}
                                    style={{
                                        width: '100%', height: '48px', background: C.success, color: '#fff',
                                        border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '14px',
                                        marginTop: '20px', cursor: converting ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        fontFamily: CAIRO, boxShadow: '0 6px 14px -4px rgba(74,222,128,0.4)',
                                        transition: 'transform 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                >
                                    {converting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={18} />}
                                    {t('تحويل لفاتورة مبيعات')}
                                </button>
                            )}

                            {quotation.status === 'converted' && (
                                <button
                                    onClick={() => router.push(`/sales/${quotation.convertedInvoiceId}`)}
                                    style={{
                                        width: '100%', height: '44px',
                                        background: 'rgba(255,255,255,0.03)', color: C.textSecondary,
                                        border: `1px solid ${C.border}`, borderRadius: '10px',
                                        fontWeight: 700, fontSize: '13px', marginTop: '16px',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', gap: '8px', fontFamily: CAIRO
                                    }}
                                >
                                    <Eye size={16} />
                                    {t('عرض الفاتورة المسجلة')}
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
            <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
