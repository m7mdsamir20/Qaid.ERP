'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, IS, INTER, TABLE_STYLE, SEARCH_STYLE, focusIn, focusOut } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/hooks/useCurrency';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { Package, Search, Activity, Box, DollarSign, Loader2, Calendar } from 'lucide-react';

interface StockItem {
    id: string;
    quantity: number;
    item: { code: string; name: string; unit: string; costPrice: number; sellPrice: number };
    warehouse: { name: string };
}

interface ReportData {
    stocks: StockItem[];
    totalItems: number;
    totalQuantity: number;
    totalValue: number;
}

export default function InventoryReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const { fMoneyJSX } = useCurrency();
    const businessType = session?.user?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';

    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch('/api/reports/inventory-report')
            .then(res => res.json())
            .then(d => { if (!d.error) setData(d); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const filtered = data?.stocks.filter(s =>
        (s.item?.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (s.item?.code?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (s.warehouse?.name?.toLowerCase() || '').includes(search.toLowerCase())
    ) || [];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={isServices ? t("قائمة أسعار الخدمات") : t("تقرير أرصدة المخزون")}
                    subtitle={isServices ? t("عرض قائمة بجميع الخدمات المسجلة وأسعار البيع المقترحة.") : t("عرض أرصدة جميع الأصناف في كل مخزن مع القيمة الإجمالية والتكلفة.")}
                    backTab="inventory"
                    printTitle={isServices ? t("قائمة أسعار الخدمات") : t("جرد المخازن (Inventory Statement)")}
                />

                {data && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
                        {[
                            { label: isServices ? t('عدد الخدمات') : t('عدد الأصناف'), value: data.totalItems.toLocaleString('en-US'), color: '#3b82f6', icon: <Package size={20} /> },
                            ...(!isServices ? [
                                { label: t('إجمالي الكميات'), value: data.totalQuantity.toLocaleString('en-US'), color: '#10b981', icon: <Box size={20} /> },
                                { label: t('قيمة المخزون (تكلفة)'), value: data.totalValue, color: '#f59e0b', icon: <DollarSign size={20} />, isMoney: true },
                            ] : [])
                        ].map((s, i) => (
                            <div key={i} style={{
                                background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <div style={{ textAlign: 'start' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                        {s.isMoney ? (
                                            fMoneyJSX(s.value as number, '', { fontSize: '16px', fontWeight: 900 })
                                        ) : (
                                            <span style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{s.value}</span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                    {s.icon}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="no-print" style={SEARCH_STYLE.container}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={isServices ? t("ابحث باسم الخدمة أو الكود...") : t("ابحث باسم الصنف أو الكود أو المخزن...")}
                            value={search} onChange={e => setSearch(e.target.value)}
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px', background: C.card, borderRadius: '16px', border: `1px solid ${C.border}` }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{isServices ? t("جاري تحميل قائمة الخدمات...") : t("جاري تحميل بيانات المخزون...")}</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '100px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <Package size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد بيانات مخزون')}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, fontFamily: CAIRO }}>{t('لم يتم العثور على نتائج تطابق معايير البحث الحالية.')}</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', padding: '0 4px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <div style={{ width: '4px', height: '16px', background: C.primary, borderRadius: '2px' }} />
                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{isServices ? t("قائمة الخدمات والأسعار") : t("كشف جرد المخازن التفصيلي")}</h3>
                                </div>
                                <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={13} />
                                        <span>{t('تاريخ الجرد:')} <span style={{ color: C.textSecondary, fontFamily: INTER, fontWeight: 700 }}>{new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</span></span>
                                     </div>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Activity size={13} />
                                        <span>{t('حالة البيانات:')} <span style={{ color: '#10b981', fontWeight: 700 }}>{t('محدث الآن')}</span></span>
                                     </div>
                                </div>
                            </div>
                            <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO, background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '8px', border: `1px solid ${C.border}` }}>
                                {t('عدد السجلات:')} <span style={{ color: C.primary, fontWeight: 800, fontFamily: INTER }}>{filtered.length}</span>
                            </div>
                        </div>

                        <div style={TABLE_STYLE.container}>
                            <table style={TABLE_STYLE.table}>
                                <thead style={TABLE_STYLE.thead}>
                                    <tr>
                                        {isServices ? (
                                            [t('كود الخدمة'), t('اسم الخدمة'), t('الوصف/الفئة'), t('سعر الخدمة')].map((h, i) => (
                                                <th key={i} style={TABLE_STYLE.th(i === 0 || i === 1)}>{h}</th>
                                            ))
                                        ) : (
                                            [t('كود الصنف'), t('اسم الصنف'), t('الوحدة'), t('المخزن'), t('الكمية'), t('التكلفة'), t('سعر البيع'), t('القيمة الإجمالية')].map((h, i) => (
                                                <th key={i} style={TABLE_STYLE.th(i === 0 || i === 1)}>{h}</th>
                                            ))
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((st, idx) => (
                                        <tr key={st.id} style={TABLE_STYLE.row(idx === filtered.length - 1)}>
                                            <td style={TABLE_STYLE.td(true)}>
                                                <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 900, color: '#60a5fa', fontFamily: INTER }}>{st.item?.code || '-'}</span>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(true), textAlign: 'start' }}>
                                                <div style={{ fontWeight: 800, color: C.textPrimary, fontSize: '13.5px', fontFamily: CAIRO }}>{st.item?.name || (isServices ? t('خدمة غير معرفة') : t('صنف غير معرف'))}</div>
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}><span style={{ fontSize: '11.5px', color: C.textMuted, fontFamily: CAIRO, fontWeight: 700 }}>{st.item?.unit || '-'}</span></td>
                                            {!isServices && (
                                                <>
                                                    <td style={TABLE_STYLE.td(false)}><span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO, fontWeight: 600 }}>{st.warehouse?.name || t('مخزن غير معرف')}</span></td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        <span style={{
                                                            fontSize: '13px', fontWeight: 900, color: st.quantity <= 0 ? '#ef4444' : st.quantity <= 10 ? '#f59e0b' : '#10b981',
                                                            fontFamily: INTER, background: st.quantity <= 0 ? 'rgba(239, 68, 68, 0.1)' : st.quantity <= 10 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                            padding: '4px 10px', borderRadius: '10px'
                                                        }}>
                                                            {st.quantity.toLocaleString('en-US')}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>{fMoneyJSX(st.item?.costPrice || 0)}</td>
                                                </>
                                            )}
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: isServices ? 'center' : 'inherit' }}>{fMoneyJSX(st.item?.sellPrice || 0)}</td>
                                            {!isServices && (
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'end' }}>
                                                    {fMoneyJSX(st.quantity * (st.item?.costPrice || 0), '', { fontWeight: 900, color: C.primary })}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
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
