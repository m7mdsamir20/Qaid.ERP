'use client';

import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, ChevronRight, FolderOpen, FileText, X, Pencil, Trash2, AlertTriangle, Loader2, Lock, RefreshCcw, LayoutGrid, Search, MoreHorizontal, PieChart, Layers, Wallet, CreditCard, TrendingUp, TrendingDown, Activity, Book } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/hooks/useCurrency';
import { C, CAIRO, OUTFIT, PAGE_BASE, BTN_PRIMARY, TABLE_STYLE, focusIn, focusOut, LS, IS, SC, STitle } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import { useTranslation } from '@/lib/i18n';

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

/* ── Constants (labels set inside component to use t()) ── */

const typeColors: Record<string, string> = {
    asset: '#10b981', liability: '#f87171', equity: '#a78bfa', revenue: '#60a5fa', expense: '#fb923c',
};



/* ══════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════ */
export default function AccountsPage() {
    const { lang, t } = useTranslation();

    const accountTypes = [
        { value: 'asset', label: t('أصول'), nature: 'debit', color: '#10b981' },
        { value: 'liability', label: t('خصوم'), nature: 'credit', color: '#f87171' },
        { value: 'equity', label: t('حقوق ملكية'), nature: 'credit', color: '#a78bfa' },
        { value: 'revenue', label: t('إيرادات'), nature: 'credit', color: '#60a5fa' },
        { value: 'expense', label: t('مصروفات'), nature: 'debit', color: '#fb923c' },
    ];
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { data: session } = useSession();
    const { symbol: currencySymbol } = useCurrency();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteAccount, setDeleteAccount] = useState<Account | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | string>('all');
    const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');

    const [showResetModal, setShowResetModal] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [form, setForm] = useState({
        id: '',
        code: '',
        name: '',
        nameEn: '',
        type: 'asset',
        accountCategory: 'detail' as 'summary' | 'detail',
        parentId: '',
        nature: 'debit'
    });

    const buildTree = (list: any[]) => {
        const map: Record<string, any> = {};
        const tree: any[] = [];
        
        list.forEach(acc => {
            map[acc.id] = { ...acc, children: [] };
        });
        
        list.forEach(acc => {
            if (acc.parentId && map[acc.parentId]) {
                map[acc.parentId].children.push(map[acc.id]);
            } else {
                tree.push(map[acc.id]);
            }
        });
        
        return tree;
    };

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/accounts');
            if (res.ok) {
                const data = await res.json();
                const treeData = buildTree(data);
                setAccounts(treeData);
                // Tree is collapsed by default now
                setExpandedIds(new Set());
            }
        } catch (err) {
            console.error("Fetch accounts error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedIds(newSet);
    };

    const handleEdit = (acc: Account) => {
        setEditingAccount(acc);
        setForm({
            id: acc.id,
            code: acc.code,
            name: acc.name,
            nameEn: acc.nameEn || '',
            type: acc.type,
            accountCategory: acc.accountCategory,
            parentId: acc.parentId || '',
            nature: acc.nature
        });
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/accounts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                await fetchAccounts();
                setShowModal(false);
            } else {
                const error = await res.json();
                alert(error.error || t('فشل التعديل'));
            }
        } catch {
            alert(t('خطأ في الاتصال'));
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteAccount) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/accounts?id=${deleteAccount.id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchAccounts();
                setDeleteAccount(null);
            } else {
                const error = await res.json();
                alert(error.error || t('فشل الحذف'));
            }
        } catch {
            alert(t('خطأ في الاتصال'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        setIsResetting(true);
        try {
            const res = await fetch('/api/accounts/seed?force=true', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                alert(data.message || t('تمت إعادة التهيئة بنجاح'));
                await fetchAccounts();
                setShowResetModal(false);
            } else {
                alert(data.error || t('فشل في إعادة التهيئة'));
            }
        } catch (error) {
            alert(t('خطأ في الاتصال'));
        } finally {
            setIsResetting(false);
        }
    };

    /* ── Search Logic ── */
    const getFlattenedAccounts = (accs: Account[]): Account[] => {
        let flat: Account[] = [];
        accs.forEach(acc => {
            flat.push(acc);
            if (acc.children && acc.children.length > 0) {
                flat = flat.concat(getFlattenedAccounts(acc.children));
            }
        });
        return flat;
    };

    const filteredAccounts = searchQuery.trim() || typeFilter !== 'all'
        ? getFlattenedAccounts(accounts).filter(a => {
            const matchesSearch = searchQuery.trim() === '' || 
                a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.code.includes(searchQuery) ||
                (a.nameEn && a.nameEn.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesType = typeFilter === 'all' || a.type === typeFilter;
            
            return matchesSearch && matchesType;
        })
        : accounts;

    const flatAll = getFlattenedAccounts(accounts);
    const stats = [
        { label: t('الحسابات'), value: flatAll.length, icon: <BookOpen size={16} />, color: '#3b82f6' },
        { label: t('تحليلية'), value: flatAll.filter(a => a.accountCategory === 'detail').length, icon: <Layers size={16} />, color: '#6366f1' },
        { label: t('أصول'), value: flatAll.filter(a => a.type === 'asset').length, icon: <Wallet size={16} />, color: '#10b981' },
        { label: t('خصوم'), value: flatAll.filter(a => a.type === 'liability').length, icon: <CreditCard size={16} />, color: '#f87171' },
        { label: t('حقوق ملكية'), value: flatAll.filter(a => a.type === 'equity').length, icon: <PieChart size={16} />, color: '#a78bfa' },
        { label: t('إيرادات'), value: flatAll.filter(a => a.type === 'revenue').length, icon: <TrendingUp size={16} />, color: '#60a5fa' },
        { label: t('مصروفات'), value: flatAll.filter(a => a.type === 'expense').length, icon: <TrendingDown size={16} />, color: '#fb923c' },
    ];

    const displayAccounts = viewMode === 'tree'
        ? (typeFilter === 'all' 
            ? accounts 
            : accounts.filter(a => a.type === typeFilter))
        : getFlattenedAccounts(accounts).filter(a => {
            const matchesSearch = searchQuery.trim() === '' || 
                a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.code.includes(searchQuery) ||
                (a.nameEn && a.nameEn.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesType = typeFilter === 'all' || a.type === typeFilter;
            
            return matchesSearch && matchesType;
        });

    // If searching, always force flat view regardless of viewMode state
    const effectiveAccounts = searchQuery.trim() !== '' 
        ? getFlattenedAccounts(accounts).filter(a => 
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.code.includes(searchQuery) ||
            (a.nameEn && a.nameEn.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : displayAccounts;

    const renderAccountRow = (acc: Account, depth = 0) => {
        const isExpanded = expandedIds.has(acc.id);
        const hasChildren = acc.children && acc.children.length > 0;
        const color = typeColors[acc.type] || C.primary;
        const isTableMode = viewMode === 'table' || searchQuery.trim() !== '';
        const effectiveDepth = isTableMode ? 0 : depth;

        return (
            <React.Fragment key={acc.id}>
                <div 
                    onClick={(e) => hasChildren && !isTableMode && toggleExpand(acc.id, e)}
                    style={{
                        display: 'flex', alignItems: 'center', padding: '10px 16px',
                        borderBottom: `1px solid ${C.border}30`,
                        background: effectiveDepth === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                        cursor: (hasChildren && !isTableMode) ? 'pointer' : 'default', transition: '0.15s',
                        marginLeft: (!isRtl && !isTableMode) ? `${effectiveDepth * 28}px` : '0',
                        marginRight: (isRtl && !isTableMode) ? `${effectiveDepth * 28}px` : '0',
                        borderRadius: '8px', marginBottom: '2px'
                    }} className="account-row-hover">

                    <div style={{ width: '32px', display: 'flex', justifyContent: 'center' }}>
                        {hasChildren && !isTableMode ? (
                            <button onClick={(e) => toggleExpand(acc.id, e)} style={{
                                background: 'transparent', border: 'none', color: C.textMuted,
                                cursor: 'pointer', transition: '0.2s',
                                transform: isExpanded ? 'rotate(90deg)' : (isRtl ? 'rotate(180deg)' : 'none')
                            }}>
                                <ChevronRight size={18} />
                            </button>
                        ) : (
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: `${color}40` }}></div>
                        )}
                    </div>

                    <div style={{ width: '100px', fontFamily: OUTFIT, fontSize: '12px', fontWeight: 700, color: C.textMuted, opacity: 0.8, textAlign: 'start' }}>{acc.code}</div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color
                        }}>
                            {acc.accountCategory === 'summary' ? <FolderOpen size={16} /> : <FileText size={16} />}
                        </div>
                        <span style={{ fontWeight: acc.accountCategory === 'summary' ? 800 : 600, color: C.textPrimary, fontSize: '14px', fontFamily: CAIRO }}>{acc.name}</span>
                    </div>

                    <div style={{ width: '120px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        <span style={{
                            fontSize: '11px', padding: '3px 10px', borderRadius: '8px', fontWeight: 800, fontFamily: CAIRO,
                            background: `${color}15`, color: color, width: 'fit-content'
                        }}>
                            {accountTypes.find(t => t.value === acc.type)?.label || acc.type}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <span style={{ 
                                fontSize: '9px', padding: '2px 6px', borderRadius: '5px', 
                                background: acc.accountCategory === 'summary' ? 'rgba(59,130,246,0.1)' : 'rgba(167,139,240,0.1)', 
                                color: acc.accountCategory === 'summary' ? '#60a5fa' : '#a78bfa', 
                                fontWeight: 800 
                            }}>
                                {acc.accountCategory === 'summary' ? t('إجمالي') : t('تحليلي')}
                            </span>
                            <span style={{ 
                                fontSize: '9px', padding: '2px 6px', borderRadius: '5px', 
                                background: acc.nature === 'debit' ? 'rgba(16,185,129,0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                color: acc.nature === 'debit' ? '#10b981' : '#f87171', 
                                fontWeight: 800 
                            }}>
                                {acc.nature === 'debit' ? t('مدين') : t('دائن')}
                            </span>
                        </div>
                    </div>

                    <div style={{ width: '150px', textAlign: 'center', fontFamily: OUTFIT, fontWeight: 900, color: (acc.balance || 0) < 0 ? C.danger : C.success }}>
                        {acc.balance !== undefined ? (acc.balance).toLocaleString() : '0'} <span style={{ fontSize: '10px', fontWeight: 600, color: C.textMuted, fontFamily: CAIRO }}>{currencySymbol}</span>
                    </div>

                    <div style={{ width: '100px', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(acc); }} style={TABLE_STYLE.actionBtn()} title={t('تعديل')}>
                            <Pencil size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteAccount(acc); }} style={TABLE_STYLE.actionBtn(C.danger)} title={t('حذف')} disabled={hasChildren && !isTableMode}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                {!isTableMode && isExpanded && hasChildren && acc.children.map(child => renderAccountRow(child, depth + 1))}
            </React.Fragment>
        );
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? "rtl" : "ltr"} style={PAGE_BASE}>
                <PageHeader
                    title={t("دليل الحسابات")}
                    subtitle={t("إدارة شجرة الحسابات، تصنيفها، وتتبع الأرصدة الافتتاحية والحالية")}
                    icon={BookOpen}
                    primaryButton={{
                        label: t("إضافة حساب"),
                        icon: Plus,
                        onClick: () => router.push('/accounts/new')
                    }}
                    actions={[
                        <button key="reset" onClick={() => setShowResetModal(true)} style={{
                            display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 16px',
                            borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '13px', fontWeight: 800,
                            cursor: 'pointer', transition: 'all 0.2s', fontFamily: CAIRO
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        >
                            <RefreshCcw size={15} /> {t('إعادة تهيئة')}
                        </button>
                    ]}
                />

                {/* Summary Cards */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(7, 1fr)', 
                    gap: '12px', 
                    marginBottom: '20px' 
                }}>
                    {stats.map((s, i) => (
                        <div key={i} style={{
                            background: `${s.color}08`, border: `1px solid ${s.color}22`, borderRadius: '12px',
                            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px',
                            transition: 'all 0.2s', position: 'relative'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                        >
                            <div style={{ 
                                width: '32px', height: '32px', borderRadius: '8px', 
                                background: `${s.color}15`, border: `1px solid ${s.color}20`, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color 
                            }}>
                                {s.icon}
                            </div>
                            <div style={{ textAlign: 'start' }}>
                                <p style={{ fontSize: '10px', fontWeight: 700, color: C.textMuted, margin: '0 0 2px', fontFamily: CAIRO }}>{s.label}</p>
                                <div style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                        <input
                            placeholder={t("ابحث بكود الحساب أو الاسم...")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ 
                                ...IS, paddingInlineStart: '40px', height: '40px', fontSize: '13px', 
                                background: C.card, borderRadius: '12px'
                            }}
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '6px', background: C.card, padding: '4px', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                        <button onClick={() => setTypeFilter('all')} style={{
                            padding: '0 12px', height: '32px', borderRadius: '8px', border: 'none',
                            background: typeFilter === 'all' ? C.primary : 'transparent', color: typeFilter === 'all' ? '#fff' : C.textMuted,
                            cursor: 'pointer', fontSize: '12px', fontWeight: 800, fontFamily: CAIRO
                        }}>
                            {t('الكل')}
                        </button>
                        {accountTypes.map(type => (
                            <button key={type.value} onClick={() => setTypeFilter(type.value)} style={{
                                padding: '0 12px', height: '32px', borderRadius: '8px', border: 'none',
                                background: typeFilter === type.value ? C.primary : 'transparent', color: typeFilter === type.value ? '#fff' : C.textMuted,
                                cursor: 'pointer', fontSize: '12px', fontWeight: 800, fontFamily: CAIRO
                            }}>
                                {type.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', background: C.card, borderRadius: '12px', padding: '4px', border: `1px solid ${C.border}` }}>
                        <button onClick={() => setViewMode('tree')} style={{
                            padding: '6px 12px', borderRadius: '8px', border: 'none',
                            background: viewMode === 'tree' ? C.primary : 'transparent', color: viewMode === 'tree' ? '#fff' : C.textMuted,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, fontFamily: CAIRO
                        }}>
                            <RefreshCcw size={14} /> {t('شجرة')}
                        </button>
                        <button onClick={() => setViewMode('table')} style={{
                            padding: '6px 12px', borderRadius: '8px', border: 'none',
                            background: viewMode === 'table' ? C.primary : 'transparent', color: viewMode === 'table' ? '#fff' : C.textMuted,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, fontFamily: CAIRO
                        }}>
                            <LayoutGrid size={14} /> {t('جدول')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px', color: C.textMuted }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto 16px' }} />
                        <p style={{ fontWeight: 700 }}>{t('جاري تحميل الدليل المحاسبي...')}</p>
                    </div>
                ) : (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                        {/* Table Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', padding: '14px 16px',
                            background: 'rgba(255,255,255,0.03)', borderBottom: `2px solid ${C.border}`,
                            fontSize: '11px', fontWeight: 800, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '1px'
                        }}>
                            <div style={{ width: '32px' }}></div>
                            <div style={{ width: '100px', textAlign: 'start' }}>{t('الكود')}</div>
                            <div style={{ flex: 1, textAlign: 'start' }}>{t('اسم الحساب')}</div>
                            <div style={{ width: '120px', textAlign: 'center' }}>{t('النوع')}</div>
                            <div style={{ width: '150px', textAlign: 'center' }}>{t('الرصيد الحالي')}</div>
                            <div style={{ width: '100px', textAlign: 'center' }}>{t('إجراءات')}</div>
                        </div>

                        <div style={{ padding: '8px', maxHeight: '70vh', overflowY: 'auto' }}>
                            {effectiveAccounts.length > 0 ? (
                                (viewMode === 'tree' && searchQuery === '') ? (
                                    effectiveAccounts.map(acc => renderAccountRow(acc))
                                ) : (
                                    effectiveAccounts.map(acc => renderAccountRow(acc, 0))
                                )
                            ) : (
                                <div style={{ textAlign: 'center', padding: '60px', color: C.textMuted }}>
                                    <AlertTriangle size={48} style={{ margin: '0 auto 16px', opacity: 0.1 }} />
                                    <p style={{ fontWeight: 700 }}>{t('لم نجد أي حسابات بهذا الاسم')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            <AppModal
                show={showModal}
                onClose={() => setShowModal(false)}
                title={t("تعديل بيانات الحساب")}
                icon={Pencil}
                maxWidth="550px"
            >
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
                        <div>
                            <label style={LS}>{t('كود الحساب')}</label>
                            <input disabled value={form.code} style={{ ...IS, background: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', textAlign: 'center', fontFamily: OUTFIT, fontWeight: 700, color: C.textMuted }} />
                        </div>
                        <div>
                            <label style={LS}>{t('اسم الحساب بالعربية')} <span style={{ color: C.danger }}>*</span></label>
                            <input
                                required value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder={t("اسم الحساب...")} style={IS}
                                onFocus={focusIn} onBlur={focusOut}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={LS}>{t('نوع الحساب')}</label>
                            <select value={form.type} disabled style={{ ...IS, background: 'rgba(255,255,255,0.02)', cursor: 'not-allowed' }}>
                                {accountTypes.map(at => <option key={at.value} value={at.value}>{at.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={LS}>{t('طبيعة الحساب')}</label>
                            <select value={form.nature} disabled style={{ ...IS, background: 'rgba(255,255,255,0.02)', cursor: 'not-allowed' }}>
                                <option value="debit">{t('مدين')}</option>
                                <option value="credit">{t('دائن')}</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', paddingTop: '10px', borderTop: `1px solid ${C.border}` }}>
                        <button type="submit" disabled={isSaving} style={{ ...BTN_PRIMARY(false, isSaving), flex: 1, height: '44px' }}>
                            {isSaving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : t('حفظ التعديلات')}
                        </button>
                        <button type="button" onClick={() => setShowModal(false)} style={{ border: `1px solid ${C.border}`, borderRadius: '10px', background: 'transparent', color: C.textSecondary, padding: '0 20px', cursor: 'pointer', fontFamily: CAIRO }}>{t('تراجع')}</button>
                    </div>
                </form>
            </AppModal>

            {/* Delete Confirmation */}
            <AppModal isDelete show={!!deleteAccount} onClose={() => setDeleteAccount(null)} onConfirm={confirmDelete} itemName={deleteAccount?.name} title={t("تأكيد حذف الحساب")} isSubmitting={isSaving} />

            {/* Reset Confirmation */}
            <AppModal
                show={showResetModal}
                onClose={() => !isResetting && setShowResetModal(false)}
                title={t("إعادة تهيئة دليل المحاسبات")}
                icon={RefreshCcw}
                maxWidth="500px"
            >
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <AlertTriangle size={32} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', marginBottom: '12px', fontFamily: CAIRO }}>{t('هل أنت متأكد من إعادة التهيئة؟')}</h3>
                    <p style={{ fontSize: '14px', color: C.textMuted, lineHeight: 1.6, fontFamily: CAIRO, marginBottom: '24px' }}>
                        {t('سيتم حذف شجرة الحسابات الحالية بالكامل وإعادة بناء الشجرة الافتتاحية الأساسية للنظام.')}
                        <br />
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>{t('تنبيه: لا يمكن التراجع عن هذه الخطوة، وستفشل العملية إذا كان هناك قيود مالية مسجلة.')}</span>
                    </p>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={handleReset}
                            disabled={isResetting}
                            style={{
                                flex: 2, height: '46px', borderRadius: '12px', border: 'none',
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                                fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: CAIRO,
                                boxShadow: '0 10px 20px -5px rgba(239,68,68,0.3)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}>
                            {isResetting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : t('تأكيد إعادة التهيئة')}
                        </button>
                        <button
                            disabled={isResetting}
                            onClick={() => setShowResetModal(false)}
                            style={{ flex: 1, height: '46px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                            {t('إلغاء')}
                        </button>
                    </div>
                </div>
            </AppModal>

            <style jsx global>{`
                .account-row-hover:hover { background: rgba(59,130,246,0.05) !important; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}
