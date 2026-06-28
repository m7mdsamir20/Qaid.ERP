'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2, Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { navSections } from '@/constants/navigation';
import { C, CAIRO } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { useTheme } from '@/components/Providers';

export default function Sidebar({ 
    onLinkClick,
    isCollapsed = false,
    onToggle
}: { 
    onLinkClick?: () => void;
    isCollapsed?: boolean;
    onToggle?: () => void;
}) {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const { theme } = useTheme();

    const user = session?.user as any;
    const businessType = user?.businessType?.toUpperCase() || 'TRADING';
    const isSuperAdmin = !!user?.isSuperAdmin;
    const userRole = user?.role;
    const featuresRaw = user?.subscription?.features;
    const hasSubscription = !!user?.subscription;
    const isTrial = user?.subscription?.plan === 'trial';

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // 1. حساب الـ features المتاحة
    const enabledFeatures = useMemo(() => {
        if (status === 'loading') return {};
        try {
            if (!featuresRaw) {
                // Default: Show all features if no specific subscription found but logged in
                const all: Record<string, string[]> = {};
                navSections.forEach((s: any) => {
                    if (s && s.featureKey && s.links) {
                        all[s.featureKey] = s.links.map((l: any) => l.id);
                    }
                });
                return all;
            }
            const parsed = typeof featuresRaw === 'string' ? JSON.parse(featuresRaw) : featuresRaw;
            if (Array.isArray(parsed)) {
                const obj: Record<string, string[]> = {};
                parsed.forEach((key: string) => {
                    const sections = navSections.filter(s => s.featureKey === key);
                    sections.forEach(section => {
                        if (section && section.links) {
                            obj[key] = [...(obj[key] || []), ...section.links.map(l => l.id)];
                        }
                    });
                });
                return obj;
            }
            return parsed || {};
        } catch (e) { return {}; }
    }, [featuresRaw, status]);

    // 2. دالة التحقق من الصفحات
    const hasPage = useCallback((featureKey: string, pageId: string): boolean => {
        try {
            if (!featureKey || featureKey === 'dashboard' || pageId === '/') return true;

            // الإعدادات دائماً متاحة للـ admin والـ superadmin بغض النظر عن الاشتراك
            // (settings and activity_log bypass subscription features check)
            if (featureKey === 'settings' || featureKey === 'activity_log') {
                if (isSuperAdmin || userRole === 'admin') return true;
                // للمستخدم العادي: يحتاج صلاحية صريحة
                const userPerms = user?.permissions || {};
                const hasGranularPerms = Object.keys(userPerms).length > 0;
                return hasGranularPerms ? !!userPerms[pageId]?.view : false;
            }

            // 1. فحص الاشتراك — الفترة التجريبية تعرض كل الصفحات بدون قيود
            if (!isTrial && hasSubscription && Object.keys(enabledFeatures).length > 0) {
                if (!(featureKey in enabledFeatures)) return false;
                if (!(enabledFeatures[featureKey] || []).includes(pageId)) return false;
            }

            // 2. فحص الأدوار والصلاحيات
            if (isSuperAdmin || userRole === 'admin') {
                return true;
            }

            const userPerms = user?.permissions || {};
            const hasGranularPerms = Object.keys(userPerms).length > 0;
            if (hasGranularPerms) return !!userPerms[pageId]?.view;
            return true;
        } catch { return true; }
    }, [isSuperAdmin, userRole, isTrial, hasSubscription, enabledFeatures, user]);

    // 3. دالة التحقق من القسم
    const hasFeature = useCallback((featureKey?: string): boolean => {
        try {
            if (isSuperAdmin) return true;
            if (!featureKey || featureKey === 'dashboard') return true;
            const section = navSections.find(s => s.featureKey === featureKey);
            return section?.links?.some(l => hasPage(featureKey, l.id)) ?? true;
        } catch { return true; }
    }, [isSuperAdmin, hasPage]);

    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
        const initialState: Record<string, boolean> = {};
        try {
            navSections.forEach((section: any) => {
                if (section?.links?.some((link: any) => link.href === pathname)) {
                    initialState[section.title] = true;
                }
            });
        } catch { }
        return initialState;
    });

    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';

    // 4. مزامنة الأقسام المفتوحة مع المسار الحالي عند تغيير الصفحة
    useEffect(() => {
        if (!pathname || !mounted) return;
        navSections.forEach((section: any) => {
            if (section?.links?.some((link: any) => link.href === pathname)) {
                setOpenSections(prev => ({ ...prev, [section.title]: true }));
            }
        });
    }, [pathname, mounted]);

    const sidebarItems = useMemo(() => {
        return navSections.map((sectionOrigin: any) => {
            let section = { ...sectionOrigin };
            if (businessType === 'SERVICES') {
                if (section.featureKey === 'installments') return null;
                if (section.featureKey === 'sales') {
                    section.title = t("فواتير الخدمات");
                    section.links = section.links?.filter((l: any) => l.id !== '/coupons').map((l: any) => {
                        if (l.label === t("فواتير المبيعات")) return { ...l, label: t("فواتير الخدمات") };
                        if (l.label === t("مرتجع مبيعات")) return { ...l, label: t("إلغاء خدمات / مرتجع") };
                        return l;
                    });
                }
                if (section.featureKey === 'inventory') {
                    section.title = t("الخدمات");
                    section.links = section.links?.filter((l: any) => !['/warehouses', '/stocktakings', '/warehouse-transfers'].includes(l.id)).map((l: any) => {
                        if (l.id === '/categories') return { ...l, label: t("تصنيفات الخدمات") };
                        if (l.id === '/items') return { ...l, label: t("قائمة الخدمات") };
                        return l;
                    });
                }
                if (section.featureKey === 'reports' && section.links) {
                    section.links = section.links.filter((l: any) => l.id !== 'reports-installments');
                }
            } else if (businessType !== 'RESTAURANTS') {
                if (section.featureKey === 'sales') {
                    section.links = section.links?.filter((l: any) => l.id !== '/coupons');
                }
            }

            if (businessType === 'RETAIL') {
                if (section.featureKey === 'installments') return null;
                if (section.links) {
                    section.links = section.links.filter((l: any) => l.id !== '/settlements');
                }
            }

            if (businessType === 'CONTRACTING') {
                if (section.featureKey === 'installments') return null;
                if (section.featureKey === 'sales') {
                    section.title = t("الأعمال والمبيعات");
                    section.links = section.links?.filter((l: any) => !['/coupons', '/sale-returns'].includes(l.id)).map((l: any) => {
                        if (l.id === '/sales') return { ...l, label: t("فواتير الأعمال والخدمات") };
                        if (l.id === '/customers') return { ...l, label: t("العملاء / أصحاب المشاريع") };
                        return l;
                    });
                }
                if (section.featureKey === 'inventory') {
                    section.title = t("المخازن والمواد");
                    section.links = section.links?.map((l: any) => {
                        if (l.id === '/items') return { ...l, label: t("المواد والبنود") };
                        if (l.id === '/categories') return { ...l, label: t("تصنيفات المواد والبنود") };
                        if (l.id === '/warehouses') return { ...l, label: t("المخازن والمواقع") };
                        return l;
                    });
                }
                if (section.featureKey === 'treasury' && section.links) {
                    section.links = section.links.filter((l: any) => l.id !== '/settlements');
                }
                if (section.featureKey === 'reports' && section.links) {
                    section.links = section.links.filter((l: any) => l.id !== 'reports-installments').map((l: any) => {
                        if (l.label === t("المبيعات والمشتريات")) return { ...l, label: t("الأعمال والمبيعات والمشتريات") };
                        if (l.label === t("تقارير المخزون")) return { ...l, label: t("تقارير المواد والمواقع") };
                        if (l.label === t("العملاء والموردين")) return { ...l, label: t("أصحاب المشاريع والموردين") };
                        return l;
                    });
                }
            }

            if (businessType === 'RESTAURANTS') {
                if (section.featureKey === 'installments') return null;
                if (section.featureKey === 'treasury' && section.links) {
                    section.links = section.links.filter((l: any) => l.id !== '/settlements');
                }

                if (section.featureKey === 'sales') {
                    section.title = t("العملاء والتسويق");
                    section.links = section.links?.filter((l: any) => ['/customers', '/coupons'].includes(l.id));
                }
                if (section.featureKey === 'inventory') {
                    section.title = t("المنيو والمخزون");
                    section.links = section.links?.map((l: any) => {
                        if (l.id === '/categories') return { ...l, label: t("تصنيفات المنيو") };
                        if (l.id === '/items') return { ...l, label: t("أصناف المنيو") };
                        if (l.id === '/warehouses') return { ...l, label: t("المخازن والمستودعات") };
                        return l;
                    });
                }
                if (section.featureKey === 'purchases') {
                    section.title = t("المشتريات والموردين");
                }
                if (section.featureKey === 'reports') {
                    section.links = section.links?.map((l: any) => {
                        if (l.label === t("المبيعات والمشتريات")) return { ...l, label: t("تقارير الكاشير والمبيعات") };
                        if (l.label === t("تقارير المخزون")) return { ...l, label: t("تقارير المخزون والمنيو") };
                        return l;
                    });
                }
            }

            if (section.featureKey === 'reports' && businessType !== 'RESTAURANTS') {
                section.links = section.links?.filter((l: any) => l.id !== 'reports-restaurant');
            }

            const visibleLinks = section.links?.filter((l: any) => hasPage(section.featureKey || '', l.id) && !l.hideFromSidebar) || [];
            if (!hasFeature(section.featureKey)) return null;
            if (!section.isStandalone && visibleLinks.length === 0) return null;

            // أقسام المطاعم تظهر فقط لنشاط RESTAURANTS
            const restaurantFeatures = ['tables', 'kitchen', 'delivery'];
            const posFeatures = ['pos', 'barcode'];
            const contractingFeatures = ['projects', 'subcontractors', 'site_management'];
            if (restaurantFeatures.includes(section.featureKey || '') && businessType !== 'RESTAURANTS') return null;
            if (posFeatures.includes(section.featureKey || '') && businessType !== 'RESTAURANTS' && businessType !== 'RETAIL') return null;
            if (section.featureKey === 'barcode' && businessType === 'RETAIL') return null;
            if (contractingFeatures.includes(section.featureKey || '') && businessType !== 'CONTRACTING') return null;
            if (section.featureKey === 'sales_reps' && businessType !== 'TRADING') return null;
            if (section.featureKey === 'services' && businessType !== 'SERVICES') return null;
            if (section.featureKey === 'loyalty' && businessType !== 'RETAIL') return null;


            const SectionIcon = section.icon;
            if (section.isStandalone && section.href) {
                const isActive = section.href === '/' ? pathname === '/' : pathname === section.href || pathname.startsWith(section.href + '/');
                return (
                    <div key={sectionOrigin.title} style={{ marginBottom: '4px', padding: '0 14px' }}>
                        <Link href={section.href} onClick={onLinkClick} style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: isCollapsed ? '0' : '12px', padding: isCollapsed ? '10px 0' : '10px 14px', width: '100%', color: isActive ? C.primary : C.textSecondary, textDecoration: 'none', fontWeight: isActive ? 700 : 500, fontSize: '14px', borderRadius: '12px', backgroundColor: isActive ? C.primaryBg : 'transparent', transition: 'all 0.2s', border: `1px solid ${isActive ? C.primaryBorder : 'transparent'}` }}>
                            <SectionIcon size={20} style={{ flexShrink: 0 }} />
                            {!isCollapsed && <span style={{ fontFamily: CAIRO }}>{t(section.title)}</span>}
                        </Link>
                    </div>
                );
            }

            const isOpen = openSections[sectionOrigin.title];
            const isActiveGroup = visibleLinks.some((l: any) => pathname === l.href);

            return (
                <div key={sectionOrigin.title} style={{ marginBottom: '6px', padding: '0 14px' }}>
                    <button onClick={() => {
                        if (isCollapsed && onToggle) {
                            onToggle();
                            setOpenSections(prev => ({ ...prev, [sectionOrigin.title]: true }));
                        } else {
                            setOpenSections(prev => ({ ...prev, [sectionOrigin.title]: !prev[sectionOrigin.title] }));
                        }
                    }} style={{ width: '100%', background: 'transparent', border: 'none', display: 'flex', justifyContent: isCollapsed ? 'center' : 'space-between', alignItems: 'center', padding: isCollapsed ? '10px 0' : '10px 14px', color: isActiveGroup ? C.primary : C.textSecondary, cursor: 'pointer', borderRadius: '12px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? '0' : '12px', fontWeight: isActiveGroup ? 700 : 600, fontFamily: CAIRO }}>
                            <SectionIcon size={20} style={{ flexShrink: 0 }} />
                            {!isCollapsed && <span style={{ fontFamily: CAIRO }}>{t(section.title)}</span>}
                        </div>
                        {!isCollapsed && <div style={{ opacity: 0.5 }}>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>}
                    </button>
                    {!isCollapsed && isOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginInlineEnd: '22px', paddingInlineEnd: '12px', marginTop: '6px', borderInlineEnd: `1px dashed ${C.border}` }}>
                            {visibleLinks.map((link: any) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link key={link.href} href={link.href} onClick={onLinkClick} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', color: isActive ? C.primary : C.textMuted, textDecoration: 'none', fontSize: '13px', fontWeight: isActive ? 700 : 500, borderRadius: '8px', backgroundColor: isActive ? C.primaryBg : 'transparent', fontFamily: CAIRO }}>
                                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isActive ? C.primary : C.border }} />
                                        <span>{t(link.label)}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        });
    }, [businessType, pathname, hasPage, hasFeature, openSections, onLinkClick, t, isCollapsed, onToggle]);

    const isSidebarEmpty = useMemo(() => sidebarItems.every(i => i === null), [sidebarItems]);

    if (!mounted || status === 'loading') {
        return (
            <aside className="sidebar" style={{ width: '100%', height: '100%', backgroundColor: C.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: C.primary, opacity: 0.5 }} />
            </aside>
        );
    }

    return (
        <aside className="sidebar" style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: C.card, color: C.textPrimary, display: 'flex', flexDirection: 'column', borderInlineEnd: `1px solid ${C.border}`, boxShadow: isRtl ? '-10px 0 30px var(--c-shadow)' : '10px 0 30px var(--c-shadow)', zIndex: 1001, overflow: 'hidden' }} dir={isRtl ? 'rtl' : 'ltr'}>
            
            <nav className="sidebar-nav" style={{ padding: '10px 0', flex: 1, overflowY: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as any }}>
                {isSidebarEmpty ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textSecondary, fontFamily: CAIRO }}>
                        <div style={{ marginBottom: '12px', opacity: 0.5 }}><Loader2 size={32} style={{ animation: 'spin 2s linear infinite' }} /></div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{t('جاري تحميل القائمة...')}</div>
                        <button onClick={() => window.location.reload()} style={{ marginTop: '16px', background: C.primary, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                            {t('إعادة تحميل الصفحه')}
                        </button>
                    </div>
                ) : sidebarItems}
            </nav>
            <style jsx>{` .sidebar-nav::-webkit-scrollbar { display: none; } `}</style>
        </aside>
    );
}
