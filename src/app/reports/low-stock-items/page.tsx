'use client';
import { formatNumber } from '@/lib/currency';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { Package, AlertTriangle, Search, Activity, ShoppingCart, Loader2, Box } from 'lucide-react';
import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

interface LowStockItem {
    id: string;
    code: string;
    name: string;
    totalStock: number;
    minLimit: number;
    unit: string;
    category: string;
    averageCost: number;
    value: number;
}

export default function LowStockReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [data, setData] = useState<LowStockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [q, setQ] = useState('');

    useEffect(() => {
        fetch('/api/reports/low-stock-items')
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(d => { if (d.error) throw new Error(d.error); setData(d); })
            .catch(() => setError(t('فشل تحميل بيانات الأصناف الناقصة')))
            .finally(() => setLoading(false));
    }, []);

    const filtered = data.filter(i =>
        (i.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (i.code || '').toLowerCase().includes(q.toLowerCase()) ||
        (i.category || '').toLowerCase().includes(q.toLowerCase())
    );
    const totalValue = filtered.reduce((s, i) => s + i.value, 0);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("أصناف تحت الحد الأدنى")}
                    subtitle={t("قائمة المنتجات التي أوشكت على النفاذ أو وصلت لمستوى إعادة الطلب.")}
                    backTab="inventory"

                />


                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', marginBottom: '24px', alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary,  zIndex: 10 }} />
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
                            <div style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, whiteSpace: 'nowrap' }}>
                                {t('عدد النتائج:')} <span style={{ color: '#ef4444', fontWeight: 600, fontFamily: OUTFIT }}>{filtered.length}</span> {t('صنف')}
                            </div>
                        </div>

                        {error && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', marginBottom: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                                <span style={{ fontSize: '13px' }}>⚠️</span>{error}
                                <button onClick={() => setError('')} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>×</button>
                            </div>
                        )}

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                                <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                                <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري فحص النواقص...')}</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div style={{ padding: '100px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                                <Box size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد نواقص')}</h3>
                                <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textSecondary, fontFamily: CAIRO }}>{t('تبدو جميع أرصدة المخزون ضمن الحدود الآمنة حالياً.')}</p>
                            </div>
                        ) : (
                            <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                            {[t('الصنف'), t('التصنيف'), t('الرصيد الحالي'), t('الحد الأدنى'), t('قيمة النقص')].map((h, i) => (
                                                <th key={i} style={{ textAlign: i === 2 ? 'center' : 'start', padding: '16px 20px', fontSize: '12px', color: C.textSecondary,
                                                    
                                                    fontWeight: 600, fontFamily: CAIRO
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((item, idx) => (
                                            <tr key={item.id}
                                                style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', textAlign: 'center', textAlign: 'center', }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{item.name}</div>
                                                    <div style={{ fontSize: '11px', color: C.textSecondary, fontFamily: OUTFIT, fontWeight: 700 }}>{item.code}</div>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', textAlign: 'center', textAlign: 'center', fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO, }}>{item.category}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', textAlign: 'center', textAlign: 'center', }}>
                                                    <span style={{
                                                        background: item.totalStock <= 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                        color: item.totalStock <= 0 ? '#ef4444' : '#f59e0b',
                                                        padding: '4px 12px', borderRadius: '10px', fontWeight: 600, fontSize: '12px', fontFamily: OUTFIT
                                                    }}>
                                                        {formatNumber(item.totalStock)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', textAlign: 'center', textAlign: 'center',  fontSize: '13px', color: C.textSecondary, fontWeight: 700, fontFamily: OUTFIT }}>
                                                    {formatNumber(item.minLimit)}
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', textAlign: 'center', textAlign: 'center',  fontWeight: 600, color: '#10b981', fontSize: '13px', fontFamily: OUTFIT }}>
                                                    {formatNumber(item.value)} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: 'rgba(16,185,129,0.05)', borderTop: `2px solid ${C.border}` }}>
                                            <td colSpan={4} style={{ padding: '18px 24px',  fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجماليات النقص للفترة المختارة')}</td>
                                            <td style={{ padding: '18px 20px',  fontWeight: 600, color: '#10b981', fontSize: '13px', fontFamily: OUTFIT }}>
                                                {formatNumber(totalValue)} <span style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: 'linear-gradient(145deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 25px -10px rgba(239,68,68,0.2)' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '16px' }}>
                                <AlertTriangle size={24} />
                            </div>
                            <div style={{ fontSize: '11.5px', color: C.textSecondary, fontWeight: 700, marginBottom: '6px', fontFamily: CAIRO }}>{t('إجمالي عدد النواقص')}</div>
                            <div style={{ fontSize: '32px', fontWeight: 600, color: '#ef4444', fontFamily: OUTFIT }}>
                                {formatNumber(filtered.length)}
                                <span style={{ fontSize: '13px', marginInlineEnd: '6px', fontWeight: 700, fontFamily: CAIRO }}>{t('صنف')}</span>
                            </div>
                        </div>

                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO }}>
                                <Activity size={18} color={C.primary} /> {t('دليل الإحصائيات')}
                            </div>
                            <ul style={{ margin: 0, paddingInlineEnd: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    t('الأصناف التي وصل رصيدها للحد الأدنى.'),
                                    t('الأصناف التي نفد رصيدها تماماً (0).'),
                                    t('تتأثر القائمة بعمليات الصرف والمبيعات.'),
                                    t('يجب إعادة طلب هذه الكميات لسير العمل.')
                                ].map((text, i) => (
                                    <li key={i} style={{ fontSize: '12.5px', color: C.textSecondary, fontFamily: CAIRO, lineHeight: 1.6 }}>{text}</li>
                                ))}
                            </ul>
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
                    div { background: #fff !important; border-color: #e2e8f0 !important; }
                    div, span, h2, h3, p { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; border: 1px solid #e2e8f0 !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}


