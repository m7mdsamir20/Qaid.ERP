'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import TrialBanner from '@/components/TrialBanner';
import { THEME, C, CAIRO, OUTFIT } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { navSections } from '@/constants/navigation';
import { useMemo, useCallback } from 'react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status, update } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [noFY, setNoFY]       = useState(false);
    const [loadingFY, setLoadingFY] = useState(false);

    const syncAttempted = useRef(false);

    // تحديث الـ session تلقائيًا كل 5 دقائق لضمان مزامنة businessType والصلاحيات مع قاعدة البيانات
    useEffect(() => {
        if (status !== 'authenticated') return;
        
        // تحديث إجباري مرة واحدة عند فتح الموقع لمزامنة أي تغييرات حصلت من السوبر أدمن
        if (!syncAttempted.current) {
            syncAttempted.current = true;
            update();
        }

        const interval = setInterval(() => { update(); }, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [status, update]);

    useEffect(() => {
        if (status === 'loading' || !session) return;
        const user = session.user as any;
        if (!user?.companyId || user?.isSuperAdmin) return;
        if (pathname.includes('/settings') || pathname.includes('/super-admin') || pathname.includes('/financial-years')) return;

        // cache في الـ memory - يتفيتش مرة واحدة بس في الجلسة
        const cacheKey = `fy_open_${user.companyId}`;
        const cached = (window as any).__fyCache?.[cacheKey];
        if (cached !== undefined) {
            setNoFY(!cached);
            return;
        }

        setLoadingFY(true);
        fetch('/api/financial-years/check')
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d === null) return;
                const hasOpen = !!d.hasOpen;
                if (!(window as any).__fyCache) (window as any).__fyCache = {};
                (window as any).__fyCache[cacheKey] = hasOpen;
                setNoFY(!hasOpen);
            })
            .catch(() => { })
            .finally(() => setLoadingFY(false));
    }, [status, session, pathname]);

    const user = session?.user as any;
    const isSuperAdmin = !!user?.isSuperAdmin;
    const userRole = user?.role;
    const featuresRaw = user?.subscription?.features;
    const hasSubscription = !!user?.subscription;

    const enabledFeatures = useMemo(() => {
        if (status === 'loading') return {};
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
    }, [featuresRaw, status]);

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

    useEffect(() => {
        if (status !== 'authenticated' || !user) return;
        if (pathname === '/' || pathname.includes('/menu/') || pathname.includes('/barcode/')) return;

        let foundFeatureKey = '';
        let foundPageId = '';

        for (const section of navSections) {
            const link = section.links?.find(l => pathname === l.href || pathname.startsWith(l.href + '/'));
            if (link) {
                foundFeatureKey = section.featureKey;
                foundPageId = link.id;
                break;
            }
        }

        if (foundFeatureKey && foundPageId) {
            if (!hasPage(foundFeatureKey, foundPageId)) {
                router.replace('/');
            }
        }
    }, [pathname, status, user, hasPage, router]);

    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';

    const sub = (session?.user as any)?.subscription;
    const isExpired = sub ? (new Date(sub.endDate).getTime() < Date.now() || !sub.isActive) : false;
    const isLockoutActive = isExpired && !isSuperAdmin;
    const isAllowedTab = pathname === '/settings' && typeof window !== 'undefined' && window.location.search.includes('tab=subscription');

    if (status === 'loading') {
        return <DashboardSkeleton isRtl={isRtl} />;
    }

    return (
        <div className={`app-container ${isRtl ? 'rtl-mode' : 'ltr-mode'} ${showMobileMenu ? 'menu-open' : ''}`} style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>
            {/* Overlay for mobile menu */}
            {showMobileMenu && (
                <div
                    onClick={() => setShowMobileMenu(false)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)', zIndex: 940, animation: 'fadeIn 0.3s ease'
                    }}
                />
            )}

            <div className={`sidebar-wrapper ${showMobileMenu ? 'open' : ''}`} style={{
                opacity: isLockoutActive ? 0.6 : 1,
                pointerEvents: isLockoutActive ? 'none' : 'auto',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
                <Sidebar onLinkClick={() => setShowMobileMenu(false)} />
            </div>

            <div className="dashboard-content" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease'
            }}>
                <div className="print-hide">
                    <Header onMenuToggle={() => setShowMobileMenu(!showMobileMenu)} />
                </div>
                <main style={{ flex: 1, padding: '88px 24px 24px', position: 'relative' }}>
                    <TrialBanner />

                    <div style={{ position: 'relative' }}>
                        {/* Lockout Overlay Layer - Covers internal scrollable content only */}
                        {isLockoutActive && !isAllowedTab && (
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                zIndex: 900, background: 'transparent',
                                cursor: 'not-allowed'
                            }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} />
                        )}

                        <div style={{
                            opacity: (noFY && !pathname.includes('/financial-years')) || (isLockoutActive && !isAllowedTab) ? 0.4 : 1,
                            pointerEvents: (noFY && !pathname.includes('/financial-years')) || (isLockoutActive && !isAllowedTab) ? 'none' : 'auto',
                            transition: 'all 0.3s ease'
                        }}>
                            {children}
                        </div>
                    </div>
                </main>
            </div>

            <style jsx global>{`
                .app-container.ltr-mode { direction: ltr; }
                .app-container.rtl-mode { direction: rtl; }

                /* ── Desktop View (Laptop/PC) ── */
                @media (min-width: 1024px) {
                    .sidebar-wrapper { width: 260px; position: fixed; top: 0; bottom: 0; z-index: 950; }
                    .sidebar-wrapper > .sidebar {
                        position: relative !important;
                        inset: auto !important;
                        width: 100% !important;
                        height: 100% !important;
                    }
                    .ltr-mode .sidebar-wrapper { left: 0; border-right: 1px solid ${C.border}; }
                    .rtl-mode .sidebar-wrapper { right: 0; border-left: 1px solid ${C.border}; }

                    .ltr-mode .dashboard-content { margin-left: 260px; }
                    .rtl-mode .dashboard-content { margin-right: 260px; }
                    
                    .ltr-mode .main-header { left: 260px; right: 0; width: calc(100% - 260px); }
                    .rtl-mode .main-header { right: 260px; left: 0; width: calc(100% - 260px); }
                    
                    main { padding: 88px 24px 24px; }
                }

                /* ── Mobile/Tablet View (Drawer-based) ── */
                @media (max-width: 1023px) {
                    .main-header { left: 0 !important; right: 0 !important; width: 100% !important; padding: 0 16px !important; height: 60px !important; }
                    .mobile-menu-btn { display: flex !important; }
                    .branch-switcher-wrap { display: none !important; }
                    
                    .sidebar-wrapper {
                        position: fixed; top: 0; bottom: 0; 
                        width: min(300px, 85vw); 
                        z-index: 1001; 
                        background: ${C.card};
                        margin: 0 !important;
                        visibility: hidden;
                        pointer-events: none;
                        box-shadow: ${isRtl ? '-15px 0 45px rgba(0,0,0,0.6)' : '15px 0 45px rgba(0,0,0,0.6)'};
                        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    }
                    .sidebar-wrapper > .sidebar {
                        position: relative !important;
                        inset: auto !important;
                        width: 100% !important;
                        height: 100% !important;
                    }
                    .ltr-mode .sidebar-wrapper { left: 0; right: auto; transform: translateX(-102%); }
                    .rtl-mode .sidebar-wrapper { right: 0; left: auto; transform: translateX(102%); }
                    .sidebar-wrapper.open {
                        transform: translateX(0) !important;
                        visibility: visible !important;
                        pointer-events: auto !important;
                    }
                    
                    .dashboard-content { margin: 0 !important; width: 100% !important; }
                    main { padding: 76px 16px 20px !important; }

                    /* ─── Global Responsive Helpers ─── */
                    .mobile-column, .mobile-stack { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
                    .mobile-full { width: 100% !important; max-width: 100% !important; margin-left: 0 !important; margin-right: 0 !important; }
                    .mobile-hide { display: none !important; }
                    .mobile-p-sm { padding: 12px !important; }
                    .mobile-m-none { margin: 0 !important; }
                    
                    /* ─── Typography ─── */
                    .page-title { font-size: 16px !important; }
                    .page-subtitle { font-size: 11px !important; }

                    /* ─── Tables: always scroll horizontally on mobile ─── */
                    main table,
                    .table-container,
                    .scroll-table,
                    [class*="table-wrap"],
                    [class*="table-container"] {
                        display: block !important;
                        width: 100% !important;
                        overflow-x: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                        border-radius: 12px;
                    }
                    main table table { display: table !important; } /* reset nested tables */
                    .scroll-table table,
                    [class*="table-container"] > table,
                    main > div table { min-width: 620px; }

                    /* ─── Grids ─── */
                    .responsive-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                    .stats-grid, .kpi-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }

                    /* ─── Page Headers: stack title+actions vertically ─── */
                    .page-header-row {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 12px !important;
                    }
                    .page-header-actions {
                        width: 100% !important;
                        flex-wrap: wrap !important;
                        gap: 8px !important;
                    }
                    .page-header-actions > button,
                    .page-header-actions > a {
                        flex: 1 !important;
                        min-width: 120px !important;
                        justify-content: center !important;
                    }

                    /* ─── Filter bars: wrap pills/buttons ─── */
                    .filter-bar {
                        flex-wrap: wrap !important;
                        gap: 8px !important;
                    }
                    .filter-bar > button,
                    .filter-bar > input,
                    .filter-bar > select {
                        flex-shrink: 0 !important;
                    }

                    /* ─── Cards ─── */
                    .cards-row {
                        flex-direction: column !important;
                        gap: 12px !important;
                    }
                    .card-col {
                        width: 100% !important;
                        flex: none !important;
                    }

                    /* ─── Modals: near full-screen on mobile ─── */
                    [role="dialog"],
                    .app-modal-inner {
                        width: 96vw !important;
                        max-width: 96vw !important;
                        max-height: 88vh !important;
                        margin: 6vh auto !important;
                        overflow-y: auto !important;
                        border-radius: 16px !important;
                    }

                    /* ─── Delivery / POS order cards ─── */
                    .order-card-header {
                        flex-wrap: wrap !important;
                        gap: 8px !important;
                    }
                    .order-card-actions {
                        flex-wrap: wrap !important;
                        gap: 6px !important;
                    }
                    .order-card-actions > button {
                        flex: 1 !important;
                        min-width: 90px !important;
                        justify-content: center !important;
                    }

                    /* ─── Summary/totals rows ─── */
                    .summary-row {
                        flex-direction: column !important;
                        gap: 8px !important;
                    }

                    /* ─── Touch targets ─── */
                    button, input[type="text"], input[type="date"],
                    input[type="number"], input[type="email"],
                    input[type="password"], select {
                        min-height: 42px !important;
                    }
                    .action-btn { width: 36px !important; height: 36px !important; }
                }

                @media (max-width: 768px) {
                    .main-header { padding: 0 10px !important; height: 56px !important; }
                    .sidebar-wrapper { width: min(280px, 88vw) !important; }
                    .dashboard-content { width: 100% !important; }
                    main { padding: 70px 12px 16px !important; }

                    .mobile-column, .mobile-stack { gap: 10px !important; }
                    .mobile-full { width: 100% !important; max-width: 100% !important; }

                    /* All tables scroll on mobile — always */
                    main table {
                        display: block !important;
                        overflow-x: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                        white-space: nowrap;
                    }
                    main table thead, main table tbody,
                    main table tfoot, main table tr {
                        display: table-row-group;
                    }
                    main table table { display: table !important; white-space: normal; }

                    /* Better touch usability */
                    button, input, select, textarea { min-height: 44px !important; }
                    input[type="text"], input[type="date"],
                    input[type="number"], input[type="email"],
                    input[type="password"], select, textarea {
                        font-size: 16px !important; /* prevents iOS zoom */
                    }

                    /* KPI / stats cards */
                    .stats-grid, .kpi-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }

                    /* Sidebar search bar on header */
                    .header-search { display: none !important; }
                }

                @media (max-width: 640px) {
                    .stats-grid, .kpi-grid { grid-template-columns: 1fr !important; }
                    main { padding: 72px 10px 16px !important; }
                    
                    .item-entry-grid { grid-template-columns: 1fr 1fr !important; }
                    .item-entry-grid > div:first-child { grid-column: 1 / -1 !important; }
                    .item-entry-grid > button { grid-column: 1 / -1 !important; width: 100% !important; }

                    /* Stack filter buttons fully on very small screens */
                    .filter-bar > button {
                        flex: 1 1 calc(50% - 4px) !important;
                        text-align: center !important;
                    }

                    /* Page header actions: full width buttons */
                    .page-header-actions > button,
                    .page-header-actions > a {
                        width: 100% !important;
                        flex: 1 1 100% !important;
                    }
                }

                @keyframes fadeDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideRight {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
                body { margin: 0; background: ${C.bg}; overflow-x: hidden; }
                
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: ${C.primary}; }
                
                @media print {
                    .print-hide { display: none !important; }
                    .dashboard-content { margin: 0 !important; padding: 0 !important; width: 100% !important; display: block !important; }
                    main { padding: 0 !important; width: 100% !important; }
                    body, html { background: #fff !important; color: #000 !important; min-height: auto !important; }
                }
            `}</style>
        </div>
    );
}

