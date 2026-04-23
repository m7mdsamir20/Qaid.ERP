'use client';
import { formatNumber } from '@/lib/currency';
import { useCurrency } from '@/hooks/useCurrency';

import React, { useState, useEffect } from 'react';
import { Currency } from '@/components/Currency';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { ArrowRightLeft, Building2, AlertTriangle, Loader2, CheckCircle2, TrendingUp, TrendingDown, Info, Plus, Search, X, Calendar, History, ShieldAlert, PieChart, Briefcase, MinusCircle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { C, CAIRO, OUTFIT, THEME, TABLE_STYLE, SEARCH_STYLE, KPI_STYLE, focusIn, focusOut, PAGE_BASE, IS, LS, BTN_PRIMARY, BTN_DANGER } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

/* ── Types ── */
interface FixedAsset {
    id: string; code: string; name: string; purchaseCost: number;
    accumulatedDepreciation: number; netBookValue: number; salvageValue: number;
    assetAccountId: string; accumAccountId: string; status: string;
}
interface Disposal {
    id: string; assetCode: string; assetName: string; reason: string;
    disposalDate: string; salePrice: number; netBookValue: number;
    gainLoss: number; notes?: string;
}

const fmt = (n: number) => formatNumber(n);
const REASON_COLORS: Record<string, string> = {
    'sale': '#256af4', 'scrap': '#94a3b8', 'gift': '#a78bfa',
    'damage': C.danger, 'other': '#64748b',
};

export default function DisposalsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { symbol: cSymbol } = useCurrency();

    const REASON_LABELS: Record<string, string> = {
        'sale': t('بيع'),
        'scrap': t('خردة'),
        'gift': t('هبة'),
        'damage': t('حريق / تلف'),
        'other': t('أخرى')
    };

    const [showModal, setShowModal] = useState(false);
    const [disposals, setDisposals] = useState<Disposal[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [search, setSearch] = useState('');
    const [reasonFilter, setReasonFilter] = useState('all');

    const [assets, setAssets] = useState<FixedAsset[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);
    const [reason, setReason] = useState('sale');
    const [saleDate, setSaleDate] = useState('');
    const [salePrice, setSalePrice] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchDisposals = () => {
        setLoadingList(true);
        fetch('/api/fixed-assets/disposals').then(r => r.json()).then(d => setDisposals(Array.isArray(d) ? d : [])).catch(() => setDisposals([])).finally(() => setLoadingList(false));
    };
    const fetchAssets = () => {
        fetch('/api/fixed-assets?status=active').then(r => r.json()).then(d => setAssets(Array.isArray(d) ? d.filter((a: FixedAsset) => a.status === 'active') : [])).catch(() => setAssets([]));
    };
    useEffect(() => { fetchDisposals(); fetchAssets(); }, []);
    useEffect(() => { setSelectedAsset(assets.find(a => a.id === selectedId) || null); }, [selectedId, assets]);

    const resetForm = () => { setSelectedId(''); setSelectedAsset(null); setReason('sale'); setSaleDate(''); setSalePrice(''); setNotes(''); setError(''); };

    const salePriceNum = parseFloat(salePrice) || 0;
    const netBook = selectedAsset?.netBookValue ?? 0;
    const gainLoss = salePriceNum - netBook;
    const isGain = gainLoss > 0;
    const isLoss = gainLoss < 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!selectedId) { setError(t('يرجى اختيار الأصل المراد استبعاده أولاً')); return; }
        if (!saleDate) { setError(t('حدد تاريخ التخلص أو الاستبعاد')); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/fixed-assets/disposals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId: selectedId, reason, disposalDate: saleDate, salePrice: salePriceNum, gainLoss, notes }),
            });
            if (res.ok) { resetForm(); fetchDisposals(); fetchAssets(); setShowModal(false); }
            else { const d = await res.json(); setError(d.error || t('فشل تسجيل عملية الاستبعاد')); }
        } catch { setError(t('خطأ في الاتصال بالسيرفر، تواصل مع الدعم')); }
        setSaving(false);
    };

    const filtered = disposals.filter(d => (d.assetName || '').includes(search) || (d.assetCode || '').includes(search)).filter(d => reasonFilter === 'all' || d.reason === reasonFilter);
    const totalSales = disposals.reduce((s, d) => s + (d.salePrice || 0), 0);
    const totalNetGainLoss = disposals.reduce((s, d) => s + d.gainLoss, 0);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                
                <PageHeader
                    title={t("استبعاد ومبيعات الأصول")}
                    subtitle={t("سجل حركات بيع الأصول أو تخريدها ونتائج الأرباح والخسائر للعمليات")}
                    icon={ArrowRightLeft}
                    primaryButton={{
                        label: t("تسجيل استبعاد جديد"),
                        icon: Plus,
                        onClick: () => { resetForm(); setShowModal(true); }
                    }}
                />

                {/* KPI Section */}
                {!loadingList && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: t('إجمالي عمليات الاستبعاد'), val: disposals.length, color: C.blue, icon: <ArrowRightLeft size={18} />, isCount: true },
                            { label: t('إجمالي عوائد المبيعات'), val: totalSales, color: '#10b981', icon: <TrendingUp size={18} /> },
                            { label: t('نتائج الاستبعاد (أرباح/خسائر)'), val: totalNetGainLoss, color: totalNetGainLoss >= 0 ? '#10b981' : C.danger, icon: <PieChart size={18} /> },
                            { label: t('أصول معدومة ماليّاً'), val: disposals.filter(d => d.reason === 'scrap').length, color: '#f59e0b', icon: <MinusCircle size={18} />, isCount: true },
                        ].map((s, i) => (
                            <div key={i} style={{ 
                                background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                                padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.2s', position: 'relative'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = `${s.color}15`}
                            onMouseLeave={e => e.currentTarget.style.background = `${s.color}08`}
                            >
                                <div style={{ textAlign: 'start' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', whiteSpace: 'nowrap', fontFamily: CAIRO }}>{s.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                        <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{formatNumber(s.val)}</span>
                                        {!s.isCount && <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{cSymbol}</span>}
                                    </div>
                                </div>
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                    {s.icon}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters Row */}
                <div style={{ ...SEARCH_STYLE.container, marginBottom: '16px' }}>
                    <div style={{ ...SEARCH_STYLE.wrapper, flex: 1 }}>
                        <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.textMuted)} />
                        <input value={search} onChange={e => setSearch(e.target.value)} 
                            placeholder={t("ابحث باسم الأصل المستبعد أو الكود...")} 
                            style={SEARCH_STYLE.input} 
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', background: THEME.colors.card, padding: '4px', borderRadius: '12px', border: `1px solid ${C.border}`, height: SEARCH_STYLE.input.height, boxSizing: 'border-box', alignItems: 'center' }}>
                        {['all', ...Object.keys(REASON_LABELS)].map(r => (
                            <button key={r} onClick={() => setReasonFilter(r)} style={{
                                padding: '0 14px', height: '100%', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: 600, fontFamily: CAIRO,
                                cursor: 'pointer', transition: 'all 0.2s',
                                background: reasonFilter === r ? (REASON_COLORS[r] || C.blue) : 'transparent',
                                color: reasonFilter === r ? '#fff' : C.textMuted,
                            }}>
                                {r === 'all' ? t('الكل') : REASON_LABELS[r]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div style={TABLE_STYLE.container}>
                    <table style={TABLE_STYLE.table}>
                        <thead>
                            <tr style={TABLE_STYLE.thead}>
                                <th style={TABLE_STYLE.th(true)}>{t('الأصل الثابت')}</th>
                                <th style={TABLE_STYLE.th(false)}>{t('السبب')}</th>
                                <th style={TABLE_STYLE.th(false)}>{t('تاريخ الاستبعاد')}</th>
                                <th style={{ ...TABLE_STYLE.th(false, true), textAlign: 'center' }}>{t('العائد / البيع')}</th>
                                <th style={{ ...TABLE_STYLE.th(false, true), textAlign: 'center' }}>{t('القيمة الدفترية')}</th>
                                <th style={{ ...TABLE_STYLE.th(false, true), textAlign: 'center' }}>{t('نتيجة التخلص')}</th>
                                <th style={TABLE_STYLE.th(false)}>{t('ملاحظات')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingList ? (
                                <tr><td colSpan={7} style={{ padding: '80px', }}><Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', color: C.primary, margin: '0 auto' }} /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: '80px',  color: C.textMuted, fontFamily: CAIRO, fontWeight: 600, textAlign: 'center' }}>{t('لا توجد عمليات مبيعات أو استبعاد مسجلة حاليّاً')}</td></tr>
                            ) : filtered.map((d, i) => {
                                const isG = d.gainLoss > 0;
                                return (
                                    <tr key={d.id} style={TABLE_STYLE.row(i === filtered.length - 1)} onMouseEnter={e => e.currentTarget.style.background = C.hover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={TABLE_STYLE.td(true)}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{d.assetName}</div>
                                            <div style={{ fontSize: '10px', color: C.blue, fontFamily: OUTFIT, fontWeight: 700, marginTop: '2px' }}>{d.assetCode}</div>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <span style={{ fontSize: '10px', fontWeight: 600, padding: '4px 10px', borderRadius: '12px', background: `${REASON_COLORS[d.reason] || '#64748b'}15`, color: REASON_COLORS[d.reason] || '#64748b', border: `1px solid ${REASON_COLORS[d.reason] || '#64748b'}25`, fontFamily: CAIRO }}>
                                                {REASON_LABELS[d.reason] || d.reason}
                                            </span>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), color: C.textMuted, fontFamily: OUTFIT }}>{new Date(d.disposalDate).toLocaleDateString('ar-EG-u-nu-latn')}</td>
                                        <td style={{ ...TABLE_STYLE.td(false, true), textAlign: 'center' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT }}><Currency amount={d.salePrice} /></div>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false, true), textAlign: 'center' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: C.textSecondary, fontFamily: OUTFIT }}><Currency amount={d.netBookValue} /></div>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false, true), textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 950, color: d.gainLoss >= 0 ? '#10b981' : C.danger }}>
                                                {d.gainLoss >= 0 ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                                                <Currency amount={Math.abs(d.gainLoss)} />
                                            </div>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), color: C.textMuted, maxWidth: '180px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', fontFamily: CAIRO }}>{d.notes || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Disposal Modal */}
                <AppModal show={showModal} onClose={() => setShowModal(false)} title={t("تسجيل عملية استبعاد / بيع أصل")} icon={ArrowRightLeft}>
                    <form onSubmit={handleSubmit}>
                        {error && <div style={{ background: `${C.danger}10`, color: C.danger, padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', border: `1px solid ${C.danger}25`, fontWeight: 600, fontFamily: CAIRO }}><AlertTriangle size={14} style={{ marginBottom: '-3px', marginInlineStart: '6px' }} /> {error}</div>}
                        
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: `1px solid ${C.border}`, marginBottom: '20px' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={LS}>{t('اختر الأصل الثابت من النشط')}</label>
                                <CustomSelect value={selectedId} onChange={setSelectedId} icon={Briefcase} placeholder={t("-- اختر الأصل --")} options={assets.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={LS}>{t('سبب التخلص')}</label>
                                    <CustomSelect value={reason} onChange={setReason} options={Object.entries(REASON_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
                                </div>
                                <div>
                                    <label style={LS}>{t('تاريخ العملية')}</label>
                                    <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} style={{ ...IS, fontFamily: OUTFIT}} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>
                            
                            <div style={{ position: 'relative', marginTop: '16px' }}>
                                <label style={LS}>{t('مبلغ الاستلام / سعر البيع')}</label>
                                <div style={{ position: 'relative' }}>
                                    <input 
                                        type="number" step="0.01" 
                                        value={salePrice} 
                                        onChange={e => setSalePrice(e.target.value)} 
                                        style={{ ...IS, paddingInlineEnd: '40px', fontFamily: OUTFIT, fontWeight: 700 }} 
                                        onFocus={focusIn} onBlur={focusOut} 
                                        placeholder="0.00"
                                    />
                                    <span style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: C.textMuted, fontFamily: CAIRO }}>{cSymbol}</span>
                                </div>
                            </div>
                        </div>

                        {selectedAsset && (
                            <div style={{ padding: '16px', background: isGain ? '#10b98108' : isLoss ? `${C.danger}08` : 'rgba(255,255,255,0.02)', borderRadius: '16px', border: `1px solid ${isGain ? '#10b98133' : isLoss ? `${C.danger}33` : C.border}`, marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                                    <h5 style={{ margin: 0, fontSize: '13px', color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO }}>{t('معاينة نتائج الاستبعاد')}:</h5>
                                    <span style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{t('الصافي الدفتري الحالي')}: <b style={{ fontFamily: OUTFIT }}>{fmt(selectedAsset.netBookValue)}</b></span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ textAlign: 'start' }}>
                                        <div style={{ fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{isGain ? t('أرباح رأسمالية مٌحققة') : isLoss ? t('خسائر رأسمالية ناتجة') : t('تعادل دفتري')}</div>
                                        <div style={{ fontSize: '22px', fontWeight: 950, color: isGain ? '#10b981' : isLoss ? C.danger : C.textMuted, direction: 'ltr', fontFamily: OUTFIT }}>{isLoss ? '-' : '+'}{fmt(Math.abs(gainLoss))} <span style={{ fontSize: '11px', fontFamily: CAIRO }}>{cSymbol}</span></div>
                                    </div>
                                    <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: isGain ? '#10b98115' : isLoss ? `${C.danger}15` : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isGain ? '#10b981' : isLoss ? C.danger : C.textMuted }}>
                                        {isGain ? <ArrowUpCircle size={28} /> : isLoss ? <ArrowDownCircle size={28} /> : <MinusCircle size={28} />}
                                    </div>
                                </div>
                                <div style={{ marginTop: '14px', fontSize: '10px', color: C.textMuted, fontFamily: CAIRO, borderTop: `1px solid ${C.border}`, paddingTop: '10px' }}>
                                    {t('سيتم إثبات العائد في {target} وإقفال حساب مجمع الإهلاك وتكلفة الأصل.').replace('{target}', reason === 'sale' ? t('نقدية الصندوق') : t('حسابات المصروفات'))}
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '24px' }}>
                            <label style={LS}>{t('ملاحظات الاستبعاد')}</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...IS, height: 'auto', padding: '10px' } as any} onFocus={focusIn} onBlur={focusOut} />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={saving || !selectedAsset} style={{ ...BTN_PRIMARY(false, saving || !selectedAsset), flex: 1.5, height: '48px' }}>
                                {saving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : <CheckCircle2 size={18} />}
                                <span style={{ marginInlineEnd: '8px', fontWeight: 600 }}>{t('تأكيد وترحيل عملية الاستبعاد')}</span>
                            </button>
                            <button type="button" onClick={() => setShowModal(false)} style={{ height: '48px', padding: '0 20px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>{t('إلغاء')}</button>
                        </div>
                    </form>
                </AppModal>

            </div>
            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
        </DashboardLayout>
    );
}
