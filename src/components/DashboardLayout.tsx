'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import TrialBanner from '@/components/TrialBanner';
import { THEME, C, CAIRO, INTER } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [noFY, setNoFY] = useState(false);
    const [loadingFY, setLoadingFY] = useState(false);

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

    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';

    const sub = (session?.user as any)?.subscription;
    const isSuperAdmin = !!(session?.user as any)?.isSuperAdmin;
    const isExpired = sub ? (new Date(sub.endDate).getTime() < Date.now() || !sub.isActive) : false;
    const isLockoutActive = isExpired && !isSuperAdmin;
    const isAllowedTab = pathname === '/settings' && typeof window !== 'undefined' && window.location.search.includes('tab=subscription');

    if (status === 'loading') {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
            </div>
        );
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
                        box-shadow: ${isRtl ? '-15px 0 45px rgba(0,0,0,0.6)' : '15px 0 45px rgba(0,0,0,0.6)'};
                        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    }
                    .ltr-mode .sidebar-wrapper { left: 0; right: auto; transform: translateX(-102%); }
                    .rtl-mode .sidebar-wrapper { right: 0; left: auto; transform: translateX(102%); }
                    .sidebar-wrapper.open { transform: translateX(0) !important; }
                    
                    .dashboard-content { margin: 0 !important; width: 100% !important; }
                    main { padding: 76px 16px 20px !important; }

                    /* Global Responsive Helpers */
                    .mobile-column, .mobile-stack { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
                    .mobile-full { width: 100% !important; max-width: 100% !important; margin-left: 0 !important; margin-right: 0 !important; }
                    .mobile-hide { display: none !important; }
                    .mobile-p-sm { padding: 12px !important; }
                    .mobile-m-none { margin: 0 !important; }
                    
                    /* Typography scaling */
                    .page-title { font-size: 16px !important; }
                    .page-subtitle { font-size: 11px !important; }

                    /* Grids & Tables */
                    .responsive-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                    .stats-grid, .kpi-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
                    
                    .scroll-table {
                        width: 100% !important;
                        overflow-x: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                        border-radius: 12px;
                        margin-bottom: 5px;
                    }
                    .scroll-table table { min-width: 750px !important; }

                    /* Improved touch targets */
                    button, input, select { min-height: 42px !important; font-size: 14px !important; }
                    .action-btn { width: 36px !important; height: 36px !important; }

                    /* Modals */
                    [role="dialog"] { width: 92vw !important; max-width: 92vw !important; margin: 10vh auto !important; }
                }

                @media (max-width: 768px) {
                    .main-header { padding: 0 10px !important; height: 56px !important; }
                    .sidebar-wrapper { width: min(280px, 88vw) !important; }
                    .dashboard-content { width: 100% !important; }
                    main { padding: 70px 12px 16px !important; }

                    .mobile-column, .mobile-stack { gap: 10px !important; }
                    .mobile-full { width: 100% !important; max-width: 100% !important; }

                    /* Safe global mobile table behavior */
                    .table-container,
                    .scroll-table,
                    .print-table-container,
                    [class*="table-container"] {
                        overflow-x: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                    }

                    main :is(div, section, article):has(> table) {
                        overflow-x: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                    }

                    main :is(div, section, article):has(> table) > table,
                    .table-container > table,
                    .scroll-table > table,
                    .print-table-container > table,
                    [class*="table-container"] > table,
                    main table {
                        width: max-content !important;
                        min-width: 100% !important;
                    }

                    /* Better touch usability */
                    button, input, select, textarea { min-height: 44px !important; }
                    input, select, textarea { font-size: 16px !important; }
                }

                @media (max-width: 640px) {
                    .stats-grid, .kpi-grid { grid-template-columns: 1fr !important; }
                    main { padding: 72px 12px 16px !important; }
                    
                    .item-entry-grid { grid-template-columns: 1fr 1fr !important; }
                    .item-entry-grid > div:first-child { grid-column: 1 / -1 !important; }
                    .item-entry-grid > button { grid-column: 1 / -1 !important; width: 100% !important; }
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
