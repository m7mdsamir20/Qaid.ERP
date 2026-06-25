'use client';
import ContentSkeleton from '@/components/ContentSkeleton';
import { formatNumber } from '@/lib/currency';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { Receipt, Package, Printer, Loader2, User, Building2, CreditCard, Info, Clock, Wallet, FileDown } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, PAGE_BASE, TABLE_STYLE, SC, STitle } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';
import { useSession } from 'next-auth/react';
import { printInvoiceDirectly, downloadInvoicePDF } from '@/lib/printDirectly';

interface PurchaseReturnInvoice {
    id: string;
    invoiceNumber: number;
    date: string;
    supplier: { name: string; phone?: string; balance: number } | null;
    customer: { name: string; phone?: string; balance: number } | null;
    warehouse: { name: string } | null;
    originalInvoiceId?: string;
    originalInvoice?: { invoiceNumber: number; date: string };
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
        taxRate?: number;
        taxAmount?: number;
        description?: string;
    }[];
}

export default function PurchaseReturnDetailPage(props: { params: Promise<{ id: string }> }) {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const params = use(props.params);
    const router = useRouter();
    const { symbol: cSymbol, fMoneyJSX } = useCurrency();
    const { data: session } = useSession();
    const [invoice, setInvoice] = useState<PurchaseReturnInvoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    const fetchDetail = useCallback(async () => {
        try {
            const invR = await fetch(`/api/purchase-returns?id=${params.id}`);
            if (invR.ok) setInvoice(await invR.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    const handleDownloadPDF = async () => {
        if (!invoice) return;
        setDownloading(true);
        try {
            await downloadInvoicePDF(invoice.id);
        } catch (err: any) {
            alert(t('فشل تحميل PDF') + ': ' + (err?.message || ''));
        } finally {
            setDownloading(false);
        }
    };

    if (loading) { return <DashboardLayout><ContentSkeleton /></DashboardLayout>; }

    if (!invoice) return (
        <DashboardLayout>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', color: C.danger }}>{t('الفاتورة غير موجودة أو تم حذفها')}</div>
        </DashboardLayout>
    );

    const fmt = (v: number) => formatNumber(v);

    const invLabel = t('مرتجع مشتريات');
    const invPrefix = 'PRET';
    const invNumFmt = `${invPrefix}-${String(invoice.invoiceNumber).padStart(5, '0')}`;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>

                <PageHeader
                    title={`${t('تفاصيل')} ${invLabel}`}
                    subtitle={`${t('تاريخ المرتجع:')} ${new Date(invoice.date).toLocaleDateString('en-ZA')} — ${t('سجل العمليات المرتجعة وتأثيرها المالي')}`}
                    icon={Receipt}
                    backUrl="/purchase-returns"
                    actions={[
                        <button
                            key="download-pdf"
                            onClick={handleDownloadPDF}
                            disabled={downloading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                height: '42px',
                                padding: '0 20px',
                                borderRadius: '12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: downloading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s',
                                fontFamily: CAIRO,
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={e => {
                                if (!downloading) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                            }}
                            onMouseLeave={e => {
                                if (!downloading) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            }}
                        >
                            {downloading ? (
                                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <FileDown size={18} />
                            )}
                            {t('تحميل PDF')}
                        </button>
                    ]}
                    primaryButton={{
                        label: t('طباعة المرتجع'),
                        onClick: () => {
                            printInvoiceDirectly(invoice.id);
                        },
                        icon: Printer
                    }}
                />

                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* ── Metadata Icons ── */}
                        <div className="stats-grid" style={{ ...SC, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37, 106, 244,0.1)', color: '#256af4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={18} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '10px', color: C.textSecondary, margin: 0 }}>{t('المورد / الشريك')}</p>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, margin: 0 }}>{invoice.supplier?.name || invoice.customer?.name || '—'}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37, 106, 244,0.1)', color: '#256af4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Receipt size={18} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '10px', color: C.textSecondary, margin: 0 }}>{t('رقم المرتجع')}</p>
                                    <div style={{ color: C.primary, fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT }}>{invNumFmt}</div>
                                </div>
                            </div>

                            {invoice.originalInvoice && (
                                <div onClick={() => router.push('/purchases/' + invoice.originalInvoiceId)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(168,85,247,0.1)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Package size={18} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '10px', color: C.textSecondary, margin: 0 }}>{t("مرجع فاتورة الشراء")}</p>
                                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#a855f7', margin: 0, fontFamily: OUTFIT }}>
                                            {`PUR-${String(invoice.originalInvoice.invoiceNumber).padStart(5, '0')}`}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37, 106, 244,0.1)', color: '#256af4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Building2 size={18} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '10px', color: C.textSecondary, margin: 0 }}>{t('المستودع / المخزن')}</p>
                                    <p style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, margin: 0 }}>{invoice.warehouse?.name || '—'}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── Items Table ── */}
                        <div style={TABLE_STYLE.container}>
                            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)' }}>
                                <div style={STitle}><Package size={14} /> {t("الأصناف المرتجعة")}</div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary }}>{invoice.lines.length} {t('عناصر')}</div>
                            </div>
                            <div className="scroll-table">
                                <table style={TABLE_STYLE.table}>
                                    <thead>
                                        <tr style={TABLE_STYLE.thead}>
                                            <th style={TABLE_STYLE.th(true)}>{t('الصنف')}</th>
                                            <th style={TABLE_STYLE.th(false)}>{t('الوحدة')}</th>
                                            <th style={TABLE_STYLE.th(false)}>{t('الكمية المرتجعة')}</th>
                                            <th style={TABLE_STYLE.th(false, true)}>{t('سعر التكلفة')}</th>
                                            <th style={TABLE_STYLE.th(false, true)}>{t('الإجمالي')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoice.lines.map((l, idx) => (
                                            <tr key={l.id} style={TABLE_STYLE.row(idx === invoice.lines.length - 1)}>
                                                <td style={{ ...TABLE_STYLE.td(true) }}>
                                                    <div style={{ color: C.textPrimary, fontWeight: 700 }}>{l.item.name}</div>
                                                    {l.description
                                                        ? <div style={{ fontSize: '12px', color: C.textSecondary, marginTop: '2px', fontWeight: 600 }}>{l.description}</div>
                                                        : <div style={{ fontSize: '11px', color: C.textSecondary, fontFamily: OUTFIT, opacity: 0.5 }}>{l.item.code}</div>
                                                    }
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), color: C.textSecondary, fontSize: '12px' }}>{l.item.unit?.name || t('حبة')}</td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, fontWeight: 600, color: C.danger }}>{l.quantity}</td>
                                                <td style={{ ...TABLE_STYLE.td(false, true), fontFamily: OUTFIT, fontWeight: 700, color: C.textSecondary }}>{fmt(l.price)}</td>
                                                <td style={{ ...TABLE_STYLE.td(false, true), fontFamily: OUTFIT, fontWeight: 600, fontSize: '13px', color: C.primary }}>{fmt(l.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {invoice.notes && (
                            <div style={{ ...SC, background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ ...STitle, fontSize: '11px', color: C.textSecondary }}><Info size={12} /> {t('ملاحظات')}</div>
                                <p style={{ fontSize: '13px', color: C.textSecondary, margin: '8px 0 0', lineHeight: 1.6 }}>{invoice.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* ── Side Summary ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={SC}>
                            <div style={STitle}><Wallet size={14} /> {t('ملخص الحساب')}</div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('إجمالي المرتجع')}</span>
                                    <span style={{ fontWeight: 700, fontFamily: OUTFIT, color: C.danger }}>{fMoneyJSX(invoice.subtotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('إجمالي الخصم')}</span>
                                    <span style={{ fontWeight: 700, fontFamily: OUTFIT, color: C.textMuted }}>- {fMoneyJSX(invoice.discount)}</span>
                                </div>
                                <div style={{ height: '1px', background: C.border, margin: '5px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', background: 'rgba(37,106,244,0.08)', border: `1px solid ${C.primaryBorder}` }}>
                                    <span style={{ fontWeight: 600, fontSize: '12px' }}>{t('صافي التسوية')}</span>
                                    <span style={{ fontWeight: 600, fontSize: '18px', color: C.primary, fontFamily: OUTFIT }}>{fMoneyJSX(invoice.total)}</span>
                                </div>
                            </div>
                        </div>

                        <div style={SC}>
                            <div style={STitle}><CreditCard size={14} /> {t('تفاصيل السداد')}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('نوع المرتجع')}</span>
                                    <span style={{ fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', fontSize: '11px' }}>
                                        {invoice.paymentMethod === 'cash' ? t('استلام نقدي') : invoice.paymentMethod === 'bank' ? t('رد بنكي') : t('تسوية مديونية')}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('المسترد نقداً')}</span>
                                    <span style={{ fontWeight: 600, color: C.success, fontFamily: OUTFIT }}>{fMoneyJSX(invoice.paidAmount)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: C.textSecondary }}>{t('صافي التسوية')}</span>
                                    <span style={{ fontWeight: 600, color: C.primary, fontFamily: OUTFIT }}>{fMoneyJSX(invoice.remaining)}</span>
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
