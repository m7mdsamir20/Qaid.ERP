'use client';import { C } from '@/constants/theme';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter, useParams } from 'next/navigation';
import { ChevronRight, Printer, Package, Calendar, User, CreditCard, FileText, Loader2, RotateCcw, AlertCircle, ShoppingBag, ArrowLeftRight, Phone, ArrowRight, ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface ReturnInvoice {
    id: string; invoiceNumber: number; date: string;
    customer: { id: string; name: string; phone?: string; balance: number } | null;
    originalInvoiceId?: string;
    originalInvoice?: { invoiceNumber: number; date: string };
    subtotal: number; discount: number; total: number;
    paidAmount: number; remaining: number;
    paymentMethod?: 'cash' | 'bank' | 'credit';
    notes?: string;
    lines: {
        id: string;
        item: { name: string; code?: string; unit?: { name: string } };
        quantity: number;
        price: number;
        total: number;
    }[];
}

export default function SaleReturnDetailsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';
    const [ret, setRet] = useState<ReturnInvoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const id = params?.id as string;

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const retRes = await fetch(`/api/sale-returns/${id}`);

            if (!retRes.ok) {
                const err = await retRes.json();
                throw new Error(err.error || 'فشل في تحميل المرتجع');
            }

            const data = await retRes.json();
            setRet(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchData();
    }, [id, fetchData]);

    const handlePrint = () => {
        if (ret) {
            window.open(`/print/invoice/${ret.id}`, '_blank');
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '14px', color: '#475569' }}>
                    <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{t('جاري استرجاع تفاصيل المرتجع...')}</span>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </DashboardLayout>
        );
    }

    if (error || !ret) {
        return (
            <DashboardLayout>
                <div style={{ padding: '100px 20px', color: '#f87171' }}>
                    <AlertCircle size={56} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                    <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 10px' }}>{t('خطأ في التحميل')}</h3>
                    <p style={{ opacity: 0.8, marginBottom: '20px' }}>{error || t('لم نتمكن من العثور على المرتجع المطلوب')}</p>
                    <button onClick={() => router.push('/sale-returns')} className="btn btn-ghost" style={{ gap: '8px' }}>
                        <ChevronRight size={16} /> {t('العودة للمرتجعات')}
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const { customer } = ret;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '40px', paddingTop: '8px' }}>

                {/* 1. Header: Title & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={() => router.push('/sale-returns')}
                            className="btn btn-ghost btn-sm"
                            style={{
                                width: '36px',
                                height: '36px',
                                padding: 0,
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer'
                            }}
                            title="العودة"
                        >
                            {isRtl ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
                        </button>
                        <div>
                            <h1 className="page-title">{isServices ? t("تفاصيل إلغاء الخدمة / المرتجع") : t("تفاصيل مرتجع المبيعات")}</h1>
                            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{isServices ? t("تفاصيل الخدمات الملغاة وتأثيرها المالي على حساب العميل") : t("تفاصيل العمليات المرتجعة وتأثيرها المالي على حساب العميل")}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button onClick={handlePrint} className="btn btn-ghost" style={{ background: 'rgba(37, 106, 244,0.1)', color: '#256af4', border: '1px solid rgba(37, 106, 244,0.2)', fontWeight: 700, height: '38px', padding: '0 18px', borderRadius: '9px', fontSize: '13px' }}>
                            <Printer size={16} /> {t('طباعة المرتجع')}
                        </button>
                    </div>
                </div>

                {/* 2. Info Bar 1: Return Details */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px 20px', marginBottom: '8px', display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <span style={{ fontWeight: 600 }}>{t('رقم المرتجع:')}</span>
                        <span style={{ color: '#256af4', fontWeight: 600, fontFamily: 'monospace' }}>RET-{String(ret.invoiceNumber).padStart(5, '0')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <Calendar size={14} style={{ color: C.primary }} />
                        <span style={{ fontWeight: 600 }}>{t('تاريخ المرتجع:')}</span>
                        <span style={{ color: 'var(--text-primary)' }}>{new Date(ret.date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { dateStyle: 'long' })}</span>
                    </div>
                    {ret.originalInvoice && (
                        <div onClick={() => router.push('/sales/' + ret.originalInvoiceId)} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#256af4', cursor: 'pointer', background: 'rgba(37, 106, 244,0.05)', padding: '2px 10px', borderRadius: '6px' }}>
                            <ShoppingBag size={14} />
                            <span style={{ fontWeight: 600 }}>{isServices ? t("مرجع فاتورة الخدمة:") : t("مرجع فاتورة البيع:")}</span>
                            <span style={{ fontWeight: 600 }}>SRV-{String(ret.originalInvoice.invoiceNumber).padStart(5, '0')}</span>
                        </div>
                    )}
                </div>

                {/* 3. Info Bar 2: Customer Details */}
                <div style={{ background: 'var(--surface-background)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(37, 106, 244,0.1)', color: '#256af4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={16} />
                        </div>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{customer?.name || t('عميل عام (نقدي)')}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                <Phone size={13} />
                                <span>{customer?.phone || ''}</span>
                            </div>
                        </div>
                    </div>

                    {customer && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('رصيد العميل الحالي:')}</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: customer.balance > 0 ? '#f87171' : '#10b981' }}>
                                <span style={{ fontSize: '11px', marginInlineStart: '4px' }}>{customer.balance > 0 ? t('عليه') : t('له')}</span>
                                {Math.abs(customer.balance).toLocaleString()}
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. Main Grid: Items & Summary Sidebar */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>

                    {/* Items Table Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="table-container" style={{ borderRadius: '18px', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                                <h3 style={{ margin: 0, fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                                    <Package size={13} color="#256af4" strokeWidth={3} /> {isServices ? t("الخدمات الملغاة") : t("الأصناف المرتجعة")}
                                </h3>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{ret.lines.length} {isServices ? t("خدمة") : t("صنف")}</span>
                            </div>
                            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                        <th style={{ padding: '12px 16px',  fontSize: '10px', color: 'var(--text-muted)' }}>{isServices ? t("الخدمة") : t("الصنف")}</th>
                                        <th style={{ textAlign: 'center', padding: '12px 16px',  fontSize: '10px', color: 'var(--text-muted)' }}>{isServices ? t("الحالة/الوصف") : t("الوحدة")}</th>
                                        <th style={{ padding: '12px 16px',  fontSize: '10px', color: 'var(--text-muted)' }}>{isServices ? t("الكمية الملغاة") : t("الكمية المرتجعة")}</th>
                                        <th style={{ padding: '12px 16px',  fontSize: '10px', color: 'var(--text-muted)' }}>{isServices ? t("سعر الخدمة") : t("سعر الوحدة")}</th>
                                        <th style={{ padding: '12px 16px',  fontSize: '10px', color: 'var(--text-muted)' }}>{t('الإجمالي')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ret.lines.map((l, i) => (
                                        <tr key={l.id} style={{ borderBottom: i < ret.lines.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontWeight: 700, fontSize: '13px' }}>{l.item.name}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{l.item.code || '—'}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px',  fontSize: '12px' }}>{l.item.unit?.name || '—'}</td>
                                            <td style={{ padding: '12px 16px',  fontSize: '13px', fontWeight: 700, color: '#f87171' }}>{l.quantity}</td>
                                            <td style={{ padding: '12px 16px',  fontSize: '12px' }}>{l.price.toLocaleString()}</td>
                                            <td style={{ padding: '12px 16px',  fontSize: '13px', fontWeight: 600 }}>{l.total.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {ret.notes && (
                            <div style={{ background: 'rgba(148,163,184,0.03)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '16px', padding: '16px', display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                <FileText size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>{isServices ? t("سبب الإلغاء / ملاحظات") : t("الملاحظات / سبب المرتجع")}</div>
                                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ret.notes}</p>
                                </div>
                            </div>
                        )}

                        {/* Breakdown Summary - Reverted to vertical style for consistency */}
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{isServices ? t("إجمالي الملغي:") : t("إجمالي المرتجع:")}</span>
                                <span style={{ color: '#f87171' }}>{ret.total.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{isServices ? t("رصيد مسترد:") : t("رد نقدي مباشر:")}</span>
                                <span style={{ color: '#10b981' }}>{ret.paidAmount.toLocaleString()}</span>
                            </div>
                            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                                <span>{isServices ? t("صافي التسوية:") : t("صافي التسوية:")}</span>
                                <span style={{ color: '#256af4', fontSize: '18px' }}>{ret.remaining.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar: Totals Stack */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                        <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RotateCcw size={18} />
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{isServices ? t("إجمالي الملغي") : t("إجمالي المرتجع")}</div>
                                <div style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444' }}>{ret.total.toLocaleString()} <span style={{ fontSize: '11px' }}></span></div>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ArrowLeftRight size={18} />
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('رد نقدي مباشر')}</div>
                                <div style={{ fontSize: '16px', fontWeight: 600, color: '#10b981' }}>{ret.paidAmount.toLocaleString()} <span style={{ fontSize: '11px' }}></span></div>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(37, 106, 244,0.04)', border: '1px solid rgba(37, 106, 244,0.1)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37, 106, 244,0.1)', color: '#256af4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ShoppingBag size={18} />
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('تسوية رصيد')}</div>
                                <div style={{ fontSize: '16px', fontWeight: 600, color: '#256af4' }}>{ret.remaining.toLocaleString()} <span style={{ fontSize: '11px' }}></span></div>
                            </div>
                        </div>

                        {/* Payment Method Item */}
                        {ret.paymentMethod && (
                            <div style={{ padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', borderStyle: 'dashed' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>{t('آلية المرتجع')}</div>
                                <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CreditCard size={14} />
                                    </div>
                                    {ret.paymentMethod === 'bank' ? t('رد بنكي') : ret.paymentMethod === 'credit' ? t('تسوية مديونية') : t('صرف نقدي')}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </DashboardLayout>
    );
}
