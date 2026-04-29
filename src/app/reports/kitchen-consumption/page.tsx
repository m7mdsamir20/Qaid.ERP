'use client';
import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { Search, Loader2, PackageSearch, PieChart, Activity } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { C, CAIRO, OUTFIT, IS, PAGE_BASE } from '@/constants/theme';

interface ConsumptionData {
    id: string;
    code: string;
    name: string;
    unit: string;
    quantity: number;
}

interface ReportData {
    consumption: ConsumptionData[];
    totalMealsSold: number;
}

interface BranchOption { id: string; name: string; }

export default function KitchenConsumptionReportPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [q, setQ] = useState('');

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => { });
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (from) params.set('from', from);
            if (to) params.set('to', to);
            if (branchId && branchId !== 'all') params.set('branchId', branchId);
            const res = await fetch(`/api/reports/kitchen-consumption?${params}`);
            if (res.ok) setData(await res.json());
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => { fetchReport(); }, []);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("تقرير استهلاك المطبخ")}
                    subtitle={t("تحليل كميات المواد الخام التي تم استهلاكها فعلياً بناءً على الوجبات المباعة")}
                    backTab="restaurant"
                    printTitle={t("تقرير استهلاك المطبخ")}
                    printDate={(from || to) ? `${from ? t('من: ') + from : ''} ${to ? t(' إلى: ') + to : ''}` : undefined}
                />

                <div className="no-print report-filter-bar" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="date-filter-row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span className="date-label-desktop" style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('من:')}</span>
                        <div className="date-input-wrapper" style={{ width: '170px' }}>
                            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...IS, width: '100%', height: '42px', padding: '0 12px', textAlign: 'start', direction: 'inherit', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '13.5px', fontWeight: 600, outline: 'none', fontFamily: OUTFIT }} />
                        </div>
                        <span className="date-label-desktop" style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('إلى:')}</span>
                        <div className="date-input-wrapper" style={{ width: '170px' }}>
                            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...IS, width: '100%', height: '42px', padding: '0 12px', textAlign: 'start', direction: 'inherit', borderRadius: '12px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, fontSize: '13.5px', fontWeight: 600, outline: 'none', fontFamily: OUTFIT }} />
                        </div>
                    </div>

                    <div className="branch-filter-wrapper" style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                        {branches.length > 1 && (
                            <div style={{ minWidth: '180px', flex: 1 }}>
                                <CustomSelect
                                    value={branchId}
                                    onChange={(v: string) => setBranchId(v)}
                                    placeholder={t("كل الفروع")}
                                    hideSearch
                                    style={{ background: C.card, border: `1px solid ${C.border}` }}
                                    options={[{ value: 'all', label: t('كل الفروع') }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
                                />
                            </div>
                        )}
                        <button className="update-btn" onClick={fetchReport} style={{ height: '42px', padding: '0 24px', borderRadius: '12px', background: C.primary, color: '#fff', border: 'none', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO, boxShadow: '0 4px 12px rgba(37, 106, 244,0.2)', whiteSpace: 'nowrap' }}>
                            <Search size={16} /> {t('تحديث')}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 600, fontFamily: CAIRO, color: C.textSecondary }}>{t("جاري حساب الاستهلاك التقديري...")}</span>
                    </div>
                ) : !data || data.consumption.length === 0 ? (
                    <div className="no-print" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <PackageSearch size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px', display: 'inline-block' }} />
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{t("لا توجد بيانات استهلاك")}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '13px', color: C.textMuted, maxWidth: '400px', marginInline: 'auto', lineHeight: 1.6, fontFamily: CAIRO }}>{t("لم يتم العثور على وجبات مباعة مرتبطة بوصفات طبخ خلال هذه الفترة.")}</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(37, 106, 244,0.08)', color: '#256af4', borderRadius: '10px' }}><PieChart size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('إجمالي الوجبات المباعة')}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                        <span style={{ fontSize: '15.5px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{data.totalMealsSold}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ flex: 1, minWidth: '200px', background: C.card, padding: '16px', borderRadius: '16px', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ padding: '8px', background: 'rgba(245,158,11,0.08)', color: '#f59e0b', borderRadius: '10px' }}><Activity size={20} /></div>
                                <div>
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('عدد المواد الخام المستهلكة')}</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                        <span style={{ fontSize: '15.5px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{data.consumption.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="no-print" style={{ position: 'relative', width: '100%', marginBottom: '20px' }}>
                            <Search size={18} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, zIndex: 10 }} />
                            <input
                                placeholder={t("ابحث باسم المادة الخام...")}
                                value={q} onChange={e => setQ(e.target.value)}
                                style={{ ...IS, paddingInlineStart: '45px', height: '42px', fontSize: '13.5px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, fontWeight: 500 }}
                            />
                        </div>

                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        {[t('المادة الخام'), t('الوحدة'), t('الكمية المستهلكة (النظرية)')].map((h, i) => (
                                            <th key={i} style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO, borderBottom: `1px solid ${C.border}`, textAlign: 'start' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.consumption.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.code.includes(q)).map((c, idx) => (
                                        <tr key={c.id}
                                            style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{c.name}</div>
                                                <div style={{ fontSize: '10px', color: C.textMuted, fontFamily: OUTFIT }}>{c.code}</div>
                                            </td>
                                            <td style={{ padding: '14px 20px', fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO }}>{c.unit}</td>
                                            <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 700, color: C.primary, fontFamily: OUTFIT }}>{c.quantity.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
