'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { Layers, ArrowRight, Printer, Download, TrendingUp, Calendar, DollarSign, Activity, Loader2, AlertTriangle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/hooks/useCurrency';
import { useParams, useRouter } from 'next/navigation';
import CustomSelect from '@/components/CustomSelect';

import { C, CAIRO, OUTFIT, PAGE_BASE, SC, IS, LS, THEME, focusIn, focusOut, TABLE_STYLE, KPI_STYLE, KPI_ICON, BTN_PRIMARY } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useTranslation } from '@/lib/i18n';

export default function CostCenterDetails() {
    const { symbol: cSymbol } = useCurrency();
    const { t } = useTranslation();
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const months = [
        { id: 1, name: t('يناير') }, { id: 2, name: t('فبراير') }, { id: 3, name: t('مارس') },
        { id: 4, name: t('أبريل') }, { id: 5, name: t('مايو') }, { id: 6, name: t('يونيو') },
        { id: 7, name: t('يوليو') }, { id: 8, name: t('أغسطس') }, { id: 9, name: t('سبتمبر') },
        { id: 10, name: t('أكتوبر') }, { id: 11, name: t('نوفمبر') }, { id: 12, name: t('ديسمبر') },
    ];
    
    useEffect(() => {
        let url = `/api/cost-centers/${id}`;
        if (selectedMonth) {
            url += `?month=${selectedMonth}&year=${selectedYear}`;
        }
        fetch(url)
            .then(res => res.json())
            .then(d => {
                setData(d);
                setLoading(false);
            });
    }, [id, selectedMonth, selectedYear]);

    const AC = C.primary;

    const handlePrint = () => { window.print(); };

    const handleExportExcel = () => {
        if (!data?.journalLines) return;
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += `${t('التاريخ')},${t('البيان')},${t('المبلغ')},${t('المصدر')}\n`;
        data.journalLines.forEach((line: any) => {
            const date = new Date(line.journalEntry.date).toLocaleDateString((t('en-GB') === 'en-GB' ? 'en-US' : 'ar-EG') );
            const desc = line.description || line.journalEntry.description || t('بدون بيان');
            const amount = line.debit;
            const source = line.journalEntry.referenceType || t('قيد يومية');
            csvContent += `${date},"${desc}",${amount},"${source}"\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${t('معاملات_')}${data.name}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', flexDirection: 'column', gap: '12px', color: C.textMuted }}>
                    <Loader2 size={36} style={{ animation: 'spin 1.5s linear infinite', color: C.primary }} />
                    <span style={{ fontSize: '14px', fontFamily: CAIRO }}>{t('جاري التحميل...')}</span>
                </div>
            </DashboardLayout>
        );
    }

    if (!data || data.error) {
        return (
            <DashboardLayout>
                <div style={{ color: C.danger, textAlign: 'center', padding: '80px 20px', fontFamily: CAIRO }}>
                    <AlertTriangle size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.5 }} />
                    {t('لم يتم العثور على مركز التكلفة')}
                </div>
            </DashboardLayout>
        );
    }

    const monthlyData = new Array(12).fill(0);
    const monthNames = [t('يناير'), t('فبراير'), t('مارس'), t('أبريل'), t('مايو'), t('يونيو'), t('يوليو'), t('أغسطس'), t('سبتمبر'), t('أكتوبر'), t('نوفمبر'), t('ديسمبر')];
    
    if (data.journalLines) {
        data.journalLines.forEach((line: any) => {
            if (line.debit > 0) {
                const date = new Date(line.journalEntry.date);
                if (date.getFullYear() === selectedYear) {
                    monthlyData[date.getMonth()] += line.debit;
                }
            }
        });
    }

    const maxMonthValue = Math.max(...monthlyData, 1);

    return (
        <DashboardLayout>
            <PageHeader 
                title={`${t('مركز التكلفة')}: ${data.name}`}
                subtitle={`${t('عرض المعاملات والتحليلات الخاصة بالمركز الكودي')} (${data.code})`}
                icon={Layers}
                backUrl="/cost-centers"
                actions={[
                    <div style={{ display: 'flex', background: C.card, borderRadius: '12px', padding: '4px', border: `1px solid ${C.border}`, alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => setSelectedMonth(null)}
                            style={{ 
                                height: '32px', padding: '0 12px', borderRadius: '8px', border: 'none', 
                                fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: '0.2s', 
                                background: selectedMonth === null ? AC : 'transparent', 
                                color: selectedMonth === null ? '#fff' : C.textSecondary,
                                fontFamily: CAIRO
                            }}>
                            {t('كل الوقت')}
                        </button>
                        <CustomSelect
                            value={selectedMonth || ''}
                            onChange={(val) => setSelectedMonth(val ? Number(val) : null)}
                            options={[
                                { value: '', label: t('اختر الشهر') },
                                ...months.map(m => ({ value: m.id, label: m.name }))
                            ]}
                            minWidth="140px"
                            placeholder="الشهر"
                            icon={Calendar}
                            style={{ height: '32px', background: 'transparent', border: 'none' }}
                        />
                        <CustomSelect
                            value={selectedYear}
                            onChange={(val) => setSelectedYear(Number(val))}
                            options={[2024, 2025, 2026].map(y => ({ value: y, label: y.toString() }))}
                            minWidth="105px"
                            style={{ height: '32px', background: 'transparent', border: 'none' }}
                        />
                    </div>,
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handlePrint} title={t('طباعة')}
                            style={{ width: '40px', height: '40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = C.hover}
                            onMouseLeave={e => e.currentTarget.style.background = C.card}
                        >
                            <Printer size={18} />
                        </button>
                        <button onClick={handleExportExcel}
                            style={{ height: '40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textPrimary, padding: '0 16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: '0.2s', fontFamily: CAIRO }}
                            onMouseEnter={e => e.currentTarget.style.background = C.hover}
                            onMouseLeave={e => e.currentTarget.style.background = C.card}
                        >
                            <Download size={18} /> {t('تصدير')}
                        </button>
                    </div>
                ]}
            />

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                {[
                    { label: t('إجمالي المصروفات'), value: data.totalExpenses, icon: <DollarSign size={20} />, color: C.danger },
                    { label: t('هذه السنة'), value: data.thisYearExpenses, icon: <TrendingUp size={20} />, color: C.warning },
                    { label: t('هذا الشهر'), value: data.thisMonthExpenses, icon: <Calendar size={20} />, color: C.blue },
                    { label: t('عدد المعاملات'), value: data.transactionCount, icon: <Activity size={20} />, color: C.success, isCount: true },
                ].map((kpi, i) => (
                    <div key={i} style={{ ...SC, ...KPI_STYLE(kpi.color), padding: '16px 20px', justifyContent: 'flex-start' }}>
                        <div style={KPI_ICON(kpi.color)}>
                            {kpi.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: C.textMuted, fontWeight: 700, marginBottom: '2px' }}>{kpi.label}</div>
                            <div style={{ fontSize: '20px', fontWeight: 900, color: C.textPrimary, fontFamily: OUTFIT }}>
                                {kpi.isCount ? kpi.value.toLocaleString('en-US') : (kpi.value || 0).toLocaleString('en-US')}
                                {!kpi.isCount && <span style={{ fontSize: '11px', color: C.textMuted, marginInlineEnd: '4px' }}>{cSymbol}</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
                {/* Transactions Table */}
                <div style={TABLE_STYLE.container}>
                    <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: 800, color: C.textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO }}>
                           <Activity size={18} style={{ color: AC }} /> {t('المعاملات المسجلة')}
                        </h2>
                    </div>
                    
                    {(!data.journalLines || data.journalLines.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.textMuted }}>
                            <Activity size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.1 }} />
                            <p style={{ margin: 0, fontSize: '14px', fontFamily: CAIRO }}>{t('لا توجد معاملات مسجلة لهذا التصنيف')}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(true)}>{t('التاريخ')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('البيان')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false, true), }}>{t('المبلغ')}</th>
                                        <th style={TABLE_STYLE.th(false)}>{t('المصدر')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.journalLines.filter((l:any) => l.debit > 0).map((line: any, idx: number) => (
                                        <tr key={line.id} style={TABLE_STYLE.row(idx === data.journalLines.length - 1)}
                                            onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.12)'}
                                        >
                                            <td style={{ ...TABLE_STYLE.td(true), fontSize: '12px', color: C.textSecondary, fontFamily: OUTFIT }}>
                                                {new Date(line.journalEntry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{line.description || line.journalEntry.description || '—'}</div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false),  fontSize: '15px', fontWeight: 900, color: C.danger, fontFamily: OUTFIT }}>
                                                {line.debit.toLocaleString('en-US')} <span style={{ fontSize: '11px', color: C.textMuted, marginInlineEnd: '4px' }}>{cSymbol}</span>
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '6px', background: C.inputBg, border: `1px solid ${C.border}`, fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>
                                                    {line.journalEntry.referenceType === 'invoice' ? t('فاتورة') :
                                                     line.journalEntry.referenceType === 'voucher' ? t('سند') : t('قيد يومية')}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Chart Card */}
                <div style={{ ...TABLE_STYLE.container, padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 800, color: C.textPrimary, margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO }}>
                        <TrendingUp size={18} style={{ color: AC }} /> {t('مصروفات')} {selectedYear}
                    </h2>
                    
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '8px', height: '240px', paddingTop: '20px' }}>
                        {monthlyData.map((val, idx) => {
                            const heightPercent = maxMonthValue === 0 ? 0 : Math.max((val / maxMonthValue) * 100, val > 0 ? 5 : 0);
                            return (
                                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }} className="group">
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
                                        {val > 0 && (
                                            <div style={{ position: 'absolute', top: `calc(${100 - heightPercent}% - 24px)`, insetInlineStart: '50%', transform: 'translateX(-50%)', background: C.card, border: `1px solid ${C.border}`, padding: '4px 8px', borderRadius: '6px', fontSize: '10px', color: C.textPrimary, opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.4)', fontWeight: 800, fontFamily: OUTFIT }} className="chart-tooltip">
                                                {new Intl.NumberFormat('en-US').format(val)}
                                            </div>
                                        )}
                                        <div 
                                            style={{ 
                                                width: '100%', 
                                                height: `${heightPercent}%`, 
                                                background: val > 0 ? `linear-gradient(to top, ${AC}40, ${AC})` : 'rgba(255,255,255,0.03)', 
                                                borderRadius: '6px 6px 0 0',
                                                transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                                cursor: val > 0 ? 'pointer' : 'default'
                                            }}
                                            onMouseEnter={e => {
                                                if (val > 0) {
                                                    e.currentTarget.style.filter = 'brightness(1.3)';
                                                    const tooltip = e.currentTarget.previousElementSibling as HTMLElement;
                                                    if (tooltip) tooltip.style.opacity = '1';
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (val > 0) {
                                                    e.currentTarget.style.filter = 'none';
                                                    const tooltip = e.currentTarget.previousElementSibling as HTMLElement;
                                                    if (tooltip) tooltip.style.opacity = '0';
                                                }
                                            }}
                                        />
                                    </div>
                                    <div style={{ fontSize: '9px', color: C.textMuted, fontWeight: 700, fontFamily: CAIRO }}>{monthNames[idx]}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </DashboardLayout>
    );
}
