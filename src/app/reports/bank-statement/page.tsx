'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, IS, INTER } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import ReportHeader from '@/components/ReportHeader';
import {
    Search, Landmark, Loader2, FileText,
    History, TrendingUp, TrendingDown
} from 'lucide-react';
import * as XLSX from 'xlsx';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const SC = '#10b981';
const DC = '#ef4444';

type StatementMovementType = 'receipt' | 'payment' | string;

interface TreasuryOption {
    id: string;
    name: string;
    type: string;
}

interface StatementMovement {
    id: string;
    date: string;
    party: string;
    description: string;
    amount: number;
    type: StatementMovementType;
}

interface StatementData {
    openingBalance: number;
    currentBalance: number;
    treasuryName?: string;
    movements: StatementMovement[];
}

interface MovementWithBalance extends StatementMovement {
    balanceBefore: number;
    balanceAfter: number;
}

interface SummaryCard {
    label: string;
    value: number;
    color: string;
    icon: React.ReactNode;
    sign: string;
}

export default function BankStatementPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [treasuries, setTreasuries] = useState<TreasuryOption[]>([]);
    const [data, setData] = useState<StatementData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchTreasuries = async () => {
            try {
                const res = await fetch('/api/treasuries');
                if (res.ok) {
                    const all = await res.json();
                    setTreasuries(Array.isArray(all) ? all.filter((treasury: TreasuryOption) => treasury.type === 'bank') : []);
                }
            } catch { }
        };
        fetchTreasuries();
    }, []);

    const fetchReport = useCallback(async (id: string = selectedId) => {
        if (!id) { setData(null); return; }
        setLoading(true);
        try {
            const params = new URLSearchParams({ treasuryId: id });
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            const res = await fetch(`/api/reports/treasury-bank-report?${params.toString()}`);
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch { 
        } finally { 
            setLoading(false); 
        }
    }, [selectedId, from, to]);

    const movements: MovementWithBalance[] = data ? (() => {
        let running = data.openingBalance;
        return data.movements.map((m) => {
            const before = running;
            if (m.type === 'receipt') running += m.amount;
            else running -= m.amount;
            return { ...m, balanceBefore: before, balanceAfter: running };
        });
    })() : [];
    const totalReceipts = data?.movements.reduce((sum, m) => (m.type === 'receipt' ? sum + m.amount : sum), 0) || 0;
    const totalPayments = data?.movements.reduce((sum, m) => (m.type === 'payment' ? sum + m.amount : sum), 0) || 0;
    const sym = getCurrencyName(currency);

    const exportToExcel = () => {
        if (!data || !movements.length) return;
        const excelData = [
            {
                [t('التاريخ')]: '—',
                [t('البيان / الجهة')]: t('رصيد بنكي منقول (قبل الفترة)'),
                [t('الرصيد قبل')]: '—',
                [t('إيداع (+)')]: '—',
                [t('سحب (-)')]: '—',
                [t('الرصيد بعد')]: data.openingBalance
            },
            ...movements.map((m) => ({
                [t('التاريخ')]: new Date(m.date).toLocaleDateString('en-GB'),
                [t('البيان / الجهة')]: `${m.party} - ${m.description}`,
                [t('الرصيد قبل')]: m.balanceBefore,
                [t('إيداع (+)')]: m.type === 'receipt' ? m.amount : 0,
                [t('سحب (-)')]: m.type === 'payment' ? m.amount : 0,
                [t('الرصيد بعد')]: m.balanceAfter
            }))
        ];
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('كشف حساب بنكي'));
        XLSX.writeFile(
            wb,
            `${t('كشف_حساب_بنكي')}_${data.treasuryName || 'bank'}_${new Date().toLocaleDateString('en-GB')}.xlsx`
        );
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("كشف حساب بنكي")}
                    subtitle={t("متابعة دقيقة لكافة العمليات البنكية، السحوبات، الإيداعات، والتحويلات المصرفية.")}
                    backTab="treasury-bank"
                    printTitle={data ? t("كشف حساب بنكي") : undefined}
                    accountName={data?.treasuryName}
                    printLabel={t('البنك:')}
                    printDate={from || to ? `${from ? `من ${from}` : ''} ${to ? `إلى ${to}` : ''}`.trim() : undefined}
                    onExportExcel={exportToExcel}
                />


                <div className="no-print" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', width: '100%', padding: 0 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <CustomSelect
                            value={selectedId}
                            onChange={val => { setSelectedId(val); fetchReport(val); }}
                            placeholder={t("اختر الحساب البنكي لمتابعة حركته...")}
                            options={[
                                { value: '', label: `-- ${t('اختر الحساب البنكي من القائمة')} --` },
                                ...treasuries.map(t => ({ value: t.id, label: t.name }))
                            ]}
                            style={{ 
                                width: '100%', height: '42.5px', padding: '0 15px', 
                                borderRadius: '12px', border: `1px solid ${C.border}`, 
                                background: C.card, color: C.textPrimary, fontSize: '13.5px', 
                                fontFamily: CAIRO, fontWeight: 500 
                            }}
                        />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('من:')}</span>
                        <div style={{ width: '160px' }}>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                                style={{ 
                                    ...IS, width: '100%', height: '42px', padding: '0 12px', textAlign: 'start', direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: INTER
                                }}
                            />
                        </div>
                        <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('إلى:')}</span>
                        <div style={{ width: '160px' }}>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)}
                                style={{ 
                                    ...IS, width: '100%', height: '42px', padding: '0 12px', textAlign: 'start', direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: INTER
                                }}
                            />
                        </div>
                        <button onClick={() => fetchReport()} disabled={loading} style={{ 
                            height: '42px', padding: '0 24px', borderRadius: '12px', 
                            background: C.primary, color: '#fff', border: 'none',
                            fontSize: '13.5px', fontWeight: 800, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO,
                            boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                        }}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} 
                            {t('تحديث التقرير')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري سحب كشف الحساب البنكي...')}</span>
                    </div>
                ) : !data ? (
                    <div style={{ padding: '120px', textAlign: 'start', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <Landmark size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('بانتظار اختيار الحساب البنكي')}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, fontFamily: CAIRO }}>{t('يرجى اختيار الحساب البنكي وتحديد الفترة الزمنية لعرض كشف الحركة التفصيلي.')}</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Stats Cards */}
                        <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: t('رصيد مرحل (قبل)'), value: data.openingBalance, color: '#3b82f6', icon: <History size={20} />, sign: t('الرصيد في بداية الفترة') },
                                { label: t('إجمالي الإيداعات'), value: totalReceipts, color: SC, icon: <TrendingUp size={20} />, sign: t('وارد للحساب (+)') },
                                { label: t('إجمالي السحوبات'), value: totalPayments, color: DC, icon: <TrendingDown size={20} />, sign: t('صادر من الحساب (-)') },
                                { label: t('صافي الرصيد البنكي'), value: data.currentBalance, color: data.currentBalance >= 0 ? SC : DC, icon: <FileText size={20} />, sign: t('الرصيد الدفتري الحالي') },
                            ].map((s: SummaryCard, i: number) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s', boxShadow: '0 2px 8px -4px rgba(0,0,0,0.1)'
                                }}>
                                    <div style={{ textAlign: 'start'}}>
                                        <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{s.value.toLocaleString('en-US')}</span>
                                            <span style={{ fontSize: '10.5px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                        </div>
                                        <div style={{ fontSize: '9px', fontWeight: 800, color: s.color, fontFamily: CAIRO, marginTop: '2px' }}>{s.sign}</div>
                                    </div>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                            {[t('التاريخ'), t('بيان العملية / التحويل'), t('الرصيد قبل'), t('إيداع (+)'), t('سحب (-)'), t('الرصيد بعد')].map((h, i) => (
                                                <th key={i} style={{
                                                    padding: '16px 20px', fontSize: '12px', color: C.textSecondary,
                                                    textAlign: 'start',
                                                    fontWeight: 700, fontFamily: CAIRO
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                                            <td colSpan={2} style={{ padding: '14px 20px', textAlign: 'start', fontSize: '13px', color: C.textPrimary, fontWeight: 900, fontFamily: CAIRO }}>{t('رصيد منقول (قبل الفترة المستعرضة)')}</td>
                                            <td style={{ padding: '14px 20px', textAlign: 'start', color: C.textMuted }}>—</td>
                                            <td style={{ padding: '14px 20px', textAlign: 'start', color: C.textMuted }}>—</td>
                                            <td style={{ padding: '14px 20px', textAlign: 'start', color: C.textMuted }}>—</td>
                                            <td style={{ padding: '14px 20px', textAlign: 'start', fontWeight: 900, color: data.openingBalance >= 0 ? SC : DC, fontSize: '14px', fontFamily: INTER }}>{data.openingBalance.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span></td>
                                        </tr>
                                        {movements.map((m, i: number) => (
                                            <tr key={m.id + i} 
                                                style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                <td style={{ padding: '14px 20px', textAlign: 'start', color: C.textMuted, fontSize: '13px', fontFamily: INTER }}>
                                                    {new Date(m.date).toLocaleDateString('en-GB')}
                                                </td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, textAlign: 'start'}}>{m.party}</div>
                                                    <div style={{ fontSize: '11px', color: C.textMuted, textAlign: 'start', fontFamily: CAIRO, marginTop: '2px' }}>{m.description}</div>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'start', color: C.textMuted, fontSize: '14px', fontFamily: INTER }}>{m.balanceBefore.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span></td>
                                                <td style={{ padding: '14px 20px', textAlign: 'start', color: m.type === 'receipt' ? SC : C.textMuted, fontWeight: 900, fontSize: '14px', fontFamily: INTER }}>{m.type === 'receipt' ? <>{m.amount.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span></> : '—'}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'start', color: m.type === 'payment' ? DC : C.textMuted, fontWeight: 900, fontSize: '14px', fontFamily: INTER }}>{m.type === 'payment' ? <>{m.amount.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span></> : '—'}</td>
                                                <td style={{ padding: '14px 20px', textAlign: 'start', fontWeight: 900, color: m.balanceAfter >= 0 ? SC : DC, fontSize: '14px', fontFamily: INTER, background: 'rgba(255,255,255,0.01)' }}>{m.balanceAfter.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
                                        <tr>
                                            <td colSpan={3} style={{ padding: '20px 24px', textAlign: 'start', fontSize: '13px', color: C.textPrimary, fontWeight: 900, fontFamily: CAIRO }}>{t('تحليل الحركة البنكية الكلية')}</td>
                                            <td style={{ padding: '20px 20px', textAlign: 'start', color: SC, fontSize: '14px', fontWeight: 900, fontFamily: INTER }}>+{totalReceipts.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span></td>
                                            <td style={{ padding: '20px 20px', textAlign: 'start', color: DC, fontSize: '14px', fontWeight: 900, fontFamily: INTER }}>-{totalPayments.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span></td>
                                            <td style={{ padding: '20px 24px', textAlign: 'start', color: C.textPrimary, fontSize: '14px', fontWeight: 900, fontFamily: INTER, background: 'rgba(255,255,255,0.02)' }}>{data.currentBalance.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
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
                    div, span, h2, h3, p { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; border: 1px solid #e2e8f0 !important; }
                }
                input[type="date"]::-webkit-calendar-picker-indicator { filter: brightness(0) saturate(100%) invert(67%) sepia(43%) saturate(1042%) hue-rotate(186deg) brightness(103%) contrast(97%); cursor: pointer; }
            `}</style>
        </DashboardLayout>
    );
}


