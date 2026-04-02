'use client';

import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
    Printer, 
    CheckCircle, 
    Calculator, 
    Wallet, 
    Loader2, 
    AlertCircle, 
    User, 
    ChevronRight,
    Search,
    Landmark,
    X,
    FileText,
    ClipboardList,
    PieChart,
    Banknote
} from 'lucide-react';
import { use } from 'react';
import Link from 'next/link';
import { C, CAIRO, INTER, TABLE_STYLE, KPI_STYLE, KPI_ICON } from '@/constants/theme';
import AppModal from '@/components/AppModal';
import PageHeader from '@/components/PageHeader';

const months = [
    { value: 1, label: 'يناير' },
    { value: 2, label: 'فبراير' },
    { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' },
    { value: 5, label: 'مايو' },
    { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' },
    { value: 8, label: 'أغسطس' },
    { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' },
    { value: 12, label: 'ديسمبر' },
];

const formatCurrency = (code: string) => {
    if (!code) return 'ج.م';
    const mapping: {[key: string]: string} = {
        'EGP': 'ج.م',
        'SAR': 'ر.س',
        'USD': 'دولار',
        'EUR': 'يورو',
        'AED': 'د.إ',
        'KWD': 'د.ك',
        'QAR': 'ر.ق',
        'BHD': 'د.ب',
        'OMR': 'ر.ع',
        'LYD': 'د.ل',
        'JOD': 'د.أ',
        'SYP': 'ل.س',
        'YER': 'ر.ي'
    };
    return mapping[code.toUpperCase()] || code;
};

export default function PayrollDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { data: session } = useSession();
    const [payroll, setPayroll] = useState<any>(null);
    const [treasuries, setTreasuries] = useState<any[]>([]);
    const [company, setCompany] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const companyData = company || {};
    const companyName = companyData.name || '';
    const companyLogo = companyData.logo || '';
    const taxNumber = companyData.taxNumber || '';
    const commercialReg = companyData.commercialRegister || '';
    const address = companyData.address || '';
    const email = companyData.email || '';
    const phone = companyData.phone || '';

    // Approval state
    const [selectedTreasury, setSelectedTreasury] = useState('');
    const [isApproving, setIsApproving] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const [prRes, trRes, compRes] = await Promise.all([
                    fetch(`/api/payrolls/${params.id}`),
                    fetch('/api/treasuries'),
                    fetch('/api/company')
                ]);
                if (prRes.ok) setPayroll(await prRes.json());
                if (trRes.ok) setTreasuries(await trRes.json());
                if (compRes.ok) setCompany(await compRes.json());
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [params.id]);

    const handleApprove = async () => {
        if (!selectedTreasury) {
            alert('الرجاء تحديد خزينة الصرف');
            return;
        }

        const treasury = treasuries.find(t => t.id === selectedTreasury);
        if (treasury && treasury.balance < payroll.netTotal) {
            alert(`رصيد الخزينة غير كافٍ. المتاح: ${treasury.balance.toLocaleString()} ج.م`);
            return;
        }

        setIsApproving(true);
        try {
            const res = await fetch(`/api/payrolls/${params.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve', treasuryId: selectedTreasury })
            });

            if (res.ok) {
                setShowApprovalModal(false);
                window.location.reload(); 
            } else {
                const data = await res.json();
                alert(data.error || 'فشل في الاعتماد');
            }
        } finally {
            setIsApproving(false);
        }
    };

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', flexDirection: 'column', gap: '12px' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: '#3b82f6' }} />
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>جاري التحميل...</span>
            </div>
        </DashboardLayout>
    );

    if (!payroll) return (
        <DashboardLayout>
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: '16px', opacity: 0.5 }} />
                <h2 style={{ fontSize: '16px', color: '#fff' }}>المسير غير موجود</h2>
                <Link href="/payrolls" style={{ marginTop: '16px', color: '#3b82f6', textDecoration: 'none', display: 'inline-block', fontWeight: 700 }}>العودة للقائمة</Link>
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div dir="rtl" style={{ width: '100%' }}>
                
                {/* Header Standardized */}
                <div className="print-hide">
                    <PageHeader
                        title={`تفاصيل مسير الرواتب ${months.find(m => m.value === payroll.month)?.label} ${payroll.year}`}
                        subtitle={payroll.status === 'paid' ? 'معتمد ومُسدد' : 'مسودة قيد المراجعة'}
                        icon={FileText}
                        backUrl="/payrolls"
                        actions={[
                            <button 
                                key="print"
                                onClick={() => window.print()}
                                className="print-hide"
                                style={{ 
                                    height: '40px', padding: '0 20px', borderRadius: '12px', 
                                    border: `1px solid ${C.border}`, 
                                    background: 'rgba(255,255,255,0.03)', 
                                    color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', 
                                    display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO,
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                            >
                                <Printer size={16} /> طباعة
                            </button>,
                            payroll.status === 'draft' ? (
                                <button 
                                    key="approve"
                                    onClick={() => setShowApprovalModal(true)}
                                    style={{ 
                                        height: '40px', padding: '0 16px', borderRadius: '12px', border: 'none', 
                                        background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', 
                                        fontSize: '13px', fontWeight: 800, cursor: 'pointer', 
                                        display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, 
                                        boxShadow: '0 4px 12px rgba(16,185,129,0.2)' 
                                    }}
                                >
                                    <CheckCircle size={16} /> اعتماد وصرف
                                </button>
                            ) : null
                        ]}
                    />
                </div>
                {/* Summary Grid - Standardized to match Customers page */}
                <div className="print-hide" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    {[
                        { label: 'إجمالي الأساسي', val: payroll.totalSalaries, color: C.primary, icon: Calculator },
                        { label: 'سلف وخصومات', val: payroll.totalAdvances + payroll.totalDiscounts, color: C.danger, icon: AlertCircle },
                        { label: 'إجمالي البدلات', val: payroll.totalAllowances, color: '#818cf8', icon: ClipboardList },
                        { label: 'الصافي النهائي', val: payroll.netTotal, color: C.success, icon: Banknote }
                    ].map((stat, i) => (
                        <div key={i} style={{
                            background: `${stat.color}08`, border: `1px solid ${stat.color}33`, borderRadius: '10px',
                            padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'all 0.2s', position: 'relative'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                        >
                             <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', margin: '0 0 4px', whiteSpace: 'nowrap' }}>{stat.label}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800, color: stat.color, fontFamily: INTER }} dir="ltr">
                                    <span style={{ fontSize: '10px', opacity: 0.7, fontFamily: CAIRO }}>{formatCurrency(company?.currency)}</span>
                                    <span>{stat.val.toLocaleString('en-US')}</span>
                                </div>
                            </div>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${stat.color}15`, border: `1px solid ${stat.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Table Card - Standardized */}
                {/* Print Header */}
                <div className="print-only" dir="rtl" style={{
                    display: 'none',
                    flexDirection: 'column',
                    borderBottom: '2px solid #000',
                    paddingBottom: '16px',
                    marginBottom: '20px',
                }}>
                    {/* الصف الأول — بيانات الشركة + اللوجو */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        marginBottom: '12px'
                    }}>
                        {/* يمين — بيانات الشركة */}
                        <div>
                            {companyName   && <div style={{ fontSize: '18px', fontWeight: 900, marginBottom: '4px' }}>{companyName}</div>}
                            {taxNumber     && <div style={{ fontSize: '12px', marginBottom: '2px' }}>الرقم الضريبي: {taxNumber}</div>}
                            {commercialReg && <div style={{ fontSize: '12px', marginBottom: '2px' }}>السجل التجاري: {commercialReg}</div>}
                            {phone         && <div style={{ fontSize: '12px', marginBottom: '2px' }}>هاتف: {phone}</div>}
                            {address       && <div style={{ fontSize: '12px', marginBottom: '2px' }}>العنوان: {address}</div>}
                            {email         && <div style={{ fontSize: '12px' }}>البريد: {email}</div>}
                        </div>

                        {/* يسار — اللوجو */}
                        <div>
                            {companyLogo
                                ? <img src={companyLogo} style={{ height: '70px', objectFit: 'contain' }} />
                                : <div style={{ 
                                    width: '65px', height: '65px', borderRadius: '50%',
                                    background: '#f0f0f0', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '26px', fontWeight: 900,
                                    color: '#000', border: '1px solid #ddd'
                                  }}>
                                    {companyName?.charAt(0)}
                                  </div>
                            }
                        </div>
                    </div>

                    {/* الصف الثاني — عنوان الكشف في الوسط */}
                    <div style={{ textAlign: 'center', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 900 }}>
                            مسير رواتب شهر {months.find(m => m.value === payroll?.month)?.label} {payroll?.year}
                        </div>
                        <div style={{ fontSize: '11px', marginTop: '4px', color: '#444' }}>
                            إجمالي الصافي: {payroll?.netTotal?.toLocaleString('en-US')} ج.م
                        </div>
                    </div>
                </div>

                <div style={TABLE_STYLE.container}>


                    <table style={TABLE_STYLE.table}>
                        <thead>
                            <tr style={TABLE_STYLE.thead}>
                                <th style={TABLE_STYLE.th(true)}>كود</th>
                                <th style={TABLE_STYLE.th(false)}>الموظف</th>
                                <th style={TABLE_STYLE.th(false)}>الأساسي</th>
                                <th style={TABLE_STYLE.th(false)}>البدلات</th>
                                <th style={TABLE_STYLE.th(false)}>السلف</th>
                                <th style={TABLE_STYLE.th(false)}>خصومات</th>
                                <th style={TABLE_STYLE.th(false)}>الصافي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payroll.lines.map((line: any, idx: number) => (
                                <tr key={line.id} style={TABLE_STYLE.row(idx === payroll.lines.length - 1)}>
                                    <td style={TABLE_STYLE.td(true)}>
                                        <span style={{ fontSize: '12px', color: C.primary, fontWeight: 800, fontFamily: INTER }}>{line.employee.code}</span>
                                    </td>
                                    <td style={TABLE_STYLE.td(false)}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{line.employee.name}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{line.employee.position || 'موظف'}</div>
                                        </div>
                                    </td>
                                    <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', fontWeight: 700, fontFamily: INTER }} dir="ltr">
                                        {line.basicSalary.toLocaleString('en-US')}
                                    </td>
                                    <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', fontWeight: 700, color: C.success, fontFamily: INTER }} dir="ltr">
                                        +{line.allowances.toLocaleString('en-US')}
                                    </td>
                                    <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', fontWeight: 700, color: C.danger, fontFamily: INTER }} dir="ltr">
                                        -{line.advances.toLocaleString('en-US')}
                                    </td>
                                    <td style={{ ...TABLE_STYLE.td(false), fontSize: '13px', fontWeight: 700, color: C.danger, fontFamily: INTER }} dir="ltr">
                                        -{line.discounts.toLocaleString('en-US')}
                                    </td>
                                    <td style={{ ...TABLE_STYLE.td(false), fontSize: '15px', fontWeight: 900, color: C.success, fontFamily: INTER }} dir="ltr">
                                        {line.netSalary.toLocaleString('en-US')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Approval Modal Standardized */}
                <AppModal
                    show={showApprovalModal}
                    onClose={() => setShowApprovalModal(false)}
                    title="اعتماد وصرف المسير"
                    icon={Calculator}
                >
                    <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '24px' }}>
                        سيتم إغلاق المسير وتوليد قيود محاسبية تلقائية، وخصم السلف المستحقة من أرصدة الموظفين.
                        <br/><br/>
                        <strong style={{ color: '#fff' }}>المبلغ المطلوب:</strong> <span style={{ color: C.success, fontWeight: 800, fontSize: '16px', fontFamily: INTER }} dir="ltr"><div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ fontFamily: CAIRO }}>{formatCurrency(company?.currency)}</span> <span>{payroll.netTotal.toLocaleString('en-US')}</span></div></span>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '8px' }}>خزينة الصرف</label>
                        <CustomSelect
                            value={selectedTreasury}
                            onChange={setSelectedTreasury}
                            icon={Landmark}
                            placeholder="اختر الخزينة..."
                            hideSearch={true}
                            openUp={true}
                            options={treasuries.map(tr => ({ value: tr.id, label: `${tr.name} (${formatCurrency(company?.currency)} ${tr.balance.toLocaleString('en-US')})` }))}
                        />
                        {(() => {
                            const tr = treasuries.find(t => t.id === selectedTreasury);
                            if (tr && tr.balance < payroll.netTotal) {
                                return (
                                    <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertCircle size={14} />
                                        رصيد الخزينة غير كافٍ. المتوفر ({tr.balance.toLocaleString('en-US')} ج.م)
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={handleApprove}
                            disabled={isApproving}
                            style={{ flex: 2, height: '48px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: CAIRO }}
                        >
                            {isApproving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : 'تأكيد وصرف الرواتب'}
                        </button>
                        <button 
                            onClick={() => setShowApprovalModal(false)}
                            style={{ flex: 1, height: '48px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}
                        >
                            إلغاء
                        </button>
                    </div>
                </AppModal>
            </div>

            <style jsx global>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                @media print {
                    .print-only { 
                        display: flex !important; 
                        position: relative !important; 
                    }
                    .print-hide { display: none !important; }
                    
                    body, div, td, th { 
                        color: #000 !important; 
                        background: #fff !important;
                    }

                    /* الجدول */
                    table { width: 100% !important; border-collapse: collapse !important; }
                    th, td { 
                        border: 1px solid #ccc !important; 
                        padding: 8px !important;
                        font-size: 11px !important;
                        text-align: right !important;
                    }
                    th { 
                        background: #f0f0f0 !important; 
                        font-weight: 900 !important;
                        -webkit-print-color-adjust: exact; 
                    }

                    /* الكروت والحاويات */
                    * { box-shadow: none !important; text-shadow: none !important; }
                    
                    @page { margin: 10mm; size: auto; }
                }

                .print-only { display: none; }
            `}</style>
        </DashboardLayout>
    );
}
