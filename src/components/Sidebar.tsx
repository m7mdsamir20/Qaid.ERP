'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { navSections } from '@/constants/navigation';
import { C, CAIRO } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { useTheme } from '@/components/Providers';

export default function Sidebar({ onLinkClick }: { onLinkClick?: () => void }) {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const { theme } = useTheme();

    const user = session?.user as any;
    const businessType = user?.businessType?.toUpperCase() || 'TRADING';
    const isSuperAdmin = !!user?.isSuperAdmin;
    const userRole = user?.role;
    const featuresRaw = user?.subscription?.features;
    const hasSubscription = !!user?.subscription;

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
            if (isSuperAdmin) return true;
            if (!featureKey || featureKey === 'dashboard' || pageId === '/') return true;

            const userPerms = user?.permissions || {};
            const hasGranularPerms = Object.keys(userPerms).length > 0;

            if (userRole === 'admin') {
                if (featureKey === 'settings') return true;
                if (hasSubscription && Object.keys(enabledFeatures).length > 0) {
                    return (enabledFeatures[featureKey] || []).includes(pageId);
                }
                return true;
            }
            if (featureKey === 'settings') {
                // Non-admin: only show settings if they have explicit settings permissions
                if (hasGranularPerms) {
                    return !!userPerms[pageId]?.view;
                }
                return false; // No permissions defined = no settings access for non-admin
            }
            if (hasSubscription && Object.keys(enabledFeatures).length > 0) {
                if (!(featureKey in enabledFeatures)) return false;
                if (!(enabledFeatures[featureKey] || []).includes(pageId)) return false;
            }
            if (hasGranularPerms) return !!userPerms[pageId]?.view;
            return true;
        } catch { return true; }
    }, [isSuperAdmin, userRole, hasSubscription, enabledFeatures, user]);

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
        const initialState: Record<string, boolean> = { 'الرئيسية': true };
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
                if (section.featureKey === 'sales') {
                    section.title = 'فواتير الخدمات';
                    section.links = section.links?.map((l: any) => {
                        if (l.label === 'فواتير المبيعات') return { ...l, label: 'فواتير الخدمات' };
                        if (l.label === 'مرتجع مبيعات') return { ...l, label: 'إلغاء خدمات / مرتجع' };
                        return l;
                    });
                }
                if (section.featureKey === 'inventory') {
                    section.title = 'الخدمات';
                    section.links = section.links?.map((l: any) => {
                        if (l.id === '/categories') return { ...l, label: 'تصنيفات الخدمات' };
                        if (l.id === '/items') return { ...l, label: 'قائمة الخدمات' };
                        if (l.id === '/warehouses') return { ...l, label: 'الفروع / مواقع العمل' };
                        return l;
                    });
                }
                if (section.featureKey === 'installments') {
                    return null;
                }
            }

            const visibleLinks = section.links?.filter((l: any) => hasPage(section.featureKey || '', l.id)) || [];
            if (!hasFeature(section.featureKey)) return null;
            if (!section.isStandalone && visibleLinks.length === 0) return null;

            const SectionIcon = section.icon;
            if (section.isStandalone && section.href) {
                const isActive = section.href === '/' ? pathname === '/' : pathname === section.href || pathname.startsWith(section.href + '/');
                return (
                    <div key={sectionOrigin.title} style={{ marginBottom: '4px', padding: '0 14px' }}>
                        <Link href={section.href} onClick={onLinkClick} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', color: isActive ? C.primary : C.textSecondary, textDecoration: 'none', fontWeight: isActive ? 700 : 500, fontSize: '14px', borderRadius: '12px', backgroundColor: isActive ? C.primaryBg : 'transparent', transition: 'all 0.2s', border: `1px solid ${isActive ? C.primaryBorder : 'transparent'}` }}>
                            <SectionIcon size={18} />
                            <span style={{ fontFamily: CAIRO }}>{t(section.title)}</span>
                        </Link>
                    </div>
                );
            }

            const isOpen = openSections[sectionOrigin.title];
            const isActiveGroup = visibleLinks.some((l: any) => pathname === l.href);

            return (
                <div key={sectionOrigin.title} style={{ marginBottom: '6px', padding: '0 14px' }}>
                    <button onClick={() => setOpenSections(prev => ({ ...prev, [sectionOrigin.title]: !prev[sectionOrigin.title] }))} style={{ width: '100%', background: 'transparent', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', color: isActiveGroup ? C.primary : C.textSecondary, cursor: 'pointer', borderRadius: '12px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: isActiveGroup ? 700 : 600, fontFamily: CAIRO }}>
                            <SectionIcon size={18} /> {t(section.title)}
                        </div>
                        <div style={{ opacity: 0.5 }}>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
                    </button>
                    {isOpen && (
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
    }, [businessType, pathname, hasPage, hasFeature, openSections, onLinkClick, t]);

    const isSidebarEmpty = useMemo(() => sidebarItems.every(i => i === null), [sidebarItems]);

    if (!mounted) {
        return (
            <aside className="sidebar" style={{ width: '100%', height: '100%', backgroundColor: C.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: C.primary, opacity: 0.5 }} />
            </aside>
        );
    }

    return (
        <aside className="sidebar" style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: C.card, color: C.textPrimary, display: 'flex', flexDirection: 'column', borderInlineEnd: `1px solid ${C.border}`, boxShadow: isRtl ? '-10px 0 30px var(--c-shadow)' : '10px 0 30px var(--c-shadow)', zIndex: 1001, overflow: 'hidden' }} dir={isRtl ? 'rtl' : 'ltr'}>
            <Link href="/" style={{
                height: '100px',
                minHeight: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 20px',
                borderBottom: `1px solid ${C.border}05`
            }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '200px', height: '60px' }}>
                    <img src="/logo-system.png" alt="Logo" style={{ position: 'absolute', inset: 0, margin: 'auto', width: '100%', height: '100%', objectFit: 'contain', opacity: theme === 'light' ? 0 : 1, transition: 'opacity 0.3s' }} />
                    <img src="/logo-light.png" alt="Logo Light" style={{ position: 'absolute', inset: 0, margin: 'auto', width: '100%', height: '100%', objectFit: 'contain', opacity: theme === 'light' ? 1 : 0, transition: 'opacity 0.3s' }} />
                </div>
            </Link>

            <nav className="sidebar-nav" style={{ padding: '20px 0', flex: 1, overflowY: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as any }}>
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
