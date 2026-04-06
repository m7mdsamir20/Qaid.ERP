'use client';

import DashboardLayout from '@/components/DashboardLayout';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};
import { C, CAIRO, PAGE_BASE, IS, INTER } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { Package, Search, Activity, Box, DollarSign, Loader2 } from 'lucide-react';
import { TABLE_STYLE, SEARCH_STYLE, focusIn, focusOut } from '@/constants/theme';

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
    const { data: session } = useSession();
    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';
    const currency = (session?.user as any)?.currency || 'EGP';

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
            <div dir="rtl" style={PAGE_BASE}>
                <ReportHeader
                    title={isServices ? "قائمة أسعار الخدمات" : "تقرير أرصدة المخزون"}
                    subtitle={isServices ? "عرض قائمة بجميع الخدمات المسجلة وأسعار البيع المقترحة." : "عرض أرصدة جميع الأصناف في كل مخزن مع القيمة الإجمالية والتكلفة."}
                    backTab="inventory"
                    onExportPdf={() => window.print()}
                    printTitle={isServices ? "قائمة أسعار الخدمات" : "جرد المخازن (Inventory Statement)"}
                />

                {data && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
                        {[
                            { label: isServices ? 'عدد الخدمات' : 'عدد الأصناف', value: data.totalItems.toLocaleString('en-US'), color: '#3b82f6', icon: <Package size={20} /> },
                            ...(!isServices ? [
                                { label: 'إجمالي الكميات', value: data.totalQuantity.toLocaleString('en-US'), color: '#10b981', icon: <Box size={20} /> },
                                { label: 'قيمة المخزون (تكلفة)', value: data.totalValue.toLocaleString('en-US'), color: '#f59e0b', icon: <DollarSign size={20} /> },
                            ] : [])
                        ].map((s, i) => (
                            <div key={i} style={{
                                background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                        <span style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{s.value}</span>
                                        {i === 2 && <span style={{ fontSize: '10px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>}
                                    </div>
                                </div>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                    {s.icon}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div style={SEARCH_STYLE.container}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={isServices ? "ابحث باسم الخدمة أو الكود..." : "ابحث باسم الصنف أو الكود أو المخزن..."}
                            value={search} onChange={e => setSearch(e.target.value)}
                            style={SEARCH_STYLE.input}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{isServices ? "جاري تحميل قائمة الخدمات..." : "جاري تحميل بيانات المخزون..."}</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '100px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <Package size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>لا توجد بيانات مخزون</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, fontFamily: CAIRO }}>لم يتم العثور على نتائج تطابق معايير البحث الحالية.</p>
                    </div>
                ) : (
                    <div style={TABLE_STYLE.container}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        {isServices ? (
                                            ['كود الخدمة', 'اسم الخدمة', 'الوصف/الفئة', 'سعر الخدمة'].map((h, i) => (
                                                <th key={i} style={TABLE_STYLE.th(i === 0 || i === 1)}>{h}</th>
                                            ))
                                        ) : (
                                            ['كود الصنف', 'اسم الصنف', 'الوحدة', 'المخزن', 'الكمية', 'التكلفة', 'سعر البيع', 'القيمة الإجمالية'].map((h, i) => (
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
                                            <td style={{ ...TABLE_STYLE.td(true), textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700, color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO }}>{st.item?.name || (isServices ? 'خدمة غير معرفة' : 'صنف غير معرف')}</div>
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}><span style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{st.item?.unit || '-'}</span></td>
                                            {!isServices && (
                                                <>
                                                    <td style={TABLE_STYLE.td(false)}><span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{st.warehouse?.name || 'مخزن غير معرف'}</span></td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        <span style={{ 
                                                            fontSize: '13px', fontWeight: 900, color: st.quantity <= 0 ? '#ef4444' : st.quantity <= 10 ? '#f59e0b' : '#10b981', 
                                                            fontFamily: INTER, background: st.quantity <= 0 ? 'rgba(239, 68, 68, 0.1)' : st.quantity <= 10 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                            padding: '4px 10px', borderRadius: '10px'
                                                        }}>
                                                            {st.quantity.toLocaleString('en-US')}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontFamily: INTER, fontWeight: 700 }}>{st.item?.costPrice?.toLocaleString('en-US') || '0.00'}</td>
                                                </>
                                            )}
                                            <td style={{ ...TABLE_STYLE.td(false), fontFamily: INTER, fontWeight: 700, textAlign: isServices ? 'center' : 'inherit' }}>{st.item?.sellPrice?.toLocaleString('en-US') || '0.00'}</td>
                                            {!isServices && (
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                        <span style={{ fontSize: '13.5px', fontWeight: 900, color: C.primary, fontFamily: INTER }}>{(st.quantity * (st.item?.costPrice || 0)).toLocaleString('en-US')}</span>
                                                        <span style={{ fontSize: '10px', color: C.textMuted, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
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
