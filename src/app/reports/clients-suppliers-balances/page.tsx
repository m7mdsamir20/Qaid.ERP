'use client';

import DashboardLayout from '@/components/DashboardLayout';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};
import { C, CAIRO, PAGE_BASE, IS, INTER } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { Users, Truck, Phone, Search, Loader2, ArrowUpRight, ArrowDownLeft, UserCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

interface PartnerBalance {
    id: string;
    name: string;
    phone: string | null;
    balance: number;
    type: 'عميل' | 'مورد';
    partnerType: 'customer' | 'supplier';
}

interface ReportResult {
    data: PartnerBalance[];
    totalCustomerBalance: number;
    totalSupplierBalance: number;
}

export default function ClientsSuppliersBalancesPage() {
    const { data: session } = useSession();
    const currency = (session?.user as any)?.currency || 'EGP';

    const [result, setResult] = useState<ReportResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'customer' | 'supplier' | 'debtor' | 'creditor'>('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch('/api/reports/balances')
            .then(res => res.json())
            .then(d => { if (d.data) setResult(d); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    let filteredData = result?.data || [];
    
    // Search filter
    if (search) {
        filteredData = filteredData.filter(d => 
            d.name.toLowerCase().includes(search.toLowerCase()) || 
            (d.phone && d.phone.includes(search))
        );
    }

    // Type/Status filter
    if (filter === 'customer') filteredData = filteredData.filter(d => d.partnerType === 'customer');
    if (filter === 'supplier') filteredData = filteredData.filter(d => d.partnerType === 'supplier');
    if (filter === 'debtor') filteredData = filteredData.filter(d => (d.partnerType === 'customer' && d.balance > 0) || (d.partnerType === 'supplier' && d.balance < 0));
    if (filter === 'creditor') filteredData = filteredData.filter(d => (d.partnerType === 'customer' && d.balance < 0) || (d.partnerType === 'supplier' && d.balance > 0));

    // Summary calculation for the filtered list
    let summaryMaden = 0; // مدين (عليه فلوس لنا) -> (Customer with + balance) OR (Supplier with - balance)
    let summaryDaen = 0;  // دائن (له فلوس عندنا) -> (Customer with - balance) OR (Supplier with + balance)

    filteredData.forEach(p => {
        if (p.partnerType === 'customer') {
            if (p.balance > 0) summaryMaden += p.balance; // عليه
            else summaryDaen += Math.abs(p.balance); // له
        } else {
            if (p.balance > 0) summaryDaen += p.balance; // له (المورد يطالبنا)
            else summaryMaden += Math.abs(p.balance); // عليه (لنا فلوس عند المورد)
        }
    });

    const exportToExcel = () => {
        if (!filteredData.length) return;
        const excelData = filteredData.map(p => {
            let maden = 0;
            let daen = 0;
            if (p.partnerType === 'customer') {
                if (p.balance > 0) maden = p.balance;
                else daen = Math.abs(p.balance);
            } else {
                if (p.balance > 0) daen = p.balance;
                else maden = Math.abs(p.balance);
            }
            return {
                'النوع': p.type,
                'الاسم': p.name,
                'الهاتف': p.phone || '—',
                'مدين (عليه)': maden,
                'دائن (له)': daen,
                'صافي الرصيد': p.balance
            };
        });
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'الأرصدة');
        XLSX.writeFile(wb, `ارصدة_العملاء_والموردين_${new Date().toLocaleDateString('en-GB')}.xlsx`);
    };

    return (
        <DashboardLayout>
            <div dir="rtl" style={PAGE_BASE}>
                <ReportHeader
                    title="أرصدة العملاء والموردين"
                    subtitle="تقرير شامل يعرض جميع المستحقات (ما لنا وما علينا) لكل حساب."
                    backTab="partners"
                    onExportPdf={() => window.print()}
                    onExportExcel={exportToExcel}
                />

                {/* Header للطباعة فقط */}
                <div className="print-only">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '2px solid #000' }}>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 900, color: '#000', fontFamily: CAIRO }}>{(session?.user as any)?.companyName || ''}</h2>
                            {(session?.user as any)?.taxNumber && <div style={{ fontSize: '11px', color: '#333', margin: '2px 0', fontFamily: CAIRO }}>الرقم الضريبي: {(session?.user as any)?.taxNumber}</div>}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 900, color: '#000', fontFamily: CAIRO }}>تقرير أرصدة العملاء والموردين</h3>
                        </div>
                        <div style={{ maxWidth: '150px', textAlign: 'left' }}>
                            {(session?.user as any)?.companyLogo && <img src={(session?.user as any)?.companyLogo} alt="logo" style={{ maxWidth: '150px', maxHeight: '70px', objectFit: 'contain' }} />}
                        </div>
                    </div>
                </div>

                <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <Search size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                        <input
                            placeholder="ابحث باسم الحساب أو رقم الهاتف..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            style={{ 
                                ...IS, width: '100%', height: '42px', padding: '0 45px 0 15px', 
                                borderRadius: '12px', border: `1px solid ${C.border}`, 
                                background: C.card, color: C.textPrimary, fontSize: '13.5px', 
                                outline: 'none', fontFamily: CAIRO, fontWeight: 500 
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {[
                            { key: 'all', label: 'الكل', icon: UserCheck, color: C.primary },
                            { key: 'customer', label: 'العملاء', icon: Users, color: '#3b82f6' },
                            { key: 'supplier', label: 'الموردين', icon: Truck, color: '#fb923c' },
                            { key: 'debtor', label: 'المدينون (عليهم)', icon: ArrowUpRight, color: '#ef4444' },
                            { key: 'creditor', label: 'الدائنون (لهم)', icon: ArrowDownLeft, color: '#10b981' },
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => setFilter(t.key as any)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 18px', borderRadius: '10px',
                                    background: filter === t.key ? `${t.color}15` : C.card,
                                    color: filter === t.key ? t.color : C.textSecondary,
                                    border: `1px solid ${filter === t.key ? `${t.color}30` : C.border}`,
                                    fontWeight: filter === t.key ? 800 : 700, fontSize: '13px',
                                    fontFamily: CAIRO, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
                                }}
                            >
                                <t.icon size={16} /> {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>جاري تحميل الأرصدة...</span>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
                            {[
                                { label: 'إجمالي مديونيات الغير (أرصدة مدينة)', value: summaryMaden, color: '#ef4444' },
                                { label: 'إجمالي التزامات الشركة (أرصدة دائنة)', value: summaryDaen, color: '#10b981' },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}25`, borderRadius: '16px',
                                    padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px'
                                }}>
                                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{s.label}</span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                        <span style={{ fontSize: '24px', fontWeight: 1000, color: s.color, fontFamily: INTER }}>{s.value.toLocaleString('en-US')}</span>
                                        <span style={{ fontSize: '12px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary, textAlign: 'center', fontWeight: 800, fontFamily: CAIRO }}>النوع</th>
                                        <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary, textAlign: 'center', fontWeight: 800, fontFamily: CAIRO }}>الاسم</th>
                                        <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary, textAlign: 'center', fontWeight: 800, fontFamily: CAIRO }}>الهاتف</th>
                                        
                                        {filter === 'all' ? (
                                            <>
                                                <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary, textAlign: 'center', fontWeight: 800, fontFamily: CAIRO }}>عليه (مدين)</th>
                                                <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary, textAlign: 'center', fontWeight: 800, fontFamily: CAIRO }}>له (دائن)</th>
                                            </>
                                        ) : (
                                            <>
                                                <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary, textAlign: 'center', fontWeight: 800, fontFamily: CAIRO }}>الوضع المالي</th>
                                                <th style={{ padding: '16px 20px', fontSize: '12px', color: C.textSecondary, textAlign: 'center', fontWeight: 800, fontFamily: CAIRO }}>صافي الرصيد</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map((p, idx) => {
                                        let maden = 0;
                                        let daen = 0;
                                        if (p.partnerType === 'customer') {
                                            if (p.balance > 0) maden = p.balance;
                                            else daen = Math.abs(p.balance);
                                        } else {
                                            if (p.balance > 0) daen = p.balance;
                                            else maden = Math.abs(p.balance);
                                        }

                                        const owesUs = (p.partnerType === 'customer' && p.balance > 0) || (p.partnerType === 'supplier' && p.balance < 0);
                                        const weOweThem = (p.partnerType === 'customer' && p.balance < 0) || (p.partnerType === 'supplier' && p.balance > 0);

                                        return (
                                            <tr key={p.id} 
                                                style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '8px', fontSize: '10.5px', fontWeight: 900, fontFamily: CAIRO,
                                                        background: p.partnerType === 'customer' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                                                        color: p.partnerType === 'customer' ? '#3b82f6' : '#f59e0b'
                                                    }}>
                                                        {p.type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 20px', fontSize: '13.5px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO, textAlign: 'center' }}>{p.name}</td>
                                                <td style={{ padding: '14px 20px', fontSize: '12.5px', color: C.textMuted, fontFamily: INTER, textAlign: 'center' }}>{p.phone || '—'}</td>
                                                
                                                {filter === 'all' ? (
                                                    <>
                                                        <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 1000, color: maden > 0 ? '#ef4444' : C.textMuted, fontSize: '14.5px', fontFamily: INTER }}>
                                                            {maden > 0 ? maden.toLocaleString('en-US') : '—'}
                                                        </td>
                                                        <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 1000, color: daen > 0 ? '#10b981' : C.textMuted, fontSize: '14.5px', fontFamily: INTER }}>
                                                            {daen > 0 ? daen.toLocaleString('en-US') : '—'}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                            {p.balance === 0 ? (
                                                                <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO }}>رصيد صفري</span>
                                                            ) : (
                                                                <span style={{
                                                                    padding: '4px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 900, fontFamily: CAIRO,
                                                                    background: owesUs ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                                    color: owesUs ? '#ef4444' : '#10b981'
                                                                }}>
                                                                    {owesUs ? 'عليه (مدين لنا)' : 'له (دائن يطالبنا)'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 1000, color: owesUs ? '#ef4444' : weOweThem ? '#10b981' : C.textMuted, fontSize: '14.5px', fontFamily: INTER }}>
                                                            {Math.abs(p.balance).toLocaleString('en-US')} <span style={{ fontSize: '10.5px', color: C.textMuted, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {filteredData.length === 0 && (
                                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '100px', color: C.textMuted, fontFamily: CAIRO }}>لا توجد نتائج تطابق بحثك...</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                .print-only { display: none; }
                @media print {
                    .print-only { display: block !important; }
                    .no-print { display: none !important; }
                    div { background: #fff !important; border-color: #e2e8f0 !important; }
                    div, span, h2, h3, p { color: #000 !important; }
                    th, td { font-size: 10px !important; padding: 6px 10px !important; border: 1px solid #e2e8f0 !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}
