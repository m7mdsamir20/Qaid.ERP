'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { ScrollText, Search, Loader2, ArrowUpRight, ArrowDownRight, ChevronDown, Calendar, Wallet, Activity, Printer, FileDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { C, CAIRO, PAGE_BASE, SEARCH_STYLE, IS, INTER, KPI_STYLE, KPI_ICON, TABLE_STYLE } from '@/constants/theme';

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

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const IS_LOCAL: React.CSSProperties = {
    width: '100%', height: '42px', padding: '0 14px', textAlign: 'start', direction: 'inherit',
    borderRadius: '10px', border: `1px solid ${C.border}`,
    background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: '12px',
    fontWeight: 500, outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
};
const focusIn = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; };
const focusOut = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; };

export default function GeneralLedgerPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const typeColors: Record<string, string> = {
        asset: '#10b981', liability: '#f87171', equity: '#a78bfa', revenue: '#60a5fa', expense: '#fb923c',
    };
    const typeLabels: Record<string, string> = {
        asset: t('أصول'), liability: t('خصوم'), equity: t('حقوق ملكية'), revenue: t('إيرادات'), expense: t('مصروفات'),
    };

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
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE} ref={reportRef}>
                <ReportHeader
                    title={t("كشف الحساب العام")}
                    subtitle={t("تحليل الحركات المالية والرصيد التفصيلي لأي حساب خلال فترة زمنية محددة.")}
                    backTab="financial"
                    accountName={account?.name}
                    printTitle={account ? `${t('كشف حساب')}: ${account.name}` : t('كشف الحساب العام')}
                    printDate={fromDate || toDate ? `${fromDate ? t('من: ') + fromDate : ''} ${toDate ? t(' إلى: ') + toDate : ''}`.trim() : undefined}
                />

                <div className="no-print" style={SEARCH_STYLE.container}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <ScrollText size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={loadingAccounts ? t('جاري التحميل...') : t('ابحث عن الحساب بالاسم أو الكود...')}
                            value={accountSearch}
                            autoComplete="off"
                            name="search-account-nope"
                            spellCheck={false}
                            onChange={e => { setAccountSearch(e.target.value); setShowAccountList(true); }}
                            onFocus={() => { setAccountSearch(''); setShowAccountList(true); }}
                            style={{ ...SEARCH_STYLE.input, paddingInlineStart: '40px' }}
                            onBlur={e => { setTimeout(() => setShowAccountList(false), 200); }}
                        />
                        <ChevronDown size={14} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, opacity: 0.8, pointerEvents: 'none' }} />

                        {showAccountList && filteredAccounts.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', insetInlineEnd: 0, insetInlineStart: 0, zIndex: 50, background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', maxHeight: '300px', overflowY: 'auto', marginTop: '6px' }}>
                                {filteredAccounts.map(a => (
                                    <div key={a.id}
                                        onMouseDown={() => {
                                            setLoading(true);
                                            setSelectedAccount(a.id);
                                            setAccountSearch(`${a.code} — ${a.name}`);
                                            setShowAccountList(false);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${C.border}`, transition: 'background 0.1s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 800, color: typeColors[a.type] || '#64748b', minWidth: '60px' }}>{a.code}</span>
                                        <span style={{ fontSize: '12px', color: C.textPrimary, flex: 1, fontWeight: 600, fontFamily: CAIRO }}>{a.name}</span>
                                        <span style={{ fontSize: '10px', color: typeColors[a.type] || '#64748b', background: `${typeColors[a.type] || '#64748b'}15`, border: `1px solid ${typeColors[a.type] || '#64748b'}30`, borderRadius: '20px', padding: '2px 10px', flexShrink: 0, fontFamily: CAIRO }}>{typeLabels[a.type]}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: C.textMuted, fontSize: '12px' }}>{t('من')}</span>
                        <div style={{ width: '160px' }}>
                            <input type="date" value={fromDate} onChange={e => { setLoading(true); setFromDate(e.target.value); }}
                                style={{ ...IS, height: '36px', borderRadius: '6px', fontSize: '13px', fontFamily: INTER, background: C.card, color: C.textSecondary }}
                            />
                        </div>
                        <span style={{ color: C.textMuted, fontSize: '12px' }}>{t('إلى')}</span>
                        <div style={{ width: '160px' }}>
                            <input type="date" value={toDate} onChange={e => { setLoading(true); setToDate(e.target.value); }}
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
                        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('ابدأ بطلب كشف الحساب')}</h2>
                        <p style={{ margin: '10px 0 0', fontSize: '12px', maxWidth: '400px', marginInline: 'auto', lineHeight: 1.6, fontFamily: CAIRO }}>{t('اختر الحساب المطلوب والفترة الزمنية من الأعلى لعرض تفاصيل الحركات والرصيد الافتتاحي والختامي.')}</p>
                    </div>
                ) : loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', flexDirection: 'column', gap: '16px', color: '#475569' }}>
                        <Loader2 size={42} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
                        <span style={{ fontWeight: 600, fontFamily: CAIRO }}>{t('جاري استعادة الحركات المالية...')}</span>
                    </div>
                ) : (
                    <>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                            {[
                                { label: t('الرصيد الافتتاحي'), value: fmt(openingBalance), color: '#3b82f6', icon: <Wallet size={18} /> },
                                { label: t('إجمالي مدين (+)'), value: fmt(totalDebit), color: '#10b981', icon: <ArrowUpRight size={18} /> },
                                { label: t('إجمالي دائن (-)'), value: fmt(totalCredit), color: '#fb7185', icon: <ArrowDownRight size={18} /> },
                                { label: t('الرصيد الختامي'), value: fmt(closingBalance), color: tColor, icon: <Activity size={18} /> },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                                    padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s', position: 'relative'
                                }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                >
                                    <div style={{ textAlign: 'start' }}>
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
                                <input placeholder={t("البحث السريع في الوصف أو رقم القيد...")} value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={SEARCH_STYLE.input} />
                                <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.primary)} />
                            </div>
                        </div>

                        <div className="print-table-container" style={TABLE_STYLE.container}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        {[t('التاريخ'), t('رقم القيد'), t('البيان الوصفي'), t('مركز التكلفة'), t('مدين (+)'), t('دائن (-)'), t('الرصيد')].map((h, i) => (
                                            <th key={i} style={TABLE_STYLE.th(i === 1 || i === 2, i >= 4)}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* صف الرصيد الافتتاحي */}
                                    <tr style={{ background: 'rgba(59,130,246,0.04)', borderBottom: `1px solid ${C.border}` }}>
                                        <td colSpan={4} style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 700, color: '#60a5fa', fontFamily: CAIRO, textAlign: 'start' }}>
                                            {fromDate ? `${t('رصيد مرحّل من الفترة السابقة (حتى')} ${new Date(fromDate).toLocaleDateString('en-GB')})` : t('الرصيد الافتتاحي')}
                                        </td>
                                        <td colSpan={2} style={{ borderBottom: `1px solid ${C.border}` }} />
                                        <td style={{ padding: '14px 20px', textAlign: 'end', fontSize: '14px', fontWeight: 900, color: '#60a5fa', fontFamily: INTER }}>{fmt(openingBalance)}</td>
                                    </tr>

                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center', color: C.textMuted }}>
                                                <div className="no-print" style={{ opacity: 0.3, marginBottom: '8px' }}><Search size={32} /></div>
                                                <p style={{ margin: 0, fontWeight: 600, fontFamily: CAIRO }}>{t('لا توجد حركات مالية مسجلة لهذه الفترة')}</p>
                                            </td>
                                        </tr>
                                    ) : filtered.map((line, idx) => (
                                        <tr key={line.id}
                                            style={TABLE_STYLE.row(idx === filtered.length - 1)}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                                            {/* التاريخ */}
                                            <td style={{ ...TABLE_STYLE.td(false, false), fontSize: '13px', color: '#60a5fa', fontFamily: INTER }}>
                                                {new Date(line.date).toLocaleDateString('en-GB')}
                                            </td>

                                            {/* رقم القيد */}
                                            <td style={TABLE_STYLE.td(true, false)}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', padding: '3px 10px', fontFamily: INTER, fontSize: '12px', fontWeight: 800, color: '#60a5fa' }}>
                                                        {line.entryNumber}
                                                    </span>
                                                                </div>
                                            </td>

                                            {/* البيان الوصفي */}
                                            <td style={{ ...TABLE_STYLE.td(true, false), fontSize: '13px', color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO, whiteSpace: 'normal', minWidth: '160px' }}>
                                                {line.description}
                                            </td>

                                            {/* مركز التكلفة */}
                                            <td style={TABLE_STYLE.td(false, false)}>
                                                {line.costCenter?.name
                                                    ? <span style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#a78bfa', fontFamily: CAIRO }}>
                                                        {line.costCenter.name}
                                                      </span>
                                                    : <span style={{ color: C.textMuted, fontSize: '13px' }}>—</span>}
                                            </td>

                                            {/* مدين */}
                                            <td style={{ ...TABLE_STYLE.td(false, true), fontSize: '14px', fontWeight: 700, color: line.debit > 0 ? '#34d399' : C.textMuted, fontFamily: INTER }}>
                                                {line.debit > 0 ? fmt(line.debit) : '—'}
                                            </td>

                                            {/* دائن */}
                                            <td style={{ ...TABLE_STYLE.td(false, true), fontSize: '14px', fontWeight: 700, color: line.credit > 0 ? '#f87171' : C.textMuted, fontFamily: INTER }}>
                                                {line.credit > 0 ? fmt(line.credit) : '—'}
                                            </td>

                                            {/* الرصيد */}
                                            <td style={{ ...TABLE_STYLE.td(false, true), fontSize: '14px', fontWeight: 900, color: line.balance >= 0 ? tColor : '#f87171', fontFamily: INTER }}>
                                                {fmt(line.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: C.subtle, borderTop: `2px solid ${C.border}` }}>
                                        <td colSpan={4} style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 800, color: C.textSecondary, fontFamily: CAIRO, textAlign: 'start' }}>
                                            {t('إجماليات الحركات والأرصدة')}
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'end', fontSize: '15px', fontWeight: 900, color: '#34d399', fontFamily: INTER }}>{fmt(totalDebit)}</td>
                                        <td style={{ padding: '16px 20px', textAlign: 'end', fontSize: '15px', fontWeight: 900, color: '#f87171', fontFamily: INTER }}>{fmt(totalCredit)}</td>
                                        <td style={{ padding: '16px 20px', textAlign: 'end', fontSize: '15px', fontWeight: 900, color: tColor, fontFamily: INTER }}>{fmt(closingBalance)}</td>
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
                    filter: brightness(0) saturate(100%) invert(67%) sepia(43%) saturate(1042%) hue-rotate(186deg) brightness(103%) contrast(97%);
                    cursor: pointer;
                }
            `}</style>
        </DashboardLayout>
    );
}


