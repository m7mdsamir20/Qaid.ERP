'use client';

import React, { useEffect, useState, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { ScrollText, Search, Loader2, ArrowUpRight, ArrowDownRight, ChevronDown, Calendar, Wallet, Activity, Printer, FileDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { C, CAIRO, PAGE_BASE, SEARCH_STYLE, IS, INTER, KPI_STYLE, KPI_ICON } from '@/constants/theme';

/* ── Types ── */
interface Account { id: string; code: string; name: string; type: string; accountCategory?: string; nature: string; }
interface LedgerLine {
    id: string;
    date: string;
    entryNumber: string;
    description: string;
    reference: string | null;
    debit: number;
    credit: number;
    balance: number;
    costCenter?: { name: string };
}

/* ── Helpers ── */
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const typeColors: Record<string, string> = {
    asset: '#10b981', liability: '#f87171', equity: '#a78bfa', revenue: '#60a5fa', expense: '#fb923c',
};
const typeLabels: Record<string, string> = {
    asset: 'أصول', liability: 'خصوم', equity: 'حقوق ملكية', revenue: 'إيرادات', expense: 'مصروفات',
};

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const IS_LOCAL: React.CSSProperties = {
    width: '100%', height: '42px', padding: '0 14px', textAlign: 'right', direction: 'rtl',
    borderRadius: '10px', border: `1px solid ${C.border}`,
    background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: '12px',
    fontWeight: 500, outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
};
const focusIn = (e: React.FocusEvent<any>) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; };
const focusOut = (e: React.FocusEvent<any>) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; };

