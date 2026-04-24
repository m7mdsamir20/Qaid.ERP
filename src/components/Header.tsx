'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Search, Bell, ChevronDown, User, Settings, KeyRound, LogOut, FileText, Package, Users, Receipt, Loader2, Globe, AlertTriangle, GitBranch, Menu, Sun, Moon, X } from 'lucide-react';
import { C, CAIRO } from '@/constants/theme';
import { Avatar } from '@/components/UserAvatar';

/* ══════════════════════════════════════════
   TYPES & MOCK DATA
   ══════════════════════════════════════════ */
interface SearchResult {
    type: 'invoice' | 'product' | 'customer' | 'supplier';
    id: string;
    label: string;
    sub: string;
    href: string;
}

// Search logic is handled via /api/search API for real-time results

const typeIcon: Record<string, any> = {
    invoice: Receipt, product: Package, customer: Users, supplier: FileText
};

import { useTranslation } from '@/lib/i18n';
import { useTheme } from '@/components/Providers';

const getRoleLabel = (role: string, t: any) => {
    const roles: Record<string, string> = {
        admin: 'مدير النظام',
        manager: 'مدير فرع',
        accountant: 'محاسب',
        sales: 'مندوب مبيعات',
        procurement: 'مسؤول مشتريات',
        storekeeper: 'أمين مستودع',
        hr: 'موارد بشرية',
        cashier: 'كاشير',
        custom: 'مستخدم'
    };
    return t(roles[role] || 'مستخدم');
};

/* ══════════════════════════════════════════
   COMPONENTS
   ══════════════════════════════════════════ */

