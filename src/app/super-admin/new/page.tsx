'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { navSections } from '@/constants/navigation';
import { Shield, ArrowRight, ArrowLeft, Building2, User, CreditCard, Check, ChevronDown, ChevronUp, Loader2, CheckSquare, Square, CheckCircle, Phone, Mail, Lock, UserCircle, Briefcase, Calendar, Globe, MapPin, X, Activity, Search } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, BTN_PRIMARY } from '@/constants/theme';
import CustomSelect from '@/components/CustomSelect';

// We'll use theme constants instead of these local ones
const PLANS = {
    trial: { label: 'تجريبي 14 يوم', color: '#fb923c', days: 14 },
    basic: { label: 'أساسي', color: '#60a5fa', days: 365 },
    pro: { label: 'متقدم', color: '#a78bfa', days: 365 },
    premium: { label: 'بريميوم', color: '#fbbf24', days: 365 },
    custom: { label: 'مخصص', color: '#34d399', days: 0 },
};

// الـ featureKeys الصحيحة من navSections:
// dashboard, sales, installments, purchases, inventory, accounting, treasury, hr, partners, fixed_assets, reports, settings
const BUSINESS_TYPES = [
    {
        value: "TRADING",
        label: "نشاط تجاري (جملة وتجزئة)",
        modules: ['sales', 'installments', 'purchases', 'inventory', 'accounting', 'treasury', 'partners', 'reports']
    },
    {
        value: "SERVICES",
        label: "نشاط خدمات (استشارات، صيانة، إلخ)",
        modules: ['sales', 'installments', 'inventory', 'accounting', 'treasury', 'reports']
    },
];

const COUNTRIES = [
    { value: 'EG', label: '🇪🇬 مصر' },
    { value: 'SA', label: '🇸🇦 السعودية' },
    { value: 'AE', label: '🇦🇪 الإمارات' },
    { value: 'KW', label: '🇰🇼 الكويت' },
    { value: 'QA', label: '🇶🇦 قطر' },
    { value: 'BH', label: '🇧🇭 البحرين' },
    { value: 'OM', label: '🇴🇲 عمان' },
    { value: 'JO', label: '🇯🇴 الأردن' },
    { value: 'IQ', label: '🇮🇶 العراق' },
    { value: 'LY', label: '🇱🇾 ليبيا' },
    { value: 'SD', label: '🇸🇩 السودان' },
    { value: 'LB', label: '🇱🇧 لبنان' },
    { value: 'SY', label: '🇸🇾 سوريا' },
    { value: 'YE', label: '🇾🇪 اليمن' },
    { value: 'TN', label: '🇹🇳 تونس' },
    { value: 'DZ', label: '🇩🇿 الجزائر' },
    { value: 'MA', label: '🇲🇦 المغرب' },
];

// بناء features لكل الأقسام المتاحة من navSections (بغض النظر عن نوع النشاط)
const buildAllFeatures = (): Record<string, string[]> => {
    const map = new Map<string, string[]>();
    navSections.forEach(s => {
        if (!s.featureKey || s.featureKey === 'dashboard' || s.featureKey === 'settings') return;
        if (!s.links || s.links.length === 0) return;
        if (!map.has(s.featureKey)) map.set(s.featureKey, []);
        s.links.forEach((l: any) => {
            if (!map.get(s.featureKey)!.includes(l.id))
                map.get(s.featureKey)!.push(l.id);
        });
    });
    return Object.fromEntries(map);
};

