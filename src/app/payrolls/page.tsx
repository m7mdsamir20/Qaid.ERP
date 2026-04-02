'use client';

import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useEffect, useState } from 'react';
import { 
    FileDown, 
    Calendar, 
    Plus, 
    Loader2, 
    Filter,
    Trash2,
    X,
    Search,
    ClipboardList,
    PieChart,
    Banknote,
    ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { C, CAIRO, INTER, TABLE_STYLE, SEARCH_STYLE, KPI_STYLE, KPI_ICON, focusIn, focusOut } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

interface Payroll {
    id: string;
    month: number;
    year: number;
    date: string;
    netTotal: number;
    status: string; // draft, paid
    _count: { lines: number };
}

const months = [
    { value: '1', label: 'يناير' },
    { value: '2', label: 'فبراير' },
    { value: '3', label: 'مارس' },
    { value: '4', label: 'أبريل' },
    { value: '5', label: 'مايو' },
    { value: '6', label: 'يونيو' },
    { value: '7', label: 'يوليو' },
    { value: '8', label: 'أغسطس' },
    { value: '9', label: 'سبتمبر' },
    { value: '10', label: 'أكتوبر' },
    { value: '11', label: 'نوفمبر' },
    { value: '12', label: 'ديسمبر' },
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

export default function PayrollsPage() {
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // Added search capability like employees

    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedDept, setSelectedDept] = useState('all');
    const [company, setCompany] = useState<any>(null);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchAll = async () => {
        try {
            const [prRes, deptRes, compRes] = await Promise.all([
                fetch('/api/payrolls'),
                fetch('/api/departments'),
                fetch('/api/company')
            ]);
            if (prRes.ok) setPayrolls(await prRes.json());
            if (deptRes.ok) setDepartments(await deptRes.json());
            if (compRes.ok) setCompany(await compRes.json());
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.id) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/payrolls/${deleteModal.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteModal({ open: false, id: null });
                fetchAll();
            } else {
                const data = await res.json();
                alert(data.error || 'فشل الحذف');
            }
        } catch (e) {
            alert('حدث خطأ أثناء الحذف');
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        try {
            const res = await fetch('/api/payrolls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month, year, date, departmentId: selectedDept === 'all' ? null : selectedDept }),
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchAll();
            } else {
                const data = await res.json();
                alert(data.error || 'فشل في توليد مسير الرواتب');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const totalPaid = payrolls
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.netTotal, 0);

    const filteredPayrolls = payrolls.filter(pr => {
        const matchesSearch = months.find(m => m.value === pr.month.toString())?.label.includes(searchTerm) ||
            pr.year.toString().includes(searchTerm);
        
        // Note: The original POST includes departmentId if filtered, 
        // but existing payrolls in DB might not have a department link if generated for all.
        // If the user wants to filter EXISTING payrolls by department, 
        // they usually expect to see payrolls that contained that department.
        // For simplicity, we'll assume the search is just for the month/year for now 
        // OR if the API returns department info, we filter by it.
        return matchesSearch;
    });

    return (
        <DashboardLayout>
            <div dir="rtl">
                
                {/* Header Section */}
                <PageHeader
                    title="مسيرات الرواتب"
                    subtitle="جدولة وإصدار الرواتب الشهرية لموظفي الشركة"
                    icon={FileDown}
                    primaryButton={{
                        label: "توليد مسير جديد",
                        onClick: () => setIsModalOpen(true),
                        icon: Plus
                    }}
                />

                {/* Main Content Area */}
                {!loading && (
                    <>
                        {/* Search area with Filter */}
                        <div style={{ ...SEARCH_STYLE.container, marginBottom: '16px' }}>
                            <div style={SEARCH_STYLE.wrapper}>
                                <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.primary)} />
                                <input
                                    placeholder="ابحث بالشهر أو السنة..."
                                    style={{ ...SEARCH_STYLE.input, height: '40px', borderRadius: '12px' }}
                                    onFocus={focusIn}
                                    onBlur={focusOut}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            
                            <div style={{ width: '200px' }}>
                                <CustomSelect
                                    value={selectedDept}
                                    onChange={setSelectedDept}
                                    placeholder="تصفية حسب القسم"
                                    icon={Filter}
                                    options={[
                                        { value: 'all', label: 'كل الأقسام' },
                                        ...departments.map(d => ({ value: d.id, label: d.name }))
                                    ]}
                                    style={{ height: '40px', borderRadius: '12px' }}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Main Content Table Area */}
                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
                            <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 16px', display: 'block' }} />
                            جاري التحميل...
                        </div>
                    ) : filteredPayrolls.length === 0 ? (
                        <div style={{ padding: '100px 20px', textAlign: 'center', color: '#475569' }}>
                            <FileDown size={64} style={{ opacity: 0.1, display: 'block', margin: '0 auto 20px' }} />
                            <h3 style={{ fontSize: '18px', color: '#94a3b8', margin: '0 0 10px' }}>{searchTerm ? 'لا توجد نتائج مطابقة' : 'لا توجد مسيرات رواتب'}</h3>
                            <p style={{ fontSize: '14px', margin: 0 }}>{searchTerm ? 'جرب البحث بكلمات أخرى' : 'ابدأ بتوليد أول مسير من زر "توليد مسير جديد"'}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(true)}>الشهر / السنة</th>
                                        <th style={TABLE_STYLE.th(false)}>تاريخ الإصدار</th>
                                        <th style={TABLE_STYLE.th(false)}>عدد الموظفين</th>
                                        <th style={TABLE_STYLE.th(false)}>إجمالي الصافي</th>
                                        <th style={TABLE_STYLE.th(false)}>الحالة</th>
                                        <th style={TABLE_STYLE.th(false)}>العمليات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPayrolls.map((pr, idx) => (
                                        <tr key={pr.id} 
                                            style={TABLE_STYLE.row(idx === filteredPayrolls.length - 1)}
                                            onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.12)'}
                                        >
                                            <td style={TABLE_STYLE.td(true)}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontWeight: 800, fontSize: '14px' }}>
                                                        {months.find(m => m.value === pr.month.toString())?.label} / {pr.year}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontFamily: INTER, fontSize: '12px', color: '#94a3b8' }}>
                                                {new Date(pr.date).toLocaleDateString('en-GB')}
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '12px', fontWeight: 800 }}>
                                                    {pr._count?.lines || 0} موظف
                                                </span>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false) }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 900, color: '#10b981', fontSize: '14px', fontFamily: INTER }} dir="ltr">
                                                    <span style={{ fontSize: '11px', opacity: 0.7, fontFamily: CAIRO }}>{formatCurrency(company?.currency)}</span>
                                                    <span>{pr.netTotal.toLocaleString('en-US')}</span>
                                                </div>
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                {pr.status === 'draft' ? (
                                                    <span style={{ padding: '4px 10px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>مسودة</span>
                                                ) : (
                                                    <span style={{ padding: '4px 10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>معتمد</span>
                                                )}
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <Link href={`/payrolls/${pr.id}`} style={TABLE_STYLE.actionBtn()} title="عرض">
                                                        <Search size={TABLE_STYLE.actionIconSize} />
                                                    </Link>
                                                    {pr.status === 'draft' && (
                                                        <button onClick={() => setDeleteModal({ open: true, id: pr.id })} style={TABLE_STYLE.actionBtn(C.danger)} title="حذف">
                                                            <Trash2 size={TABLE_STYLE.actionIconSize} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* MODAL: Generate Payroll */}
                <AppModal
                    show={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title="توليد مسير رواتب جديد"
                    icon={Plus}
                >
                    <form onSubmit={handleGenerate}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>الشهر</label>
                                <CustomSelect
                                    value={month.toString()}
                                    onChange={v => setMonth(Number(v))}
                                    options={months}
                                    minWidth="100%"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>السنة</label>
                                <CustomSelect
                                    value={year.toString()}
                                    onChange={v => setYear(Number(v))}
                                    options={Array.from({ length: 5 }, (_, i) => {
                                        const y = new Date().getFullYear() - 1 + i;
                                        return { value: y.toString(), label: y.toString() };
                                    })}
                                    minWidth="100%"
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>القسم (اختياري)</label>
                            <CustomSelect
                                value={selectedDept}
                                onChange={setSelectedDept}
                                placeholder="كل الأقسام"
                                options={[
                                    { value: 'all', label: 'كل الأقسام' },
                                    ...departments.map(d => ({ value: d.id, label: d.name }))
                                ]}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>تاريخ الإصدار</label>
                            <input 
                                type="date" 
                                required 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', color: '#fff', outline: 'none', fontSize: '13px' }}
                            />
                            <p style={{ fontSize: '10px', color: '#64748b', marginTop: '8px' }}>سيتم سحب بيانات الموظفين والبدلات والخصومات الحالية.</p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                type="submit" 
                                disabled={isGenerating}
                                style={{ flex: 1, height: '44px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                            >
                                {isGenerating ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : 'توليد المسير'}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)}
                                style={{ height: '44px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                            >
                                إلغاء
                            </button>
                        </div>
                    </form>
                </AppModal>

                {/* MODAL: Delete Confirmation */}
                <AppModal
                    show={deleteModal.open}
                    onClose={() => setDeleteModal({ open: false, id: null })}
                    title="تأكيد الحذف"
                    icon={Trash2}
                    variant="danger"
                >
                    <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '24px' }}>
                        هل أنت متأكد من رغبتك في حذف هذا المسير؟
                        <br />
                        <span style={{ fontSize: '12px', color: C.danger, fontWeight: 700 }}>سيتم حذف كافة السلف والخصومات المرتبطة بهذا المسير ولا يمكن التراجع عن هذه العملية!</span>
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            style={{ flex: 1, height: '44px', background: C.danger, border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
                        >
                            {isDeleting ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : 'تأكيد الحذف'}
                        </button>
                        <button 
                            onClick={() => setDeleteModal({ open: false, id: null })}
                            style={{ height: '44px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                        >
                            إلغاء
                        </button>
                    </div>
                </AppModal>
            </div>

            <style jsx global>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}
