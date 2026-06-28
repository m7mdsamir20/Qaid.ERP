'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Package, AlertTriangle, Users, CreditCard, ArrowUpRight, ArrowDownRight, Bell, ChevronDown, BarChart2, ShoppingCart, Wallet, RefreshCw, Calendar, Store, Eye, LayoutDashboard, Receipt, Clock, Filter, MapPin, FileText, ArrowRight, Truck, Loader2, Shield, Landmark, Briefcase, DollarSign, UtensilsCrossed, FolderKanban, Plus, HardHat, ArrowUpDown, Layers } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useCurrency } from '@/hooks/useCurrency';

/* ══════════════════════════════════════════════
   DASHBOARD RE-DESIGN (PREMIUM)
   ══════════════════════════════════════════════ */
import { THEME, C, CAIRO, OUTFIT } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { getDashboardCache, setDashboardCache } from '@/lib/dashboardCache';
import { useTranslation } from '@/lib/i18n';
import { navSections } from '@/constants/navigation';

const t = (s: string) => s;

const toEnDigits = (str: string) => str.replace(/[\u0660-\u0669]/g, d => '0123456789'['\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669'.indexOf(d)]);
// Local fmt removed in favor of fMoney

const getInvoicePrefix = (type: string) => {
  switch (type) {
    case 'sale': return 'SAL-';
    case 'purchase': return 'PUR-';
    case 'receipt': return 'RCP-';
    case 'payment': return 'PMT-';
    case 'installment': return 'PLN-';
    case 'installment_receipt': return 'INS-';
    case 'sale_return': return 'SRET-';
    case 'purchase_return': return 'PRET-';
    default: return 'INV-';
  }
};

const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
  sale: { label: t('مبيعات'), color: C.success, bg: C.successBg },
  purchase: { label: t('مشتريات'), color: C.warning, bg: C.warningBg },
  sale_return: { label: t('مرتجع مبيعات'), color: C.danger, bg: C.dangerBg },
  purchase_return: { label: t('مرتجع مشتريات'), color: C.danger, bg: C.dangerBg },
  receipt: { label: t('سند قبض'), color: C.success, bg: C.successBg },
  payment: { label: t('سند صرف'), color: C.danger, bg: C.dangerBg },
  installment: { label: t('تقسيط'), color: C.primary, bg: C.primaryBg },
  installment_receipt: { label: t('تحصيل قسط'), color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },
};

const projectStatusLabels: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: t('نشط'), color: C.success, bg: C.successBg },
  paused: { label: t('متوقف مؤقتاً'), color: C.warning, bg: C.warningBg },
  completed: { label: t('مكتمل'), color: C.primary, bg: C.primaryBg },
  cancelled: { label: t('ملغي'), color: C.danger, bg: C.dangerBg },
};

const projectTypeLabels: Record<string, string> = {
  residential: t('سكني'),
  commercial: t('تجاري'),
  government: t('حكومي'),
  maintenance: t('صيانة وتشغيل'),
};

function KpiCard({
  label, value, sub, trend, trendUp, color, icon: Icon, delay = 0
}: {
  label: string; value: React.ReactNode; sub?: string;
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
        boxShadow: isHover ? '0 10px 20px -10px rgba(0,0,0,0.2)' : 'none',
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
        fontSize: '16px', fontWeight: 600, color: C.textPrimary,
        letterSpacing: '-0.2px', lineHeight: 1.1, marginBottom: '4px', fontFamily: OUTFIT,
        display: 'flex', alignItems: 'baseline', gap: '4px'
      }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{t(label)}</div>
      {sub && <div style={{ fontSize: '10px', color: C.textSecondary, marginTop: '2px', fontFamily: CAIRO }}>{t(sub)}</div>}
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

function ChartTooltip({ active, payload, label, fMoneyJSX, t }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: '12px', padding: '12px 16px',
      fontSize: '13px', color: C.textPrimary,
      direction: 'inherit', boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{ fontWeight: 700, marginBottom: '8px', color: C.textSecondary, fontFamily: CAIRO }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color }} />
          <span style={{ color: C.textSecondary, fontFamily: CAIRO }}>{t(p.name)}:</span>
          <div style={{ display: 'inline-flex' }}>{fMoneyJSX(p.value)}</div>
        </div>
      ))}
    </div>
  );
}



