'use client';
import TableSkeleton from '@/components/TableSkeleton';
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
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';

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
    const [deleteError, setDeleteError] = useState('');

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
        setDeleteError('');
        try {
            const res = await fetch(`/api/employees/${employeeToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchAll();
                setEmployeeToDelete(null);
                setSearchTerm('');
            } else {
                const errorData = await res.json();
                setDeleteError(errorData.error || t('فشل في حذف الموظف'));
            }
        } catch (error) {
            setDeleteError(t('خطأ في الاتصال بالسيرفر'));
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
                <div className="stats-grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }}>
                    {stats.map((s, i) => (
                        <div key={i} style={{
                            background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                            padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'all 0.2s', position: 'relative'
                        }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                        >
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '11px', fontWeight: 500, color: C.textSecondary, margin: '0 0 4px', whiteSpace: 'nowrap' }}>{s.label}</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                    <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 500, fontFamily: CAIRO }}>{s.unit}</span>
                                </div>
                            </div>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                <s.icon size={20} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Toolbar - Search & Filters */}
                <div className="toolbar-responsive" style={{
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

                    <div className="select-container-responsive" style={{ width: '220px' }}>
                        <CustomSelect
                            value={selectedDept}
                            onChange={setSelectedDept}
                            placeholder={t("كل الأقسام")}
                            icon={Filter}
                            options={[
                                { value: 'all', label: t('كل الأقسام'), icon: Building2 },
                                ...departments.map(d => ({ value: d.id, label: d.name, icon: Building2 }))
                            ]}
                        />
                    </div>

                    <div className="select-container-responsive" style={{ width: '180px' }}>
                        <CustomSelect
                            value={selectedStatus}
                            onChange={setSelectedStatus}
                            placeholder={t("كل الحالات")}
                            icon={UserPlus}
                            options={[
                                { value: 'all', label: t('كل الحالات') },
                                { value: 'active', label: t('نشط'), style: { color: '#10b981' } },
                                { value: 'inactive', label: t('متوقف'), style: { color: '#ef4444' } }
                            ]}
                        />
                    </div>
                </div>

                {/* Table Section */}
                {/* Table Section */}
                {(() => {
                    const columns: TableColumn[] = [
                        {
                            header: t('الكود'),
                            style: { fontWeight: 600, color: C.primary, opacity: 0.65, fontFamily: OUTFIT, fontSize: '12px' } as React.CSSProperties,
                            cell: (row: Employee) => row.code
                        },
                        {
                            header: t('الموظف'),
                            cell: (row: Employee) => (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: '13px', textAlign: 'center' }}>{row.name}</div>
                                    <div style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 700, marginTop: '4px', fontFamily: OUTFIT, textAlign: 'center' }}>{row.email || '—'}</div>
                                </div>
                            )
                        },
                        {
                            header: t('المنصب والقسم'),
                            style: { textAlign: 'center' } as React.CSSProperties,
                            cell: (row: Employee) => (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, textAlign: 'center' }}>{row.position || '—'}</div>
                                    <div style={{ fontSize: '11px', color: C.primary, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        <Building2 size={12} /> {row.department?.name || t('غير مصنف')}
                                    </div>
                                </div>
                            )
                        },
                        {
                            header: t('تاريخ التعيين'),
                            className: 'hide-mobile',
                            style: { textAlign: 'center' } as React.CSSProperties,
                            cell: (row: Employee) => {
                                const d = new Date(row.hireDate);
                                const day = String(d.getDate()).padStart(2, '0');
                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                const year = d.getFullYear();
                                return (
                                    <div style={{ fontSize: '13px', color: C.textPrimary, fontWeight: 700, fontFamily: OUTFIT }} dir="ltr">
                                        {`${day}/${month}/${year}`}
                                    </div>
                                );
                            }
                        },
                        {
                            header: t('صافي الراتب'),
                            style: { textAlign: 'center' } as React.CSSProperties,
                            cell: (row: Employee) => {
                                const empNet = row.basicSalary + (row.housingAllowance || 0) + (row.transportAllowance || 0) + (row.foodAllowance || 0) - (row.insuranceDeduction || 0) - (row.taxDeduction || 0);
                                return (
                                    <div style={{ fontWeight: 600, color: '#10b981', fontSize: '13px', fontFamily: OUTFIT }}>
                                        {fMoneyJSX(empNet)}
                                    </div>
                                );
                            }
                        },
                        {
                            header: t('الحالة'),
                            className: 'hide-mobile',
                            style: { textAlign: 'center' } as React.CSSProperties,
                            cell: (row: Employee) => (
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                    background: row.status === 'active' ? '#10b98115' : '#ef444415',
                                    color: row.status === 'active' ? '#10b981' : '#ef4444',
                                    border: `1px solid ${row.status === 'active' ? '#10b98130' : '#ef444430'}`
                                }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                    {row.status === 'active' ? t('نشط') : t('متوقف')}
                                </div>
                            )
                        },
                        {
                            header: t('الإجراءات'),
                            style: { textAlign: 'center', width: '120px' } as React.CSSProperties,
                            cell: (row: Employee) => (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                    <button
                                        onClick={() => router.push(`/employees/${row.id}`)}
                                        style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', color: C.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Eye size={14} />
                                    </button>
                                    <button
                                        onClick={() => router.push(`/employees/${row.id}/edit`)}
                                        style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', color: C.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEmployeeToDelete(row);
                                        }}
                                        style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${THEME.colors.danger}40`, background: `${THEME.colors.danger}10`, color: THEME.colors.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )
                        }
                    ];

                    return (
                        <DataTable
                            columns={columns}
                            data={filteredEmployees}
                            emptyIcon={UsersIcon}
                            emptyMessage={searchTerm ? t('لم يتم العثور على موظفين تطابق البحث') : t('ابدأ بإضافة موظفين جدد لسجلك')}
                            isLoading={loading}
                            loadingSkeleton={<TableSkeleton />}
                        />
                    );
                })()}

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    
                    @media (max-width: 768px) {
                        .stats-grid-responsive { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
                        .toolbar-responsive { flex-direction: column; align-items: stretch !important; gap: 10px !important; }
                        .select-container-responsive { width: 100% !important; }
                        .hide-mobile { display: none !important; }
                    }
                ` }} />
            </div>

            <AppModal
                show={!!employeeToDelete}
                onClose={() => { setEmployeeToDelete(null); setDeleteError(''); }}
                onConfirm={handleConfirmDelete}
                title={t("تأكيد حذف الموظف")}
                itemName={employeeToDelete?.name || ''}
                isDelete={true}
                isSubmitting={isDeleting}
                error={deleteError}
            />
        </DashboardLayout>
    );
}
