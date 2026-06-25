'use client';
import { formatNumber } from '@/lib/currency';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { ScrollText, Search, Loader2, ArrowUpRight, ArrowDownRight, ChevronDown, FileText, Trash2, Receipt } from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, focusIn, focusOut, TABLE_STYLE, SEARCH_STYLE } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { DataTable } from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';

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
const fmt = (n: number) => formatNumber(n);

const typeColors: Record<string, string> = {
    asset: '#10b981', liability: '#f87171', equity: '#a78bfa', revenue: '#60a5fa', expense: '#fb923c',
};

/* ══════════════════════════════════════════ */
export default function GeneralLedgerPage() {
    const { t } = useTranslation();

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

    /* Fetch accounts */
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

    /* Fetch ledger when filters change */
    useEffect(() => {
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
    }, [selectedAccount, fromDate, toDate]);

    /* Selected account info */
    const account = accounts.find(a => a.id === selectedAccount);
    const tColor = account ? (typeColors[account.type] || '#64748b') : '#64748b';

    /* Filtered lines */
    const filtered = lines.filter(l =>
        l.description.includes(search) ||
        l.entryNumber.includes(search) ||
        (l.reference || '').includes(search)
    );

    /* Totals */
    const totalDebit = filtered.reduce((s, l) => s + l.debit, 0);
    const totalCredit = filtered.reduce((s, l) => s + l.credit, 0);
    const closingBalance = openingBalance + totalDebit - totalCredit;

    /* Account search list */
    const filteredAccounts = accounts.filter(a =>
        a.name.includes(accountSearch) || a.code.includes(accountSearch)
    ).slice(0, 30);

    /* DataTable columns */
    const ledgerColumns: TableColumn[] = [
        { header: t('التاريخ'), type: 'date', cell: (row) => <span style={{ fontSize: '12px', color: C.textSecondary, fontFamily: OUTFIT }}>{new Date(row.date).toLocaleDateString('en-ZA')}</span> },
        { header: t('رقم القيد'), type: 'text', cell: (row) => (
            <>
                <span style={{ fontWeight: 600, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: OUTFIT }}>{row.entryNumber}</span>
                {row.reference && <span style={{ fontSize: '10px', color: C.textSecondary, marginInlineEnd: '8px' }}>· {row.reference}</span>}
            </>
        )},
        { header: t('البيان'), type: 'text', cell: (row) => <span style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 500 }}>{row.description}</span>, style: { maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
        { header: t('مراكز التكلفة'), type: 'text', cell: (row) => row.costCenter?.name
            ? <span style={{ fontSize: '11px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '6px', padding: '2px 8px', color: '#a78bfa', fontFamily: CAIRO }}>{row.costCenter.name}</span>
            : <span style={{ color: C.textSecondary, fontSize: '12px' }}>—</span>
        },
        { header: t('مدين'), type: 'number', cell: (row) => row.debit > 0
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '13px', fontWeight: 700, color: '#10b981' }}><ArrowUpRight size={13} /> {fmt(row.debit)}</span>
            : <span style={{ color: 'rgba(255,255,255,0.05)', fontSize: '12px' }}>—</span>
        },
        { header: t('دائن'), type: 'number', cell: (row) => row.credit > 0
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '13px', fontWeight: 700, color: C.danger }}><ArrowDownRight size={13} /> {fmt(row.credit)}</span>
            : <span style={{ color: 'rgba(255,255,255,0.05)', fontSize: '12px' }}>—</span>
        },
        { header: t('الرصيد'), type: 'number', cell: (row) => <span style={{ fontSize: '13px', fontWeight: 600, color: row.balance >= 0 ? C.primary : C.danger, direction: 'ltr' }}>{fmt(row.balance)}</span> },
    ];

    return (
        <DashboardLayout>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 className="page-title">
                        <ScrollText size={20} style={{ color: C.primary }} /> {t('كشف حساب عام')}
                    </h1>
                    <p className="page-subtitle">{t('عرض وتتبع كافة الحركات المالية لأي حساب — كشف حركة الأستاذ')}</p>
                </div>
            </div>

            {/* ── Filters ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: '10px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px' }}>

                {/* Account Selector */}
                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, marginBottom: '4px' }}>
                        {t('الحساب')} <span style={{ color: '#f87171' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            placeholder={loadingAccounts ? t('جاري التحميل...') : t('ابحث عن الحساب بالاسم أو الكود...')}
                            value={accountSearch}
                            onChange={e => { setAccountSearch(e.target.value); setShowAccountList(true); }}
                            onFocus={() => {
                                setAccountSearch(''); // Clear search on click to show all
                                setShowAccountList(true);
                            }}
                            style={{ ...IS, height: '38px', paddingInlineEnd: '12px', borderRadius: '8px', fontSize: '13px' }}
                            onBlur={e => { setTimeout(() => setShowAccountList(false), 200); focusOut(e); }}
                        />
                        <ChevronDown size={14} style={{ position: 'absolute', insetInlineStart: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                    </div>

                    {/* Selected account display */}
                    {account && !showAccountList && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: tColor, fontWeight: 700, background: `${tColor}12`, border: `1px solid ${tColor}25`, borderRadius: '6px', padding: '2px 8px' }}>
                                {account.code}
                            </span>
                            <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>{account.name}</span>
                            <span style={{ fontSize: '10px', color: tColor, background: `${tColor}12`, border: `1px solid ${tColor}20`, borderRadius: '20px', padding: '1px 7px' }}>
                                {typeLabels[account.type]}
                            </span>
                        </div>
                    )}

                    {/* Dropdown */}
                    {showAccountList && filteredAccounts.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', insetInlineEnd: 0, insetInlineStart: 0, zIndex: 50, background: '#0f1c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', maxHeight: '260px', overflowY: 'auto', marginTop: '4px' }}>
                            {filteredAccounts.map(a => (
                                <div key={a.id}
                                    onMouseDown={() => {
                                        setSelectedAccount(a.id);
                                        setAccountSearch(a.code + ' — ' + a.name);
                                        setShowAccountList(false);
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(37, 106, 244,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: typeColors[a.type] || '#64748b', minWidth: '50px' }}>
                                        {a.code}
                                    </span>
                                    <span style={{ fontSize: '13px', color: '#cbd5e1', flex: 1 }}>{a.name}</span>
                                    <span style={{ fontSize: '10px', color: typeColors[a.type] || '#64748b', background: `${typeColors[a.type] || '#64748b'}12`, borderRadius: '20px', padding: '1px 7px', flexShrink: 0 }}>
                                        {typeLabels[a.type]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* From Date */}
                <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, marginBottom: '4px' }}>{t('من تاريخ')}</label>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                        style={{ ...IS, height: '38px', direction: 'ltr', textAlign: 'end', colorScheme: 'dark', fontSize: '13px', borderRadius: '8px' }}
                        onFocus={focusIn} onBlur={focusOut} />
                </div>

                {/* To Date */}
                <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#475569', fontWeight: 700, marginBottom: '4px' }}>{t('إلى تاريخ')}</label>
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                        style={{ ...IS, height: '38px', direction: 'ltr', textAlign: 'end', colorScheme: 'dark', fontSize: '13px', borderRadius: '8px' }}
                        onFocus={focusIn} onBlur={focusOut} />
                </div>
            </div>

            {!selectedAccount ? (
                /* No account selected */
                <div style={{  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', color: '#475569' }}>
                    <ScrollText size={64} style={{ margin: '0 auto 16px', display: 'block', }} />
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#334155' }}>{t('اختر الحساب')}</p>
                    <p style={{ margin: '8px 0 0', fontSize: '13px' }}>{t('ابحث عن الحساب أعلاه لعرض حركاته')}</p>
                </div>
            ) : loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', flexDirection: 'column', gap: '12px', color: '#475569' }}>
                    <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>{t('جاري تحميل الحركات...')}</span>
                </div>
            ) : (
                <>
                    {/* ── Stats ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '16px' }}>
                        {[
                            { label: t('الرصيد الافتتاحي'), value: fmt(openingBalance), color: '#60a5fa' },
                            { label: t('إجمالي المدين'), value: fmt(totalDebit), color: '#10b981' },
                            { label: t('إجمالي الدائن'), value: fmt(totalCredit), color: '#f87171' },
                            { label: t('الرصيد الختامي'), value: fmt(closingBalance), color: tColor },
                        ].map((s, i) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 12px' }}>
                                <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginBottom: '2px' }}>{s.label}</div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: s.color, direction: 'ltr', textAlign: 'center' }}>{s.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* ── Search ── */}
                    <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch' }}>
                        <div style={SEARCH_STYLE.wrapper}>
                            <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                            <input
                                placeholder={t('ابحث في تفاصيل القيود أو البيان...')}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={SEARCH_STYLE.input}
                                onFocus={focusIn} onBlur={focusOut}
                            />
                        </div>
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px', padding: '0 12px', height: '42px',
                                    background: 'transparent', border: `1px solid ${C.danger}40`, color: C.danger,
                                    borderRadius: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: '0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = `${C.danger}10`}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <Trash2 size={14} /> {t('مسح')}
                            </button>
                        )}
                    </div>

                    {/* ── Ledger Table ── */}
                    <DataTable
                        columns={ledgerColumns}
                        data={filtered}
                        emptyIcon={FileText}
                        emptyMessage={t('لا توجد حركات في هذه الفترة')}
                        customHeader={
                            <>
                                <tr style={TABLE_STYLE.thead}>
                                    {ledgerColumns.map((col, idx) => {
                                        const isCenter = col.type && col.type !== 'text';
                                        return (
                                            <th key={idx} style={{ ...TABLE_STYLE.th(idx === 0, isCenter), ...col.style }} className={isCenter ? 'table-cell-center' : 'table-cell-text'}>
                                                {col.header}
                                            </th>
                                        );
                                    })}
                                </tr>
                                <tr style={{ background: 'rgba(37, 106, 244,0.06)', borderBottom: `1px solid ${C.border}` }}>
                                    <td colSpan={4} style={{ ...TABLE_STYLE.td(true), fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>
                                        {fromDate ? `${t('رصيد مرحّل حتى')} ${new Date(fromDate).toLocaleDateString('en-ZA')}` : t('الرصيد الافتتاحي')}
                                    </td>
                                    <td colSpan={2} style={TABLE_STYLE.td(false)} />
                                    <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', fontWeight: 600, color: C.primary, direction: 'ltr' }}>
                                        {fmt(openingBalance)}
                                    </td>
                                </tr>
                            </>
                        }
                        footer={
                            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                                <td colSpan={4} style={{ ...TABLE_STYLE.td(true), fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>
                                    {t('الإجمالي')} — {filtered.length} {t('حركة')}
                                </td>
                                <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', fontWeight: 600, color: '#10b981', direction: 'ltr' }}>
                                    {fmt(totalDebit)}
                                </td>
                                <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', fontWeight: 600, color: C.danger, direction: 'ltr' }}>
                                    {fmt(totalCredit)}
                                </td>
                                <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', fontWeight: 600, color: C.primary, direction: 'ltr' }}>
                                    {fmt(closingBalance)}
                                </td>
                            </tr>
                        }
                    />
                </>
            )}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </DashboardLayout>
    );
}

