'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import { useRouter } from 'next/navigation';
import { BarChart3, Printer, Loader2, Search, User, AlertTriangle, ArrowRight, TrendingDown, Calendar } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { THEME, C, PAGE_BASE, CAIRO, OUTFIT } from '@/constants/theme';

const fmt  = (d: string) => new Date(d).toLocaleDateString('en-GB');
const fmtN = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LS: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px'
};

interface CustomerOption {
    id: string;
    name: string;
}

interface OverdueInstallment {
    id: string;
    installmentNo: number;
    dueDate: string;
    daysOverdue: number;
    remaining?: number;
    plan?: {
        planNumber: number;
        customer?: { name: string } | null;
    } | null;
}

interface OverdueReportData {
    total?: number;
    installments?: OverdueInstallment[];
}

export default function OverdueReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const router = useRouter();
    const [customers, setCustomers] = useState<CustomerOption[]>([]);
    const [data,      setData]      = useState<OverdueReportData | null>(null);
    const [loading,   setLoading]   = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState('');

    useEffect(() => {
        fetch('/api/customers').then(r => r.json()).then(setCustomers).catch(() => {});
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        setData(null);
        try {
            let url = `/api/installments/reports?type=overdue`;
            if (selectedCustomer) url += `&customerId=${selectedCustomer}`;
            const res = await fetch(url);
            if (res.ok) setData(await res.json());
        } finally { setLoading(false); }
    };

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
                    title="الأقساط المستحقة"
                    subtitle="كشف مفصل بجميع الأقساط التي تجاوزت موعد استحقاقها ولم تُسدد"
                    backTab="installments"
                    printTitle={data && (data.installments?.length || 0) > 0 ? "الأقساط المستحقة والمتأخرة" : undefined}
                />

                <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO, whiteSpace: 'nowrap' }}>فلترة بعميل:</span>
                    <div style={{ flex: '1', minWidth: '220px', maxWidth: '380px' }}>
                        <CustomSelect
                            value={selectedCustomer}
                            onChange={setSelectedCustomer}
                            options={[{ value: '', label: '-- جميع العملاء --' }, ...customers.map(c => ({ value: c.id, label: c.name }))]}
                            placeholder="اختر عميلاً..."
                            style={{
                                width: '100%', height: '42px', padding: '0 15px',
                                borderRadius: '12px', border: `1px solid ${C.border}`,
                                background: C.card, color: C.textPrimary, fontSize: '13px',
                                fontFamily: CAIRO, fontWeight: 500
                            }}
                        />
                    </div>
                    <button onClick={fetchReport} disabled={loading} style={{
                        height: '42px', padding: '0 24px', borderRadius: '12px',
                        background: C.primary, color: '#fff', border: 'none',
                        fontSize: '13.5px', fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontFamily: CAIRO,
                        boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                    }}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        استخراج التقرير
                    </button>
                </div>

                <div style={{ minHeight: '300px' }}>
                    {loading && (
                        <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                            <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                            <p style={{ color: C.textSecondary, fontSize: '14px', fontWeight: 500, fontFamily: CAIRO }}>جاري تحليل المبيعات المتأخرة...</p>
                        </div>
                    )}

                    {!loading && !data && (
                        <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px', opacity: 0.5 }}>
                            <AlertTriangle size={60} style={{ color: C.textMuted }} />
                            <p style={{ color: C.textMuted, fontSize: '14px', fontWeight: 500, fontFamily: CAIRO }}>اضغط على زر استخراج التقرير لعرض المديونيات</p>
                        </div>
                    )}

                    {!loading && data && (
                        <div className="report-content" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                            <div className="print-only">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '2px solid #000' }}>
                                    <div style={{ textAlign: 'start'}}>
                                        <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 900, color: '#000', fontFamily: CAIRO }}>{session?.user?.companyName || ''}</h2>
                                        {session?.user?.taxNumber && <div style={{ fontSize: '11px', color: '#333', margin: '2px 0', fontFamily: CAIRO }}>الرقم الضريبي: {session?.user?.taxNumber}</div>}
                                    </div>
                                    <div style={{ textAlign: 'start'}}>
                                        <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 900, color: '#000', fontFamily: CAIRO }}>الأقساط المستحقة والمتأخرة</h3>
                                    </div>
                                    <div style={{ maxWidth: '150px', textAlign: 'start'}}>
                                        {session?.user?.companyLogo && <img src={session?.user?.companyLogo} alt="logo" style={{ maxWidth: '150px', maxHeight: '70px', objectFit: 'contain' }} />}
                                    </div>
                                </div>
                            </div>

                            {/* ── KPI Cards (Fixed Assets Style) ── */}
                            <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
                                {[
                                    { label: 'إجمالي المديونية', value: fmtN(data.total || 0), color: '#f87171', icon: <AlertTriangle size={18} /> },
                                    { label: 'أقساط متعثرة', value: data.installments?.length || 0, color: '#fb7185', icon: <TrendingDown size={18} /> },
                                    { label: 'نسبة التعثر', value: `${((data.installments?.length || 0) > 0 ? 100 : 0)}%`, color: '#f59e0b', icon: <BarChart3 size={18} /> },
                                ].map((s, i) => (
                                    <div key={i} style={{
                                        background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}>
                                        <div style={{ textAlign: 'start'}}>
                                            <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: 800, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                                {i === 0 && <span style={{ fontSize: '10px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>}
                                            </div>
                                        </div>
                                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                            {s.icon}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Table */}
                            <div className="print-table-container" style={{
                                background: 'rgba(255, 255, 255, 0.01)', borderRadius: '24px',
                                border: `1px solid ${C.border}`, overflow: 'hidden',
                                boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                            {['العميل', 'رقم الخطة', 'القسط', 'موعد الاستحقاق', 'أيام التأخير', 'المبلغ المتبقي'].map((h, i) => (
                                                <th key={i} style={{ padding: '20px',  fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.installments || []).map((inst, idx: number) => (
                                            <tr key={inst.id} style={{ borderBottom: idx === ((data.installments?.length || 0) - 1) ? 'none' : `1px solid ${C.border}`, transition: 'background 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{inst.plan?.customer?.name}</div>
                                                </td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>PLAN-{String(inst.plan?.planNumber || 1).padStart(4, '0')}</div>
                                                </td>
                                                <td style={{ padding: '16px 20px', color: C.textSecondary, fontSize: '13px', fontFamily: CAIRO }}>قسط رقم {inst.installmentNo}</td>
                                                <td style={{ padding: '16px 20px', color: '#f87171', fontSize: '13px', fontWeight: 700, fontFamily: OUTFIT }}>{fmt(inst.dueDate)}</td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <span style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontWeight: 800, border: '1px solid rgba(239, 68, 68, 0.1)', fontFamily: CAIRO }}>
                                                        {inst.daysOverdue} يوم تأخير
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#f87171', fontFamily: OUTFIT }}>
                                                        {fmtN(inst.remaining || 0)} <span style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}