export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { fMoneyJSX } = useCurrency();
  const { lang, t } = useTranslation();
  const isRtl = lang === 'ar';

  const userRole = (session?.user as any)?.role;
  const userPerms = (session?.user as any)?.permissions || {};
  const isSuperAdmin = (session?.user as any)?.isSuperAdmin;
  const businessType = (session?.user as any)?.businessType?.toUpperCase();
  const isServices = businessType === 'SERVICES';
  const isRestaurants = businessType === 'RESTAURANTS';
  const isContracting = businessType === 'CONTRACTING';
  const isUserAdmin = userRole === 'admin';

  // Get subscription features for admin checks
  const enabledFeatures = (() => {
    try {
      const sub = (session?.user as any)?.subscription;
      if (!sub?.features) return {};
      const parsed = typeof sub.features === 'string' ? JSON.parse(sub.features) : sub.features;
      if (Array.isArray(parsed)) {
        const obj: Record<string, string[]> = {};
        parsed.forEach((key: string) => {
          const sections = navSections.filter((s: any) => s.featureKey === key);
          sections.forEach((section: any) => {
            if (section && section.links) {
              obj[key] = [...(obj[key] || []), ...section.links.map((l: any) => l.id)];
            }
          });
        });
        return obj;
      }
      return parsed;
    } catch { return {}; }
  })();

  const hasPage = (pageId: string, featureKey?: string): boolean => {
    const isCore = pageId === '/' || pageId === '/settings' || featureKey === 'dashboard' || featureKey === 'activity_log';

    // 1. Check subscription (granular check) - settings and activity_log bypass subscription checks
    if (!isCore && Object.keys(enabledFeatures).length > 0 && featureKey) {
      const pagesInSub = enabledFeatures[featureKey] || [];
      if (!pagesInSub.includes(pageId)) return false;
    }

    if (isSuperAdmin) return true;

    if (isUserAdmin) {
      return true;
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
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(!getDashboardCache());
  const [isError, setIsError] = useState(false);

  const loadStats = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setIsError(false);
    try {
      const activeBranchId = (session?.user as any)?.activeBranchId || 'all';
      const url = businessType === 'CONTRACTING'
        ? `/api/projects/stats?b=${activeBranchId}&t=${Date.now()}`
        : `/api/stats?period=${period}&b=${activeBranchId}&t=${Date.now()}`;
      const res = await fetch(url);
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
        <p style={{ color: C.textSecondary, fontSize: '15px', fontFamily: CAIRO }}>{t('جاري تحميل البيانات...')}</p>
      </div>
    </DashboardLayout>
  );

  if (isError) return (
    <DashboardLayout>
      <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.danger }}>
          <AlertTriangle size={40} />
        </div>
        <div style={{}}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', marginBottom: '8px', fontFamily: CAIRO }}>{t('فشل في تحميل الإحصائيات')}</h2>
          <p style={{ color: C.textSecondary, fontSize: '13px', fontFamily: CAIRO, marginBottom: '24px' }}>{t('حدث خطأ أثناء جلب البيانات من الخادم، يرجى التحقق من الاتصال والمحاولة مرة أخرى.')}</p>
          <button
            onClick={() => loadStats(true)}
            style={{
              padding: '12px 32px', borderRadius: '12px', border: 'none', background: C.primary, color: '#fff',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto'
            }}
          >
            <RefreshCw size={18} /> {t('تحديث الصفحة')}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );

  if (!stats) return (
    <DashboardLayout>
      <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
        <p style={{ color: C.textSecondary, fontSize: '15px', fontFamily: CAIRO }}>{t('جاري تحضير لوحة التحكم...')}</p>
      </div>
    </DashboardLayout>
  );

  const periodLabel: any = { today: t('اليوم'), week: t('هذا الأسبوع'), month: t('هذا الشهر') };
  const renderCurrency = (n: number) => fMoneyJSX(n);


  if (!canViewDashboard) return (
    <DashboardLayout>
      <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
        <Shield size={32} style={{ color: C.danger }} />
        <p style={{ color: C.textSecondary, fontSize: '15px', fontFamily: CAIRO }}>{t('عذراً، ليس لديك صلاحية للوصول للوحة التحكم.')}</p>
      </div>
    </DashboardLayout>
  );


  const getVisibleActions = () => {
    const serviceActions = [
      { id: '/customers', featureKey: 'sales', href: '/customers', label: t('العملاء'), icon: Users, color: 'rgba(6, 182, 212, 0.12)', iconColor: '#06b6d4' },
      { id: '/sales', featureKey: 'sales', href: '/sales/new', label: t('فاتورة خدمات'), icon: Receipt, color: C.primaryBg, iconColor: C.primary },
      { id: '/receipts', featureKey: 'sales', href: '/receipts/new', label: t('سند قبض'), icon: TrendingUp, color: C.successBg, iconColor: C.success },
      { id: '/expenses', featureKey: 'treasury', href: '/expenses', label: t('المصروفات'), icon: TrendingDown, color: C.dangerBg, iconColor: C.danger },
      { id: '/other-income', featureKey: 'treasury', href: '/other-income', label: t('الإيرادات'), icon: TrendingUp, color: 'rgba(56, 189, 248, 0.12)', iconColor: '#38bdf8' },
      { id: '/payrolls', featureKey: 'hr', href: '/payrolls', label: t('مسير الرواتب'), icon: DollarSign, color: 'rgba(16, 185, 129, 0.12)', iconColor: '#10b981' },

      { id: '/accounts', featureKey: 'accounting', href: '/accounts', label: t('شجرة الحسابات'), icon: Landmark, color: 'rgba(16, 185, 129, 0.12)', iconColor: '#10b981' },
      { id: '/reports', featureKey: 'dashboard', href: '/reports', label: t('التقارير الإحصائية'), icon: BarChart2, color: 'rgba(234, 179, 8, 0.12)', iconColor: '#eab308' },
      { id: '/settings', featureKey: 'dashboard', href: '/settings', label: t('إعدادات النظام'), icon: LayoutDashboard, color: 'rgba(75, 85, 99, 0.2)', iconColor: '#4b5563' },
    ];

    const tradingActions = [
      { id: '/sales', featureKey: 'sales', href: '/sales/new', label: t('فاتورة مبيعات'), icon: Receipt, color: C.primaryBg, iconColor: C.primary },
      { id: '/purchases', featureKey: 'purchases', href: '/purchases/new', label: t('فاتورة مشتريات'), icon: ShoppingCart, color: 'rgba(56, 189, 248, 0.12)', iconColor: '#38bdf8' },
      { id: '/receipts', featureKey: 'sales', href: '/receipts/new', label: t('سند قبض'), icon: TrendingUp, color: C.successBg, iconColor: C.success },
      { id: '/purchase-payments', featureKey: 'purchases', href: '/purchase-payments/new', label: t('سند صرف'), icon: TrendingDown, color: C.dangerBg, iconColor: C.danger },
      { id: '/customers', featureKey: 'sales', href: '/customers', label: t('العملاء'), icon: Users, color: 'rgba(6, 182, 212, 0.12)', iconColor: '#06b6d4' },
      { id: '/suppliers', featureKey: 'purchases', href: '/suppliers', label: t('الموردين'), icon: Truck, color: 'rgba(244, 63, 94, 0.12)', iconColor: '#f43f5e' },

      { id: '/items', featureKey: 'inventory', href: '/items', label: t('الأصناف'), icon: Package, color: 'rgba(139, 92, 246, 0.12)', iconColor: '#8b5cf6' },
      { id: '/accounts', featureKey: 'accounting', href: '/accounts', label: t('شجرة الحسابات'), icon: Landmark, color: 'rgba(16, 185, 129, 0.12)', iconColor: '#10b981' },
    ];

    const restaurantActions = [
      { id: '/pos', featureKey: 'pos', href: '/pos', label: t('نقطة البيع (الكاشير)'), icon: Store, color: C.primaryBg, iconColor: C.primary },
      { id: '/sales', featureKey: 'sales', href: '/sales', label: t('فواتير المبيعات'), icon: Receipt, color: C.successBg, iconColor: C.success },
      { id: '/purchases', featureKey: 'purchases', href: '/purchases/new', label: t('مشتريات المطعم'), icon: ShoppingCart, color: 'rgba(56, 189, 248, 0.12)', iconColor: '#38bdf8' },
      { id: '/items', featureKey: 'inventory', href: '/items', label: t('أصناف المنيو'), icon: UtensilsCrossed, color: 'rgba(244, 63, 94, 0.12)', iconColor: '#f43f5e' },
      { id: '/expenses', featureKey: 'treasury', href: '/expenses', label: t('المصروفات'), icon: TrendingDown, color: C.dangerBg, iconColor: C.danger },
      { id: '/treasuries', featureKey: 'treasury', href: '/treasuries', label: t('الخزائن (الدرج)'), icon: Wallet, color: 'rgba(16, 185, 129, 0.12)', iconColor: '#10b981' },
      { id: '/reports', featureKey: 'dashboard', href: '/reports', label: t('التقارير الإحصائية'), icon: BarChart2, color: 'rgba(234, 179, 8, 0.12)', iconColor: '#eab308' },
      { id: '/settings', featureKey: 'dashboard', href: '/settings', label: t('إعدادات النظام'), icon: LayoutDashboard, color: 'rgba(75, 85, 99, 0.2)', iconColor: '#4b5563' },
    ];

    const contractingActions = [
      { id: '/projects', featureKey: 'projects', href: '/projects', label: t('قائمة المشاريع'), icon: FolderKanban, color: C.primaryBg, iconColor: C.primary },
      { id: '/projects/new', featureKey: 'projects', href: '/projects/new', label: t('مشروع جديد'), icon: Plus, color: 'rgba(56, 189, 248, 0.12)', iconColor: '#38bdf8' },
      { id: '/progress-bills', featureKey: 'projects', href: '/progress-bills', label: t('المستخلصات'), icon: FileText, color: C.successBg, iconColor: C.success },
      { id: '/subcontractors', featureKey: 'subcontractors', href: '/subcontractors', label: t('مقاولين الباطن'), icon: HardHat, color: 'rgba(244, 63, 94, 0.12)', iconColor: '#f43f5e' },
      { id: '/sub-contracts', featureKey: 'subcontractors', href: '/sub-contracts', label: t('عقود الباطن'), icon: HardHat, color: 'rgba(139, 92, 246, 0.12)', iconColor: '#8b5cf6' },
      { id: '/settings', featureKey: 'dashboard', href: '/settings', label: t('إعدادات النظام'), icon: LayoutDashboard, color: 'rgba(75, 85, 99, 0.2)', iconColor: '#4b5563' },
    ];

    const currentActions = isRestaurants
      ? restaurantActions
      : isServices
        ? serviceActions
        : isContracting
          ? contractingActions
          : tradingActions;

    return currentActions
      .filter(action => hasPage(action.id, action.featureKey))
      .slice(0, 6);
  };

  const visibleQuickActions = getVisibleActions();
  const h = new Date().getHours();
  const greetingKey = h < 12 ? t("صباح الخير") : h < 17 ? t("مساء الخير") : t("مساء النور");

  return (
    <DashboardLayout>
      <div dir={isRtl ? 'rtl' : 'ltr'} style={{ color: C.textPrimary, fontFamily: CAIRO, padding: '0 0 12px' }}>

        {/* ── Header ── */}
        <div className="dashboard-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', animation: 'fadeUp 0.3s ease both', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '21px', fontWeight: 600, margin: 0, color: C.textPrimary, fontFamily: CAIRO, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {t(greetingKey)}{isRtl ? t("،") : ','} <span style={{ color: C.primary }}>{session?.user?.name || t('مستخدم النظام')}</span>
            </h1>
            <div style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, marginTop: '4px' }}>
              {(() => {
                const d = new Date();
                const str = d.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                return toEnDigits(str);
              })()}
              <span className="hide-mobile" style={{ margin: '0 8px', color: C.border }}>|</span>
              <span className="hide-mobile" style={{ color: C.textSecondary, fontFamily: OUTFIT }}>{time}</span>
            </div>
          </div>

          <div className="dashboard-period-filter" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '4px', width: '100%' }}>
              {(['today', 'week', 'month'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  style={{
                    flex: 1, padding: '8px 18px', borderRadius: '11px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, transition: 'all 0.2s',
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
        <div className="kpi-grid" style={{
          display: 'grid',
          gridTemplateColumns: isServices || isRestaurants || isContracting ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
          gap: '18px',
          marginBottom: '28px'
        }}>
          {isRestaurants ? (
            <>
              {hasPage('/sales', 'sales') && <KpiCard label={t("مبيعات الكاشير اليوم")} value={fMoneyJSX(stats.salesTodayTotal)} sub={t("إجمالي أوردرات اليوم")} color={C.primary} icon={Store} delay={0} />}
              {hasPage('/items', 'inventory') && <KpiCard label={t("أصناف المنيو")} value={stats.items} sub={t("إجمالي الوجبات والأصناف")} color={C.blue} icon={UtensilsCrossed} delay={60} />}
              {hasPage('/purchases', 'purchases') && <KpiCard label={t("مشتريات المطعم")} value={fMoneyJSX(stats.purchasesTotal)} sub={periodLabel[period]} trend={`↓ ${t('مباشر')}`} trendUp={false} color={C.warning} icon={ShoppingCart} delay={120} />}
              <KpiCard label={t("المصروفات")} value={fMoneyJSX(stats.expensesTotal || 0)} sub={t("إجمالي مدفوعات المصاريف")} color={C.danger} icon={TrendingDown} delay={180} />
              {(hasPage('/sales', 'sales') || hasPage('/purchases', 'purchases')) && (
                <KpiCard label={t("صافي الربح")} value={fMoneyJSX(stats.netProfit)} sub={`${t('هامش')} ${(stats.salesTotal ? (stats.netProfit / stats.salesTotal * 100).toFixed(0) : 0)}%`}
                  trend={stats.netProfit >= 0 ? `↑ ${t('نمو')}` : `↓ ${t('تراجع')}`}
                  trendUp={stats.netProfit >= 0}
                  color={stats.netProfit >= 0 ? C.success : C.danger}
                  icon={BarChart2} delay={240} />
              )}
              {hasPage('/treasuries', 'treasury') && <KpiCard label={t("رصيد الدرج / الخزينة")} value={fMoneyJSX(stats.treasuriesBalance)} sub={t("إجمالي النقدية المتاحة")} color={C.success} icon={Wallet} delay={300} />}
            </>
          ) : isServices ? (
            <>
              <KpiCard label={t("إيرادات اليوم")} value={fMoneyJSX(stats.salesTodayTotal)} sub={t("إجمالي مبيعات الخدمات اليوم")} color={C.primary} icon={Receipt} delay={0} />
              <KpiCard label={t("عدد الخدمات")} value={stats.items} sub={t("إجمالي الخدمات المسجلة")} color={C.blue} icon={Package} delay={60} />
              <KpiCard label={t("عدد العملاء")} value={stats.customers} sub={t("قاعدة العملاء الحالية")} color={C.success} icon={Users} delay={120} />
              <KpiCard label={t("مواعيد اليوم")} value="0" sub={t("لا يوجد مواعيد مسجلة حالياً")} color={C.warning} icon={Clock} delay={180} />
              <KpiCard label={t("المصروفات")} value={fMoneyJSX(stats.expensesTotal || 0)} sub={t("إجمالي مدفوعات المصاريف")} color={C.danger} icon={TrendingDown} delay={240} />
              <KpiCard label={t("صافي الأرباح")} value={fMoneyJSX(stats.netProfit)} sub={t("الإيرادات - المصروفات")} color={C.success} icon={BarChart2} delay={300} />
            </>
          ) : isContracting ? (
            <>
              <KpiCard label={t("المشاريع الكلية")} value={stats.projects?.total || 0} sub={t("إجمالي المشاريع المسجلة")} color={C.primary} icon={FolderKanban} delay={0} />
              <KpiCard label={t("المشاريع النشطة")} value={stats.projects?.active || 0} sub={t("مشاريع قيد العمل والتنفيذ")} color={C.success} icon={BarChart2} delay={60} />
              <KpiCard label={t("قيمة العقود الإجمالية")} value={fMoneyJSX(stats.finances?.contractValue || 0)} sub={t("قيمة عقود المشاريع مع الملاك")} color={C.blue} icon={DollarSign} delay={120} />
              <KpiCard label={t("المستخلصات المعتمدة")} value={fMoneyJSX(stats.finances?.totalBilled || 0)} sub={t("إجمالي المطالبات المالية المعتمدة")} color={C.warning} icon={FileText} delay={180} />
              <KpiCard label={t("عقود مقاولي الباطن")} value={fMoneyJSX(stats.subcontractors?.contractValue || 0)} sub={t("إجمالي قيم عقود الباطن")} color={C.danger} icon={HardHat} delay={240} />
              <KpiCard label={t("مستحقات الباطن المتبقية")} value={fMoneyJSX(stats.subcontractors?.remaining || 0)} sub={t("المبالغ المتبقية لمقاولي الباطن")} color={C.danger} icon={Wallet} delay={300} />
            </>
          ) : (
            <>
              {hasPage('/sales', 'sales') && <KpiCard label={t("إجمالي المبيعات")} value={fMoneyJSX(stats.salesTotal)} sub={periodLabel[period]} trend={`↑ ${t('مباشر')}`} trendUp={true} color={C.primary} icon={TrendingUp} delay={0} />}
              {hasPage('/purchases', 'purchases') && <KpiCard label={t("إجمالي المشتريات")} value={fMoneyJSX(stats.purchasesTotal)} sub={periodLabel[period]} trend={`↓ ${t('مباشر')}`} trendUp={false} color={C.warning} icon={ShoppingCart} delay={60} />}
              {(hasPage('/sales', 'sales') || hasPage('/purchases', 'purchases')) && (
                <KpiCard label={t("صافي الربح")} value={fMoneyJSX(stats.netProfit)} sub={`${t('هامش')} ${(stats.salesTotal ? (stats.netProfit / stats.salesTotal * 100).toFixed(0) : 0)}%`}
                  trend={stats.netProfit >= 0 ? `↑ ${t('نمو')}` : `↓ ${t('تراجع')}`}
                  trendUp={stats.netProfit >= 0}
                  color={stats.netProfit >= 0 ? C.success : C.danger}
                  icon={BarChart2} delay={120} />
              )}
              {hasPage('/treasuries', 'treasury') && <KpiCard label={t("رصيد الخزينة")} value={fMoneyJSX(stats.treasuriesBalance)} sub={t("إجمالي السيولة")} color={C.primary} icon={Wallet} delay={180} />}
              {hasPage('/customers', 'sales') && <KpiCard label={t("ذمم العملاء")} value={fMoneyJSX(stats.topDebtors.reduce((s: any, d: any) => s + d.balance, 0))} sub={`${stats.topDebtors.length} ${t('عملاء')}`} trendUp={false} color={C.danger} icon={Users} delay={240} />}
              {hasPage('/suppliers', 'purchases') && <KpiCard label={t("الموردين")} value={stats.suppliers} sub={t("إجمالي الموردين")} color={C.warning} icon={Truck} delay={300} />}
              {hasPage('/sales', 'sales') && <KpiCard label={t("مبيعات اليوم")} value={fMoneyJSX(stats.salesTodayTotal) as any} sub={t("إحصائيات فورية")} color={C.primary} icon={Eye} delay={360} />}
              {(hasPage('/warehouses', 'inventory') || hasPage('/items', 'inventory')) && (
                <Link href="/reports/low-stock-items" style={{ textDecoration: 'none', display: 'block' }}>
                  <KpiCard label={t("نواقص المخزن")} value={stats.lowStockItems.length} sub={t("أصناف تحت الحد – اضغط للعرض")} color={C.danger} icon={AlertTriangle} delay={420} />
                </Link>
              )}
            </>
          )}
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <LayoutDashboard size={16} color={C.primary} />
            <h3 style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: C.textPrimary }}>{t('الوصول السريع')}</h3>
          </div>
          <div className="dashboard-quick-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            {visibleQuickActions.map((action, i) => (
              <Link key={i} href={action.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: '15px',
                  padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '10px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = C.hover; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.card; }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: action.color, color: action.iconColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 8px 16px -4px ${action.color}`
                  }}>
                    <action.icon size={20} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{action.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Charts & Alerts ── */}
        <div className="charts-alerts-row responsive-grid" style={{
          display: 'grid',
          gridTemplateColumns: (hasPage('/sales', 'sales') || hasPage('/purchases', 'purchases') || isContracting) && (hasPage('/warehouses', 'inventory') || hasPage('/items', 'inventory') || hasPage('/customers', 'sales') || isContracting) ? '2fr 1fr' : '1fr',
          gap: '18px',
          marginBottom: '18px'
        }}>

          {(hasPage('/sales', 'sales') || hasPage('/purchases', 'purchases') || isContracting) && (
            <SectionCard title={isContracting ? t("مستخلصات المالك مقابل عقود الباطن") : isRestaurants ? t("إيرادات المطعم مقابل المنصرفات") : isServices ? t("إيرادات الخدمات مقابل المصروفات") : t("المبيعات مقابل المشتريات")} icon={BarChart2}
              action={<div style={{ fontSize: '11px', color: C.textSecondary, display: 'flex', gap: '15px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.primary }} />{isContracting ? t('مستخلصات المالك') : isRestaurants || isServices ? t('إيرادات') : t('مبيعات')}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isContracting || isRestaurants || isServices ? C.danger : C.warning }} />{isContracting ? t('عقود الباطن') : isRestaurants ? t('منصرفات') : isServices ? t('مصروفات') : t('مشتريات')}</span>
              </div>}>
              <div style={{ padding: '20px 10px 10px', height: '260px', minWidth: 0 }}>
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
                    <XAxis dataKey={isContracting ? "month" : "label"} tick={{ fill: C.textMuted, fontSize: 11, fontFamily: OUTFIT }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.textMuted, fontSize: 10, fontFamily: OUTFIT }} axisLine={false} tickLine={false} tickFormatter={v => Number(v).toLocaleString()} width={40} />
                    <Tooltip content={<ChartTooltip fMoneyJSX={fMoneyJSX} t={t} />} />
                    {isContracting ? (
                      <>
                        <Area type="monotone" dataKey="billed" name={t("مستخلصات المالك")} stroke={C.primary} strokeWidth={3} fill="url(#gSales)" dot={false} />
                        <Area type="monotone" dataKey="subcontractVal" name={t("عقود الباطن")} stroke={C.danger} strokeWidth={2} fill="url(#gDanger)" dot={false} />
                      </>
                    ) : (
                      <>
                        {hasPage('/sales', 'sales') && <Area type="monotone" dataKey="sales" name={isRestaurants || isServices ? t("إيرادات") : t("مبيعات")} stroke={C.primary} strokeWidth={3} fill="url(#gSales)" dot={false} />}
                        {isRestaurants || isServices
                          ? <Area type="monotone" dataKey="expenses" name={isRestaurants ? t("منصرفات") : t("مصروفات")} stroke={C.danger} strokeWidth={2} fill="url(#gDanger)" dot={false} />
                          : (hasPage('/purchases', 'purchases') && <Area type="monotone" dataKey="purchases" name={t("مشتريات")} stroke={C.warning} strokeWidth={2} fill="url(#gPurch)" dot={false} />)
                        }
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          )}

          {isContracting ? (
            <SectionCard title={t("أكبر مستحقات مقاولي الباطن")} icon={HardHat}
              action={<span style={{ fontSize: '11px', color: '#fff', fontWeight: 600, background: C.danger, padding: '3px 10px', borderRadius: '20px' }}>{stats.topSubcontractors?.length || 0} {t('مقاولين')}</span>}>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!stats.topSubcontractors || stats.topSubcontractors.length === 0 ? (
                  <div style={{ padding: '30px', color: C.textSecondary, fontSize: '13px', textAlign: 'center' }}>{t('لا يوجد مقاولي باطن مسجلين')}</div>
                ) : (
                  stats.topSubcontractors.map((sub: any, i: number) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px', background: 'rgba(239,68,68,0.03)',
                      border: `1px solid ${C.danger}15`,
                      borderRadius: '12px', transition: 'all 0.2s'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: C.danger, boxShadow: `0 0 8px ${C.danger}` }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{sub.name}</span>
                      </div>
                      <span style={{ fontFamily: OUTFIT, fontWeight: 700 }}>{fMoneyJSX(sub.balance)}</span>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          ) : hasPage('/treasuries', 'treasury') && (
            <SectionCard title={t("توزيع السيولة النقدية")} icon={Landmark}
              action={<span style={{ fontSize: '11px', color: '#fff', fontWeight: 600, background: C.success, padding: '3px 10px', borderRadius: '20px' }}>{stats.treasuryList?.length || 0} {t('حساب')}</span>}>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {!stats.treasuryList || stats.treasuryList.length === 0 ? (
                  <div style={{ padding: '30px', color: C.textSecondary, fontSize: '13px' }}>{t('لا توجد نقدية مسجلة حالياً')}</div>
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
                        <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t.name}</span>
                      </div>
                      {renderCurrency(t.balance)}
                    </div>
                  ))
                )}
                {stats.treasuryList?.length > 0 && (
                  <div style={{
                    marginTop: '10px', paddingTop: '15px', borderTop: `1px dashed ${C.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 700 }}>{t('إجمالي السيولة المتاحة')}</span>
                    {renderCurrency(stats.treasuryList.reduce((s: any, t: any) => s + t.balance, 0))}
                  </div>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        {/* ── Recent Data Row ── */}
        <div className="recent-data-row responsive-grid" style={{
          display: 'grid',
          gridTemplateColumns: (hasPage('/sales', 'sales') || hasPage('/purchases', 'purchases') || isContracting) && (hasPage('/customers', 'sales') || isContracting) ? '1.6fr 1fr' : '1fr',
          gap: '18px'
        }}>

          {isContracting ? (
            <SectionCard title={t("أكبر المشاريع من حيث قيمة العقد")} icon={FolderKanban}
              action={
                <Link href="/projects" style={{ fontSize: '12px', color: C.primary, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {t('كل المشاريع')} <ArrowUpDown size={14} />
                </Link>
              }>
              <div style={{ padding: '0', maxHeight: '350px', overflowY: 'auto' }} className="scroll-table custom-scrollbar">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                  <thead style={{ position: 'sticky', top: 0, background: C.card, zIndex: 10 }}>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {[t('المشروع والعميل'), t('قيمة العقد'), t('نسبة الإنجاز'), t('الحالة')].map((h, i) => (
                        <th key={i} style={{ padding: '14px 16px', fontSize: '12px', color: C.textSecondary, fontWeight: 600, textAlign: i === 0 ? 'start' : 'center', fontFamily: CAIRO }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topProjects?.map((proj: any, i: number, arr: any[]) => {
                      const status = projectStatusLabels[proj.status] || { label: proj.status, color: C.textSecondary, bg: C.border };
                      return (
                        <tr key={proj.id} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '14px 16px', textAlign: 'start' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>
                              <Link href={`/projects/${proj.id}`} style={{ color: C.textPrimary, textDecoration: 'none' }}
                                onMouseEnter={e => e.currentTarget.style.color = C.primary}
                                onMouseLeave={e => e.currentTarget.style.color = C.textPrimary}>
                                {proj.name}
                              </Link>
                            </div>
                            <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px' }}>{proj.customer?.name || t('بدون عميل')}</div>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '13px', textAlign: 'center', fontFamily: OUTFIT, fontWeight: 700 }}>{fMoneyJSX(proj.contractValue)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                              <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: `${proj.completionPercent}%`, height: '100%', background: C.success }} />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: OUTFIT }}>{proj.completionPercent}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-flex', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 600,
                              background: status.bg, color: status.color, border: `1px solid ${status.color}20`
                            }}>{t(status.label)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : (hasPage('/sales', 'sales') || hasPage('/receipts', 'sales') || hasPage('/purchases', 'purchases') || hasPage('/purchase-payments', 'purchases')) ? (
            <SectionCard title={t("آخر الحركات المالية")} icon={Receipt}
              action={hasPage('reports-financial', 'reports') && (
                <Link href="/reports" style={{ fontSize: '12px', color: C.primary, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {t('عرض التقارير')} <ArrowUpDown size={14} />
                </Link>
              )}>
              <div style={{ padding: '0', maxHeight: '350px', overflowY: 'auto', overflowX: 'auto' }} className="scroll-table custom-scrollbar">
                <table className="recent-invoices-table" style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '20%' }} />
                  </colgroup>
                  <thead style={{ position: 'sticky', top: 0, background: C.card, zIndex: 10 }}>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ padding: '12px 14px', fontSize: '12px', color: C.textSecondary, fontWeight: 600, textAlign: 'start', fontFamily: CAIRO }}>{t('التاريخ والطرف')}</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px', color: C.textSecondary, fontWeight: 600, textAlign: 'center', fontFamily: CAIRO }}>{t('القيمة')}</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px', color: C.textSecondary, fontWeight: 600, textAlign: 'center', fontFamily: CAIRO }}>{t('النوع')}</th>
                      <th style={{ padding: '12px 14px', fontSize: '12px', color: C.textSecondary, fontWeight: 600, textAlign: 'center', fontFamily: CAIRO }}>{t('رقم')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentInvoices
                      ?.filter((inv: any) => {
                        if (inv.type === 'sale' || inv.type === 'sale_return') return hasPage('/sales', 'sales');
                        if (inv.type === 'receipt') return hasPage('/receipts', 'sales');
                        if (inv.type === 'purchase' || inv.type === 'purchase_return') return hasPage('/purchases', 'purchases');
                        if (inv.type === 'payment') return hasPage('/purchase-payments', 'purchases');
                        return true;
                      })
                      .map((inv: any, i: number, arr: any[]) => {
                        const s = statusLabel[inv.type] || { label: inv.type, color: C.textSecondary, bg: C.border };
                        return (
                          <tr key={inv.id} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '12px 14px', textAlign: 'start', overflow: 'hidden' }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.customer?.name || inv.supplier?.name || '—'}</div>
                              <div style={{ fontSize: '11px', color: C.textSecondary, marginTop: '2px', fontFamily: OUTFIT }}>{toEnDigits(new Date(inv.date).toLocaleDateString('en-ZA'))}</div>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap' }}>{renderCurrency(inv.total)}</td>
                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: s.color, background: s.bg, padding: '3px 10px', borderRadius: '30px', border: `1px solid ${s.color}20`, fontFamily: CAIRO, whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t(s.label)}</span>
                            </td>
                            <td style={{ padding: '12px 8px', fontSize: '12px', color: C.primary, fontWeight: 700, fontFamily: OUTFIT, textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {`${inv._isPosOrder ? 'POS-' : getInvoicePrefix(inv.type)}${String(inv.invoiceNumber).padStart(5, '0')}`}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : null}

          {isContracting ? (
            <SectionCard title={t("توزيع المشاريع حسب النوع")} icon={BarChart2}>
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                  <Layers size={14} /> {t('إجمالي قيمة العقود لكل تصنيف')}
                </div>
                {!stats.typeDistribution || stats.typeDistribution.length === 0 ? (
                  <div style={{ padding: '30px', color: C.textSecondary, fontSize: '13px', textAlign: 'center' }}>{t('لا توجد مشاريع مصنفة')}</div>
                ) : (
                  stats.typeDistribution.map((dist: any, i: number) => {
                    const label = projectTypeLabels[dist.projectType] || dist.projectType;
                    return (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', background: 'rgba(255,255,255,0.02)',
                        borderRadius: '12px', border: `1px solid ${C.border}`
                      }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>{label} ({dist._count?.id || 0})</span>
                        <span style={{ fontFamily: OUTFIT, fontWeight: 700 }}>{fMoneyJSX(dist._sum?.contractValue || 0)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </SectionCard>
          ) : hasPage('/customers', 'sales') ? (
            <SectionCard title={t("أكبر مديونيات العملاء")} icon={CreditCard}>
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                  <Users size={14} /> {t('ذمم العملاء المستحقة')}
                </div>
                {stats.topDebtors?.map((d: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'rgba(239,68,68,0.03)',
                    borderRadius: '12px', border: `1px solid ${C.danger}15`
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary }}>{d.name}</span>
                    {renderCurrency(d.balance)}
                  </div>
                ))}

                <div style={{
                  marginTop: '10px', paddingTop: '15px', borderTop: `1px dashed ${C.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 700 }}>{t('إجمالي المطلوب تحصيله')}</span>
                  <div style={{ color: C.danger }}>
                    {renderCurrency(stats.topDebtors?.reduce((s: any, d: any) => s + d.balance, 0) || 0)}
                  </div>
                </div>
              </div>
            </SectionCard>
          ) : null}

        </div>

        <style jsx>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(15px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .dashboard-period-filter button { white-space: nowrap; }
          @media (max-width: 1023px) {
            .dashboard-page-header { flex-direction: column; align-items: flex-start !important; gap: 15px !important; }
            .hide-mobile { display: none !important; }
            .dashboard-period-filter { width: 100% !important; }
            .dashboard-period-filter button { padding: 8px 12px !important; font-size: 12px !important; }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