export default function GeneralLedgerPage() {
    const { data: session } = useSession();
    const currency = (session?.user as any)?.currency || 'EGP';

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccount, setSelectedAccount] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [lines, setLines] = useState<LedgerLine[]>([]);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [search, setSearch] = useState('');
    const [accountSearch, setAccountSearch] = useState('');
    const [showAccountList, setShowAccountList] = useState(false);

    useEffect(() => {
        fetch('/api/accounts')
            .then(r => r.json())
            .then((data: Account[]) => {
                setAccounts(Array.isArray(data)
                    ? data.filter(a => a.accountCategory === 'detail' || !a.accountCategory)
                    : []);
            })
            .catch(() => { })
            .finally(() => setLoadingAccounts(false));
    }, []);

    const handleFetchLedger = () => {
        if (!selectedAccount) return;
        setLoading(true);
        const params = new URLSearchParams({ accountId: selectedAccount });
        if (fromDate) params.set('from', fromDate);
        if (toDate) params.set('to', toDate);

        fetch(`/api/general-ledger?${params}`)
            .then(r => r.json())
            .then(data => {
                setLines(Array.isArray(data.lines) ? data.lines : []);
                setOpeningBalance(data.openingBalance || 0);
            })
            .catch(() => { setLines([]); setOpeningBalance(0); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { handleFetchLedger(); }, [selectedAccount, fromDate, toDate]);



    const reportRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => window.print();
    const exportToPDF = () => {
        window.print();
    };

    const account = accounts.find(a => a.id === selectedAccount);
    const tColor = account ? (typeColors[account.type] || '#64748b') : '#64748b';

    const filtered = lines.filter(l =>
        l.description.includes(search) ||
        l.entryNumber.includes(search) ||
        (l.reference || '').includes(search)
    );

    const totalDebit = filtered.reduce((s, l) => s + l.debit, 0);
    const totalCredit = filtered.reduce((s, l) => s + l.credit, 0);
    const closingBalance = openingBalance + totalDebit - totalCredit;

    const filteredAccounts = accounts.filter(a =>
        a.name.includes(accountSearch) || a.code.includes(accountSearch)
    ).slice(0, 30);

    return (
        <DashboardLayout>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" async></script>
            <div dir="rtl" style={PAGE_BASE} ref={reportRef}>
                <ReportHeader
                    title="كشف الحساب العام"
                    subtitle="تحليل الحركات المالية والرصيد التفصيلي لأي حساب خلال فترة زمنية محددة."
                    backTab="financial"
                    onExportPdf={exportToPDF}
                />

                <div style={SEARCH_STYLE.container} className="no-print">
                    <div style={SEARCH_STYLE.wrapper}>
                        <ScrollText size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={loadingAccounts ? 'جاري التحميل...' : 'ابحث عن الحساب بالاسم أو الكود...'}
                            value={accountSearch}
                            onChange={e => { setAccountSearch(e.target.value); setShowAccountList(true); }}
                            onFocus={() => { setAccountSearch(''); setShowAccountList(true); }}
                            style={{ ...SEARCH_STYLE.input, paddingLeft: '40px' }}
                            onBlur={e => { setTimeout(() => setShowAccountList(false), 200); }}
                        />
                        <ChevronDown size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted, opacity: 0.5, pointerEvents: 'none' }} />

                        {showAccountList && filteredAccounts.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 50, background: '#0f1c2e', border: `1px solid ${C.border}`, borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', maxHeight: '300px', overflowY: 'auto', marginTop: '6px' }}>
                                {filteredAccounts.map(a => (
                                    <div key={a.id}
                                        onMouseDown={() => {
                                            setSelectedAccount(a.id);
                                            setAccountSearch(`${a.code} — ${a.name}`);
                                            setShowAccountList(false);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 800, color: typeColors[a.type] || '#64748b', minWidth: '60px' }}>{a.code}</span>
                                        <span style={{ fontSize: '12px', color: '#e2e8f0', flex: 1, fontWeight: 600, fontFamily: CAIRO }}>{a.name}</span>
                                        <span style={{ fontSize: '10px', color: typeColors[a.type] || '#64748b', background: `${typeColors[a.type] || '#64748b'}15`, border: `1px solid ${typeColors[a.type] || '#64748b'}30`, borderRadius: '20px', padding: '2px 10px', flexShrink: 0, fontFamily: CAIRO }}>{typeLabels[a.type]}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: C.textMuted, fontSize: '12px' }}>من</span>
                        <div style={{ width: '160px' }}>
                            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                style={{ ...IS, height: '36px', borderRadius: '6px', fontSize: '13px', fontFamily: INTER, background: C.card, color: C.textSecondary }}
                            />
                        </div>
                        <span style={{ color: C.textMuted, fontSize: '12px' }}>إلى</span>
                        <div style={{ width: '160px' }}>
                            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                style={{ ...IS, height: '36px', borderRadius: '6px', fontSize: '13px', fontFamily: INTER, background: C.card, color: C.textSecondary }}
                            />
                        </div>
                    </div>
                </div>

                {!selectedAccount ? (
                    <div style={{ textAlign: 'center', padding: '120px 20px', color: '#475569', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '20px' }}>
                        <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'rgba(59,130,246,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <ScrollText size={40} style={{ opacity: 0.1, color: '#3b82f6' }} />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#e2e8f0', fontFamily: CAIRO }}>ابدأ بطلب كشف الحساب</h2>
                        <p style={{ margin: '10px 0 0', fontSize: '12px', maxWidth: '400px', marginInline: 'auto', lineHeight: 1.6, fontFamily: CAIRO }}>اختر الحساب المطلوب والفترة الزمنية من الأعلى لعرض تفاصيل الحركات والرصيد الافتتاحي والختامي.</p>
                    </div>
                ) : loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', flexDirection: 'column', gap: '16px', color: '#475569' }}>
                        <Loader2 size={42} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
                        <span style={{ fontWeight: 600, fontFamily: CAIRO }}>جاري استعادة الحركات المالية...</span>
                    </div>
                ) : (
                    <>
                        {/* Header للطباعة فقط */}
                        <div className="print-only">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '2px solid #000', paddingTop: '0', marginTop: '0' }}>
                                
                                {/* بيانات الشركة — اليمين */}
                                <div style={{ textAlign: 'right' }}>
                                    <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 900, color: '#000' }}>
                                        {(session?.user as any)?.companyName || ''}
                                    </h2>
                                    {(session?.user as any)?.taxNumber && (
                                        <div style={{ fontSize: '11px', color: '#333', margin: '2px 0' }}>
                                            الرقم الضريبي: {(session?.user as any)?.taxNumber}
                                        </div>
                                    )}
                                    {(session?.user as any)?.commercialRegister && (
                                        <div style={{ fontSize: '11px', color: '#333', margin: '2px 0' }}>
                                            السجل التجاري: {(session?.user as any)?.commercialRegister}
                                        </div>
                                    )}
                                    {(session?.user as any)?.phone && (
                                        <div style={{ fontSize: '11px', color: '#333', margin: '2px 0' }}>
                                            الهاتف: {(session?.user as any)?.phone}
                                        </div>
                                    )}
                                </div>

                                {/* بيانات التقرير — الوسط */}
                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 900, color: '#000' }}>
                                        كشف الحساب العام
                                    </h3>
                                    {account && (
                                        <div style={{ fontSize: '11px', color: '#333', margin: '2px 0' }}>
                                            الحساب: {account.code} — {account.name}
                                        </div>
                                    )}
                                    {(fromDate || toDate) && (
                                        <div style={{ fontSize: '11px', color: '#333', margin: '2px 0', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                            {fromDate && <span>من: {new Date(fromDate).toLocaleDateString('en-GB')}</span>}
                                            {toDate && <span>إلى: {new Date(toDate).toLocaleDateString('en-GB')}</span>}
                                        </div>
                                    )}
                                </div>

                                {/* لوجو الشركة — اليسار */}
                                <div style={{ maxWidth: '150px', textAlign: 'left', display: 'flex', alignItems: 'center' }}>
                                    {(session?.user as any)?.companyLogo && (
                                        <img 
                                            src={(session?.user as any)?.companyLogo} 
                                            alt="logo"
                                            style={{ maxWidth: '150px', maxHeight: '70px', width: 'auto', height: 'auto', objectFit: 'contain' }}
                                        />
                                    )}
                                </div>

                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                            {[
                                { label: 'الرصيد الافتتاحي', value: fmt(openingBalance), color: '#3b82f6', icon: <Wallet size={18} /> },
                                { label: 'إجمالي مدين (+)', value: fmt(totalDebit), color: '#10b981', icon: <ArrowUpRight size={18} /> },
                                { label: 'إجمالي دائن (-)', value: fmt(totalCredit), color: '#fb7185', icon: <ArrowDownRight size={18} /> },
                                { label: 'الرصيد الختامي', value: fmt(closingBalance), color: tColor, icon: <Activity size={18} /> },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                                    padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s', position: 'relative'
                                }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                >
                                    <div style={{ textAlign: 'right' }}>
                                        <p className="stat-label" style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', whiteSpace: 'nowrap', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span className="stat-value" style={{ fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>{s.value}</span>
                                            <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                        </div>
                                    </div>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="no-print" style={SEARCH_STYLE.container}>
                            <div style={SEARCH_STYLE.wrapper}>
                                <input placeholder="البحث السريع في الوصف أو رقم القيد..." value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={SEARCH_STYLE.input} />
                                <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.textMuted)} />
                            </div>
                        </div>

                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr className="print-table-header" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${C.border}` }}>
                                        {['التاريخ', 'رقم القيد', 'البيان الوصفي', 'مركز التكلفة', 'مدين (+)', 'دائن (-)', 'الرصيد'].map((h, i) => (
                                            <th key={i} style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 800, color: C.textSecondary, textAlign: i >= 4 ? 'center' : 'right', fontFamily: CAIRO }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ background: 'rgba(59,130,246,0.03)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td colSpan={4} style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: '#3b82f6', fontFamily: CAIRO }}>
                                            {fromDate ? `رصيد مرحّل من الفترة السابقة (حتى ${new Date(fromDate).toLocaleDateString('en-GB')})` : 'الرصيد الافتتاحي'}
                                        </td>
                                        <td colSpan={2} />
                                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 900, color: '#60a5fa', direction: 'ltr', background: 'rgba(59,130,246,0.05)', fontFamily: CAIRO }}>{fmt(openingBalance)}</td>
                                    </tr>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center', color: '#475569' }}>
                                                <div className="no-print" style={{ opacity: 0.3, marginBottom: '8px' }}><Search size={32} /></div>
                                                <p style={{ margin: 0, fontWeight: 600, fontFamily: CAIRO }}>لا توجد حركات مالية مسجلة لهذه الفترة</p>
                                            </td>
                                        </tr>
                                    ) : filtered.map((line, idx) => (
                                        <tr key={line.id}
                                            style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', transition: 'background 0.1s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{new Date(line.date).toLocaleDateString('en-GB')}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', padding: '2px 8px', fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#60a5fa' }}>{line.entryNumber}</span>
                                                    {line.reference && <span style={{ fontSize: '11px', color: '#475569', fontFamily: CAIRO }}>· {line.reference}</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '12px', color: '#cbd5e1', fontWeight: 600, fontFamily: CAIRO }}>{line.description}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {line.costCenter?.name
                                                    ? <span style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', color: '#a78bfa', fontFamily: CAIRO }}>{line.costCenter.name}</span>
                                                    : <span style={{ color: '#334155' }}>—</span>}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: line.debit > 0 ? '#34d399' : '#2d3748', fontFamily: CAIRO }}>{line.debit > 0 ? fmt(line.debit) : '—'}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: line.credit > 0 ? '#f87171' : '#2d3748', fontFamily: CAIRO }}>{line.credit > 0 ? fmt(line.credit) : '—'}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 900, color: line.balance >= 0 ? tColor : '#f87171', direction: 'ltr', fontFamily: CAIRO }}>{fmt(line.balance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                                        <td colSpan={4} style={{ padding: '16px', fontSize: '12px', fontWeight: 800, color: '#94a3b8', fontFamily: CAIRO }}>إجماليات الحركات والأرصدة</td>
                                        <td style={{ padding: '16px', textAlign: 'center', fontSize: '15px', fontWeight: 900, color: '#34d399', direction: 'ltr', fontFamily: CAIRO }}>{fmt(totalDebit)}</td>
                                        <td style={{ padding: '16px', textAlign: 'center', fontSize: '15px', fontWeight: 900, color: '#f87171', direction: 'ltr', fontFamily: CAIRO }}>{fmt(totalCredit)}</td>
                                        <td style={{ padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: 900, color: tColor, direction: 'ltr', background: 'rgba(255,255,255,0.02)', fontFamily: CAIRO }}>{fmt(closingBalance)}</td>
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
                    .stat-value { font-size: 11px !important; }
                    .stat-label { font-size: 9px !important; }
                }
                
                /* تلوين أيقونة التاريخ الأصلية باللون الأبيض */
                input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    opacity: 0.5;
                    cursor: pointer;
                }
            `}</style>
        </DashboardLayout>
    );
}
