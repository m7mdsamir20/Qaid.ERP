'use client';
import React, { useEffect, useState } from 'react';

import { C, CAIRO, PAGE_BASE, IS, INTER } from '@/constants/theme';
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
    const { data: session } = useSession();
    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';
    const currency = (session?.user as any)?.currency || 'EGP';

    const [data, setData] = useState<TopSellingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');

    useEffect(() => {
        fetch('/api/reports/top-selling-items')
            .then(res => res.json())
            .then(d => { if (!d.error) setData(d); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const filtered = data.filter(i => 
        (i.name || '').toLowerCase().includes(q.toLowerCase()) || 
        (i.code || '').toLowerCase().includes(q.toLowerCase()) || 
        (i.category || '').toLowerCase().includes(q.toLowerCase())
    );
    const totalSales = filtered.reduce((s, i) => s + i.totalSales, 0);

    return (
        <DashboardLayout>
            <div dir="rtl" style={PAGE_BASE}>
                <ReportHeader
                    title={isServices ? "تحليل الخدمات الأكثر طلباً" : "تحليل الأصناف الأكثر مبيعاً"}
                    subtitle={isServices ? "نظرة شاملة على الخدمات الأعلى حركة وطلباً في نشاطك." : "نظرة شاملة على المنتجات الأعلى حركة وكفاءة ربحية في محفظة مبيعاتك."}
                    backTab="sales-purchases"
                    onExportPdf={() => window.print()}
                />

                {/* Header للطباعة فقط */}
                <div className="print-only">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '2px solid #000' }}>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 900, color: '#000', fontFamily: CAIRO }}>{(session?.user as any)?.companyName || ''}</h2>
                            {(session?.user as any)?.taxNumber && <div style={{ fontSize: '11px', color: '#333', margin: '2px 0', fontFamily: CAIRO }}>الرقم الضريبي: {(session?.user as any)?.taxNumber}</div>}
                            {(session?.user as any)?.commercialRegister && <div style={{ fontSize: '11px', color: '#333', margin: '2px 0', fontFamily: CAIRO }}>السجل التجاري: {(session?.user as any)?.commercialRegister}</div>}
                            {(session?.user as any)?.phone && <div style={{ fontSize: '11px', color: '#333', margin: '2px 0', fontFamily: CAIRO }}>الهاتف: {(session?.user as any)?.phone}</div>}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 900, color: '#000', fontFamily: CAIRO }}>{isServices ? "تحليل الخدمات الأكثر طلباً" : "تحليل الأصناف الأكثر مبيعاً"}</h3>
                        </div>
                        <div style={{ maxWidth: '150px', textAlign: 'left' }}>
                            {(session?.user as any)?.companyLogo && <img src={(session?.user as any)?.companyLogo} alt="logo" style={{ maxWidth: '150px', maxHeight: '70px', objectFit: 'contain' }} />}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '24px', marginBottom: '24px', alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                                <input
                                    placeholder="ابحث بالاسم، الكود، أو التصنيف..."
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
                                تم العثور على: <span style={{ color: C.primary, fontWeight: 900, fontFamily: INTER }}>{filtered.length}</span> {isServices ? "خدمة" : "صنف"}
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                                <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                                <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{isServices ? "جاري تحليل حركة الخدمات..." : "جاري تحليل حركة الأصناف..."}</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div style={{ padding: '100px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                                <Package size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{isServices ? "لا توجد خدمات منفذة" : "لا توجد أصناف مباعة"}</h3>
                                <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, fontFamily: CAIRO }}>{isServices ? "لم يتم تسجيل عمليات طلب لهذه الخدمات في الفترة الحالية." : "لم يتم تسجيل عمليات بيع لهذه الأصناف في الفترة الحالية."}</p>
                            </div>
                        ) : (
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                            <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary, textAlign: 'right', fontWeight: 800, fontFamily: CAIRO }}>#</th>
                                            <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary, textAlign: 'right', fontWeight: 800, fontFamily: CAIRO }}>{isServices ? "بيانات الخدمة" : "بيانات الصنف"}</th>
                                            <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary, textAlign: 'center', fontWeight: 800, fontFamily: CAIRO }}>الكمية</th>
                                            <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary, textAlign: 'left', fontWeight: 800, fontFamily: CAIRO }}>القيمة</th>
                                            <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary, textAlign: 'left', fontWeight: 800, fontFamily: CAIRO }}>الربح التقديري</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((item, idx) => (
                                            <tr key={item.id} 
                                                style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                <td style={{ padding: '14px 20px', fontSize: '12px', color: C.textMuted, fontWeight: 900, fontFamily: INTER }}>{idx + 1}</td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{item.name}</div>
                                                    <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '3px', fontFamily: INTER }}>{item.code} — {item.category}</div>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{item.totalQuantity.toLocaleString('en-US')}</span>
                                                    <span style={{ fontSize: '10px', color: C.textMuted, marginRight: '4px', fontFamily: CAIRO }}>{item.unit}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 900, color: C.primary, fontSize: '13.5px', fontFamily: INTER }}>
                                                    {item.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'left' }}>
                                                    <span style={{ 
                                                        color: '#10b981', background: 'rgba(16,185,129,0.08)', 
                                                        padding: '4px 10px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.2)',
                                                        fontWeight: 1000, fontSize: '12px', fontFamily: INTER 
                                                    }}>
                                                        {item.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                        <div style={{ background: 'linear-gradient(145deg, rgba(59,130,246,0.1), rgba(37,99,235,0.05))', border: `1px solid rgba(59,130,246,0.2)`, borderRadius: '18px', padding: '24px', boxShadow: '0 10px 25px -10px rgba(0,0,0,0.3)' }}>
                            <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', marginBottom: '16px' }}>
                                <TrendingUp size={24} />
                            </div>
                            <div style={{ fontSize: '11.5px', color: C.textMuted, fontWeight: 700, marginBottom: '6px', fontFamily: CAIRO }}>{isServices ? "إجمالي قيمة الخدمات" : "إجمالي القيمة البيعية"}</div>
                            <div style={{ fontSize: '20px', fontWeight: 1000, color: '#60a5fa', fontFamily: INTER, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                {totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                            </div>
                        </div>

                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '18px', padding: '20px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#fb923c', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                <Activity size={16} /> {isServices ? "أعلى 5 خدمات" : "أعلى 5 أصناف"}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {filtered.slice(0, 5).map((item, idx) => (
                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: idx < 3 ? '#000' : C.textMuted, fontFamily: INTER }}>{idx + 1}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '12px', color: C.textPrimary, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: CAIRO }}>{item.name}</div>
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
