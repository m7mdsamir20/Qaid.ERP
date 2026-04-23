'use client';
import { formatNumber } from '@/lib/currency';
import { useCurrency } from '@/hooks/useCurrency';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { TrendingDown, Calendar, Calculator, FileText, AlertCircle, CheckCircle2, Loader2, AlertTriangle, Info, ArrowRightLeft, Briefcase, Activity, ShieldCheck, PieChart, ChevronDown, ChevronUp, History, Info as InfoIcon } from 'lucide-react';
import { C, CAIRO, OUTFIT, THEME, TABLE_STYLE, SEARCH_STYLE, KPI_STYLE, focusIn, focusOut, PAGE_BASE, IS, LS, BTN_PRIMARY, BTN_DANGER } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

/* ── Types ── */
interface FixedAsset {
    id: string; code: string; name: string; purchaseDate: string; purchaseCost: number;
    depreciationRate: number; depreciationMethod: 'straight' | 'declining';
    accumulatedDepreciation: number; salvageValue: number; usefulLife: number;
    status: 'active' | 'disposed' | 'fully_dep'; depAccountId: string;
    accumAccountId: string; assetAccountId: string;
}
interface FinancialYear { id: string; name: string; isOpen: boolean; startDate: string; endDate: string; }
interface DepLine { asset: FixedAsset; depAmount: number; netBook: number; alreadyDone: boolean; }

const fmt = (n: number) => formatNumber(n);

function calcDepreciation(asset: FixedAsset, months: number): number {
    const depreciableBase = asset.purchaseCost - asset.salvageValue;
    const netBook = asset.purchaseCost - asset.accumulatedDepreciation;
    if (asset.depreciationMethod === 'straight') {
        return depreciableBase * (asset.depreciationRate / 100) * (months / 12);
    } else {
        return Math.max(0, netBook - asset.salvageValue) * (asset.depreciationRate / 100) * (months / 12);
    }
}

