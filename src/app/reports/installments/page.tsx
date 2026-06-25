'use client';
import TableSkeleton from '@/components/TableSkeleton';
import { formatNumber, getCurrencySymbol } from '@/lib/currency';
import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { BarChart3, Printer, Search, Calendar, User, FileText, CheckCircle2, AlertTriangle, TrendingUp, Info, Wallet, DollarSign, Package, FileDown, Loader2 } from 'lucide-react';
import { C, CAIRO, OUTFIT, IS, LS, SC, STitle, PAGE_BASE, BTN_SUCCESS, BTN_PRIMARY, BTN_DANGER, focusIn, focusOut } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';
import CustomSelect from '@/components/CustomSelect';
import { generateReportHTML, CompanyInfo } from '@/lib/printInvoices';
import { printReportDirectly, downloadReportPDF } from '@/lib/printDirectly';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';



const fmt = (d: string, lang: string) => new Date(d).toLocaleDateString('en-ZA');
const fmtN = (n: number) => formatNumber(n);

interface CustomerOption {
    id: string;
    name: string;
    balance: number;
}

interface InstallmentRow {
    id: string;
    installmentNo: number;
    dueDate: string;
    amount: number;
    paidAmount?: number;
    remaining?: number;
    status?: string;
    paidAt?: string | null;
    daysOverdue?: number;
    plan?: {
        planNumber: number;
        customer?: { name: string } | null;
    } | null;
}

interface InstallmentPlan {
    id: string;
    planNumber: number;
    productName?: string | null;
    monthsCount: number;
    grandTotal: number;
    installments?: InstallmentRow[];
}

interface InstallmentSummary {
    totalPlans: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
}

interface InstallmentReportData {
    total?: number;
    installments?: InstallmentRow[];
    summary?: InstallmentSummary;
    plans?: InstallmentPlan[];
}

type InstallmentTab = 'collection' | 'overdue' | 'customer';

