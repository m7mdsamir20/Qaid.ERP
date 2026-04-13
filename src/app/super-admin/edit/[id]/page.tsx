'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useRouter, useParams } from 'next/navigation';
import { navSections } from '@/constants/navigation';
import {
    Shield, ArrowRight, Building2, User, CreditCard,
    Check, ChevronDown, ChevronUp, Loader2, CheckSquare,
    Square, Key, Eye, EyeOff, X, Phone, Mail, UserCircle, Activity
} from 'lucide-react';
import { THEME, C, CAIRO, INTER, IS, LS, focusIn, focusOut, BTN_PRIMARY } from '@/constants/theme';

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

// بناء features لكل الأقسام المتاحة (تحديد الكل)
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

const buildDefaultFeatures = (bType: string): Record<string, string[]> => {
    const allowedModules = BUSINESS_TYPES.find(b => b.value === bType)?.modules
        || BUSINESS_TYPES.find(b => b.value === 'TRADING')!.modules;
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

// Build all sections from navSections (without businessType filtering) for parsing
const getAllSections = () => {
    const map = new Map<string, any>();
    navSections.forEach(s => {
        if (!s.featureKey || !s.links || s.links.length === 0) return;
        if (map.has(s.featureKey)) {
            const existing = map.get(s.featureKey);
            const existingIds = existing.links.map((l: any) => l.id);
            const newLinks = s.links.filter((l: any) => !existingIds.includes(l.id));
            existing.links = [...existing.links, ...newLinks];
        } else {
            map.set(s.featureKey, { ...s });
        }
    });
    return Array.from(map.values());
};

// Parse raw features string/object into Record<string, string[]>
const parseFeaturesFromRaw = (raw: any): Record<string, string[]> | null => {
    try {
        let parsed = raw;
        if (typeof raw === 'string') {
            parsed = JSON.parse(raw);
        }
        if (!parsed || typeof parsed !== 'object') return null;
        
        // If it's an array like ['sales','purchases'], expand to full pages
        if (Array.isArray(parsed)) {
            const allSections = getAllSections();
            const result: Record<string, string[]> = {};
            parsed.forEach((key: string) => {
                const sec = allSections.find(s => s.featureKey === key);
                if (sec) result[key] = sec.links.map((l: any) => l.id);
            });
            return result;
        }
        
        // If it's Record<string, string[]>, use it directly
        return parsed as Record<string, string[]>;
    } catch {
        return null;
    }
};

export default function EditCompanyPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    const [form, setForm] = useState({
        // الشركة
        name: '', nameEn: '', phone: '', email: '', address: '', businessType: 'TRADING', countryCode: 'EG',
        isActive: true,
        // المدير
        adminName: '', adminEmail: '', adminPhone: '',
        newPassword: '', newPasswordConfirm: '',
        // الاشتراك
        plan: 'basic',
        startDate: '',
        endDate: '',
        maxUsers: '5',
        maxBranches: '1',
        notes: '',
        // الصلاحيات
        features: {} as Record<string, string[]>,
    });

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

    useEffect(() => {
        // Use the direct GET endpoint to get a single company
        fetch(`/api/super-admin/companies/${id}`)
            .then(r => r.json())
            .then((c: any) => {
                if (!c || c.error) { router.push('/super-admin'); return; }

                const sub = c.subscription;
                const admin = c.users?.[0];
                const bType = (c.businessType || 'trading').toUpperCase();

                // Parse saved features - use parseFeaturesFromRaw which doesn't depend on state
                let features: Record<string, string[]> = {};
                if (sub?.features) {
                    const parsed = parseFeaturesFromRaw(sub.features);
                    if (parsed && Object.keys(parsed).length > 0) {
                        features = parsed;
                        console.log('[SUPER-ADMIN] Loaded features from DB:', Object.keys(features));
                    } else {
                        // Fallback to defaults
                        features = buildDefaultFeatures(bType);
                        console.log('[SUPER-ADMIN] Using default features for:', bType);
                    }
                } else {
                    features = buildDefaultFeatures(bType);
                }

                setForm(f => ({
                    ...f,
                    name: c.name || '',
                    nameEn: c.nameEn || '',
                    phone: c.phone || '',
                    email: c.email || '',
                    address: c.address || '',
                    businessType: bType,
                    countryCode: c.countryCode || 'EG',
                    isActive: c.isActive ?? true,
                    adminName: admin?.name || '',
                    adminEmail: admin?.email || '',
                    adminPhone: admin?.phone || '',
                    plan: sub?.plan || 'basic',
                    startDate: sub?.startDate ? sub.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
                    endDate: sub?.endDate ? sub.endDate.split('T')[0] : '',
                    maxUsers: String(sub?.maxUsers || 5),
                    maxBranches: String(sub?.maxBranches || 1),
                    notes: sub?.notes || '',
                    features,
                }));
            })
            .catch(() => router.push('/super-admin'))
            .finally(() => setLoading(false));
    }, [id, router]);

    const toggleSection = (featureKey: string, links: any[]) => {
        setForm(f => {
            const current = f.features[featureKey] || [];
            const allIds = links.map((l: any) => l.id);
            const hasAll = allIds.every(id => current.includes(id));
            return { ...f, features: { ...f.features, [featureKey]: hasAll ? [] : allIds } };
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
                        ? current.filter(x => x !== pageId)
                        : [...current, pageId],
                },
            };
        });
    };

    const isSectionActive = (fk: string, links: any[]) => links.every((l: any) => (form.features[fk] || []).includes(l.id));
    const isSectionPartial = (fk: string, links: any[]) => links.some((l: any) => (form.features[fk] || []).includes(l.id)) && !isSectionActive(fk, links);

    const handleSubmit = async () => {
        if (form.newPassword && form.newPassword !== form.newPasswordConfirm) {
            alert('كلمات المرور غير متطابقة'); return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(`/api/super-admin/companies/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    nameEn: form.nameEn,
                    phone: form.phone,
                    email: form.email,
                    address: form.address,
                    businessType: form.businessType,
                    countryCode: form.countryCode,
                    isActive: form.isActive,
                    adminName: form.adminName,
                    adminEmail: form.adminEmail,
                    adminPhone: form.adminPhone,
                    newPassword: form.newPassword || undefined,
                    plan: form.plan,
                    startDate: form.startDate,
                    endDate: form.endDate,
                    maxUsers: form.maxUsers,
                    maxBranches: form.maxBranches,
                    notes: form.notes,
                    features: form.features, // إرسال كاobect وليس نص عشان مايتعملوش escape للـ quotes
                }),
            });
            if (res.ok) {
                const result = await res.json();
                console.log('[SUPER-ADMIN] Save result:', result);
                router.push('/super-admin');
            } else {
                const d = await res.json();
                alert(d.error || 'فشل التحديث');
            }
        } finally { setSubmitting(false); }
    };

    const steps = [
        { num: 1, label: 'بيانات الشركة', icon: <Building2 size={16} /> },
        { num: 2, label: 'مدير النظام', icon: <User size={16} /> },
        { num: 3, label: 'الاشتراك', icon: <CreditCard size={16} /> },
        { num: 4, label: 'الصلاحيات', icon: <Shield size={16} /> },
    ];

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, color: C.textSecondary }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
    );

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: C.bg, color: C.textPrimary, fontFamily: CAIRO }}>

            {/* Header */}
            <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => router.push('/super-admin')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: C.textSecondary, cursor: 'pointer', fontSize: '13.5px', fontWeight: 700, transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.color = C.textPrimary}
                        onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}>
                        <ArrowRight size={18} /> العودة للوحة التحكم
                    </button>
                    <span style={{ color: C.border, height: '20px', width: '1px', background: C.border }} />
                    <span style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary }}>تعديل حساب: {form.name}</span>
                </div>

                <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '38px', padding: '0 18px', borderRadius: '10px', border: `1px solid ${form.isActive ? C.success + '40' : C.danger + '40'}`, background: form.isActive ? C.success + '08' : C.danger + '08', color: form.isActive ? C.success : C.danger, fontSize: '12.5px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', boxShadow: `0 0 10px ${form.isActive ? C.success : C.danger}` }} />
                    {form.isActive ? 'الحساب نشط' : 'الحساب معطّل'}
                </button>
            </div>

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>

                {/* Steps Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '48px' }}>
                    {steps.map((s, i) => (
                        <React.Fragment key={s.num}>
                            <div onClick={() => setStep(s.num)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                <div style={{
                                    width: 42, height: 42, borderRadius: '14px',
                                    background: step === s.num ? `linear-gradient(135deg,${C.primary},${C.primaryHover})` : step > s.num ? `${C.success}15` : `${C.card}`,
                                    border: `1px solid ${step === s.num ? `${C.primary}50` : step > s.num ? `${C.success}30` : C.border}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: step === s.num ? '#fff' : step > s.num ? C.success : C.textMuted,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: step === s.num ? `0 8px 16px -4px ${C.primary}40` : 'none'
                                }}>
                                    {step > s.num ? <Check size={20} strokeWidth={3} /> : React.cloneElement(s.icon as any, { size: 20 })}
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: step === s.num ? C.textPrimary : step > s.num ? C.success : C.textSecondary, transition: 'all 0.3s' }}>
                                    {s.label}
                                </span>
                            </div>
                            {i < steps.length - 1 && (
                                <div style={{ flex: 1, height: '2px', background: step > s.num ? `${C.success}30` : C.border, margin: '0 16px', borderRadius: '1px' }} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* ══ Step 1: بيانات الشركة ══ */}
                {step === 1 && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '36px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)' }}>
                        <h2 style={{ margin: '0 0 32px', fontSize: '19px', fontWeight: 900, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${C.primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                                <Building2 size={24} />
                            </div>
                            البيانات الأساسية للشركة
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={LS}>اسم الشركة (بالعربية) <span style={{ color: C.danger }}>*</span></label>
                                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onFocus={focusIn} onBlur={focusOut} spellCheck={false} style={IS} />
                            </div>
                            <div>
                                <label style={LS}>الاسم بالإنجليزية</label>
                                <input type="text" value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} onFocus={focusIn} onBlur={focusOut} spellCheck={false} style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: INTER }} />
                            </div>
                            <div>
                                <label style={LS}>رقم هاتف الشركة</label>
                                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} onFocus={focusIn} onBlur={focusOut} autoComplete="new-phone" style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: INTER }} />
                            </div>
                            <div>
                                <label style={LS}>البريد الإلكتروني للشركة</label>
                                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} onFocus={focusIn} onBlur={focusOut} spellCheck={false} style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: INTER }} />
                            </div>
                            <div>
                                <label style={LS}>العنوان</label>
                                <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} onFocus={focusIn} onBlur={focusOut} style={IS} />
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={LS}>الدولة <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                    {[
                                        { code: 'EG', name: 'مصر', flag: '🇪🇬' },
                                        { code: 'SA', name: 'السعودية', flag: '🇸🇦' },
                                        { code: 'AE', name: 'الإمارات', flag: '🇦🇪' },
                                        { code: 'KW', name: 'الكويت', flag: '🇰🇼' },
                                        { code: 'QA', name: 'قطر', flag: '🇶🇦' },
                                        { code: 'BH', name: 'البحرين', flag: '🇧🇭' },
                                        { code: 'OM', name: 'عمان', flag: '🇴🇲' },
                                        { code: 'JO', name: 'الأردن', flag: '🇯🇴' },
                                        { code: 'IQ', name: 'العراق', flag: '🇮🇶' },
                                        { code: 'LY', name: 'ليبيا', flag: '🇱🇾' },
                                        { code: 'SD', name: 'السودان', flag: '🇸🇩' },
                                        { code: 'LB', name: 'لبنان', flag: '🇱🇧' },
                                        { code: 'SY', name: 'سوريا', flag: '🇸🇾' },
                                        { code: 'YE', name: 'اليمن', flag: '🇾🇪' },
                                        { code: 'TN', name: 'تونس', flag: '🇹🇳' },
                                        { code: 'DZ', name: 'الجزائر', flag: '🇩🇿' },
                                        { code: 'MA', name: 'المغرب', flag: '🇲🇦' },
                                    ].map(c => (
                                        <button key={c.code} type="button" onClick={() => setForm(f => ({ ...f, countryCode: c.code }))}
                                            style={{
                                                height: '44px', borderRadius: '10px',
                                                border: `1px solid ${form.countryCode === c.code ? C.primary : 'rgba(255,255,255,0.06)'}`,
                                                background: form.countryCode === c.code ? `${C.primary}15` : 'rgba(255,255,255,0.02)',
                                                color: form.countryCode === c.code ? C.primary : C.textSecondary,
                                                fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                            }}>
                                            <span style={{ fontSize: '16px' }}>{c.flag}</span>
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={LS}>نوع النشاط <span style={{ color: C.danger }}>*</span></label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {BUSINESS_TYPES.map(b => (
                                        <button key={b.value} type="button" onClick={() => setForm(f => ({ ...f, businessType: b.value }))}
                                            style={{
                                                height: '52px', borderRadius: '12px', border: `1px solid ${form.businessType === b.value ? C.primary : 'rgba(255,255,255,0.06)'}`,
                                                background: form.businessType === b.value ? `${C.primary}15` : 'rgba(255,255,255,0.02)',
                                                color: form.businessType === b.value ? C.primary : C.textSecondary,
                                                fontSize: '14px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                            }}>
                                            {form.businessType === b.value ? <CheckSquare size={16} /> : <Activity size={16} />}
                                            {b.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '36px' }}>
                            <button onClick={() => { if (!form.name.trim()) { alert('اسم الشركة مطلوب'); return; } setStep(2); }}
                                style={{ ...BTN_PRIMARY(false, false), width: 'auto', padding: '0 36px', height: '50px', borderRadius: '14px' }}>
                                التالي <ArrowRight size={18} style={{ transform: 'rotate(180deg)', marginInlineEnd: '10px' }} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ══ Step 2: مدير النظام ══ */}
                {step === 2 && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '36px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)' }}>
                        <h2 style={{ margin: '0 0 10px', fontSize: '19px', fontWeight: 900, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${C.blue}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.blue }}>
                                <UserCircle size={24} />
                            </div>
                            بيانات مدير النظام
                        </h2>
                        <p style={{ margin: '0 0 32px', fontSize: '13px', color: C.textMuted, fontWeight: 500 }}>
                            يمكنك تحديث بيانات التواصل أو تغيير كلمة مرور المدير من هنا
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={LS}>اسم المدير</label>
                                <input type="text" value={form.adminName} onChange={e => setForm(f => ({ ...f, adminName: e.target.value }))} onFocus={focusIn} onBlur={focusOut} spellCheck={false} style={IS} />
                            </div>
                            <div>
                                <label style={LS}>البريد الإلكتروني للمدير</label>
                                <input type="email" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} onFocus={focusIn} onBlur={focusOut} spellCheck={false} style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: INTER }} />
                            </div>
                            <div>
                                <label style={LS}>رقم هاتف المدير</label>
                                <input type="tel" value={form.adminPhone} onChange={e => setForm(f => ({ ...f, adminPhone: e.target.value }))} onFocus={focusIn} onBlur={focusOut} autoComplete="tel" style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: INTER }} />
                            </div>

                            <div style={{ gridColumn: 'span 2', height: '1px', background: C.border, margin: '10px 0' }} />

                            <div>
                                <label style={LS}>كلمة مرور جديدة (اختياري)</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="اتركها فارغة للإبقاء"
                                        value={form.newPassword}
                                        onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                                        onFocus={focusIn} onBlur={focusOut}
                                        style={{ ...IS, paddingInlineStart: '44px', direction: 'ltr', textAlign: 'end', fontFamily: INTER }}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}>
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label style={LS}>تأكيد كلمة المرور</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="أعد كتابة كلمة المرور"
                                    value={form.newPasswordConfirm}
                                    onChange={e => setForm(f => ({ ...f, newPasswordConfirm: e.target.value }))}
                                    onFocus={focusIn} onBlur={focusOut}
                                    style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: INTER, borderColor: form.newPasswordConfirm && form.newPassword !== form.newPasswordConfirm ? C.danger : undefined }}
                                />
                                {form.newPasswordConfirm && form.newPassword !== form.newPasswordConfirm && (
                                    <p style={{ margin: '6px 0 0', fontSize: '11px', color: C.danger, fontWeight: 700 }}>كلمات المرور غير متطابقة</p>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-start', marginTop: '36px' }}>
                            <button onClick={() => setStep(1)} style={{ height: '50px', padding: '0 28px', borderRadius: '14px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                                السابق
                            </button>
                            <button onClick={() => setStep(3)} style={{ ...BTN_PRIMARY(false, false), width: 'auto', padding: '0 40px', height: '50px', borderRadius: '14px' }}>
                                التالي <ArrowRight size={18} style={{ transform: 'rotate(180deg)', marginInlineEnd: '10px' }} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ══ Step 3: الاشتراك ══ */}
                {step === 3 && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '36px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)' }}>
                        <h2 style={{ margin: '0 0 32px', fontSize: '19px', fontWeight: 900, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${C.warning}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.warning }}>
                                <CreditCard size={24} />
                            </div>
                            بيانات الاشتراك والحدود
                        </h2>

                        <div style={{ marginBottom: '28px' }}>
                            <label style={LS}>نوع الباقة</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px' }}>
                                {Object.entries(PLANS).map(([key, p]) => (
                                    <button key={key} type="button" onClick={() => {
                                        const days = PLANS[key as keyof typeof PLANS]?.days || 365;
                                        const end = key === 'custom' ? form.endDate
                                            : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                                        setForm(f => ({ ...f, plan: key, endDate: end }));
                                    }}
                                        style={{ height: '60px', borderRadius: '14px', border: `1px solid ${form.plan === key ? p.color + '60' : C.border}`, background: form.plan === key ? p.color + '12' : 'transparent', color: form.plan === key ? p.color : C.textSecondary, fontSize: '13.5px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                                        {p.label}
                                        {p.days > 0 && <span style={{ fontSize: '10px', opacity: 0.7 }}>{p.days} يوم</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                            <div>
                                <label style={LS}>تاريخ البداية</label>
                                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} onFocus={focusIn} onBlur={focusOut} style={{ ...IS, colorScheme: 'dark', fontFamily: INTER }} />
                            </div>
                            <div>
                                <label style={LS}>تاريخ الانتهاء</label>
                                <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} onFocus={focusIn} onBlur={focusOut} style={{ ...IS, colorScheme: 'dark', fontFamily: INTER }} />
                            </div>
                            <div>
                                <label style={LS}>أقصى عدد مستخدمين</label>
                                <input type="number" min="1" value={form.maxUsers} onChange={e => setForm(f => ({ ...f, maxUsers: e.target.value }))} onFocus={focusIn} onBlur={focusOut} style={{ ...IS, fontFamily: INTER }} />
                            </div>
                            <div>
                                <label style={LS}>عدد الفروع المسموح</label>
                                <input type="number" min="1" value={form.maxBranches} onChange={e => setForm(f => ({ ...f, maxBranches: e.target.value }))} onFocus={focusIn} onBlur={focusOut} style={{ ...IS, fontFamily: INTER }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '28px' }}>
                            <label style={LS}>ملاحظات السوبر أدمن</label>
                            <input type="text" placeholder="أدخل أي ملاحظات حول هذا الحساب..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} onFocus={focusIn} onBlur={focusOut} style={IS} />
                        </div>

                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-start' }}>
                            <button onClick={() => setStep(2)} style={{ height: '50px', padding: '0 28px', borderRadius: '14px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                                السابق
                            </button>
                            <button onClick={() => setStep(4)} style={{ ...BTN_PRIMARY(false, false), width: 'auto', padding: '0 40px', height: '50px', borderRadius: '14px' }}>
                                التالي — الصلاحيات <ArrowRight size={18} style={{ transform: 'rotate(180deg)', marginInlineEnd: '10px' }} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ══ Step 4: الصلاحيات ══ */}
                {step === 4 && (
                    <div>
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '36px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                                <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 900, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${C.primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                                        <Shield size={24} />
                                    </div>
                                    تعديل الصلاحيات والمزايا
                                </h2>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => setForm(f => ({ ...f, features: buildAllFeatures() }))}
                                        style={{ height: '36px', padding: '0 16px', borderRadius: '10px', border: `1px solid ${C.success}30`, background: `${C.success}10`, color: C.success, fontSize: '12.5px', fontWeight: 800, cursor: 'pointer' }}>
                                        تحديد الكل
                                    </button>
                                    <button onClick={() => setForm(f => ({ ...f, features: {} }))}
                                        style={{ height: '36px', padding: '0 16px', borderRadius: '10px', border: `1px solid ${C.danger}30`, background: `${C.danger}10`, color: C.danger, fontSize: '12.5px', fontWeight: 800, cursor: 'pointer' }}>
                                        إلغاء الكل
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {uniqueSections.map(section => {
                                    const fk = section.featureKey!;
                                    const isActive = isSectionActive(fk, section.links);
                                    const isPartial = isSectionPartial(fk, section.links);
                                    const isExpanded = expandedSections[fk];
                                    const SectionIcon = section.icon;

                                    return (
                                        <div key={fk} style={{ border: `1px solid ${isActive ? `${C.primary}30` : isPartial ? `${C.warning}30` : C.border}`, borderRadius: '16px', overflow: 'hidden', background: isActive ? `${C.primary}05` : 'transparent', transition: 'all 0.2s' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '16px' }}>
                                                <button type="button" onClick={() => toggleSection(fk, section.links)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: isActive ? C.primary : isPartial ? C.warning : C.textMuted, display: 'flex' }}>
                                                    {isActive ? <CheckSquare size={22} /> : isPartial ? <CheckSquare size={22} style={{ opacity: 0.6 }} /> : <Square size={22} />}
                                                </button>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                                    <div style={{ color: isActive ? C.primary : C.textMuted }}><SectionIcon size={18} /></div>
                                                    <span style={{ fontWeight: 800, fontSize: '15px', color: isActive ? C.textPrimary : C.textSecondary }}>
                                                        {section.title}
                                                    </span>
                                                    <div style={{ fontSize: '11px', color: C.textMuted, background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '6px' }}>
                                                        {(form.features[fk] || []).length} / {section.links.length}
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => setExpandedSections(prev => ({ ...prev, [fk]: !isExpanded }))}
                                                    style={{ border: 'none', cursor: 'pointer', color: C.textMuted, height: '32px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </button>
                                            </div>

                                            {isExpanded && (
                                                <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', background: 'rgba(0,0,0,0.1)' }}>
                                                    {section.links.map((link: any) => {
                                                        const active = (form.features[fk] || []).includes(link.id);
                                                        return (
                                                            <button key={link.id} type="button" onClick={() => togglePage(fk, link.id)}
                                                                style={{ height: '38px', borderRadius: '10px', border: `1px solid ${active ? `${C.primary}30` : C.border}`, background: active ? `${C.primary}10` : 'transparent', color: active ? C.primary : C.textSecondary, fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', transition: 'all 0.1s' }}>
                                                                {active ? <Check size={14} /> : <div style={{ width: 14, height: 14, borderRadius: '4px', border: `1px solid ${C.border}` }} />}
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

                        {/* ملخص سفلي للاختيارات */}
                        <div style={{ background: `${C.primary}05`, border: `1px solid ${C.primary}15`, borderRadius: '16px', padding: '20px 24px', marginBottom: '32px' }}>
                            <div style={{ fontSize: '13px', color: C.primary, fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={16} /> الموديولات المفعلة حالياً
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {Object.entries(form.features).map(([key, pages]) => {
                                    if (!pages || pages.length === 0) return null;
                                    const section = uniqueSections.find(s => s.featureKey === key);
                                    return (
                                        <span key={key} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', background: `${C.primary}10`, color: C.primary, border: `1px solid ${C.primary}20`, fontWeight: 800 }}>
                                            {section?.title} <span style={{ opacity: 0.6, marginInlineEnd: '4px' }}>({pages.length})</span>
                                        </span>
                                    );
                                })}
                                {Object.values(form.features).flat().length === 0 && (
                                    <span style={{ fontSize: '12px', color: C.textMuted }}>لم يتم اختيار أي صلاحيات بعد</span>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-start' }}>
                            <button onClick={() => setStep(3)} style={{ height: '50px', padding: '0 28px', borderRadius: '14px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                                السابق
                            </button>
                            <button onClick={handleSubmit} disabled={submitting}
                                style={{ ...BTN_PRIMARY(false, false), width: 'auto', padding: '0 48px', height: '52px', borderRadius: '16px', boxShadow: submitting ? 'none' : `0 10px 25px -5px ${C.primary}50` }}>
                                {submitting
                                    ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</>
                                    : <><Check size={18} /> حفظ جميع التعديلات</>
                                }
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
