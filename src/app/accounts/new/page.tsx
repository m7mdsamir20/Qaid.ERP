'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import {
    BookOpen, Plus, X, ArrowRight, ArrowLeft, Lock, Loader2, FolderOpen
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

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
                // Initial code generation
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

    const LS: React.CSSProperties = {
        display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#94a3b8', textAlign: 'start',
    };
    const IS: React.CSSProperties = {
        width: '100%', height: '42px', padding: '0 14px', textAlign: 'start', direction: isRtl ? 'rtl' : 'ltr',
        borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: '14px',
        fontWeight: 500, outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
                    {t('جاري التحميل...')}
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            {/* Header */}
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6'
                    }}>
                        <BookOpen size={20} />
                    </div>
                    <div>
                        <h1 className="page-title">{t('إضافة حساب جديد')}</h1>
                        <p className="page-subtitle">{t('إنشاء حساب جديد في الدليل المحاسبي')}</p>
                    </div>
                </div>

                <button
                    onClick={() => router.push('/accounts')}
                    style={{
                        paddingInlineStart: '16px', paddingInlineEnd: '16px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94a3b8', height: '38px', borderRadius: '8px',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#e2e8f0'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                >
                    {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />} {t('العودة')}
                </button>
            </div>

            <div style={{ background: 'linear-gradient(145deg,#0f1c2e 0%,#0d1625 100%)', border: '1px solid rgba(99,179,237,0.12)', borderRadius: '16px', padding: '32px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxWidth: '800px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit} dir={isRtl ? 'rtl' : 'ltr'}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                        <div>
                            <label style={LS}>{t('كود الحساب')} <span style={{ color: '#f87171' }}>*</span></label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="text" readOnly disabled value={form.code} dir="ltr"
                                    style={{ ...IS, paddingInlineStart: '42px', color: '#475569', cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace', fontWeight: 700 }}
                                />
                                <Lock size={15} style={{ position: 'absolute', insetInlineStart: '14px', color: '#334155', pointerEvents: 'none' }} />
                            </div>
                            <p style={{ fontSize: '11px', color: '#475569', marginTop: '6px' }}>{t('يتم توليد الكود تلقائياً بناءً على الحساب الأب ونوع الحساب')}</p>
                        </div>

                        <div>
                            <label style={LS}>{t('اسم الحساب')} <span style={{ color: '#f87171' }}>*</span></label>
                            <input
                                required type="text"
                                placeholder={t('مثال: النقدية، البنك الأهلي، العملاء...')}
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                style={IS}
                                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={LS}>{t('تصنيف نوع الحساب')} <span style={{ color: '#f87171' }}>*</span></label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px' }}>
                            {accountTypes.map(opt => (
                                <button key={opt.value} type="button"
                                    onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                                    style={{
                                        padding: '12px 6px', borderRadius: '12px', border: '1px solid',
                                        borderColor: form.type === opt.value ? `${opt.color}50` : 'rgba(255,255,255,0.07)',
                                        background: form.type === opt.value ? `${opt.color}12` : 'rgba(255,255,255,0.02)',
                                        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                                    }}>
                                    <div style={{ fontSize: '14px', color: form.type === opt.value ? opt.color : '#64748b', fontWeight: 800 }}>{opt.label}</div>
                                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px', fontWeight: 600 }}>
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
                                            borderColor: form.accountCategory === opt.val ? `${opt.color}50` : 'rgba(255,255,255,0.07)',
                                            background: form.accountCategory === opt.val ? `${opt.color}12` : 'rgba(255,255,255,0.02)',
                                            cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                                        }}>
                                        <div style={{ fontSize: '14px', color: form.accountCategory === opt.val ? opt.color : '#64748b', fontWeight: 800 }}>{opt.label}</div>
                                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>{opt.sub}</div>
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
                                style={{ minWidth: '100%' }}
                            />
                            <p style={{ fontSize: '11px', color: '#475569', marginTop: '6px' }}>{t('اتركه فارغاً لإنشاء حساب رئيسي في المستوى الأول')}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: isRtl ? 'row' : 'row-reverse', gap: '12px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                flex: 2, height: '48px', borderRadius: '12px', border: 'none',
                                background: saving ? 'rgba(59,130,246,0.25)' : 'linear-gradient(135deg,#3b82f6,#2563eb)',
                                color: '#fff', fontSize: '15px', fontWeight: 700,
                                cursor: saving ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: saving ? 'none' : '0 4px 14px rgba(59,130,246,0.3)', transition: 'all 0.15s'
                            }}
                        >
                            {saving ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <><Plus size={18} /> {t('إضافة الحساب للدليل')}</>}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/accounts')}
                            style={{
                                flex: 1, height: '48px', borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                                color: '#94a3b8', fontSize: '15px', fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            {t('إلغاء')}
                        </button>
                    </div>
                </form>
            </div>

            {/* Spacer for dropdown */}
            <div style={{ height: '300px' }}></div>
            <style jsx>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        </DashboardLayout>
    );
}
