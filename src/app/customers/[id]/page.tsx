'use client';
import React, { useState, useEffect, useCallback, use } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowRight, ArrowLeft, Printer, ScrollText, Calendar, Loader2, TrendingUp, TrendingDown, History, FileText, User, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function CustomerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';

    const resolvedParams = use(params);
    const customerId = resolvedParams.id;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [error, setError] = useState('');

    const fetchLedger = useCallback(async () => {
        setLoading(true);
        try {
            let url = `/api/customers/${customerId}/ledger`;
            const q = new URLSearchParams();
            if (dateFrom) q.append('from', dateFrom);
            if (dateTo) q.append('to', dateTo);
            if (q.toString()) url += `?${q.toString()}`;

            const res = await fetch(url);
            if (!res.ok) {
                const e = await res.json();
                setError(e.error || 'فشل جلب كشف الحساب');
            } else {
                const d = await res.json();
                setData(d);
                setError('');
            }
        } catch {
            setError('خطأ في الاتصال بالخادم');
        } finally {
            setLoading(false);
        }
    }, [customerId, dateFrom, dateTo]);

    useEffect(() => { fetchLedger(); }, [fetchLedger]);

    if (loading && !data) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
                    <Loader2 size={42} style={{ animation: 'spin 1.5s linear infinite', color: 'var(--primary)' }} />
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 800 }}>{t('جاري تحليل كشف حساب العميل وعرض الحركات...')}</p>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !data) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '20px', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '20px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}><ScrollText size={32} /></div>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '18px' }}>{error || t('لا تتوفر بيانات لهذا العميل حالياً')}</p>
                    <Link href="/customers" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', background: 'var(--surface-100)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700, transition: 'all 0.2s' }}>
                        {isRtl ? <ArrowRight size={18} /> : <ArrowLeft size={18} />} {t('العودة لقائمة العملاء')}
                    </Link>
                </div>
            </DashboardLayout>
        );
    }

    const { customer, ledger, initialBalance, finalBalance } = data;
    const totalDebit = ledger.reduce((s: number, l: any) => s + l.debit, 0);
    const totalCredit = ledger.reduce((s: number, l: any) => s + l.credit, 0);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px' }}>
                {/* Header */}
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <Link href="/customers" style={{ width: 44, height: 44, borderRadius: '14px', background: 'var(--surface-50)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                            {isRtl ? <ArrowRight size={24} /> : <ArrowLeft size={24} />}
                        </Link>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                <h1 className="page-title" style={{ margin: 0 }}>{isServices ? t('كشف خدمات العميل') : t('كشف حركة العميل')}</h1>
                                <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '11px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {customer.name}</span>
                            </div>
                            <p className="page-subtitle">{isServices ? t('عرض تفصيلي لجميع الخدمات، المدفوعات، ومرتجع الخدمات الخاصة بالعميل') : t('عرض تفصيلي لجميع المبيعات، المدفوعات، والمرتجعات الخاصة بالعميل')}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 20px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--surface-50)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}>
                            <Printer size={18} /> {t('طباعة التقرير')}
                        </button>
                    </div>
                </div>

                {/* Print Branding (Hidden in Web) */}
                <div className="print-only" style={{ display: 'none', textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '30px', marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '28px', color: '#000', margin: '0 0 10px 0' }}>{t('كشف حساب تفصيلي')}</h1>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', direction: 'inherit', textAlign: 'start', fontSize: '14px', color: '#000' }}>
                        <div><strong>{t('اسم العميل:')}</strong> {customer.name}</div>
                        {customer.phone && <div><strong>{t('رقم الهاتف:')}</strong> {customer.phone}</div>}
                        <div><strong>{t('تاريخ الطباعة:')}</strong> {new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</div>
                        {dateFrom && <div><strong>{t('الفترة من:')}</strong> {new Date(dateFrom).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</div>}
                        {dateTo && <div><strong>{t('إلى تاريخ:')}</strong> {new Date(dateTo).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</div>}
                    </div>
                </div>

                {/* Filters */}
                <div className="no-print" style={{ background: 'var(--surface-50)', border: '1px solid var(--border-subtle)', borderRadius: '24px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 150px', gap: '20px', alignItems: 'flex-end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>{t('تاريخ البداية')}</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={16} style={{ position: 'absolute', insetInlineEnd: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: '100%', height: '44px', padding: '0 40px 0 14px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--surface-100)', color: 'var(--text-primary)', fontWeight: 700, outline: 'none', direction: 'ltr' }} />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>{t('تاريخ النهاية')}</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={16} style={{ position: 'absolute', insetInlineEnd: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: '100%', height: '44px', padding: '0 40px 0 14px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--surface-100)', color: 'var(--text-primary)', fontWeight: 700, outline: 'none', direction: 'ltr' }} />
                            </div>
                        </div>
                        <button onClick={fetchLedger} style={{ height: '44px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 950, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                            {t('تحديث البيانات')}
                        </button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
                    {[
                        { label: t('رصيد سابق للفترة'), value: Math.abs(initialBalance), sign: initialBalance >= 0 ? t('مدين') : t('دائن'), color: initialBalance >= 0 ? '#ef4444' : '#10b981', icon: <History size={18} /> },
                        { label: t('إجمالي الحركات المدينة'), value: totalDebit, sign: t('عليه'), color: '#ef4444', icon: <TrendingDown size={18} /> },
                        { label: t('إجمالي الحركات الدائنة'), value: totalCredit, sign: t('له'), color: '#10b981', icon: <TrendingUp size={18} /> },
                        { label: t('الرصيد الصافي النهائي'), value: Math.abs(finalBalance), sign: finalBalance >= 0 ? t('مدين') : t('دائن'), color: finalBalance >= 0 ? '#ef4444' : '#10b981', icon: <FileText size={18} />, highlight: true },
                    ].map((card, i) => (
                        <div key={i} style={{ background: 'var(--surface-50)', border: '1px solid var(--border-subtle)', borderRadius: '20px', padding: '20px', boxShadow: card.highlight ? 'var(--shadow-md)' : 'none', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>{card.label}</span>
                                <div style={{ color: card.color, opacity: 0.8 }}>{card.icon}</div>
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 950, color: 'var(--text-primary)', marginBottom: '4px', direction: 'ltr', textAlign: 'start' }}>
                                {card.value.toLocaleString()} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}></span>
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: 850, color: card.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {card.sign === t('مدين') || card.sign === t('عليه') ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                                {card.sign}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Ledger Table */}
                <div style={{ background: 'var(--surface-50)', border: '1px solid var(--border-subtle)', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', direction: isRtl ? 'rtl' : 'ltr' }}>
                            <thead>
                                <tr style={{ background: 'var(--surface-100)', borderBottom: '2px solid var(--border-subtle)' }}>
                                    {[t('تاريخ العملية'), t('نوع الحركة'), t('المـرجع'), t('تفاصيل البيان التوضيحي'), t('مديـن (+)'), t('دائـن (-)'), t('الرصيد')].map((h, i) => (
                                        <th key={i} style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', textAlign: (i === 3 || i === 4 || i === 5 || i === 6) ? (isRtl ? 'right' : 'left') : 'center' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Initial Balance Row */}
                                {initialBalance !== 0 && (
                                    <tr style={{ background: 'var(--surface-100)', borderBottom: '1px solid var(--border-subtle)' }}>
                                        <td style={{ padding: '16px 20px',  color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>—</td>
                                        <td style={{ padding: '16px 20px', }}>
                                            <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'var(--surface-200)', color: 'var(--text-primary)', fontSize: '11px', fontWeight: 850 }}>{t('رصيد افتتاحي')}</span>
                                        </td>
                                        <td style={{ padding: '16px 20px',  color: 'var(--text-muted)', fontWeight: 600 }}>—</td>
                                        <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 700 }}>{t('إجمالي رصيد العميل ما قبل فترة البحث المحددة')}</td>
                                        <td style={{ padding: '16px 20px',  color: initialBalance > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: 900, fontSize: '14px' }}>{initialBalance > 0 ? initialBalance.toLocaleString() : '—'}</td>
                                        <td style={{ padding: '16px 20px',  color: initialBalance < 0 ? '#10b981' : 'var(--text-muted)', fontWeight: 900, fontSize: '14px' }}>{initialBalance < 0 ? Math.abs(initialBalance).toLocaleString() : '—'}</td>
                                        <td style={{ padding: '16px 20px',  fontWeight: 950, color: initialBalance > 0 ? '#ef4444' : '#10b981', direction: 'ltr', fontSize: '15px' }}>{Math.abs(initialBalance).toLocaleString()}</td>
                                    </tr>
                                )}
                                
                                {/* Transaction Ledger Rows */}
                                {ledger.map((row: any, i: number) => (
                                    <tr key={row.id + i} style={{ borderBottom: i < ledger.length - 1 ? '1px solid var(--border-subtle)' : 'none', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-100)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '14px 20px',  color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 800 }}>
                                            {new Date(row.date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '14px 20px', }}>
                                            <span style={{ padding: '4px 10px', borderRadius: '8px', background: row.type === 'invoice' ? 'rgba(59,130,246,0.1)' : row.type === 'receipt' ? 'rgba(16,185,129,0.1)' : 'var(--surface-200)', color: row.type === 'invoice' ? 'var(--primary)' : row.type === 'receipt' ? '#10b981' : 'var(--text-secondary)', fontSize: '11px', fontWeight: 900 }}>
                                                {row.type === 'invoice' ? (isServices ? t('فاتورة خدمة') : t('فاتورة مبيعات')) : row.type === 'receipt' ? t('سند تحصيل') : row.type === 'return' ? (isServices ? t('مرتجع خدمة') : t('مرتجع بيع')) : row.type === 'payment' ? t('سند صرف') : row.type === 'refund' ? t('استرداد') : t('حركة محاسبية')}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 20px', }}>
                                            {row.ref ? <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>{row.ref}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 650 }}>{row.description}</td>
                                        <td style={{ padding: '14px 20px',  color: row.debit > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: 950, fontSize: '14px' }}>{row.debit > 0 ? row.debit.toLocaleString() : '—'}</td>
                                        <td style={{ padding: '14px 20px',  color: row.credit > 0 ? '#10b981' : 'var(--text-muted)', fontWeight: 950, fontSize: '14px' }}>{row.credit > 0 ? row.credit.toLocaleString() : '—'}</td>
                                        <td style={{ padding: '14px 20px',  fontWeight: 950, color: row.balance > 0 ? '#ef4444' : row.balance < 0 ? '#10b981' : 'var(--text-primary)', direction: 'ltr', fontSize: '15px' }}>{Math.abs(row.balance).toLocaleString()}</td>
                                    </tr>
                                ))}

                                {/* Empty Ledger State */}
                                {ledger.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{  padding: '100px 24px', color: 'var(--text-muted)', fontWeight: 800, fontSize: '15px' }}>
                                            <ScrollText size={48} style={{ display: 'block', margin: '0 auto 16px', opacity: 0.2 }} />
                                            {t('لا توجد حركات مسجلة لهذا العميل في الفترة المحددة')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot style={{ background: 'var(--surface-100)', borderTop: '2px solid var(--border-subtle)' }}>
                                <tr style={{ fontWeight: 950 }}>
                                    <td colSpan={4} style={{ padding: '20px 24px',  fontSize: '16px', color: 'var(--text-primary)' }}>{t('صافي إجمالي الحركات خلال الفترة')}</td>
                                    <td style={{ padding: '20px 20px',  color: '#ef4444', fontSize: '16px' }}>{totalDebit.toLocaleString()}</td>
                                    <td style={{ padding: '20px 20px',  color: '#10b981', fontSize: '16px' }}>{totalCredit.toLocaleString()}</td>
                                    <td style={{ padding: '20px 24px',  color: finalBalance > 0 ? '#ef4444' : '#10b981', direction: 'ltr', fontSize: '18px' }}>{Math.abs(totalDebit - totalCredit).toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    @page { margin: 1cm; size: auto; }
                    body { background: #fff !important; color: #000 !important; -webkit-print-color-adjust: exact; }
                    .no-print, nav, .sidebar { display: none !important; }
                    .main-layout { padding: 0 !important; margin: 0 !important; display: block !important; }
                    .print-only { display: block !important; }
                    table { border: 1px solid #000 !important; width: 100% !important; border-collapse: collapse !important; }
                    th, td { border: 1px solid #000 !important; color: #000 !important; padding: 10px !important; }
                    thead { background-color: #f0f0f0 !important; }
                    tfoot { background-color: #f9f9f9 !important; }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </DashboardLayout>
    );
}