export default function DepreciationPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [years, setYears]         = useState<FinancialYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState('');
    const [period, setPeriod]       = useState('yearly');
    const [assets, setAssets]       = useState<FixedAsset[]>([]);
    const [lines, setLines]         = useState<DepLine[]>([]);
    const [loading, setLoading]     = useState(false);
    const [calculated, setCalculated] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [registered, setRegistered]   = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError]         = useState('');
    const { symbol: cSymbol } = useCurrency();

    const monthsMap: Record<string, number> = { 'yearly': 12, 'quarterly': 3, 'monthly': 1 };
    const PERIOD_LABELS: Record<string, string> = {
        'yearly': t('سنوي'),
        'quarterly': t('ربع سنوي'),
        'monthly': t('شهري')
    };

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(data => setYears(data.financialYears || [])).catch(() => {});
        fetch('/api/fixed-assets').then(r => r.json()).then((data: FixedAsset[]) => setAssets(Array.isArray(data) ? data.filter(a => a.status === 'active') : [])).catch(() => setAssets([]));
    }, []);

    const handleCalculate = async () => {
        if (!selectedYearId) { setError(t('يرجى اختيار السنة المالية أولاً')); return; }
        setLoading(true); setError(''); setCalculated(false);
        try {
            const months = monthsMap[period] || 12;
            const res = await fetch(`/api/depreciation/check?financialYearId=${selectedYearId}&period=${period}`);
            const done: string[] = res.ok ? await res.json() : [];
            const computed: DepLine[] = assets.map(a => {
                const depAmount = calcDepreciation(a, months);
                const netBook   = a.purchaseCost - a.accumulatedDepreciation - depAmount;
                return { asset: a, depAmount, netBook: Math.max(0, netBook), alreadyDone: done.includes(a.id) };
            }).filter(l => l.depAmount > 0);
            setLines(computed); setCalculated(true);
        } catch { setError(t('فشل حساب الإهلاك للأصول المحددة')); }
        setLoading(false);
    };

    const handleRegister = async () => {
        setShowConfirm(false); setRegistering(true); setError('');
        try {
            const pendingLines = lines.filter(l => !l.alreadyDone);
            if (pendingLines.length === 0) {
                setError(t('تم تسجيل إهلاك جميع الأصول المحددة لهذه الفترة مسبقاً'));
                setRegistering(false); return;
            }
            const res = await fetch('/api/depreciation/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    financialYearId: selectedYearId, period,
                    lines: pendingLines.map(l => ({
                        assetId: l.asset.id, depAmount: l.depAmount,
                        depAccountId: l.asset.depAccountId, accumAccountId: l.asset.accumAccountId,
                    })),
                }),
            });
            if (res.ok) {
                setRegistered(true); setLines(prev => prev.map(l => ({ ...l, alreadyDone: true })));
                setTimeout(() => setRegistered(false), 4000);
            } else { const d = await res.json(); setError(d.error || t('فشل في تسجيل القيود بالدفاتر')); }
        } catch { setError(t('خطأ في الاتصال بالخادم، يرجى إعادة المحاولة')); }
        setRegistering(false);
    };

    const totalCalculatedDep = lines.reduce((s, l) => s + l.depAmount, 0);
    const totalCurrentAssetsCost = assets.reduce((s, a) => s + a.purchaseCost, 0);
    const totalAccumDepAssets = assets.reduce((s, a) => s + a.accumulatedDepreciation, 0);
    const pendingCount = lines.filter(l => !l.alreadyDone).length;
    const selectedYear = years.find(y => y.id === selectedYearId);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                
                <PageHeader
                    title={t("احتساب قيود الإهلاك للفترة")}
                    subtitle={t("تعديل ومعاينة إهلاك الأصول قبل الترحيل للدفاتر المحاسبية")}
                    icon={TrendingDown}
                    primaryButton={calculated && pendingCount > 0 ? {
                        label: `${t('ترحيل الإهلاك')} (${pendingCount})`,
                        icon: FileText,
                        onClick: () => setShowConfirm(true)
                    } : undefined}
                />

                {/* KPI Section */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                    {[
                        { label: t('الأصول النشطة حاليّاً'), val: assets.length, color: C.blue, icon: Briefcase, isCount: true },
                        { label: t('إجمالي قيمة الأصول'), val: totalCurrentAssetsCost, color: '#10b981', icon: Activity },
                        { label: t('مجمع الإهلاك الكلي'), val: totalAccumDepAssets, color: '#f59e0b', icon: PieChart },
                        { label: t('الإهلاك المحتسب حاليّاً'), val: calculated ? totalCalculatedDep : 0, color: C.danger, icon: TrendingDown },
                    ].map((s, i) => (
                        <div key={i} style={{ 
                            background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                            padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div style={{ textAlign: 'start' }}>
                                <p style={{ fontSize: '11px', fontWeight: 700, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', fontWeight: 600, color: s.color, fontFamily: OUTFIT }} dir="ltr">
                                    <span>{formatNumber(s.val)}</span>
                                    {!s.isCount && <span style={{ fontSize: '10px', color: C.textMuted, fontFamily: CAIRO, marginInlineStart: '4px' }}>{cSymbol}</span>}
                                </div>
                            </div>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                <s.icon size={20} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filters Row (No region) */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ width: '240px' }}>
                        <label style={LS}>{t('السنة المالية المحاسبية')}</label>
                        <CustomSelect
                            value={selectedYearId} onChange={setSelectedYearId} icon={Calendar}
                            placeholder={t("-- اختر السنة المالية --")}
                            options={years.filter(y => y.isOpen).map(y => ({ value: y.id, label: y.name }))}
                        />
                    </div>
                    <div style={{ width: '180px' }}>
                        <label style={LS}>{t('دورة الإهلاك الحالية')}</label>
                        <CustomSelect
                            value={period} onChange={setPeriod} icon={History}
                            options={Object.entries(PERIOD_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                        />
                    </div>
                    <button onClick={handleCalculate} disabled={loading} style={{ 
                        height: THEME.button.height, padding: '0 24px', borderRadius: THEME.button.radius, border: 'none',
                        background: loading ? 'rgba(37, 106, 244,0.3)' : C.primary, color: '#fff', fontSize: '13px', fontWeight: 600, 
                        flexShrink: 0, opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO,
                        boxShadow: loading ? 'none' : `0 4px 12px ${C.primary}30`, transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { if(!loading) e.currentTarget.style.background = C.primaryHover; }}
                    onMouseLeave={e => { if(!loading) e.currentTarget.style.background = C.primary; }}>
                        {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Calculator size={16} />}
                        <span>{t('احسب الإهلاك الآن')}</span>
                    </button>
                    {selectedYear && (
                        <div style={{ marginInlineEnd: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: C.textMuted, fontSize: '11px', fontFamily: CAIRO, paddingBottom: '10px' }}>
                            <InfoIcon size={14} />
                            <span>{t('نطاق السنة')}: {new Date(selectedYear.startDate).toLocaleDateString('en-GB')} ← {new Date(selectedYear.endDate).toLocaleDateString('en-GB')}</span>
                        </div>
                    )}
                </div>

                {/* Feedback Alerts */}
                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderRadius: '12px', background: `${C.danger}10`, border: `1px solid ${C.danger}30`, marginBottom: '16px', color: C.danger, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}
                {registered && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '16px', color: '#10b981', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                        <CheckCircle2 size={18} /> {t('تم تسجيل كشوف الإهلاك والموافقة عليها بنجاح')}
                    </div>
                )}

                {/* Results Table */}
                {calculated && lines.length > 0 ? (
                    <div style={TABLE_STYLE.container}>
                        <div style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('تفاصيل احتساب الإهلاك المالي')}</div>
                            <div style={{ fontSize: '12px', color: C.textMuted, fontFamily: CAIRO, display: 'flex', gap: '12px' }}>
                                <span>{t('عدد الأصول')}: <b style={{ fontFamily: OUTFIT }}>{lines.length}</b></span>
                                <span>{t('القيمة المخططة')}: <b style={{ color: C.danger, fontFamily: OUTFIT }}>{fmt(totalCalculatedDep)} {cSymbol}</b></span>
                            </div>
                        </div>
                        <table style={TABLE_STYLE.table}>
                            <thead>
                                <tr style={TABLE_STYLE.thead}>
                                    <th style={TABLE_STYLE.th(true)}>{t('كود الأصل')}</th>
                                    <th style={TABLE_STYLE.th(false)}>{t('اسم الأصل')}</th>
                                    <th style={TABLE_STYLE.th(false)}>{t('تكلفة الشراء')}</th>
                                    <th style={TABLE_STYLE.th(false)}>{t('مجمع قبل')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false, true), color: C.danger }}>{t('قسط الفترة')}</th>
                                    <th style={TABLE_STYLE.th(false)}>{t('مجمع بعد')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false, true), color: '#10b981' }}>{t('الصافي الباقي')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false, true), textAlign: 'center' }}>{t('الحالة')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((l, i) => (
                                    <tr key={l.asset.id} style={TABLE_STYLE.row(i === lines.length - 1)}>
                                        <td style={{ ...TABLE_STYLE.td(true), fontFamily: OUTFIT, fontSize: '12px', color: C.blue, fontWeight: 700 }}>{l.asset.code}</td>
                                        <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{l.asset.name}</td>
                                        <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, fontSize: '13px', color: C.textSecondary }}>{fmt(l.asset.purchaseCost)}</td>
                                        <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, fontSize: '13px', color: C.textMuted }}>{fmt(l.asset.accumulatedDepreciation)}</td>
                                        <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: C.danger }}>{fmt(l.depAmount)}</td>
                                        <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, fontSize: '13px', color: C.textMuted }}>{fmt(l.asset.accumulatedDepreciation + l.depAmount)}</td>
                                        <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600, color: '#10b981' }}>{fmt(l.netBook)}</td>
                                        <td style={{ ...TABLE_STYLE.td(false, true), textAlign: 'center' }}>
                                            {l.alreadyDone ? (
                                                <span style={{ fontSize: '10px', fontWeight: 600, color: '#10b981', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontFamily: CAIRO }}>✓ {t('تم الترحيل')}</span>
                                            ) : (
                                                <span style={{ fontSize: '10px', fontWeight: 600, color: '#f59e0b', padding: '2px 8px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', fontFamily: CAIRO }}>{t('معاينة قيد')}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : calculated ? (
                    <div style={{ padding: '80px', background: C.card, borderRadius: '16px', border: `1px solid ${C.border}` }}>
                        <CheckCircle2 size={48} style={{ color: '#10b981', opacity: 0.3, margin: '0 auto 16px' }} />
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد أصول تستوجب الإهلاك للفترة الحالية')}</h3>
                        <p style={{ color: C.textMuted, fontSize: '13px', fontFamily: CAIRO }}>{t('تم ترحيل جميع القيود أو لا توجد أصول نشطة ذات أرصدة مدينة')}</p>
                    </div>
                ) : (
                    <div style={{ padding: '80px', background: C.card, borderRadius: '20px', border: `1px dashed ${C.border}` }}>
                        <ArrowRightLeft size={48} style={{ color: C.border, margin: '0 auto 16px', opacity: 0.5 }} />
                        <h2 style={{ fontSize: '15px', fontWeight: 600, color: C.textMuted, fontFamily: CAIRO, margin: 0 }}>{t('قم باختيار السنة المالية والفترة المُراد احتساب الإهلاك لها')}</h2>
                        <p style={{ marginTop: '6px', color: C.textSecondary, fontSize: '12px', fontFamily: CAIRO, opacity: 0.8 }}>{t('سيتم عرض النتائج هنا للمراجعة والموافقة قبل الترحيل لمجمع الإهلاك')}</p>
                    </div>
                )}

                {/* Confirm Post Modal */}
                <AppModal show={showConfirm} onClose={() => setShowConfirm(false)} title={t("تأكيد ترحيل القيود للدفاتر")} icon={TrendingDown}>
                    <div style={{ }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'rgba(37, 106, 244,0.1)', color: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Calculator size={32} />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, marginBottom: '12px' }}>{t('هل أنت متأكد من تسجيل هذه القيود؟')}</h3>
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: `1px solid ${C.border}`, marginBottom: '24px', textAlign: 'start' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                                <span style={{ color: C.textSecondary, fontFamily: CAIRO }}>{t('عدد الأصول المشمولة')}:</span>
                                <span style={{ color: C.textPrimary, fontWeight: 600, fontFamily: OUTFIT }}>{pendingCount} {t('أصل')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                                <span style={{ color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي مبلغ مصروف الإهلاك')}:</span>
                                <span style={{ color: C.danger, fontWeight: 600, fontFamily: OUTFIT }}>{fmt(lines.filter(l => !l.alreadyDone).reduce((s, d) => s + d.depAmount, 0))} {cSymbol}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: C.textMuted, borderTop: `1px solid ${C.border}`, paddingTop: '10px', marginTop: '10px', direction: 'ltr' }}>
                                DEBIT: Dep. Expense Account (5xxx) <br/>
                                CREDIT: Acc. Dep. Account (1xxx)
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={handleRegister} disabled={registering} style={{ ...BTN_PRIMARY(false, registering), flex: 1.5, height: '48px' }}>
                                {registering ? t('جاري الترحيل للدفاتر...') : t('تأكيد الترحيل النهائي')}
                            </button>
                            <button onClick={() => setShowConfirm(false)} style={{ flex: 1, height: '48px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>{t('تراجع')}</button>
                        </div>
                    </div>
                </AppModal>

            </div>
            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
        </DashboardLayout>
    );
}
