'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};
import { C, CAIRO, PAGE_BASE } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { Calendar, Search, Printer, Download, Landmark, Wallet, ArrowUpRight, ArrowDownRight, Activity, FileText, ChevronDown, Loader2 } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

const PC = '#4f46e5';
const SC = '#10b981';
const DC = '#ef4444';

interface TreasuryOption {
    id: string;
    name: string;
    type: string;
}

interface Movement {
    id: string;
    date: string;
    type: 'receipt' | 'payment' | string;
    description: string;
    party: string;
    amount: number;
}

interface MovementWithBalance extends Movement {
    runningBalance: number;
}

interface TreasuryReportData {
    openingBalance: number;
    currentBalance: number;
    treasuryName: string;
    movements: Movement[];
}

export default function TreasuryBankReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const { symbol: cSymbol, fMoneyJSX } = useCurrency();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [selectedTreasuryId, setSelectedTreasuryId] = useState('');
    const [treasuries, setTreasuries] = useState<TreasuryOption[]>([]);
    const [data, setData] = useState<TreasuryReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetchingTreasuries, setFetchingTreasuries] = useState(true);

    useEffect(() => {
        const fetchTreasuries = async () => {
            try {
                const res = await fetch('/api/treasuries');
                if (res.ok) setTreasuries(await res.json());
            } catch { } finally { setFetchingTreasuries(false); }
        };
        fetchTreasuries();
    }, []);

    const fetchReport = async () => {
        if (!selectedTreasuryId) {
            alert(t('يرجى اختيار الخزينة أو البنك أولاً'));
            return;
        }
        setLoading(true);
        try {
            const params = new URLSearchParams({ treasuryId: selectedTreasuryId });
            if (from) params.set('from', from);
            if (to) params.set('to', to);

            const res = await fetch(`/api/reports/treasury-bank-report?${params}`);
            if (res.ok) setData(await res.json());
        } catch { alert(t('فشل الاتصال بالخادم')); }
        finally { setLoading(false); }
    };

    const handlePrint = () => window.print();

    // Calculate Running Balance
    const getRunningMovements = (): MovementWithBalance[] => {
        if (!data) return [];
        let balance = data.openingBalance;
        return data.movements.map((m) => {
            if (m.type === 'receipt') balance += m.amount;
            else balance -= m.amount;
            return { ...m, runningBalance: balance };
        });
    };

    const movements = getRunningMovements();
    const totalReceipts = data?.movements.filter((m) => m.type === 'receipt').reduce((sum, m) => sum + m.amount, 0) || 0;
    const totalPayments = data?.movements.filter((m) => m.type === 'payment').reduce((sum, m) => sum + m.amount, 0) || 0;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ width: '100%', paddingBottom: '60px' }}>
                <ReportHeader
                    title={t("كشف حساب الخزن والبنوك")}
                    subtitle={t("تحليل تفصيلي للحركات المالية والمقبوضات والمدفوعات لكل خزينة أو حساب بنكي.")}
                    backTab="financial"
                    printTitle={t("كشف حركة الخزينة")}
                    accountName={data ? data.treasuryName : undefined}
                    printLabel={t('الخزينة:')}
                    printDate={from || to ? `${from ? `من ${from}` : ''} ${to ? `إلى ${to}` : ''}`.trim() : undefined}
                />

                {/* Filters */}
                <div className="no-print" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <label style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#94a3b8', fontFamily: CAIRO, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{t('اختر الخزينة / البنك')}</label>
                            <select
                                value={selectedTreasuryId}
                                onChange={(e) => setSelectedTreasuryId(e.target.value)}
                                style={{ flex: 1, height: '42px', padding: '0 15px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: '#fff', fontSize: '12px', outline: 'none', fontFamily: CAIRO }}
                            >
                                <option value="" style={{ background: '#1e293b' }}>{t('اختر المرجع المالي...')}</option>
                                {treasuries.map(t_sys => (
                                    <option key={t_sys.id} value={t_sys.id} style={{ background: '#1e293b' }}>{t_sys.name} ({t_sys.type === 'bank' ? t('بنك') : t('خزينة')})</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <label style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#94a3b8', fontFamily: CAIRO, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{t('من')}</label>
                            <div style={{ flex: 1 }}>
                                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: '100%', height: '42px', padding: '0 15px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: '#fff', direction: 'ltr', textAlign: 'start', colorScheme: 'dark' }} />
                            </div>
                        </div>
                        <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <label style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#94a3b8', fontFamily: CAIRO, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{t('إلى')}</label>
                            <div style={{ flex: 1 }}>
                                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: '100%', height: '42px', padding: '0 15px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, color: '#fff', direction: 'ltr', textAlign: 'start', colorScheme: 'dark' }} />
                            </div>
                        </div>
                        <button onClick={fetchReport} className="btn btn-primary" style={{ height: '42px', padding: '0 30px', fontWeight: 800, gap: '10px', borderRadius: '12px', fontFamily: CAIRO, display: 'flex', alignItems: 'center' }}>
                            <Search size={18} /> {t('عرض التقرير')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '100px', textAlign: 'start'}}>
                        <Loader2 size={40} className="animate-spin" style={{ color: PC }} />
                        <p style={{ marginTop: '20px', color: '#64748b' }}>{t('جاري استخراج كشف الحساب...')}</p>
                    </div>
                ) : !data ? (
                    <div style={{ padding: '80px', textAlign: 'start', background: C.card, borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <FileText size={60} style={{ opacity: 0.1, marginBottom: '20px' }} />
                        <h3 style={{ color: '#64748b', fontSize: '15px' , fontFamily: CAIRO}}>{t('يرجى اختيار الخزينة وتحديد الفترة لعرض التقرير')}</h3>
                    </div>
                ) : (
                    <div>
                        {/* Summary Header */}
                        <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                            <div className="card" style={{ padding: '20px', borderInlineEnd: `4px solid #64748b` }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px' , fontFamily: CAIRO}}>{t('رصيد أول المدة')}</div>
                                <div style={{ fontSize: '12px', fontWeight: 900, color: '#fff' , fontFamily: CAIRO}}>{data.openingBalance.toLocaleString('en-US')} {cSymbol}</div>
                            </div>
                            <div className="card" style={{ padding: '20px', borderInlineEnd: `4px solid ${SC}` }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px' , fontFamily: CAIRO}}>{t('إجمالي المقبوضات (وارد)')}</div>
                                <div style={{ fontSize: '12px', fontWeight: 900, color: SC , fontFamily: CAIRO}}>+ {totalReceipts.toLocaleString('en-US')}</div>
                            </div>
                            <div className="card" style={{ padding: '20px', borderInlineEnd: `4px solid ${DC}` }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px' , fontFamily: CAIRO}}>{t('إجمالي المدفوعات (صادر)')}</div>
                                <div style={{ fontSize: '12px', fontWeight: 900, color: DC , fontFamily: CAIRO}}>- {totalPayments.toLocaleString('en-US')}</div>
                            </div>
                            <div className="card" style={{ padding: '20px', borderInlineEnd: `4px solid ${PC}`, background: 'rgba(79, 70, 229, 0.05)' }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px' , fontFamily: CAIRO}}>{t('الرصيد الحالي')}</div>
                                <div style={{ fontSize: '12px', fontWeight: 950, color: PC , fontFamily: CAIRO}}>{data.currentBalance.toLocaleString('en-US')} {cSymbol}</div>
                            </div>
                        </div>

                        {/* Movements Table */}
                        <div className="print-table-container table-container shadow-xl" style={{ background: C.card, borderRadius: '18px', overflow: 'hidden', border: `1px solid ${C.border}` }}>
                            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#f1f5f9' , fontFamily: CAIRO}}>{t('حركات')} {data.treasuryName}</h3>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 , fontFamily: CAIRO}}>{t('إجمالي')} {data.movements.length} {t('حركة مسجلة')}</div>
                            </div>
                            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                        <th style={{ padding: '16px', fontSize: '12px',  color: '#94a3b8' , fontFamily: CAIRO}}>{t('التاريخ')}</th>
                                        <th style={{ padding: '16px', fontSize: '12px',  color: '#94a3b8' , fontFamily: CAIRO}}>{t('النوع')}</th>
                                        <th style={{ padding: '16px', fontSize: '12px',  color: '#94a3b8' , fontFamily: CAIRO}}>{t('البيان')}</th>
                                        <th style={{ padding: '16px', fontSize: '12px',  color: '#94a3b8' , fontFamily: CAIRO}}>{t('الجهة')}</th>
                                        <th style={{ padding: '16px', fontSize: '12px',  color: '#22c55e' , fontFamily: CAIRO}}>{t('مدين (+)')}</th>
                                        <th style={{ padding: '16px', fontSize: '12px',  color: '#ef4444' , fontFamily: CAIRO}}>{t('دائن (-)')}</th>
                                        <th style={{ padding: '16px', fontSize: '12px',  color: '#fff' , fontFamily: CAIRO}}>{t('الرصيد')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td colSpan={4} style={{ padding: '12px 24px', fontWeight: 700, color: '#64748b' , fontFamily: CAIRO}}>{t('رصيد افتتاحي (ما قبـل الفترة)')}</td>
                                        <td colSpan={2} style={{ padding: '12px 24px',  fontWeight: 900, color: '#94a3b8' , fontFamily: CAIRO}}></td>
                                        <td style={{ padding: '12px 24px',  fontWeight: 900, color: '#fff' , fontFamily: CAIRO}}>{data.openingBalance.toLocaleString('en-US')}</td>
                                    </tr>
                                    {movements.map((m) => (
                                        <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8' , fontFamily: CAIRO}}>{new Date(m.date).toLocaleDateString('en-GB')}</td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{
                                                    padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800,
                                                    background: m.type === 'receipt' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                    color: m.type === 'receipt' ? SC : DC
                                                }}>
                                                    {m.type === 'receipt' ? t('سند قبض') : t('سند صرف')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '12px', color: '#e2e8f0' , fontFamily: CAIRO}}>{m.description}</td>
                                            <td style={{ padding: '14px 16px', fontSize: '12px', color: '#94a3b8' , fontFamily: CAIRO}}>{m.party}</td>
                                            <td style={{ padding: '14px 16px',  fontSize: '12px', fontWeight: 800, color: SC , fontFamily: CAIRO}}>
                                                {m.type === 'receipt' ? m.amount.toLocaleString('en-US') : ''}
                                            </td>
                                            <td style={{ padding: '14px 16px',  fontSize: '12px', fontWeight: 800, color: DC , fontFamily: CAIRO}}>
                                                {m.type === 'payment' ? m.amount.toLocaleString('en-US') : ''}
                                            </td>
                                            <td style={{ padding: '14px 16px',  fontSize: '15px', fontWeight: 900, color: '#fff', background: 'rgba(255,255,255,0.01)' , fontFamily: CAIRO}}>
                                                {m.runningBalance.toLocaleString('en-US')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot style={{ background: 'rgba(255,255,255,0.03)', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                                    <tr style={{ fontWeight: 950 , fontFamily: CAIRO}}>
                                        <td colSpan={4} style={{ padding: '20px', }}>{t('إجماليات الحركات المحددة')}</td>
                                        <td style={{ padding: '20px',  color: SC }}>{fMoneyJSX(totalReceipts)}</td>
                                        <td style={{ padding: '20px',  color: DC }}>{fMoneyJSX(totalPayments)}</td>
                                        <td style={{ padding: '20px',  color: PC, fontSize: '12px' , fontFamily: CAIRO}}>{data.currentBalance.toLocaleString('en-US')} {cSymbol}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @media print {
                    .no-print { display: none !important; }
                    body { background: #fff !important; color: #000 !important; }
                    .card { border: 1px solid #eee !important; box-shadow: none !important; }
                    .table-container { border: 1px solid #eee !important; box-shadow: none !important; }
                    th, td { color: #000 !important; border-bottom: 1px solid #eee !important; }
                    h3, h1, p { color: #000 !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}

