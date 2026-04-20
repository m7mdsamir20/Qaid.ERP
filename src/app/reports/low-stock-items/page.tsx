'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { Package, AlertTriangle, Search, Activity, Loader2, Box, Calendar } from 'lucide-react';
import { C, CAIRO, PAGE_BASE, IS, INTER, TABLE_STYLE } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/hooks/useCurrency';

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
    const { fMoneyJSX } = useCurrency();

    const [data, setData] = useState<LowStockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');

    useEffect(() => {
        fetch('/api/reports/low-stock-items')
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
    const totalValue = filtered.reduce((s, i) => s + i.value, 0);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("أصناف تحت الحد الأدنى")}
                    subtitle={t("قائمة المنتجات التي أوشكت على النفاذ أو وصلت لمستوى إعادة الطلب.")}
                    backTab="inventory"
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', marginBottom: '24px', alignItems: 'start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                                <input
                                    placeholder={t("ابحث بالاسم، الكود، أو التصنيف...")}
                                    value={q} onChange={e => setQ(e.target.value)}
                                    style={{ 
                                        ...IS, width: '100%', height: '42px', padding: isRtl ? '0 45px 0 15px' : '0 15px 0 45px', 
                                        borderRadius: '12px', border: `1px solid ${C.border}`, 
                                        background: C.card, color: C.textPrimary, fontSize: '13.5px', 
                                        outline: 'none', fontFamily: CAIRO, fontWeight: 500 
                                    }}
                                />
                            </div>
                            <div style={{ fontSize: '13px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO, whiteSpace: 'nowrap' }}>
                                {t('عدد النتائج:')} <span style={{ color: '#ef4444', fontWeight: 900, fontFamily: INTER }}>{filtered.length}</span> {t('صنف')}
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px' }}>
                                <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                                <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري فحص النواقص...')}</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div style={{ padding: '100px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                                <Box size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد نواقص')}</h3>
                                <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, fontFamily: CAIRO }}>{t('تبدو جميع أرصدة المخزون ضمن الحدود الآمنة حالياً.')}</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', padding: '0 4px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <div style={{ width: '4px', height: '16px', background: '#f59e0b', borderRadius: '2px' }} />
                                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t("تقرير الأصناف التي وصلت للحد الأدنى")}</h3>
                                        </div>
                                        <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>
                                             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={13} />
                                                <span>{t('تاريخ الفحص:')} <span style={{ color: C.textSecondary, fontFamily: INTER, fontWeight: 700 }}>{new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</span></span>
                                             </div>
                                             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <AlertTriangle size={13} style={{ color: '#f59e0b' }} />
                                                <span>{t('الحالة:')} <span style={{ color: '#f59e0b', fontWeight: 700 }}>{t('يتطلب توريد')}</span></span>
                                             </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={TABLE_STYLE.container}>
                                    <table style={TABLE_STYLE.table}>
                                        <thead style={TABLE_STYLE.thead}>
                                            <tr>
                                                {[t('الصنف'), t('التصنيف'), t('الرصيد الحالي'), t('الحد الأدنى'), t('قيمة النقص')].map((h, i) => (
                                                    <th key={i} style={{ 
                                                        ...TABLE_STYLE.th(i === 0),
                                                        textAlign: i === 4 ? (isRtl ? 'left' : 'right') : (i >= 2 ? 'center' : (isRtl ? 'right' : 'left')) as any, 
                                                    }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.map((item, idx) => (
                                                <tr key={item.id} style={TABLE_STYLE.row(idx === filtered.length - 1)}>
                                                    <td style={TABLE_STYLE.td(true)}>
                                                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{item.name}</div>
                                                        <div style={{ fontSize: '11px', color: C.textSecondary, fontFamily: INTER, fontWeight: 700 }}>{item.code}</div>
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(false), color: C.textMuted, fontFamily: CAIRO }}>{item.category}</td>
                                                    <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                        <span style={{ 
                                                            background: item.totalStock <= 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)', 
                                                            color: item.totalStock <= 0 ? '#ef4444' : '#f59e0b', 
                                                            padding: '4px 12px', borderRadius: '10px', fontWeight: 800, fontSize: '12px', fontFamily: INTER
                                                        }}>
                                                            {item.totalStock.toLocaleString('en-US')}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', fontSize: '13px', color: C.textSecondary, fontWeight: 800, fontFamily: INTER }}>
                                                        {item.minLimit.toLocaleString('en-US')}
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(false), textAlign: isRtl ? 'left' : 'right' }}>
                                                        {fMoneyJSX(item.value, '', { color: '#10b981', fontWeight: 800 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: 'rgba(16,185,129,0.05)', borderTop: `1px solid ${C.border}` }}>
                                                <td colSpan={4} style={{ padding: '16px 24px', textAlign: 'start', fontWeight: 900, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجماليات النقص للفترة المختارة')}</td>
                                                <td style={{ padding: '16px 20px', textAlign: isRtl ? 'left' : 'right' }}>
                                                    {fMoneyJSX(totalValue, '', { color: '#10b981', fontWeight: 900, fontSize: '15.5px' })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: 'linear-gradient(145deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 25px -10px rgba(239,68,68,0.2)' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '16px' }}>
                                <AlertTriangle size={24} />
                            </div>
                            <div style={{ fontSize: '11.5px', color: C.textMuted, fontWeight: 700, marginBottom: '6px', fontFamily: CAIRO }}>{t('إجمالي عدد النواقص')}</div>
                            <div style={{ fontSize: '32px', fontWeight: 1000, color: '#ef4444', fontFamily: INTER }}>
                                {filtered.length.toLocaleString('en-US')}
                                <span style={{ fontSize: '14px', marginInlineEnd: '6px', fontWeight: 700, fontFamily: CAIRO }}>{t('صنف')}</span>
                            </div>
                        </div>

                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: C.textPrimary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO }}>
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
            <style jsx global>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </DashboardLayout>
    );
}
