'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Package, AlertTriangle,
  Users, CreditCard, ArrowUpRight, ArrowDownRight,
  Bell, ChevronDown, BarChart2, ShoppingCart,
  Wallet, RefreshCw, Calendar, Store, Eye,
  LayoutDashboard, Receipt, Clock, Filter, MapPin, FileText, ArrowRight, Truck, Loader2, Shield, Landmark, Briefcase, DollarSign
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useCurrency } from '@/hooks/useCurrency';

/* ══════════════════════════════════════════════
   DASHBOARD RE-DESIGN (PREMIUM)
   ══════════════════════════════════════════════ */
import { THEME, C, CAIRO, INTER } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { getDashboardCache, setDashboardCache } from '@/lib/dashboardCache';
import { useTranslation } from '@/lib/i18n';

const fmt = (n: number) => n.toLocaleString('en-US');

const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
  sale: { label: 'مبيعات', color: C.success, bg: C.successBg },
  purchase: { label: 'مشتريات', color: C.warning, bg: C.warningBg },
  sale_return: { label: 'مرتجع بيع', color: C.danger, bg: C.dangerBg },
  purchase_return: { label: 'مرتجع شراء', color: C.danger, bg: C.dangerBg },
};

function KpiCard({
  label, value, sub, trend, trendUp, color, icon: Icon, delay = 0
}: {
  label: string; value: string; sub?: string;
  trend?: string; trendUp?: boolean; color: string;
  icon: any; delay?: number;
}) {
  const [isHover, setIsHover] = useState(false);
  const { t } = useTranslation();

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: '16px', padding: '12px 16px',
        position: 'relative', overflow: 'hidden',
        animation: `fadeUp 0.4s ease ${delay}ms both`,
        cursor: 'default', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHover ? 'translateY(-4px)' : 'none',
        boxShadow: isHover ? `0 12px 24px -8px rgba(0,0,0,0.5)` : 'none',
      }}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      {/* Dynamic Background Glow */}
      <div style={{
        position: 'absolute', top: '-10px', insetInlineStart: '-10px', width: '80px', height: '80px',
        borderRadius: '50%', background: color, opacity: isHover ? 0.12 : 0.05,
        filter: 'blur(30px)', transition: 'all 0.5s'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: `${color}15`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color
        }}>
          <Icon size={16} />
        </div>
        {trend && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 700,
            color: trendUp ? C.success : C.danger,
            background: trendUp ? C.successBg : C.dangerBg,
            padding: '2px 8px', borderRadius: '20px',
            border: `1px solid ${trendUp ? C.successBorder : C.dangerBorder}`
          }}>
            {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            <span style={{ fontFamily: CAIRO }}>{trend}</span>
          </div>
        )}
      </div>

      <div style={{
        fontSize: '18px', fontWeight: 900, color: C.textPrimary,
        letterSpacing: '-0.3px', lineHeight: 1.1, marginBottom: '2px', fontFamily: INTER
      }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{t(label)}</div>
      {sub && <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '2px', fontFamily: CAIRO }}>{sub}</div>}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, action }: {
  title: string; icon?: any; children: React.ReactNode; action?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
        background: 'rgba(255,255,255,0.01)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {Icon && <div style={{ color: C.primary }}><Icon size={18} /></div>}
          <span style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t(title)}</span>
        </div>
        {action}
      </div>
      <div style={{ padding: '0' }}>{children}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, cSymbol }: any) {
  const fmtFull = (n: number) => n.toLocaleString('en-US') + ' ' + cSymbol;
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: '12px', padding: '12px 16px',
      fontSize: '13px', color: C.textPrimary,
      direction: 'rtl', boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{ fontWeight: 700, marginBottom: '8px', color: C.textSecondary, fontFamily: CAIRO }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color }} />
          <span style={{ color: C.textSecondary, fontFamily: CAIRO }}>{p.name}:</span>
          <span style={{ fontWeight: 800, fontFamily: INTER }}>{fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
}



