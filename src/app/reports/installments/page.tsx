'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { BarChart3, Printer, Loader2, Search, Calendar, User, FileText, CheckCircle2, AlertTriangle, TrendingUp, Info, Wallet, DollarSign, Package } from 'lucide-react';
import { THEME, C, CAIRO, INTER, IS, LS, SC, STitle, PAGE_BASE, BTN_SUCCESS, BTN_PRIMARY, focusIn, focusOut } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useCurrency } from '@/hooks/useCurrency';
import CustomSelect from '@/components/CustomSelect';

const fmt  = (d: string) => new Date(d).toLocaleDateString('en-GB');
const fmtN = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InstallmentReportsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const { symbol: cSymbol } = useCurrency();
    const [activeTab, setActiveTab] = useState<'collection' | 'overdue' | 'customer'>('collection');
    const [customers, setCustomers] = useState<any[]>([]);
    const [data,      setData]      = useState<any>(null);
    const [loading,   setLoading]   = useState(false);

    const [collectionForm, setCollectionForm] = useState({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        to:   new Date().toISOString().split('T')[0],
    });
    const [overdueCustomer, setOverdueCustomer]   = useState('');
    const [customerReport,  setCustomerReport]    = useState('');

    useEffect(() => {
        fetch('/api/customers').then(r => r.json()).then(setCustomers).catch(() => {});
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        setData(null);
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
            if (res.ok) setData(await res.json());
        } catch { } finally { setLoading(false); }
    };

    const handlePrint = () => {
        window.print();
    };

    const tabs = [
        { id: 'collection', label: 'تقرير التحصيلات', icon: CheckCircle2, sub: 'مراجعة المبالغ الواردة' },
        { id: 'overdue',    label: 'تقرير المتأخرات', icon: AlertTriangle, sub: 'تتبع حالات التعثر' },
        { id: 'customer',   label: 'كشف حساب عميل', icon: FileText, sub: 'سجل الأقساط التاريخي' },
    ];

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>
                
                {/* Print Styles */}
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        .no-print { display: none !important; }
                        body { background: white !important; color: black !important; padding: 0 !important; }
                        .print-only { display: block !important; }
                        .report-card { border: 1px solid #eee !important; box-shadow: none !important; margin-bottom: 20px !important; }
                    }
                    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                ` }} />
                
                {/* Header Section */}
                <div className="no-print">
                    <PageHeader 
                        title="تقارير الأقساط" 
                        subtitle="تحليل التحصيلات، متابعة المديونيات المتأخرة، وإصدار كشوف الحسابات التفصيلية" 
                        icon={BarChart3} 
                    />
                </div>

                {/* Tabs Selector */}
                <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                    {tabs.map(t => {
                        const active = activeTab === t.id;
                        return (
                            <button key={t.id} onClick={() => { setActiveTab(t.id as 'collection' | 'overdue' | 'customer'); setData(null); }}
                                style={{
                                    padding: '16px', borderRadius: '16px', border: `1px solid ${active ? C.primaryBorder : C.border}`,
                                    background: active ? 'linear-gradient(135deg, rgba(37,106,244,0.1), rgba(37,106,244,0.05))' : C.card,
                                    color: active ? C.primary : C.textSecondary, transition: 'all 0.2s', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'start'
                                }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: active ? C.primaryBg : 'rgba(255,255,255,0.02)', color: active ? C.primary : C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <t.icon size={22} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', fontWeight: 800 , fontFamily: CAIRO}}>{t.label}</div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: active ? C.primary : C.textMuted, marginTop: '2px' , fontFamily: CAIRO}}>{t.sub}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Filters Section */}
                <div className="no-print" style={{ ...SC, marginBottom: '24px', position: 'relative' }}>
                    <div style={STitle}><TrendingUp size={16} /> تصفية النتائج واستخراج التقرير</div>
                    
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
                        
                        {activeTab === 'collection' && (
                            <>
                                <div style={{ minWidth: '200px' }}>
                                    <label style={LS}>من تاريخ</label>
                                    <div style={{ position: 'relative' }}>
                                        <Calendar size={16} style={{ position: 'absolute', insetInlineEnd: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                                        <input type="date" value={collectionForm.from} onChange={e => setCollectionForm(f => ({ ...f, from: e.target.value }))} style={{ ...IS, paddingInlineEnd: '44px', width: '100%', colorScheme: 'dark', fontFamily: INTER }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                </div>
                                <div style={{ minWidth: '200px' }}>
                                    <label style={LS}>إلى تاريخ</label>
                                    <div style={{ position: 'relative' }}>
                                        <Calendar size={16} style={{ position: 'absolute', insetInlineEnd: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                                        <input type="date" value={collectionForm.to} onChange={e => setCollectionForm(f => ({ ...f, to: e.target.value }))} style={{ ...IS, paddingInlineEnd: '44px', width: '100%', colorScheme: 'dark', fontFamily: INTER }} onFocus={focusIn} onBlur={focusOut} />
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'overdue' && (
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <label style={LS}>فلترة حسب العميل (اختياري)</label>
                                <CustomSelect 
                                    value={overdueCustomer} 
                                    onChange={setOverdueCustomer}
                                    options={[{ value: '', label: 'جميع العملاء المديونين' }, ...customers.map(c => ({ value: c.id, label: c.name }))]}
                                    placeholder="اختر عميلاً للفلترة..."
                                    icon={User}
                                />
                            </div>
                        )}

                        {activeTab === 'customer' && (
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <label style={LS}>اختر العميل المعني بكشف الحساب</label>
                                <CustomSelect 
                                    value={customerReport} 
                                    onChange={setCustomerReport}
                                    options={customers.map(c => ({ value: c.id, label: c.name, sub: `رصيد العميل الحالي: ${fmtN(c.balance)} ${cSymbol}` }))}
                                    placeholder="ابحث واختر العميل من القائمة..."
                                    icon={User}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={fetchReport} disabled={loading || (activeTab === 'customer' && !customerReport)}
                                style={{ ...BTN_PRIMARY(false, loading), height: '42px', width: 'auto', padding: '0 24px', opacity: (activeTab === 'customer' && !customerReport) ? 0.5 : 1 }}>
                                {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <><Search size={18} /> عرض النتائج</>}
                            </button>
                            {data && (
                                <button onClick={handlePrint} style={{ ...BTN_SUCCESS(false, false), height: '42px', width: 'auto', padding: '0 24px' }}>
                                    <Printer size={18} /> طباعة
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Results Container */}
                <div style={{ minHeight: '400px', animation: 'slideUp 0.3s ease-out' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '120px 0', color: C.textMuted }}>
                            <Loader2 size={42} style={{ animation: 'spin 1s linear infinite', color: C.primary, marginBottom: '16px' }} />
                            <p style={{ fontSize: '12px', fontWeight: 600 , fontFamily: CAIRO}}>جاري استخراج وتحليل بيانات التقرير...</p>
                        </div>
                    ) : !data ? (
                        <div style={{ textAlign: 'center', padding: '120px 0', color: C.textMuted }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <BarChart3 size={40} style={{ opacity: 0.1 }} />
                            </div>
                            <p style={{ fontSize: '15px', fontWeight: 500 , fontFamily: CAIRO}}>حدد معايير البحث ثم اضغط على زر "عرض النتائج" لإنشاء التقرير</p>
                        </div>
                    ) : (
                        <div className="report-content">
                            
                            {/* Detailed Sections based on Tab */}
                            {activeTab === 'collection' && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '20px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.2)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <DollarSign size={24} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 800 , fontFamily: CAIRO}}>إجمالي التحصيلات للفترة</div>
                                                <div style={{ fontSize: '26px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>
                                                    {fmtN(data.total || 0)} <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7 , fontFamily: CAIRO}}>{cSymbol}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'end' }}>
                                            <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700 , fontFamily: CAIRO}}>عدد العمليات الصالحة</div>
                                            <div style={{ fontSize: '12px', fontWeight: 800, color: C.textSecondary, fontFamily: INTER }}>{data.installments?.length || 0}</div>
                                        </div>
                                    </div>

                                    <div style={SC}>
                                        <div style={STitle}><Info size={16} /> قائمة العمليات المسجلة</div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: C.textPrimary , fontFamily: CAIRO}}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                                                        {['تاريخ العملية', 'العميل', 'البيان', 'رقم الخطة', 'المبلغ المحصّل'].map((h, i) => (
                                                            <th key={i} style={{ padding: '16px', textAlign: 'start', fontSize: '12px', fontWeight: 700, color: C.textMuted , fontFamily: CAIRO}}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.installments?.map((inst: any, idx: number) => (
                                                        <tr key={inst.id} style={{ borderBottom: idx < data.installments.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                                            <td style={{ padding: '16px', color: C.textSecondary, fontWeight: 700, fontFamily: INTER }}>{inst.paidAt ? fmt(inst.paidAt) : '—'}</td>
                                                            <td style={{ padding: '16px', fontWeight: 800, color: C.textPrimary , fontFamily: CAIRO}}>{inst.plan?.customer?.name}</td>
                                                            <td style={{ padding: '16px', color: C.textMuted }}>قسط رقم {inst.installmentNo}</td>
                                                            <td style={{ padding: '16px', color: '#5286ed', fontWeight: 900, fontFamily: INTER }}>#{inst.plan?.planNumber}</td>
                                                            <td style={{ padding: '16px', color: '#10b981', fontWeight: 900, fontFamily: INTER }}>{fmtN(inst.paidAmount || 0)} <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.6 , fontFamily: CAIRO}}>{cSymbol}</span></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
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
                                                <div style={{ fontSize: '12px', color: C.danger, fontWeight: 800 , fontFamily: CAIRO}}>إجمالي المتأخرات القائمة</div>
                                                <div style={{ fontSize: '26px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>
                                                    {fmtN(data.total || 0)} <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7 , fontFamily: CAIRO}}>{cSymbol}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'end' }}>
                                            <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700 , fontFamily: CAIRO}}>إجمالي الأقساط المتعثرة</div>
                                            <div style={{ fontSize: '12px', fontWeight: 800, color: C.danger, fontFamily: INTER }}>{data.installments?.length || 0}</div>
                                        </div>
                                    </div>

                                    <div style={SC}>
                                        <div style={STitle}><Info size={16} /> قائمة الأقساط المتجاوزة للموعد</div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: C.textPrimary , fontFamily: CAIRO}}>
                                                <thead>
                                                    <tr style={{ background: 'rgba(251,113,133,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                                        {['العميل', 'رقم الخطة', 'القسط', 'موعد الاستحقاق', 'أيام التأخير', 'المبلغ المتبقي'].map((h, i) => (
                                                            <th key={i} style={{ padding: '16px', textAlign: 'start', fontSize: '12px', fontWeight: 700, color: C.textMuted , fontFamily: CAIRO}}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data.installments?.map((inst: any, idx: number) => (
                                                        <tr key={inst.id} style={{ borderBottom: idx < data.installments.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                                            <td style={{ padding: '16px', fontWeight: 800, color: C.textPrimary , fontFamily: CAIRO}}>{inst.plan?.customer?.name}</td>
                                                            <td style={{ padding: '16px', color: '#5286ed', fontWeight: 900, fontFamily: INTER }}>#{inst.plan?.planNumber}</td>
                                                            <td style={{ padding: '16px', color: C.textMuted }}>قسط {inst.installmentNo}</td>
                                                            <td style={{ padding: '16px', color: C.danger, fontWeight: 800, fontFamily: INTER }}>{fmt(inst.dueDate)}</td>
                                                            <td style={{ padding: '16px' }}>
                                                                <div style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '20px', background: 'rgba(251,113,133,0.1)', color: C.danger, fontSize: '11px', fontWeight: 800, border: `1px solid ${C.danger}20` , fontFamily: CAIRO}}>
                                                                    {inst.daysOverdue} يوم تأخير
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '16px', color: C.danger, fontWeight: 900, fontFamily: INTER }}>{fmtN(inst.remaining || 0)} <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.6 , fontFamily: CAIRO}}>{cSymbol}</span></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'customer' && (
                                <>
                                    {/* Financial Dashboard Overlay */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                                        {[
                                            { label: 'عدد الخطط المعقدة', value: data.summary?.totalPlans, icon: Package, color: C.primary },
                                            { label: 'إجمالي قيمة التعاقدات', value: fmtN(data.summary?.totalAmount || 0), icon: DollarSign, color: C.primary, suffix: cSymbol },
                                            { label: 'إجمالي ما تم سداده', value: fmtN(data.summary?.totalPaid || 0), icon: CheckCircle2, color: '#10b981', suffix: cSymbol },
                                            { label: 'صافي الرصيد المستحق', value: fmtN(data.summary?.totalRemaining || 0), icon: Wallet, color: C.warning, fontWeight: 900, suffix: cSymbol },
                                        ].map((s, i) => (
                                            <div key={i} style={{ ...SC, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', border: `1px solid ${s.color}20` }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <s.icon size={16} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700 , fontFamily: CAIRO}}>{s.label}</div>
                                                    <div style={{ fontSize: '15px', fontWeight: 900, color: s.color, fontFamily: INTER }}>
                                                        {s.value} <span style={{ fontSize: '11px', opacity: 0.5 , fontFamily: CAIRO}}>{s.suffix}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Plans Timeline */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                        {data.plans?.map((plan: any) => (
                                            <div key={plan.id} style={{ ...SC, padding: 0, overflow: 'hidden' }}>
                                                <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div style={{ fontSize: '15px', fontWeight: 900, color: C.primary, fontFamily: INTER }}>#{plan.planNumber}</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: C.textSecondary, fontWeight: 700 , fontFamily: CAIRO}}>
                                                            <Package size={14} /> {plan.productName || 'غير محدد'}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: C.textMuted , fontFamily: CAIRO}}>{plan.monthsCount} شهر</div>
                                                    </div>
                                                    <div style={{ fontSize: '15px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>
                                                        {fmtN(plan.grandTotal)} <span style={{ fontSize: '12px', opacity: 0.6 , fontFamily: CAIRO}}>{cSymbol}</span>
                                                    </div>
                                                </div>
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' , fontFamily: CAIRO}}>
                                                        <thead>
                                                            <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                                                                {['م', 'تاريخ الاستحقاق', 'مبلغ القسط', 'القيمة المحصلة', 'المتبقي', 'الحالة'].map((h, i) => (
                                                                    <th key={i} style={{ padding: '12px 24px', textAlign: 'start', fontSize: '11px', fontWeight: 700, color: C.textMuted , fontFamily: CAIRO}}>{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {plan.installments?.map((inst: any, idx: number) => (
                                                                <tr key={inst.id} style={{ borderTop: `1px solid ${C.border}`, transition: '0.2s' }}>
                                                                    <td style={{ padding: '12px 24px', color: C.primary, fontWeight: 800, fontFamily: INTER }}>{inst.installmentNo}</td>
                                                                    <td style={{ padding: '12px 24px', color: C.textSecondary, fontWeight: 600, fontFamily: INTER }}>{fmt(inst.dueDate)}</td>
                                                                    <td style={{ padding: '12px 24px', fontWeight: 800, fontFamily: INTER }}>{fmtN(inst.amount)} <span style={{ fontSize: '10px', opacity: 0.5 , fontFamily: CAIRO}}>{cSymbol}</span></td>
                                                                    <td style={{ padding: '12px 24px', color: '#10b981', fontWeight: 700, fontFamily: INTER }}>{fmtN(inst.paidAmount || 0)} <span style={{ fontSize: '10px', opacity: 0.5 , fontFamily: CAIRO}}>{cSymbol}</span></td>
                                                                    <td style={{ padding: '12px 24px', color: (inst.remaining || 0) > 0 ? C.warning : '#10b981', fontWeight: 800, fontFamily: INTER }}>{fmtN(inst.remaining || 0)} <span style={{ fontSize: '10px', opacity: 0.5 , fontFamily: CAIRO}}>{cSymbol}</span></td>
                                                                    <td style={{ padding: '12px 24px' }}>
                                                                        <div style={{ 
                                                                            display: 'inline-flex', padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 800,
                                                                            background: inst.status === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                                                                            color: inst.status === 'paid' ? '#10b981' : C.primary,
                                                                            border: `1px solid ${inst.status === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)'}`
                                                                        }}>
                                                                            {inst.status === 'paid' ? 'تم التحصيل' : 'قيد الانتظار'}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            ` }} />
        </DashboardLayout>
    );
}

