'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, OUTFIT, IS } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

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

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 size={40} className="animate-spin" style={{ color: C.primary }} /></div>
                ) : (
                    <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                    {[t('الموظف'), t('القسم'), t('المسمى الوظيفي'), t('تاريخ التعيين'), t('الهاتف'), t('الحالة')].map((h, i) => (
                                        <th key={i} style={{ textAlign: i === 5 ? 'center' : 'start', padding: '14px 16px', fontSize: '12px', fontWeight: 800, color: C.textSecondary,  fontFamily: CAIRO }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data?.filter(e => e.name.includes(q) || e.department.includes(q) || e.position.includes(q)).map((e, idx) => (
                                    <tr key={e.id}
                                        style={{ borderBottom: `1px solid ${C.border}`, background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                        onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                        onMouseLeave={ev => ev.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                        <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{e.name}</td>
                                        <td style={{ padding: '14px 16px', fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }}>{e.department}</td>
                                        <td style={{ padding: '14px 16px', fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }}>{e.position}</td>
                                        <td style={{ padding: '14px 16px', fontSize: '13px', color: C.textMuted, fontFamily: OUTFIT, }}>{new Date(e.joinDate).toLocaleDateString('en-GB')}</td>
                                        <td style={{ padding: '14px 16px', fontSize: '13px', color: C.textMuted, fontFamily: OUTFIT, }}>{e.phone}</td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{
                                                fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '8px',
                                                background: e.status === 'active' ? 'rgba(16,185,129,0.1)' : e.status === 'on_vacation' ? 'rgba(37, 106, 244,0.1)' : 'rgba(100,116,139,0.1)',
                                                color: e.status === 'active' ? '#10b981' : e.status === 'on_vacation' ? '#256af4' : '#64748b',
                                                fontFamily: CAIRO, border: '1px solid currentColor'
                                            }}>
                                                {e.status === 'active' ? t('نشط') : e.status === 'on_vacation' ? t('في إجازة') : t('غير نشط')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}

