'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrency } from '@/hooks/useCurrency';
import { UsersIcon, Paperclip, Loader2, Plus, Search, Filter, Trash2, Pencil, Eye, Building2, Briefcase, ChevronDown, UserPlus, TrendingUp } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import CustomSelect from '@/components/CustomSelect';
import { THEME, C, CAIRO, OUTFIT, TABLE_STYLE, PAGE_BASE, SC, IS, focusIn, focusOut } from '@/constants/theme';

/* ── Types ── */
interface Department { id: string; name: string; }
interface Attachment { name: string; url: string; }

interface Employee {
    id: string; code: string; name: string;
    phone: string | null; email: string | null;
    nationalId: string | null; birthDate: string | null;
    gender: string | null; address: string | null;
    position: string | null; hireDate: string;
    basicSalary: number;
    housingAllowance: number; transportAllowance: number; foodAllowance: number;
    insuranceDeduction: number; taxDeduction: number;
    bankName: string | null; bankAccount: string | null;
    attachments: Attachment[];
    department?: Department;
    status: string;
}

/* ══════════════════════════════════════════ */
export default function EmployeesPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const { symbol: currencySymbol, fMoneyJSX } = useCurrency();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [showFilter, setShowFilter] = useState(false);
    const [showStatusFilter, setShowStatusFilter] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const urlParams = new URLSearchParams(window.location.search);
            const branchId = urlParams.get('branchId') || 'all';
            
            const [eRes, dRes] = await Promise.all([
                fetch(`/api/employees?branchId=${branchId}`),
                fetch('/api/departments')
            ]);
            if (eRes.ok) setEmployees(await eRes.json());
            if (dRes.ok) setDepartments(await dRes.json());
        } catch (error) {
            console.error("Failed to fetch employees:", error);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.position?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesDept = selectedDept === 'all' || emp.department?.id === selectedDept;
        const matchesStatus = selectedStatus === 'all' || 
            (emp.status && emp.status.toLowerCase() === selectedStatus.toLowerCase());
        
        return matchesSearch && matchesDept && matchesStatus;
    });

    const stats = [
        { label: t('إجمالي الموظفين'), value: employees.length, icon: UsersIcon, color: '#256af4' },
        { label: t('موظفين نشطين'), value: employees.filter(e => e.status === 'active').length, icon: UserPlus, color: '#10b981' },
        { label: t('متوسط الأجور'), value: employees.length ? (employees.reduce((acc, curr) => acc + curr.basicSalary, 0) / employees.length).toLocaleString() : 0, icon: TrendingUp, color: '#a78bfa', unit: currencySymbol },
        { label: t('تعيينات حديثة'), value: employees.filter(e => new Date(e.hireDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length, icon: UserPlus, color: '#5286ed' },
    ];

    const handleConfirmDelete = async () => {
        if (!employeeToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/employees/${employeeToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchAll();
                setEmployeeToDelete(null);
            }
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, fontFamily: CAIRO }}>

                {/* Header Section */}
                <PageHeader 
                    title={t("الموظفين")} 
                    subtitle={t("إدارة شؤون العاملين، العقود، والأقسام الإدارية")} 
                    icon={UsersIcon}
                    primaryButton={{
                        label: t('إضافة موظف'),
                        onClick: () => router.push('/employees/new'),
                        icon: Plus
                    }}
                />

                {/* KPI Summary Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }}>
                    {stats.map((s, i) => (
                        <div key={i} style={{
                            background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                            padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'all 0.2s', position: 'relative'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                        >
                             <div style={{ textAlign: 'start' }}>
                                <p style={{ fontSize: '11px', fontWeight: 500, color: C.textMuted, margin: '0 0 4px', whiteSpace: 'nowrap' }}>{s.label}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '18px', fontWeight: 800, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                    <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{s.unit}</span>
                                </div>
                            </div>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                <s.icon size={20} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Toolbar - Search & Filters */}
                <div style={{ 
                    display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px'
                }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder={t("ابحث باسم الموظف أو الكود أو المنصب الوظيفي...")}
                            style={{
                                ...IS, paddingInlineStart: '40px', height: '42px', fontSize: '13px',
                                borderRadius: '12px'
                            }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div style={{ width: '220px' }}>
                        <CustomSelect 
                            value={selectedDept}
                            onChange={setSelectedDept}
                            placeholder={t("كل الأقسام")}
                            icon={Filter}
                            style={{ height: '40px', borderRadius: '12px' }}
                            options={[
                                { value: 'all', label: t('كل الأقسام'), icon: Building2 },
                                ...departments.map(d => ({ value: d.id, label: d.name, icon: Building2 }))
                            ]}
                        />
                    </div>
                    
                    <div style={{ width: '180px' }}>
                        <CustomSelect 
                            value={selectedStatus}
                            onChange={setSelectedStatus}
                            placeholder={t("كل الحالات")}
                            icon={UserPlus}
                            style={{ height: '40px', borderRadius: '12px' }}
                            options={[
                                { value: 'all', label: t('كل الحالات') },
                                { value: 'active', label: t('نشط'), style: { color: '#10b981' } },
                                { value: 'inactive', label: t('متوقف'), style: { color: '#ef4444' } }
                            ]}
                        />
                    </div>
                </div>

                {/* Table Section */}
                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ padding: '80px' }}>
                            <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: C.primary, margin: '0 auto 16px' }} />
                            <p style={{ margin: 0, color: C.textMuted, fontWeight: 800 }}>{t('جاري استرجاع السجلات...')}</p>
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div style={{ padding: '100px 20px' }}>
                            <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <UsersIcon size={40} style={{ color: C.textMuted }} />
                            </div>
                            <h3 style={{ fontSize: '18px', color: C.textPrimary, fontWeight: 900, margin: '0 0 8px' }}>{t('لا توجد نتائج')}</h3>
                            <p style={{ fontSize: '14px', color: C.textMuted, margin: 0 }}>{searchTerm ? t('لم يتم العثور على موظفين تطابق البحث') : t('ابدأ بإضافة موظفين جدد لسجلك')}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true) }}>{t('الكود')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('الموظف')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false, true) }}>{t('المنصب والقسم')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('تاريخ التعيين')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('صافي الراتب')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false, true) }}>{t('الحالة')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('الإجراءات')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEmployees.map((emp, i) => {
                                        const empNet = emp.basicSalary + (emp.housingAllowance || 0) + (emp.transportAllowance || 0) + (emp.foodAllowance || 0) - (emp.insuranceDeduction || 0) - (emp.taxDeduction || 0);
                                        return (
                                            <tr 
                                                key={emp.id} 
                                                style={TABLE_STYLE.row(i === filteredEmployees.length - 1)}
                                                onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ ...TABLE_STYLE.td(true), fontWeight: 800, color: C.primary, opacity: 0.65, fontFamily: OUTFIT, fontSize: '12px' }}>
                                                    {emp.code}
                                                </td>
                                                <td style={TABLE_STYLE.td(false)}>
                                                    <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: '14px' }}>{emp.name}</div>
                                                    <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, marginTop: '4px', fontFamily: OUTFIT }}>{emp.email || '—'}</div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 800, color: C.textPrimary }}>{emp.position || '—'}</div>
                                                    <div style={{ fontSize: '11px', color: C.primary, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '6px' }}>
                                                        <Building2 size={12} /> {emp.department?.name || t('غير مصنف')}
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, true) }}>
                                                    <div style={{ fontSize: '13px', color: C.textPrimary, fontWeight: 700, fontFamily: CAIRO }} dir={isRtl ? 'rtl' : 'ltr'}>
                                                        {new Date(emp.hireDate).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, true) }}>
                                                    <div style={{ fontWeight: 900, color: '#10b981', fontSize: '16px', fontFamily: OUTFIT }}>
                                                        {fMoneyJSX(empNet)}
                                                    </div>
                                                </td>
                                                <td style={TABLE_STYLE.td(false, true)}>
                                                    <div style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 900,
                                                        background: emp.status === 'active' ? '#10b98115' : '#ef444415',
                                                        color: emp.status === 'active' ? '#10b981' : '#ef4444',
                                                        border: `1px solid ${emp.status === 'active' ? '#10b98130' : '#ef444430'}`
                                                    }}>
                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                                        {emp.status === 'active' ? t('نشط') : t('متوقف')}
                                                    </div>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                        <button 
                                                            onClick={() => router.push(`/employees/${emp.id}`)}
                                                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', color: C.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={() => router.push(`/employees/${emp.id}/edit`)}
                                                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', color: C.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEmployeeToDelete(emp);
                                                            }}
                                                            style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${THEME.colors.danger}40`, background: `${THEME.colors.danger}10`, color: THEME.colors.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <AppModal
                show={!!employeeToDelete}
                onClose={() => setEmployeeToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={t("تأكيد حذف الموظف")}
                itemName={employeeToDelete?.name || ''}
                isDelete={true}
                isSubmitting={isDeleting}
            />
            
            <style jsx global>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}
