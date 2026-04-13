'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, INTER, IS } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import { useEffect, useState } from 'react';
import { Users, Search, Activity, Loader2, MapPin, Phone, Briefcase, Calendar } from 'lucide-react';

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
                    title="دليل بيانات الموظفين"
                    subtitle="كشف تفصيلي ببيانات الموظفين، المسميات الوظيفية، الأقسام، وحالة العمل الحالية."
                    backTab="hr"
                    
                />

                <div className="no-print" style={{ position: 'relative', marginBottom: '24px' }}>
                    <Search size={18} style={{ position: 'absolute', insetInlineEnd: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary }} />
                    <input placeholder="ابحث باسم الموظف، القسم، أو المسمى الوظيفي..." value={q} onChange={e => setQ(e.target.value)} style={{ ...IS, paddingInlineEnd: '45px', height: '42px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }} />
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 size={40} className="animate-spin" style={{ color: C.primary }} /></div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                        {data?.filter(e => e.name.includes(q) || e.department.includes(q) || e.position.includes(q)).map((e) => (
                            <div key={e.id} style={{
                                background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px',
                                boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)', transition: 'all 0.2s'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{e.name}</h3>
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, fontFamily: CAIRO }}>#{e.id}</span>
                                    </div>
                                    <span style={{
                                        fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '10px',
                                        background: e.status === 'active' ? 'rgba(16,185,129,0.1)' : e.status === 'on_vacation' ? 'rgba(59,130,246,0.1)' : 'rgba(100,116,139,0.1)',
                                        color: e.status === 'active' ? '#10b981' : e.status === 'on_vacation' ? '#3b82f6' : '#64748b',
                                        fontFamily: CAIRO
                                    }}>
                                        {e.status === 'active' ? 'نـشط' : e.status === 'on_vacation' ? 'في إجازة' : 'غـير نشط'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {[
                                        { icon: <Briefcase size={14} />, label: 'القسم', val: e.department },
                                        { icon: <Activity size={14} />, label: 'المسمى الوظيفي', val: e.position },
                                        { icon: <Calendar size={14} />, label: 'تاريخ التعيين', val: new Date(e.joinDate).toLocaleDateString('en-GB') },
                                        { icon: <Phone size={14} />, label: 'الهاتف', val: e.phone },
                                    ].map((item, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ color: C.primary, opacity: 0.8 }}>{item.icon}</div>
                                            <div style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO, width: '90px' }}>{item.label}:</div>
                                            <div style={{ fontSize: '12px', color: C.textPrimary, fontWeight: 800, fontFamily: CAIRO }}>{item.val}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

