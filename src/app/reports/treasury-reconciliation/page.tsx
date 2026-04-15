'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, IS, INTER } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import {
    Activity, RefreshCw, Landmark, Wallet,
    AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
    Search, Loader2, FileText, Download, ShieldCheck,
    History as HistoryIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': t('ج.م'), 'SAR': t('ر.س'), 'AED': t('د.إ'), 'USD': '$', 'KWD': t('د.ك'), 'QAR': t('ر.ق'), 'BHD': t('د.ب'), 'OMR': t('ر.ع'), 'JOD': t('د.أ') };
    return map[code] || code;
};

const SC = '#10b981';
const DC = '#ef4444';

export default function TreasuryReconciliationPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [treasuries, setTreasuries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [physicalBalances, setPhysicalBalances] = useState<Record<string, string>>({});
    const [q, setQ] = useState('');

    const fetchTreasuries = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/treasuries');
            if (res.ok) setTreasuries(await res.json());
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchTreasuries(); }, []);

    const handleActualChange = (id: string, val: string) => {
        setPhysicalBalances(prev => ({ ...prev, [id]: val }));
    };

    const filtered = treasuries.filter(t => t.name.toLowerCase().includes(q.toLowerCase()));

    const totals = treasuries.reduce((acc, t) => {
        const sys = t.balance;
        const act = parseFloat(physicalBalances[t.id]) || 0;
        const hasAct = physicalBalances[t.id] !== undefined && physicalBalances[t.id] !== '';
        
        acc.systemTotal += sys;
        if (hasAct) {
            acc.actualTotal += act;
            const diff = act - sys;
            if (diff < 0) acc.totalShortage += Math.abs(diff);
            if (diff > 0) acc.totalSurplus += diff;
            acc.reconciledCount++;
        }
        return acc;
    }, { systemTotal: 0, actualTotal: 0, totalShortage: 0, totalSurplus: 0, reconciledCount: 0 });

    const exportToExcel = () => {
        if (!treasuries.length) return;
        const excelData = treasuries.map(t => {
            const systemVal = t.balance;
            const actualVal = parseFloat(physicalBalances[t.id]) || 0;
            const diff = actualVal - systemVal;
            const hasActual = physicalBalances[t.id] !== undefined && physicalBalances[t.id] !== '';
            
            return {
                'اسم الخزينة': t.name,
                'النوع': t.type === 'bank' ? t('بنكي') : t('نقدي'),
                'الرصيد الدفتري': systemVal,
                'الرصيد الفعلي': hasActual ? actualVal : t('لم يجرد'),
                'الفارق': hasActual ? diff : '—',
                'الحالة': !hasActual ? t('غير مجرود') : (diff === 0 ? t('مطابق') : (diff < 0 ? t('عجز') : t('زيادة')))
            };
        });
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'تقرير العجز والزيادة');
        XLSX.writeFile(wb, `تقرير_الجرد_والعجز_${new Date().toLocaleDateString('en-GB')}.xlsx`);
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader 
                    title={t('تقرير الجرد والعجز والزيادة')} 
                    subtitle={t('مطابقة الأرصدة الفعلية بالأرصدة الدفترية المودعة في النظام للخزن والحسابات البنكية.')} 
                    backTab="treasury-bank"
                    
                    onExportExcel={exportToExcel}
                />


                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: t('إجمالي الرصيد الدفتري'), value: totals.systemTotal, color: '#3b82f6', icon: <HistoryIcon size={20} />, sign: t('المسجل في النظام') },
                        { label: t('إجمالي العجز المكتشف'), value: totals.totalShortage, color: DC, icon: <TrendingDown size={20} />, sign: t('نقص في الأرصدة (-)') },
                        { label: t('إجمالي الزيادة المكتشفة'), value: totals.totalSurplus, color: SC, icon: <TrendingUp size={20} />, sign: t('زيادة في الأرصدة (+)') },
                        { label: t('نسبة الجرد المكتملة'), value: treasuries.length > 0 ? (totals.reconciledCount / treasuries.length * 100) : 0, isPercent: true, color: '#a855f7', icon: <ShieldCheck size={20} />, sign: `${totals.reconciledCount} من أصل ${treasuries.length}` },
                    ].map((s: any, i: number) => (
                        <div key={i} style={{
                            background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'all 0.2s', boxShadow: '0 2px 8px -4px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ textAlign: 'start' }}>
                                <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>
                                        {s.isPercent ? s.value.toFixed(0) : s.value.toLocaleString('en-US')}
                                    </span>
                                    <span style={{ fontSize: '10.5px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{s.isPercent ? '%' : getCurrencyName(currency)}</span>
                                </div>
                                <div style={{ fontSize: '9px', fontWeight: 800, color: s.color, fontFamily: CAIRO, marginTop: '2px' }}>{s.sign}</div>
                            </div>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                {s.icon}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="no-print" style={{ display: 'flex', gap: '14px', marginBottom: '24px', width: '100%', padding: 0 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                        <input
                            placeholder={t('ابحث باسم الخزينة أو الحساب البنكي...')}
                            value={q} onChange={e => setQ(e.target.value)}
                            style={{ 
                                ...IS, width: '100%', height: '42px', padding: '0 45px 0 15px', 
                                borderRadius: '12px', border: `1px solid ${C.border}`, 
                                background: C.card, color: C.textPrimary, fontSize: '13.5px', 
                                outline: 'none', fontFamily: CAIRO, fontWeight: 500 
                            }}
                        />
                    </div>
                    <button onClick={fetchTreasuries} style={{ 
                        height: '42px', padding: '0 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${C.border}`, color: C.textSecondary, fontSize: '13px', fontWeight: 800,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO
                    }}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('تحديث الأرصدة')}</button>
                </div>

                {loading ? (
                    <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري سحب الأرصدة الدفترية...')}</span>
                    </div>
                ) : (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        {[t('المرجع المالي'), t('النوع'), t('الرصيد الدفتري'), t('الرصيد الفعلي (عَدّ يدوي)'), t('الفارق (عجز/زيادة)'), t('حالة الجرد')].map((h, i) => (
                                            <th key={i} style={{ 
                                                padding: '16px 20px', fontSize: '12px', color: C.textSecondary, 
                                                textAlign: 'center', 
                                                fontWeight: 800, fontFamily: CAIRO 
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((t, idx) => {
                                        const systemVal = t.balance;
                                        const actualVal = parseFloat(physicalBalances[t.id]) || 0;
                                        const diff = actualVal - systemVal;
                                        const hasActual = physicalBalances[t.id] !== undefined && physicalBalances[t.id] !== '';

                                        return (
                                            <tr key={t.id} 
                                                style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO, textAlign: 'center' }}>{t.name}</div>
                                                    <div style={{ fontSize: '11px', color: C.textMuted, textAlign: 'center', fontFamily: INTER }}>ID: {t.id.substring(0, 8)}</div>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    {t.type === 'bank' ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6366f1', padding: '4px 10px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', fontSize: '11px', fontWeight: 800, fontFamily: CAIRO }}><Landmark size={14} />{t('بنكي')}</span>
                                                    ) : (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', padding: '4px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', fontSize: '11px', fontWeight: 800, fontFamily: CAIRO }}><Wallet size={14} />{t('نقدي')}</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 900, fontSize: '14.5px', fontFamily: INTER, color: C.textPrimary }}>
                                                    {systemVal.toLocaleString('en-US')}
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <div className="no-print" style={{ display: 'flex', justifyContent: 'center' }}>
                                                        <input
                                                            type="number"
                                                            placeholder={t('أدخل المبلغ...')}
                                                            value={physicalBalances[t.id] || ''}
                                                            onChange={e => handleActualChange(t.id, e.target.value)}
                                                            style={{ 
                                                                width: '130px', height: '36px', textAlign: 'center', borderRadius: '8px', 
                                                                border: `1px solid ${hasActual ? C.primary : C.border}`, 
                                                                background: hasActual ? 'rgba(37,99,235,0.05)' : 'rgba(255,255,255,0.02)', 
                                                                color: '#fff', fontSize: '13px', fontWeight: 800, fontFamily: INTER, outline: 'none'
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="print-only" style={{ display: 'none', fontWeight: 900, fontFamily: INTER }}>
                                                        {hasActual ? actualVal.toLocaleString('en-US') : '—'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 1000, color: !hasActual ? C.textMuted : (diff > 0 ? SC : diff < 0 ? DC : C.primary), fontSize: '15px', fontFamily: INTER }}>
                                                    {hasActual ? (diff > 0 ? `+${diff.toLocaleString('en-US')}` : diff.toLocaleString('en-US')) : '—'}
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    {hasActual ? (
                                                        diff === 0 ? (
                                                            <span style={{ color: SC, display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 900, fontFamily: CAIRO, background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '8px' }}><CheckCircle2 size={14} />{t('مطابق')}</span>
                                                        ) : diff < 0 ? (
                                                            <span style={{ color: DC, display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 900, fontFamily: CAIRO, background: 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: '8px' }}><TrendingDown size={14} />{t('عجز')}</span>
                                                        ) : (
                                                            <span style={{ color: SC, display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 900, fontFamily: CAIRO, background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '8px' }}><TrendingUp size={14} />{t('زيادة')}</span>
                                                        )
                                                    ) : (
                                                        <span style={{ color: C.textMuted, fontSize: '11px', fontWeight: 700, fontFamily: CAIRO }}>{t('غير مجرود')}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div style={{ 
                    marginTop: '30px', padding: '20px', background: 'rgba(245, 158, 11, 0.05)', 
                    borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.15)',
                    display: 'flex', gap: '15px', alignItems: 'flex-start'
                }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', flexShrink: 0 }}>
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 900, color: '#f59e0b', fontFamily: CAIRO }}>{t('تعليمات الرقابة والمطابقة المالية:')}</h4>
                        <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.6, margin: 0, fontFamily: CAIRO }}>{t('الرجاء إدخال الأرصدة النقدية الفعلية بعد العد اليدوي لكل صندوق أو حساب. يقوم التقرير ذاتياً بحساب الفروقات "الدفتيرية" مقابل "الفعلية". 
                           في حال وجود')}<strong style={{color: DC}}>{t('عجز')}</strong>{t('، يرجى مراجعة العمليات غير المسجلة أو المصاريف النقدية. وفي حال')}<strong style={{color: SC}}>{t('الزيادة')}</strong>{t('، تأكد من تسجيل كافة سندات القبض بدقة.')}</p>
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
                    .print-only-inline { display: inline-block !important; }
                    div { background: #fff !important; border-color: #e2e8f0 !important; }
                    div, span, h2, h3, p, strong { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 10px !important; border: 1px solid #e2e8f0 !important; }
                    input { display: none !important; }
                    .print-only { display: block !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}

