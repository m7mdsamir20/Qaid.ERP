'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { useSession } from 'next-auth/react';
import {
    FileBarChart2, TrendingDown, DollarSign,
    Building2, Loader2, Search, CheckCircle2
} from 'lucide-react';
import { C, CAIRO, INTER, PAGE_BASE, IS, focusIn, focusOut } from '@/constants/theme';

/* ── Types ── */
interface FixedAsset {
    id: string;
    code: string;
    name: string;
    category: string;
    purchaseDate: string;
    purchaseCost: number;
    accumulatedDepreciation: number;
    netBookValue: number;
    depreciationRate: number;
    depreciationMethod: 'straight' | 'declining';
    status: 'active' | 'disposed' | 'fully_dep';
    salvageValue: number;
}

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const fmt = (n: number) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function FixedAssetsReportPage() {
    const { lang, t } = useTranslation();

    const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
        active:    { label: t('نشط'),           color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
        disposed:  { label: t('مُستبعد'),        color: '#fb7185', bg: 'rgba(251,113,133,0.1)'   },
        fully_dep: { label: t('مستهلك كلياً'),  color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
    };

    const METHOD_MAP: Record<string, string> = {
        straight: t('قسط ثابت'), declining: t('قسط متناقص'),
    };

    const CATEGORIES = [t('الكل'), t('مركبات'), t('أجهزة وحاسبات'), t('أراضي ومباني'), t('أثاث ومفروشات'), t('معدات وآلات'), t('أخرى')];

    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [assets, setAssets]       = useState<FixedAsset[]>([]);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');
    const [catFilter, setCatFilter] = useState(t('الكل'));
    const [statusFilter, setStatusFilter] = useState('all');

    /* ── Fetch from API ── */
    useEffect(() => {
        fetch('/api/fixed-assets')
            .then(r => r.json())
            .then(d => setAssets(Array.isArray(d) ? d : []))
            .catch(() => setAssets([]))
            .finally(() => setLoading(false));
    }, []);

    /* ── Filter ── */
    const filtered = assets.filter(a => {
        const matchSearch = (a.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (a.code || '').toLowerCase().includes(search.toLowerCase());
        const matchCat    = catFilter === 'الكل' || a.category === catFilter;
        const matchStatus = statusFilter === 'all' || a.status === statusFilter;
        return matchSearch && matchCat && matchStatus;
    });

    /* ── Totals ── */
    const totalCost  = filtered.reduce((s, a) => s + (a.purchaseCost || 0), 0);
    const totalAccum = filtered.reduce((s, a) => s + (a.accumulatedDepreciation || 0), 0);
    const totalNet   = filtered.reduce((s, a) => s + (a.netBookValue || 0), 0);

    /* ── Dep % of cost ── */
    const depPct = totalCost > 0 ? (totalAccum / totalCost * 100).toFixed(1) : '0.0';

    const exportToPDF = () => window.print();
    const sym = getCurrencyName(currency);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>

                {/* ── Header ── */}
                <ReportHeader
                    title={t("تقرير الأصول الثابتة")}
                    subtitle={t("كشف تفصيلي بالأصول — التكلفة التاريخية ومجمع الإهلاك والقيمة الدفترية")}
                    backTab="financial"
                />

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 600, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري تحميل بيانات الأصول...')}</span>
                    </div>
                ) : (
                    <>

                        {/* ── KPI Cards ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: t('إجمالي التكلفة'), value: fmt(totalCost), color: '#3b82f6', icon: <DollarSign size={18} /> },
                                { label: t('مجمع الإهلاك'), value: fmt(totalAccum), color: '#fb7185', icon: <TrendingDown size={18} /> },
                                { label: t('الصافي الدفتري'), value: fmt(totalNet), color: '#10b981', icon: <Building2 size={18} /> },
                                { label: t('نسبة الاستهلاك'), value: `${depPct}%`, color: '#f59e0b', icon: <FileBarChart2 size={18} /> },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}>
                                    <div style={{ textAlign: 'start' }}>
                                        <p className="stat-label" style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span className="stat-value" style={{ fontSize: '15px', fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>{s.value}</span>
                                            {i < 3 && <span style={{ fontSize: '10px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>}
                                        </div>
                                    </div>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── Filters (Standardized & Expanded) ── */}
                {/* ── Filters (Unified Premium Design) ── */}
                <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
                    {/* Search Field */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 1 }} />
                        <input 
                            value={search} 
                            onChange={e => setSearch(e.target.value)}
                            onFocus={(e) => {
                                focusIn(e);
                                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.9)';
                            }}
                            onBlur={(e) => {
                                focusOut(e);
                                e.currentTarget.style.background = C.card;
                            }}
                            placeholder={t("بحث شامل بالأصول (الاسم أو الكود)...")}
                            style={{ 
                                ...IS, 
                                width: '100%', 
                                height: '42px', 
                                paddingInlineStart: '44px',
                                borderRadius: '12px',
                                background: C.card,
                                border: `1px solid ${C.border}`,
                                transition: 'all 0.2s ease-in-out',
                                fontSize: '13.5px',
                                fontFamily: CAIRO
                            }} 
                        />
                    </div>

                    {/* Category Filter */}
                    <div style={{ width: '180px' }}>
                        <CustomSelect 
                            value={catFilter} 
                            onChange={setCatFilter}
                            icon={Building2} 
                            placeholder={t("الفئة")}
                            options={CATEGORIES.map(c => ({ value: c, label: c === 'الكل' ? t('الكل') : t(c) }))}
                            style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, fontFamily: CAIRO }} 
                        />
                    </div>

                    {/* Status Filters (Unified Background) */}
                    <div style={{ 
                        display: 'flex', 
                        gap: '6px', 
                        background: C.card, 
                        padding: '4px', 
                        borderRadius: '12px', 
                        border: `1px solid ${C.border}`,
                        height: '42px',
                        alignItems: 'center'
                    }}>
                        {[
                            { key: 'all',      label: t('الكل'),          color: '#3b82f6' },
                            { key: 'active',   label: t('نشط'),           color: '#10b981' },
                            { key: 'fully_dep',label: t('مستهلك كلياً'),  color: '#94a3b8' },
                            { key: 'disposed', label: t('مُستبعد'),        color: '#fb7185' },
                        ].map(btn => (
                            <button key={btn.key} onClick={() => setStatusFilter(btn.key)} style={{
                                height: '34px', 
                                padding: '0 16px', 
                                borderRadius: '8px', 
                                border: 'none',
                                fontSize: '11.5px', 
                                fontWeight: 800, 
                                cursor: 'pointer', 
                                transition: 'all 0.2s', 
                                fontFamily: CAIRO,
                                background:  statusFilter === btn.key ? `${btn.color}20`  : 'transparent',
                                color:       statusFilter === btn.key ? btn.color          : C.textMuted,
                            }}>{btn.label}</button>
                        ))}
                    </div>
                </div>

                <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', paddingInlineStart: '4px' }}>
                    <div style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>
                        {t('عدد الأصول المفلترة:')} <span style={{ color: C.primary, fontWeight: 900, fontFamily: INTER, fontSize: '14px' }}>{filtered.length}</span>
                    </div>
                </div>

                        {/* ── Table (Unified Premium Design) ── */}
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        {[t('الكود'), t('اسم الأصل'), t('الفئة'), t('تاريخ الشراء'), t('التكلفة'), t('مجمع الإهلاك'), t('الصافي الدفتري'), t('المعدل'), t('الحالة')].map((h, i) => (
                                            <th key={i} style={{ 
                                                padding: '16px 20px', 
                                                fontSize: '12px', 
                                                fontWeight: 800, 
                                                color: C.textSecondary, 
                                                textAlign: 'start', 
                                                fontFamily: CAIRO,
                                                borderBottom: `1px solid ${C.border}` 
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={10} style={{ padding: '60px', textAlign: 'center', color: C.textMuted, fontSize: '13px', fontFamily: CAIRO }}>{t('لا توجد بيانات تطابق البحث حالياً')}</td></tr>
                                    ) : filtered.map((a, i) => {
                                        const st = STATUS_MAP[a.status];
                                        const depPctRow = a.purchaseCost > 0
                                            ? (a.accumulatedDepreciation / a.purchaseCost * 100).toFixed(0)
                                            : '0';
                                        return (
                                            <tr key={a.id} 
                                                style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.2s', background: i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }} 
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} 
                                                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <span style={{ fontFamily: INTER, fontSize: '11px', color: '#a78bfa', fontWeight: 900 }}>{a.code}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px', fontSize: '12.5px', color: C.textPrimary, fontWeight: 700, fontFamily: CAIRO }}>{a.name}</td>
                                                <td style={{ padding: '14px 20px', fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{t(a.category)}</td>
                                                <td style={{ padding: '14px 20px', fontSize: '11.5px', color: C.textMuted, fontFamily: INTER }}>{a.purchaseDate?.split('T')[0]}</td>
                                                <td style={{ padding: '14px 20px', fontSize: '13px', color: C.textPrimary, fontWeight: 750, fontFamily: INTER, textAlign: 'start' }}>{fmt(a.purchaseCost)} <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: '10px', marginInlineStart: '2px' }}>{sym}</span></td>
                                                <td style={{ padding: '14px 20px', textAlign: 'start' }}>
                                                    <div style={{ fontSize: '13px', color: '#fb7185', fontWeight: 800, fontFamily: INTER }}>{fmt(a.accumulatedDepreciation)} <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: '10px', marginInlineStart: '2px' }}>{sym}</span></div>
                                                    <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '2px', fontFamily: CAIRO }}>{depPctRow}% {t('مستهلك')}</div>
                                                </td>
                                                <td style={{ padding: '14px 20px', fontSize: '13.5px', color: '#10b981', fontWeight: 950, fontFamily: INTER, textAlign: 'start' }}>{fmt(a.netBookValue)} <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: '10px', marginInlineStart: '2px' }}>{sym}</span></td>
                                                <td style={{ padding: '14px 20px', fontSize: '12.5px', color: '#f59e0b', fontWeight: 800, fontFamily: INTER }}>{a.depreciationRate}%</td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: 900, padding: '4px 12px', borderRadius: '8px', background: st.bg, color: st.color, border: `1px solid ${st.color}33`, whiteSpace: 'nowrap', fontFamily: CAIRO }}>
                                                        {t(st.label)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot style={{ background: 'rgba(255,255,255,0.03)', borderTop: `2px solid ${C.border}` }}>
                                    <tr>
                                        <td colSpan={4} style={{ padding: '18px 24px', fontSize: '12.5px', fontWeight: 850, color: C.textSecondary, textAlign: 'start', fontFamily: CAIRO }}>{t('إجمالي الأصول المفلترة')} ({filtered.length})</td>
                                        <td style={{ padding: '18px 20px', fontSize: '14px', fontWeight: 950, color: C.textPrimary, textAlign: 'start', fontFamily: INTER }}>{fmt(totalCost)} <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: '10px', marginInlineStart: '2px' }}>{sym}</span></td>
                                        <td style={{ padding: '18px 20px', fontSize: '14px', fontWeight: 950, color: '#fb7185', textAlign: 'start', fontFamily: INTER }}>{fmt(totalAccum)} <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: '10px', marginInlineStart: '2px' }}>{sym}</span></td>
                                        <td style={{ padding: '18px 20px', fontSize: '15px', fontWeight: 1000, color: '#10b981', textAlign: 'start', fontFamily: INTER }}>{fmt(totalNet)} <span style={{ fontFamily: "'Cairo', sans-serif", fontSize: '10px', marginInlineStart: '2px' }}>{sym}</span></td>
                                        <td colSpan={2} />
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
                    .print-table-container { background: white !important; border: 1px solid #e2e8f0 !important; border-radius: 0 !important; }
                    div { background: #fff !important; border-color: #e2e8f0 !important; }
                    div, span, h2, h3, p, small { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; border: 1px solid #e2e8f0 !important; }
                    tfoot td { background: #f8fafc !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}

