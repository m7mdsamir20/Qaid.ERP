'use client';

import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
    BookOpen, Plus, ChevronRight, FolderOpen, FileText, X, Pencil, Trash2, 
    AlertTriangle, Loader2, Lock, RefreshCcw, LayoutGrid, Search, MoreHorizontal
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/hooks/useCurrency';
import {
    C, CAIRO, INTER, PAGE_BASE, BTN_PRIMARY, TABLE_STYLE, focusIn, focusOut, LS, IS, SC, STitle
} from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

/* ── Types ── */
interface Account {
    id: string;
    code: string;
    name: string;
    nameEn?: string;
    nature: string;
    type: string;
    accountCategory: 'summary' | 'detail'; // إجمالي أو تحليلي
    level: number;
    isParent: boolean;
    parentId: string | null;
    children: Account[];
    balance?: number;
}

/* ── Constants ── */
const accountTypes = [
    { value: 'asset', label: 'أصول', nature: 'debit', color: '#10b981' },
    { value: 'liability', label: 'خصوم', nature: 'credit', color: '#f87171' },
    { value: 'equity', label: 'حقوق ملكية', nature: 'credit', color: '#a78bfa' },
    { value: 'revenue', label: 'إيرادات', nature: 'credit', color: '#60a5fa' },
    { value: 'expense', label: 'مصروفات', nature: 'debit', color: '#fb923c' },
];

const typeColors: Record<string, string> = {
    asset: '#10b981', liability: '#f87171', equity: '#a78bfa', revenue: '#60a5fa', expense: '#fb923c',
};



