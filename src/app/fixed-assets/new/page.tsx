'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { Briefcase, Plus, ArrowRight, TrendingDown, Building2, AlertTriangle, Loader2, Save } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, SC, STitle, BTN_PRIMARY } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';

interface Account {
    id: string; code: string; name: string;
    type: string; accountCategory: string; isParent: boolean;
}

export default function NewFixedAssetPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { symbol: cSymbol } = useCurrency();

    const CATEGORIES = [
        t('مركبات'), t('أجهزة وحاسبات'), t('أراضي ومباني'),
        t('أثاث ومفروشات'), t('معدات وآلات'), t('أخرى'),
    ];

    const DEP_METHODS = [
        { value: 'straight', label: t('قسط ثابت'), sub: t('التكلفة ÷ العمر الإنتاجي') },
        { value: 'declining', label: t('قسط متناقص'), sub: t('الصافي × المعدل') },
    ];

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [generatedCode, setGeneratedCode] = useState('FA-001');

    const [form, setForm] = useState({
        name: '',
        category: '',
        purchaseDate: '',
        purchaseCost: '',
        salvageValue: '0',
        depreciationRate: '',
        depreciationMethod: 'straight' as 'straight' | 'declining',
        usefulLife: '',
        assetAccountId: '',
        depAccountId: '',
        accumAccountId: '',
        notes: '',
    });

    useEffect(() => {
        fetch('/api/fixed-assets')
            .then(r => r.json())
            .then((data: any[]) => {
                if (!Array.isArray(data) || data.length === 0) {
                    setGeneratedCode('FA-001');
                    return;
                }
                const nums = data.map(a => {
                    const m = a.code?.match(/FA-(\d+)/);
                    return m ? parseInt(m[1]) : 0;
                });
                const next = Math.max(...nums, 0) + 1;
                setGeneratedCode(`FA-${String(next).padStart(3, '0')}`);
            })
            .catch(() => setGeneratedCode('FA-001'));

        fetch('/api/accounts')
            .then(r => r.json())
            .then((data: Account[]) => {
                setAccounts(
                    Array.isArray(data)
                        ? data.filter(a => !a.isParent && a.accountCategory !== 'summary')
                        : []
                );
            })
            .catch(() => setAccounts([]));
    }, []);

    const set = (k: string) => (v: string) =>
        setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.name || !form.category || !form.purchaseDate ||
            !form.purchaseCost || !form.depreciationRate) {
            setError(t('يرجى تعبئة جميع الحقول المطلوبة')); return;
        }
        if (!form.assetAccountId || !form.depAccountId || !form.accumAccountId) {
            setError(t('يرجى تحديد الحسابات المحاسبية الثلاثة')); return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/fixed-assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: generatedCode,
                    name: form.name,
                    category: form.category,
                    purchaseDate: form.purchaseDate,
                    purchaseCost: parseFloat(form.purchaseCost),
                    salvageValue: parseFloat(form.salvageValue) || 0,
                    depreciationRate: parseFloat(form.depreciationRate),
                    depreciationMethod: form.depreciationMethod,
                    usefulLife: form.usefulLife
                        ? parseInt(form.usefulLife)
                        : Math.round(100 / parseFloat(form.depreciationRate)),
                    assetAccountId: form.assetAccountId,
                    depAccountId: form.depAccountId,
                    accumAccountId: form.accumAccountId,
                    notes: form.notes,
                }),
            });

            if (res.ok) {
                router.push('/fixed-assets');
            } else {
                const d = await res.json();
                setError(d.error || t('فشل الحفظ'));
            }
        } catch {
            setError(t('خطأ في الاتصال بالخادم'));
        }
        setSaving(false);
    };

    const assetAccounts = accounts.filter(a => a.type === 'asset');
    const expenseAccounts = accounts.filter(a => a.type === 'expense');
    const toOpts = (list: Account[]) =>
        list.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }));

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ width: '100%', paddingBottom: '60px', background: C.bg, fontFamily: CAIRO }}>

                <PageHeader
                    title={t("إضافة أصل ثابت جديد")}
                    subtitle={t("تسجيل بيانات الأصل الثابت وربطه بالحسابات المحاسبية والمعدلات المناسبة")}
                    icon={Briefcase}
                    backUrl="/fixed-assets"
                />

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '16px', fontSize: '13px', color: '#f87171', fontWeight: 600 }}>
                        <AlertTriangle size={15} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    {/* ══ القسم الأول: البيانات الأساسية ══ */}
                    <div style={{ ...SC, marginBottom: '20px' }}>
                        <div style={STitle}>
                            <Briefcase size={16} /> {t('البيانات الأساسية')}
                        </div>
                        <div className="fields-grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>{t('كود الأصل')}</label>
                                <input readOnly value={generatedCode}
                                    style={{ ...IS, background: 'rgba(255,255,255,0.01)', cursor: 'default', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600 }}
                                    onFocus={focusIn} onBlur={focusOut} />
                            </div>
                            <div>
                                <label style={LS}>{t('اسم الأصل')} <span style={{ color: C.danger }}>*</span></label>
                                <input required value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder={t("مثال: سيارة نيسان 2024")}
                                    style={IS} onFocus={focusIn} onBlur={focusOut} autoFocus />
                            </div>
                        </div>
                        <div className="fields-grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={LS}>{t('الفئة')} <span style={{ color: C.danger }}>*</span></label>
                                <CustomSelect value={form.category} onChange={set('category')}
                                    icon={Building2} placeholder={t("اختر الفئة...")}
                                    options={CATEGORIES.map(c => ({ value: c, label: c }))} />
                            </div>
                            <div>
                                <label style={LS}>{t('تاريخ الشراء')} <span style={{ color: C.danger }}>*</span></label>
                                <input required type="date" value={form.purchaseDate}
                                    onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                                    style={{ ...IS, direction: 'ltr', textAlign: 'end' }}
                                    onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
                    </div>

                    {/* ══ القسم الثاني: التكلفة والإهلاك ══ */}
                    <div style={{ ...SC, marginBottom: '20px' }}>
                        <div style={STitle}>
                            <TrendingDown size={16} /> {t('التكلفة والإهلاك')}
                        </div>
                        <div className="cost-salvage-grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                            <div style={{ position: 'relative' }}>
                                <label style={{ ...LS,  display: 'block', marginBottom: '12px' }}>{t('تكلفة الشراء')}</label>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 600, color: 'rgba(255,255,255,0.03)', pointerEvents: 'none', fontFamily: OUTFIT, letterSpacing: '1px' }}>
                                        0.00
                                    </div>
                                    <input 
                                        type="number" step="0.01" required
                                        value={form.purchaseCost} 
                                        onChange={e => setForm(f => ({ ...f, purchaseCost: e.target.value }))} 
                                        style={{ ...IS, background: 'transparent',  fontSize: '28px', height: '70px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT, border: 'none', borderBottom: `2px solid ${C.primary}30`, borderRadius: 0 }} 
                                        onFocus={focusIn} onBlur={focusOut} 
                                        placeholder=""
                                    />
                                    <span style={{ position: 'absolute', insetInlineEnd: '0', bottom: '10px', fontSize: '11px', fontWeight: 700, color: C.primary, fontFamily: CAIRO }}>{cSymbol}</span>
                                </div>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <label style={{ ...LS,  display: 'block', marginBottom: '12px' }}>{t('قيمة الخردة')}</label>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 600, color: 'rgba(255,255,255,0.03)', pointerEvents: 'none', fontFamily: OUTFIT, letterSpacing: '1px' }}>
                                        0.00
                                    </div>
                                    <input 
                                        type="number" step="0.01"
                                        value={form.salvageValue} 
                                        onChange={e => setForm(f => ({ ...f, salvageValue: e.target.value }))} 
                                        style={{ ...IS, background: 'transparent', textAlign: 'start', fontSize: '28px', height: '70px', fontWeight: 700, color: C.textPrimary, fontFamily: OUTFIT, border: 'none', borderBottom: `2px solid ${C.border}`, borderRadius: 0 }} 
                                        onFocus={focusIn} onBlur={focusOut} 
                                        placeholder=""
                                    />
                                    <span style={{ position: 'absolute', insetInlineEnd: '0', bottom: '10px', fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{cSymbol}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={LS}>{t('معدل الإهلاك')} % <span style={{ color: C.danger }}>*</span></label>
                            <input required type="number" step="0.01" min="0" max="100"
                                value={form.depreciationRate}
                                onChange={e => setForm(f => ({ ...f, depreciationRate: e.target.value }))}
                                placeholder={t("مثال: 20")} style={{...IS, fontFamily: OUTFIT}} onFocus={focusIn} onBlur={focusOut} />
                        </div>

                        {/* طريقة الإهلاك */}
                        <div>
                            <label style={LS}>{t('طريقة الإهلاك')} <span style={{ color: '#f87171' }}>*</span></label>
                            <div className="dep-methods-grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {DEP_METHODS.map(m => (
                                    <button key={m.value} type="button"
                                        onClick={() => setForm(f => ({ ...f, depreciationMethod: m.value as any }))}
                                        style={{
                                            padding: '12px 16px', borderRadius: '12px',
                                            border: '1px solid', 
                                            cursor: 'pointer', transition: 'all 0.15s',
                                            borderColor: form.depreciationMethod === m.value
                                                ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.07)',
                                            background: form.depreciationMethod === m.value
                                                ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.02)',
                                        }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: form.depreciationMethod === m.value ? '#fbbf24' : '#64748b' }}>
                                            {m.label}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
                                            {m.sub}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ══ القسم الثالث: الحسابات المحاسبية ══ */}
                    <div style={{ ...SC, marginBottom: '20px' }}>
                        <div style={STitle}>
                            <Building2 size={16} /> {t('الحسابات المحاسبية')}
                            <span className="hide-mobile" style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 500, marginInlineEnd: 'auto' }}>
                                {t('مطلوبة لإنشاء القيود تلقائياً')}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                            <div>
                                <label style={LS}>{t('حساب الأصل الثابت')} <span style={{ color: '#f87171' }}>*</span></label>
                                <CustomSelect value={form.assetAccountId} onChange={set('assetAccountId')}
                                    icon={Building2}
                                    placeholder={t("اختر حساب الأصل (1xxx)...")}
                                    options={toOpts(assetAccounts)} />
                                <p style={{ fontSize: '11px', color: '#475569', margin: '4px 0 0', textAlign: 'center' }}>
                                    {t('من حسابات الأصول الثابتة')}
                                </p>
                            </div>
                            <div>
                                <label style={LS}>{t('حساب مصروف الإهلاك')} <span style={{ color: '#f87171' }}>*</span></label>
                                <CustomSelect value={form.depAccountId} onChange={set('depAccountId')}
                                    icon={TrendingDown}
                                    placeholder={t("اختر حساب المصروف (5xxx)...")}
                                    options={toOpts(expenseAccounts)} />
                                <p style={{ fontSize: '11px', color: '#475569', margin: '4px 0 0', textAlign: 'center' }}>
                                    {t('مدين عند تسجيل الإهلاك')}
                                </p>
                            </div>
                            <div>
                                <label style={LS}>{t('حساب مجمع الإهلاك')} <span style={{ color: '#f87171' }}>*</span></label>
                                <CustomSelect value={form.accumAccountId} onChange={set('accumAccountId')}
                                    icon={TrendingDown}
                                    placeholder={t("اختر حساب مجمع الإهلاك...")}
                                    options={toOpts(assetAccounts)} />
                                <p style={{ fontSize: '11px', color: '#475569', margin: '4px 0 0', textAlign: 'center' }}>
                                    {t('دائن عند تسجيل الإهلاك — حساب مقابل للأصل')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ══ القسم الرابع: ملاحظات ══ */}
                    <div style={{ ...SC, marginBottom: '20px' }}>
                        <label style={LS}>{t('ملاحظات')}</label>
                        <textarea value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            rows={3} placeholder={t("أي ملاحظات إضافية عن الأصل...")}
                            style={{ ...IS, height: 'auto', padding: '10px 14px', resize: 'vertical' } as any}
                            onFocus={focusIn} onBlur={focusOut} />
                    </div>

                    {/* ══ Buttons ══ */}
                    <div className="action-buttons-responsive" style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
                        <button type="submit" disabled={saving} style={{ ...BTN_PRIMARY(false, saving), width: 'auto', flex: 3, height: '52px' }}>
                            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            {saving ? t('جاري الحفظ...') : t('إضافة الأصل للسجل')}
                        </button>
                        <button type="button" onClick={() => router.push('/fixed-assets')}
                            style={{ flex: 1, height: '52px', borderRadius: '14px', border: `1px solid ${C.border}`, fontFamily: CAIRO, background: 'rgba(255,255,255,0.02)', color: C.textSecondary, fontSize: '15px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                            {t('إلغاء')}
                        </button>
                    </div>

                </form>

                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes spin { to { transform: rotate(360deg); } }
                    .animate-spin { animation: spin 1s linear infinite; }
                    
                    @media (max-width: 768px) {
                        .fields-grid-responsive { grid-template-columns: 1fr !important; }
                        .cost-salvage-grid-responsive { grid-template-columns: 1fr !important; gap: 24px !important; }
                        .dep-methods-grid-responsive { grid-template-columns: 1fr !important; }
                        .action-buttons-responsive { flex-direction: column; }
                        .action-buttons-responsive button { width: 100% !important; flex: none !important; }
                        .hide-mobile { display: none !important; }
                    }
                ` }} />
            </div>
        </DashboardLayout>
    );
}