export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { symbol: cSymbol } = useCurrency();
  const { lang, t } = useTranslation();
  const isRtl = lang === 'ar';

  const userRole = (session?.user as any)?.role;
  const userPerms = (session?.user as any)?.permissions || {};
  const isSuperAdmin = (session?.user as any)?.isSuperAdmin;
  const businessType = (session?.user as any)?.businessType?.toUpperCase();
  const isServices = businessType === 'SERVICES';
  const isUserAdmin = userRole === 'admin';

  // Get subscription features for admin checks
  const enabledFeatures = (() => {
    try {
      const sub = (session?.user as any)?.subscription;
      if (!sub?.features) return {};
      const parsed = sub.features;
      if (typeof parsed === 'string') return JSON.parse(parsed);
      return parsed;
    } catch { return {}; }
  })();

  const hasPage = (pageId: string, featureKey?: string): boolean => {
    if (isSuperAdmin) return true;

    // Core pages are usually always allowed if not restricted by granular permissions
    const isCore = pageId === '/' || pageId === '/settings' || featureKey === 'dashboard';

    if (isUserAdmin) {
      if (isCore) return true;
      if (Object.keys(enabledFeatures).length === 0) return true;
      const pagesInSub = enabledFeatures[featureKey || ''] || [];
      return pagesInSub.includes(pageId);
    }

    // Check subscription for non-admins
    if (!isCore && Object.keys(enabledFeatures).length > 0 && featureKey) {
      const pagesInSub = enabledFeatures[featureKey] || [];
      if (!pagesInSub.includes(pageId)) return false;
    }

    // Granular permissions
    if (Object.keys(userPerms).length > 0) {
      return !!userPerms[pageId]?.view;
    }

    return isCore; // Default to true for core pages if no perms set
  };

  const canViewDashboard = hasPage('/', 'dashboard');


  // Redirect if no permission
  useEffect(() => {
    if (!canViewDashboard && session) {
      if (hasPage('/settings')) window.location.href = '/settings';
      else if (hasPage('/sales')) window.location.href = '/sales';
      else if (hasPage('/purchases')) window.location.href = '/purchases';
    }
  }, [canViewDashboard, session]);

  const [stats, setStats] = useState<any>(getDashboardCache());
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [greeting, setGreeting] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(!getDashboardCache());
  const [isError, setIsError] = useState(false);

  const loadStats = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setIsError(false);
    try {
      const res = await fetch(`/api/stats?period=${period}`);
      const data = await res.json();
      if (data.error) setIsError(true);
      else {
        setStats(data);
        setDashboardCache(data);
      }
    } catch {
      setIsError(true);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'صباح الخير' : h < 17 ? 'مساء الخير' : 'مساء النور');
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    tick();
    const iv = setInterval(tick, 60000);

    // تحديث البيانات صامت أو بلودينج لو مفيش كاش
    const cached = getDashboardCache();
    loadStats(!cached);

    return () => clearInterval(iv);
  }, [session, period]);

  // انتظر الـ session بعد كل الـ hooks - ده بيحل مشكلة الريفريش
  if (sessionStatus === 'loading') return (
    <DashboardLayout>
      <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
        <p style={{ color: C.textSecondary, fontSize: '15px', fontFamily: CAIRO }}>جاري تحميل البيانات...</p>
      </div>
    </DashboardLayout>
  );

  if (isError) return (
    <DashboardLayout>
      <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.danger }}>
          <AlertTriangle size={40} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', marginBottom: '8px', fontFamily: CAIRO }}>فشل في تحميل الإحصائيات</h2>
          <p style={{ color: C.textSecondary, fontSize: '14px', fontFamily: CAIRO, marginBottom: '24px' }}>حدث خطأ أثناء جلب البيانات من الخادم، يرجى التحقق من الاتصال والمحاولة مرة أخرى.</p>
          <button
            onClick={() => loadStats(true)}
            style={{
              padding: '12px 32px', borderRadius: '12px', border: 'none', background: C.primary, color: '#fff',
              fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto'
            }}
          >
            <RefreshCw size={18} /> تحديث الصفحة
          </button>
        </div>
      </div>
    </DashboardLayout>
  );

  if (!stats) return (
    <DashboardLayout>
      <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
        <p style={{ color: C.textSecondary, fontSize: '15px', fontFamily: CAIRO }}>جاري تحضير لوحة التحكم...</p>
      </div>
    </DashboardLayout>
  );

  const periodLabel: any = { today: t('اليوم'), week: t('هذا الأسبوع'), month: t('هذا الشهر') };
  const renderCurrency = (n: number, fontSize: string = '14px', numWeight: number = 800, color: string = 'inherit') => (
    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px', direction: 'ltr', color: color === 'inherit' ? 'inherit' : color }}>
      <span style={{ fontSize: `calc(${fontSize} - 3px)`, fontWeight: 700, fontFamily: CAIRO, opacity: 1 }}>{cSymbol}</span>
      <span style={{ fontSize, fontWeight: numWeight, fontFamily: INTER }}>{n.toLocaleString('en-US')}</span>
    </div>
  );

  if (!canViewDashboard) return (
    <DashboardLayout>
      <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
        <Shield size={32} style={{ color: C.danger }} />
        <p style={{ color: C.textSecondary, fontSize: '15px', fontFamily: CAIRO }}>عذراً، ليس لديك صلاحية للوصول للوحة التحكم.</p>
      </div>
    </DashboardLayout>
  );


  const getVisibleActions = () => {
    const serviceActions = [
      { id: '/customers', featureKey: 'sales', href: '/customers', label: 'العملاء', icon: Users, color: 'rgba(6, 182, 212, 0.12)', iconColor: '#06b6d4' },
      { id: '/sales', featureKey: 'sales', href: '/sales/new', label: 'فاتورة خدمات', icon: Receipt, color: C.primaryBg, iconColor: C.primary },
      { id: '/receipts', featureKey: 'sales', href: '/receipts/new', label: 'سند قبض', icon: TrendingUp, color: C.successBg, iconColor: C.success },
      { id: '/expenses', featureKey: 'treasury', href: '/expenses', label: 'المصروفات', icon: TrendingDown, color: C.dangerBg, iconColor: C.danger },
      { id: '/other-income', featureKey: 'treasury', href: '/other-income', label: 'الإيرادات', icon: TrendingUp, color: 'rgba(56, 189, 248, 0.12)', iconColor: '#38bdf8' },
      { id: '/payrolls', featureKey: 'hr', href: '/payrolls', label: 'مسير الرواتب', icon: DollarSign, color: 'rgba(16, 185, 129, 0.12)', iconColor: '#10b981' },
      
      { id: '/accounts', featureKey: 'accounting', href: '/accounts', label: 'شجرة الحسابات', icon: Landmark, color: 'rgba(16, 185, 129, 0.12)', iconColor: '#10b981' },
      { id: '/reports', featureKey: 'dashboard', href: '/reports', label: 'التقارير الإحصائية', icon: BarChart2, color: 'rgba(234, 179, 8, 0.12)', iconColor: '#eab308' },
      { id: '/settings', featureKey: 'dashboard', href: '/settings', label: 'إعدادات النظام', icon: LayoutDashboard, color: 'rgba(75, 85, 99, 0.12)', iconColor: '#4b5563' },
    ];

    const tradingActions = [
      { id: '/sales', featureKey: 'sales', href: '/sales/new', label: 'فاتورة مبيعات', icon: Receipt, color: C.primaryBg, iconColor: C.primary },
      { id: '/purchases', featureKey: 'purchases', href: '/purchases/new', label: 'فاتورة مشتريات', icon: ShoppingCart, color: 'rgba(56, 189, 248, 0.12)', iconColor: '#38bdf8' },
      { id: '/receipts', featureKey: 'sales', href: '/receipts/new', label: 'سند قبض', icon: TrendingUp, color: C.successBg, iconColor: C.success },
      { id: '/purchase-payments', featureKey: 'purchases', href: '/purchase-payments/new', label: 'سند صرف', icon: TrendingDown, color: C.dangerBg, iconColor: C.danger },
      { id: '/customers', featureKey: 'sales', href: '/customers', label: 'العملاء', icon: Users, color: 'rgba(6, 182, 212, 0.12)', iconColor: '#06b6d4' },
      { id: '/suppliers', featureKey: 'purchases', href: '/suppliers', label: 'الموردين', icon: Truck, color: 'rgba(244, 63, 94, 0.12)', iconColor: '#f43f5e' },
      
      { id: '/items', featureKey: 'inventory', href: '/items', label: 'الأصناف', icon: Package, color: 'rgba(139, 92, 246, 0.12)', iconColor: '#8b5cf6' },
      { id: '/accounts', featureKey: 'accounting', href: '/accounts', label: 'شجرة الحسابات', icon: Landmark, color: 'rgba(16, 185, 129, 0.12)', iconColor: '#10b981' },
    ];

    const currentActions = isServices ? serviceActions : tradingActions;

    return currentActions
      .filter(action => hasPage(action.id, action.featureKey))
      .slice(0, 6);
  };

  const visibleQuickActions = getVisibleActions();

  return (
    <DashboardLayout>
      <div dir={isRtl ? 'rtl' : 'ltr'} style={{ color: C.textPrimary, fontFamily: CAIRO, padding: '0 0 12px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', animation: 'fadeUp 0.3s ease both' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: C.textPrimary, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {t(greeting)}، <span style={{ color: C.primary }}>{session?.user?.name || t('مستخدم النظام')}</span>
            </h1>
            <div style={{ fontSize: '13px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO, marginTop: '4px' }}>
              {(() => {
                const d = new Date();
                return d.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              })()}
              <span style={{ margin: '0 8px', color: C.border }}>|</span>
              <span style={{ color: C.textSecondary, fontFamily: INTER }}>{time}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '4px' }}>
              {(['today', 'week', 'month'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  style={{
                    padding: '8px 18px', borderRadius: '11px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, transition: 'all 0.2s',
                    background: period === p ? C.primary : 'transparent',
                    color: period === p ? '#fff' : C.textSecondary,
                  }}>
                  {periodLabel[p]}
                </button>
              ))}
            </div>
          </div>
        </div>


        {/* ── KPI Cards Grid (Dynamic) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isServices ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
          gap: '18px',
          marginBottom: '28px'
        }}>
          {isServices ? (
            <>
              <KpiCard label="إيرادات اليوم" value={fmt(stats.salesTodayTotal)} sub="إجمالي مبيعات الخدمات اليوم" color={C.primary} icon={Receipt} delay={0} />
              <KpiCard label="عدد الخدمات" value={stats.items} sub="إجمالي الخدمات المسجلة" color={C.blue} icon={Package} delay={60} />
              <KpiCard label="عدد العملاء" value={stats.customers} sub="قاعدة العملاء الحالية" color={C.success} icon={Users} delay={120} />
              <KpiCard label="مواعيد اليوم" value="0" sub="لا يوجد مواعيد مسجلة حالياً" color={C.warning} icon={Clock} delay={180} />
              <KpiCard label="المصروفات" value={fmt(stats.expensesTotal || 0)} sub="إجمالي مدفوعات المصاريف" color={C.danger} icon={TrendingDown} delay={240} />
              <KpiCard label="صافي الأرباح" value={fmt(stats.netProfit)} sub="الإيرادات - المصروفات" color={C.success} icon={BarChart2} delay={300} />
            </>
          ) : (
            <>
              {hasPage('/sales', 'sales') && <KpiCard label="إجمالي المبيعات" value={fmt(stats.salesTotal)} sub={periodLabel[period]} trend="↑ مباشر" trendUp={true} color={C.primary} icon={TrendingUp} delay={0} />}
              {hasPage('/purchases', 'purchases') && <KpiCard label="إجمالي المشتريات" value={fmt(stats.purchasesTotal)} sub={periodLabel[period]} trend="↓ مباشر" trendUp={false} color={C.warning} icon={ShoppingCart} delay={60} />}
              {(hasPage('/sales', 'sales') || hasPage('/purchases', 'purchases')) && (
                <KpiCard label="صافي الربح" value={fmt(stats.netProfit)} sub={`هامش ${(stats.salesTotal ? (stats.netProfit / stats.salesTotal * 100).toFixed(0) : 0)}%`}
                  trend={stats.netProfit >= 0 ? "↑ نمو" : "↓ تراجع"}
                  trendUp={stats.netProfit >= 0}
                  color={stats.netProfit >= 0 ? C.success : C.danger}
                  icon={BarChart2} delay={120} />
              )}
              {hasPage('/treasuries', 'treasury') && <KpiCard label="رصيد الخزينة" value={fmt(stats.treasuriesBalance)} sub="إجمالي السيولة" color={C.primary} icon={Wallet} delay={180} />}
              {hasPage('/customers', 'sales') && <KpiCard label="ذمم العملاء" value={fmt(stats.topDebtors.reduce((s: any, d: any) => s + d.balance, 0))} sub={`${stats.topDebtors.length} عملاء`} trendUp={false} color={C.danger} icon={Users} delay={240} />}
              {hasPage('/suppliers', 'purchases') && <KpiCard label="الموردين" value={stats.suppliers} sub="إجمالي الموردين" color={C.warning} icon={Truck} delay={300} />}
              {hasPage('/sales', 'sales') && <KpiCard label="مبيعات اليوم" value={fmt(stats.salesTodayTotal)} sub="إحصائيات فورية" color={C.primary} icon={Eye} delay={360} />}
              {(hasPage('/warehouses', 'inventory') || hasPage('/items', 'inventory')) && (
                <Link href="/reports/low-stock-items" style={{ textDecoration: 'none', display: 'block' }}>
                  <KpiCard label="نواقص المخزن" value={stats.lowStockItems.length} sub="أصناف تحت الحد – اضغط للعرض" color={C.danger} icon={AlertTriangle} delay={420} />
                </Link>
              )}
            </>
          )}
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <LayoutDashboard size={16} color={C.primary} />
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: C.textPrimary }}>{t('الوصول السريع')}</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
            {visibleQuickActions.map((action, i) => (
                <Link key={i} href={action.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`, borderRadius: '15px',
                    padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '10px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = C.hover; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = C.card; }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px',
                      background: action.color, color: action.iconColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 8px 16px -4px ${action.color}`
                    }}>
                      <action.icon size={20} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, textAlign: 'center', fontFamily: CAIRO }}>{t(action.label)}</span>
                  </div>
                </Link>
              ))}
          </div>
        </div>

        {/* ── Charts & Alerts ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: (hasPage('/sales', 'sales') || hasPage('/purchases', 'purchases')) && (hasPage('/warehouses', 'inventory') || hasPage('/items', 'inventory') || hasPage('/customers', 'sales')) ? '2fr 1fr' : '1fr',
          gap: '18px',
          marginBottom: '18px'
        }}>

          {(hasPage('/sales', 'sales') || hasPage('/purchases', 'purchases')) && (
            <SectionCard title={isServices ? "إيرادات الخدمات مقابل المصروفات" : "المبيعات مقابل المشتريات"} icon={BarChart2}
              action={<div style={{ fontSize: '11px', color: C.textSecondary, display: 'flex', gap: '15px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.primary }} />{isServices ? 'إيرادات' : 'مبيعات'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isServices ? C.danger : C.warning }} />{isServices ? 'مصروفات' : 'مشتريات'}</span>
              </div>}>
              <div style={{ padding: '20px 10px 10px', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.primary} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gPurch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.warning} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={C.warning} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gDanger" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.danger} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={C.danger} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} opacity={0.5} />
                    <XAxis dataKey="label" tick={{ fill: C.textMuted, fontSize: 11, fontFamily: INTER }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 10, fontFamily: INTER }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={40} />
                    <Tooltip content={<ChartTooltip cSymbol={cSymbol} />} />
                    {hasPage('/sales', 'sales') && <Area type="monotone" dataKey="sales" name={isServices ? "إيرادات" : "مبيعات"} stroke={C.primary} strokeWidth={3} fill="url(#gSales)" dot={false} />}
                    {isServices 
                       ? <Area type="monotone" dataKey="expenses" name="مصروفات" stroke={C.danger} strokeWidth={2} fill="url(#gDanger)" dot={false} />
                       : (hasPage('/purchases', 'purchases') && <Area type="monotone" dataKey="purchases" name="مشتريات" stroke={C.warning} strokeWidth={2} fill="url(#gPurch)" dot={false} />)
                    }
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          )}

          {hasPage('/treasuries', 'treasury') && (
            <SectionCard title="توزيع السيولة النقدية" icon={Landmark}
              action={<span style={{ fontSize: '11px', color: '#fff', fontWeight: 800, background: C.success, padding: '3px 10px', borderRadius: '20px' }}>{stats.treasuryList?.length || 0} حساب</span>}>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!stats.treasuryList || stats.treasuryList.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>لا توجد نقدية مسجلة حالياً</div>
                ) : (
                  stats.treasuryList.map((t: any, i: number) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px', background: 'rgba(52,211,153,0.03)',
                      border: `1px solid ${C.success}15`,
                      borderRadius: '12px', transition: 'all 0.2s'
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = C.success}
                      onMouseLeave={e => e.currentTarget.style.borderColor = `${C.success}15`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: C.success, boxShadow: `0 0 8px ${C.success}` }} />
                        <span style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t.name}</span>
                      </div>
                      {renderCurrency(t.balance, '15px', 900)}
                    </div>
                  ))
                )}
                {stats.treasuryList?.length > 0 && (
                  <div style={{
                    marginTop: '10px', paddingTop: '15px', borderTop: `1px dashed ${C.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 700 }}>إجمالي السيولة المتاحة</span>
                    {renderCurrency(stats.treasuryList.reduce((s: any, t: any) => s + t.balance, 0), '18px', 900)}
                  </div>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        {/* ── Recent Data Row ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: (hasPage('/sales', 'sales') || hasPage('/purchases', 'purchases')) && hasPage('/customers', 'sales') ? '1.6fr 1fr' : '1fr',
          gap: '18px'
        }}>

          {(hasPage('/sales', 'sales') || hasPage('/receipts', 'sales') || hasPage('/purchases', 'purchases') || hasPage('/purchase-payments', 'purchases')) && (
            <SectionCard title="آخر الحركات المالية" icon={Receipt}
              action={hasPage('reports-financial', 'reports') && (
                <Link href="/reports" style={{ fontSize: '12px', color: C.primary, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  عرض التقارير <ArrowUpRight size={14} />
                </Link>
              )}>
              <div style={{ padding: '0 10px 10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'start' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {['التاريخ والطرف', 'القيمة', 'النوع', 'رقم'].map((h, i) => (
                        <th key={h} style={{ padding: '14px 16px', fontSize: '12px', color: C.textMuted, fontWeight: 600, textAlign: i === 3 ? (isRtl ? 'left' : 'right') : (isRtl ? 'right' : 'left') }}>{t(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentInvoices
                      .filter((inv: any) => {
                        if (inv.type === 'sale' || inv.type === 'sale_return') return hasPage('/sales', 'sales');
                        if (inv.type === 'receipt') return hasPage('/receipts', 'sales');
                        if (inv.type === 'purchase' || inv.type === 'purchase_return') return hasPage('/purchases', 'purchases');
                        if (inv.type === 'payment') return hasPage('/purchase-payments', 'purchases');
                        return true;
                      })
                      .map((inv: any, i: number, arr: any[]) => {
                        const s = statusLabel[inv.type] || { label: inv.type, color: C.textMuted, bg: C.border };
                        return (
                          <tr key={inv.id} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>{inv.customer?.name || inv.supplier?.name || '—'}</div>
                              <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px', fontFamily: INTER }}>{new Date(inv.date).toLocaleDateString('ar-EG')}</div>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '14px', textAlign: isRtl ? 'right' : 'left' }}>{renderCurrency(inv.total, '14px', 800)}</td>
                            <td style={{ padding: '14px 16px', textAlign: isRtl ? 'right' : 'left' }}>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: s.color, background: s.bg, padding: '4px 12px', borderRadius: '30px', border: `1px solid ${s.color}20` }}>{t(s.label)}</span>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '12px', color: C.primary, fontWeight: 700, fontFamily: INTER, textAlign: isRtl ? 'left' : 'right' }}>#{inv.invoiceNumber}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {hasPage('/customers', 'sales') && (
            <SectionCard title="أكبر مديونيات العملاء" icon={CreditCard}>
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={14} /> ذمم العملاء المستحقة
                </div>
                {stats.topDebtors.map((d: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'rgba(239,68,68,0.03)',
                    borderRadius: '12px', border: `1px solid ${C.danger}15`
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>{d.name}</span>
                    {renderCurrency(d.balance, '14px', 900, C.danger)}
                  </div>
                ))}

                <div style={{
                  marginTop: '10px', paddingTop: '15px', borderTop: `1px dashed ${C.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 700 }}>إجمالي المطلوب تحصيله</span>
                  <div style={{ color: C.danger }}>
                    {renderCurrency(stats.topDebtors.reduce((s: any, d: any) => s + d.balance, 0), '16px', 900)}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

        </div>

        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(15px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
