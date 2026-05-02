import ContentSkeleton from '@/components/ContentSkeleton';
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { BookOpen, Plus, Lock, Loader2, FolderOpen } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, OUTFIT, PAGE_BASE, BTN_PRIMARY, LS, IS, SC, focusIn, focusOut } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';

interface Account {
    id: string;
    code: string;
    name: string;
    type: string;
    accountCategory: 'summary' | 'detail';
    parentId: string | null;
    level: number;
}

export default function NewAccountPage() {
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
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        code: '',
        name: '',
        type: 'asset',
        accountCategory: 'detail' as 'summary' | 'detail',
        parentId: ''
    });

    const getNature = (type: string) => accountTypes.find(t => t.value === type)?.nature || 'debit';

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

    const fetchAccounts = useCallback(async () => {
        try {
            const res = await fetch('/api/accounts');
            if (res.ok) {
                const data = await res.json();
                const accs = Array.isArray(data) ? data : [];
                setAccounts(accs);
                setForm(f => ({ ...f, code: generateNextCode('', 'asset', accs) }));
            }
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

    useEffect(() => {
        if (!loading) {
            setForm(f => ({ ...f, code: generateNextCode(f.parentId, f.type, accounts) }));
        }
    }, [form.parentId, form.type, loading, accounts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code.trim() || !form.name.trim()) return;
        setSaving(true);
        try {
            const parentAccount = form.parentId ? accounts.find(a => a.id === form.parentId) : null;
            const level = parentAccount ? parentAccount.level + 1 : 1;
            const nature = getNature(form.type);

            const res = await fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, nature, level }),
            });
            if (res.ok) {
                router.push('/accounts');
            } else {
                const d = await res.json();
                alert(d.error || t('فشل الحفظ'));
                setSaving(false);
            }
        } catch {
            alert(t('فشل الاتصال'));
            setSaving(false);
        }
    };

    if (loading) { return <DashboardLayout><ContentSkeleton /></DashboardLayout>; }

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                <PageHeader 
                    title={t('إضافة حساب جديد')} 
                    subtitle={t('إنشاء حساب جديد في الدليل المحاسبي — حدد التبويب والنوع والموقع بدقة')} 
                    icon={BookOpen} 
                    backUrl="/accounts"
                />

                <div style={{ ...SC, background: C.card, borderRadius: '20px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', maxWidth: '800px', margin: '0 auto' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                            <div>
                                <label style={LS}>{t('كود الحساب')} <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="text" readOnly disabled value={form.code} dir="ltr"
                                        style={{ ...IS, paddingInlineStart: '42px', color: C.textSecondary, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, fontFamily: OUTFIT, fontWeight: 700 }}
                                    />
                                    <Lock size={15} style={{ position: 'absolute', insetInlineStart: '14px', color: C.textSecondary, opacity: 0.5, pointerEvents: 'none' }} />
                                </div>
                                <p style={{ fontSize: '11px', color: C.textSecondary, marginTop: '6px' }}>{t('يتم توليد الكود تلقائياً بناءً على الحساب الأب ونوع الحساب')}</p>
                            </div>

                            <div>
                                <label style={LS}>{t('اسم الحساب')} <span style={{ color: C.danger }}>*</span></label>
                                <input
                                    required type="text"
                                    placeholder={t('مثال: النقدية، البنك الأهلي، العملاء...')}
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    style={IS}
                                    onFocus={focusIn} onBlur={focusOut}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={LS}>{t('تصنيف نوع الحساب')} <span style={{ color: C.danger }}>*</span></label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px' }}>
                                {accountTypes.map(opt => (
                                    <button key={opt.value} type="button"
                                        onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                                        style={{
                                            padding: '12px 6px', borderRadius: '12px', border: '1px solid',
                                            borderColor: form.type === opt.value ? `${opt.color}80` : C.border,
                                            background: form.type === opt.value ? `${opt.color}15` : 'rgba(255,255,255,0.02)',
                                            cursor: 'pointer', transition: 'all 0.15s',
                                        }}>
                                        <div style={{ fontSize: '13px', color: form.type === opt.value ? opt.color : C.textSecondary, fontWeight: 700 }}>{opt.label}</div>
                                        <div style={{ fontSize: '10px', color: C.textSecondary, marginTop: '4px', fontWeight: 600 }}>
                                            {opt.nature === 'debit' ? t('مدين') : t('دائن')}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                            <div>
                                <label style={LS}>{t('نوع التصنيف المحاسبي')}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {[
                                        { val: 'summary', label: t('حساب إجمالي'), sub: t('للتجميع والتقارير'), color: '#a78bfa' },
                                        { val: 'detail', label: t('حساب تحليلي'), sub: t('يقبل قيود يومية'), color: '#10b981' },
                                    ].map(opt => (
                                        <button key={opt.val} type="button"
                                            onClick={() => setForm(f => ({ ...f, accountCategory: opt.val as any }))}
                                            style={{
                                                padding: '12px', borderRadius: '12px', border: '1px solid',
                                                borderColor: form.accountCategory === opt.val ? `${opt.color}80` : C.border,
                                                background: form.accountCategory === opt.val ? `${opt.color}15` : 'rgba(255,255,255,0.02)',
                                                cursor: 'pointer', transition: 'all 0.15s',
                                            }}>
                                            <div style={{ fontSize: '13px', color: form.accountCategory === opt.val ? opt.color : C.textSecondary, fontWeight: 700 }}>{opt.label}</div>
                                            <div style={{ fontSize: '10px', color: C.textSecondary, marginTop: '3px', fontWeight: 500 }}>{opt.sub}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={LS}>{t('الحساب الرئيسي (الأب)')}</label>
                                <CustomSelect
                                    value={form.parentId}
                                    onChange={v => setForm(f => ({ ...f, parentId: v }))}
                                    icon={FolderOpen}
                                    placeholder={t('-- حساب رئيسي (مستوى 1) --')}
                                    options={accounts
                                        .filter(a => a.accountCategory !== 'detail')
                                        .map(a => ({
                                            value: a.id,
                                            label: `${a.code} — ${a.name}`,
                                            style: { paddingInlineEnd: `${(a.level || 0) * 16 + 12}px` }
                                        }))}
                                    style={{ minWidth: '100%', height: '42px' }}
                                />
                                <p style={{ fontSize: '11px', color: C.textSecondary, marginTop: '6px' }}>{t('اتركه فارغاً لإنشاء حساب رئيسي في المستوى الأول')}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', paddingTop: '24px', borderTop: `1px solid ${C.border}` }}>
                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    ...BTN_PRIMARY(saving, saving),
                                    flex: 2, height: '48px', fontSize: '14px',
                                }}
                            >
                                {saving ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><Plus size={18} /> {t('إضافة الحساب للدليل')}</>}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push('/accounts')}
                                style={{
                                    flex: 1, height: '48px', borderRadius: '12px',
                                    border: `1px solid ${C.border}`, background: 'transparent',
                                    color: C.textSecondary, fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = C.textPrimary; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSecondary; }}
                            >
                                {t('إلغاء')}
                            </button>
                        </div>
                    </form>
                </div>

                <div style={{ height: '200px' }}></div>
            </div>
            <style jsx global>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
