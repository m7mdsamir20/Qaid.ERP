'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Plus, Loader2, CheckCircle2, Building2, Users, Search, AlertTriangle, Clock, Check, Trash2, X, FileText, Pencil, Globe, RefreshCcw } from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, focusIn, focusOut, TABLE_STYLE, KPI_STYLE, KPI_ICON } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';

const t = (s: string) => s;

const PLANS: Record<string, { label: string; color: string; bg: string }> = {
    trial: { label: t('تجريبي'), color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
    basic: { label: t('أساسي'), color: '#60a5fa', bg: 'rgba(37, 106, 244,0.1)' },
    pro: { label: t('متقدم'), color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    premium: { label: t('بريميوم'), color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
    custom: { label: t('مخصص'), color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
};

const B_TYPES: Record<string, { label: string; color: string; bg: string }> = {
    TRADING: { label: t('تجارة الجملة'), color: '#256af4', bg: 'rgba(37, 106, 244,0.1)' },
    SERVICES: { label: t('خدمات'), color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    trading: { label: t('تجارة الجملة'), color: '#256af4', bg: 'rgba(37, 106, 244,0.1)' },
    RESTAURANT: { label: t('مطعم'), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    RESTAURANTS: { label: t('مطعم'), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    restaurants: { label: t('مطعم'), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    RETAIL: { label: t('تجارة التجزئة'), color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    retail: { label: t('تجارة التجزئة'), color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    CONTRACTING: { label: t('مقاولات وإنشاءات'), color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.1)' },
    contracting: { label: t('مقاولات وإنشاءات'), color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.1)' },
};

const fmt = (d: string) => new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
const daysLeft = (endDate: string) => Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

export default function SuperAdminPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session, status } = useSession();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    const [companies, setCompanies] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    const columns: TableColumn[] = [
        {
            header: t('معلومات الشركة'),
            type: 'text',
            cell: (row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'flex-start' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '14px', background: `linear-gradient(135deg, ${C.primary}15, transparent)`, border: `1px solid ${C.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, fontWeight: 600, fontSize: '18px', flexShrink: 0 }}>
                        {row.name.charAt(0)}
                    </div>
                    <div style={{ textAlign: 'start' }}>
                        <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: '15px', marginBottom: '4px' }}>{row.name}</div>
                        <div style={{ fontSize: '12px', color: C.textSecondary, fontFamily: OUTFIT }}>{row.email || '—'}</div>
                    </div>
                </div>
            )
        },
        {
            header: t('النشاط'),
            type: 'text',
            cell: (row) => {
                const bType = B_TYPES[(row.businessType || 'TRADING').toUpperCase()] || { label: row.businessType || t("غير محدد"), color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
                return (
                    <span style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '24px', background: bType.bg, color: bType.color, fontWeight: 600, border: `1px solid ${bType.color}20`, display: 'inline-block' }}>
                        {bType.label}
                    </span>
                );
            }
        },
        {
            header: t('الباقة والمستخدمين'),
            type: 'number',
            cell: (row) => {
                const sub = row.subscription;
                const plan = PLANS[sub?.plan] || PLANS.basic;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', background: plan.bg, color: plan.color, fontWeight: 600 }}>
                            {plan.label}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: C.textSecondary, fontSize: '13px', fontWeight: 700, fontFamily: OUTFIT }}>
                            <Users size={14} /> {row._count?.users || 0}/{sub?.maxUsers || row.maxUsers}
                        </div>
                    </div>
                );
            }
        },
        {
            header: t('تاريخ الانتهاء'),
            type: 'number',
            cell: (row) => {
                const sub = row.subscription;
                if (!sub) {
                    return <span style={{ color: C.danger, fontSize: '12px', fontWeight: 600 }}>{t("❌ لا يوجد اشتراك")}</span>;
                }
                const days = sub?.endDate ? daysLeft(sub.endDate) : 0;
                const isExpired = days < 0;
                const isWarn = days >= 0 && days <= 30;
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', color: isExpired ? C.danger : isWarn ? C.warning : C.success, fontWeight: 600, fontFamily: OUTFIT, marginBottom: '4px' }}>
                            {isExpired ? `${t('موقوف')} (${Math.abs(days)} ${t('يوم')})` : days === 0 ? t("ينتهي اليوم ⚠️") : `${days} ${t('يوم')}`}
                        </div>
                        <div style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 600 }}>
                            {fmt(sub.endDate)}
                        </div>
                    </div>
                );
            }
        },
        {
            header: t('حالة الحساب'),
            type: 'number',
            cell: (row) => (
                <button onClick={() => handleToggle(row.id, row.isActive)}
                    style={{ margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '36px', padding: '0 16px', borderRadius: '10px', border: `1px solid ${row.isActive ? C.success : C.danger}40`, background: row.isActive ? `${C.success}15` : `${C.danger}15`, color: row.isActive ? C.success : C.danger, fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {row.isActive ? <><CheckCircle2 size={16} /> {t("مُفعل")}</> : <><X size={16} /> {t("معطل")}</>}
                </button>
            )
        },
        {
            header: t('إجراءات'),
            type: 'number',
            cell: (row) => (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <button onClick={() => router.push(`/super-admin/edit/${row.id}`)}
                        style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${C.primary}10`, color: C.primary, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleteTarget(row)}
                        style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${C.danger}10`, color: C.danger, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    useEffect(() => {
        if (status === 'loading') return;
        if (!session) {
            router.push('/login?callbackUrl=/super-admin');
            return;
        }

        // تحقق من isSuperAdmin من التوكن أولاً
        if ((session?.user as any)?.isSuperAdmin) {
            setAuthorized(true);
            return;
        }

        // fallback: تحقق مباشرة من قاعدة البيانات
        fetch('/api/super-admin/check')
            .then(r => r.json())
            .then(d => {
                if (d.authorized) setAuthorized(true);
                else router.push('/');
            })
            .catch(() => router.push('/'));
    }, [session, status, router]);

    const fetchData = useCallback(async () => {
        if (!authorized) return;
        try {
            setLoading(true);
            const [cRes, sRes] = await Promise.all([
                fetch('/api/super-admin/companies'),
                fetch('/api/super-admin/stats'),
            ]);
            if (cRes.ok) setCompanies(await cRes.json());
            if (sRes.ok) setStats(await sRes.json());
        } catch { } finally { setLoading(false); }
    }, [authorized]);

    useEffect(() => {
        if (authorized) fetchData();
    }, [fetchData, authorized]);

    const handleToggle = async (id: string, isActive: boolean) => {
        await fetch(`/api/super-admin/companies/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: !isActive }),
        });
        fetchData();
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/super-admin/companies/${deleteTarget.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setDeleteTarget(null);
                fetchData();
            } else {
                // Safely parse error - response body might be empty
                try {
                    const text = await res.text();
                    const d = text ? JSON.parse(text) : {};
                    alert(d.error || t("فشل الحذف"));
                } catch {
                    alert(t("فشل الحذف"));
                }
            }
        } catch (err) {
            alert(t("حدث خطأ أثناء الحذف"));
        } finally { setDeleting(false); }
    };

    const filtered = companies.filter(c =>
        c.name.includes(search) || (c.email || '').includes(search) || (c.businessType || '').includes(search)
    );

    if (!authorized) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, color: C.textSecondary }}>
            <div style={{ }}>
                <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: C.primary, margin: '0 auto' }} />
                <div style={{ fontSize: '15px', fontWeight: 600, fontFamily: CAIRO }}>{t("جاري التحقق من الصلاحيات...")}</div>
            </div>
        </div>
    );

    return (
        <div className="super-admin-container" dir={isRtl ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: C.bg, padding: '24px', color: C.textPrimary, fontFamily: CAIRO }}>

            <PageHeader
                title={t("نظام الإدارة الشامل (Super Admin)")}
                subtitle={t("إدارة الحسابات، الأنشطة المتعددة والاشتراكات")}
                icon={Shield}
                primaryButton={{
                    label: t("إضافة شركة / نشاط جديد"),
                    onClick: () => router.push('/super-admin/new'),
                    icon: Plus
                }}
            />

            {/* Stats Overview */}
            <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {[
                    { label: t("إجمالي الشركات"), value: stats.totalCompanies || companies.length || 0, color: '#256af4', icon: <Building2 size={18} />, suffix: t("شركة") },
                    { label: t("حسابات نشطة"), value: stats.activeCompanies || companies.filter(c=>c.isActive).length || 0, color: '#10b981', icon: <CheckCircle2 size={18} />, suffix: t("حساب") },
                    { label: t("أنشطة متعددة"), value: new Set(companies.map(c=>c.businessType)).size || 0, color: '#8b5cf6', icon: <Globe size={18} />, suffix: t("أنواع") },
                    { label: t("تنتهي قريباً"), value: companies.filter(c => c.subscription && daysLeft(c.subscription.endDate) <= 30 && daysLeft(c.subscription.endDate) >= 0).length || 0, color: '#f59e0b', icon: <AlertTriangle size={18} />, suffix: t("اشتراك") },
                ].map((s, i) => (
                    <div key={i} style={{
                        background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                        padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'all 0.2s', position: 'relative'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                         <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '11px', fontWeight: 500, color: C.textSecondary, margin: '0 0 4px', whiteSpace: 'nowrap' }}>{s.label}</p>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 500 }}>{s.suffix}</span>
                            </div>
                        </div>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                            {s.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Section */}
            <div className="mobile-column" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}` }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', insetInlineStart: '16px', top: '50%', transform: 'translateY(-50%)', color: C.primary,  pointerEvents: 'none' }} />
                    <input
                        type="text"
                        placeholder={t("ابحث باسم الشركة، البريد الإلكتروني، أو نوع النشاط...")}
                        style={{
                            ...IS, paddingInlineStart: '48px', height: '48px', fontSize: '13px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '12px',
                            border: `1px solid ${C.border}`
                        }}
                        onFocus={focusIn}
                        onBlur={focusOut}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <button onClick={fetchData} style={{ height: '48px', width: '48px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', color: C.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <RefreshCcw size={20} />
                </button>
            </div>

            {/* Data Grid */}
            <DataTable
                columns={columns}
                data={filtered}
                emptyIcon={FileText}
                emptyMessage={t("لا توجد حسابات مسجلة تطابق البحث")}
                isLoading={loading}
                loadingSkeleton={
                    <div style={{  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: C.textSecondary }}>
                        <Loader2 size={40} style={{ animation: 'spin 1.5s linear infinite', display: 'block', margin: '0 auto 20px', color: C.primary }} />
                        <div style={{ fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>{t("جاري استخراج بيانات الشركات والأنشطة...")}</div>
                    </div>
                }
            />

            {/* ── Delete Confirmation Modal ── */}
            {deleteTarget && (
                <div onClick={() => !deleting && setDeleteTarget(null)}
                    style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div onClick={e => e.stopPropagation()} dir={isRtl ? 'rtl' : 'ltr'}
                        style={{ width: '100%', maxWidth: '440px', background: C.bg, border: `1px solid ${C.danger}30`, borderRadius: '24px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', textAlign: 'center' }}>

                        <div style={{ width: 72, height: 72, borderRadius: '20px', background: `${C.danger}15`, border: `1px solid ${C.danger}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: C.danger }}>
                            <Trash2 size={32} />
                        </div>

                        <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600, color: C.textPrimary }}>{t("حذف نشاط الشركة نهائياً")}</h3>
                        <p style={{ margin: '0 0 16px', fontSize: '15px', color: C.textSecondary }}>{t("هل أنت متأكد من رغبتك في حذف:")}</p>
                        
                        <div style={{ margin: '0 auto 24px', fontSize: '16px', fontWeight: 600, color: C.danger, background: `${C.danger}08`, padding: '12px 20px', borderRadius: '12px', display: 'inline-block' }}>
                            {deleteTarget.name}
                        </div>
                        
                        <div style={{ margin: '0 0 32px', fontSize: '13px', color: C.textSecondary, lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                            {t("سيتم مسح كافة البيانات المرتبطة بكل الأنشطة (فواتير، مستخدمين، قيود) من النظام بشكل دائم.")}
                            <br />
                            <strong style={{ color: C.danger, display: 'block', marginTop: '8px' }}>{t("هذا الإجراء غير قابل للتراجع!")}</strong>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={handleDelete} disabled={deleting}
                                style={{ flex: 1.5, height: '52px', borderRadius: '14px', border: 'none', background: deleting ? 'rgba(239,68,68,0.4)' : C.danger, color: '#fff', fontSize: '15px', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                {deleting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> {t("جاري الحذف...")}</> : <><Trash2 size={18} /> {t("تأكيد الحذف")}</>}
                            </button>
                            <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                                style={{ flex: 1, height: '52px', borderRadius: '14px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
                                {t("إلغاء")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                input:focus { outline: none; }
                
                @media (max-width: 1023px) {
                    .super-admin-container { padding: 16px !important; }
                    .mobile-column, .mobile-stack { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
                    .mobile-full { width: 100% !important; max-width: 100% !important; margin-left: 0 !important; margin-right: 0 !important; }
                    .responsive-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                    .scroll-table {
                        width: 100% !important;
                        overflow-x: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                        border-radius: 12px;
                        margin-bottom: 5px;
                    }
                    .scroll-table table { min-width: 750px !important; }
                    button, input, select { min-height: 42px !important; font-size: 14px !important; }
                    .page-title { font-size: 16px !important; }
                    .page-subtitle { font-size: 11px !important; }
                }
                @media (max-width: 768px) {
                    .super-admin-container { padding: 16px !important; }
                    .mobile-column, .mobile-stack { gap: 10px !important; }
                    .mobile-full { width: 100% !important; max-width: 100% !important; }
                    button, input, select, textarea { min-height: 44px !important; }
                    input, select, textarea { font-size: 16px !important; }
                }
            `}</style>
        </div>
    );
}
