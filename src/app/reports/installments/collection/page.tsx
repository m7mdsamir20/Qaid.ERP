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
import { 
    BarChart3, Printer, Loader2, Search, Calendar, 
    CheckCircle2, ArrowRight 
} from 'lucide-react';
import { THEME, C, PAGE_BASE, CAIRO, INTER } from '@/constants/theme';

const fmt  = (d: string) => new Date(d).toLocaleDateString('en-GB');
const fmtN = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const IS: React.CSSProperties = {
    height: '38px', padding: '0 12px', textAlign: 'start', direction: 'inherit',
    borderRadius: '8px', border: `1px solid ${C.border}`,
    background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
    fontSize: '12px', outline: 'none', boxSizing: 'border-box',
};

const LS: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px'
};

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

    const router = useRouter();
    const [data,      setData]      = useState<CollectionReportData | null>(null);
    const [loading,   setLoading]   = useState(false);

    const [form, setForm] = useState({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        to:   new Date().toISOString().split('T')[0],
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
                    title="تقرير تحصيل الأقساط"
                    subtitle="متابعة المبالغ التي تم تحصيلها من العملاء خلال فترة زمنية"
                    backTab="installments"
                    printTitle={data && (data.installments?.length || 0) > 0 ? "تقرير تحصيل الأقساط" : undefined}
                    printDate={`${form.from} — ${form.to}`}
                    printLabel="الفترة:"
                />

                <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>من:</span>
                    <input type="date" value={form.from}
                        onChange={e => setForm(f => ({ ...f, from: e.target.value }))}
                        style={{
                            height: '42px', padding: '0 12px', borderRadius: '12px', border: `1px solid ${C.border}`,
                            background: C.card, color: C.textPrimary, fontSize: '13px',
                            fontWeight: 600, outline: 'none', fontFamily: INTER, width: '170px'
                        }}
                    />
                    <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>إلى:</span>
                    <input type="date" value={form.to}
                        onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
                        style={{
                            height: '42px', padding: '0 12px', borderRadius: '12px', border: `1px solid ${C.border}`,
                            background: C.card, color: C.textPrimary, fontSize: '13px',
                            fontWeight: 600, outline: 'none', fontFamily: INTER, width: '170px'
                        }}
                    />
                    <button onClick={fetchReport} disabled={loading} style={{
                        height: '42px', padding: '0 24px', borderRadius: '12px',
                        background: C.primary, color: '#fff', border: 'none',
                        fontSize: '13.5px', fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontFamily: CAIRO,
                        boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                    }}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        عرض التقرير
                    </button>
                </div>

                <div style={{ minHeight: '300px' }}>
                    {loading && (
                        <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                            <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                            <p style={{ color: C.textSecondary, fontSize: '14px', fontWeight: 500, fontFamily: CAIRO }}>جاري جلب البيانات...</p>
                        </div>
                    )}

                    {!loading && !data && (
                        <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px', opacity: 0.5 }}>
                            <BarChart3 size={60} style={{ color: C.textMuted }} />
                            <p style={{ color: C.textMuted, fontSize: '14px', fontWeight: 500, fontFamily: CAIRO }}>قم باختيار الفترة ثم اضغط على عرض التقرير</p>
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
                                        <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 900, color: '#000', fontFamily: CAIRO }}>تقرير تحصيل الأقساط</h3>
                                        <div style={{ fontSize: '11px', color: '#000', fontFamily: CAIRO }}>من: {form.from} إلى: {form.to}</div>
                                    </div>
                                    <div style={{ maxWidth: '150px', textAlign: 'start'}}>
                                        {session?.user?.companyLogo && <img src={session?.user?.companyLogo} alt="logo" style={{ maxWidth: '150px', maxHeight: '70px', objectFit: 'contain' }} />}
                                    </div>
                                </div>
                            </div>

                            {/* ── KPI Cards (Fixed Assets Style) ── */}
                            <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
                                {[
                                    { label: 'إجمالي المحصل', value: fmtN(data.total || 0), color: '#10b981', icon: <CheckCircle2 size={18} /> },
                                    { label: 'عدد الأقساط', value: data.installments?.length || 0, color: '#3b82f6', icon: <Calendar size={18} /> },
                                    { label: 'متوسط التحصيل', value: fmtN((data.total || 0) / (data.installments?.length || 1)), color: '#f59e0b', icon: <BarChart3 size={18} /> },
                                ].map((s, i) => (
                                    <div key={i} style={{
                                        background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}>
                                        <div style={{ textAlign: 'start'}}>
                                            <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>{s.value}</span>
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
                                            {['تاريخ التحصيل', 'العميل', 'رقم الخطة', 'القسط', 'المبلغ المحصّل'].map((h, i) => (
                                                <th key={i} style={{ padding: '20px', textAlign: 'start', fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.installments || []).map((inst, idx: number) => (
                                            <tr key={inst.id} style={{ borderBottom: idx === ((data.installments?.length || 0) - 1) ? 'none' : `1px solid ${C.border}`, transition: 'background 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '16px 20px', color: C.textSecondary, fontSize: '13px', fontFamily: INTER }}>{inst.paidAt ? fmt(inst.paidAt) : '—'}</td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{inst.plan?.customer?.name}</div>
                                                </td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.primary, fontFamily: INTER }}>PLAN-{String(inst.plan?.planNumber || 0).padStart(4, '0')}</div>
                                                </td>
                                                <td style={{ padding: '16px 20px', color: C.textSecondary, fontSize: '13px', fontFamily: CAIRO }}>قسط رقم {inst.installmentNo}</td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#34d399', fontFamily: INTER }}>
                                                        {fmtN(inst.paidAmount || 0)} <span style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
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



