'use client';
import React, { useEffect, useState } from 'react';

import { C, CAIRO, PAGE_BASE, IS, INTER } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { Package, ArrowRightLeft, Search, Activity, ShoppingCart, Loader2, ArrowRight, TrendingUp, TrendingDown, DollarSign, FileText } from 'lucide-react';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const fmt = (n: number) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ReturnInvoice {
    id: string;
    invoiceNumber: number;
    type: 'sale_return' | 'purchase_return';
    date: string;
    party: string;
    total: number;
    itemCount: number;
}

export default function ReturnsReportPage() {
    const { data: session } = useSession();
    const currency = (session?.user as any)?.currency || 'EGP';

    const [data, setData] = useState<ReturnInvoice[]>([]);
    const [stats, setStats] = useState({ totalSaleReturns: 0, totalPurchaseReturns: 0 });
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        const params = new URLSearchParams();
        if (branchId && branchId !== 'all') params.set('branchId', branchId);
        fetch(`/api/reports/returns-report?${params}`)
            .then(res => res.json())
            .then(d => {
                if (!d.error) {
                    setData(d.returns);
                    setStats({ totalSaleReturns: d.totalSaleReturns, totalPurchaseReturns: d.totalPurchaseReturns });
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [branchId]);

    const filtered = data.filter(r => (r.party || '').toLowerCase().includes(q.toLowerCase()) || String(r.invoiceNumber).includes(q));

    return (
        <DashboardLayout>
            <div dir="rtl" style={PAGE_BASE}>
                <ReportHeader
                    title="تقرير مرتجعات البيع والشراء"
                    subtitle="متابعة دقيقة لكافة عمليات المرتجع الصادرة والواردة وتأثيرها المالي على المخزون."
                    backTab="sales-purchases"
                    onExportPdf={() => window.print()}
                />


                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: 'إجمالي مرتجع البيع', value: fmt(stats.totalSaleReturns), color: '#ef4444', icon: <TrendingDown size={20} /> },
                        { label: 'إجمالي مرتجع الشراء', value: fmt(stats.totalPurchaseReturns), color: '#3b82f6', icon: <TrendingUp size={20} /> },
                        { label: 'إجمالي عدد الفواتير', value: data.length.toLocaleString('en-US'), color: '#a78bfa', icon: <FileText size={20} /> },
                        { label: 'متوسط قيمة العملية', value: fmt(data.length ? (stats.totalSaleReturns + stats.totalPurchaseReturns) / data.length : 0), color: '#10b981', icon: <Activity size={20} /> },
                    ].map((s, i) => (
                        <div key={i} style={{
                            background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{s.value}</span>
                                    {i !== 2 && <span style={{ fontSize: '10px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>}
                                </div>
                            </div>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                {s.icon}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                placeholder="ابحث برقم الفاتورة أو الطرف الآخر..."
                                value={q} onChange={e => setQ(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 45px 0 15px',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    outline: 'none', fontFamily: CAIRO, fontWeight: 500
                                }}
                            />
                        </div>
                        {branches.length > 1 && (
                            <CustomSelect
                                value={branchId}
                                onChange={v => setBranchId(v)}
                                placeholder="كل الفروع"
                                options={[
                                    { value: 'all', label: 'كل الفروع' },
                                    ...branches.map((b: any) => ({ value: b.id, label: b.name }))
                                ]}
                            />
                        )}
                    </div>

                    {loading ? (
                        <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                            <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                            <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>جاري استرجاع بيانات المرتجعات...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '100px', textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                            <ArrowRightLeft size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>لا توجد مرتجعات مسجلة</h3>
                            <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, fontFamily: CAIRO }}>برجاء تعديل معايير البحث أو تسجيل عمليات جديدة في النظام.</p>
                        </div>
                    ) : (
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        {['رقم الفاتورة', 'التاريخ', 'نوع المرتجع', 'الطرف الآخر', 'الأصناف', 'القيمة الإجمالية'].map((h, i) => (
                                            <th key={i} style={{ 
                                                padding: '16px 20px', fontSize: '12px', color: C.textSecondary, 
                                                textAlign: i === 5 ? 'left' : (i === 4 ? 'center' : 'right'), 
                                                fontWeight: 800, fontFamily: CAIRO 
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((r, idx) => (
                                        <tr key={r.id} 
                                            style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                            <td style={{ padding: '14px 20px', fontSize: '12.5px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>
                                                {r.type === 'sale_return' ? 'SLR-' : 'PUR-'}{String(r.invoiceNumber).padStart(4, '0')}
                                            </td>
                                            <td style={{ padding: '14px 20px', fontSize: '12px', color: C.textMuted, fontFamily: INTER }}>{new Date(r.date).toLocaleDateString('en-GB')}</td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 900, fontFamily: CAIRO,
                                                    background: r.type === 'sale_return' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                                    color: r.type === 'sale_return' ? '#ef4444' : '#3b82f6',
                                                    border: `1px solid ${r.type === 'sale_return' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`
                                                }}>
                                                    {r.type === 'sale_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{r.party}</td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>{r.itemCount} صنف</td>
                                            <td style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 900, color: C.textPrimary, fontSize: '13.5px', fontFamily: INTER }}>
                                                {fmt(r.total)} <span style={{ fontSize: '10px', color: C.textMuted, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                .print-only { display: none; }
                @media print {
                    .print-only { display: block !important; }
                    .no-print { display: none !important; }
                    .stat-value { font-size: 11px !important; color: #000 !important; }
                    .stat-label { font-size: 9px !important; color: #666 !important; }
                    div { background: #fff !important; border-color: #e2e8f0 !important; }
                    div, span, h2, h3, p { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; border: 1px solid #e2e8f0 !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}
