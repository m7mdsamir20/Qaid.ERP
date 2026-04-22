'use client';
import { formatNumber } from '@/lib/currency';
import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';

import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { Package, TrendingUp, Search, Activity, ShoppingCart, Loader2, ArrowRight } from 'lucide-react';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

interface TopSellingItem {
    id: string;
    code: string;
    name: string;
    totalQuantity: number;
    totalSales: number;
    totalProfit: number;
    category: string;
    unit: string;
}

export default function TopSellingReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const businessType = session?.user?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';
    const currency = session?.user?.currency || 'EGP';

    const [data, setData] = useState<TopSellingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [q, setQ] = useState('');

    useEffect(() => {
        fetch('/api/reports/top-selling-items')
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(d => { if (d.error) throw new Error(d.error); setData(d); })
            .catch(() => setError(t('فشل تحميل بيانات الأصناف الأكثر مبيعاً')))
            .finally(() => setLoading(false));
    }, []);

    const filtered = data.filter(i => 
        (i.name || '').toLowerCase().includes(q.toLowerCase()) || 
        (i.code || '').toLowerCase().includes(q.toLowerCase()) || 
        (i.category || '').toLowerCase().includes(q.toLowerCase())
    );
    const totalSales = filtered.reduce((s, i) => s + i.totalSales, 0);
    const sym = getCurrencyName(currency);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={isServices ? t("تحليل الخدمات الأكثر طلباً") : t("تحليل الأصناف الأكثر مبيعاً")}
                    subtitle={isServices ? t("نظرة شاملة على الخدمات الأعلى حركة وطلباً في نشاطك.") : t("نظرة شاملة على المنتجات الأعلى حركة وكفاءة ربحية في محفظة مبيعاتك.")}
                    backTab="sales-purchases"
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '24px', marginBottom: '24px', alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                                <input
                                    placeholder={t("ابحث بالاسم، الكود، أو التصنيف...")}
                                    value={q} onChange={e => setQ(e.target.value)}
                                    style={{ 
                                        ...IS, width: '100%', height: '42px', padding: '0 45px 0 15px', 
                                        borderRadius: '12px', border: `1px solid ${C.border}`, 
                                        background: C.card, color: C.textPrimary, fontSize: '13.5px', 
                                        outline: 'none', fontFamily: CAIRO, fontWeight: 500
                                    }}
                                />
                            </div>
                            <div style={{ fontSize: '13px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO, whiteSpace: 'nowrap' }}>
                                {t('تم العثور على:')} <span style={{ color: C.primary, fontWeight: 600, fontFamily: OUTFIT }}>{filtered.length}</span> {isServices ? t("خدمة") : t("صنف")}
                            </div>
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
                                <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{isServices ? t("جاري تحليل حركة الخدمات...") : t("جاري تحليل حركة الأصناف...")}</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div style={{ padding: '100px', textAlign: 'start', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                                <Package size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{isServices ? t("لا توجد خدمات منفذة") : t("لا توجد أصناف مباعة")}</h3>
                                <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, fontFamily: CAIRO }}>{isServices ? t("لم يتم تسجيل عمليات طلب لهذه الخدمات في الفترة الحالية.") : t("لم يتم تسجيل عمليات بيع لهذه الأصناف في الفترة الحالية.")}</p>
                            </div>
                        ) : (
                            <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                            <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary,  fontWeight: 600, fontFamily: CAIRO }}>#</th>
                                            <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary,  fontWeight: 600, fontFamily: CAIRO }}>{isServices ? t("بيانات الخدمة") : t("بيانات الصنف")}</th>
                                            <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary,  fontWeight: 600, fontFamily: CAIRO }}>{t('الكمية')}</th>
                                            <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary,  fontWeight: 600, fontFamily: CAIRO }}>{t('القيمة')}</th>
                                            <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary,  fontWeight: 600, fontFamily: CAIRO }}>{t('الربح التقديري')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((item, idx) => (
                                            <tr key={item.id} 
                                                style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                <td style={{ padding: '14px 20px', fontSize: '13px', color: C.textMuted, fontWeight: 600, fontFamily: OUTFIT }}>{idx + 1}</td>
                                                <td style={{ padding: '14px 20px', }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{item.name}</div>
                                                    <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '3px', fontFamily: OUTFIT }}>{item.code} — {item.category}</div>
                                                </td>
                                                <td style={{ padding: '14px 20px', }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{formatNumber(item.totalQuantity)}</span>
                                                    <span style={{ fontSize: '11px', color: C.textMuted, marginInlineEnd: '4px', fontFamily: CAIRO }}>{lang === 'ar' ? item.unit : t(item.unit)}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px',  fontWeight: 600, color: C.primary, fontSize: '13px', fontFamily: OUTFIT }}>
                                                    {formatNumber(item.totalSales)} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px', }}>
                                                    <span style={{
                                                        color: '#10b981', background: 'rgba(16,185,129,0.08)',
                                                        padding: '4px 10px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)',
                                                        fontWeight: 600, fontSize: '13px', fontFamily: OUTFIT
                                                    }}>
                                                        {formatNumber(item.totalProfit)} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span>
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: 'linear-gradient(145deg, rgba(37, 106, 244,0.1), rgba(37, 106, 244,0.05))', border: `1px solid rgba(37, 106, 244,0.2)`, borderRadius: '18px', padding: '24px', boxShadow: '0 10px 25px -10px rgba(0,0,0,0.3)' }}>
                            <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: 'rgba(37, 106, 244,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', marginBottom: '16px' }}>
                                <TrendingUp size={24} />
                            </div>
                            <div style={{ fontSize: '11.5px', color: C.textMuted, fontWeight: 700, marginBottom: '6px', fontFamily: CAIRO }}>{isServices ? t("إجمالي قيمة الخدمات") : t("إجمالي القيمة البيعية")}</div>
                            <div style={{ fontSize: '20px', fontWeight: 600, color: '#60a5fa', fontFamily: OUTFIT, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                {formatNumber(totalSales)}
                                <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                            </div>
                        </div>

                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '18px', padding: '20px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fb923c', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                <Activity size={16} /> {isServices ? t("أعلى 5 خدمات") : t("أعلى 5 أصناف")}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {filtered.slice(0, 5).map((item, idx) => (
                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: idx < 3 ? '#000' : C.textMuted, fontFamily: OUTFIT }}>{idx + 1}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '12px', color: C.textPrimary, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: CAIRO }}>{item.name}</div>
                                            <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginTop: '6px' }}>
                                                <div style={{ width: `${(item.totalSales / (filtered[0]?.totalSales || 1)) * 100}%`, height: '100%', background: C.primary, borderRadius: '10px' }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
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
