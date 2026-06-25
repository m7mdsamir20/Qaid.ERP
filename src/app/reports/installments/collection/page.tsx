'use client';
import TableSkeleton from '@/components/TableSkeleton';
import { formatNumber } from '@/lib/currency';
import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { useRouter } from 'next/navigation';
import { BarChart3, Search, Calendar, CheckCircle2 } from 'lucide-react';
import { C, PAGE_BASE, CAIRO, OUTFIT } from '@/constants/theme';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import { useCurrency } from '@/hooks/useCurrency';

const fmt = (d: string) => new Date(d).toLocaleDateString('en-ZA');
const fmtN = (n: number) => formatNumber(n);

interface CollectionInstallment {
    id: string;
    paidAt?: string | null;
    installmentNo: number;
    paidAmount?: number;
    plan?: {
        planNumber: number;
        customer?: { name: string } | null;
    } | null;
}

interface CollectionReportData {
    total?: number;
    installments?: CollectionInstallment[];
}

export default function CollectionReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';
    const { symbol: cSymbol, fMoneyJSX } = useCurrency();

    const [data, setData] = useState<CollectionReportData | null>(null);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
    });

    const fetchReport = async () => {
        setLoading(true);
        setData(null);
        try {
            const url = `/api/installments/reports?type=collection&from=${form.from}&to=${form.to}`;
            const res = await fetch(url);
            if (res.ok) setData(await res.json());
        } finally { setLoading(false); }
    };

    const getCurrencyName = (code: string) => {
        const map: Record<string, string> = { 'EGP': t("ج.م"), 'SAR': t("ر.س"), 'AED': t("د.إ"), 'USD': '$', 'KWD': t("د.ك"), 'QAR': t("ر.ق"), 'BHD': t("د.ب"), 'OMR': t("ر.ع"), 'JOD': t("د.أ") };
        return map[code] || code;
    };

    const columns: TableColumn[] = [
        {
            header: t('تاريخ التحصيل'),
            type: 'number' as const,
            cell: (row: CollectionInstallment) => (
                <span style={{ fontSize: '13px', color: C.textSecondary, fontFamily: OUTFIT }}>
                    {row.paidAt ? fmt(row.paidAt) : '—'}
                </span>
            )
        },
        {
            header: t('العميل'),
            cell: (row: CollectionInstallment) => (
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>
                    {row.plan?.customer?.name}
                </span>
            )
        },
        {
            header: t('رقم الخطة'),
            type: 'number' as const,
            cell: (row: CollectionInstallment) => (
                <span style={{ fontSize: '13px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>
                    {`PLAN-${String(row.plan?.planNumber || 0).padStart(5, '0')}`}
                </span>
            )
        },
        {
            header: t('القسط'),
            type: 'number' as const,
            cell: (row: CollectionInstallment) => (
                <span style={{ fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }}>
                    {t('قسط رقم')} {row.installmentNo}
                </span>
            )
        },
        {
            header: t('المبلغ المحصّل'),
            type: 'number' as const,
            cell: (row: CollectionInstallment) => (
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#34d399', fontFamily: OUTFIT }}>
                    {fMoneyJSX(row.paidAmount || 0)}
                </span>
            )
        }
    ];

    const filteredData = data?.installments || [];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <style>{`
                    .print-only { display: none; }
                    input[type='date']::-webkit-calendar-picker-indicator { filter: brightness(0) saturate(100%) invert(67%) sepia(43%) saturate(1042%) hue-rotate(186deg) brightness(103%) contrast(97%); cursor: pointer; }
                    @media print {
                        .print-only { display: block !important; }
                        .no-print { display: none !important; }
                        div { background: #fff !important; border-color: #e2e8f0 !important; }
                        div, span, h2, h3, p { color: #000 !important; }
                        th, td { font-size: 10px !important; padding: 6px 10px !important; border: 1px solid #e2e8f0 !important; }
                        body { background: white !important; color: black !important; }
                    }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
                
                <ReportHeader
                    title={t("تقرير تحصيل الأقساط")}
                    subtitle={t("متابعة المبالغ التي تم تحصيلها من العملاء خلال فترة زمنية")}
                    backTab="installments"
                    printTitle={data && (data.installments?.length || 0) > 0 ? t("تقرير تحصيل الأقساط") : undefined}
                    printDate={`${form.from} — ${form.to}`}
                    printLabel={t("الفترة:")}
                />

                <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t("من:")}</span>
                    <div className="date-input-wrapper" style={{ width: '170px' }}>
                        <span className="date-label-mobile" style={{ display: 'none' }}>{t("من:")}</span>
                        <input type="date" value={form.from}
                            onChange={e => setForm(f => ({ ...f, from: e.target.value }))}
                            style={{
                                height: '42px', padding: '0 12px', borderRadius: '12px', border: `1px solid ${C.border}`,
                                background: C.card, color: C.textPrimary, fontSize: '13px',
                                fontWeight: 600, outline: 'none', fontFamily: OUTFIT, width: '100%'
                            }}
                        />
                    </div>
                    <span className="date-label-desktop" style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t("إلى:")}</span>
                    <div className="date-input-wrapper" style={{ width: '170px' }}>
                        <span className="date-label-mobile" style={{ display: 'none' }}>{t("إلى:")}</span>
                        <input type="date" value={form.to}
                            onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
                            style={{
                                height: '42px', padding: '0 12px', borderRadius: '12px', border: `1px solid ${C.border}`,
                                background: C.card, color: C.textPrimary, fontSize: '13px',
                                fontWeight: 600, outline: 'none', fontFamily: OUTFIT, width: '100%'
                            }}
                        />
                    </div>
                    <button onClick={fetchReport} disabled={loading} style={{
                        height: '42px', padding: '0 24px', borderRadius: '12px',
                        background: C.primary, color: '#fff', border: 'none',
                        fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontFamily: CAIRO,
                        boxShadow: '0 4px 12px rgba(37, 106, 244,0.2)'
                    }}>
                        {loading ? <span className="animate-spin">⌛</span> : <Search size={16} />}
                        {t("عرض التقرير")}
                    </button>
                </div>

                <div style={{ minHeight: '300px' }}>
                    {loading && ( <TableSkeleton /> )}

                    {!loading && !data && (
                        <div style={{  padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px', opacity: 0.5 }}>
                            <BarChart3 size={60} style={{ color: C.textSecondary }} />
                            <p style={{ color: C.textSecondary, fontSize: '13px', fontWeight: 500, fontFamily: CAIRO }}>{t("قم باختيار الفترة ثم اضغط على عرض التقرير")}</p>
                        </div>
                    )}

                    {!loading && data && (
                        <div className="report-content" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                            <div className="print-only">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '2px solid #000' }}>
                                    <div style={{ textAlign: 'center'}}>
                                        <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 600, color: '#000', fontFamily: CAIRO }}>{session?.user?.companyName || ''}</h2>
                                        {session?.user?.taxNumber && <div style={{ fontSize: '11px', color: '#333', margin: '2px 0', fontFamily: CAIRO }}>{t("الرقم الضريبي:")} {session?.user?.taxNumber}</div>}
                                    </div>
                                    <div style={{ textAlign: 'center'}}>
                                        <h3 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, color: '#000', fontFamily: CAIRO }}>{t("تقرير تحصيل الأقساط")}</h3>
                                        <div style={{ fontSize: '11px', color: '#000', fontFamily: CAIRO }}>{t("من:")} {form.from} {t("إلى:")} {form.to}</div>
                                    </div>
                                    <div style={{ maxWidth: '150px', textAlign: 'center'}}>
                                        {session?.user?.companyLogo && <img src={session?.user?.companyLogo} alt="logo" style={{ maxWidth: '150px', maxHeight: '70px', objectFit: 'contain' }} />}
                                    </div>
                                </div>
                            </div>

                            {/* ── KPI Cards (Fixed Assets Style) ── */}
                            <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
                                {[
                                    { label: t("إجمالي المحصل"), value: fmtN(data.total || 0), color: '#10b981', icon: <CheckCircle2 size={18} /> },
                                    { label: t("عدد الأقساط"), value: data.installments?.length || 0, color: '#256af4', icon: <Calendar size={18} /> },
                                    { label: t("متوسط التحصيل"), value: fmtN((data.total || 0) / (data.installments?.length || 1)), color: '#f59e0b', icon: <BarChart3 size={18} /> },
                                ].map((s, i) => (
                                    <div key={i} style={{
                                        background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}>
                                        <div style={{ textAlign: 'center'}}>
                                            <p style={{ fontSize: '11px', fontWeight: 500, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                                {i === 0 && <span style={{ fontSize: '10px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>}
                                            </div>
                                        </div>
                                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                            {s.icon}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <DataTable
                                columns={columns}
                                data={filteredData}
                                emptyIcon={BarChart3}
                                emptyMessage={t('لا توجد أقساط محصلة مطابقة للبحث')}
                            />
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
