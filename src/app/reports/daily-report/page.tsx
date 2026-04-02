'use client';

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { useSession } from 'next-auth/react';
import {
    Calendar, RefreshCw, ShoppingCart, ArrowDownRight,
    ArrowUpRight, Activity, Landmark, Wallet, Loader2, BarChart3
} from 'lucide-react';
import { C, CAIRO, PAGE_BASE, INTER, SEARCH_STYLE } from '@/constants/theme';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const fmt = (n: number) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DailyReportPage() {
    const { data: session } = useSession();
    const currency = (session?.user as any)?.currency || 'EGP';
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => {});
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ date });
            if (branchId && branchId !== 'all') params.set('branchId', branchId);
            const res = await fetch(`/api/reports/daily-report?${params}`);
            if (res.ok) setData(await res.json());
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchReport(); }, [date, branchId]);

    const handlePrint = () => window.print();
    const exportToPDF = () => window.print();

    return (
        <DashboardLayout>
            <div dir="rtl" style={PAGE_BASE}>
                <ReportHeader
                    title="التقرير اليومي للمبيعات والتحصيلات"
                    subtitle="ملخص شامل لكافة العمليات المالية والتجارية التي تمت خلال اليوم."
                    backTab="financial"
                    onExportPdf={exportToPDF}
                />

                <div className="no-print" style={{ ...SEARCH_STYLE.container, marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ color: C.textMuted, fontSize: '12px', fontFamily: CAIRO }}>التاريخ</span>
                        <div style={{ width: '180px' }}>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                style={{
                                    width: '100%', height: '36px', padding: '0 12px', textAlign: 'right', direction: 'rtl',
                                    borderRadius: '8px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textSecondary, fontSize: '13px',
                                    fontWeight: 500, outline: 'none', fontFamily: INTER
                                }}
                            />
                        </div>
                        {branches.length > 1 && (
                            <div style={{ width: '180px' }}>
                                <CustomSelect
                                    value={branchId}
                                    onChange={v => setBranchId(v)}
                                    hideSearch
                                    placeholder="كل الفروع"
                                    options={[
                                        { value: 'all', label: 'كل الفروع' },
                                        ...branches.map((b: any) => ({ value: b.id, label: b.name }))
                                    ]}
                                />
                            </div>
                        )}
                        <button onClick={fetchReport} style={{
                            height: '36px', padding: '0 20px', borderRadius: '8px',
                            background: C.primary, color: '#fff', border: 'none',
                            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO
                        }}>
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> تحديث العرض
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', flexDirection: 'column', gap: '16px', color: '#475569' }}>
                        <Loader2 size={42} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                        <span style={{ fontWeight: 600, fontFamily: CAIRO }}>جاري استخراج وتحليل البيانات اليومية...</span>
                    </div>
                ) : data && (
                    <>
                        {/* Header للطباعة فقط */}
                        <div className="print-only">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '2px solid #000' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 900, color: '#000' }}>
                                        {(session?.user as any)?.companyName || ''}
                                    </h2>
                                    {(session?.user as any)?.taxNumber && (
                                        <div style={{ fontSize: '11px', color: '#333', margin: '2px 0' }}>الرقم الضريبي: {(session?.user as any)?.taxNumber}</div>
                                    )}
                                    {(session?.user as any)?.commercialRegister && (
                                        <div style={{ fontSize: '11px', color: '#333', margin: '2px 0' }}>السجل التجاري: {(session?.user as any)?.commercialRegister}</div>
                                    )}
                                    {(session?.user as any)?.phone && (
                                        <div style={{ fontSize: '11px', color: '#333', margin: '2px 0' }}>الهاتف: {(session?.user as any)?.phone}</div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 900, color: '#000' }}>التقرير اليومي للمبيعات والتحصيلات</h3>
                                    <div style={{ fontSize: '11px', color: '#333' }}>
                                        تاريخ: {new Date(date).toLocaleDateString('en-GB')}
                                    </div>
                                </div>
                                <div style={{ maxWidth: '150px', textAlign: 'left', display: 'flex', alignItems: 'center' }}>
                                    {(session?.user as any)?.companyLogo && (
                                        <img src={(session?.user as any)?.companyLogo} alt="logo"
                                            style={{ maxWidth: '150px', maxHeight: '70px', width: 'auto', height: 'auto', objectFit: 'contain' }} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: 'إجمالي مبيعات اليوم', value: fmt(data.totalSales), color: '#3b82f6', icon: <ShoppingCart size={18} />, sub: `${data.salesCount} فاتورة` },
                                { label: 'إجمالي المقبوضات', value: fmt(data.receipts), color: '#10b981', icon: <ArrowDownRight size={18} />, sub: 'محصل نقدي + بنكي' },
                                { label: 'إجمالي المدفوعات', value: fmt(data.payments), color: '#fb7185', icon: <ArrowUpRight size={18} />, sub: 'مدفوعات ومصاريف' },
                                { label: 'صافي التدفق اليومي', value: fmt(data.receipts - data.payments), color: (data.receipts - data.payments) >= 0 ? '#10b981' : '#fb7185', icon: <Activity size={18} />, sub: 'السيولة الصافية' },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                                    padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s', position: 'relative'
                                }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                >
                                    <div style={{ textAlign: 'right' }}>
                                        <p className="stat-label" style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', whiteSpace: 'nowrap', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span className="stat-value" style={{ fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: INTER }}>{s.value}</span>
                                            <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                        </div>
                                    </div>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Commercial Analysis */}
                                <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', padding: '24px' }}>
                                    <h3 style={{ fontSize: '13px', fontWeight: 900, color: C.textPrimary, marginBottom: '20px', borderBottom: `1px solid ${C.border}`, paddingBottom: '12px', fontFamily: CAIRO }}>
                                        التحليل التجاري التفصيلي
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div style={{ background: 'rgba(59, 130, 246, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <span style={{ color: C.textMuted, fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>إجمالي قيمة المبيعات</span>
                                                <span style={{ color: C.textPrimary, fontWeight: 800, fontSize: '13px', fontFamily: INTER }}>{fmt(data.totalSales)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <span style={{ color: C.textMuted, fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>المرتجعات الواردة (-)</span>
                                                <span style={{ color: '#fb7185', fontWeight: 800, fontSize: '13px', fontFamily: INTER }}>{fmt(data.saleReturnsTotal)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}>
                                                <span style={{ color: C.textPrimary, fontWeight: 800, fontSize: '12px', fontFamily: CAIRO }}>صافي المبيعات</span>
                                                <span style={{ color: '#3b82f6', fontWeight: 900, fontSize: '14px', fontFamily: INTER }}>{fmt(data.totalSales - data.saleReturnsTotal)}</span>
                                            </div>
                                        </div>
                                        <div style={{ background: 'rgba(245, 158, 11, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <span style={{ color: C.textMuted, fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>إجمالي قيمة المشتريات</span>
                                                <span style={{ color: C.textPrimary, fontWeight: 800, fontSize: '13px', fontFamily: INTER }}>{fmt(data.totalPurchases)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <span style={{ color: C.textMuted, fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>المرتجعات الصادرة (-)</span>
                                                <span style={{ color: '#10b981', fontWeight: 800, fontSize: '13px', fontFamily: INTER }}>{fmt(data.purchaseReturnsTotal)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.border}`, paddingTop: '12px' }}>
                                                <span style={{ color: C.textPrimary, fontWeight: 800, fontSize: '12px', fontFamily: CAIRO }}>صافي المشتريات</span>
                                                <span style={{ color: '#f59e0b', fontWeight: 900, fontSize: '14px', fontFamily: INTER }}>{fmt(data.totalPurchases - data.purchaseReturnsTotal)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Total Liquidity for Print */}
                                <div className="print-only" style={{ marginBottom: '24px' }}>
                                    <div className="print-table-container" style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px' }}>
                                        <h3 style={{ fontSize: '13px', fontWeight: 900, color: '#000', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px', fontFamily: CAIRO }}>
                                            ملخص السيولة النقدية المتاحة
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', fontFamily: CAIRO }}>إجمالي السيولة</div>
                                                <div style={{ fontSize: '16px', fontWeight: 900, color: '#000', fontFamily: INTER }}>{fmt(data.totalCashBalance + data.totalBankBalance)}</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', fontFamily: CAIRO }}>النقدية في الخزائن</div>
                                                <div style={{ fontSize: '16px', fontWeight: 900, color: '#000', fontFamily: INTER }}>{fmt(data.totalCashBalance)}</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px', fontFamily: CAIRO }}>الأرصدة البنكية</div>
                                                <div style={{ fontSize: '16px', fontWeight: 900, color: '#000', fontFamily: INTER }}>{fmt(data.totalBankBalance)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Institutions */}
                                <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', padding: '24px' }}>
                                    <h3 style={{ fontSize: '13px', fontWeight: 900, color: C.textPrimary, marginBottom: '20px', borderBottom: `1px solid ${C.border}`, paddingBottom: '12px', fontFamily: CAIRO }}>
                                        أرصدة السيولة الحالية (الخزائن والبنوك)
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                        {data.treasuries.map((t: any, i: number) => (
                                            <div key={i} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                                    <div style={{ width: 28, height: 28, borderRadius: '8px', background: t.type === 'bank' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {t.type === 'bank' ? <Landmark size={15} color="#3b82f6" /> : <Wallet size={15} color="#10b981" />}
                                                    </div>
                                                    <span style={{ fontSize: '13px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t.name}</span>
                                                </div>
                                                <div style={{ fontSize: '18px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>{fmt(t.balance)} <span style={{ fontSize: '11px', fontFamily: CAIRO }}>{getCurrencyName(currency)}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Analysis */}
                            <div className="no-print" style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ padding: '24px', background: 'linear-gradient(145deg, #1e1b4b, #312e81)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                                    <h4 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 800, marginBottom: '20px', fontFamily: CAIRO }}>إجمالي السيولة النقدية المتاحة</h4>
                                    <div style={{ marginBottom: '20px' }}>
                                        <div style={{ fontSize: '28px', fontWeight: 950, color: '#fff', fontFamily: INTER }}>{fmt(data.totalCashBalance + data.totalBankBalance)} <span style={{ fontSize: '12px', fontFamily: CAIRO }}>{getCurrencyName(currency)}</span></div>
                                    </div>
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#c7d2fe', fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>النقدية في الخزائن</span>
                                            <span style={{ color: '#fff', fontWeight: 800, fontSize: '12px', fontFamily: INTER }}>{fmt(data.totalCashBalance)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#c7d2fe', fontSize: '12px', fontWeight: 600, fontFamily: CAIRO }}>الأرصدة البنكية</span>
                                            <span style={{ color: '#fff', fontWeight: 800, fontSize: '12px', fontFamily: INTER }}>{fmt(data.totalBankBalance)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ padding: '20px', background: C.card, borderRadius: '16px', border: `1px solid ${C.border}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: C.primary }}>
                                        <Activity size={18} />
                                        <span style={{ fontWeight: 800, fontSize: '12px', fontFamily: CAIRO }}>دليل التقرير اليومي</span>
                                    </div>
                                    <p style={{ fontSize: '11px', color: C.textMuted, lineHeight: 1.6, margin: 0, fontFamily: CAIRO }}>
                                        يقدم هذا التقرير قراءة شاملة للمركز النقدي المنفذ خلال اليوم التاريخ المختار.
                                        تعتمد الأرقام على الحركات المالية المسجلة فعلياً.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                .print-only { display: none; }
                @media print {
                    .print-only { display: block !important; }
                    .no-print { display: none !important; }
                    .stat-value { font-size: 11px !important; color: #000 !important; }
                    .stat-label { font-size: 9px !important; color: #666 !important; }
                    .print-table-container { background: white !important; border: 1px solid #e2e8f0 !important; border-radius: 0 !important; }
                    
                    div[style*="gridTemplateColumns: 1fr 320px"],
                    div[style*="grid-template-columns: 1fr 320px"] {
                        grid-template-columns: 1fr !important;
                    }
                }
                
                input[type="date"]::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                    opacity: 0.5;
                    cursor: pointer;
                }
            `}</style>
        </DashboardLayout>
    );
}
