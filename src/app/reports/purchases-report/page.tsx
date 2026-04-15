'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, SEARCH_STYLE, INTER, IS } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { ShoppingCart, Search, Calendar, Loader2, ArrowUpRight, ArrowDownRight, Activity, DollarSign } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const fmt = (n: number) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
    const currency = session?.user?.currency || 'EGP';

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
        }).catch(() => {});
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

    const exportToPDF = () => window.print();

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
                                    ...IS, width: '100%', height: '42px', padding: '0 12px', textAlign: 'start', direction: 'rtl',
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
                                    ...IS, width: '100%', height: '42px', padding: '0 12px', textAlign: 'start', direction: 'rtl',
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '16px' }}>
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: t('إجمالي المشتريات'), value: fmt(data.totalPurchases), color: '#3b82f6', icon: <ShoppingCart size={18} /> },
                                { label: t('إجمالي الخصومات'), value: fmt(data.totalDiscount), color: '#fb923c', icon: <ArrowDownRight size={18} /> },
                                { label: t('المبالغ المسددة'), value: fmt(data.totalPaid), color: '#10b981', icon: <ArrowUpRight size={18} /> },
                                { label: t('الأرصدة المستحقة'), value: fmt(data.totalRemaining), color: data.totalRemaining > 0 ? '#fb7185' : '#10b981', icon: <DollarSign size={18} /> },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s'
                                }}>
                                    <div style={{ textAlign: 'start' }}>
                                        <p className="stat-label" style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span className="stat-value" style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{s.value}</span>
                                            <span style={{ fontSize: '10.5px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                        </div>
                                    </div>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="no-print" style={{ position: 'relative', width: '100%', marginBottom: '20px' }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                placeholder={t("ابحث برقم الفاتورة أو اسم المورد...")}
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
                                        {[t('رقم الفاتورة'), t('التاريخ'), t('اسم المورد'), t('إجمالي القيمة'), t('الخصم'), t('المسدد'), t('المتبقي')].map((h, i) => (
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
                                        const code = `PUR-${String(inv.invoiceNumber).padStart(5, '0')}`;
                                        return code.includes(q.toUpperCase()) || 
                                               String(inv.invoiceNumber).includes(q) || 
                                               (inv.supplier?.name || 'مورد نقدي').toLowerCase().includes(q.toLowerCase());
                                    }).map((inv, idx) => (
                                        <tr key={inv.id}
                                            style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '3px 10px', fontSize: '11.5px', fontWeight: 900, color: '#60a5fa', fontFamily: INTER }}>
                                                    PUR-{String(inv.invoiceNumber).padStart(5, '0')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px', fontSize: '12px', color: C.textMuted, fontFamily: INTER }}>{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                            <td style={{ padding: '14px 20px', fontSize: '12.5px', color: C.textPrimary, fontWeight: 700, fontFamily: CAIRO }}>{inv.supplier?.name || t('مورد نقدي')}</td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>{fmt(inv.total)}</td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 800, color: inv.discount > 0 ? '#fb923c' : C.textMuted, fontFamily: INTER }}>{inv.discount > 0 ? fmt(inv.discount) : '—'}</td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 800, color: '#10b981', fontFamily: INTER }}>{fmt(inv.paidAmount)}</td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                <span style={{ 
                                                    fontSize: '11px', fontWeight: 1000, direction: 'ltr', fontFamily: INTER,
                                                    color: inv.remaining > 0 ? '#fb7185' : '#10b981',
                                                    background: inv.remaining > 0 ? 'rgba(251,113,133,0.1)' : 'rgba(16,185,129,0.1)',
                                                    padding: '4px 12px', borderRadius: '10px', border: `1px solid ${inv.remaining > 0 ? 'rgba(251,113,133,0.2)' : 'rgba(16,185,129,0.2)'}`
                                                }}>{fmt(inv.remaining)}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot style={{ background: 'rgba(255,255,255,0.03)', borderTop: `2px solid ${C.border}` }}>
                                    <tr>
                                        <td colSpan={3} style={{ padding: '18px 24px', fontSize: '13px', fontWeight: 900, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجماليات المشتريات للفترة')}</td>
                                        <td style={{ padding: '18px', textAlign: 'center', fontSize: '15px', fontWeight: 1000, color: C.textPrimary, fontFamily: INTER }}>{fmt(data.totalPurchases)}</td>
                                        <td style={{ padding: '18px', textAlign: 'center', fontSize: '15px', fontWeight: 1000, color: '#fb923c', fontFamily: INTER }}>{fmt(data.totalDiscount)}</td>
                                        <td style={{ padding: '18px', textAlign: 'center', fontSize: '15px', fontWeight: 1000, color: '#10b981', fontFamily: INTER }}>{fmt(data.totalPaid)}</td>
                                        <td style={{ padding: '18px', textAlign: 'center', fontSize: '16px', fontWeight: 1000, color: data.totalRemaining > 0 ? '#fb7185' : '#10b981', background: 'rgba(255,255,255,0.02)', fontFamily: INTER }}>{fmt(data.totalRemaining)}</td>
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

