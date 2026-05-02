import TableSkeleton from '@/components/TableSkeleton';
'use client';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { useEffect, useState } from 'react';
import { BarChart3, Search, Calendar, Wallet, ArrowUpRight, ArrowDownRight, Activity, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, IS, PAGE_BASE } from '@/constants/theme';

interface Invoice {
    id: string;
    invoiceNumber: number;
    date: string;
    total: number;
    discount: number;
    paidAmount: number;
    remaining: number;
    customer: { name: string } | null;
}

interface ReportData {
    invoices: Invoice[];
    totalSales: number;
    totalDiscount: number;
    totalPaid: number;
    totalRemaining: number;
}

interface BranchOption {
    id: string;
    name: string;
}

export default function SalesReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const businessType = session?.user?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';
    const { symbol: sym } = useCurrency();
    const fmt = (n: number) => formatNumber(n);
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [q, setQ] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            if (branchId && branchId !== 'all') params.set('branchId', branchId);
            const res = await fetch(`/api/reports/sales-report?${params}`);
            if (res.ok) setData(await res.json());
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchReport(); }, []);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={isServices ? t("تقرير مبيعات الخدمات") : t("تقرير المبيعات")}
                    subtitle={isServices ? t("تحليل تفصيلي لجميع فواتير الخدمات الصادرة.") : t("تحليل تفصيلي لجميع عمليات البيع الصادرة، الخصومات، والمبالغ المحصلة والمتبقية.")}
                    backTab="sales-purchases"
                    printTitle={isServices ? t("تقرير مبيعات الخدمات") : t("تقرير مبيعات الأصناف")}
                    printDate={(from || to) ? `${from ? t('من: ') + from : ''} ${to ? t(' إلى: ') + to : ''}` : undefined}
                />

                <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="date-filter-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('من:')}</span>
                        <div className="date-input-wrapper" style={{ width: '170px' }}>
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t('من:')}</span>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 12px',  direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                        <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('إلى:')}</span>
                        <div className="date-input-wrapper" style={{ width: '170px' }}>
                            <span className="date-label-mobile" style={{ display: 'none' }}>{t('إلى:')}</span>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 12px',  direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                    </div>

                    <div className="branch-filter-wrapper" style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                        {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                            <div style={{ minWidth: '180px', flex: 1 }}>
                                <CustomSelect
                                    value={branchId}
                                    onChange={(v: string) => setBranchId(v)}
                                    placeholder={t("كل الفروع")}
                                    hideSearch
                                    style={{ background: C.card, border: `1px solid ${C.border}` }}
                                    options={[
                                        { value: 'all', label: t('كل الفروع') },
                                        ...branches.map((b) => ({ value: b.id, label: b.name }))
                                    ]}
                                />
                            </div>
                        )}
                        <button className="update-btn" onClick={fetchReport} style={{
                            height: '42px', padding: '0 24px', borderRadius: '12px',
                            background: C.primary, color: '#fff', border: 'none',
                            fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO,
                            boxShadow: '0 4px 12px rgba(37, 106, 244,0.2)', whiteSpace: 'nowrap'
                        }}>
                            <Search size={16} /> {t('تحديث البيانات')}
                        </button>
                    </div>
                </div>

                {loading ? ( <TableSkeleton /> ) : !data || data.invoices.length === 0 ? (
                    <div className="no-print" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <BarChart3 size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{isServices ? t("لا توجد خدمات مسجلة") : t("لا توجد فواتير متاحة")}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textSecondary, maxWidth: '400px', marginInline: 'auto', lineHeight: 1.6, fontFamily: CAIRO }}>{isServices ? t("برجاء اختيار فترة زمنية أخرى أو تعديل معايير البحث لعرض تفاصيل الخدمات.") : t("برجاء اختيار فترة زمنية أخرى أو تعديل معايير البحث لعرض تفاصيل المبيعات.")}</p>
                    </div>
                ) : (
                    <>

                        <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(37, 106, 244,0.08)', color: '#256af4', borderRadius: '10px' }}><BarChart3 size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{isServices ? t('إجمالي الخدمات') : t('إجمالي المبيعات')}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                        <span style={{ fontSize: '15.5px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={data.totalSales} /></span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderRadius: '10px' }}><ArrowDownRight size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('الخصومات الممنوحة')}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                        <span style={{ fontSize: '15.5px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={data.totalDiscount} /></span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(52,211,153,0.08)', color: '#10b981', borderRadius: '10px' }}><Wallet size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي التحصيل')}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                        <span style={{ fontSize: '15.5px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={data.totalPaid} /></span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderRadius: '10px' }}><Activity size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('المطالبات المتبقية')}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                        <span style={{ fontSize: '15.5px', fontWeight: 600, color: '#ef4444', fontFamily: OUTFIT }}><Currency amount={data.totalRemaining} /></span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="no-print" style={{ position: 'relative', width: '100%', marginBottom: '20px' }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                placeholder={t("ابحث برقم الفاتورة أو اسم العميل...")}
                                value={q} onChange={e => setQ(e.target.value)}
                                style={{
                                    ...IS, paddingInlineStart: '45px', height: '42px', fontSize: '13.5px',
                                    background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`,
                                    fontWeight: 500
                                }}
                            />
                        </div>

                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: '14%' }} />
                                    <col style={{ width: '14%' }} />
                                    <col style={{ width: '20%' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '13%' }} />
                                </colgroup>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        {[t('رقم الفاتورة'), t('التاريخ'), t('اسم العميل'), t('صافي القيمة'), t('الخصم'), t('المحصل'), t('المتبقي')].map((h, i) => (
                                            <th key={i} style={{
                                                padding: '14px 16px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                color: C.textSecondary,
                                                textAlign: 'start',
                                                fontFamily: CAIRO,
                                                borderBottom: `1px solid ${C.border}`
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.invoices.filter(inv => {
                                        const code = `SAL-${String(inv.invoiceNumber).padStart(5, '0')}`;
                                        return code.includes(q.toUpperCase()) ||
                                            String(inv.invoiceNumber).includes(q) ||
                                            (inv.customer?.name || 'عميل نقدي').toLowerCase().includes(q.toLowerCase());
                                    }).map((inv, idx) => (
                                        <tr key={inv.id}
                                            style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ background: 'rgba(37, 106, 244,0.1)', border: '1px solid rgba(37, 106, 244,0.2)', borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, color: '#60a5fa', fontFamily: OUTFIT }}>
                                                    SAL-{String(inv.invoiceNumber).padStart(5, '0')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: C.textMuted, fontFamily: OUTFIT }}>{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.customer?.name || t('عميل نقدي')}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={inv.total} /></td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: inv.discount > 0 ? '#fb923c' : C.textMuted, fontFamily: OUTFIT }}>{inv.discount > 0 ? <><Currency amount={inv.discount} /></> : '—'}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#10b981', fontFamily: OUTFIT }}><Currency amount={inv.paidAmount} /></td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: inv.remaining > 0 ? '#ef4444' : '#10b981', fontFamily: OUTFIT }}><Currency amount={inv.remaining} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot style={{ background: 'rgba(255,255,255,0.03)', borderTop: `2px solid ${C.border}` }}>
                                    <tr>
                                        <td colSpan={3} style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجماليات الفترة المختارة')}</td>
                                        <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={data.totalSales} /></td>
                                        <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#fb923c', fontFamily: OUTFIT }}><Currency amount={data.totalDiscount} /></td>
                                        <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: '#10b981', fontFamily: OUTFIT }}><Currency amount={data.totalPaid} /></td>
                                        <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: data.totalRemaining > 0 ? '#fb7185' : '#10b981', fontFamily: OUTFIT }}><Currency amount={data.totalRemaining} /></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
            </div>
            
        </DashboardLayout>
    );
}
