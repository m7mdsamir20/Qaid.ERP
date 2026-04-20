'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { ScrollText, Search, Loader2, ArrowUpRight, ArrowDownRight, ChevronDown, Calendar, Wallet, Activity, Printer, FileDown, User, Info } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { C, CAIRO, PAGE_BASE, SEARCH_STYLE, IS, INTER, KPI_STYLE, KPI_ICON, TABLE_STYLE, SC, STitle } from '@/constants/theme';

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
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE} ref={reportRef}>
                <ReportHeader
                    title={t("كشف الحساب العام")}
                    subtitle={t("تحليل الحركات المالية والرصيد التفصيلي لأي حساب خلال فترة زمنية محددة.")}
                    backTab="financial"
                    accountName={account?.name}
                    printCode={account?.code}
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
                            onBlur={() => { setTimeout(() => setShowAccountList(false), 200); }}
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* ── Metadata Bar ── */}
                            <div style={{ ...SC, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '10px', color: C.textMuted, margin: 0 }}>{t('الحساب المالي')}</p>
                                        <p style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, margin: 0 }}>{account?.name || '—'}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '10px', color: C.textMuted, margin: 0 }}>{t('تاريخ التقرير')}</p>
                                        <p style={{ fontSize: '12px', fontWeight: 700, color: C.textPrimary, margin: 0, fontFamily: INTER }}>{new Date().toLocaleDateString('en-GB')}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Activity size={18} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '10px', color: C.textMuted, margin: 0 }}>{t('طبيعة الحساب')}</p>
                                        <p style={{ fontSize: '13px', fontWeight: 800, color: tColor, margin: 0 }}>{typeLabels[account?.type || ''] || '—'}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ScrollText size={18} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '10px', color: C.textMuted, margin: 0 }}>{t('كود الحساب')}</p>
                                        <p style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, margin: 0, fontFamily: INTER }}>{account?.code || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div className="no-print" style={SEARCH_STYLE.wrapper}>
                                    <input placeholder={t("البحث السريع في الوصف أو رقم القيد...")} value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        style={SEARCH_STYLE.input} />
                                    <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.primary)} />
                                </div>

                                <div className="print-table-container" style={TABLE_STYLE.container}>
                                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)' }}>
                                        <div style={STitle}><ScrollText size={14} /> {t('حركات كشف الحساب')}</div>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary }}>{filtered.length} {t('حركة')}</div>
                                    </div>
                                    <table style={TABLE_STYLE.table}>
                                        <thead>
                                            <tr style={TABLE_STYLE.thead}>
                                                {[t('التاريخ'), t('رقم القيد'), t('البيان الوصفي'), t('مركز التكلفة'), t('مدين (+)'), t('دائن (-)'), t('الرصيد')].map((h, i) => (
                                                    <th key={i} style={{ ...TABLE_STYLE.th(true, false), textAlign: isRtl ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="opening-balance" style={{ background: 'rgba(59,130,246,0.04)', borderBottom: `1px solid ${C.border}` }}>
                                                <td colSpan={4} style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 800, color: '#3b82f6', fontFamily: CAIRO, textAlign: 'start' }}>
                                                    {fromDate ? `${t('رصيد مرحّل من الفترة السابقة (حتى')} ${new Date(fromDate).toLocaleDateString('en-GB')})` : t('الرصيد الافتتاحي')}
                                                </td>
                                                <td colSpan={2} style={{ borderBottom: `1px solid ${C.border}` }} />
                                                <td style={{ padding: '14px 20px', textAlign: isRtl ? 'right' : 'left', fontSize: '14px', fontWeight: 900, color: '#3b82f6', fontFamily: INTER }}>
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: isRtl ? 'flex-start' : 'flex-end' }}>
                                                        <span>{fmt(openingBalance)}</span>
                                                        <small style={{ fontSize: '10px', opacity: 0.8, fontFamily: CAIRO }}>{getCurrencyName(currency)}</small>
                                                    </div>
                                                </td>
                                            </tr>

                                            {filtered.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center', color: C.textMuted }}>
                                                        <div className="no-print" style={{ opacity: 0.3, marginBottom: '8px' }}><Search size={32} /></div>
                                                        <p style={{ margin: 0, fontWeight: 600, fontFamily: CAIRO }}>{t('لا توجد حركات مالية مسجلة لهذه الفترة')}</p>
                                                    </td>
                                                </tr>
                                            ) : filtered.map((line, idx) => (
                                                <tr key={line.id} style={TABLE_STYLE.row(idx === filtered.length - 1)}>
                                                    <td style={{ ...TABLE_STYLE.td(true, false), textAlign: isRtl ? 'right' : 'left', fontSize: '13px', color: C.textPrimary, fontWeight: 500, fontFamily: INTER }}>{new Date(line.date).toLocaleDateString('en-GB')}</td>
                                                    <td style={{ ...TABLE_STYLE.td(true, false), textAlign: isRtl ? 'right' : 'left' }}>
                                                        <span style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', padding: '3px 10px', fontFamily: INTER, fontSize: '12px', fontWeight: 800, color: '#60a5fa' }}>{line.entryNumber}</span>
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(true, false), textAlign: isRtl ? 'right' : 'left', fontSize: '13px', color: C.textPrimary, fontWeight: 600, fontFamily: CAIRO, whiteSpace: 'normal', minWidth: '160px' }}>{line.description}</td>
                                                    <td style={{ ...TABLE_STYLE.td(true, false), textAlign: isRtl ? 'right' : 'left' }}>
                                                        {line.costCenter?.name ? <span style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#a78bfa', fontFamily: CAIRO }}>{line.costCenter.name}</span> : '—'}
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(true, false), textAlign: isRtl ? 'right' : 'left', fontSize: '14px', fontWeight: 700, color: line.debit > 0 ? '#34d399' : C.textMuted, fontFamily: INTER }}>
                                                        {line.debit > 0 ? (
                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: isRtl ? 'flex-start' : 'flex-end' }}>
                                                                <span>{fmt(line.debit)}</span>
                                                                <small style={{ fontSize: '10px', opacity: 0.7, fontFamily: CAIRO }}>{getCurrencyName(currency)}</small>
                                                            </div>
                                                        ) : '—'}
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(true, false), textAlign: isRtl ? 'right' : 'left', fontSize: '14px', fontWeight: 700, color: line.credit > 0 ? '#f87171' : C.textMuted, fontFamily: INTER }}>
                                                        {line.credit > 0 ? (
                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: isRtl ? 'flex-start' : 'flex-end' }}>
                                                                    <span>{fmt(line.credit)}</span>
                                                                    <small style={{ fontSize: '10px', opacity: 0.7, fontFamily: CAIRO }}>{getCurrencyName(currency)}</small>
                                                                </div>
                                                            ) : '—'}
                                                        </td>
                                                        <td style={{ ...TABLE_STYLE.td(true, false), textAlign: isRtl ? 'right' : 'left', fontSize: '14px', fontWeight: 900, color: line.balance >= 0 ? tColor : '#f87171', fontFamily: INTER }}>
                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: isRtl ? 'flex-start' : 'flex-end' }}>
                                                                <span>{fmt(line.balance)}</span>
                                                                <small style={{ fontSize: '10px', opacity: 0.7, fontFamily: CAIRO }}>{getCurrencyName(currency)}</small>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ background: C.subtle, borderTop: `2px solid ${C.border}` }}>
                                                    <td colSpan={4} style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 800, color: C.textSecondary, fontFamily: CAIRO, textAlign: 'start' }}>{t('إجماليات الحركات والأرصدة')}</td>
                                                    <td style={{ padding: '16px 20px', textAlign: isRtl ? 'right' : 'left', fontSize: '15px', fontWeight: 900, color: '#34d399', fontFamily: INTER }}>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: isRtl ? 'flex-start' : 'flex-end' }}>
                                                            <span>{fmt(totalDebit)}</span>
                                                            <small style={{ fontSize: '11px', opacity: 0.8, fontFamily: CAIRO }}>{getCurrencyName(currency)}</small>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 20px', textAlign: isRtl ? 'right' : 'left', fontSize: '15px', fontWeight: 900, color: '#f87171', fontFamily: INTER }}>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: isRtl ? 'flex-start' : 'flex-end' }}>
                                                            <span>{fmt(totalCredit)}</span>
                                                            <small style={{ fontSize: '11px', opacity: 0.8, fontFamily: CAIRO }}>{getCurrencyName(currency)}</small>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 20px', textAlign: isRtl ? 'right' : 'left', fontSize: '15px', fontWeight: 900, color: tColor, fontFamily: INTER }}>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: isRtl ? 'flex-start' : 'flex-end' }}>
                                                            <span>{fmt(closingBalance)}</span>
                                                            <small style={{ fontSize: '11px', opacity: 0.8, fontFamily: CAIRO }}>{getCurrencyName(currency)}</small>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={SC}>
                                    <div style={STitle}><Wallet size={14} /> {t('ملخص الأرصدة')}</div>
                                    <div data-print-include style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span className="stat-label" style={{ color: C.textSecondary }}>{t('الرصيد الافتتاحي')}</span>
                                            <div className="stat-value" style={{ display: 'flex', gap: '4px', alignItems: 'baseline', fontFamily: INTER, fontWeight: 700, color: '#3b82f6' }}>
                                                <span>{fmt(openingBalance)}</span>
                                                <span style={{ fontSize: '11px', fontFamily: CAIRO, opacity: 0.8 }}>{getCurrencyName(currency)}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span className="stat-label" style={{ color: C.textSecondary }}>{t('إجمالي المدين (+)')}</span>
                                            <div className="stat-value" style={{ display: 'flex', gap: '4px', alignItems: 'baseline', fontFamily: INTER, fontWeight: 700, color: '#10b981' }}>
                                                <span>{fmt(totalDebit)}</span>
                                                <span style={{ fontSize: '11px', fontFamily: CAIRO, opacity: 0.8 }}>{getCurrencyName(currency)}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span className="stat-label" style={{ color: C.textSecondary }}>{t('إجمالي الدائن (-)')}</span>
                                            <div className="stat-value" style={{ display: 'flex', gap: '4px', alignItems: 'baseline', fontFamily: INTER, fontWeight: 700, color: '#fb7185' }}>
                                                <span>{fmt(totalCredit)}</span>
                                                <span style={{ fontSize: '11px', fontFamily: CAIRO, opacity: 0.8 }}>{getCurrencyName(currency)}</span>
                                            </div>
                                        </div>
                                        <div style={{ height: '1px', background: C.border, margin: '5px 0' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '12px', background: 'rgba(59,130,246,0.08)', border: `1px solid rgba(59,130,246,0.2)` }}>
                                            <span className="stat-label" style={{ fontWeight: 800, fontSize: '12px' }}>{t('الرصيد الختامي')}</span>
                                            <div className="stat-value" style={{ display: 'flex', gap: '6px', alignItems: 'baseline', fontFamily: INTER, fontWeight: 900, color: tColor, fontSize: '18px' }}>
                                                <span>{fmt(closingBalance)}</span>
                                                <span style={{ fontSize: '12px', fontFamily: CAIRO, opacity: 0.9 }}>{getCurrencyName(currency)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={SC}>
                                    <div style={STitle}><Info size={14} /> {t('معلومات سريعة')}</div>
                                    <div style={{ fontSize: '12px', color: C.textSecondary, lineHeight: 1.6, marginTop: '8px' }}>
                                        {t('هذا التقرير يعرض كافة الحركات المالية المسجلة على هذا الحساب بالتفصيل. يتم احتساب الرصيد الختامي بناءً على الرصيد الافتتاحي ومجموع الحركات.')}
                                    </div>
                                </div>
                            </div>
                        </div>
                )}
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                .print-only { display: none; }
                @media print { 
                    .print-only { display: block !important; }
                    .no-print { display: none !important; }
                }
                input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: brightness(0) saturate(100%) invert(67%) sepia(43%) saturate(1042%) hue-rotate(186deg) brightness(103%) contrast(97%);
                    cursor: pointer;
                }
            `}</style>
        </DashboardLayout>
    );
}
