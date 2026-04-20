'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, SEARCH_STYLE, INTER, IS, TABLE_STYLE } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/hooks/useCurrency';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { ShoppingCart, Search, Loader2, ArrowUpRight, ArrowDownRight, Activity, DollarSign, Calendar } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

interface Invoice {
    id: string;
    invoiceNumber: number;
    date: string;
    total: number;
    discount: number;
    paidAmount: number;
    remaining: number;
    supplier: { name: string } | null;
}

interface ReportData {
    invoices: Invoice[];
    totalPurchases: number;
    totalDiscount: number;
    totalPaid: number;
    totalRemaining: number;
}

export default function PurchasesReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { fMoneyJSX } = useCurrency();

    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [q, setQ] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<any[]>([]);

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
            const res = await fetch(`/api/reports/purchases-report?${params}`);
            if (res.ok) setData(await res.json());
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchReport(); }, []);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير المشتريات")}
                    subtitle={t("تحليل تفصيلي لجميع عمليات الشراء الواردة، الخصومات، والمبالغ المدفوعة والمتبقية.")}
                    backTab="sales-purchases"
                    printTitle={t("تقرير المشتريات")}
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
                                    onChange={v => setBranchId(v)}
                                    placeholder={t("كل الفروع")}
                                    hideSearch
                                    style={{ background: C.card, border: `1px solid ${C.border}` }}
                                    options={[
                                        { value: 'all', label: t('كل الفروع') },
                                        ...branches.map((b: any) => ({ value: b.id, label: b.name }))
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '16px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 600, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري استخراج تقرير المشتريات...')}</span>
                    </div>
                ) : !data || data.invoices.length === 0 ? (
                    <div className="no-print" style={{ textAlign: 'center', padding: '120px 20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <ShoppingCart size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد فواتير شراء حالياً')}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, maxWidth: '400px', marginInline: 'auto', lineHeight: 1.6, fontFamily: CAIRO }}>{t('برجاء اختيار فترة زمنية أخرى أو تعديل معايير البحث لعرض تفاصيل المشتريات.')}</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
                             {[
                                { label: t('إجمالي المشتريات'), value: data.totalPurchases, color: '#3b82f6', icon: <ShoppingCart size={18} /> },
                                { label: t('إجمالي الخصومات'), value: data.totalDiscount, color: '#fb923c', icon: <ArrowDownRight size={18} /> },
                                { label: t('المبالغ المسددة'), value: data.totalPaid, color: '#10b981', icon: <ArrowUpRight size={18} /> },
                                { label: t('الأرصدة المستحقة'), value: data.totalRemaining, color: '#ef4444', icon: <DollarSign size={18} />, isWarning: true },
                             ].map((s, i) => (
                                <div key={i} style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ padding: '8px', background: `${s.color}15`, color: s.color, borderRadius: '10px' }}>{s.icon}</div>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                            {fMoneyJSX(s.value, '', { fontSize: '16px', fontWeight: 900, color: s.isWarning && s.value > 0 ? '#ef4444' : C.textPrimary })}
                                        </div>
                                    </div>
                                </div>
                             ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', padding: '0 4px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <div style={{ width: '4px', height: '16px', background: C.primary, borderRadius: '2px' }} />
                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t("كشف المشتريات والتكاليف التفصيلي")}</h3>
                                </div>
                                <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={13} />
                                        <span>{t('تاريخ التقرير:')} <span style={{ color: C.textSecondary, fontFamily: INTER, fontWeight: 700 }}>{new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</span></span>
                                     </div>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Activity size={13} />
                                        <span>{t('النطاق الزمني:')} <span style={{ color: C.textSecondary, fontFamily: INTER, fontWeight: 700 }}>{from || '...'} {t('إلى')} {to || t('اليوم')}</span></span>
                                     </div>
                                </div>
                            </div>
                            <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO, background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                                {t('عدد السجلات:')} <span style={{ color: C.primary, fontWeight: 800, fontFamily: INTER }}>{data.invoices.length}</span>
                            </div>
                        </div>

                        <div className="no-print" style={{ position: 'relative', width: '100%', marginBottom: '20px' }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                placeholder={t("ابحث برقم الفاتورة أو اسم المورد...")}
                                value={q} onChange={e => setQ(e.target.value)}
                                style={{
                                    ...IS, paddingInlineStart: '45px', height: '42px', fontSize: '13.5px',
                                    background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`,
                                    fontWeight: 500, fontFamily: CAIRO
                                }}
                            />
                        </div>

                        <div style={TABLE_STYLE.container}>
                            <table style={TABLE_STYLE.table}>
                                <thead style={TABLE_STYLE.thead}>
                                    <tr>
                                        {[t('رقم الفاتورة'), t('التاريخ'), t('اسم المورد'), t('إجمالي القيمة'), t('الخصم'), t('المسدد'), t('المتبقي')].map((h, i) => (
                                            <th key={i} style={{
                                                ...TABLE_STYLE.th(i === 0),
                                                textAlign: i >= 3 ? 'center' : (isRtl ? 'right' : 'left'),
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.invoices.filter(inv => {
                                        const code = `PUR-${String(inv.invoiceNumber).padStart(5, '0')}`;
                                        return code.includes(q.toUpperCase()) ||
                                            String(inv.invoiceNumber).includes(q) ||
                                            (inv.supplier?.name || 'مورد نقدي').toLowerCase().includes(q.toLowerCase());
                                    }).map((inv, idx) => (
                                        <tr key={inv.id} style={TABLE_STYLE.row(idx === data.invoices.length - 1)}>
                                            <td style={TABLE_STYLE.td(true)}>
                                                <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 900, color: '#60a5fa', fontFamily: INTER }}>
                                                    PUR-{String(inv.invoiceNumber).padStart(5, '0')}
                                                </span>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontSize: '12px', color: C.textMuted, fontFamily: INTER }}>{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', color: C.textPrimary, fontWeight: 800, fontFamily: CAIRO, textAlign: 'start' }}>{inv.supplier?.name || t('مورد نقدي')}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>{fMoneyJSX(inv.total, '', { fontWeight: 800 })}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>{inv.discount > 0 ? fMoneyJSX(inv.discount, '', { color: '#fb923c' }) : '—'}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>{fMoneyJSX(inv.paidAmount, '', { color: '#10b981', fontWeight: 800 })}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>{fMoneyJSX(inv.remaining, '', { fontWeight: 1000, color: inv.remaining > 0 ? '#ef4444' : '#10b981' })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot style={{ background: 'rgba(255,255,255,0.03)', borderTop: `1px solid ${C.border}` }}>
                                    <tr>
                                        <td colSpan={3} style={{ padding: '18px 24px', fontSize: '13.5px', fontWeight: 900, color: C.textSecondary, fontFamily: CAIRO, textAlign: 'start' }}>{t('إجماليات المشتريات للفترة')}</td>
                                        <td style={{ padding: '18px', textAlign: 'center' }}>{fMoneyJSX(data.totalPurchases, '', { fontWeight: 900, fontSize: '15px' })}</td>
                                        <td style={{ padding: '18px', textAlign: 'center' }}>{fMoneyJSX(data.totalDiscount, '', { color: '#fb923c', fontWeight: 900, fontSize: '15px' })}</td>
                                        <td style={{ padding: '18px', textAlign: 'center' }}>{fMoneyJSX(data.totalPaid, '', { color: '#10b981', fontWeight: 900, fontSize: '15px' })}</td>
                                        <td style={{ padding: '18px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>{fMoneyJSX(data.totalRemaining, '', { fontWeight: 1000, fontSize: '16px', color: data.totalRemaining > 0 ? '#fb7185' : '#10b981' })}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
            </div>
            <style jsx global>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </DashboardLayout>
    );
}
