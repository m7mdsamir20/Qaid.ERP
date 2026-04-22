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
    Search, Loader2, FileText, ShieldCheck,
    History as HistoryIcon, Save, ClipboardList
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCurrency } from '@/hooks/useCurrency';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const SC = '#10b981';
const DC = '#ef4444';

interface TreasuryItem { id: string; name: string; type: string; balance: number; }
interface Snapshot {
    id: string; createdAt: string; notes: string | null;
    totalSystem: number; totalPhysical: number; totalShortage: number; totalSurplus: number;
    items: { treasuryName: string; type: string; systemBalance: number; physicalBalance: number; diff: number; status: string }[];
}

export default function TreasuryReconciliationPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';
    const { fMoney } = useCurrency();

    const [tab, setTab] = useState<'new' | 'history'>('new');
    const [treasuries, setTreasuries] = useState<TreasuryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [physicalBalances, setPhysicalBalances] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState('');
    const [q, setQ] = useState('');
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [snapshotsLoading, setSnapshotsLoading] = useState(false);
    const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
    const [historyQ, setHistoryQ] = useState('');

    const fetchTreasuries = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/treasuries');
            if (res.ok) setTreasuries(await res.json());
        } catch { } finally { setLoading(false); }
    };

    const fetchSnapshots = async () => {
        setSnapshotsLoading(true);
        try {
            const res = await fetch('/api/reports/reconciliation-snapshots');
            if (res.ok) setSnapshots(await res.json());
        } catch { } finally { setSnapshotsLoading(false); }
    };

    useEffect(() => { fetchTreasuries(); }, []);
    useEffect(() => { if (tab === 'history') fetchSnapshots(); }, [tab]);

    const filtered = treasuries.filter(t => t.name.toLowerCase().includes(q.toLowerCase()));
    const sym = getCurrencyName(currency);

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

    const handleSave = async () => {
        const hasAny = treasuries.some(t => physicalBalances[t.id] !== undefined && physicalBalances[t.id] !== '');
        if (!hasAny) { alert(t('أدخل رصيداً فعلياً لخزينة واحدة على الأقل')); return; }
        setSaving(true);
        try {
            const items = treasuries.map(t => {
                const sys = t.balance;
                const act = parseFloat(physicalBalances[t.id]) || 0;
                const hasAct = physicalBalances[t.id] !== undefined && physicalBalances[t.id] !== '';
                const diff = hasAct ? act - sys : 0;
                return {
                    treasuryId: t.id, treasuryName: t.name, type: t.type,
                    systemBalance: sys, physicalBalance: hasAct ? act : null,
                    diff: hasAct ? diff : null,
                    status: !hasAct ? 'not_counted' : diff === 0 ? 'matched' : diff < 0 ? 'shortage' : 'surplus'
                };
            });
            const body = {
                notes: notes || null, items,
                totalSystem: totals.systemTotal,
                totalPhysical: totals.actualTotal,
                totalShortage: totals.totalShortage,
                totalSurplus: totals.totalSurplus,
            };
            const res = await fetch('/api/reports/reconciliation-snapshots', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
            });
            if (res.ok) {
                alert(t('تم حفظ نتيجة الجرد بنجاح'));
                setPhysicalBalances({});
                setNotes('');
                setTab('history');
            } else { alert(t('فشل في حفظ الجرد')); }
        } catch { alert(t('خطأ في الاتصال')); } finally { setSaving(false); }
    };

    const exportToExcel = () => {
        if (!treasuries.length) return;
        const excelData = treasuries.map(tData => {
            const sys = tData.balance;
            const act = parseFloat(physicalBalances[tData.id]) || 0;
            const diff = act - sys;
            const hasActual = physicalBalances[tData.id] !== undefined && physicalBalances[tData.id] !== '';
            return {
                [t('اسم الخزينة')]: tData.name,
                [t('النوع')]: tData.type === 'bank' ? t('بنكي') : t('نقدي'),
                [t('الرصيد الدفتري')]: sys,
                [t('الرصيد الفعلي')]: hasActual ? act : t('لم يجرد'),
                [t('الفارق')]: hasActual ? diff : '—',
                [t('الحالة')]: !hasActual ? t('غير مجرود') : (diff === 0 ? t('مطابق') : (diff < 0 ? t('عجز') : t('زيادة')))
            };
        });
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('تقرير العجز والزيادة'));
        XLSX.writeFile(wb, `${t('تقرير_الجرد')}_${new Date().toLocaleDateString('en-GB')}.xlsx`);
    };

    const filteredSnapshots = snapshots.filter(s =>
        !historyQ ||
        new Date(s.createdAt).toLocaleDateString('en-GB').includes(historyQ) ||
        (s.notes || '').toLowerCase().includes(historyQ.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير الجرد والعجز والزيادة")}
                    subtitle={t("مطابقة الأرصدة الفعلية بالأرصدة الدفترية للخزن والحسابات البنكية.")}
                    backTab="treasury-bank"
                    onExportExcel={tab === 'new' ? exportToExcel : undefined}
                    printTitle={tab === 'history' && selectedSnapshot ? t("تقرير الجرد والعجز والزيادة") : undefined}
                    printDate={tab === 'history' && selectedSnapshot ? new Date(selectedSnapshot.createdAt).toLocaleDateString('ar-EG') : undefined}
                />

                {/* Tabs */}
                <div className="no-print" style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    {([['new', 'جرد جديد', <Activity size={15} />], ['history', 'سجل الجرد', <ClipboardList size={15} />]] as const).map(([key, label, icon]) => (
                        <button key={key} onClick={() => setTab(key)} style={{
                            height: '40px', padding: '0 20px', borderRadius: '10px',
                            background: tab === key ? C.primary : 'transparent',
                            color: tab === key ? '#fff' : C.textSecondary,
                            border: `1px solid ${tab === key ? C.primary : C.border}`,
                            fontSize: '13px', fontWeight: 800, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO
                        }}>
                            {icon} {t(label as string)}
                        </button>
                    ))}
                </div>

                {tab === 'new' ? (
                    <>
                        {/* Summary Cards */}
                        <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: t('إجمالي الرصيد الدفتري'), value: totals.systemTotal, color: '#3b82f6', icon: <HistoryIcon size={20} />, sign: t('المسجل في النظام') },
                                { label: t('إجمالي العجز المكتشف'), value: totals.totalShortage, color: DC, icon: <TrendingDown size={20} />, sign: t('نقص في الأرصدة (-)') },
                                { label: t('إجمالي الزيادة المكتشفة'), value: totals.totalSurplus, color: SC, icon: <TrendingUp size={20} />, sign: t('زيادة في الأرصدة (+)') },
                                { label: t('نسبة الجرد المكتملة'), value: treasuries.length > 0 ? (totals.reconciledCount / treasuries.length * 100) : 0, isPercent: true, color: '#a855f7', icon: <ShieldCheck size={20} />, sign: `${totals.reconciledCount} ${t('من أصل')} ${treasuries.length}` },
                            ].map((s, i) => (
                                <div key={i} style={{ background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ textAlign: 'start'}}>
                                        <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{s.isPercent ? (s.value as number).toFixed(0) : (s.value as number).toLocaleString('en-US')}</span>
                                            <span style={{ fontSize: '10.5px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{s.isPercent ? '%' : sym}</span>
                                        </div>
                                        <div style={{ fontSize: '9px', fontWeight: 800, color: s.color, fontFamily: CAIRO, marginTop: '2px' }}>{s.sign}</div>
                                    </div>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
                                </div>
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                                <input placeholder={t("ابحث باسم الخزينة...")} value={q} onChange={e => setQ(e.target.value)}
                                    style={{ ...IS, width: '100%', height: '40px', padding: '0 14px 0 40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '13px', outline: 'none', fontFamily: CAIRO }} />
                            </div>
                            <input placeholder={t("ملاحظات (اختياري)...")} value={notes} onChange={e => setNotes(e.target.value)}
                                style={{ ...IS, flex: 2, height: '40px', padding: '0 14px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '13px', outline: 'none', fontFamily: CAIRO }} />
                            <button onClick={fetchTreasuries} style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t('تحديث')}
                            </button>
                            <button onClick={handleSave} disabled={saving} style={{ height: '40px', padding: '0 20px', borderRadius: '10px', background: SC, color: '#fff', border: 'none', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {t('حفظ الجرد')}
                            </button>
                        </div>

                        {/* Table */}
                        {loading ? (
                            <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                                <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                            </div>
                        ) : (
                            <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                                {[t('المرجع المالي'), t('النوع'), t('الرصيد الدفتري'), t('الرصيد الفعلي (عَدّ يدوي)'), t('الفارق (عجز/زيادة)'), t('حالة الجرد')].map((h, i) => (
                                                    <th key={i} style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary, textAlign: 'start', fontWeight: 800, fontFamily: CAIRO }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.map((tData, idx) => {
                                                const sys = tData.balance;
                                                const act = parseFloat(physicalBalances[tData.id]) || 0;
                                                const diff = act - sys;
                                                const hasActual = physicalBalances[tData.id] !== undefined && physicalBalances[tData.id] !== '';
                                                return (
                                                    <tr key={tData.id} style={{ borderBottom: `1px solid ${C.border}`, background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                        <td style={{ padding: '14px 20px' }}>
                                                            <div style={{ fontSize: '13.5px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO, textAlign: 'start'}}>{tData.name}</div>
                                                            <div style={{ fontSize: '11px', color: C.textMuted, textAlign: 'start', fontFamily: INTER }}>ID: {tData.id.substring(0, 8)}</div>
                                                        </td>
                                                        <td style={{ padding: '14px 20px', textAlign: 'start'}}>
                                                            {tData.type === 'bank'
                                                                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#6366f1', padding: '4px 10px', borderRadius: '8px', background: 'rgba(99,102,241,0.1)', fontSize: '11px', fontWeight: 800, fontFamily: CAIRO }}><Landmark size={14} /> {t('بنكي')}</span>
                                                                : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: SC, padding: '4px 10px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', fontSize: '11px', fontWeight: 800, fontFamily: CAIRO }}><Wallet size={14} /> {t('نقدي')}</span>}
                                                        </td>
                                                        <td style={{ padding: '14px 20px', textAlign: 'start', fontWeight: 900, fontSize: '14.5px', fontFamily: INTER, color: C.textPrimary }}>
                                                            {sys.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '10px' }}>{sym}</span>
                                                        </td>
                                                        <td style={{ padding: '14px 20px', textAlign: 'start'}}>
                                                            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                                                <input type="number" placeholder={t("أدخل المبلغ...")}
                                                                    value={physicalBalances[tData.id] || ''}
                                                                    onChange={e => setPhysicalBalances(prev => ({ ...prev, [tData.id]: e.target.value }))}
                                                                    style={{ width: '140px', height: '36px', textAlign: 'start', borderRadius: '8px', border: `1px solid ${hasActual ? C.primary : C.border}`, background: hasActual ? `${C.primary}08` : C.card, color: C.textPrimary, fontSize: '13px', fontWeight: 800, fontFamily: INTER, outline: 'none' }} />
                                                            </div>
                                                            <div className="print-only" style={{ display: 'none', fontWeight: 900, fontFamily: INTER, textAlign: 'start'}}>
                                                                {hasActual ? <>{act.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '10px' }}>{sym}</span></> : '—'}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '14px 20px', textAlign: 'start', fontWeight: 1000, color: !hasActual ? C.textMuted : (diff > 0 ? SC : diff < 0 ? DC : C.primary), fontSize: '15px', fontFamily: INTER }}>
                                                            {hasActual ? <>{diff > 0 ? `+${diff.toLocaleString('en-US')}` : diff.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '10px' }}>{sym}</span></> : '—'}
                                                        </td>
                                                        <td style={{ padding: '14px 20px', textAlign: 'start'}}>
                                                            {hasActual
                                                                ? diff === 0
                                                                    ? <span style={{ color: SC, display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 900, fontFamily: CAIRO, background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '8px' }}><CheckCircle2 size={14} /> {t('مطابق')}</span>
                                                                    : diff < 0
                                                                        ? <span style={{ color: DC, display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 900, fontFamily: CAIRO, background: 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: '8px' }}><TrendingDown size={14} /> {t('عجز')}</span>
                                                                        : <span style={{ color: SC, display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 900, fontFamily: CAIRO, background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '8px' }}><TrendingUp size={14} /> {t('زيادة')}</span>
                                                                : <span style={{ color: C.textMuted, fontSize: '11px', fontWeight: 700, fontFamily: CAIRO }}>{t('غير مجرود')}</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* History Tab */
                    <>
                        <div className="no-print" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                                <input placeholder={t("ابحث بالتاريخ أو الملاحظات...")} value={historyQ} onChange={e => setHistoryQ(e.target.value)}
                                    style={{ ...IS, width: '100%', height: '40px', padding: '0 14px 0 40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '13px', outline: 'none', fontFamily: CAIRO }} />
                            </div>
                            <button onClick={fetchSnapshots} style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}>
                                <RefreshCw size={14} className={snapshotsLoading ? 'animate-spin' : ''} /> {t('تحديث')}
                            </button>
                        </div>

                        {snapshotsLoading ? (
                            <div style={{ padding: '80px', textAlign: 'start'}}><Loader2 size={36} className="animate-spin" style={{ color: C.primary }} /></div>
                        ) : filteredSnapshots.length === 0 ? (
                            <div style={{ padding: '80px', textAlign: 'start', background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px' }}>
                                <FileText size={50} style={{ opacity: 0.1, color: C.primary, marginBottom: '16px' }} />
                                <p style={{ color: C.textMuted, fontFamily: CAIRO, fontWeight: 700 }}>{t('لا توجد سجلات جرد محفوظة')}</p>
                            </div>
                        ) : (
                            <>
                                {/* Snapshot list */}
                                {!selectedSnapshot ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {filteredSnapshots.map(snap => (
                                            <div key={snap.id} onClick={() => setSelectedSnapshot(snap)}
                                                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s' }}
                                                onMouseEnter={e => (e.currentTarget.style.borderColor = C.primary)}
                                                onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}>
                                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                                                        <ClipboardList size={20} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>
                                                            {t('جرد')} — {new Date(snap.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                        </div>
                                                        <div style={{ fontSize: '11.5px', color: C.textMuted, fontFamily: CAIRO, marginTop: '2px' }}>
                                                            {new Date(snap.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                                            {snap.notes && ` — ${snap.notes}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                                    {snap.totalShortage > 0 && <span style={{ fontSize: '12px', color: DC, fontWeight: 800, fontFamily: CAIRO }}>عجز: {snap.totalShortage.toLocaleString('en-US')} {sym}</span>}
                                                    {snap.totalSurplus > 0 && <span style={{ fontSize: '12px', color: SC, fontWeight: 800, fontFamily: CAIRO }}>زيادة: {snap.totalSurplus.toLocaleString('en-US')} {sym}</span>}
                                                    {snap.totalShortage === 0 && snap.totalSurplus === 0 && <span style={{ fontSize: '12px', color: SC, fontWeight: 800, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14} /> {t('مطابق تماماً')}</span>}
                                                    <span style={{ fontSize: '11px', color: C.primary, fontWeight: 700, fontFamily: CAIRO }}>{t('عرض التفاصيل')} ◄</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    /* Snapshot detail view */
                                    <>
                                        <button onClick={() => setSelectedSnapshot(null)} className="no-print"
                                            style={{ marginBottom: '16px', height: '36px', padding: '0 16px', borderRadius: '8px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}>
                                            ◄ {t('رجوع للسجل')}
                                        </button>

                                        <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                                            {[
                                                { label: t('الرصيد الدفتري'), value: selectedSnapshot.totalSystem, color: '#3b82f6', sign: t('المسجل في النظام') },
                                                { label: t('الرصيد الفعلي'), value: selectedSnapshot.totalPhysical, color: C.primary, sign: t('حسب العد') },
                                                { label: t('إجمالي العجز'), value: selectedSnapshot.totalShortage, color: DC, sign: t('نقص (-)') },
                                                { label: t('إجمالي الزيادة'), value: selectedSnapshot.totalSurplus, color: SC, sign: t('زيادة (+)') },
                                            ].map((s, i) => (
                                                <div key={i} style={{ background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px', padding: '16px 20px' }}>
                                                    <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                                    <div style={{ fontSize: '18px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{s.value.toLocaleString('en-US')} <span style={{ fontSize: '10px', fontFamily: CAIRO, color: C.textMuted }}>{sym}</span></div>
                                                    <div style={{ fontSize: '9px', fontWeight: 800, color: s.color, fontFamily: CAIRO, marginTop: '2px' }}>{s.sign}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                                            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontFamily: CAIRO, fontWeight: 800, color: C.textPrimary, fontSize: '13px' }}>
                                                    {t('جرد')} — {new Date(selectedSnapshot.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' } as any)}
                                                </span>
                                                {selectedSnapshot.notes && <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>{selectedSnapshot.notes}</span>}
                                            </div>
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                                            {[t('الخزينة/البنك'), t('النوع'), t('الرصيد الدفتري'), t('الرصيد الفعلي'), t('الفارق'), t('الحالة')].map((h, i) => (
                                                                <th key={i} style={{ padding: '14px 20px', fontSize: '12px', color: C.textSecondary, textAlign: 'start', fontWeight: 800, fontFamily: CAIRO }}>{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(selectedSnapshot.items as any[]).map((item, idx) => (
                                                            <tr key={idx} style={{ borderBottom: `1px solid ${C.border}`, background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                                                <td style={{ padding: '12px 20px', textAlign: 'start', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO, fontSize: '13px' }}>{item.treasuryName}</td>
                                                                <td style={{ padding: '12px 20px', textAlign: 'start'}}>
                                                                    {item.type === 'bank'
                                                                        ? <span style={{ color: '#6366f1', fontSize: '11px', fontWeight: 800, fontFamily: CAIRO }}>{t('بنكي')}</span>
                                                                        : <span style={{ color: SC, fontSize: '11px', fontWeight: 800, fontFamily: CAIRO }}>{t('نقدي')}</span>}
                                                                </td>
                                                                <td style={{ padding: '12px 20px', textAlign: 'start', fontWeight: 800, fontFamily: INTER, color: C.textPrimary }}>{item.systemBalance?.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '10px' }}>{sym}</span></td>
                                                                <td style={{ padding: '12px 20px', textAlign: 'start', fontWeight: 800, fontFamily: INTER, color: C.textPrimary }}>{item.physicalBalance != null ? <>{item.physicalBalance?.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '10px' }}>{sym}</span></> : '—'}</td>
                                                                <td style={{ padding: '12px 20px', textAlign: 'start', fontWeight: 900, fontFamily: INTER, color: item.diff == null ? C.textMuted : item.diff > 0 ? SC : item.diff < 0 ? DC : C.primary, fontSize: '14px' }}>
                                                                    {item.diff != null ? <>{item.diff > 0 ? '+' : ''}{item.diff?.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '10px' }}>{sym}</span></> : '—'}
                                                                </td>
                                                                <td style={{ padding: '12px 20px', textAlign: 'start'}}>
                                                                    {item.status === 'matched' && <span style={{ color: SC, fontSize: '11px', fontWeight: 800, fontFamily: CAIRO, background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '6px' }}>{t('مطابق')}</span>}
                                                                    {item.status === 'shortage' && <span style={{ color: DC, fontSize: '11px', fontWeight: 800, fontFamily: CAIRO, background: 'rgba(239,68,68,0.1)', padding: '3px 8px', borderRadius: '6px' }}>{t('عجز')}</span>}
                                                                    {item.status === 'surplus' && <span style={{ color: SC, fontSize: '11px', fontWeight: 800, fontFamily: CAIRO, background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '6px' }}>{t('زيادة')}</span>}
                                                                    {item.status === 'not_counted' && <span style={{ color: C.textMuted, fontSize: '11px', fontWeight: 700, fontFamily: CAIRO }}>{t('غير مجرود')}</span>}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </>
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
                    div, span, h2, h3, p, strong { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; border: 1px solid #e2e8f0 !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}
