'use client';

import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import React, { useEffect, useState } from 'react';
import { FileText, Plus, X, ChevronRight, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, Loader2, Search, Trash2, AlertTriangle, Send, Printer, PlusCircle } from 'lucide-react';
import { generateReportHTML } from '@/lib/printInvoices';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/hooks/useCurrency';
import { 
    C, CAIRO, INTER, IS, LS, focusIn, focusOut, 
    TABLE_STYLE, SEARCH_STYLE, BTN_PRIMARY, PAGE_BASE,
    SC, KPI_STYLE, KPI_ICON
} from '@/constants/theme';
import Pagination from '@/components/Pagination';
import PageHeader from '@/components/PageHeader';
import { useTranslation } from '@/lib/i18n';

/* ── Types ── */
interface AccountInfo { id: string; code: string; name: string; type: string; accountCategory?: string; nature?: string; }
interface CostCenter { id: string; name: string; }
interface JournalLine {
    id: string; accountId: string; account: AccountInfo;
    debit: number; credit: number; description: string | null;
    costCenter?: { name: string };
}
interface JournalEntry {
    id: string; entryNumber: string; date: string; description: string;
    reference: string | null; referenceType: string | null;
    isPosted: boolean; financialYear: { name: string };
    lines: JournalLine[]; createdAt: string;
}

/** التنسيق المحاسبي لرقم القيد ليصبح كود مميز */
const formatEntryCode = (num: string | number) => {
    const cleanNum = String(num).replace(/\D/g, '');
    return `JV-${cleanNum.padStart(5, '0')}`;
};

