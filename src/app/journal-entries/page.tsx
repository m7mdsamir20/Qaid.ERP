'use client';

import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import React, { useEffect, useState } from 'react';
import { FileText, Plus, X, ChevronRight, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, Loader2, Search, Trash2, AlertTriangle, Send } from 'lucide-react';
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
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

// refTypeLabels is initialized inside the component to support i18n

/* ══════════════════════════════════════════ */
export default function JournalEntriesPage() {
    const { data: session } = useSession();
    const { symbol: currencySymbol } = useCurrency();
    const { t } = useTranslation();

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
    const [nextNumber, setNextNumber] = useState('JRN-0001');
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
            // Auto next number
            if (Array.isArray(data) && data.length > 0) {
                const max = data.reduce((m: number, e: JournalEntry) => {
                    const n = parseInt(String(e.entryNumber || '').replace(/\D/g, '') || '0');
                    return n > m ? n : m;
                }, 0);
                setNextNumber(`JRN-${String(max + 1).padStart(4, '0')}`);
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
                setNextNumber(`JRN-${String(max + 1).padStart(4, '0')}`);
            }
        }).finally(() => setLoading(false));
    }, []);

    /* ── Lines ── */
    const updateLine = (idx: number, field: string, value: any) => {
        const lines = form.lines.map((l, i) => {
            if (i !== idx) return l;
            const updated = { ...l, [field]: value };
            if (field === 'debit' && parseFloat(value) > 0) updated.credit = 0;
            if (field === 'credit' && parseFloat(value) > 0) updated.debit = 0;
            return updated;
        });
        setForm(f => ({ ...f, lines }));
    };
    const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }));
    const removeLine = (idx: number) => {
        if (form.lines.length <= 2) return;
        setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
    };

    const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(String(l.debit)) || 0), 0);
    const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(String(l.credit)) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

    /* ── Submit ── */
    const handleSubmit = async (e: React.FormEvent, postAfterSave = false) => {
        e.preventDefault();
        setFormError(null);
        if (!isBalanced) {
            setFormError(`${t('القيد غير متزن')} — ${t('الفرق')}: ${fmt(Math.abs(totalDebit - totalCredit))}`);
            return;
        }
        if (form.lines.some(l => !l.accountId)) {
            setFormError(t('يجب اختيار الحساب لجميع أطراف القيد'));
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

    /* ── Post/Unpost ── */
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

    /* ── Filtered & Paginated ── */
    const filteredAll = entries.filter(e => {
        const matchSearch = e.description.includes(search) || (e.entryNumber || '').includes(search) || (e.reference || '').includes(search);
        const matchStatus = filterStatus === 'all' ? true : filterStatus === 'posted' ? e.isPosted : !e.isPosted;
        return matchSearch && matchStatus;
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [search, filterStatus]);

    /* ── Stats ── */
    const postedCount = entries.filter(e => e.isPosted).length;
    const draftCount = entries.filter(e => !e.isPosted).length;
    const totalAmt = entries.reduce((s: number, e: JournalEntry) => s + e.lines.reduce((ls: number, l: JournalLine) => ls + l.debit, 0), 0);

    return (
        <DashboardLayout>
            <PageHeader
                title={t("قيود اليومية العامة")}
                subtitle={t("إثبات وتوثيق كافة العمليات المالية بالدفاتر — الضبط المحاسبي المزدوج")}
                icon={FileText}
                primaryButton={canCreate && view === 'list' ? {
                    label: t('قيد يومية جديد'),
                    onClick: () => { setFormError(null); setView('create'); },
                    icon: Plus
                } : undefined}
            />

            {view === 'list' ? (
                <>
                    {/* ── Stats ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: t('إجمالي القيود'), value: entries.length, color: C.blue, icon: <FileText size={18} /> },
                            { label: t('قيود مرحّلة'), value: postedCount, color: C.success, icon: <CheckCircle2 size={18} /> },
                            { label: t('مسودات'), value: draftCount, color: C.warning, icon: <Clock size={18} /> },
                            { label: t('إجمالي المبالغ'), value: totalAmt.toLocaleString('en-US'), color: C.purple, icon: <Send size={18} />, small: true, suffix: currencySymbol },
                        ].map((s, i) => (
                            <div key={i} style={{ ...SC, ...KPI_STYLE(s.color), padding: '16px 20px', justifyContent: 'flex-start' }}>
                                <div style={KPI_ICON(s.color)}>
                                    {s.icon}
                                </div>
                                <div style={{ textAlign: 'start' }}>
                                    <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, marginBottom: '2px' }}>{s.label}</div>
                                    <div style={{ fontSize: s.small ? '15px' : '20px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>
                                        {s.value} {s.suffix && <span style={{ fontSize: '11px', color: C.textMuted, marginInlineEnd: '4px' }}>{s.suffix}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Search & Filter ── */}
                    <div style={SEARCH_STYLE.container}>
                        <div style={SEARCH_STYLE.wrapper}>
                            <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.primary)} />
                            <input
                                placeholder={t("ابحث برقم القيد، الوصف، أو المرجع...")}
                                value={search} onChange={e => setSearch(e.target.value)}
                                style={SEARCH_STYLE.input} 
                                onFocus={focusIn} onBlur={focusOut} 
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            {([['all', t('الكل')], ['posted', t('مرحّل')], ['draft', t('مسودة')]] as ["all" | "posted" | "draft", string][]).map(([val, label]) => (
                                <button key={val} onClick={() => setFilterStatus(val)}
                                    style={{ 
                                        height: '42px', padding: '0 20px', borderRadius: '12px', 
                                        border: `1px solid ${filterStatus === val ? C.primaryBorder : C.border}`, 
                                        fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: '0.2s', 
                                        background: filterStatus === val ? C.primaryBg : C.card, 
                                        color: filterStatus === val ? C.primary : C.textSecondary,
                                        fontFamily: CAIRO
                                    }}
                                    onMouseEnter={e => { if (filterStatus !== val) e.currentTarget.style.borderColor = C.primary; }}
                                    onMouseLeave={e => { if (filterStatus !== val) e.currentTarget.style.borderColor = C.border; }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── List ── */}
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', flexDirection: 'column', gap: '12px', color: '#475569' }}>
                            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
                            <span>{t('جاري التحميل...')}</span>
                        </div>
                    ) : filteredAll.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#475569', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px' }}>
                            <FileText size={56} style={{ margin: '0 auto 14px', display: 'block', opacity: 0.08 }} />
                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#334155' }}>{search ? t('لا توجد نتائج') : t('لا توجد قيود بعد')}</p>
                            <p style={{ margin: '8px 0 0', fontSize: '13px' }}>{t('اضغط "قيد جديد" للبدء')}</p>
                        </div>
                    ) : (
                        <div style={TABLE_STYLE.container}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(true)}>{t('رقم القيد')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('التاريخ')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('البيان / الوصف العام')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('المرجع')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'end' }}>{t('المبلغ الإجمالي')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('الحالة')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('التفاصيل')}</th>
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
                                                    <td style={{ ...TABLE_STYLE.td(true), fontSize: '12px', fontWeight: 800, color: C.primary, fontFamily: INTER }}>
                                                        {entry.entryNumber}
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(false), fontSize: '11px', color: C.textSecondary, fontFamily: INTER }}>
                                                        {new Date(entry.date).toLocaleDateString('en-GB')}
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{entry.description}</div>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        {entry.reference ? (
                                                            <span style={{ fontSize: '11px', color: C.textMuted, background: C.inputBg, border: `1px solid ${C.border}`, padding: '2px 8px', borderRadius: '4px' }}>
                                                                {refTypeLabels[entry.referenceType || ''] || t('مرجع')}: {entry.reference}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td style={{ ...TABLE_STYLE.td(false), textAlign: 'end', fontSize: '16px', fontWeight: 900, color: C.purple, fontFamily: INTER }}>
                                                        {fmt(dr)} <span style={{ fontSize: '10px', color: C.textMuted, marginInlineEnd: '4px' }}>{currencySymbol}</span>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        <div onClick={e => e.stopPropagation()}>
                                                            {canPost ? (
                                                                <button onClick={() => togglePost(entry)} disabled={posting === entry.id}
                                                                    style={{ 
                                                                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', 
                                                                        border: '1px solid', fontSize: '11px', fontWeight: 800, cursor: 'pointer', transition: '0.2s', fontFamily: CAIRO,
                                                                        ...(entry.isPosted ? { background: C.successBg, color: C.success, borderColor: C.successBorder } : { background: C.warningBg, color: C.warning, borderColor: C.warningBorder }) 
                                                                    }}
                                                                >
                                                                    {posting === entry.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : entry.isPosted ? <><CheckCircle2 size={11} /> {t('مرحّل')}</> : <><Clock size={11} /> {t('مسودة')}</>}
                                                                </button>
                                                            ) : (
                                                                <span style={{ 
                                                                    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', border: '1px solid', 
                                                                    fontSize: '11px', fontWeight: 800, fontFamily: CAIRO,
                                                                    ...(entry.isPosted ? { background: C.successBg, color: C.success, borderColor: C.successBorder } : { background: C.warningBg, color: C.warning, borderColor: C.warningBorder }) 
                                                                }}>
                                                                    {entry.isPosted ? <><CheckCircle2 size={11} /> {t('مرحّل')}</> : <><Clock size={11} /> {t('مسودة')}</>}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={TABLE_STYLE.td(false)}>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : entry.id); }}
                                                            style={TABLE_STYLE.actionBtn(isExpanded ? C.primary : C.textMuted)}
                                                        >
                                                            <ChevronRight size={16} style={{ 
                                                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                                                                transition: '0.2s',
                                                                width: TABLE_STYLE.actionIconSize,
                                                                height: TABLE_STYLE.actionIconSize
                                                            }} />
                                                        </button>
                                                    </td>
                                                </tr>

                                                {isExpanded && (
                                                    <tr style={{ background: 'rgba(37,106,244,0.03)' }}>
                                                        <td colSpan={7} style={{ padding: '0 20px 20px' }}>
                                                            <div style={{ animation: 'fadeIn 0.2s ease', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: `1px solid ${C.border}`, overflow: 'hidden', marginTop: '10px' }}>
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'inherit' }}>
                                                                    <thead>
                                                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                                                            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: C.textMuted, textAlign: 'start', fontFamily: CAIRO }}>{t('الحساب')}</th>
                                                                            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: C.textMuted, textAlign: 'start', fontFamily: CAIRO }}>{t('مراكز التكلفة')}</th>
                                                                            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: C.textMuted, textAlign: 'start', fontFamily: CAIRO }}>{t('البيان')}</th>
                                                                            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: C.textMuted, textAlign: 'center', width: '120px', fontFamily: CAIRO }}>{t('مدين')}</th>
                                                                            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: C.textMuted, textAlign: 'center', width: '120px', fontFamily: CAIRO }}>{t('دائن')}</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {entry.lines.map((line, lidx) => (
                                                                            <tr key={line.id} style={{ borderBottom: lidx < entry.lines.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                                                                <td style={{ padding: '12px 16px' }}>
                                                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{line.account.name}</div>
                                                                                    <div style={{ fontSize: '10px', color: C.primary, fontWeight: 700, fontFamily: INTER }}>{line.account.code}</div>
                                                                                </td>
                                                                                <td style={{ padding: '12px 16px' }}>
                                                                                    {line.costCenter?.name ? (
                                                                                        <span style={{ fontSize: '11px', fontWeight: 700, color: C.textSecondary, background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px', border: `1px solid ${C.border}`, fontFamily: CAIRO }}>
                                                                                            {line.costCenter.name}
                                                                                        </span>
                                                                                    ) : <span style={{ color: C.textMuted, fontSize: '11px' }}>—</span>}
                                                                                </td>
                                                                                <td style={{ padding: '12px 16px', fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{line.description || '—'}</td>
                                                                                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: 900, color: line.debit > 0 ? C.success : 'rgba(255,255,255,0.05)', fontFamily: INTER }}>
                                                                                    {line.debit > 0 ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><ArrowUpRight size={14} />{fmt(line.debit)}</div> : '—'}
                                                                                </td>
                                                                                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: 900, color: line.credit > 0 ? C.danger : 'rgba(255,255,255,0.05)', fontFamily: INTER }}>
                                                                                    {line.credit > 0 ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><ArrowDownRight size={14} />{fmt(line.credit)}</div> : '—'}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                    <tfoot>
                                                                        <tr style={{ background: 'rgba(255,255,255,0.015)', borderTop: `1px solid ${C.border}` }}>
                                                                            <td colSpan={3} style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 900, color: C.textMuted, fontFamily: CAIRO }}>{t('الإجمالي المتزن')}</td>
                                                                            <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '15px', fontWeight: 900, color: C.success, fontFamily: INTER }}>{fmt(dr)}</td>
                                                                            <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '15px', fontWeight: 900, color: C.danger, fontFamily: INTER }}>{fmt(dr)}</td>
                                                                        </tr>
                                                                    </tfoot>
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
                            {/* Pagination Footer */}
                            <Pagination 
                                total={filteredAll.length} 
                                pageSize={pageSize} 
                                currentPage={currentPage} 
                                onPageChange={setCurrentPage} 
                            />
                        </div>
                    )}
                </>
            ) : (
                /* ── Create View ── */
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ ...TABLE_STYLE.container, border: `1px solid ${C.primaryBorder}`, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: C.primaryBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                                    <Plus size={20} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('إنشاء قيد يومية جديد')}</h2>
                                    <p style={{ margin: 0, fontSize: '11px', color: C.textMuted }}>{t('أدخل تفاصيل الأطراف المتأثرة بالقيد لضمان توازن الحسابات')}</p>
                                </div>
                            </div>
                            <div style={{ background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO }}>{t('رقم القيد المقترح')}:</span>
                                <span style={{ fontFamily: INTER, fontSize: '14px', fontWeight: 900, color: C.primary }}>{nextNumber}</span>
                            </div>
                        </div>

                        {/* Form Body */}
                        <div style={{ padding: '24px' }}>
                            <form id="journal-form" onSubmit={e => handleSubmit(e, false)}>
                                {/* Basic Info */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                    <div>
                                        <label style={{ ...LS, marginBottom: '8px', display: 'block' }}>{t('تاريخ القيد')} <span style={{ color: C.danger }}>*</span></label>
                                        <input type="date" required value={form.date}
                                            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                            style={{ ...IS, height: '44px', direction: 'ltr', textAlign: 'end', colorScheme: 'dark', fontSize: '14px', fontWeight: 700, fontFamily: INTER }}
                                            onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, marginBottom: '8px', display: 'block' }}>{t('البيان العام للقيد')} <span style={{ color: C.danger }}>*</span></label>
                                        <input required value={form.description}
                                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                            placeholder={t("اكتب وصفاً مختصراً يوضح طبيعة هذا القيد...")}
                                            style={{ ...IS, height: '44px', fontSize: '14px', fontFamily: CAIRO }} 
                                            onFocus={focusIn} onBlur={focusOut} autoFocus />
                                    </div>
                                    <div>
                                        <label style={{ ...LS, marginBottom: '8px', display: 'block' }}>{t('رقم المرجع (اختياري)')}</label>
                                        <input value={form.reference}
                                            onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                                            placeholder={t("رقم المستند المرتبط")}
                                            style={{ ...IS, height: '44px', direction: 'ltr', textAlign: 'end', fontSize: '14px', fontFamily: INTER }}
                                            onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                </div>

                                {/* Lines Table */}
                                <div style={{ border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'inherit' }}>
                                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                                                <th style={{ padding: '14px', fontSize: '12px', fontWeight: 800, color: C.textMuted, textAlign: 'start', fontFamily: CAIRO }}>{t('الحساب المحاسبي')}</th>
                                                <th style={{ padding: '14px', fontSize: '12px', fontWeight: 800, color: C.textMuted, textAlign: 'start', width: '220px', fontFamily: CAIRO }}>{t('مراكز التكلفة')}</th>
                                                <th style={{ padding: '14px', fontSize: '12px', fontWeight: 800, color: C.textMuted, textAlign: 'start', fontFamily: CAIRO }}>{t('بيان السطر')}</th>
                                                <th style={{ padding: '14px', fontSize: '12px', fontWeight: 800, color: C.textMuted, textAlign: 'center', width: '140px', fontFamily: CAIRO }}>{t('مدين')}</th>
                                                <th style={{ padding: '14px', fontSize: '12px', fontWeight: 800, color: C.textMuted, textAlign: 'center', width: '140px', fontFamily: CAIRO }}>{t('دائن')}</th>
                                                <th style={{ width: '50px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody style={{ background: 'rgba(255,255,255,0.01)' }}>
                                            {form.lines.map((line, idx) => (
                                                <tr key={idx} style={{ borderBottom: idx < form.lines.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                                    <td style={{ padding: '12px 8px' }}>
                                                        <CustomSelect value={line.accountId} onChange={val => updateLine(idx, 'accountId', val)} placeholder={t("ابحث واختر الحساب...")}
                                                            style={{ height: '40px' }}
                                                            options={accounts.map(a => ({
                                                                value: a.id,
                                                                label: a.name,
                                                                sub: a.code
                                                            }))} />
                                                    </td>
                                                    <td style={{ padding: '12px 8px' }}>
                                                        <CustomSelect value={line.costCenterId || ''} onChange={val => updateLine(idx, 'costCenterId', val)} placeholder={t("— مركز التكلفة —")}
                                                            style={{ height: '40px' }}
                                                            options={[{ value: '', label: t('— بدون مركز —') }, ...costCenters.map(cc => ({ value: cc.id, label: cc.name }))]} />
                                                    </td>
                                                    <td style={{ padding: '12px 8px' }}>
                                                        <input value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} placeholder={t("وصف خاص بهذا السطر...")} style={{ ...IS, height: '40px', fontSize: '13px', fontFamily: CAIRO }} />
                                                    </td>
                                                    <td style={{ padding: '12px 8px' }}>
                                                        <input type="number" value={line.debit || ''} onChange={e => updateLine(idx, 'debit', e.target.value)} disabled={line.credit > 0} 
                                                            style={{ ...IS, height: '40px', direction: 'ltr', textAlign: 'center', color: C.success, fontWeight: 900, fontSize: '15px', opacity: line.credit > 0 ? 0.2 : 1, fontFamily: INTER }} />
                                                    </td>
                                                    <td style={{ padding: '12px 8px' }}>
                                                        <input type="number" value={line.credit || ''} onChange={e => updateLine(idx, 'credit', e.target.value)} disabled={line.debit > 0} 
                                                            style={{ ...IS, height: '40px', direction: 'ltr', textAlign: 'center', color: C.danger, fontWeight: 900, fontSize: '15px', opacity: line.debit > 0 ? 0.2 : 1, fontFamily: INTER }} />
                                                    </td>
                                                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                                        <button type="button" onClick={() => removeLine(idx)} disabled={form.lines.length <= 2} 
                                                            style={{ color: C.textMuted, background: 'none', border: 'none', cursor: form.lines.length <= 2 ? 'not-allowed' : 'pointer', padding: '4px' }}
                                                            onMouseEnter={e => { if(form.lines.length > 2) e.currentTarget.style.color = C.danger; }}
                                                            onMouseLeave={e => { if(form.lines.length > 2) e.currentTarget.style.color = C.textMuted; }}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot style={{ background: 'rgba(255,255,255,0.02)', borderTop: `1px solid ${C.border}` }}>
                                            <tr>
                                                <td colSpan={3} style={{ padding: '16px 20px' }}>
                                                    <button type="button" onClick={addLine} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: C.primary, color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: CAIRO, boxShadow: '0 4px 12px rgba(37,106,244,0.3)' }}>
                                                        <Plus size={16} /> {t('إضافة طرف للقيد')}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'center', fontSize: '16px', fontWeight: 900, color: C.success, fontFamily: INTER, borderInlineEnd: `1px solid ${C.border}` }}>{fmt(totalDebit)}</td>
                                                <td style={{ padding: '16px', textAlign: 'center', fontSize: '16px', fontWeight: 900, color: C.danger, fontFamily: INTER }}>{fmt(totalCredit)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Validation Area */}
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                                    <div style={{ 
                                        padding: '12px 24px', borderRadius: '16px', 
                                        background: isBalanced ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', 
                                        border: `1px solid ${isBalanced ? C.successBorder : C.dangerBorder}`, 
                                        display: 'flex', gap: '24px', alignItems: 'center' 
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isBalanced ? C.success : C.danger, fontWeight: 800, fontSize: '14px', fontFamily: CAIRO }}>
                                            {isBalanced ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                                            {isBalanced ? t('القيد متزن وجاهز للحفظ') : `${t('القيد غير متزن')} — ${t('الفرق')}: ${fmt(Math.abs(totalDebit - totalCredit))}`}
                                        </div>
                                    </div>
                                </div>

                                {formError && (
                                    <div style={{ 
                                        padding: '16px', background: 'rgba(239,68,68,0.1)', color: C.danger, 
                                        borderRadius: '12px', marginBottom: '20px', fontSize: '14px', fontWeight: 700, 
                                        border: `1px solid ${C.dangerBorder}`, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' 
                                    }}>
                                        <AlertTriangle size={18} /> {formError}
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Footer Actions */}
                        <div style={{ display: 'flex', gap: '16px', padding: '24px', background: 'rgba(255,255,255,0.01)', borderTop: `1px solid ${C.border}` }}>
                            <button type="button" 
                                onClick={() => { setView('list'); setForm({ date: new Date().toISOString().split('T')[0], description: '', reference: '', lines: [emptyLine(), emptyLine()] }); }} 
                                style={{ height: '48px', padding: '0 30px', borderRadius: '12px', background: 'transparent', color: C.textSecondary, border: `1px solid ${C.border}`, fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}
                            >
                                {t('إلغاء')}
                            </button>
                            <div style={{ flex: 1 }} />
                            <button type="submit" form="journal-form" disabled={submitting}
                                style={{ height: '48px', padding: '0 30px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: C.textPrimary, border: `1px solid ${C.border}`, fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}
                            >
                                {t('حفظ كمسودة')}
                            </button>
                            <button type="button" onClick={e => handleSubmit(e as any, true)} disabled={submitting || !isBalanced}
                                style={{
                                    height: '48px', padding: '0 40px', borderRadius: '12px',
                                    background: !isBalanced ? C.border : `linear-gradient(135deg, ${C.primary}, ${C.primaryHover})`,
                                    color: '#fff', border: 'none', fontWeight: 800, fontSize: '15px',
                                    cursor: !isBalanced ? 'not-allowed' : 'pointer', fontFamily: CAIRO,
                                    boxShadow: isBalanced ? '0 10px 25px rgba(37,106,244,0.3)' : 'none'
                                }}
                            >
                                {t('ترحيل القيد الآن')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes spin{to{transform:rotate(360deg)}}
                @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
                /* Ensure the form doesn't clip dropdowns */
                #journal-form { overflow: visible !important; }
            `}</style>
        </DashboardLayout>
    );
}

