'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, IS, INTER } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { Search, Loader2, Phone, FileText, AlertTriangle, Printer, Clock, ArrowRightLeft, Calendar, TrendingUp, TrendingDown, History, UserCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import CustomSelect from '@/components/CustomSelect';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

interface AgingInvoice {
    id: string;
    invoiceNumber: number;
    date: string;
    customer: string;
    phone: string;
    remaining: number;
    ageDays: number;
    category: string;
}

interface BranchOption {
    id: string;
    name: string;
}

interface AgingBucket {
    total: number;
    count: number;
}

interface AgingBuckets {
    '0-30': AgingBucket;
    '31-60': AgingBucket;
    '61-90': AgingBucket;
    '91+': AgingBucket;
}

export default function AgingReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [data, setData] = useState<AgingInvoice[]>([]);
    const [buckets, setBuckets] = useState<AgingBuckets | null>(null);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        const run = async () => {
            const params = new URLSearchParams();
            if (branchId && branchId !== 'all') params.set('branchId', branchId);
            try {
                const res = await fetch(`/api/reports/aging-report?${params}`);
                const d = await res.json();
                if (!d.error) {
                    setData(d.invoices);
                    setBuckets(d.buckets);
                }
            } catch {
            } finally {
                setLoading(false);
            }
        };
        void run();
    }, [branchId]);

    const filtered = data.filter(inv => inv.customer.toLowerCase().includes(q.toLowerCase()) || String(inv.invoiceNumber).includes(q));
    const sym = getCurrencyName(currency);

    const exportToExcel = () => {
        if (!data.length) return;
        const excelData = data.map(inv => ({
            'رقم الفاتورة': `SAL-${String(inv.invoiceNumber).padStart(4, '0')}`,
            'التاريخ': new Date(inv.date).toLocaleDateString('en-GB'),
            'العميل': inv.customer,
            'عمر الدين (يوم)': inv.ageDays,
            'المبلغ المتبقي': inv.remaining,
            'التصنيف': inv.ageDays > 90 ? 'متأخر جداً' : inv.ageDays > 60 ? 'حذر' : 'اعتيادي'
        }));
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'أعمار الديون');
        XLSX.writeFile(wb, `تقرير_أعمار_الديون_${new Date().toLocaleDateString('en-GB')}.xlsx`);
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير أعمار الديون")}
                    subtitle={t("تحليل المديونيات المتأخرة وتصنيفها حسب المدة الزمنية لتسهيل عمليات التحصيل.")}
                    backTab="partners"
                    
                    onExportExcel={exportToExcel}
                />


                {/* Summary Cards */}
                {buckets && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                        {[
                            { label: t('مديونية (0 - 30 يوم)'), value: buckets['0-30'].total, count: buckets['0-30'].count, color: '#3b82f6', icon: <Clock size={20} />, sign: t('ديون حديثة') },
                            { label: t('مديونية (31 - 60 يوم)'), value: buckets['31-60'].total, count: buckets['31-60'].count, color: '#eab308', icon: <History size={20} />, sign: t('تنبيه أول') },
                            { label: t('مديونية (61 - 90 يوم)'), value: buckets['61-90'].total, count: buckets['61-90'].count, color: '#f59e0b', icon: <TrendingDown size={20} />, sign: t('حذر شديد') },
                            { label: t('متأخرات (91+ يوم)'), value: buckets['91+'].total, count: buckets['91+'].count, color: '#ef4444', icon: <AlertTriangle size={20} />, sign: t('خطر التحصيل') },
                        ].map((s, i: number) => (
                            <div key={i} style={{
                                background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.2s', boxShadow: '0 2px 8px -4px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ textAlign: 'start' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                        <span style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{s.value.toLocaleString('en-US')}</span>
                                        <span style={{ fontSize: '10.5px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                    </div>
                                    <div style={{ fontSize: '9px', fontWeight: 800, color: s.color, fontFamily: CAIRO, marginTop: '2px' }}>{s.count} {t('فاتورة')} | {s.sign}</div>
                                </div>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                    {s.icon}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                        <input
                            placeholder={t("ابحث باسم العميل أو رقم الفاتورة للفلترة السريعة...")}
                            value={q} onChange={e => setQ(e.target.value)}
                            style={{
                                ...IS, width: '100%', height: '42px', padding: '0 45px 0 15px',
                                borderRadius: '12px', border: `1px solid ${C.border}`,
                                background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                outline: 'none', fontFamily: CAIRO, fontWeight: 500
                            }}
                        />
                    </div>
                    {branches.length > 1 && (
                        <CustomSelect
                            value={branchId}
                            onChange={(v) => { setLoading(true); setBranchId(v); }}
                            placeholder={t("كل الفروع")}
                            options={[
                                { value: 'all', label: t('كل الفروع') },
                                ...branches.map((b) => ({ value: b.id, label: b.name }))
                            ]}
                        />
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري تحليل أعمار الديون...')}</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '120px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <FileText size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد فواتير مطابقة')}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, fontFamily: CAIRO }}>{t('لم يتم العثور على مديونيات متأخرة حالياً في النظام.')}</p>
                    </div>
                ) : (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        {[t('رقم الفاتورة'), t('تاريخ الإصدار'), t('العميل المستحق'), t('عمر الدين'), t('المبلغ المتبقي'), t('حالة التصنيف')].map((h, i) => (
                                            <th key={i} style={{ 
                                                padding: '16px 20px', fontSize: '12px', color: C.textSecondary, 
                                                textAlign: 'center', 
                                                fontWeight: 800, fontFamily: CAIRO 
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((inv, idx) => (
                                        <tr key={inv.id} 
                                            style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                            <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '12px', color: C.primary, fontWeight: 800, fontFamily: INTER, background: 'rgba(37,99,235,0.08)', padding: '4px 10px', borderRadius: '6px' }}>
                                                    SAL-{String(inv.invoiceNumber).padStart(4, '0')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12.5px', color: C.textMuted, fontFamily: INTER }}>
                                                {new Date(inv.date).toLocaleDateString('en-GB')}
                                            </td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '13.5px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{inv.customer}</div>
                                                {inv.phone && <div style={{ fontSize: '11px', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontFamily: INTER, marginTop: '2px' }}><Phone size={10} /> {inv.phone}</div>}
                                            </td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '13.5px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{inv.ageDays}</span>
                                                    <span style={{ fontSize: '10px', fontFamily: CAIRO, fontWeight: 700, color: C.textMuted }}>{t('يوم متأخر')}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '4px' }}>
                                                    <span style={{ fontWeight: 1000, color: '#ef4444', fontSize: '14.5px', fontFamily: INTER }}>{inv.remaining.toLocaleString('en-US')}</span>
                                                    <span style={{ fontSize: '10.5px', color: C.textMuted, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '5px 12px', borderRadius: '8px', fontSize: '10.5px', fontWeight: 900, fontFamily: CAIRO,
                                                    background: inv.ageDays > 90 ? 'rgba(239, 68, 68, 0.1)' : inv.ageDays > 60 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                    color: inv.ageDays > 90 ? '#ef4444' : inv.ageDays > 60 ? '#f59e0b' : '#10b981',
                                                    border: `1px solid ${inv.ageDays > 90 ? '#ef444422' : inv.ageDays > 60 ? '#f59e0b22' : '#10b98122'}`
                                                }}>
                                                    {inv.ageDays > 90 ? t('متأخر جداً') : inv.ageDays > 60 ? t('حذر') : t('اعتيادي')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
                                    <tr>
                                        <td colSpan={4} style={{ padding: '20px 24px', textAlign: 'center', fontSize: '13px', color: C.textPrimary, fontWeight: 900, fontFamily: CAIRO }}>{t('إجمالي المديونيات المتأخرة المستحقة')}</td>
                                        <td style={{ padding: '20px 20px', textAlign: 'center', color: '#ef4444', fontSize: '16px', fontWeight: 1000, fontFamily: INTER }}>{filtered.reduce((s, i) => s + i.remaining, 0).toLocaleString('en-US')} <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: '10px', marginInlineStart: '2px' }}>{sym}</span></td>
                                        <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                                            <button onClick={exportToExcel} style={{ 
                                                height: '34px', padding: '0 16px', borderRadius: '10px', border: `1px solid ${C.border}`, 
                                                background: C.primary, color: '#fff', fontSize: '11.5px', fontWeight: 800, 
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO,
                                                boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                                            }}>
                                                <Download size={14} /> {t('تصدير Excel')}
                                            </button>
                                        </td>
                                    </tr>
                                </tfoot>
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

