'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowRight, ArrowLeft, Printer, Loader2, TrendingDown, Calendar, Banknote, User, Building2, FileText, AlertTriangle } from 'lucide-react';
import { C, CAIRO, OUTFIT } from '@/constants/theme';
import { Currency } from '@/components/Currency';

interface VoucherData {
    voucher: {
        id: string;
        voucherNumber: number;
        type: string;
        date: string;
        amount: number;
        description: string | null;
        customer?: { id: string; name: string } | null;
        supplier?: { id: string; name: string } | null;
        treasury?: { id: string; name: string; type: string; bankName?: string | null } | null;
    };
    company: {
        name: string;
        nameEn?: string | null;
        currency?: string | null;
    };
}

const DetailRow = ({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) => (
    <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 0', borderBottom: '1px solid var(--border-subtle)',
    }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: valueColor || 'var(--text-primary)', fontFamily: OUTFIT }}>
            {value}
        </span>
    </div>
);

export default function PaymentDetailPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [data, setData] = useState<VoucherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchVoucher = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/print/voucher/${id}`);
            if (!res.ok) {
                const e = await res.json();
                setError(e.error || t('تعذّر العثور على السند'));
                return;
            }
            const json = await res.json();
            // Only render payment vouchers on this page
            if (json.voucher?.type !== 'payment') {
                setError(t('هذا السند ليس سند صرف'));
                return;
            }
            setData(json);
        } catch {
            setError(t('خطأ في الاتصال بالخادم'));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchVoucher(); }, [fetchVoucher]);

    const handlePrint = () => {
        window.open(`/print/voucher/${id}`, '_blank');
    };

    // ── Loading state ──
    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
                    <Loader2 size={36} style={{ animation: 'spin 1.2s linear infinite', color: C.primary }} />
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '13px' }}>{t('جاري تحميل بيانات السند...')}</p>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </DashboardLayout>
        );
    }

    // ── Error state ──
    if (error || !data) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '20px' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '20px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                        <AlertTriangle size={32} />
                    </div>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '16px' }}>{error || t('السند غير موجود')}</p>
                    <button
                        onClick={() => router.push('/payments')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', background: 'var(--surface-100)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}
                    >
                        {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                        {t('العودة لقائمة سندات الصرف')}
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const { voucher, company } = data;
    const voucherRef = `PMT-${String(voucher.voucherNumber).padStart(5, '0')}`;
    const partyName = voucher.supplier?.name || voucher.customer?.name || '—';
    const treasuryType = voucher.treasury?.type === 'bank' ? t('بنكي') : t('نقدي');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px' }}>

                {/* ── Page Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <button
                            onClick={() => router.push('/payments')}
                            style={{ width: 44, height: 44, borderRadius: '14px', background: 'var(--surface-50)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
                            onMouseEnter={e => e.currentTarget.style.color = C.primary}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                        >
                            {isRtl ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
                        </button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: CAIRO }}>{t('تفاصيل سند الصرف')}</h1>
                                <span style={{ padding: '4px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '12px', fontWeight: 700, fontFamily: OUTFIT }}>{voucherRef}</span>
                            </div>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{company.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={handlePrint}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--surface-50)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = C.primary; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-50)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                    >
                        <Printer size={16} /> {t('طباعة السند')}
                    </button>
                </div>

                {/* ── Amount Hero Card ── */}
                <div style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(239,68,68,0.05) 100%)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '20px', padding: '28px', marginBottom: '24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <TrendingDown size={20} />
                        </div>
                        <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 700 }}>{t('إجمالي المبلغ المصروف')}</span>
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 950, color: '#ef4444', fontFamily: OUTFIT, direction: 'ltr' }}>
                        <Currency amount={voucher.amount} />
                    </div>
                </div>

                {/* ── Details Card ── */}
                <div style={{ background: 'var(--surface-50)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <FileText size={18} style={{ color: C.primary }} />
                        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: CAIRO }}>{t('بيانات السند')}</h2>
                    </div>

                    <DetailRow label={t('رقم السند')} value={voucherRef} valueColor={C.primary} />
                    <DetailRow
                        label={t('التاريخ')}
                        value={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={14} style={{ color: C.primary }} />
                                {new Date(voucher.date).toLocaleDateString('en-ZA')}
                            </span>
                        }
                    />
                    <DetailRow
                        label={t('المورد')}
                        value={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={14} style={{ color: C.primary }} />
                                {partyName}
                            </span>
                        }
                    />
                    <DetailRow
                        label={t('الخزينة / البنك')}
                        value={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Building2 size={14} style={{ color: C.primary }} />
                                {voucher.treasury?.name || '—'}
                            </span>
                        }
                    />
                    <DetailRow
                        label={t('طريقة الدفع')}
                        value={
                            <span style={{
                                padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                                background: voucher.treasury?.type === 'bank' ? 'rgba(37,106,244,0.1)' : 'rgba(16,185,129,0.1)',
                                color: voucher.treasury?.type === 'bank' ? '#60a5fa' : '#10b981',
                            }}>
                                {treasuryType}
                            </span>
                        }
                    />
                    <DetailRow label={t('المبلغ')} value={<Currency amount={voucher.amount} />} valueColor='#ef4444' />

                    {/* Description — spans full row */}
                    {voucher.description && (
                        <div style={{ paddingTop: '14px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                                <Banknote size={13} style={{ display: 'inline', marginInlineEnd: '6px', color: C.primary }} />
                                {t('البيان')}
                            </span>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.7, background: 'var(--surface-100)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                                {voucher.description}
                            </p>
                        </div>
                    )}
                </div>

                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        </DashboardLayout>
    );
}
