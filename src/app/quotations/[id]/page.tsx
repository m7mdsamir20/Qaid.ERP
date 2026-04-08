'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FileText, Printer, CheckCircle, ArrowRight, Loader2, Save, Trash2, X, Send, Eye, Receipt } from 'lucide-react';
import { THEME, C, CAIRO, INTER, IS, LS, focusIn, focusOut, TABLE_STYLE } from '@/constants/theme';
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
        if (!confirm('هل تريد تحويل عرض السعر هذا إلى فاتورة مبيعات نهائية؟\nسيتم نسخ كافة البيانات وإنشاء فاتورة جديدة.')) return;
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
                alert(err.error || 'فشل تحويل عرض السعر');
            }
        } catch (error) {
            alert('خطأ في الاتصال بالسيرفر');
        } finally {
            setConverting(false);
        }
    };

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: C.primary }} />
            </div>
        </DashboardLayout>
    );

    if (!quotation) return (
        <DashboardLayout>
            <div style={{ padding: '60px', textAlign: 'center' }}>
                <X size={48} style={{ color: C.danger, opacity: 0.3 }} />
                <p>عذراً، لم يتم العثور على عرض السعر المطلوب</p>
            </div>
        </DashboardLayout>
    );

    const fmt = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ background: C.bg, minHeight: '100%', fontFamily: CAIRO, paddingBottom: '80px' }}>
                <PageHeader 
                    title={`عرض سعر #${quotation.quotationNumber}`}
                    subtitle={`بتاريخ ${new Date(quotation.date).toLocaleDateString('ar-EG')}`}
                    icon={FileText}
                    backUrl="/quotations"
                    primaryButton={{
                        label: "طباعة العرض",
                        onClick: () => printQuotation(quotation, company),
                        icon: Printer
                    }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '24px' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Status Bar */}
                        <div style={{ 
                            background: quotation.status === 'converted' ? 'rgba(74,222,128,0.1)' : (quotation.status === 'cancelled' ? 'rgba(251,113,133,0.1)' : 'rgba(251,191,36,0.1)'),
                            padding: '14px 20px', borderRadius: '12px', border: `1px solid ${quotation.status === 'converted' ? '#4ade8055' : (quotation.status === 'cancelled' ? '#fb718555' : '#fbbf2455')}`,
                            display: 'flex', alignItems: 'center', gap: '12px', color: quotation.status === 'converted' ? '#4ade80' : (quotation.status === 'cancelled' ? '#fb7185' : '#fbbf24')
                        }}>
                            {quotation.status === 'converted' ? <CheckCircle size={20} /> : <FileText size={20} />}
                            <span style={{ fontWeight: 800, fontSize: '15px' }}>
                                {quotation.status === 'converted' ? 'تم تحويل عرض السعر هذا إلى فاتورة بنجاح' : (quotation.status === 'cancelled' ? 'هذا العرض ملغي' : 'هذا العرض قيد الانتظار لموافقة العميل')}
                            </span>
                        </div>

                        {/* Customer Info */}
                        <div style={{ background: C.card, borderRadius: '15px', border: `1px solid ${C.border}`, padding: '24px' }}>
                            <div style={{ display: 'flex', gap: '30px' }}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: C.textMuted }}>معلومات العميل</h4>
                                    <div style={{ fontSize: '18px', fontWeight: 800, color: C.textPrimary }}>{quotation.customer?.name || 'عميل نقدي'}</div>
                                    <div style={{ color: C.textSecondary, fontSize: '14px', marginTop: '4px' }}>{quotation.customer?.phone || 'بدون رقم هاتف'}</div>
                                    <div style={{ color: C.textMuted, fontSize: '13px', marginTop: '2px' }}>{quotation.customer?.address || 'بدون عنوان مسجل'}</div>
                                </div>
                                <div style={{ width: '1px', background: C.border }} />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: C.textMuted }}>تفاصيل العرض</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <span style={{ color: C.textSecondary, minWidth: '90px' }}>رقم العرض:</span>
                                            <span style={{ fontWeight: 800, fontFamily: INTER }}>#{quotation.quotationNumber}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <span style={{ color: C.textSecondary, minWidth: '90px' }}>تاريخ العرض:</span>
                                            <span style={{ fontWeight: 700, fontFamily: INTER }}>{new Date(quotation.date).toLocaleDateString('ar-EG')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div style={{ background: C.card, borderRadius: '15px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        <th style={{ padding: '15px 20px', textAlign: 'start', fontSize: '13px', color: C.textMuted }}>الخدمة / الصنف</th>
                                        <th style={{ padding: '15px 20px', textAlign: 'center', fontSize: '13px', color: C.textMuted, width: '80px' }}>الكمية</th>
                                        <th style={{ padding: '15px 20px', textAlign: 'center', fontSize: '13px', color: C.textMuted, width: '120px' }}>السعر</th>
                                        <th style={{ padding: '15px 20px', textAlign: 'center', fontSize: '13px', color: C.textMuted, width: '120px' }}>الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quotation.lines?.map((l: any, idx: number) => (
                                        <tr key={idx} style={{ borderBottom: `1px solid ${C.border}44` }}>
                                            <td style={{ padding: '15px 20px' }}>
                                                <div style={{ fontWeight: 700, color: C.textPrimary }}>{l.item?.name || 'خدمة / صنف'}</div>
                                                <div style={{ fontSize: '11px', color: C.textMuted }}>{l.item?.code || ''}</div>
                                            </td>
                                            <td style={{ padding: '15px 20px', textAlign: 'center', fontFamily: INTER, fontWeight: 600 }}>{l.quantity}</td>
                                            <td style={{ padding: '15px 20px', textAlign: 'center', fontFamily: INTER, fontWeight: 700 }}>{fmt(l.price)}</td>
                                            <td style={{ padding: '15px 20px', textAlign: 'center', fontFamily: INTER, fontWeight: 800 }}>{fmt(l.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Summary Card */}
                        <div style={{ background: C.card, borderRadius: '15px', border: `1px solid ${C.border}`, padding: '24px' }}>
                            <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 800, color: C.textPrimary, borderBottom: `1px solid ${C.border}`, paddingBottom: '12px' }}>ملخص الحساب</h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: C.textSecondary }}>
                                    <span>المجموع الفرعي:</span>
                                    <span style={{ fontWeight: 700, fontFamily: INTER }}>{fmt(quotation.subtotal)}</span>
                                </div>
                                {quotation.discount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: C.danger }}>
                                        <span>خصم العرض:</span>
                                        <span style={{ fontWeight: 700, fontFamily: INTER }}>- {fmt(quotation.discount)}</span>
                                    </div>
                                )}
                                {quotation.taxAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: C.textSecondary }}>
                                        <span>{quotation.taxLabel} ({quotation.taxRate}%):</span>
                                        <span style={{ fontWeight: 700, fontFamily: INTER }}>+ {fmt(quotation.taxAmount)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', fontWeight: 900, color: C.primary, marginTop: '10px', paddingTop: '15px', borderTop: `1px solid ${C.border}` }}>
                                    <span>الإجمالي:</span>
                                    <span style={{ fontFamily: INTER }}>{fmt(quotation.total)} {cSymbol}</span>
                                </div>
                            </div>

                            {quotation.status === 'pending' && (
                                <button 
                                    onClick={handleConvert}
                                    disabled={converting}
                                    style={{ 
                                        width: '100%', height: '52px', background: C.success, color: '#fff', border: 'none', borderRadius: '12px', 
                                        fontWeight: 800, fontSize: '15px', marginTop: '30px', cursor: converting ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s',
                                        boxShadow: '0 8px 16px -4px rgba(74, 222, 128, 0.4)'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                >
                                    {converting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                                    تحويل لفاتورة مبيعات
                                </button>
                            )}

                            {quotation.status === 'converted' && (
                                <button 
                                    onClick={() => router.push(`/sales/${quotation.convertedInvoiceId}`)}
                                    style={{ 
                                        width: '100%', height: '50px', background: 'rgba(255,255,255,0.03)', color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: '10px', 
                                        fontWeight: 700, fontSize: '14px', marginTop: '30px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    <Eye size={18} />
                                    عرض الفاتورة المسجلة
                                </button>
                            )}
                        </div>

                        {quotation.notes && (
                            <div style={{ background: C.card, borderRadius: '15px', border: `1px solid ${C.border}`, padding: '20px' }}>
                                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: C.textMuted }}>ملاحظات العرض</h4>
                                <p style={{ fontSize: '13px', lineHeight: '1.6', color: C.textSecondary, margin: 0 }}>{quotation.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style jsx global>{` @keyframes spin { to { transform:rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; } `}</style>
        </DashboardLayout>
    );
}
