'use client';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';
import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';

import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { Package, ArrowRightLeft, Search, Activity, ShoppingCart, Loader2, ArrowRight, TrendingUp, TrendingDown, DollarSign, FileText } from 'lucide-react';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const fmt = (n: number) => formatNumber(n);

interface ReturnInvoice {
    id: string;
    invoiceNumber: number;
    type: 'sale_return' | 'purchase_return';
    date: string;
    party: string;
    total: number;
    itemCount: number;
}

interface BranchOption {
    id: string;
    name: string;
}

export default function ReturnsReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [data, setData] = useState<ReturnInvoice[]>([]);
    const [stats, setStats] = useState({ totalSaleReturns: 0, totalPurchaseReturns: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [q, setQ] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        const params = new URLSearchParams();
        if (branchId && branchId !== 'all') params.set('branchId', branchId);
        fetch(`/api/reports/returns-report?${params}`)
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(d => {
                if (d.error) throw new Error(d.error);
                setData(d.returns);
                setStats({ totalSaleReturns: d.totalSaleReturns, totalPurchaseReturns: d.totalPurchaseReturns });
            })
            .catch(() => setError(t('فشل تحميل بيانات المرتجعات')))
            .finally(() => setLoading(false));
    }, [branchId]);

    const filtered = data.filter(r => (r.party || '').toLowerCase().includes(q.toLowerCase()) || String(r.invoiceNumber).includes(q));

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير مرتجعات البيع والشراء")}
                    subtitle={t("متابعة دقيقة لكافة عمليات المرتجع الصادرة والواردة وتأثيرها المالي على المخزون.")}
                    backTab="sales-purchases"
                    
                />


                <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: t('إجمالي مرتجع البيع'), value: fmt(stats.totalSaleReturns), color: '#ef4444', icon: <TrendingDown size={20} /> },
                        { label: t('إجمالي مرتجع الشراء'), value: fmt(stats.totalPurchaseReturns), color: '#256af4', icon: <TrendingUp size={20} /> },
                        { label: t('إجمالي عدد الفواتير'), value: data.length, color: '#a78bfa', icon: <FileText size={20} /> },
                        { label: t('متوسط قيمة العملية'), value: fmt(data.length ? (stats.totalSaleReturns + stats.totalPurchaseReturns) / data.length : 0), color: '#10b981', icon: <Activity size={20} /> },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div style={{ textAlign: 'start'}}>
                                <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                    {i !== 2 && <span style={{ fontSize: '10px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>}
                                </div>
                            </div>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                {s.icon}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                placeholder={t("ابحث برقم الفاتورة أو الطرف الآخر...")}
                                value={q} onChange={e => setQ(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 45px 0 15px',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    outline: 'none', fontFamily: CAIRO, fontWeight: 500
                                }}
                            />
                        </div>
                        {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                            <CustomSelect
                                value={branchId}
                                onChange={v => setBranchId(v)}
                                placeholder={t("كل الفروع")}
                                options={[
                                    { value: 'all', label: t('كل الفروع') },
                                    ...branches.map((b) => ({ value: b.id, label: b.name }))
                                ]}
                            />
                        )}
                    </div>

                    {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', marginBottom: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                            <span style={{ fontSize: '13px' }}>⚠️</span>{error}
                            <button onClick={() => setError('')} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>×</button>
                        </div>
                    )}

                    {loading ? (
                        <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                            <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                            <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري استرجاع بيانات المرتجعات...')}</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '100px', textAlign: 'start', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                            <ArrowRightLeft size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد مرتجعات مسجلة')}</h3>
                            <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, fontFamily: CAIRO }}>{t('برجاء تعديل معايير البحث أو تسجيل عمليات جديدة في النظام.')}</p>
                        </div>
                    ) : (
                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        {[t('رقم الفاتورة'), t('التاريخ'), t('نوع المرتجع'), t('الطرف الآخر'), t('الأصناف'), t('القيمة الإجمالية')].map((h, i) => (
                                            <th key={i} style={{ 
                                                padding: '16px 20px', fontSize: '12px', color: C.textSecondary, 
                                                 
                                                fontWeight: 600, fontFamily: CAIRO 
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((r, idx) => (
                                        <tr key={r.id} 
                                            style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                            <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>
                                                {r.type === 'sale_return' ? 'SLR-' : 'PUR-'}{String(r.invoiceNumber).padStart(4, '0')}
                                            </td>
                                            <td style={{ padding: '14px 20px', fontSize: '13px', color: C.textMuted, fontFamily: OUTFIT }}>{new Date(r.date).toLocaleDateString('en-GB')}</td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO,
                                                    background: r.type === 'sale_return' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 106, 244, 0.1)',
                                                    color: r.type === 'sale_return' ? '#ef4444' : '#256af4',
                                                    border: `1px solid ${r.type === 'sale_return' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(37, 106, 244, 0.2)'}`
                                                }}>
                                                    {r.type === 'sale_return' ? t('مرتجع مبيعات') : t('مرتجع مشتريات')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{r.party}</td>
                                            <td style={{ padding: '14px 20px',  fontSize: '13px', color: C.textMuted, fontFamily: CAIRO }}>{r.itemCount} {t('صنف')}</td>
                                            <td style={{ padding: '14px 20px',  fontWeight: 600, color: C.textPrimary, fontSize: '13px', fontFamily: OUTFIT }}>
                                                <Currency amount={r.total} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                .print-only { display: none; }
                @media print {
                    .print-only { display: block !important; }
                    .no-print { display: none !important; }
                    .stat-value { font-size: 11px !important; color: #000 !important; }
                    .stat-label { font-size: 9px !important; color: #666 !important; }
                    div { background: #fff !important; border-color: #e2e8f0 !important; }
                    div, span, h2, h3, p { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; border: 1px solid #e2e8f0 !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}