function DashboardSkeleton({ isRtl }: { isRtl: boolean }) {
    return (
        <div className={`app-container ${isRtl ? 'rtl-mode' : 'ltr-mode'}`} style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>
            {/* Sidebar Skeleton */}
            <div className="sidebar-wrapper print-hide">
                <aside style={{ width: '100%', height: '100%', backgroundColor: C.card, display: 'flex', flexDirection: 'column' }}>
                    {/* Logo area */}
                    <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', borderBottom: `1px solid ${C.border}05` }}>
                        <div className="skeleton-pulse" style={{ width: '140px', height: '40px', borderRadius: '8px', background: 'rgba(128,128,128,0.1)' }} />
                    </div>
                    {/* Nav Items */}
                    <div style={{ padding: '20px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="skeleton-pulse" style={{ width: '100%', height: '40px', borderRadius: '12px', background: 'rgba(128,128,128,0.05)' }} />
                        ))}
                    </div>
                </aside>
            </div>

            {/* Main Content Area */}
            <div className="dashboard-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header Skeleton */}
                <header className="main-header print-hide" style={{ height: '80px', background: C.card, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 900 }}>
                    <div className="skeleton-pulse" style={{ width: '200px', height: '30px', borderRadius: '8px', background: 'rgba(128,128,128,0.08)' }} />
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div className="skeleton-pulse" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(128,128,128,0.08)' }} />
                        <div className="skeleton-pulse" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(128,128,128,0.08)' }} />
                        <div className="skeleton-pulse" style={{ width: '140px', height: '40px', borderRadius: '20px', background: 'rgba(128,128,128,0.08)' }} />
                    </div>
                </header>

                {/* Content Skeleton */}
                <main style={{ flex: 1, padding: '88px 24px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="skeleton-pulse" style={{ width: '30%', height: '40px', borderRadius: '12px', background: 'rgba(128,128,128,0.08)' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="skeleton-pulse" style={{ height: '140px', borderRadius: '24px', background: 'rgba(128,128,128,0.05)' }} />
                            ))}
                        </div>
                        <div className="skeleton-pulse" style={{ width: '100%', height: '400px', borderRadius: '24px', background: 'rgba(128,128,128,0.05)' }} />
                    </div>
                </main>
            </div>
            <style jsx global>{`
                @keyframes pulse-shimmer {
                    0% { opacity: 0.5; }
                    50% { opacity: 0.8; }
                    100% { opacity: 0.5; }
                }
                .skeleton-pulse {
                    animation: pulse-shimmer 2s infinite ease-in-out;
                }
                .ltr-mode .sidebar-wrapper { border-right: 1px solid ${C.border}; }
                .rtl-mode .sidebar-wrapper { border-left: 1px solid ${C.border}; }
            `}</style>
        </div>
    );
}

