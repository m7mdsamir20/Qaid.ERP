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
        <div className={`app-container ${isRtl ? 'rtl-mode' : 'ltr-mode'}`} style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>
            <div className="print-hide" style={{ opacity: isLockoutActive ? 0.6 : 1, pointerEvents: isLockoutActive ? 'none' : 'auto' }}>
                <Sidebar />
            </div>
            <div className="dashboard-content" style={{
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                marginInlineStart: '260px',
                width: 'calc(100% - 260px)',
                paddingTop: '64px',
                transition: 'all 0.3s ease'
            }}>
                <div className="print-hide">
                    <Header />
                </div>
                <main style={{ flex: 1, padding: '24px 24px 24px', position: 'relative' }}>
                    <div style={{ width: '100%', maxWidth: '1600px', margin: '0 auto' }}>
                        {/* Lockout Overlay Layer - Covers internal scrollable content only */}
                        {isLockoutActive && !isAllowedTab && (
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                zIndex: 900, background: 'rgba(255,255,255, 0.02)',
                                cursor: 'not-allowed'
                            }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} />
                        )}

                        {noFY && !loadingFY && !pathname.includes('/financial-years') && (
                            <div style={{
                                background: C.warningBg, border: `1px solid ${C.warningBorder}`, color: C.warning,
                                padding: '16px 20px', borderRadius: '14px', marginBottom: '24px', fontFamily: CAIRO,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <AlertTriangle size={24} />
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: '15px', marginBottom: '4px' }}>السنة المالية مغلقة!</div>
                                        <div style={{ fontSize: '13px', opacity: 0.9 }}>يجب الاستمرار بفتح سنة مالية جديدة للتمكن من إضافة فواتير وحركات.</div>
                                    </div>
                                </div>
                                <button onClick={() => router.push('/financial-years')}
                                    style={{
                                        padding: '10px 16px', borderRadius: '10px', border: 'none',
                                        background: C.warning, color: '#fff', fontSize: '13px', fontWeight: 800,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                        fontFamily: CAIRO
                                    }}>
                                    <Calendar size={16} /> فتح سنة مالية
                                </button>
                            </div>
                        )}
                        <TrialBanner />
                        
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

                .ltr-mode .sidebar { left: 0 !important; right: auto !important; }
                .rtl-mode .sidebar { right: 0 !important; left: auto !important; }

                .ltr-mode .dashboard-content { margin-left: 260px !important; margin-right: 0 !important; }
                .rtl-mode .dashboard-content { margin-right: 260px !important; margin-left: 0 !important; }

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
            `}</style>
        </div>
    );
}