/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function AccountsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const { symbol: currencySymbol } = useCurrency();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<Account | null>(null);
    const [deleteItem, setDeleteItem] = useState<Account | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [reseeding, setReseeding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    /* Auto-expand on search */
    useEffect(() => {
        if (!searchQuery.trim()) return;
        const q = searchQuery.toLowerCase();
        const next = new Set(expandedIds);
        let found = false;
        accounts.forEach(a => {
            if (a.name.toLowerCase().includes(q) || (a.code && a.code.includes(q))) {
                found = true;
                let pid = a.parentId;
                while (pid) {
                    if (next.has(pid)) break;
                    next.add(pid);
                    const p = accounts.find(x => x.id === pid);
                    pid = p?.parentId || null;
                }
            }
        });
        if (found) setExpandedIds(next);
    }, [searchQuery, accounts]);

    const isAdmin = session?.user?.role === 'admin';
    const perms = (session?.user as any)?.permissions || {};
    const canCreate = isAdmin || perms['/accounts']?.create;
    const canEdit = isAdmin || perms['/accounts']?.edit;
    const canDelete = isAdmin || perms['/accounts']?.delete;

    const emptyForm = { code: '', name: '', type: 'asset', accountCategory: 'detail' as 'summary' | 'detail', parentId: '' };
    const [form, setForm] = useState(emptyForm);

    /* Nature auto from type */
    const getNature = (type: string) => accountTypes.find(t => t.value === type)?.nature || 'debit';

    /* Generate Next Code */
    const generateNextCode = (parentId: string, type: string, currentAccounts: Account[]) => {
        if (parentId) {
            const parent = currentAccounts.find(a => a.id === parentId);
            const siblings = currentAccounts.filter(a => a.parentId === parentId);
            if (siblings.length === 0) return parent ? parent.code + '01' : '';
            const maxCode = siblings.reduce((max, s) => {
                const n = parseInt(s.code);
                return !isNaN(n) && n > max ? n : max;
            }, 0);
            return (maxCode + 1).toString().padStart(parent ? parent.code.length + 2 : 1, '0');
        } else {
            const roots = currentAccounts.filter(a => !a.parentId && a.type === type);
            if (roots.length === 0) {
                const prefixes: Record<string, string> = { asset: '1', liability: '2', equity: '3', revenue: '4', expense: '5' };
                return prefixes[type] || '9';
            }
            const maxCode = roots.reduce((max, s) => {
                const n = parseInt(s.code);
                return !isNaN(n) && n > max ? n : max;
            }, 0);
            return (maxCode + 1).toString();
        }
    };

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const data = await fetch('/api/accounts').then(r => r.json());
            setAccounts(Array.isArray(data) ? data : []);
        } catch { setAccounts([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAccounts(); }, []);

    /* Open modal */
    const openCreate = () => { setEditItem(null); setForm({ ...emptyForm, code: generateNextCode('', 'asset', accounts) }); setShowModal(true); };
    const openEdit = (a: Account) => {
        setEditItem(a);
        setForm({ code: a.code, name: a.name, type: a.type, accountCategory: a.accountCategory || 'detail', parentId: a.parentId || '' });
        setShowModal(true);
    };

    /* Auto update code when parent changes */
    useEffect(() => {
        if (!editItem && showModal) {
            setForm(f => ({ ...f, code: generateNextCode(f.parentId, f.type, accounts) }));
        }
    }, [form.parentId, form.type, editItem, showModal, accounts]);

    /* Submit */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code.trim() || !form.name.trim()) return;
        setSaving(true);
        try {
            const parentAccount = form.parentId ? accounts.find(a => a.id === form.parentId) : null;
            const level = parentAccount ? parentAccount.level + 1 : 1;
            const nature = getNature(form.type);

            const url = editItem ? `/api/accounts/${editItem.id}` : '/api/accounts';
            const method = editItem ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, nature, level }),
            });
            if (res.ok) { setShowModal(false); fetchAccounts(); }
            else { const d = await res.json(); alert(d.error || 'فشل الحفظ'); }
        } catch { alert('فشل الاتصال'); }
        finally { setSaving(false); }
    };

    /* Delete */
    const handleDelete = async () => {
        if (!deleteItem) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/accounts/${deleteItem.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteItem(null);
                fetchAccounts();
            } else {
                const d = await res.json();
                alert(d.error || 'فشل الحساب');
                setDeleteItem(null);
            }
        } catch { 
            alert('خطأ في الاتصال بالخادم'); 
            setDeleteItem(null);
        }
        finally { setSaving(false); }
    };

    /* Tree */
    const buildTree = (accs: Account[]): Account[] => {
        const map = new Map<string, Account>();
        const roots: Account[] = [];
        accs.forEach(a => map.set(a.id, { ...a, children: [] }));
        accs.forEach(a => {
            const node = map.get(a.id)!;
            if (a.parentId && map.has(a.parentId)) map.get(a.parentId)!.children.push(node);
            else roots.push(node);
        });
        return roots;
    };

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setExpandedIds(next);
    };

    const expandAll = () => setExpandedIds(new Set(accounts.filter(a => a.children?.length > 0 || a.isParent).map(a => a.id)));
    const collapseAll = () => setExpandedIds(new Set());

    /* Stats */
    const byType = (t: string) => accounts.filter(a => a.type === t).length;
    const detailCount = accounts.filter(a => a.accountCategory === 'detail').length;

    const renderTree = (nodes: Account[], depth = 0): React.ReactNode => nodes.map(node => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedIds.has(node.id);
        const typeColor = typeColors[node.type] || '#64748b';
        const isSummary = node.accountCategory === 'summary' || hasChildren;

        return (
            <div key={node.id}>
                <div
                    style={{
                        display: 'flex', alignItems: 'center', gap: '16px',
                        padding: `14px 24px 14px ${24 + depth * 32}px`,
                        borderBottom: `1px solid ${C.border}`,
                        transition: 'all 0.2s ease', cursor: hasChildren ? 'pointer' : 'default',
                        direction: 'rtl',
                        background: isSummary && depth === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
                    }}
                    onClick={() => hasChildren && toggleExpand(node.id)}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = isSummary && depth === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'}
                >
                    {/* Toggle */}
                    <div style={{ 
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        flexShrink: 0, borderRadius: '8px', 
                        background: hasChildren ? 'rgba(255,255,255,0.04)' : 'transparent',
                        border: hasChildren ? `1px solid ${C.border}` : 'none',
                        transition: 'all 0.2s',
                        color: isExpanded ? C.primary : C.textMuted
                    }}>
                        {hasChildren ? (
                            <ChevronRight size={14} style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                        ) : <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.border }} />}
                    </div>

                    {/* Icon */}
                    <div style={{
                        width: 32, height: 32, borderRadius: '10px',
                        background: isSummary ? `${typeColor}10` : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isSummary ? `${typeColor}20` : C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isSummary ? typeColor : C.textMuted, flexShrink: 0
                    }}>
                        {isSummary ? <FolderOpen size={16} /> : <FileText size={16} />}
                    </div>

                    {/* Code */}
                    <span style={{ 
                        fontFamily: INTER, fontSize: '13px', color: typeColor, fontWeight: 800, 
                        minWidth: '80px', flexShrink: 0, letterSpacing: '0.02em', opacity: 0.9
                    }}>
                        {node.code}
                    </span>

                    {/* Name */}
                    <span style={{ 
                        flex: 1, fontSize: '14px', color: isSummary ? C.textPrimary : C.textSecondary, 
                        fontWeight: isSummary ? 800 : 600, fontFamily: CAIRO,
                        transition: '0.2s'
                    }}>
                        {node.name}
                    </span>

                    {/* Balance */}
                    <div style={{ textAlign: 'left', minWidth: '160px', flexShrink: 0 }}>
                        <span style={{ 
                            fontFamily: INTER, fontSize: '15px', fontWeight: 900, 
                            color: (node.balance || 0) < 0 ? C.danger : C.success,
                            display: 'inline-block', minWidth: '100px'
                        }}>
                            {(node.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span style={{ fontSize: '10px', color: C.textMuted, marginRight: '6px', fontWeight: 800, fontFamily: CAIRO }}>{currencySymbol}</span>
                    </div>

                    {/* Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                        {/* Category badge */}
                        <div style={{
                            fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px',
                            background: isSummary ? 'rgba(167,139,250,0.1)' : 'rgba(16,185,129,0.1)',
                            color: isSummary ? '#a78bfa' : '#10b981',
                            border: `1px solid ${isSummary ? 'rgba(167,139,250,0.2)' : 'rgba(16,185,129,0.2)'}`,
                            fontFamily: CAIRO, minWidth: '45px', textAlign: 'center'
                        }}>
                            {isSummary ? 'إجمالي' : 'تحليلي'}
                        </div>

                        {/* Nature badge */}
                        <div style={{
                            fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px',
                            background: getNature(node.type) === 'debit' ? `${C.success}10` : `${C.danger}10`,
                            color: getNature(node.type) === 'debit' ? C.success : C.danger,
                            border: `1px solid ${getNature(node.type) === 'debit' ? `${C.success}20` : `${C.danger}20`}`,
                            fontFamily: CAIRO, minWidth: '45px', textAlign: 'center'
                        }}>
                            {getNature(node.type) === 'debit' ? 'مدين' : 'دائن'}
                        </div>

                        {/* Type badge */}
                        <div style={{
                            fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px',
                            background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30`,
                            minWidth: '60px', textAlign: 'center', fontFamily: CAIRO
                        }}>
                            {accountTypes.find(t => t.value === node.type)?.label}
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginRight: '12px' }}>
                        {canEdit && (
                            <button onClick={e => { e.stopPropagation(); openEdit(node); }} 
                                style={TABLE_STYLE.actionBtn()}
                                title="تعديل"
                            >
                                <Pencil size={TABLE_STYLE.actionIconSize} />
                            </button>
                        )}
                        {canDelete && (
                            <button onClick={e => { e.stopPropagation(); setDeleteItem(node); }}
                                style={TABLE_STYLE.actionBtn(C.danger)}
                                title="حذف"
                            >
                                <Trash2 size={TABLE_STYLE.actionIconSize} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Children */}
                {isExpanded && hasChildren && (
                    <div style={{ borderRight: `1px solid ${C.border}`, marginRight: `${24 + depth * 32 + 11}px`, animation: 'fadeIn 0.3s ease' }}>
                        {renderTree(node.children, depth + 1)}
                    </div>
                )}
            </div>
        );
    });

    const getFilteredAccounts = () => {
        if (!searchQuery.trim()) return accounts;
        const q = searchQuery.toLowerCase();
        const matches = new Set<string>();
        accounts.forEach(a => {
            if (a.name.toLowerCase().includes(q) || (a.code && a.code.includes(q))) {
                matches.add(a.id);
                let pid = a.parentId;
                while (pid) {
                    if (matches.has(pid)) break;
                    matches.add(pid);
                    const p = accounts.find(x => x.id === pid);
                    pid = p?.parentId || null;
                }
            }
        });
        return accounts.filter(a => matches.has(a.id));
    };

    const tree = buildTree(getFilteredAccounts());

    return (
        <DashboardLayout>
            <div style={PAGE_BASE}>
                <PageHeader 
                    title="دليل الحسابات" 
                    subtitle="شجرة الحسابات المحاسبية متعددة المستويات — تنظيم وتصنيف المركز المالي ونتيجة الأعمال" 
                    icon={BookOpen} 
                    primaryButton={canCreate ? {
                        label: "حساب جديد",
                        onClick: openCreate,
                        icon: Plus
                    } : undefined}
                    actions={isAdmin ? [
                        <button
                            key="reseed-btn"
                            onClick={async () => {
                                if (reseeding) return;
                                setReseeding(true);
                                try {
                                    const res = await fetch('/api/accounts/seed', { method: 'POST' });
                                    const d = await res.json();
                                    if (res.ok) { 
                                        if (d.isComplete) {
                                            alert('دليل الحسابات موجود وجاهز بالفعل (75 حساباً).\nلا يوجد حسابات مفقودة في شجرة النظام.');
                                        } else if (d.added > 0) {
                                            alert(`تمت العملية بنجاح!\nتمت إضافة ${d.added} حساب مفقود إلى الشجرة:\n${d.missingNames?.join('، ')}`);
                                            fetchAccounts(); 
                                        } else {
                                            alert(d.message || 'تمت العملية بنجاح');
                                            fetchAccounts();
                                        }
                                    } else { alert(d.error || 'فشل في العملية'); }
                                } catch { alert('خطأ في الاتصال بالخادم'); } finally { setReseeding(false); }
                            }}
                            disabled={reseeding}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', height: '44px', borderRadius: '12px', 
                                border: `1px solid ${C.warning}30`, background: `${C.warning}10`, color: C.warning, 
                                fontSize: '13px', fontWeight: 700, cursor: reseeding ? 'not-allowed' : 'pointer', fontFamily: CAIRO,
                                transition: '0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${C.warning}18`; e.currentTarget.style.borderColor = `${C.warning}40`; }}
                            onMouseLeave={e => { e.currentTarget.style.background = `${C.warning}10`; e.currentTarget.style.borderColor = `${C.warning}30`; }}
                        >
                            {reseeding ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                            إعادة التهيئة
                        </button>
                    ] : undefined}
                />

                {/* ── Stats ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '24px' }}>
                    {[
                        { label: 'إجمالي الحسابات', value: accounts.length, color: C.primary, icon: LayoutGrid },
                        { label: 'حسابات تحليلية', value: detailCount, color: C.success, icon: FileText },
                        ...accountTypes.map(t => ({ label: t.label, value: byType(t.value), color: t.color, icon: FolderOpen })),
                    ].map((s, i) => (
                         <div key={i} style={{ 
                            ...SC, 
                            borderWidth: 0, 
                            padding: '12px', 
                            textAlign: 'center', 
                            background: `${s.color}05`, 
                            boxShadow: 'none' 
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                                <s.icon size={16} style={{ color: s.color, opacity: 0.6 }} />
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 900, color: s.color, fontFamily: INTER }}>{s.value}</div>
                            <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, marginTop: '4px', fontFamily: CAIRO }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* ── Search (Standard ERP Design) ── */}
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none', display: 'flex' }}>
                        <Search size={14} />
                    </div>
                    <input 
                        type="search" 
                        placeholder="البحث السريع في دليل الحسابات (اسم الحساب أو الكود)..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ 
                            ...IS, height: '36px', paddingRight: '40px', 
                            fontSize: '13px', borderRadius: '6px', 
                            background: C.card, border: `1px solid ${C.border}`,
                            width: '100%', outline: 'none', transition: 'all 0.2s',
                            fontFamily: CAIRO
                        }} 
                        onFocus={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = C.hover; }}
                        onBlur={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}
                    />
                </div>

            {/* ── Tree ── */}
            {loading ? (
                <div style={{ ...SC, height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', borderStyle: 'dashed' }}>
                    <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                    <span style={{ fontSize: '15px', fontWeight: 700, color: C.textMuted, fontFamily: CAIRO }}>جاري استدعاء دليل الحسابات...</span>
                </div>
            ) : accounts.length === 0 ? (
                <div style={{ ...SC, padding: '80px 20px', textAlign: 'center', borderStyle: 'dashed' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <BookOpen size={36} style={{ color: C.textMuted }} />
                    </div>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>لا توجد حسابات بعد</p>
                    <p style={{ margin: '8px 0 0', fontSize: '14px', fontWeight: 600, color: C.textMuted, fontFamily: CAIRO }}>اضغط "حساب جديد" لإضافة أول حساب</p>
                </div>

            ) : (
                <div style={{ ...SC, padding: 0, overflow: 'hidden' }}>
                    {/* Table Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}`, direction: 'rtl' }}>
                        <span style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>
                            {accounts.length} حساب — {detailCount} تحليلي
                        </span>
                    </div>
                    {renderTree(tree)}
                </div>
            )}

            {/* ── Modal ── */}
            {showModal && (
                <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease' }}>
                    <div onClick={e => e.stopPropagation()} dir="rtl"
                        style={{ width: 560, background: '#0a0a0b', border: `1px solid ${C.border}`, borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)', overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 30px', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${C.primary}15`, border: `1px solid ${C.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                                    {editItem ? <Pencil size={20} /> : <Plus size={22} />}
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>
                                        {editItem ? 'تعديل بيانات الحساب' : 'إضافة حساب جديد'}
                                    </h2>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>
                                        {editItem ? 'تحديث معلومات الحساب في شجرة الحسابات' : 'إدراج حساب مالي جديد ضمن الدليل المحاسبي'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)}
                                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, width: 34, height: 34, borderRadius: '10px', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${C.danger}15`; e.currentTarget.style.borderColor = `${C.danger}30`; e.currentTarget.style.color = C.danger; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                                <div>
                                    <label style={LS}>كود الحساب <span style={{ color: C.danger }}>*</span></label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input required value={form.code} readOnly disabled
                                            style={{ ...IS, paddingLeft: '40px', direction: 'ltr', textAlign: 'left', fontFamily: INTER, fontWeight: 900, background: 'rgba(255,255,255,0.02)', color: C.textMuted, cursor: 'not-allowed' }}
                                        />
                                        <Lock size={14} style={{ position: 'absolute', left: '12px', color: C.textMuted, opacity: 0.4 }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={LS}>اسم الحساب بالعربية <span style={{ color: C.danger }}>*</span></label>
                                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="مثال: البنك الأهلي المصري" style={IS} onFocus={focusIn} onBlur={focusOut} autoFocus={!editItem} />
                                </div>
                            </div>

                            <div>
                                <label style={LS}>تصنيف نوع الحساب <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                                    {accountTypes.map(opt => (
                                        <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                                            style={{
                                                padding: '12px 8px', borderRadius: '15px', border: '1px solid',
                                                borderColor: form.type === opt.value ? `${opt.color}50` : C.border,
                                                background: form.type === opt.value ? `${opt.color}15` : 'rgba(255,255,255,0.02)',
                                                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center'
                                            }}>
                                            <div style={{ fontSize: '13px', color: form.type === opt.value ? opt.color : C.textSecondary, fontWeight: 800, fontFamily: CAIRO }}>{opt.label}</div>
                                            <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '4px', fontWeight: 700, opacity: 0.7 }}>
                                                {opt.nature === 'debit' ? 'مدين' : 'دائن'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={LS}>طبيعة الحساب</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {[
                                            { val: 'summary', label: 'حساب رئيسي (إجمالي)', color: '#a78bfa' },
                                            { val: 'detail', label: 'حساب فرعي (تحليلي)', color: C.success }
                                        ].map(opt => (
                                            <button key={opt.val} type="button" onClick={() => setForm(f => ({ ...f, accountCategory: opt.val as any }))}
                                                style={{
                                                    flex: 1, padding: '12px 10px', borderRadius: '12px', border: '1px solid',
                                                    borderColor: form.accountCategory === opt.val ? `${opt.color}50` : C.border,
                                                    background: form.accountCategory === opt.val ? `${opt.color}12` : 'transparent',
                                                    cursor: 'pointer', transition: 'all 0.15s'
                                                }}>
                                                <div style={{ fontSize: '12px', color: form.accountCategory === opt.val ? opt.color : C.textSecondary, fontWeight: 800, fontFamily: CAIRO }}>{opt.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label style={LS}>يندرج تحت الحساب الرئيسي</label>
                                    <CustomSelect
                                        value={form.parentId}
                                        onChange={v => setForm(f => ({ ...f, parentId: v }))}
                                        icon={FolderOpen}
                                        placeholder="-- لا يوجد (حساب جذر) --"
                                        options={accounts
                                            .filter(a => a.id !== editItem?.id && a.accountCategory !== 'detail')
                                            .map(a => ({
                                                value: a.id,
                                                label: `${a.code} — ${a.name}`,
                                                style: { paddingRight: `${(a.level || 0) * 16 + 12}px` }
                                            }))}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                <button type="submit" disabled={saving}
                                    style={{ ...BTN_PRIMARY(saving, false), flex: 2, height: '50px', fontSize: '15px' }}>
                                    {saving ? <Loader2 size={20} className="animate-spin" /> : (editItem ? 'حفظ التغييرات' : 'إضافة الحساب للدليل')}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)}
                                    style={{ flex: 1, height: '50px', borderRadius: '14px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', color: C.textSecondary, fontSize: '15px', fontWeight: 700, cursor: 'pointer', transition: '0.2s', fontFamily: CAIRO }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = C.textPrimary; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = C.textSecondary; }}>
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete ── */}
            <AppModal
                show={deleteItem !== null}
                onClose={() => setDeleteItem(null)}
                isDelete={true}
                title="تأكيد حذف الحساب"
                itemName={deleteItem?.name}
                onConfirm={handleDelete}
                isSubmitting={saving}
            />

            <style>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
            </div>
        </DashboardLayout>
    );
}
