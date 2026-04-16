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

                /* Desktop sidebar logic */
                @media (min-width: 1024px) {
                    .sidebar-wrapper { width: 260px; position: fixed; top: 0; bottom: 0; z-index: 950; }
                    .ltr-mode .sidebar-wrapper { left: 0; border-right: 1px solid ${C.border}; }
                    .rtl-mode .sidebar-wrapper { right: 0; border-left: 1px solid ${C.border}; }

                    .ltr-mode .dashboard-content { margin-left: 260px; }
                    .rtl-mode .dashboard-content { margin-right: 260px; }
                    
                    .ltr-mode .main-header { left: 260px; right: 0; }
                    .rtl-mode .main-header { right: 260px; left: 0; }
                }

                /* Mobile sidebar logic */
                @media (max-width: 1023px) {
                    .main-header { left: 0 !important; right: 0 !important; width: 100% !important; padding: 0 16px !important; }
                    .mobile-menu-btn { display: flex !important; }
                    .branch-switcher-wrap { display: none !important; }
                    .sidebar-wrapper {
                        position: fixed; top: 0; bottom: 0; 
                        width: min(300px, 85vw); 
                        z-index: 2000;
                        background: ${C.card};
                        margin: 0 !important;
                        box-shadow: ${isRtl ? '-10px 0 30px rgba(0,0,0,0.5)' : '10px 0 30px rgba(0,0,0,0.5)'};
                        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    }
                    .ltr-mode .sidebar-wrapper { left: 0; right: auto; transform: translateX(-100%); }
                    .rtl-mode .sidebar-wrapper { right: 0; left: auto; transform: translateX(100%); }
                    .sidebar-wrapper.open { transform: translateX(0) !important; }
                    .dashboard-content { margin: 0 !important; width: 100% !important; }
                    
                    /* Utility classes for mobile browser experience */
                    main { padding: 76px 12px 20px !important; }
                    .stats-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
                }
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                * { box-sizing: border-box; }
                body { margin: 0; background: ${C.bg}; }
                
                /* Custom scrollbar for premium feel */
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: ${C.primary}; }
                
                @media print {
                    @page { margin: 8mm 10mm; }

                    .print-hide { display: none !important; }

                    .dashboard-content {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        flex: 1 !important;
                        display: block !important;
                    }

                    div[style*="maxWidth: '1600px'"],
                    div[style*="max-width: 1600px"] {
                        max-width: 100% !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    main {
                        padding: 0 !important;
                        width: 100% !important;
                    }

                    body, html, div[style*="minHeight: '100vh'"] {
                        background: #fff !important;
                        color: #000 !important;
                        min-height: auto !important;
                        height: auto !important;
                    }

                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-shadow: none !important;
                    }

                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 11px !important;
                    }

                    th {
                        background: #f1f5f9 !important;
                        color: #000 !important;
                        border: 1px solid #e2e8f0 !important;
                        padding: 8px 10px !important;
                        font-weight: 800 !important;
                    }

                    td {
                        border: 1px solid #e2e8f0 !important;
                        padding: 6px 10px !important;
                        color: #000 !important;
                        background: #fff !important;
                    }

                    thead tr { border-bottom: 1px solid #e2e8f0 !important; }

                    tfoot td {
                        background: #f1f5f9 !important;
                        font-weight: bold !important;
                    }

                    tr { page-break-inside: avoid !important; }
                }

                /* Mobile Utility Classes */
                @media (max-width: 1023px) {
                    .mobile-column { flex-direction: column !important; align-items: stretch !important; gap: 15px !important; }
                    .mobile-full { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
                    .mobile-hide { display: none !important; }
                    .mobile-order-last { order: 99 !important; }
                    .mobile-order-first { order: -1 !important; }
                    .mobile-gap-sm { gap: 8px !important; }

                    /* Reduce main padding on mobile */
                    main { padding: 76px 12px 20px !important; }

                    /* Cards/grids stack on mobile */
                    .stats-grid, .kpi-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }

                    /* Global Responsive Table Container */
                    .scroll-table {
                        width: 100% !important;
                        overflow-x: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                        padding-bottom: 5px !important;
                    }

                    .scroll-table table {
                        min-width: 600px !important; /* Forces scroll if table is too narrow */
                    }

                    /* Utility for 1-column layout on mobile */
                    .responsive-grid {
                        grid-template-columns: 1fr !important;
                    }

                    /* Modal full width on mobile */
                    [role="dialog"], .modal-content {
                        width: 95vw !important;
                        max-width: 95vw !important;
                        margin: 16px auto !important;
                        padding: 20px 16px !important;
                    }

                    /* Prevent page-level horizontal scroll without breaking inner scroll containers */
                    .dashboard-content { max-width: 100vw; }
                }

                @media (max-width: 640px) {
                    .item-entry-grid {
                        grid-template-columns: 1fr 1fr auto !important;
                    }
                    .item-entry-grid > div:first-child {
                        grid-column: 1 / -1 !important;
                    }
                    /* Tappable targets for inputs/buttons on mobile */
                    input, select, textarea, button:not(.mobile-menu-btn) {
                        min-height: 44px !important;
                    }
                }

                @media (max-width: 480px) {
                    main { padding: 72px 10px 16px !important; }
                    .stats-grid, .kpi-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
}
