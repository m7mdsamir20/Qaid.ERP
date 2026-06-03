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

export default function EmployeesCatalogPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const [data, setData] = useState<Employee[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reports/hr?type=catalog');
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

    useEffect(() => { fetchReport(); }, []);

    const filtered = data ? data.filter(e => e.name.includes(q) || e.department.includes(q) || e.position.includes(q)) : [];

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
            cell: (row: Employee) => new Date(row.joinDate).toLocaleDateString('en-GB'),
            style: { fontSize: '13px', color: C.textSecondary, fontFamily: OUTFIT }
        },
        {
            header: t('الهاتف'),
            cell: (row: Employee) => row.phone,
            style: { fontSize: '13px', color: C.textSecondary, fontFamily: OUTFIT }
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

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("دليل بيانات الموظفين")}
                    subtitle={t("كشف تفصيلي ببيانات الموظفين، المسميات الوظيفية، الأقسام، وحالة العمل الحالية.")}
                    backTab="hr"
                    printTitle={t("دليل بيانات الموظفين")}
                />

                <div className="no-print" style={{ position: 'relative', marginBottom: '24px' }}>
                    <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                    <input placeholder={t("ابحث باسم الموظف، القسم، أو المسمى الوظيفي...")} value={q} onChange={e => setQ(e.target.value)} style={{ ...IS, paddingInlineStart: '45px', height: '42px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }} />
                </div>

                {loading ? ( <TableSkeleton /> ) : (
                    <DataTable
                        columns={columns}
                        data={filtered}
                        emptyIcon={Users}
                        emptyMessage={t('لا توجد بيانات موظفين حالياً')}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}
