'use client';

import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
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

    // Account Form State
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

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/accounts');
            if (res.ok) {
                const data = await res.json();
                setAccounts(data);
                // Expand first level by default
                const firstLevelIds = data.filter((a: Account) => !a.parentId).map((a: Account) => a.id);
                setExpandedIds(new Set(firstLevelIds));
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

    const handleRebuild = async () => {
        if (!confirm(t('هل أنت متأكد من إعادة تهيئة دليل الحسابات؟ سيؤدي هذا إلى مسح الدليل الحالي وإعادة بنائه.'))) return;
        setLoading(true);
        try {
            const res = await fetch('/api/accounts/seed', { method: 'POST' });
            if (res.ok) {
                await fetchAccounts();
            } else {
                alert(t('فشل إعادة التهيئة'));
            }
        } catch {
            alert(t('خطأ في الاتصال'));
        } finally {
            setLoading(false);
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

    const allFlattened = getFlattenedAccounts(accounts);
    
    const filteredAccounts = searchQuery.trim() 
        ? allFlattened.filter(a => 
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            a.code.includes(searchQuery) ||
            (a.nameEn && a.nameEn.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : accounts;

    // Stats Calculation
    const stats = {
        total: allFlattened.length,
        analytical: allFlattened.filter(a => a.accountCategory === 'detail').length,
        assets: allFlattened.filter(a => a.type === 'asset').length,
        liabilities: allFlattened.filter(a => a.type === 'liability').length,
        equity: allFlattened.filter(a => a.type === 'equity').length,
        revenue: allFlattened.filter(a => a.type === 'revenue').length,
        expenses: allFlattened.filter(a => a.type === 'expense').length,
    };

    const StatCard = ({ label, value, icon: Icon, color }: any) => (
        <div style={{
            flex: 1, minWidth: '120px', background: 'rgba(255,255,255,0.02)', 
            border: `1px solid ${C.border}30`, borderRadius: '16px', padding: '16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '8px', transition: '0.2s'
        }}>
            <div style={{ color: color, opacity: 0.8 }}><Icon size={20} /></div>
            <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: INTER, color: '#fff' }}>{value}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted }}>{label}</div>
        </div>
    );

    const renderAccountRow = (acc: Account, depth = 0) => {
        const isExpanded = expandedIds.has(acc.id);
        const hasChildren = acc.children && acc.children.length > 0;
        const typeInfo = accountTypes.find(t => t.value === acc.type) || accountTypes[0];
        const color = typeInfo.color;

        return (
            <React.Fragment key={acc.id}>
                <div style={{
                    display: 'flex', alignItems: 'center', padding: '12px 20px',
                    borderBottom: `1px solid ${C.border}20`,
                    background: 'transparent',
                    cursor: 'default', transition: '0.15s',
                    marginTop: '4px'
                }} className="account-row-hover">
                    
                    {/* Left Actions */}
                    <div style={{ display: 'flex', gap: '8px', width: '80px', flexShrink: 0 }}>
                        <button onClick={() => setDeleteAccount(acc)} style={{ ...TABLE_STYLE.actionBtn(C.danger), width: '32px', height: '32px' }} disabled={hasChildren}>
                            <Trash2 size={14} />
                        </button>
                        <button onClick={() => handleEdit(acc)} style={{ ...TABLE_STYLE.actionBtn(C.textSecondary), width: '32px', height: '32px' }}>
                            <Pencil size={14} />
                        </button>
                    </div>

                    {/* Tags */}
                    <div style={{ display: 'flex', gap: '8px', flex: 1.5, justifyContent: 'flex-start', paddingInlineStart: '20px', overflow: 'hidden' }}>
                         <span style={{ 
                            fontSize: '10px', padding: '4px 12px', borderRadius: '8px', fontWeight: 800,
                            background: `${color}15`, color: color, whiteSpace: 'nowrap'
                        }}>
                            {typeInfo.label}
                        </span>
                         <span style={{ 
                            fontSize: '10px', padding: '4px 12px', borderRadius: '8px', fontWeight: 800,
                            background: acc.nature === 'debit' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
                            color: acc.nature === 'debit' ? '#10b981' : '#ef4444', whiteSpace: 'nowrap'
                        }}>
                            {acc.nature === 'debit' ? t('مدين') : t('دائن')}
                        </span>
                        <span style={{ 
                            fontSize: '10px', padding: '4px 12px', borderRadius: '8px', fontWeight: 800,
                            background: 'rgba(59,130,246,0.1)', color: '#3b82f6', whiteSpace: 'nowrap'
                        }}>
                            {acc.accountCategory === 'summary' ? t('إجمالي') : t('تحليلي')}
                        </span>
                    </div>

                    {/* Balance */}
                    <div style={{ width: '200px', flexShrink: 0, textAlign: isRtl ? 'left' : 'right', fontFamily: INTER, fontWeight: 900, color: (acc.balance || 0) < 0 ? '#ef4444' : '#10b981', fontSize: '16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, fontFamily: CAIRO, marginInlineEnd: '4px' }}>{currencySymbol}</span>
                        {acc.balance !== undefined ? (acc.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                    </div>

                    {/* Name & Code & Icon & Arrow (Right Group) */}
                    <div style={{ flex: 3, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '20px', paddingInlineStart: `${depth * 30}px`, flexDirection: 'row-reverse' }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, justifyContent: 'flex-end' }}>
                            <span style={{ fontWeight: 800, color: C.textPrimary, fontSize: '15px', fontFamily: CAIRO }}>{acc.name}</span>
                            <span style={{ fontFamily: INTER, fontSize: '14px', fontWeight: 700, color: color, width: '60px', textAlign: 'center' }}>{acc.code}</span>
                            
                            <div style={{ color: color, opacity: 0.6 }}>
                                {acc.accountCategory === 'summary' ? <FolderOpen size={20} /> : <FileText size={20} />}
                            </div>

                            <button onClick={(e) => hasChildren && toggleExpand(acc.id, e)} style={{
                                background: 'transparent', border: 'none', color: hasChildren ? C.textMuted : 'transparent',
                                cursor: hasChildren ? 'pointer' : 'default', transition: '0.2s',
                                transform: isExpanded ? 'rotate(90deg)' : (isRtl ? 'rotate(180deg)' : 'none'),
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {isExpanded && hasChildren && acc.children.map(child => renderAccountRow(child, depth + 1))}
            </React.Fragment>
        );
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? "rtl" : "ltr"} style={{ ...PAGE_BASE, maxWidth: '1400px', margin: '0 auto' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                         <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', marginBottom: '4px', fontFamily: CAIRO }}>{t("دليل الحسابات")}</h1>
                            <p style={{ fontSize: '12px', color: C.textMuted, fontWeight: 600 }}>{t("شجرة الحسابات المحاسبية متكررة المستويات - تنظيم وتصريف المركز المالي ونتيجة الأعمال")}</p>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handleRebuild} style={{ 
                            height: '44px', padding: '0 20px', borderRadius: '10px', border: '1px solid #fbbf2440',
                            background: 'rgba(251,191,36,0.05)', color: '#fbbf24', fontWeight: 800, fontSize: '13px',
                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: CAIRO
                        }}>
                            <RefreshCcw size={16} /> {t('إعادة التهيئة')}
                        </button>
                        <button onClick={() => router.push('/accounts/new')} style={{ 
                            height: '44px', padding: '0 20px', borderRadius: '10px', border: 'none',
                            background: '#2563eb', color: '#fff', fontWeight: 800, fontSize: '13px',
                            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: CAIRO,
                            boxShadow: '0 4px 15px rgba(37,99,235,0.3)'
                        }}>
                            <Plus size={18} /> {t('حساب جديد')}
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '30px', overflowX: 'auto', paddingBottom: '10px' }}>
                    <StatCard label={t('إجمالي الحسابات')} value={stats.total} icon={LayoutGrid} color={C.primary} />
                    <StatCard label={t('حسابات تحليلية')} value={stats.analytical} icon={FileText} color="#10b981" />
                    <StatCard label={t('أصول')} value={stats.assets} icon={FolderOpen} color="#10b981" />
                    <StatCard label={t('خصوم')} value={stats.liabilities} icon={FolderOpen} color="#f87171" />
                    <StatCard label={t('حقوق ملكية')} value={stats.equity} icon={FolderOpen} color="#a78bfa" />
                    <StatCard label={t('إيرادات')} value={stats.revenue} icon={FolderOpen} color="#60a5fa" />
                    <StatCard label={t('مصروفات')} value={stats.expenses} icon={FolderOpen} color="#fb923c" />
                </div>

                {/* Search */}
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <Search size={20} style={{ position: 'absolute', insetInlineStart: '20px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted, opacity: 0.5 }} />
                    <input
                        placeholder={t("البحث السريع في دليل الحسابات (اسم الحساب أو الكود)...")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ 
                            width: '100%', height: '54px', padding: '0 54px', 
                            background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}40`,
                            borderRadius: '12px', color: '#fff', outline: 'none', fontFamily: CAIRO, fontSize: '15px',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    />
                </div>

                {/* List Container */}
                <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: `1px solid ${C.border}40`, borderRadius: '16px', overflow: 'hidden' }}>
                    {/* List Info Header */}
                    <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}20`, display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>
                           {stats.total} {t('حساب')} — {stats.analytical} {t('تحليلي')}
                        </span>
                    </div>

                    <div style={{ padding: '10px 0', minHeight: '400px' }}>
                        {loading ? (
                             <div style={{ textAlign: 'center', padding: '80px', color: C.textMuted }}>
                                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto 16px' }} />
                                <p style={{ fontWeight: 700 }}>{t('جاري تحميل الدليل المحاسبي...')}</p>
                            </div>
                        ) : (
                            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                {filteredAccounts.length > 0 ? (
                                    !searchQuery ? (
                                        filteredAccounts.map(acc => renderAccountRow(acc))
                                    ) : (
                                        allFlattened.filter(a => 
                                            a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                            a.code.includes(searchQuery)
                                        ).map(acc => renderAccountRow(acc, 0))
                                    )
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '60px', color: C.textMuted }}>
                                        <AlertTriangle size={48} style={{ margin: '0 auto 16px', opacity: 0.1 }} />
                                        <p style={{ fontWeight: 700 }}>{t('لم نجد أي حسابات بهذا الاسم')}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
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
                            <input disabled value={form.code} style={{ ...IS, background: 'rgba(255,255,255,0.02)', cursor: 'not-allowed', textAlign: 'center', fontFamily: INTER, fontWeight: 700, color: C.textMuted }} />
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

            <style jsx global>{`
                .account-row-hover:hover { background: rgba(59,130,246,0.04) !important; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}
