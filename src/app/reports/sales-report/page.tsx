'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useCurrency } from '@/hooks/useCurrency';
import { generateReportHTML } from '@/lib/printInvoices';
import { formatMoney } from '@/lib/currency';
import { useEffect, useState } from 'react';
import { BarChart3, Search, Calendar, Wallet, ArrowUpRight, ArrowDownRight, Activity, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, INTER, IS, PAGE_BASE } from '@/constants/theme';

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
    const { fMoney, currency } = useCurrency();
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

    const handlePrint = () => {
        if (!data) return;
        const fmtM = (v: number) => formatMoney(v, currency, lang);
        const company = session?.user ?? {};

        const content = `
            <table>
                <thead>
                    <tr>
                        <th>${t('رقم الفاتورة')}</th>
                        <th>${t('التاريخ')}</th>
                        <th>${t('العميل')}</th>
                        <th>${t('إجمالي الفاتورة')}</th>
                        <th>${t('المسدد')}</th>
                        <th>${t('المتبقي')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.invoices.map(inv => `
                        <tr>
                            <td>INV-${String(inv.invoiceNumber).padStart(5, '0')}</td>
                            <td>${new Date(inv.date).toLocaleDateString('en-GB')}</td>
                            <td>${inv.customer?.name || '—'}</td>
                            <td>${fmtM(inv.total)}</td>
                            <td>${fmtM(inv.paidAmount)}</td>
                            <td style="color:${inv.remaining > 0 ? '#ef4444' : '#10b981'}; font-weight:900">${fmtM(inv.remaining)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        const html = generateReportHTML(isServices ? t("تقرير مبيعات الخدمات") : t("تقرير المبيعات"), content, company, {
            lang,
            dateFrom: from || '',
            dateTo: to || t('الآن'),
            generatedBy: session?.user?.name || '',
            summary: [
                { label: t('إجمالي المبيعات'), value: data.totalSales },
                { label: t('إجمالي الخصومات'), value: data.totalDiscount },
                { label: t('إجمالي المحصل'), value: data.totalPaid },
                { label: t('إجمالي المستحق'), value: data.totalRemaining, isTotal: true },
            ]
        });

        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
    };

    useEffect(() => { fetchReport(); }, []);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={isServices ? t("تقرير مبيعات الخدمات") : t("تقرير المبيعات")}
                    subtitle={isServices ? t("تحليل تفصيلي لجميع فواتير الخدمات الصادرة.") : t("تحليل تفصيلي لجميع عمليات البيع الصادرة، الخصومات، والمبالغ المحصلة والمتبقية.")}
                    backTab="sales-purchases"
                    onPrint={handlePrint}
                    printTitle={isServices ? t("تقرير مبيعات الخدمات") : t("تقرير مبيعات الأصناف")}
                    printDate={(from || to) ? `${from ? t('من: ') + from : ''} ${to ? t(' إلى: ') + to : ''}` : undefined}
                />

                <div className="no-print" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('من:')}</span>
                        <div style={{ width: '170px' }}>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 12px', textAlign: 'start', direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: INTER
                                }}
                            />
                        </div>
                        <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('إلى:')}</span>
                        <div style={{ width: '170px' }}>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 12px', textAlign: 'start', direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: INTER
                                }}
                            />
                        </div>
                        {branches.length > 1 && (
                            <div style={{ minWidth: '180px' }}>
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
                        <button onClick={fetchReport} style={{
                            height: '42px', padding: '0 24px', borderRadius: '12px',
                            background: C.primary, color: '#fff', border: 'none',
                            fontSize: '13.5px', fontWeight: 800, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO,
                            boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                        }}>
                            <Search size={16} /> {t('تحديث البيانات')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 600, fontFamily: CAIRO, color: C.textSecondary }}>{isServices ? t("جاري استخراج تقرير الخدمات...") : t("جاري استخراج تقرير المبيعات...")}</span>
                    </div>
                ) : !data || data.invoices.length === 0 ? (
                    <div className="no-print" style={{ textAlign: 'center', padding: '120px 20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <BarChart3 size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{isServices ? t("لا توجد خدمات مسجلة") : t("لا توجد فواتير متاحة")}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, maxWidth: '400px', marginInline: 'auto', lineHeight: 1.6, fontFamily: CAIRO }}>{isServices ? t("برجاء اختيار فترة زمنية أخرى أو تعديل معايير البحث لعرض تفاصيل الخدمات.") : t("برجاء اختيار فترة زمنية أخرى أو تعديل معايير البحث لعرض تفاصيل المبيعات.")}</p>
                    </div>
                ) : (
                    <>

                        <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(59,130,246,0.08)', color: '#3b82f6', borderRadius: '10px' }}><BarChart3 size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{isServices ? t('إجمالي الخدمات') : t('إجمالي المبيعات')}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                        <span style={{ fontSize: '15.5px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{fMoney(data.totalSales)}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderRadius: '10px' }}><ArrowDownRight size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('الخصومات الممنوحة')}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                        <span style={{ fontSize: '15.5px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{fMoney(data.totalDiscount)}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(52,211,153,0.08)', color: '#10b981', borderRadius: '10px' }}><Wallet size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي التحصيل')}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                        <span style={{ fontSize: '15.5px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{fMoney(data.totalPaid)}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderRadius: '10px' }}><Activity size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('المطالبات المتبقية')}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                        <span style={{ fontSize: '15.5px', fontWeight: 900, color: '#ef4444', fontFamily: INTER }}>{fMoney(data.totalRemaining)}</span>
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

                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        {[t('رقم الفاتورة'), t('التاريخ'), t('اسم العميل'), t('صافي القيمة'), t('الخصم'), t('المحصل'), t('المتبقي')].map((h, i) => (
                                            <th key={i} style={{
                                                padding: '16px 20px',
                                                fontSize: '12px',
                                                fontWeight: 800,
                                                color: C.textSecondary,
                                                textAlign: i >= 3 ? 'center' : 'right',
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
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 900, color: '#60a5fa', fontFamily: INTER }}>
                                                    SAL-{String(inv.invoiceNumber).padStart(5, '0')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px', fontSize: '12px', color: C.textMuted, fontFamily: INTER }}>{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                            <td style={{ padding: '14px 20px', fontSize: '12.5px', color: C.textPrimary, fontWeight: 700, fontFamily: CAIRO }}>{inv.customer?.name || t('عميل نقدي')}</td>
                                            <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '14px', fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>{fMoney(inv.total)}</td>
                                            <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '14px', fontWeight: 800, color: inv.discount > 0 ? '#fb923c' : C.textMuted, fontFamily: INTER }}>{inv.discount > 0 ? fMoney(inv.discount) : '—'}</td>
                                            <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '14px', fontWeight: 800, color: '#10b981', fontFamily: INTER }}>{fMoney(inv.paidAmount)}</td>
                                            <td style={{ padding: '16px 20px', textAlign: 'center', fontSize: '14px', fontWeight: 1000, color: inv.remaining > 0 ? '#ef4444' : '#10b981', fontFamily: INTER }}>{fMoney(inv.remaining)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot style={{ background: 'rgba(255,255,255,0.03)', borderTop: `2px solid ${C.border}` }}>
                                    <tr>
                                        <td colSpan={3} style={{ padding: '18px 24px', fontSize: '13px', fontWeight: 900, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجماليات الفترة المختارة')}</td>
                                        <td style={{ padding: '18px', textAlign: 'center', fontSize: '15px', fontWeight: 1000, color: C.textPrimary, fontFamily: INTER }}>{fMoney(data.totalSales)}</td>
                                        <td style={{ padding: '18px', textAlign: 'center', fontSize: '15px', fontWeight: 1000, color: '#fb923c', fontFamily: INTER }}>{fMoney(data.totalDiscount)}</td>
                                        <td style={{ padding: '18px', textAlign: 'center', fontSize: '15px', fontWeight: 1000, color: '#10b981', fontFamily: INTER }}>{fMoney(data.totalPaid)}</td>
                                        <td style={{ padding: '18px', textAlign: 'center', fontSize: '16px', fontWeight: 1000, color: data.totalRemaining > 0 ? '#fb7185' : '#10b981', background: 'rgba(255,255,255,0.02)', fontFamily: INTER }}>{fMoney(data.totalRemaining)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                .print-only { display: none; }
                @media print { 
                    .print-only { display: block !important; }
                    .no-print { display: none !important; }
                    .stat-value { font-size: 11px !important; color: #000 !important; }
                    .stat-label { font-size: 9px !important; color: #666 !important; }
                    div { background: #fff !important; border-color: #e2e8f0 !important; }
                    div, span, h2, h3, p, small { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; border: 1px solid #e2e8f0 !important; }
                }
                input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.5; cursor: pointer; }
            `}</style>
        </DashboardLayout>
    );
}