export default function NewCompanyPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: شركة, 2: مدير, 3: اشتراك, 4: صلاحيات
    const [submitting, setSubmitting] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    const [form, setForm] = useState({
        // الشركة
        name: '', nameEn: '', phone: '', email: '', address: '', businessType: 'TRADING', countryCode: 'EG',
        // المدير
        adminName: '', adminUsername: '', adminEmail: '', adminPhone: '', adminPassword: '', adminPasswordConfirm: '',
        // الاشتراك
        plan: 'trial',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        maxUsers: '5',
        maxBranches: '1',
        // الصلاحيات
        features: {} as Record<string, string[]>,
    });

    // بناء الـ features بناءً على نوع النشاط مع الـ featureKeys الصحيحة
    const buildDefaultFeatures = (bType: string): Record<string, string[]> => {
        const allowedModules = BUSINESS_TYPES.find(b => b.value === bType)?.modules
            || BUSINESS_TYPES.find(b => b.value === 'TRADING')!.modules;
        const features: Record<string, string[]> = {};
        const map = new Map<string, string[]>();
        navSections.forEach(s => {
            if (!s.featureKey || s.featureKey === 'dashboard' || s.featureKey === 'settings') return;
            if (!s.links || s.links.length === 0) return;
            if (!allowedModules.includes(s.featureKey)) return;
            if (!map.has(s.featureKey)) map.set(s.featureKey, []);
            s.links.forEach((l: any) => {
                if (!map.get(s.featureKey)!.includes(l.id))
                    map.get(s.featureKey)!.push(l.id);
            });
        });
        return Object.fromEntries(map);
    };

    // تعيين الصلاحيات الافتراضية عند تغيير نوع النشاط
    useEffect(() => {
        setForm(f => ({ ...f, features: buildDefaultFeatures(f.businessType) }));
    }, [form.businessType]);

    /* ─── Helpers ─── */
    const updatePlan = (plan: string) => {
        const days = PLANS[plan as keyof typeof PLANS]?.days || 365;
        const end = plan === 'custom' ? form.endDate
            : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        setForm(f => ({ ...f, plan, endDate: end }));
    };

    const toggleSection = (featureKey: string, links: any[]) => {
        setForm(f => {
            const current = f.features[featureKey] || [];
            const allIds = links.map((l: any) => l.id);
            const hasAll = allIds.every(id => current.includes(id));
            return {
                ...f,
                features: {
                    ...f.features,
                    [featureKey]: hasAll ? [] : allIds,
                },
            };
        });
    };

    const togglePage = (featureKey: string, pageId: string) => {
        setForm(f => {
            const current = f.features[featureKey] || [];
            return {
                ...f,
                features: {
                    ...f.features,
                    [featureKey]: current.includes(pageId)
                        ? current.filter(id => id !== pageId)
                        : [...current, pageId],
                },
            };
        });
    };

    const isSectionActive = (featureKey: string, links: any[]) => {
        const current = form.features[featureKey] || [];
        return links.every((l: any) => current.includes(l.id));
    };

    const isSectionPartial = (featureKey: string, links: any[]) => {
        const current = form.features[featureKey] || [];
        return links.some((l: any) => current.includes(l.id)) && !links.every((l: any) => current.includes(l.id));
    };

    const handleSubmit = async () => {
        if (form.adminPassword !== form.adminPasswordConfirm) {
            alert('كلمات المرور غير متطابقة');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/super-admin/companies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    features: form.features,
                }),
            });
            if (res.ok) {
                router.push('/super-admin');
            } else {
                const d = await res.json();
                alert(d.error || 'فشل في إنشاء الحساب');
            }
        } finally { setSubmitting(false); }
    };

    /* ─── Steps Config ─── */
    const steps = [
        { num: 1, label: 'بيانات الشركة', icon: <Building2 size={16} /> },
        { num: 2, label: 'بيانات المدير', icon: <User size={16} /> },
        { num: 3, label: 'الاشتراك', icon: <CreditCard size={16} /> },
        { num: 4, label: 'الصلاحيات', icon: <Shield size={16} /> },
    ];

    // إزالة التكرار في الـ featureKey ودمج الروابط
    const uniqueSections = (() => {
        const map = new Map<string, any>();

        navSections.forEach(s => {
            if (!s.featureKey) return;
            if (!s.links || s.links.length === 0) return;

            let section = { ...s };

            // ✅ تعديلات ديناميكية للمسميات بناءً على نوع النشاط
            if (form.businessType === 'SERVICES') {
                if (section.featureKey === 'sales') {
                    section.title = 'فواتير الخدمات';
                    section.links = section.links.map((l: any) => {
                        if (l.label === 'فواتير المبيعات') return { ...l, label: 'فواتير الخدمات' };
                        if (l.label === 'مرتجع مبيعات') return { ...l, label: 'مرتجع خدمات' };
                        return l;
                    });
                }
                if (section.featureKey === 'inventory') {
                    section.title = 'الخدمات';
                    section.links = section.links.map((l: any) => {
                        if (l.id === '/items') return { ...l, label: 'قائمة الخدمات' };
                        if (l.id === '/categories') return { ...l, label: 'تصنيفات الخدمات' };
                        return l;
                    });
                }
                if (section.featureKey === 'reports') {
                    section.links = section.links.map((l: any) => {
                        if (l.label === 'المبيعات والمشتريات') return { ...l, label: 'الخدمات والمشتريات' };
                        if (l.label === 'تقارير المخزون') return { ...l, label: 'تقارير الخدمات' };
                        return l;
                    });
                }
            }

            if (map.has(s.featureKey)) {
                const existing = map.get(s.featureKey);
                const existingIds = existing.links.map((lx: any) => lx.id);
                const newLinks = section.links.filter((lx: any) => !existingIds.includes(lx.id));
                existing.links = [...existing.links, ...newLinks];
            } else {
                map.set(s.featureKey, section);
            }
        });
        return Array.from(map.values());
    })();

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: '#080f1a', color: '#e2e8f0' }}>

            {/* Header */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => router.push('/super-admin')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                        {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />} العودة للوحة التحكم
                    </button>
                    <span style={{ color: '#334155' }}>|</span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#e2e8f0' }}>إنشاء حساب جديد</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg,#6366f1,#4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={14} style={{ color: '#fff' }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#818cf8' }}>قيد — السوبر أدمن</span>
                </div>
            </div>

            <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 24px' }}>

                {/* Steps */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '36px' }}>
                    {steps.map((s, i) => (
                        <React.Fragment key={s.num}>
                            <div onClick={() => s.num < step && setStep(s.num)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: s.num < step ? 'pointer' : 'default' }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '10px',
                                    background: step === s.num
                                        ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
                                        : step > s.num
                                            ? 'rgba(52,211,153,0.15)'
                                            : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${step === s.num ? 'rgba(99,102,241,0.5)' : step > s.num ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: step === s.num ? '#fff' : step > s.num ? '#34d399' : '#475569',
                                    transition: 'all 0.2s',
                                }}>
                                    {step > s.num ? <Check size={16} /> : s.icon}
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: step === s.num ? '#e2e8f0' : step > s.num ? '#34d399' : '#475569' }}>
                                    {s.label}
                                </span>
                            </div>
                            {i < steps.length - 1 && (
                                <div style={{ flex: 1, height: '1px', background: step > s.num ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.06)', margin: '0 12px' }} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* ══ Step 1: بيانات الشركة ══ */}
                {step === 1 && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)' }}>
                        <h2 style={{ margin: '0 0 28px', fontSize: '18px', fontWeight: 900, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '12px', fontFamily: CAIRO }}>
                            <div style={{ width: 42, height: 42, borderRadius: '12px', background: `${C.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                                <Building2 size={22} />
                            </div>
                            بيانات الشركة
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={LS}>اسم الشركة (بالعربية) <span style={{ color: C.danger }}>*</span></label>
                                <input required type="text" placeholder="مثال: شركة النيل للتجارة"
                                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut} spellCheck={false}
                                    style={IS} />
                            </div>
                            <div>
                                <label style={LS}>الاسم بالإنجليزية</label>
                                <input type="text" placeholder="Nile Trading Co."
                                    value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut} spellCheck={false}
                                    style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: OUTFIT }} />
                            </div>
                            <div>
                                <label style={LS}>رقم هاتف الشركة</label>
                                <input type="tel" placeholder="01XXXXXXXXX"
                                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut} autoComplete="new-phone"
                                    style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: OUTFIT }} />
                            </div>
                            <div>
                                <label style={LS}>البريد الإلكتروني للشركة</label>
                                <input type="email" placeholder="info@company.com"
                                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut} spellCheck={false}
                                    style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: OUTFIT }} />
                            </div>
                            <div>
                                <label style={LS}>العنوان</label>
                                <input type="text" placeholder="القاهرة، مصر"
                                    value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut} spellCheck={false}
                                    style={IS} />
                            </div>
                            <div>
                                <label style={LS}>الدولة <span style={{ color: C.danger }}>*</span></label>
                                <CustomSelect
                                    value={form.countryCode}
                                    onChange={val => setForm(f => ({ ...f, countryCode: val }))}
                                    options={COUNTRIES}
                                    placeholder="اختر الدولة..."
                                    icon={Globe}
                                    maxHeight="160px"
                                    openUp={true}
                                />
                            </div>
                            <div>
                                <label style={LS}>نوع النشاط <span style={{ color: C.danger }}>*</span></label>
                                <CustomSelect
                                    value={form.businessType}
                                    onChange={val => setForm(f => ({ ...f, businessType: val }))}
                                    options={BUSINESS_TYPES.map(b => ({ value: b.value, label: b.label }))}
                                    placeholder="اختر النشاط..."
                                    icon={Activity}
                                    maxHeight="160px"
                                    openUp={true}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '32px' }}>
                            <button onClick={() => { if (!form.name.trim()) { alert('اسم الشركة مطلوب'); return; } setStep(2); }}
                                style={{ ...BTN_PRIMARY(false, false), width: 'auto', padding: '0 36px', height: '48px', borderRadius: '12px' }}>
                                التالي {isRtl ? <ArrowLeft size={18} style={{ marginInlineEnd: '8px' }} /> : <ArrowRight size={18} style={{ marginInlineStart: '8px' }} />}
                            </button>
                        </div>
                    </div>
                )}

                {/* ══ Step 2: بيانات المدير ══ */}
                {step === 2 && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)' }}>
                        <h2 style={{ margin: '0 0 28px', fontSize: '18px', fontWeight: 900, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '12px', fontFamily: CAIRO }}>
                            <div style={{ width: 42, height: 42, borderRadius: '12px', background: `${C.blue}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.blue }}>
                                <User size={22} />
                            </div>
                            بيانات مدير الشركة
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={LS}>اسم المدير <span style={{ color: C.danger }}>*</span></label>
                                <input required type="text" placeholder="مثال: أحمد محمد"
                                    value={form.adminName} onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut} spellCheck={false}
                                    style={IS} />
                            </div>
                            <div>
                                <label style={LS}>اسم المستخدم للمدير (Login) <span style={{ color: C.danger }}>*</span></label>
                                <input required type="text" placeholder="admin123"
                                    value={form.adminUsername} onChange={e => setForm(f => ({ ...f, adminUsername: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut} spellCheck={false}
                                    autoComplete="username"
                                    style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: OUTFIT }} />
                            </div>
                            <div>
                                <label style={LS}>البريد الإلكتروني للمدير</label>
                                <input type="email" placeholder="admin@company.com"
                                    value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut} spellCheck={false}
                                    style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: OUTFIT }} />
                            </div>
                            <div>
                                <label style={LS}>رقم هاتف المدير</label>
                                <input type="tel" placeholder="01XXXXXXXXX"
                                    value={form.adminPhone} onChange={e => setForm(f => ({ ...f, adminPhone: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut} autoComplete="tel"
                                    style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: OUTFIT }} />
                            </div>
                            <div>
                                <label style={LS}>كلمة المرور <span style={{ color: C.danger }}>*</span></label>
                                <input required type="password" placeholder="••••••••"
                                    value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut}
                                    style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: OUTFIT }} />
                            </div>
                            <div>
                                <label style={LS}>تأكيد كلمة المرور <span style={{ color: C.danger }}>*</span></label>
                                <input required type="password" placeholder="••••••••"
                                    value={form.adminPasswordConfirm} onChange={e => setForm(f => ({ ...f, adminPasswordConfirm: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut}
                                    style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: OUTFIT, borderColor: form.adminPasswordConfirm && form.adminPassword !== form.adminPasswordConfirm ? C.danger : undefined }} />
                                {form.adminPasswordConfirm && form.adminPassword !== form.adminPasswordConfirm && (
                                    <p style={{ margin: '6px 0 0', fontSize: '11px', color: C.danger, fontWeight: 700, fontFamily: CAIRO }}>كلمات المرور غير متطابقة</p>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-start', marginTop: '32px' }}>
                            <button onClick={() => setStep(1)}
                                style={{ height: '48px', padding: '0 28px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', color: C.textSecondary, fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, transition: 'all 0.2s' }}>
                                السابق
                            </button>
                            <button onClick={() => { if (!form.adminName || !form.adminUsername || !form.adminPassword) { alert('كل الحقول المطلوبة يجب ملؤها'); return; } if (form.adminPassword !== form.adminPasswordConfirm) { alert('كلمات المرور غير متطابقة'); return; } setStep(3); }}
                                style={{ ...BTN_PRIMARY(false, false), width: 'auto', padding: '0 36px', height: '48px', borderRadius: '12px' }}>
                                التالي {isRtl ? <ArrowLeft size={18} style={{ marginInlineEnd: '8px' }} /> : <ArrowRight size={18} style={{ marginInlineStart: '8px' }} />}
                            </button>
                        </div>
                    </div>
                )}

                {/* ══ Step 3: الاشتراك ══ */}
                {step === 3 && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px' }}>
                        <h2 style={{ margin: '0 0 24px', fontSize: '17px', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CreditCard size={20} style={{ color: '#818cf8' }} /> بيانات الاشتراك
                        </h2>

                        {/* الباقة */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={LS}>الباقة</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px' }}>
                                {Object.entries(PLANS).map(([key, p]) => (
                                    <button key={key} type="button" onClick={() => updatePlan(key)}
                                        style={{ height: '52px', borderRadius: '10px', border: `1px solid ${form.plan === key ? p.color + '60' : 'rgba(255,255,255,0.08)'}`, background: form.plan === key ? p.color + '15' : 'rgba(255,255,255,0.03)', color: form.plan === key ? p.color : '#64748b', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                        {p.label}
                                        {p.days > 0 && <span style={{ fontSize: '10px', opacity: 0.7 }}>{p.days} يوم</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={LS}>تاريخ البداية <span style={{ color: '#f87171' }}>*</span></label>
                                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                                    style={{ ...IS, colorScheme: 'dark' }} />
                            </div>
                            <div>
                                <label style={LS}>تاريخ الانتهاء <span style={{ color: '#f87171' }}>*</span></label>
                                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                                    style={{ ...IS, colorScheme: 'dark' }} />
                            </div>
                            <div>
                                <label style={LS}>عدد المستخدمين</label>
                                <input type="number" min="1" value={form.maxUsers} onChange={e => setForm(f => ({ ...f, maxUsers: e.target.value }))}
                                    style={IS} />
                            </div>
                            <div>
                                <label style={LS}>عدد الفروع المسموح</label>
                                <input type="number" min="1" value={form.maxBranches} onChange={e => setForm(f => ({ ...f, maxBranches: e.target.value }))}
                                    style={IS} />
                            </div>
                        </div>

                        {/* ملخص */}
                        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', color: '#818cf8', fontWeight: 700, marginBottom: '8px' }}>ملخص الاشتراك</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                                {[
                                    { label: 'الباقة', value: PLANS[form.plan as keyof typeof PLANS]?.label },
                                    { label: 'مدة الاشتراك', value: `${Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / (1000 * 60 * 60 * 24))} يوم` },
                                    { label: 'عدد المستخدمين', value: form.maxUsers },
                                    { label: 'عدد الفروع', value: form.maxBranches },
                                ].map((item, i) => (
                                    <div key={i} style={{ }}>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '3px' }}>{item.label}</div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#e2e8f0' }}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start' }}>
                            <button onClick={() => setStep(2)} style={{ height: '44px', padding: '0 24px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                                السابق
                            </button>
                            <button onClick={() => setStep(4)}
                                style={{ height: '44px', padding: '0 32px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                التالي — تحديد الصلاحيات {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                            </button>
                        </div>
                    </div>
                )}

                {/* ══ Step 4: الصلاحيات ══ */}
                {step === 4 && (
                    <div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Shield size={20} style={{ color: '#818cf8' }} /> تحديد الصلاحيات
                                </h2>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => {
                                        setForm(f => ({ ...f, features: buildAllFeatures() }));
                                    }} style={{ height: '32px', padding: '0 14px', borderRadius: '8px', border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.08)', color: '#34d399', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                                        تحديد الكل
                                    </button>
                                    <button onClick={() => setForm(f => ({ ...f, features: {} }))} style={{ height: '32px', padding: '0 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                                        إلغاء الكل
                                    </button>
                                </div>
                            </div>

                            {/* القوائم */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {uniqueSections.map(section => {
                                    const featureKey = section.featureKey!;
                                    const isActive = isSectionActive(featureKey, section.links);
                                    const isPartial = isSectionPartial(featureKey, section.links);
                                    const isExpanded = expandedSections[featureKey];
                                    const SectionIcon = section.icon;

                                    return (
                                        <div key={featureKey} style={{ border: `1px solid ${isActive ? 'rgba(99,102,241,0.2)' : isPartial ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', overflow: 'hidden', background: isActive ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.01)' }}>

                                            {/* Section Header */}
                                            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '12px' }}>
                                                {/* Checkbox */}
                                                <button type="button" onClick={() => toggleSection(featureKey, section.links)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: isActive ? '#818cf8' : isPartial ? '#f59e0b' : '#475569', display: 'flex', alignItems: 'center' }}>
                                                    {isActive
                                                        ? <CheckSquare size={20} />
                                                        : isPartial
                                                            ? <CheckSquare size={20} style={{ opacity: 0.6 }} />
                                                            : <Square size={20} />
                                                    }
                                                </button>

                                                {/* Icon + Title */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                    <SectionIcon size={16} style={{ color: isActive ? '#818cf8' : '#475569' }} />
                                                    <span style={{ fontWeight: 700, fontSize: '14px', color: isActive ? '#e2e8f0' : '#94a3b8' }}>
                                                        {section.title}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#475569' }}>
                                                        ({(form.features[featureKey] || []).length}/{section.links.length} صفحة)
                                                    </span>
                                                </div>

                                                {/* Expand */}
                                                <button type="button" onClick={() => setExpandedSections(prev => ({ ...prev, [featureKey]: !isExpanded }))}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}>
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                            </div>

                                            {/* Pages */}
                                            {isExpanded && (
                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '8px 16px 12px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
                                                    {section.links.map((link: any) => {
                                                        const active = (form.features[featureKey] || []).includes(link.id);
                                                        return (
                                                            <button key={link.id} type="button" onClick={() => togglePage(featureKey, link.id)}
                                                                style={{ height: '36px', borderRadius: '8px', border: `1px solid ${active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`, background: active ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)', color: active ? '#818cf8' : '#475569', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px', transition: 'all 0.1s' }}>
                                                                {active ? <Check size={12} /> : <div style={{ width: 12, height: 12, borderRadius: '3px', border: '1px solid rgba(255,255,255,0.15)' }} />}
                                                                {link.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ملخص الصلاحيات */}
                        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: 700, marginBottom: '10px' }}>ملخص الصلاحيات المختارة</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {Object.entries(form.features).map(([key, pages]) => {
                                    if (!pages || pages.length === 0) return null;
                                    const section = uniqueSections.find(s => s.featureKey === key);
                                    return (
                                        <span key={key} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', fontWeight: 600 }}>
                                            {section?.title} ({pages.length})
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start' }}>
                            <button onClick={() => setStep(3)} style={{ height: '44px', padding: '0 24px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                                السابق
                            </button>
                            <button onClick={handleSubmit} disabled={submitting}
                                style={{ height: '44px', padding: '0 40px', borderRadius: '10px', border: 'none', background: submitting ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                                {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> جاري الإنشاء...</> : <><Check size={16} /> إنشاء الحساب</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                input:-webkit-autofill,
                input:-webkit-autofill:hover,
                input:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 1000px ${C.card} inset !important;
                    box-shadow: 0 0 0 1000px ${C.card} inset !important;
                    -webkit-text-fill-color: ${C.textPrimary} !important;
                    color: ${C.textPrimary} !important;
                    caret-color: ${C.textPrimary} !important;
                    border: 1px solid ${C.border} !important;
                    border-radius: 12px !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
                input:-webkit-autofill:focus {
                    border-color: ${C.primary} !important;
                    -webkit-box-shadow: 0 0 0 1000px ${C.card} inset, 0 0 0 1px ${C.primary}, 0 0 0 4px ${C.primary}20 !important;
                    box-shadow: 0 0 0 1000px ${C.card} inset, 0 0 0 1px ${C.primary}, 0 0 0 4px ${C.primary}20 !important;
                }
            `}</style>
        </div>
    );
}
