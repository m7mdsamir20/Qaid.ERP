'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    LayoutDashboard
} from 'lucide-react';
import { useSession } from 'next-auth/react';

import { navSections } from '@/constants/navigation';
import { THEME, C, CAIRO, INTER } from '@/constants/theme';
import { Package, Layers, MapPin } from 'lucide-react';

const serviceLabels: Record<string, string> = {
    'المبيعات': 'إدارة الخدمات',
    'فواتير المبيعات': 'فواتير الخدمات',
    'مرتجع مبيعات': 'إلغاء خدمات / مرتجع',
    'العملاء': 'العملاء / المشتركين',
    'إدارة المخزون': 'كاتالوج الخدمات',
    'الأصناف': 'تعريف الخدمات',
    'المخازن': 'الفروع / نقاط الخدمة',
    'الوحدات': 'وحدات القياس',
};

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';
    const isSuperAdmin = !!(session?.user as any)?.isSuperAdmin;
    const userRole = (session?.user as any)?.role;

    // جيب الـ features من الـ session
    const featuresRaw = (session?.user as any)?.subscription?.features;
    const hasSubscription = !!(session?.user as any)?.subscription;

    const enabledFeatures: Record<string, string[]> = (() => {
        if (!featuresRaw) {
            // fallback: لو ما في features، اعرض كل الأقسام للـ admin
            const all: Record<string, string[]> = {};
            navSections.forEach((s: any) => { all[s.featureKey] = s.links.map((l: any) => l.id); });
            return all;
        }
        try {
            const parsed = JSON.parse(featuresRaw);
            if (Array.isArray(parsed)) {
                const obj: Record<string, string[]> = {};
                parsed.forEach((key: string) => {
                    const section = navSections.find(s => s.featureKey === key);
                    if (section) obj[key] = section.links.map(l => l.id);
                });
                return obj;
            }
            return parsed || {};
        }
        catch { return {}; }
    })();


    // دالة التحقق من الصفحات الفردية
    const hasPage = (featureKey: string, pageId: string): boolean => {
        // السوبر أدمن يرى كل شيء
        if (isSuperAdmin) return true;

        // الداش بورد والإعدادات متاحة دائماً
        if (featureKey === 'dashboard' || pageId === '/') return true;

        const userPerms = (session?.user as any)?.permissions || {};
        const hasGranularPerms = Object.keys(userPerms).length > 0;

        // الـ admin: يتحقق من الـ subscription features فقط (مش الـ granular permissions)
        if (userRole === 'admin') {
            if (featureKey === 'settings') return true;
            if (hasSubscription && Object.keys(enabledFeatures).length > 0) {
                if (!(featureKey in enabledFeatures)) return false;
                const pagesInSub = enabledFeatures[featureKey];
                return pagesInSub.includes(pageId);
            }
            return true;
        }

        // باقي المستخدمين: تحقق من الـ subscription أولاً
        if (featureKey === 'settings') {
            return !hasGranularPerms;
        }

        if (hasSubscription && Object.keys(enabledFeatures).length > 0) {
            if (!(featureKey in enabledFeatures)) return false;
            const pagesInSub = enabledFeatures[featureKey];
            if (!pagesInSub.includes(pageId)) return false;
        }

        // تحقق من الـ granular permissions
        if (hasGranularPerms) {
            return !!userPerms[pageId]?.view;
        }

        return true;
    };

    // دالة للتحقق من القسم كله
    const hasFeature = (featureKey?: string): boolean => {
        if (isSuperAdmin) return true;
        if (!featureKey) return true;
        if (featureKey === 'dashboard' || featureKey === 'settings') return true;

        const section = navSections.find(s => s.featureKey === featureKey);
        if (section) {
            return section.links.some(l => hasPage(featureKey, l.id));
        }
        return true;
    };

    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
        const initialState: Record<string, boolean> = { 'الرئيسية': true };
        navSections.forEach((section: any) => {
            if (section.links.some((link: any) => link.href === pathname)) {
                initialState[section.title] = true;
            }
        });
        return initialState;
    });

    const toggleSection = (title: string) => {
        setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
    };

    const BRAND_NAME = 'قيد المطور';
    const BRAND_LOGO = '/logo-system.png'; // لوجو القائمة الجانبية الموحد (قيد المطور)

    return (
        <aside className="sidebar" style={{
            width: '260px',
            position: 'fixed',
            right: 0, top: 0, bottom: 0,
            backgroundColor: C.card,
            color: C.textPrimary,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: `1px solid ${C.border}`,
            boxShadow: '10px 0 30px rgba(0,0,0,0.2)',
            zIndex: 1001,
            overflow: 'hidden'
        }}>
            <Link href="/"
                className="brand-logo-container"
                style={{
                    height: '85px', padding: '0 5px',
                    background: 'transparent',
                    display: 'flex', alignItems: 'center', gap: '0',
                    textDecoration: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden',
                    borderBottom: `1px solid rgba(255,255,255,0.02)`
                }}>
                {BRAND_LOGO ? (
                    <img src={BRAND_LOGO} alt={BRAND_NAME} style={{ display: 'block', margin: '0 auto', width: '100%', maxWidth: '230px', maxHeight: '55px', objectFit: 'contain' }} />
                ) : (
                    <>
                        <div style={{
                            width: '42px', height: '42px', borderRadius: '12px',
                            background: `linear-gradient(135deg, ${C.primary}, ${C.blue})`,
                            color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px', fontWeight: 900, fontFamily: CAIRO,
                            boxShadow: `0 8px 16px -4px ${C.primary}60`,
                            flexShrink: 0
                        }}>
                            {BRAND_NAME.charAt(0)}
                        </div>
                        <div style={{ lineHeight: 1.1 }}>
                            <div style={{ fontSize: '20px', fontWeight: 900, color: C.textPrimary, letterSpacing: '0.4px', fontFamily: CAIRO }}>{BRAND_NAME}</div>
                            <div style={{ fontSize: '10px', color: C.textMuted, letterSpacing: '1px', direction: 'ltr', opacity: 0.7, fontWeight: 700, marginTop: '2px' }}>ERP ECOSYSTEM</div>
                        </div>
                    </>
                )}
            </Link>

            <nav className="sidebar-nav" style={{ padding: '20px 0', flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
                {navSections.map((sectionOrigin: any) => {
                    const businessType = ((session?.user as any)?.businessType || 'TRADING').toUpperCase();
                    let section = { ...sectionOrigin };

                    // ✅ تعديلات خاصة بنشاط الخدمات (SERVICES)
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
                                { id: '/warehouses', href: '/warehouses', label: 'الفروع / مواقع العمل' },
                            ];
                        }
                        if (section.featureKey === 'reports') {
                            section.links = section.links?.map((l: any) => {
                                if (l.label === 'المبيعات والمشتريات') return { ...l, label: 'الخدمات والمشتريات' };
                                if (l.label === 'تقارير المخزون') return { ...l, label: 'تقارير الخدمات' };
                                return l;
                            });
                        }
                    }

                    // تحقق إن في link واحد على الأقل متاح (granular permissions)
                    const visibleLinks = section.links?.filter((l: any) =>
                        hasPage(section.featureKey || '', l.id)
                    ) || [];

                    if (!hasFeature(section.featureKey)) return null;
                    if (!section.isStandalone && visibleLinks.length === 0) return null;
                    const SectionIcon = section.icon;

                    if (section.isStandalone && section.href) {
                        const isActive = section.href === '/' ? pathname === '/' : pathname === section.href || pathname.startsWith(section.href + '/');
                        return (
                            <div key={section.title} style={{ marginBottom: '4px', padding: '0 14px' }}>
                                <Link
                                    href={section.href}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                                        color: isActive ? C.primary : C.textSecondary, textDecoration: 'none',
                                        fontWeight: isActive ? 700 : 500, fontSize: '14px', borderRadius: '12px',
                                        backgroundColor: isActive ? C.primaryBg : 'transparent',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        border: `1px solid ${isActive ? C.primaryBorder : 'transparent'}`
                                    }}
                                    onMouseOver={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = C.textPrimary; } }}
                                    onMouseOut={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = C.textSecondary; } }}
                                >
                                    <SectionIcon size={18} />
                                    <span style={{ fontFamily: CAIRO }}>{section.title}</span>
                                    {isActive && <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: C.primary, boxShadow: `0 0 8px ${C.primary}` }} />}
                                </Link>
                            </div>
                        );
                    }

                    const isOpen = openSections[section.title];
                    const isActiveGroup = visibleLinks.some((l: any) => pathname === l.href);

                    return (
                        <div key={section.title} style={{ marginBottom: '6px', padding: '0 14px' }}>
                            <button
                                onClick={() => toggleSection(section.title)}
                                style={{
                                    width: '100%', background: isActiveGroup && !isOpen ? C.primaryBg : 'transparent',
                                    border: `1px solid ${isActiveGroup && !isOpen ? C.primaryBorder : 'transparent'}`,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 14px', color: isActiveGroup ? C.primary : C.textSecondary,
                                    cursor: 'pointer', borderRadius: '12px', transition: 'all 0.2s',
                                    fontSize: '14px'
                                }}
                                onMouseOver={(e) => { if (!isActiveGroup || isOpen) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = C.textPrimary; } }}
                                onMouseOut={(e) => { if (!isActiveGroup || isOpen) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = C.textSecondary; } }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: isActiveGroup ? 700 : 600, fontFamily: CAIRO }}>
                                    <SectionIcon size={18} />
                                    {section.title}
                                </div>
                                <div style={{ opacity: 0.5 }}>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
                            </button>

                            {isOpen && (
                                <div style={{
                                    display: 'flex', flexDirection: 'column', gap: '2px',
                                    marginRight: '22px', paddingRight: '12px', marginTop: '6px',
                                    borderRight: `1px dashed ${C.border}`
                                }}>
                                    {visibleLinks.map((link: any) => {
                                        const isActive = pathname === link.href;
                                        return (
                                            <Link
                                                key={link.href} href={link.href}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                                                    color: isActive ? C.primary : C.textMuted, textDecoration: 'none',
                                                    fontSize: '13px', fontWeight: isActive ? 700 : 500, borderRadius: '8px',
                                                    backgroundColor: isActive ? C.primaryBg : 'transparent',
                                                    transition: 'all 0.15s', fontFamily: CAIRO
                                                }}
                                                onMouseOver={(e) => { if (!isActive) { e.currentTarget.style.color = C.textPrimary; e.currentTarget.style.paddingRight = '16px'; } }}
                                                onMouseOut={(e) => { if (!isActive) { e.currentTarget.style.color = C.textMuted; e.currentTarget.style.paddingRight = '12px'; } }}
                                            >
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isActive ? C.primary : 'rgba(255,255,255,0.1)' }} />
                                                <span>{link.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <style jsx>{`
                .sidebar-nav::-webkit-scrollbar { display: none; }
                .brand-logo-container:hover {
                    transform: scale(1.02);
                    filter: brightness(1.1);
                }
            `}</style>
        </aside>
    );
}
