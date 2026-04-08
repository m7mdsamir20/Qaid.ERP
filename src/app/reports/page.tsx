'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { C, CAIRO, PAGE_BASE } from '@/constants/theme';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    PieChart, Wallet, TrendingUp, TrendingDown, Landmark, Activity,
    ShoppingCart, Truck, FileBarChart2, ArrowRightLeft, ScrollText, AlertTriangle, Layers,
    Receipt, FileText, BarChart3, Package, Users, Briefcase, CreditCard, DollarSign
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { navSections } from '@/constants/navigation';

/* ── Report Link Types ── */
interface ReportLink {
    title: string;
    description: string;
    href: string;
    icon: any;
    color: string;
    status: 'ready' | 'new';
    requiredPages?: string[];
}

export default function ReportsHubPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const router = useRouter();

    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';

    const REPORTS_DATA: Record<string, ReportLink[]> = {
        'financial': [
            { title: 'كشف الحساب (دفتر الأستاذ)', description: 'تتبع حركات أي حساب (مدين/دائن) خلال فترة زمنية محددة مع الرصيد', href: '/reports/general-ledger', icon: ScrollText, color: '#3b82f6', status: 'ready', requiredPages: ['/accounts'] },
            { title: 'التقرير اليومي', description: isServices ? 'ملخص شامل لجميع حركات اليوم (خدمات، مشتريات، سندات)' : 'ملخص شامل لجميع حركات اليوم (مبيعات، مشتريات، سندات)', href: '/reports/daily-report', icon: Activity, color: '#f43f5e', status: 'ready', requiredPages: ['/sales', '/purchases'] },
            { title: 'ميزان المراجعة', description: 'أرصدة جميع الحسابات المدينة والدائنة', href: '/reports/trial-balance', icon: FileBarChart2, color: '#6366f1', status: 'ready', requiredPages: ['/accounts'] },
            { title: 'قائمة الدخل', description: 'تحليل الإيرادات والمصروفات وصافي الربح', href: '/reports/income-statement', icon: PieChart, color: '#a78bfa', status: 'ready', requiredPages: ['/accounts'] },
            { title: 'المركز المالي', description: 'ملخص الأصول والخصوم وحقوق الملكية', href: '/reports/balance-sheet', icon: Landmark, color: '#34d399', status: 'ready', requiredPages: ['/accounts'] },
            { title: 'الميزانية العمومية', description: 'تفاصيل دقيقة وشاملة للمركز المالي', href: '/reports/detailed-balance-sheet', icon: Layers, color: '#10b981', status: 'ready', requiredPages: ['/accounts'] },
            { title: 'تقرير الأصول الثابتة', description: 'كشف تفصيلي بالأصول — التكلفة التاريخية ومجمع الإهلاك والقيمة الدفترية', href: '/reports/fixed-assets', icon: Briefcase, color: '#f472b6', status: 'ready', requiredPages: ['/fixed-assets'] },
            { title: 'قائمة التدفق النقدي', description: 'حركة السيولة والتحليل النقدي الشامل', href: '/reports/cash-flow', icon: Activity, color: '#f43f5e', status: 'ready', requiredPages: ['/accounts'] },
        ],
        'sales-purchases': [
            { title: isServices ? 'تقرير الخدمات' : 'تقرير المبيعات', description: isServices ? 'حركة طلب الخدمات خلال فترة زمنية' : 'حركة المبيعات خلال فترة زمنية', href: '/reports/sales-report', icon: BarChart3, color: '#0ea5e9', status: 'ready', requiredPages: ['/sales'] },
            { title: 'تقرير المشتريات', description: 'إجمالي المشتريات وتفاصيل الفواتير', href: '/reports/purchases-report', icon: ShoppingCart, color: '#fb923c', status: 'ready', requiredPages: ['/purchases'] },
            { title: isServices ? 'أكثر الخدمات طلباً' : 'أكثر الأصناف مبيعاً', description: isServices ? 'الخدمات الأعلى طلباً في المنشأة' : 'المنتجات الأعلى حركة طلباً ومبيعاً', href: '/reports/top-selling-items', icon: TrendingUp, color: '#eab308', status: 'ready', requiredPages: ['/sales'] },
            { title: isServices ? 'مرتجعات الخدمات' : 'تقرير المرتجعات', description: isServices ? 'تحليل مرتجعات الخدمات لمعرفة الأسباب' : 'تحليل المرتجعات لمعرفة أسباب الخسارة', href: '/reports/returns-report', icon: ArrowRightLeft, color: '#f43f5e', status: 'ready', requiredPages: ['/sale-returns'] },
        ],
        'inventory': [
            { title: isServices ? 'قائمة الخدمات' : 'تقرير المخزون', description: isServices ? 'قائمة جميع الخدمات المسجلة وأسعارها' : 'حالة المخازن وأرصدة الأصناف والجرد', href: '/reports/inventory-report', icon: Package, color: '#8b5cf6', status: 'ready', requiredPages: ['/items'] },
            { title: isServices ? 'تصنيفات الخدمات' : 'حركات المخزون', description: isServices ? 'عرض الخدمات حسب التصنيفات' : 'سجل شامل لجميع عمليات الصرف والتوريد والتحويل المخزني', href: isServices ? '/categories' : '/stock-movements', icon: isServices ? Layers : ArrowRightLeft, color: '#3b82f6', status: 'ready', requiredPages: ['/categories', '/stock-movements'] },
            { title: isServices ? 'إحصائيات الخدمات' : 'حركة صنف', description: isServices ? 'تحليل حركة طلب خدمة معينة' : 'مراقبة الصادر والوارد لصنف معين ككارتة صنف', href: '/reports/item-movement', icon: Activity, color: '#f59e0b', status: 'ready', requiredPages: ['/items', '/stock-movements'] },
            ...(!isServices ? [{ title: 'أصناف تحت الحد الأدنى', description: 'تنبيهات الأصناف التي تجاوزت حد إعادة الطلب', href: '/reports/low-stock-items', icon: AlertTriangle, color: '#ef4444', status: 'ready' as any, requiredPages: ['/items'] }] : []),
        ],
        'partners': [
            { title: 'أرصدة العملاء والموردين', description: 'تقرير إجمالي لجميع العملاء والموردين يعرض من عليه أموال ومن له مستحقات', href: '/reports/clients-suppliers-balances', icon: Users, color: '#3b82f6', status: 'ready', requiredPages: ['/customers', '/suppliers'] },
            { title: 'كشف حساب عميل', description: 'تفاصيل مدفوعات ومديونيات العميل', href: '/reports/customer-statement', icon: ScrollText, color: '#14b8a6', status: 'ready', requiredPages: ['/customers'] },
            { title: 'كشف حساب مورد', description: 'حركة الحساب المالي الجاري للمورد', href: '/reports/supplier-statement', icon: ScrollText, color: '#8b5cf6', status: 'ready', requiredPages: ['/suppliers'] },
            { title: 'أعمار الديون', description: 'تأخيرات السداد والمستحقات الزمنية', href: '/reports/aging-report', icon: FileText, color: '#f43f5e', status: 'ready', requiredPages: ['/customers', '/suppliers'] },
        ],
        'treasury-bank': [
            { title: 'كشف حركة الخزينة', description: 'سجل حركات النقدية اليومي مع رصيد ما قبل وما بعد كل حركة', href: '/reports/cash-statement', icon: Wallet, color: '#10b981', status: 'ready', requiredPages: ['/treasuries'] },
            { title: 'كشف حساب بنكي', description: 'تحليل حركات الحساب البنكي والتحويلات والخدمات البنكية', href: '/reports/bank-statement', icon: Landmark, color: '#3b82f6', status: 'ready', requiredPages: ['/treasuries'] },
            { title: 'تقرير العجز والزيادة', description: 'مقارنة الرصيد الدفتري بالرصيد الفعلي عند الجرد اليومي', href: '/reports/treasury-reconciliation', icon: Activity, color: '#f59e0b', status: 'ready', requiredPages: ['/treasuries'] },
            { title: 'تقرير المصروفات', description: 'عرض تفصيلي لجميع المصروفات المسجلة خلال فترة زمنية محددة', href: '/reports/expenses-report', icon: TrendingDown, color: '#ef4444', status: 'ready', requiredPages: ['/expenses'] },
        ],
        'hr': [
            { title: 'كشف رواتب الموظفين', description: 'تفاصيل مسيرات الرواتب، البدلات، والاستقطاعات لكل شهر', href: '/reports/payroll-statement', icon: DollarSign, color: '#10b981', status: 'ready', requiredPages: ['/payrolls'] },
            { title: 'تقرير السلف والمديونيات', description: 'متابعة سلف الموظفين والأرصدة المتبقية وتاريخ السداد', href: '/reports/employees-advances', icon: Wallet, color: '#f59e0b', status: 'ready', requiredPages: ['/employees'] },
            { title: 'سجل الخصومات والجزاءات', description: 'كشف شامل بجميع الجزاءات والخصومات الموقعة خلال الفترة', href: '/reports/employees-deductions', icon: AlertTriangle, color: '#ef4444', status: 'ready', requiredPages: ['/employees'] },
            { title: 'بيانات الموظفين والأقسام', description: 'قائمة شاملة بجميع الموظفين وتبعيتهم للأقسام وحالتهم الوظيفية', href: '/reports/employees-catalog', icon: Users, color: '#3b82f6', status: 'ready', requiredPages: ['/employees'] },
        ],
        'installments': [
            { title: 'تقارير التحصيل', description: 'متابعة المبالغ المحصلة من الأقساط خلال فترة زمنية محددة', href: '/reports/installments/collection', icon: FileText, color: '#34d399', status: 'ready', requiredPages: ['/installments'] },
            { title: 'تقرير المتأخرات الشامل', description: 'كشف بجميع المديونيات المتأخرة وحساب أيام التأخير لكل عميل', href: '/reports/installments/overdue', icon: AlertTriangle, color: '#f43f5e', status: 'ready', requiredPages: ['/installments'] },
            { title: 'كشف حساب أقساط عميل', description: 'ملخص شامل لكل خطط التقسيط الخاصة بعميل معين وتفاصيل سداده', href: '/reports/installments/customer-statement', icon: Users, color: '#818cf8', status: 'ready', requiredPages: ['/installments'] },
        ]
    };

    const userPermissions = (session?.user as any)?.permissions || {};
    const reportsPerms = userPermissions['التقارير الإحصائية'] || {};
    const isAdmin = session?.user?.role === 'admin' || (session?.user as any)?.isSuperAdmin;
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin;
    const featuresRaw = (session?.user as any)?.subscription?.features;
    const hasSubscription = !!(session?.user as any)?.subscription;

    const enabledFeatures: Record<string, string[]> = (() => {
        if (!featuresRaw) return {};
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

    const hasPageAccess = (pageId: string, featureKey?: string): boolean => {
        if (isSuperAdmin) return true;
        
        // 1. تحقق من الـ subscription
        if (hasSubscription && featureKey) {
            const pagesInSub = enabledFeatures[featureKey] || [];
            if (!pagesInSub.includes(pageId)) return false;
        }

        // 2. لو admin واجتاز اشتراك الموديول يتم السماح له
        if (session?.user?.role === 'admin') return true;

        // 3. التحقق من صلاحية الجرانيولار للموظفين
        return !!userPermissions[pageId]?.view;
    };

    const hasFeatureAccess = (featureKey: string): boolean => {
        if (isSuperAdmin) return true;
        const section = navSections.find(s => s.featureKey === featureKey);
        if (!section) return false;
        return section.links.some(l => hasPageAccess(l.id, featureKey));
    };

    const TABS = [
        { 
            key: 'financial', 
            label: 'التقارير المالية', 
            icon: Wallet,
            requiredFeatures: ['accounting'],
            requiredPages: ['/accounts']
        },
        { 
            key: 'sales-purchases', 
            label: (() => {
                const salesLabel = isServices ? 'الخدمات' : 'المبيعات';
                const canSeeSales = hasPageAccess('/sales', 'sales');
                const canSeePurchases = hasPageAccess('/purchases', 'purchases');
                if (canSeeSales && canSeePurchases) return `${salesLabel} والمشتريات`;
                if (canSeeSales) return salesLabel;
                if (canSeePurchases) return 'المشتريات';
                return isServices ? 'تقارير الخدمات' : 'تقارير المبيعات';
            })(),
            icon: ShoppingCart,
            requiredFeatures: ['sales', 'purchases']
        },
        { 
            key: 'inventory', 
            label: isServices ? 'تقارير الخدمات' : 'تقارير المخزون', 
            icon: isServices ? Layers : Package,
            requiredFeatures: ['inventory'],
            requiredPages: ['/items']
        },
        { 
            key: 'partners', 
            label: (() => {
                const hasCustomers = hasPageAccess('/customers', 'partners') || hasPageAccess('/partners', 'partners');
                const hasSuppliers = hasPageAccess('/suppliers', 'partners');
                if (hasCustomers && hasSuppliers) return 'العملاء والموردين';
                if (hasCustomers) return 'تقارير العملاء';
                return 'تقارير الموردين';
            })(),
            icon: Users,
            requiredFeatures: ['partners']
        },
        { 
            key: 'treasury-bank', 
            label: 'الخزن والبنوك', 
            icon: Landmark,
            requiredFeatures: ['treasury'],
            requiredPages: ['/treasuries']
        },
        { 
            key: 'hr', 
            label: 'تقارير الموظفين', 
            icon: Users,
            requiredFeatures: ['hr'],
            requiredPages: ['/employees']
        },
        { 
            key: 'installments', 
            label: 'تقارير الأقساط', 
            icon: CreditCard,
            requiredFeatures: ['installments'],
            requiredPages: ['/installments']
        },
    ];

    const hasModuleAccess = (tab: any) => {
        if (isSuperAdmin) return true;

        // 1. تحقق من صلاحية التبويب في موديول التقارير الإحصائية (للموظفين فقط)
        if (!isAdmin && reportsPerms[`reports-${tab.key}`]?.view !== true) return false;

        // 2. تحقق هل يملك صلاحية على الموارد الأصلية
        const targetFeatures = tab.requiredFeatures || [];
        return targetFeatures.some((fKey: string) => hasFeatureAccess(fKey));
    };

    const visibleTabs = TABS.filter(tab => hasModuleAccess(tab));

    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<string>(() => {
        const t = searchParams.get('tab');
        if (t && REPORTS_DATA[t]) return t;
        if (visibleTabs.length > 0) return visibleTabs[0].key;
        return 'financial';
    });

    useEffect(() => {
        const t = searchParams.get('tab');
        if (t && REPORTS_DATA[t]) setActiveTab(t);
    }, [searchParams]);

    const renderCards = (groupKey: string) => {
        const reports = (REPORTS_DATA[groupKey] || []).filter(report => {
            if (isSuperAdmin) return true;
            if (!report.requiredPages || report.requiredPages.length === 0) return true;
            // استخدام نفس منطق الوصول الجديد لفلترة الكروت
            return report.requiredPages.some(pageId => {
                const featureKey = navSections.find(s => s.links.some(l => l.id === pageId))?.featureKey;
                return hasPageAccess(pageId, featureKey);
            });
        });

        if (reports.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: `1px dashed ${C.border}` }}>
                    <p style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>لا تملك صلاحيات لعرض أي تقارير في هذا القسم.</p>
                </div>
            );
        }

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '20px' }}>
                {reports.map((report, idx) => (
                    <div
                        key={idx}
                        onClick={() => router.push(report.href)}
                        style={{
                            background: C.card,
                            border: `1px solid ${C.border}`,
                            borderRadius: '20px',
                            padding: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = report.color;
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = `0 12px 24px ${report.color}15`;
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = C.border;
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 4px 20px -10px rgba(0,0,0,0.3)';
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '14px', background: `${report.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <report.icon size={22} color={report.color} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>
                                {report.title.includes('(') ? (
                                    <>
                                        {report.title.split('(')[0]}
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, marginInlineEnd: '4px' }}>
                                            ({report.title.split('(')[1]}
                                        </span>
                                    </>
                                ) : report.title}
                            </h3>
                        </div>
                        <p style={{ margin: 0, fontSize: '11.5px', color: C.textSecondary, lineHeight: 1.5, fontFamily: CAIRO }}>{report.description}</p>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <PageHeader
                    title="التقارير الشاملة"
                    subtitle="الواجهة المركزية لمنظومة تقارير النظام. تصفح وحلل كافة البيانات المالية والإدارية بدقة عالية."
                    icon={PieChart}
                />

                {/* ── Tabs Navigation ── */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '30px' }}>
                    {visibleTabs.map(tab => {
                        const active = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '10px 18px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: active ? 'rgba(37,106,244,0.1)' : C.card,
                                    color: active ? C.primary : C.textSecondary,
                                    fontWeight: active ? 900 : 700,
                                    fontSize: '12px',
                                    fontFamily: CAIRO,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                                    whiteSpace: 'nowrap',
                                    boxShadow: active ? `0 4px 12px rgba(37,106,244,0.1)` : '0 2px 8px rgba(0,0,0,0.05)'
                                }}
                                onMouseEnter={e => {
                                    if (!active) { e.currentTarget.style.background = 'rgba(37,106,244,0.05)'; e.currentTarget.style.color = C.primary; }
                                }}
                                onMouseLeave={e => {
                                    if (!active) { e.currentTarget.style.background = C.card; e.currentTarget.style.color = C.textSecondary; }
                                }}
                            >
                                <tab.icon size={18} /> {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* ── Tab Content ── */}
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    {renderCards(activeTab)}
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </DashboardLayout>
    );
}
