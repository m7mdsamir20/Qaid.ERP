'use client';
import DataTable from '@/components/DataTable';
import { TableColumn } from '@/components/EmptyTableState';
import TableSkeleton from '@/components/TableSkeleton';
import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, OUTFIT, IS } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { Search, Loader2, Users } from 'lucide-react';

interface Employee {
    id: string;
    name: string;
    department: string;
    position: string;
    joinDate: string;
    phone: string;
    status: 'active' | 'on_vacation' | 'inactive';
}

import CustomSelect from '@/components/CustomSelect';

export default function EmployeesCatalogPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const [data, setData] = useState<Employee[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    const fetchReport = async (currentBranchId = branchId) => {
        setLoading(true);
        try {
            let url = '/api/reports/hr?type=catalog';
            if (currentBranchId && currentBranchId !== 'all') {
                url += `&branchId=${currentBranchId}`;
            }
            const res = await fetch(url);
            if (res.ok) {
                const results = await res.json();
                setData(results);
            }
        } catch (error) {
            console.error('Failed to fetch employees catalog:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(branchId); }, [branchId]);

    const filtered = data ? data.filter(e => e.name.toLowerCase().includes(q.toLowerCase()) || e.department.toLowerCase().includes(q.toLowerCase()) || e.position.toLowerCase().includes(q.toLowerCase())) : [];

    const columns: TableColumn[] = [
        {
            header: t('الموظف'),
            cell: (row: Employee) => row.name,
            style: { fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, fontSize: '13px' }
        },
        {
            header: t('القسم'),
            cell: (row: Employee) => row.department,
            style: { fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }
        },
        {
            header: t('المسمى الوظيفي'),
            cell: (row: Employee) => row.position,
            style: { fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }
        },
        {
            header: t('تاريخ التعيين'),
            cell: (row: Employee) => new Date(row.joinDate).toLocaleDateString('en-ZA'),
            style: { fontSize: '13px', color: C.textSecondary, fontFamily: OUTFIT, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الهاتف'),
            cell: (row: Employee) => row.phone,
            style: { fontSize: '13px', color: C.textSecondary, fontFamily: OUTFIT, textAlign: 'center' } as React.CSSProperties
        },
        {
            header: t('الحالة'),
            cell: (row: Employee) => {
                const label = row.status === 'active' ? t('نشط') : row.status === 'on_vacation' ? t('في إجازة') : t('غير نشط');
                const color = row.status === 'active' ? '#10b981' : row.status === 'on_vacation' ? '#256af4' : '#64748b';
                const background = row.status === 'active' ? 'rgba(16,185,129,0.1)' : row.status === 'on_vacation' ? 'rgba(37, 106, 244,0.1)' : 'rgba(100,116,139,0.1)';
                return (
                    <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px',
                        background, color, fontFamily: CAIRO, border: `1px solid ${color}`
                    }}>
                        {label}
                    </span>
                );
            },
            style: { textAlign: 'center' } as React.CSSProperties
        }
    ];

    const selectedBranchName = branchId === 'all' ? t('كل الفروع') : (branches.find(b => b.id === branchId)?.name || '');

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("دليل بيانات الموظفين")}
                    subtitle={t("كشف تفصيلي ببيانات الموظفين، المسميات الوظيفية، الأقسام، وحالة العمل الحالية.")}
                    backTab="hr"
                    branchName={selectedBranchName}
                    printTitle={t("دليل بيانات الموظفين")}
                />

                {/* Filters */}
                <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                        <div style={{ minWidth: '180px' }}>
                            <CustomSelect
                                value={branchId}
                                onChange={v => { setBranchId(v); fetchReport(v); }}
                                placeholder={t("كل الفروع")}
                                hideSearch={true}
                                options={[
                                    { value: 'all', label: t('كل الفروع') },
                                    ...branches.map((b) => ({ value: b.id, label: b.name }))
                                ]}
                            />
                        </div>
                    )}
                </div>

                <div className="no-print" style={{ position: 'relative', marginBottom: '24px' }}>
                    <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                    <input placeholder={t("ابحث باسم الموظف، القسم، أو المسمى الوظيفي...")} value={q} onChange={e => setQ(e.target.value)} style={{ ...IS, paddingInlineStart: '45px', height: '42px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }} />
                </div>

                {loading ? ( <TableSkeleton /> ) : (
                    <div className="print-table-container">
                        <DataTable
                            columns={columns}
                            data={filtered}
                            emptyIcon={Users}
                            emptyMessage={t('لا توجد بيانات موظفين حالياً')}
                        />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