export default function InstallmentReportsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const { symbol: cSymbol, fMoneyJSX } = useCurrency();
    const [activeTab, setActiveTab] = useState<InstallmentTab>('collection');
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [data, setData] = useState<InstallmentReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [company, setCompany] = useState<CompanyInfo>({});
    const [error, setError] = useState('');
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    const [collectionForm, setCollectionForm] = useState({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
    });
    const [overdueCustomer, setOverdueCustomer] = useState('');
    const [customerReport, setCustomerReport] = useState('');

    useEffect(() => {
        fetch('/api/customers').then(r => r.json()).then(setCustomers).catch(() => { });
        fetch('/api/settings').then(r => r.json()).then(d => setCompany(d.company || {})).catch(() => { });
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        setData(null);
        setError('');
        try {
            let url = `/api/installments/reports?type=${activeTab}`;
            if (activeTab === 'collection') {
                url += `&from=${collectionForm.from}&to=${collectionForm.to}`;
            } else if (activeTab === 'overdue' && overdueCustomer) {
                url += `&customerId=${overdueCustomer}`;
            } else if (activeTab === 'customer' && customerReport) {
                url += `&customerId=${customerReport}`;
            }
            const res = await fetch(url);
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                setError(e.error || t('فشل تحميل بيانات التقرير'));
            } else {
                setData(await res.json());
            }
        } catch { setError(t('خطأ في الاتصال بالخادم')); } finally { setLoading(false); }
    };

    const buildInstallmentsHTML = () => {
        const tables = Array.from(document.querySelectorAll('.report-content table'));
        if (!tables.length) return { html: '', title: '' };

        const tablesHTML = tables.map(t => {
            const clone = t.cloneNode(true) as HTMLTableElement;
            return clone.outerHTML;
        }).join('<div style="height:20px"></div>');

        const companyInfo: CompanyInfo = company;
        const titleMap: Record<InstallmentTab, string> = {
            collection: t('تقرير تحصيلات الأقساط'),
            overdue: t('تقرير الأقساط المتأخرة'),
            customer: t('كشف حساب أقساط عميل')
        };

        const subtitle = activeTab === 'collection'
            ? `${t('من تاريخ')} ${collectionForm.from} ${t('إلى')} ${collectionForm.to}`
            : activeTab === 'customer'
                ? `${t('العميل')}: ${customers.find(c => c.id === customerReport)?.name || ''}`
                : t('جميع المتعثرين');

        const html = generateReportHTML(
            titleMap[activeTab],
            tablesHTML,
            companyInfo,
            { subtitle, noAutoPrint: true }
        );

        return { html, title: titleMap[activeTab] };
    };

    const handlePrint = () => {
        const { html, title } = buildInstallmentsHTML();
        if (!html) return;
        printReportDirectly(html, title);
    };

    const handleDownloadPDF = async () => {
        const { html, title } = buildInstallmentsHTML();
        if (!html) return;
        setIsDownloadingPdf(true);
        try {
            await downloadReportPDF(html, title, { silent: true });
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const tabs: Array<{ id: InstallmentTab; label: string; icon: typeof CheckCircle2; sub: string }> = [
        { id: 'collection', label: t('تقرير التحصيلات'), icon: CheckCircle2, sub: t('مراجعة المبالغ الواردة') },
        { id: 'overdue', label: t('تقرير المتأخرات'), icon: AlertTriangle, sub: t('تتبع حالات التعثر') },
        { id: 'customer', label: t('كشف حساب عميل'), icon: FileText, sub: t('سجل الأقساط التاريخي') },
    ];

    const collectionColumns: TableColumn[] = [
        {
            header: t('تاريخ العملية'),
            type: 'number' as const,
            cell: (row: InstallmentRow) => (
                <span style={{ color: C.textSecondary, fontWeight: 700, fontFamily: OUTFIT }}>
                    {row.paidAt ? fmt(row.paidAt, lang) : '—'}
                </span>
            )
        },
        {
            header: t('العميل'),
            cell: (row: InstallmentRow) => (
                <span style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>
                    {row.plan?.customer?.name}
                </span>
            )
        },
        {
            header: t('البيان'),
            cell: (row: InstallmentRow) => (
                <span style={{ color: C.textSecondary }}>
                    {t('قسط رقم')} {row.installmentNo}
                </span>
            )
        },
        {
            header: t('رقم الخطة'),
            type: 'number' as const,
            cell: (row: InstallmentRow) => (
                <span style={{ color: '#5286ed', fontWeight: 600, fontFamily: OUTFIT }}>
                    {`PLAN-${String(row.plan?.planNumber || 0).padStart(5, '0')}`}
                </span>
            )
        },
        {
            header: t('المبلغ المحصّل'),
            type: 'number' as const,
            cell: (row: InstallmentRow) => (
                <span style={{ color: '#10b981', fontWeight: 600, fontFamily: OUTFIT }}>
                    {fMoneyJSX(row.paidAmount || 0)}
                </span>
            )
        }
    ];

    const overdueColumns: TableColumn[] = [
        {
            header: t('العميل'),
            cell: (row: InstallmentRow) => (
                <span style={{ fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>
                    {row.plan?.customer?.name}
                </span>
            )
        },
        {
            header: t('رقم الخطة'),
            type: 'number' as const,
            cell: (row: InstallmentRow) => (
                <span style={{ color: '#5286ed', fontWeight: 600, fontFamily: OUTFIT }}>
                    {`PLAN-${String(row.plan?.planNumber || 0).padStart(5, '0')}`}
                </span>
            )
        },
        {
            header: t('القسط'),
            type: 'number' as const,
            cell: (row: InstallmentRow) => (
                <span style={{ color: C.textSecondary }}>
                    {t('قسط')} {row.installmentNo}
                </span>
            )
        },
        {
            header: t('موعد الاستحقاق'),
            type: 'number' as const,
            cell: (row: InstallmentRow) => (
                <span style={{ color: C.danger, fontWeight: 600, fontFamily: OUTFIT }}>
                    {fmt(row.dueDate, lang)}
                </span>
            )
        },
        {
            header: t('أيام التأخير'),
            type: 'number' as const,
            cell: (row: InstallmentRow) => (
                <div style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '20px', background: 'rgba(251,113,133,0.1)', color: C.danger, fontSize: '11px', fontWeight: 600, border: `1px solid ${C.danger}20`, fontFamily: CAIRO }}>
                    {row.daysOverdue} {t('يوم تأخير')}
                </div>
            )
        },
        {
            header: t('المبلغ المتبقي'),
            type: 'number' as const,
            cell: (row: InstallmentRow) => (
                <span style={{ color: C.danger, fontWeight: 600, fontFamily: OUTFIT }}>
                    {fMoneyJSX(row.remaining || 0)}
                </span>
            )
        }
    ];

    const getCustomerColumns = (): TableColumn[] => [
        {
            header: t('م'),
            type: 'number' as const,
            cell: (row: InstallmentRow) => (
                <span style={{ color: C.primary, fontWeight: 600, fontFamily: OUTFIT }}>
                    {row.installmentNo}
                </span>
            )
        },
        {
            header: t('تاريخ الاستحقاق'),
            type: 'number' as const,
            cell: (row: InstallmentRow) => (
                <span style={{ color: C.textSecondary, fontWeight: 600, fontFamily: OUTFIT }}>
                    {fmt(row.dueDate, lang)}
                </span>
            )
        },
        {
            header: t('مبلغ القسط'),
            type: 'number' as const,
            cell: (row: InstallmentRow) => (
                <span style={{ fontWeight: 600, fontFamily: OUTFIT }}>
                    {fMoneyJSX(row.amount)}
                </span>
            )
        },
        {
            header: t('القيمة المحصلة'),
            type: 'number' as const,
            cell: (row: InstallmentRow) => (
                <span style={{ color: '#10b981', fontWeight: 700, fontFamily: OUTFIT }}>
                    {fMoneyJSX(row.paidAmount || 0)}
                </span>
            )
        },
        {
            header: t('المتبقي'),
            type: 'number' as const,
            cell: (row: InstallmentRow) => (
                <span style={{ color: (row.remaining || 0) > 0 ? C.warning : '#10b981', fontWeight: 600, fontFamily: OUTFIT }}>
                    {fMoneyJSX(row.remaining || 0)}
                </span>
            )
        },
        {
            header: t('الحالة'),
            type: 'number' as const,
            cell: (row: InstallmentRow) => (
                <div style={{
                    display: 'inline-flex', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 600,
                    background: row.status === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(37, 106, 244,0.1)',
                    color: row.status === 'paid' ? '#10b981' : C.primary,
                    border: `1px solid ${row.status === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(37, 106, 244,0.1)'}`
                }}>
                    {row.status === 'paid' ? t('تم التحصيل') : t('قيد الانتظار')}
                </div>
            )
        }
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        .no-print { display: none !important; }
                        body { background: white !important; color: black !important; padding: 0 !important; }
                        .print-only { display: block !important; }
                        .report-card { border: 1px solid #eee !important; box-shadow: none !important; margin-bottom: 20px !important; }
                    }
                    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                    input[type='date']::-webkit-calendar-picker-indicator { filter: brightness(0) saturate(100%) invert(67%) sepia(43%) saturate(1042%) hue-rotate(186deg) brightness(103%) contrast(97%); cursor: pointer; }
                ` }} />

                <div className="no-print">
                    <PageHeader
                        title={t("تقارير الأقساط")}
                        subtitle={t("تحليل التحصيلات، متابعة المديونيات المتأخرة، وإصدار كشوف الحسابات التفصيلية")}
                        icon={BarChart3}
                    />
                </div>

                <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                    {tabs.map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setData(null); }}
                                style={{
                                    padding: '16px', borderRadius: '16px', border: `1px solid ${active ? C.primaryBorder : C.border}`,
                                    background: active ? 'linear-gradient(135deg, rgba(37,106,244,0.1), rgba(37,106,244,0.05))' : C.card,
                                    color: active ? C.primary : C.textSecondary, transition: 'all 0.2s', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'center'}}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: active ? C.primaryBg : 'rgba(255,255,255,0.02)', color: active ? C.primary : C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <tab.icon size={22} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>{tab.label}</div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: active ? C.primary : C.textMuted, marginTop: '2px', fontFamily: CAIRO }}>{tab.sub}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="no-print" style={{ ...SC, marginBottom: '24px', position: 'relative' }}>
                    <div style={STitle}><TrendingUp size={16} /> {t('تصفية النتائج واستخراج التقرير')}</div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>

                        {activeTab === 'collection' && (
                            <>
                                <div style={{ minWidth: '200px' }}>
                                    <label style={LS}>{t('من تاريخ')}</label>
                                    <div className="date-input-wrapper">
                                        <span className="date-label-mobile" style={{ display: 'none' }}>{t("من")}</span>
                                        <input type="date" value={collectionForm.from} onChange={e => setCollectionForm(f => ({ ...f, from: e.target.value }))} style={{ ...IS, paddingInlineEnd: '12px', width: '100%' }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                </div>
                                <div style={{ minWidth: '200px' }}>
                                    <label style={LS}>{t('إلى تاريخ')}</label>
                                    <div className="date-input-wrapper">
                                        <span className="date-label-mobile" style={{ display: 'none' }}>{t("إلى")}</span>
                                        <input type="date" value={collectionForm.to} onChange={e => setCollectionForm(f => ({ ...f, to: e.target.value }))} style={{ ...IS, paddingInlineEnd: '12px', width: '100%' }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'overdue' && (
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <label style={LS}>{t('فلترة حسب العميل (اختياري)')}</label>
                                <CustomSelect
                                    value={overdueCustomer}
                                    onChange={setOverdueCustomer}
                                    options={[{ value: '', label: t('جميع العملاء المديونين') }, ...customers.map(c => ({ value: c.id, label: c.name }))]}
                                    placeholder={t("اختر عميلاً للفلترة...")}
                                    icon={User}
                                />
                            </div>
                        )}

                        {activeTab === 'customer' && (
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <label style={LS}>{t('اختر العميل المعني بكشف الحساب')}</label>
                                <CustomSelect
                                    value={customerReport}
                                    onChange={setCustomerReport}
                                    options={customers.map(c => ({ value: c.id, label: c.name, sub: `${t('رصيد العميل الحالي:')} ${fmtN(c.balance)} ${cSymbol}` }))}
                                    placeholder={t("ابحث واختر العميل من القائمة...")}
                                    icon={User}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={fetchReport} disabled={loading || (activeTab === 'customer' && !customerReport)}
                                style={{ ...BTN_PRIMARY(false, loading), height: '42px', width: 'auto', padding: '0 24px', opacity: (activeTab === 'customer' && !customerReport) ? 0.5 : 1 }}>
                                {loading ? <span className="animate-spin">⌛</span> : <><Search size={18} style={{ color: C.primary }} /> {t('عرض النتائج')}</>}
                            </button>
                            {data && (
                                <>
                                    <button onClick={handleDownloadPDF} disabled={isDownloadingPdf} style={{ ...BTN_DANGER(false, isDownloadingPdf), height: '42px', width: 'auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '8px', cursor: isDownloadingPdf ? 'not-allowed' : 'pointer' }}>
                                        {isDownloadingPdf ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <FileDown size={18} />}
                                        {t('تحميل PDF')}
                                    </button>
                                    <button onClick={handlePrint} style={{ ...BTN_SUCCESS(false, false), height: '42px', width: 'auto', padding: '0 24px' }}>
                                        <Printer size={18} /> {t('طباعة')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', marginBottom: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', color: '#f87171', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>
                        <span style={{ fontSize: '13px' }}>⚠️</span>
                        {error}
                        <button onClick={() => setError('')} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '13px', lineHeight: 1 }}>×</button>
                    </div>
                )}

                <div style={{ minHeight: '400px', animation: 'slideUp 0.3s ease-out' }}>
                    {loading ? ( <TableSkeleton /> ) : !data ? (
                        <div style={{  padding: '120px 0', color: C.textSecondary, textAlign: 'center'}}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <BarChart3 size={40} style={{ opacity: 0.1 }} />
                            </div>
                            <p style={{ fontSize: '15px', fontWeight: 500, fontFamily: CAIRO }}>{t('حدد معايير البحث ثم اضغط على زر "عرض النتائج" لإنشاء التقرير')}</p>
                        </div>
                    ) : (
                        <div className="report-content">

                            {activeTab === 'collection' && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '20px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.2)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <DollarSign size={24} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, fontFamily: CAIRO }}>{t('إجمالي التحصيلات للفترة')}</div>
                                                <div style={{ fontSize: '26px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>
                                                    {fMoneyJSX(data.total || 0)}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center'}}>
                                            <div style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{t('عدد العمليات الصالحة')}</div>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: C.textSecondary, fontFamily: OUTFIT }}>{data.installments?.length || 0}</div>
                                        </div>
                                    </div>

                                    <div style={SC}>
                                        <div style={STitle}><Info size={16} /> {t('قائمة العمليات المسجلة')}</div>
                                        <DataTable
                                            columns={collectionColumns}
                                            data={data.installments || []}
                                            emptyIcon={BarChart3}
                                            emptyMessage={t('لا توجد أقساط محصلة')}
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'overdue' && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '20px', background: 'linear-gradient(135deg, rgba(251,113,133,0.1), rgba(251,113,133,0.05))', borderRadius: '16px', border: `1px solid ${C.danger}30` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(251,113,133,0.15)', color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <AlertTriangle size={24} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '12px', color: C.danger, fontWeight: 600, fontFamily: CAIRO }}>{t('إجمالي المتأخرات القائمة')}</div>
                                                <div style={{ fontSize: '26px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>
                                                    {fMoneyJSX(data.total || 0)}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'center'}}>
                                            <div style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{t('إجمالي الأقساط المتعثرة')}</div>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: C.danger, fontFamily: OUTFIT }}>{data.installments?.length || 0}</div>
                                        </div>
                                    </div>

                                    <div style={SC}>
                                        <div style={STitle}><Info size={16} /> {t('قائمة الأقساط المتجاوزة للموعد')}</div>
                                        <DataTable
                                            columns={overdueColumns}
                                            data={data.installments || []}
                                            emptyIcon={AlertTriangle}
                                            emptyMessage={t('لا توجد أقساط متجاوزة للموعد')}
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'customer' && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                                        {[
                                            { label: t('عدد الخطط المعقدة'), value: data.summary?.totalPlans, icon: Package, color: C.primary },
                                            { label: t('إجمالي قيمة التعاقدات'), value: fmtN(data.summary?.totalAmount || 0), icon: DollarSign, color: C.primary, suffix: getCurrencySymbol(currency, lang) },
                                            { label: t('إجمالي ما تم سداده'), value: fmtN(data.summary?.totalPaid || 0), icon: CheckCircle2, color: '#10b981', suffix: getCurrencySymbol(currency, lang) },
                                            { label: t('صافي الرصيد المستحق'), value: fmtN(data.summary?.totalRemaining || 0), icon: Wallet, color: C.warning, fontWeight: 600, suffix: getCurrencySymbol(currency, lang) },
                                        ].map((s, i) => (
                                            <div key={i} style={{ ...SC, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', border: `1px solid ${s.color}20` }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <s.icon size={16} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{s.label}</div>
                                                    <div style={{ fontSize: '15px', fontWeight: 600, color: s.color, fontFamily: OUTFIT }}>
                                                        {s.value} <span style={{ fontSize: '11px', opacity: 0.5, fontFamily: CAIRO }}>{s.suffix}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                        {data.plans?.map((plan) => (
                                            <div key={plan.id} style={{ ...SC, padding: 0, overflow: 'hidden' }}>
                                                <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div style={{ fontSize: '15px', fontWeight: 600, color: C.primary, fontFamily: OUTFIT }}>{`PLAN-${String(plan.planNumber || 0).padStart(5, '0')}`}</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>
                                                            <Package size={14} /> {plan.productName || t('غير محدد')}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO }}>{plan.monthsCount} {t('شهر')}</div>
                                                    </div>
                                                    <div style={{ fontSize: '15px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>
                                                        {fMoneyJSX(plan.grandTotal)}
                                                    </div>
                                                </div>
                                                <DataTable
                                                    columns={getCustomerColumns()}
                                                    data={plan.installments || []}
                                                    emptyIcon={Package}
                                                    emptyMessage={t('لا توجد أقساط مسجلة لهذه الخطة')}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            ` }} />
        </DashboardLayout>
    );
}