export default function JournalEntriesPage() {
    const { data: session } = useSession();
    const { symbol: currencySymbol, fMoney, currency } = useCurrency();
    const { lang, t } = useTranslation();

    const refTypeLabels: Record<string, string> = {
        invoice: t('فاتورة'), payment: t('سند دفع'), receipt: t('سند قبض'), manual: t('يدوي'),
    };
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [accounts, setAccounts] = useState<AccountInfo[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [view, setView] = useState<'list' | 'create'>('list');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'posted' | 'draft'>('all');
    const [nextNumber, setNextNumber] = useState('JV-00001');
    const [posting, setPosting] = useState<string | null>(null);

    const isAdmin = session?.user?.role === 'admin';
    const perms = (session?.user as any)?.permissions || {};
    const canCreate = isAdmin || perms['/journal-entries']?.create;
    const canPost = isAdmin || perms['/journal-entries']?.post;

    const emptyLine = () => ({ accountId: '', costCenterId: '', debit: 0, credit: 0, description: '' });
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '', reference: '',
        lines: [emptyLine(), emptyLine()],
    });

    /* ── Fetch ── */
    const fetchEntries = async () => {
        try {
            const data = await fetch('/api/journal-entries').then(r => r.json());
            setEntries(Array.isArray(data) ? data : []);
            if (Array.isArray(data) && data.length > 0) {
                const max = data.reduce((m: number, e: JournalEntry) => {
                    const n = parseInt(String(e.entryNumber || '').replace(/\D/g, '') || '0');
                    return n > m ? n : m;
                }, 0);
                setNextNumber(formatEntryCode(max + 1));
            }
        } catch { setEntries([]); }
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetch('/api/journal-entries').then(r => r.json()).catch(() => []),
            fetch('/api/accounts').then(r => r.json()).catch(() => []),
            fetch('/api/cost-centers').then(r => r.json()).catch(() => []),
        ]).then(([e, a, c]) => {
            setEntries(Array.isArray(e) ? e : []);
            setAccounts(Array.isArray(a) ? a : []);
            setCostCenters(Array.isArray(c) ? c.filter((cc: any) => cc.isActive) : []);
            if (Array.isArray(e) && e.length > 0) {
                const max = e.reduce((m: number, en: JournalEntry) => {
                    const n = parseInt(String(en.entryNumber || '').replace(/\D/g, '') || '0');
                    return n > m ? n : m;
                }, 0);
                setNextNumber(formatEntryCode(max + 1));
            }
        }).finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e: React.FormEvent, postAfterSave = false) => {
        e.preventDefault();
        setFormError(null);
        const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(String(l.debit)) || 0), 0);
        const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(String(l.credit)) || 0), 0);
        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

        if (!isBalanced) {
            setFormError(`${t('القيد غير متزن')} — ${t('الفرق')}: ${fMoney(Math.abs(totalDebit - totalCredit))}`);
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/journal-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, isPosted: postAfterSave }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || t('فشل الحفظ')); }
            setView('list');
            setForm({ date: new Date().toISOString().split('T')[0], description: '', reference: '', lines: [emptyLine(), emptyLine()] });
            await fetchEntries();
        } catch (err: any) { setFormError(err.message); }
        finally { setSubmitting(false); }
    };

    const togglePost = async (entry: JournalEntry) => {
        setPosting(entry.id);
        try {
            await fetch(`/api/journal-entries/${entry.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPosted: !entry.isPosted }),
            });
            await fetchEntries();
        } catch { }
        finally { setPosting(null); }
    };

    const handlePrintEntry = (entry: JournalEntry) => {
        const company = session?.user as any;
        const html = generateReportHTML(
            t("سند قيد يومية"),
            `
            <table>
                <thead>
                    <tr>
                        <th>${t('كود الحساب')}</th>
                        <th style="text-align:right">${t('اسم الحساب')}</th>
                        <th style="text-align:right">${t('البيان')}</th>
                        <th style="text-align:center">${t('مدين')}</th>
                        <th style="text-align:center">${t('دائن')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${entry.lines.map(l => `
                    <tr>
                        <td style="font-family:monospace">${l.account.code}</td>
                        <td style="text-align:right">${l.account.name}</td>
                        <td style="text-align:right">${l.description || '—'}</td>
                                <td style="text-align:center; font-weight:900; color:${l.debit > 0 ? '#10b981' : '#000'}">${l.debit > 0 ? fMoney(l.debit) : '—'}</td>
                                <td style="text-align:center; font-weight:900; color:${l.credit > 0 ? '#ef4444' : '#000'}">${l.credit > 0 ? fMoney(l.credit) : '—'}</td>
                            </tr>`).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background:#f8fafc; font-weight:1000">
                                <td colspan="3" style="text-align:right; padding:15px">${t('إجمالي القيد المتزن')}</td>
                                <td style="text-align:center; padding:15px; color:#10b981">${fMoney(entry.lines.reduce((s, l) => s + l.debit, 0))}</td>
                                <td style="text-align:center; padding:15px; color:#ef4444">${fMoney(entry.lines.reduce((s, l) => s + l.credit, 0))}</td>
                            </tr>
                        </tfoot>
            </table>
            `,
            company,
            {
                lang,
                dateFrom: new Date(entry.date).toLocaleDateString('en-CA'),
                generatedBy: session?.user?.name || '',
                metadata: [
                    { label: t('رقم القيد'), value: formatEntryCode(entry.entryNumber) },
                    { label: t('تاريخ القيد'), value: new Date(entry.date).toLocaleDateString('en-GB') },
                    { label: t('الحالة'), value: entry.isPosted ? t('مرحّل') : t('مسودة') },
                    { label: t('المرجع'), value: entry.reference || '—' },
                    { label: t('البيان العام'), value: entry.description },
                ],
                summary: [
                    { label: t('إجمالي الحركة المدينة'), value: entry.lines.reduce((s, l) => s + l.debit, 0) },
                    { label: t('إجمالي الحركة الدائنة'), value: entry.lines.reduce((s, l) => s + l.credit, 0) },
                    { label: t('صافي القيمة'), value: entry.lines.reduce((s, l) => s + l.debit, 0), isTotal: true },
                ]
            }
        );
        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
    };

    const filteredAll = entries.filter(e => {
        const matchSearch = (e.description || '').includes(search) || (e.entryNumber || '').includes(search) || (e.reference || '').includes(search);
        const matchStatus = filterStatus === 'all' ? true : filterStatus === 'posted' ? e.isPosted : !e.isPosted;
        return matchSearch && matchStatus;
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const postedCount = entries.filter(e => e.isPosted).length;
    const draftCount = entries.filter(e => !e.isPosted).length;
    const totalAmt = entries.reduce((s: number, e: JournalEntry) => s + e.lines.reduce((ls: number, l: JournalLine) => ls + l.debit, 0), 0);

    return (
        <DashboardLayout>
            <PageHeader 
                title={view === 'create' ? t("إنشاء قيد يومية جديد") : t("قيود اليومية العامة")} 
                subtitle={view === 'create' ? t("أدخل تفاصيل الحسابات وتأكد من توازن المدين والدائن") : t("إثبات وتوثيق كافة العمليات المالية بالدفاتر")} 
                icon={view === 'create' ? PlusCircle : FileText}
                onBack={view === 'create' ? () => setView('list') : undefined}
                primaryButton={canCreate && view === 'list' ? { label: t('قيد يومية جديد'), onClick: () => setView('create'), icon: Plus } : undefined} />

            {view === 'list' ? (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: t('إجمالي القيود'), value: entries.length, color: C.blue, icon: <FileText size={18} /> },
                            { label: t('قيود مرحّلة'), value: postedCount, color: C.success, icon: <CheckCircle2 size={18} /> },
                            { label: t('مسودات'), value: draftCount, color: C.warning, icon: <Clock size={18} /> },
                            { label: t('إجمالي المبالغ'), value: totalAmt.toLocaleString('en-US'), color: C.purple, icon: <Send size={18} />, small: true, suffix: currencySymbol },
                        ].map((s, i) => (
                            <div key={i} style={{ ...SC, ...KPI_STYLE(s.color), padding: '16px 20px', justifyContent: 'flex-start' }}>
                                <div style={KPI_ICON(s.color)}>{s.icon}</div>
                                <div style={{ textAlign: 'start' }}>
                                    <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, marginBottom: '2px' }}>{s.label}</div>
                                    <div style={{ fontSize: s.small ? '15px' : '20px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>
                                        {s.value} {s.suffix && <span style={{ fontSize: '11px', color: C.textMuted }}>{s.suffix}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch' }}>
                        <div style={SEARCH_STYLE.wrapper}>
                            <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.primary)} />
                            <input placeholder={t("ابحث برقم القيد...")} value={search} onChange={e => setSearch(e.target.value)} style={SEARCH_STYLE.input} />
                        </div>
                    </div>

                    <div style={TABLE_STYLE.container}>
                        <table style={TABLE_STYLE.table}>
                            <thead>
                                <tr style={TABLE_STYLE.thead}>
                                    <th style={{ ...TABLE_STYLE.th(true), textAlign: 'start' }}>{t('رقم القيد')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'start' }}>{t('التاريخ')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'start' }}>{t('البيان / الوصف العام')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'start' }}>{t('المرجع')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'end' }}>{t('المبلغ')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'start' }}>{t('الحالة')}</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('التفاصيل')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((entry, idx) => {
                                    const isExpanded = expandedId === entry.id;
                                    const dr = entry.lines.reduce((s, l) => s + l.debit, 0);
                                    return (
                                        <React.Fragment key={entry.id}>
                                            <tr style={TABLE_STYLE.row(idx === paginated.length - 1 && !isExpanded)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ ...TABLE_STYLE.td(true), fontWeight: 800, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: INTER, textAlign: 'start' }}>
                                                    {formatEntryCode(entry.entryNumber)}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), fontSize: '11px', color: C.textSecondary, fontFamily: INTER, textAlign: 'start' }}>
                                                    {new Date(entry.date).toLocaleDateString('en-GB')}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'start' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{entry.description}</div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'start' }}>
                                                    {entry.reference ? <span style={{ fontSize: '10px', color: C.textMuted, border: `1px solid ${C.border}`, padding: '2px 8px', borderRadius: '4px' }}>{entry.reference}</span> : '—'}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', fontSize: '15px', fontWeight: 900, color: C.purple, fontFamily: CAIRO }}>
                                                    {fMoney(dr)}
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'start' }}>
                                                    <button onClick={() => togglePost(entry)} disabled={posting === entry.id}
                                                        style={{ 
                                                            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', 
                                                            border: '1px solid', fontSize: '10px', fontWeight: 800, cursor: 'pointer', fontFamily: CAIRO,
                                                            ...(entry.isPosted ? { background: C.successBg, color: C.success, borderColor: C.successBorder } : { background: C.warningBg, color: C.warning, borderColor: C.warningBorder }) 
                                                        }}
                                                    >
                                                        {posting === entry.id ? <Loader2 size={11} className="animate-spin" /> : entry.isPosted ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                                                        {entry.isPosted ? t('مرحّل') : t('مسودة')}
                                                    </button>
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                        <button onClick={() => setExpandedId(isExpanded ? null : entry.id)} style={TABLE_STYLE.actionBtn(isExpanded ? C.primary : C.textMuted)}><ChevronRight size={16} /></button>
                                                        <button onClick={() => handlePrintEntry(entry)} style={TABLE_STYLE.actionBtn(C.textSecondary)}><Printer size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={7} style={{ padding: '0 20px 20px' }}>
                                                        <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                                <thead style={{ background: C.subtle }}>
                                                                    <tr>
                                                                        <th style={{ padding: '12px', textAlign: 'start', fontFamily: CAIRO, fontSize: '11px' }}>{t('الحساب')}</th>
                                                                        <th style={{ padding: '12px', textAlign: 'start', fontFamily: CAIRO, fontSize: '11px' }}>{t('مركز التكلفة')}</th>
                                                                        <th style={{ padding: '12px', textAlign: 'center', fontFamily: CAIRO, fontSize: '11px' }}>{t('مدين')}</th>
                                                                        <th style={{ padding: '12px', textAlign: 'center', fontFamily: CAIRO, fontSize: '11px' }}>{t('دائن')}</th>
                                                                        <th style={{ padding: '12px', textAlign: 'start', fontFamily: CAIRO, fontSize: '11px' }}>{t('البيان')}</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {entry.lines.map((line, lidx) => (
                                                                        <tr key={lidx} style={{ borderBottom: `1px solid ${C.border}` }}>
                                                                            <td style={{ padding: '10px 12px' }}>
                                                                                <div style={{ fontWeight: 700, fontSize: '13px' }}>{line.account.name}</div>
                                                                                <div style={{ fontSize: '10px', color: C.primary, fontFamily: INTER }}>{line.account.code}</div>
                                                                            </td>
                                                                            <td style={{ padding: '10px 12px', fontSize: '12px', color: C.textSecondary }}>{line.costCenter?.name || '—'}</td>
                                                                            <td style={{ textAlign: 'center', fontWeight: 900, color: C.success, fontFamily: CAIRO }}>{line.debit > 0 ? fMoney(line.debit) : '—'}</td>
                                                                            <td style={{ textAlign: 'center', fontWeight: 900, color: C.danger, fontFamily: CAIRO }}>{line.credit > 0 ? fMoney(line.credit) : '—'}</td>
                                                                            <td style={{ padding: '10px 12px', fontSize: '12px', color: C.textMuted }}>{line.description || '—'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                        <Pagination total={filteredAll.length} pageSize={pageSize} currentPage={currentPage} onPageChange={setCurrentPage} />
                    </div>
                </>
            ) : (
                <div style={PAGE_BASE}>
                    <div style={{ ...TABLE_STYLE.container, border: `1px solid ${C.border}`, background: C.card, overflow: 'visible' }}>

                        <div style={{ padding: '24px' }}>
                            <form onSubmit={e => handleSubmit(e)}>
                                {/* Basic Info */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 150px) 1.5fr 3fr', gap: '20px', marginBottom: '24px' }}>
                                    <div>
                                        <label style={LS}>{t('رقم القيد')}</label>
                                        <div style={{
                                            height: '42px', borderRadius: '10px',
                                            background: 'rgba(59,130,244,0.08)',
                                            border: `1px solid ${C.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontFamily: INTER, fontWeight: 900,
                                            fontSize: '14px', color: C.primary,
                                            letterSpacing: '1px'
                                        }}>
                                            {formatEntryCode(nextNumber)}
                                        </div>
                                    </div>
                                    <div><label style={LS}>{t('التاريخ')}</label><input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...IS, direction: 'ltr' }} /></div>
                                    <div><label style={LS}>{t('البيان العام / الوصف')}</label><input required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t("شرح مختصر للقيد...")} style={IS} /></div>
                                </div>

                                {/* Lines Editor */}
                                <div style={{ marginBottom: '24px', overflowX: 'visible' }}>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ fontSize: '11px', fontWeight: 800, color: C.textMuted, padding: '0 8px', textAlign: 'start', fontFamily: CAIRO }}>{t('الحساب المحاسبي')}</th>
                                                <th style={{ fontSize: '11px', fontWeight: 800, color: C.textMuted, padding: '0 8px', textAlign: 'start', fontFamily: CAIRO }}>{t('مركز التكلفة')}</th>
                                                <th style={{ fontSize: '11px', fontWeight: 800, color: C.textMuted, padding: '0 8px', textAlign: 'center', fontFamily: CAIRO }}>{t('مدين')}</th>
                                                <th style={{ fontSize: '11px', fontWeight: 800, color: C.textMuted, padding: '0 8px', textAlign: 'center', fontFamily: CAIRO }}>{t('دائن')}</th>
                                                <th style={{ fontSize: '11px', fontWeight: 800, color: C.textMuted, padding: '0 8px', textAlign: 'start', fontFamily: CAIRO }}>{t('البيان')}</th>
                                                <th style={{ width: '40px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {form.lines.map((ln, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ minWidth: '240px', padding: '0 4px' }}>
                                                        <CustomSelect 
                                                            value={ln.accountId} 
                                                            onChange={v => {
                                                                const newLines = [...form.lines];
                                                                newLines[idx].accountId = v;
                                                                setForm({ ...form, lines: newLines });
                                                            }}
                                                            options={accounts.map(a => ({ value: a.id, label: `${a.code} - ${a.name}` }))}
                                                            placeholder={t("اختر الحساب")}
                                                            openUp={true}
                                                        />
                                                    </td>
                                                    <td style={{ minWidth: '180px', padding: '0 4px' }}>
                                                        <CustomSelect 
                                                            value={ln.costCenterId || ''} 
                                                            onChange={v => {
                                                                const newLines = [...form.lines];
                                                                newLines[idx].costCenterId = v;
                                                                setForm({ ...form, lines: newLines });
                                                            }}
                                                            options={costCenters.map(cc => ({ value: cc.id, label: cc.name }))}
                                                            placeholder={t("اختياري")}
                                                            openUp={true}
                                                        />
                                                    </td>
                                                    <td style={{ width: '130px', padding: '0 4px' }}>
                                                        <input type="number" step="0.01" value={ln.debit || ''} 
                                                            onChange={e => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                const newLines = [...form.lines];
                                                                newLines[idx].debit = val;
                                                                if (val > 0) newLines[idx].credit = 0;
                                                                setForm({ ...form, lines: newLines });
                                                            }}
                                                            style={{ ...IS, textAlign: 'center', fontFamily: CAIRO, fontWeight: 800, color: C.success }} 
                                                        />
                                                    </td>
                                                    <td style={{ width: '130px', padding: '0 4px' }}>
                                                        <input type="number" step="0.01" value={ln.credit || ''} 
                                                            onChange={e => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                const newLines = [...form.lines];
                                                                newLines[idx].credit = val;
                                                                if (val > 0) newLines[idx].debit = 0;
                                                                setForm({ ...form, lines: newLines });
                                                            }}
                                                            style={{ ...IS, textAlign: 'center', fontFamily: CAIRO, fontWeight: 800, color: C.danger }} 
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0 4px' }}>
                                                        <input value={ln.description || ''} 
                                                            onChange={e => {
                                                                const newLines = [...form.lines];
                                                                newLines[idx].description = e.target.value;
                                                                setForm({ ...form, lines: newLines });
                                                            }}
                                                            placeholder={t("وصف الحركة...")} style={{ ...IS, fontFamily: CAIRO }} 
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0 4px' }}>
                                                        {form.lines.length > 2 && (
                                                            <button type="button" onClick={() => {
                                                                const newLines = form.lines.filter((_, i) => i !== idx);
                                                                setForm({ ...form, lines: newLines });
                                                            }} style={{ ...TABLE_STYLE.actionBtn(C.danger), border: 'none', background: 'rgba(239,68,68,0.1)' }}><X size={16} /></button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <button type="button" onClick={() => setForm({ ...form, lines: [...form.lines, emptyLine()] })}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', background: C.subtle, border: `1px dashed ${C.border}`, color: C.textPrimary, fontSize: '13px', fontWeight: 800, cursor: 'pointer', marginBottom: '24px', fontFamily: CAIRO }}>
                                    <Plus size={16} /> {t('إضافة حطوة جديدة')}
                                </button>

                                {/* Totals & Actions */}
                                <div style={{ background: C.subtle, borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                                    <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 800, marginBottom: '4px', fontFamily: CAIRO }}>{t('إجمالي المدين')}</div>
                                            <div style={{ fontSize: '18px', fontWeight: 900, color: C.success, fontFamily: CAIRO, display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                {form.lines.reduce((s, l) => s + (l.debit || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                <span style={{ fontSize: '10px', opacity: 0.8 }}>{currencySymbol}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 800, marginBottom: '4px', fontFamily: CAIRO }}>{t('إجمالي الدائن')}</div>
                                            <div style={{ fontSize: '18px', fontWeight: 900, color: C.danger, fontFamily: CAIRO, display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                {form.lines.reduce((s, l) => s + (l.credit || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                <span style={{ fontSize: '10px', opacity: 0.8 }}>{currencySymbol}</span>
                                            </div>
                                        </div>
                                        <div style={{ borderInlineStart: `1px solid ${C.border}`, paddingInlineStart: '40px' }}>
                                            <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 800, marginBottom: '4px', fontFamily: CAIRO }}>{t('الفارق (التوازن)')}</div>
                                            <div style={{ fontSize: '18px', fontWeight: 900, color: Math.abs(form.lines.reduce((s, l) => s + (l.debit || 0), 0) - form.lines.reduce((s, l) => s + (l.credit || 0), 0)) < 0.01 ? C.success : C.warning, fontFamily: CAIRO, display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                {Math.abs(form.lines.reduce((s, l) => s + (l.debit || 0), 0) - form.lines.reduce((s, l) => s + (l.credit || 0), 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                <span style={{ fontSize: '10px', opacity: 0.8 }}>{currencySymbol}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button type="button" onClick={() => setView('list')} style={{ height: '48px', padding: '0 24px', borderRadius: '12px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>{t('إلغاء')}</button>
                                        <button type="submit" disabled={submitting} 
                                            style={{ ...BTN_PRIMARY(submitting, false), width: '200px', height: '48px', boxShadow: '0 10px 20px -5px rgba(37,106,244,0.3)' }}>
                                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                            {t('حفظ القيد')}
                                        </button>
                                    </div>
                                </div>

                                {formError && (
                                    <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', color: C.danger, fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertTriangle size={16} /> {formError}
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}