function SearchBox() {
    const { t } = useTranslation();
    const { data: session } = useSession();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const boxRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    useEffect(() => {
        if (!query.trim()) { setResults([]); setOpen(false); return; }
        setLoading(true);
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setResults(data);
                    setOpen(true);
                }
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setLoading(false);
            }
        }, 400);
        return () => clearTimeout(t);
    }, [query]);

    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';

    return (
        <div ref={boxRef} className="search-box-container" style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: C.inputBg, border: `1px solid ${C.border}`,
                borderRadius: '12px', padding: '0 12px', transition: 'all 0.2s',
                height: '38px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
            }}>
                {loading
                    ? <Loader2 size={16} color={C.textMuted} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Search size={16} color={C.primary} />
                }
                <input
                    id="global-search"
                    name="q"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => results.length && setOpen(true)}
                    placeholder={t(isServices ? "ابحث هنا..." : "ابحث هنا...")}
                    style={{
                        flex: 1, background: 'none', border: 'none', outline: 'none',
                        color: C.textPrimary, fontSize: '13px', fontFamily: CAIRO
                    }}
                />
            </div>

            {open && results.length > 0 && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', insetInlineEnd: 0, width: '100%',
                    minWidth: '280px',
                    background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)', zIndex: 1000, overflow: 'hidden',
                    animation: 'fadeDown 0.2s ease'
                }}>
                    {results.map(r => {
                        const Icon = typeIcon[r.type] || Receipt;
                        return (
                            <div key={r.id} onClick={() => { router.push(r.href); setOpen(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                                    cursor: 'pointer', transition: 'all 0.15s', borderBottom: `1px solid ${C.border}`
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    background: C.primary + '15', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon size={16} color={C.primary} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>{r.label}</div>
                                    <div style={{ fontSize: '11px', color: C.textSecondary }}>{r.sub}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function MobileSearch({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { t } = useTranslation();
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 1002, padding: '20px', animation: 'fadeIn 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button onClick={onClose} style={{ background: C.hover, border: 'none', color: C.textPrimary, width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={20} />
                </button>
                <div style={{ flex: 1 }}>
                    <SearchBox />
                </div>
            </div>
            <style jsx global>{` .search-box-container { display: block !important; max-width: 100% !important; } `}</style>
        </div>
    );
}


function Actions() {
    const { data: session, status: sessionStatus } = useSession();
    const { lang, t, toggleLang } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const isRtl = lang === 'ar';
    const [openUser, setOpenUser] = useState(false);
    const [openNotif, setOpenNotif] = useState(false);
    const [notifs, setNotifs] = useState<any[]>([]);
    const userRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                // Generate new notifications first (background check)
                await fetch('/api/notifications/generate', { method: 'POST' }).catch(() => { });

                const res = await fetch('/api/notifications?limit=8');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setNotifs(data.map(n => ({
                        id: n.id,
                        title: n.msg,
                        time: new Date(n.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                        icon: n.type === 'low_stock' ? Package : n.type === 'overdue_payment' || n.type === 'aging_debt' ? AlertTriangle : Bell,
                        color: n.priority === 'high' ? C.danger : n.priority === 'medium' ? C.warning : C.primary,
                        read: n.read
                    })));
                }
            } catch (error) { console.error('Notif fetch failed:', error); }
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 60000);

        const h = (e: MouseEvent) => {
            if (userRef.current && !userRef.current.contains(e.target as Node)) setOpenUser(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setOpenNotif(false);
        };
        document.addEventListener('mousedown', h);
        return () => { document.removeEventListener('mousedown', h); clearInterval(interval); };
    }, []);

    const markAllRead = async () => {
        try {
            await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: notifs.filter(n => !n.read).map(n => n.id) })
            });
            setNotifs(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) { console.error('Mark read failed:', error); }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Language Switcher */}
            <button
                className="mobile-hide"
                onClick={() => toggleLang()}
                style={{
                    height: '36px', padding: '0 12px', borderRadius: '10px',
                    border: `1px solid ${C.primary}30`, background: `${C.primary}10`,
                    color: C.primary, cursor: 'pointer', transition: 'all 0.2s',
                    fontSize: '13px', fontWeight: 900, fontFamily: lang === 'ar' ? 'sans-serif' : CAIRO,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${C.primary}20`}
                onMouseLeave={e => e.currentTarget.style.background = `${C.primary}10`}
            >
                {lang === 'ar' ? 'EN' : 'ع'}
            </button>

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                title={theme === 'dark' ? t('تفعيل الوضع الفاتح') : t('تفعيل الوضع الداكن')}
                style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    border: `1px solid ${C.border}`, background: C.card,
                    color: C.textSecondary, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
            >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <div ref={notifRef} style={{ position: 'relative' }}>
                <button
                    onClick={() => setOpenNotif(!openNotif)}
                    style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        border: `1px solid ${C.border}`, background: C.card,
                        color: C.textSecondary, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', position: 'relative',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                    <Bell size={18} />
                    {notifs.some(n => !n.read) && (
                        <span style={{
                            position: 'absolute', top: '8px', insetInlineEnd: '8px', width: '8px',
                            height: '8px', background: C.danger, borderRadius: '50%',
                            border: `2px solid ${C.card}`
                        }} />
                    )}
                </button>

                {openNotif && (
                    <div style={{
                        position: 'absolute', top: 'calc(100% + 15px)',
                        insetInlineEnd: 0,
                        width: '320px',
                        background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px',
                        boxShadow: '0 30px 60px rgba(0,0,0,0.6)', zIndex: 1000, overflow: 'hidden',
                        animation: 'fadeDown 0.2s ease', borderTop: `2px solid ${C.primary}`
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                            <span style={{ fontSize: '14px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{t('الإشعارات')}</span>
                            <span onClick={markAllRead}
                                style={{ fontSize: '11px', color: C.primary, cursor: 'pointer', fontWeight: 800, fontFamily: CAIRO, opacity: notifs.some(n => !n.read) ? 1 : 0.5 }}>
                                {t('تحديد كـ مقروء')}
                            </span>
                        </div>
                        <div style={{ maxHeight: '210px', overflowY: 'auto', scrollbarWidth: 'none' }}>
                            {notifs.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: '13px', fontFamily: CAIRO }}>{t('لا توجد إشعارات جديدة')}</div>
                            ) : notifs.map((n, i) => (
                                <div key={i} style={{ padding: '14px 20px', display: 'flex', gap: '14px', cursor: 'pointer', borderBottom: i < notifs.length - 1 ? `1px dashed ${C.border}` : 'none', opacity: n.read ? 0.6 : 1 }}
                                    onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: (n.color || C.primary) + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: n.color || C.primary, flexShrink: 0 }}>
                                        <n.icon size={18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', color: C.textPrimary, fontWeight: n.read ? 600 : 800, fontFamily: CAIRO, marginBottom: '3px', lineHeight: 1.4 }}>{n.title}</div>
                                        <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{n.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ width: '1px', height: '24px', background: C.border, margin: '0 4px' }} />

            {/* User Menu */}
            <div ref={userRef} style={{ position: 'relative' }}>
                <button onClick={() => setOpenUser(!openUser)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: isRtl ? '4px 6px 4px 12px' : '4px 12px 4px 6px', borderRadius: '12px',
                        background: C.card, border: `1px solid ${C.border}`,
                        cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.primary}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                    <Avatar id={(session?.user as any)?.avatar || 'm1'} size={28} />
                    <div className="mobile-hide" style={{ textAlign: 'start' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, lineHeight: 1 }}>
                            {sessionStatus === 'loading' ? '...' : (session?.user?.name || t('مستخدم'))}
                        </div>
                        <div style={{ fontSize: '10px', color: C.textSecondary, marginTop: '2px' }}>
                            {sessionStatus === 'loading' ? '' : getRoleLabel((session?.user as any)?.role, t)}
                        </div>
                    </div>
                    <ChevronDown size={14} color={C.textMuted} style={{ transform: openUser ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </button>

                {openUser && (
                    <div style={{
                        position: 'absolute', top: 'calc(100% + 12px)',
                        insetInlineEnd: 0,
                        width: '260px',
                        background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden',
                        animation: 'fadeDown 0.2s ease', borderTop: `2px solid ${C.primary}`
                    }}>
                        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session?.user?.name}</div>
                                <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session?.user?.email}</div>
                            </div>
                        </div>

                        {[
                            { icon: User, label: 'ملفي الشخصي', path: '/profile' },
                            { icon: KeyRound, label: 'تغيير كلمة المرور', path: '/profile/password' },
                        ].map((it, i) => (
                            <button key={i} onClick={() => { router.push(it.path); setOpenUser(false); }}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '11px 16px', background: 'none', border: 'none',
                                    color: C.textSecondary, fontSize: '13.5px', cursor: 'pointer',
                                    fontFamily: CAIRO, transition: '0.1s', boxSizing: 'border-box'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = C.textPrimary; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSecondary; }}>
                                <it.icon size={15} /> {t(it.label)}
                            </button>
                        ))}

                        <div style={{ borderTop: `1px solid ${C.border}` }}>
                            <button onClick={() => signOut({ callbackUrl: '/login' })}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '12px 16px', background: 'none', border: 'none',
                                    color: C.danger, fontSize: '13.5px', cursor: 'pointer', fontFamily: CAIRO,
                                    boxSizing: 'border-box'
                                }}>
                                <LogOut size={16} /> {t('تسجيل الخروج')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function BranchSwitcher() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session, update } = useSession();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const allBranches: any[] = (session?.user as any)?.branches || [];
    const allowedBranches: string[] | null = (session?.user as any)?.allowedBranches || null;
    const activeBranchId = (session?.user as any)?.activeBranchId;
    const userBranchId = (session?.user as any)?.branchId;
    const role = (session?.user as any)?.role;
    const branches = allowedBranches && allowedBranches.length > 0
        ? allBranches.filter((b: any) => allowedBranches.includes(b.id))
        : allBranches;
    const showBranch = !userBranchId && branches.length > 1;

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const switchBranch = async (branchId: string | null) => {
        await update({ user: { activeBranchId: branchId === null ? 'all' : branchId } });
        setOpen(false);
        window.location.reload();
    };

    if (!showBranch) return null;

    const activeBranch = branches.find(b => b.id === activeBranchId);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button onClick={() => setOpen(!open)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    height: '36px', padding: '0 12px', borderRadius: '10px',
                    background: `${C.primary}10`, border: `1px solid ${C.primary}30`,
                    cursor: 'pointer', transition: '0.2s',
                    flexDirection: isRtl ? 'row' : 'row'
                }}>
                <GitBranch size={14} color={C.primary} />
                <span style={{ fontSize: '13px', fontWeight: 800, color: C.primary, fontFamily: CAIRO }}>
                    {activeBranchId === 'all' || !activeBranchId ? t('كل الفروع') : t(activeBranch?.name || '')}
                </span>
                <ChevronDown size={14} color={C.primary} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 12px)',
                    insetInlineStart: 0,
                    width: '240px',
                    background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden',
                    animation: 'fadeDown 0.2s ease', borderTop: `2px solid ${C.primary}`
                }}>
                    <div style={{ padding: '14px 16px 14px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)', textAlign: 'start' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('الفروع المتاحة')}</div>
                    </div>
                    <div style={{ padding: '6px' }}>
                        {role === 'admin' && (
                            <button onClick={() => switchBranch(null)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                    fontFamily: CAIRO, fontSize: '13.5px', textAlign: 'start', boxSizing: 'border-box',
                                    background: !activeBranchId || activeBranchId === 'all' ? `${C.primary}15` : 'transparent',
                                    color: !activeBranchId || activeBranchId === 'all' ? C.primary : C.textSecondary,
                                    transition: '0.15s', fontWeight: (!activeBranchId || activeBranchId === 'all') ? 800 : 600,
                                    flexDirection: 'row'
                                }}
                                onMouseEnter={e => { if (activeBranchId) e.currentTarget.style.background = C.hover; }}
                                onMouseLeave={e => { if (activeBranchId) e.currentTarget.style.background = 'transparent'; }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                                <span style={{ flex: 1, textAlign: 'start' }}>{t('كل الفروع')}</span>
                            </button>
                        )}
                        {branches.map(b => (
                            <button key={b.id} onClick={() => switchBranch(b.id)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                                    fontFamily: CAIRO, fontSize: '13.5px', textAlign: 'start', boxSizing: 'border-box',
                                    background: activeBranchId === b.id ? `${C.primary}15` : 'transparent',
                                    color: activeBranchId === b.id ? C.primary : C.textSecondary,
                                    transition: '0.15s', fontWeight: activeBranchId === b.id ? 800 : 500,
                                    flexDirection: 'row'
                                }}
                                onMouseEnter={e => { if (activeBranchId !== b.id) e.currentTarget.style.background = C.hover; }}
                                onMouseLeave={e => { if (activeBranchId !== b.id) e.currentTarget.style.background = 'transparent'; }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeBranchId === b.id ? C.primary : 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                                <div style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'start' }}>{t(b.name)}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [showMobSearch, setShowMobSearch] = useState(false);

    return (
        <header className="main-header" style={{
            height: '64px', position: 'fixed', top: 0,
            zIndex: 800,
            background: 'var(--c-overlay, rgba(7, 13, 26, 0.7))', backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${C.border}`, display: 'flex',
            alignItems: 'center', padding: '0 24px', transition: 'all 0.3s'
        }} dir={isRtl ? 'rtl' : 'ltr'}>

            <MobileSearch isOpen={showMobSearch} onClose={() => setShowMobSearch(false)} />

            {/* Mobile Menu Toggle */}
            <button
                className="mobile-menu-btn"
                onClick={onMenuToggle}
                style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)',
                    color: C.textPrimary, display: 'none', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', marginInlineEnd: '12px'
                }}
            >
                <Menu size={20} />
            </button>

            {/* Mobile Search Toggle */}
            <button
                className="mobile-search-toggle"
                onClick={() => setShowMobSearch(true)}
                style={{
                    width: '38px', height: '38px', borderRadius: '10px',
                    border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)',
                    color: C.textPrimary, display: 'none', alignItems: 'center',
                    justifyContent: 'center', cursor: 'pointer', marginInlineEnd: '8px'
                }}
            >
                <Search size={20} />
            </button>

            {/* Branch Switcher - Fixed Position */}
            <div className="branch-switcher-wrap" style={{ order: 1 }}>
                <BranchSwitcher />
            </div>

            {/* Center: Search */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', order: 5 }}>
                <SearchBox />
            </div>

            {/* Actions & User Menu - Fixed Position */}
            <div style={{ order: 10 }}>
                <Actions />
            </div>

            <style jsx global>{`
                @media (max-width: 1023px) {
                    .search-box-container { display: none; }
                    .mobile-search-toggle { display: flex !important; }
                    .main-header { padding: 0 12px !important; }
                }
            `}</style>
        </header>
    );
}




