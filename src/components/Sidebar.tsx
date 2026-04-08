'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useMemo, useCallback } from 'react';
import {
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

import { navSections } from '@/constants/navigation';
import { C, CAIRO } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    
    const user = session?.user as any;
    const businessType = user?.businessType?.toUpperCase() || 'TRADING';
    const isSuperAdmin = !!user?.isSuperAdmin;
    const userRole = user?.role;
    const featuresRaw = user?.subscription?.features;
    const hasSubscription = !!user?.subscription;

    // 1. حساب الـ features المتاحة
    const enabledFeatures = useMemo(() => {
        try {
            if (!featuresRaw) {
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
    }, [featuresRaw]);

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
            if (featureKey === 'settings') return !hasGranularPerms;
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
            if (!featureKey || featureKey === 'dashboard' || featureKey === 'settings') return true;
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
        } catch {}
        return initialState;
    });

    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';

    const BRAND_LOGO = '/logo-system.png';

    return (
        <aside className="sidebar" style={{ width: '260px', position: 'fixed', insetInlineStart: 0, top: 0, bottom: 0, backgroundColor: C.card, color: C.textPrimary, display: 'flex', flexDirection: 'column', borderInlineEnd: `1px solid ${C.border}`, boxShadow: isRtl ? '-10px 0 30px rgba(0,0,0,0.2)' : '10px 0 30px rgba(0,0,0,0.2)', zIndex: 1001, overflow: 'hidden' }} dir={isRtl ? 'rtl' : 'ltr'}>
            <Link href="/" style={{ height: '85px', display: 'flex', alignItems: 'center', borderBottom: `1px solid rgba(255,255,255,0.02)` }}>
                <img src={BRAND_LOGO} alt="Logo" style={{ display: 'block', margin: '0 auto', width: '100%', maxWidth: '230px', maxHeight: '55px', objectFit: 'contain' }} />
            </Link>

            <nav className="sidebar-nav" style={{ padding: '20px 0', flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
                {navSections.map((sectionOrigin: any) => {
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
                            section.links = [
                                { id: '/categories', href: '/categories', label: 'تصنيفات الخدمات' },
                                { id: '/items', href: '/items', label: 'قائمة الخدمات' },
                                { id: '/units', href: '/units', label: 'الوحدات' },
                                { id: '/warehouses', href: '/warehouses', label: 'الفروع / مواقع العمل' },
                            ];
                        }
                    }

                    const visibleLinks = section.links?.filter((l: any) => hasPage(section.featureKey || '', l.id)) || [];
                    if (!hasFeature(section.featureKey)) return null;
                    if (!section.isStandalone && visibleLinks.length === 0) return null;

                    const SectionIcon = section.icon;
                    if (section.isStandalone && section.href) {
                        const isActive = section.href === '/' ? pathname === '/' : pathname === section.href || pathname.startsWith(section.href + '/');
                        return (
                            <div key={section.title} style={{ marginBottom: '4px', padding: '0 14px' }}>
                                <Link href={section.href} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', color: isActive ? C.primary : C.textSecondary, textDecoration: 'none', fontWeight: isActive ? 700 : 500, fontSize: '14px', borderRadius: '12px', backgroundColor: isActive ? C.primaryBg : 'transparent', transition: 'all 0.2s', border: `1px solid ${isActive ? C.primaryBorder : 'transparent'}` }}>
                                    <SectionIcon size={18} />
                                    <span style={{ fontFamily: CAIRO }}>{t(section.title)}</span>
                                </Link>
                            </div>
                        );
                    }

                    const isOpen = openSections[section.title];
                    const isActiveGroup = visibleLinks.some((l: any) => pathname === l.href);

                    return (
                        <div key={section.title} style={{ marginBottom: '6px', padding: '0 14px' }}>
                            <button onClick={() => setOpenSections(prev => ({ ...prev, [section.title]: !prev[section.title] }))} style={{ width: '100%', background: 'transparent', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', color: isActiveGroup ? C.primary : C.textSecondary, cursor: 'pointer', borderRadius: '12px', fontSize: '14px' }}>
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
                                            <Link key={link.href} href={link.href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', color: isActive ? C.primary : C.textMuted, textDecoration: 'none', fontSize: '13px', fontWeight: isActive ? 700 : 500, borderRadius: '8px', backgroundColor: isActive ? C.primaryBg : 'transparent', fontFamily: CAIRO }}>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isActive ? C.primary : 'rgba(255,255,255,0.1)' }} />
                                                <span>{t(link.label)}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>
            <style jsx>{` .sidebar-nav::-webkit-scrollbar { display: none; } `}</style>
        </aside>
    );
}
