'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, IS, OUTFIT } from '@/constants/theme';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import ReportHeader from '@/components/ReportHeader';
import { ScrollText, Calendar, Loader2, Users, Search, TrendingUp, TrendingDown, History, Printer, FileText, ArrowRightLeft, FileDown, Activity, UserCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

interface Supplier { id: string; name: string; balance: number; createdAt: string; }

interface StatementRow {
    id: string;
    date: string;
    type: string;
    ref?: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
}

interface SupplierStatementData {
    supplier: Supplier;
    initialBalance: number;
    finalBalance: number;
    statement: StatementRow[];
}

export default function SupplierStatementPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SupplierStatementData | null>(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [error, setError] = useState('');

    const fetchStatement = useCallback(async (supplierId: string = selectedId) => {
        if (!supplierId) { setData(null); return; }
        setLoading(true);
        try {
            let url = `/api/reports/supplier-statement?supplierId=${supplierId}`;
            const q = new URLSearchParams();
            if (dateFrom) q.append('from', dateFrom);
            if (dateTo) q.append('to', dateTo);
            if (q.toString()) url += `&${q.toString()}`;
            const res = await fetch(url);
            if (!res.ok) { const e = await res.json(); setError(e.error || t('فشل جلب كشف الحساب')); }
            else { const d = await res.json(); setData(d); setError(''); }
        } catch { setError(t('خطأ في الاتصال بالخادم')); } finally { setLoading(false); }
    }, [selectedId, dateFrom, dateTo]);

    // 1. Initial Load: Fetch All Suppliers
    useEffect(() => {
        fetch('/api/reports/supplier-statement')
            .then(res => res.json())
            .then(d => { if (Array.isArray(d.suppliers)) setSuppliers(d.suppliers); })
            .catch(() => { });
    }, []);

    // 2. Initial Selection from URL (Run only ONCE on mount)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get('supplierId');
        if (urlId) {
            setSelectedId(urlId);
            fetchStatement(urlId);
        }
    }, []);

    const sym = getCurrencyName(currency);
    const handlePrint = () => window.print();

    const exportToExcel = () => {
        if (!data || !data.statement.length) return;
        const excelData = data.statement.map((row: StatementRow) => ({
            [t('التاريخ')]: new Date(row.date).toLocaleDateString('en-GB'),
            [t('طبيعة الحركة')]: row.type,
            [t('المرجع')]: row.ref || '—',
            [t('البيان')]: row.description,
            [t('مدين (المسدد)')]: row.debit,
            [t('دائن (المستحق)')]: row.credit,
            [t('الرصيد')]: row.balance
        }));

        if (data.initialBalance !== 0) {
            excelData.unshift({
                [t('التاريخ')]: data.supplier?.createdAt ? new Date(data.supplier.createdAt).toLocaleDateString('en-GB') : '—',
                [t('طبيعة الحركة')]: t('رصيد افتتاحي'),
                [t('المرجع')]: '—',
                [t('البيان')]: t('رصيد ما قبل فترة التقرير'),
                [t('مدين (المسدد)')]: data.initialBalance < 0 ? Math.abs(data.initialBalance) : 0,
                [t('دائن (المستحق)')]: data.initialBalance > 0 ? data.initialBalance : 0,
                [t('الرصيد')]: data.initialBalance
            });
        }

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, t('كشف الحساب'));
        XLSX.writeFile(wb, `${t('كشف_حساب_مورد')}_${data.supplier.name}_${new Date().toLocaleDateString('en-GB')}.xlsx`);
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("كشف حساب مورد تفصيلي")}
                    subtitle={t("استخراج بيان بكافة مشتريات، مدفوعات، ومرتجعات مورد محدد خلال فترة زمنية مختارة.")}
                    backTab="partners"

                    onExportExcel={exportToExcel}
                    printTitle={t("كشف حساب مورد تفصيلي")}
                    accountName={data ? data.supplier.name : undefined}
                    printLabel={t('المورد:')}
                    printDate={dateFrom || dateTo ? `${dateFrom ? `من ${dateFrom}` : ''} ${dateTo ? `إلى ${dateTo}` : ''}`.trim() : undefined}
                />

                <div className="no-print" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <CustomSelect
                            value={selectedId}
                            onChange={val => { setSelectedId(val); if (val) fetchStatement(val); else setData(null); }}
                            placeholder={t("اختر المورد لمتابعة حسابه...")}
                            options={[
                                { value: '', label: `-- ${t('اختر مورداً من القائمة')} --` },
                                ...suppliers.map(s => ({ value: s.id, label: s.name }))
                            ]}
                            style={{
                                width: '100%', height: '42px', padding: '0 15px',
                                borderRadius: '12px', border: `1px solid ${C.border}`,
                                background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                fontFamily: CAIRO, fontWeight: 500
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('من:')}</span>
                        <div style={{ width: '170px' }}>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 12px', textAlign: 'start', direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                        <span style={{ color: C.textMuted, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('إلى:')}</span>
                        <div style={{ width: '170px' }}>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                style={{
                                    ...IS, width: '100%', height: '42px', padding: '0 12px', textAlign: 'start', direction: 'inherit',
                                    borderRadius: '12px', border: `1px solid ${C.border}`,
                                    background: C.card, color: C.textPrimary, fontSize: '13.5px',
                                    fontWeight: 600, outline: 'none', fontFamily: OUTFIT
                                }}
                            />
                        </div>
                        <button onClick={() => fetchStatement()} disabled={loading} style={{
                            height: '42px', padding: '0 24px', borderRadius: '12px',
                            background: C.primary, color: '#fff', border: 'none',
                            fontSize: '13.5px', fontWeight: 800, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '10px', fontFamily: CAIRO,
                            boxShadow: '0 4px 12px rgba(37, 106, 244,0.2)'
                        }}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            {t('تحديث البيانات')}
                        </button>
                    </div>
                </div>

                {loading && !suppliers.length ? (
                    <div style={{ padding: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 700, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري تحميل البيانات...')}</span>
                    </div>
                ) : !data ? (
                    <div style={{ padding: '120px', textAlign: 'start', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px' }}>
                        <UserCircle size={70} style={{ opacity: 0.1, color: C.primary, marginBottom: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>{t('بانتظار اختيار المورد')}</h3>
                        <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: C.textMuted, fontFamily: CAIRO }}>{t('يرجى اختيار المورد وتحديد الفترة الزمنية لعرض كشف الحساب التفصيلي.')}</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Stats Cards */}
                        <div data-print-include style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                            {[
                                { label: t('رصيد سابق (منقول)'), value: Math.abs(data.initialBalance), sign: data.initialBalance >= 0 ? t('له (مستحق)') : t('عليه (مسدد)'), color: data.initialBalance >= 0 ? '#ef4444' : '#10b981', icon: <History size={20} /> },
                                { label: t('إجمالي التوريدات (له)'), value: data.statement.reduce((s: number, l: StatementRow) => s + l.credit, 0), sign: t('مشتريات جديدة'), color: '#ef4444', icon: <TrendingDown size={20} /> },
                                { label: t('إجمالي المدفوعات (عليه)'), value: data.statement.reduce((s: number, l: StatementRow) => s + l.debit, 0), sign: t('سندات صرف'), color: '#10b981', icon: <TrendingUp size={20} /> },
                                { label: t('الرصيد النهائي (الآن)'), value: Math.abs(data.finalBalance), sign: data.finalBalance >= 0 ? t('له (مستحق)') : t('عليه (مسدد)'), color: data.finalBalance >= 0 ? '#ef4444' : '#10b981', icon: <FileText size={20} /> },
                            ].map((s, i) => (
                                <div key={i} style={{
                                    background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '12px',
                                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s'
                                }}>
                                    <div style={{ textAlign: 'start'}}>
                                        <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: 900, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value.toLocaleString('en-US')}</span>
                                            <span style={{ fontSize: '11px', color: C.textMuted, fontWeight: 500, fontFamily: CAIRO }}>{getCurrencyName(currency)}</span>
                                        </div>
                                        <div style={{ fontSize: '9px', fontWeight: 800, color: s.color, fontFamily: CAIRO, marginTop: '2px' }}>{s.sign}</div>
                                    </div>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                        {s.icon}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                            {[t('التاريخ'), t('طبيعة الحركة'), t('المـرجع'), t('البيان والتفاصيل'), t('مسدد (مدين)'), t('مستحق (دائن)'), t('الرصيد')].map((h, i) => (
                                                <th key={i} style={{
                                                    padding: '16px 20px', fontSize: '12px', color: C.textSecondary,
                                                    
                                                    fontWeight: 600, fontFamily: CAIRO
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.initialBalance !== 0 && (
                                            <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                                                <td style={{ padding: '14px 20px',  color: C.textMuted, fontSize: '13px', fontFamily: OUTFIT }}>
                                                    {dateFrom || (data.supplier?.createdAt ? new Date(data.supplier.createdAt).toLocaleDateString('en-GB') : '—')}
                                                </td>
                                                <td style={{ padding: '14px 20px', }}>
                                                    <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: C.textSecondary, fontSize: '11px', fontWeight: 900, fontFamily: CAIRO }}>{t('رصيد افتتاحي')}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px',  color: C.textMuted }}>—</td>
                                                <td style={{ padding: '14px 20px', fontSize: '13px', color: C.textMuted, fontWeight: 600, fontFamily: CAIRO, }}>{t('رصيد ما قبل فترة التقرير')}</td>
                                                <td style={{ padding: '14px 20px',  color: data.initialBalance < 0 ? '#10b981' : C.textMuted, fontWeight: 900, fontSize: '14px', fontFamily: OUTFIT }}>{data.initialBalance < 0 ? <>{Math.abs(data.initialBalance).toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span></> : '—'}</td>
                                                <td style={{ padding: '14px 20px',  color: data.initialBalance > 0 ? '#ef4444' : C.textMuted, fontWeight: 900, fontSize: '14px', fontFamily: OUTFIT }}>{data.initialBalance > 0 ? <>{data.initialBalance.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span></> : '—'}</td>
                                                <td style={{ padding: '14px 20px',  fontWeight: 1000, color: data.initialBalance >= 0 ? '#ef4444' : '#10b981', fontSize: '14px', fontFamily: OUTFIT }}>{Math.abs(data.initialBalance).toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span></td>
                                            </tr>
                                        )}
                                        {data.statement.map((row: StatementRow, i: number) => (
                                            <tr key={row.id + i}
                                                style={{ borderBottom: `1px solid ${C.border}`, transition: 'all 0.1s', background: i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'}>
                                                <td style={{ padding: '14px 20px',  color: C.textMuted, fontSize: '13px', fontFamily: OUTFIT }}>
                                                    {new Date(row.date).toLocaleDateString('en-GB')}
                                                </td>
                                                <td style={{ padding: '14px 20px', }}>
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 900, fontFamily: CAIRO,
                                                        background: row.type.includes('مشتريات') ? 'rgba(239,68,68,0.1)' : row.type.includes('صرف') ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                                                        color: row.type.includes('مشتريات') ? '#ef4444' : row.type.includes('صرف') ? '#10b981' : C.textMuted
                                                    }}>
                                                        {t(row.type)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 20px', }}>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{row.ref || '—'}</span>
                                                </td>
                                                <td style={{ padding: '14px 20px', fontSize: '13px', color: C.textSecondary, fontWeight: 600, fontFamily: CAIRO, }}>{row.description}</td>
                                                <td style={{ padding: '14px 20px',  color: row.debit > 0 ? '#10b981' : C.textMuted, fontWeight: 900, fontSize: '14px', fontFamily: OUTFIT }}>{row.debit > 0 ? <>{row.debit.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span></> : '—'}</td>
                                                <td style={{ padding: '14px 20px',  color: row.credit > 0 ? '#ef4444' : C.textMuted, fontWeight: 900, fontSize: '14px', fontFamily: OUTFIT }}>{row.credit > 0 ? <>{row.credit.toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span></> : '—'}</td>
                                                <td style={{ padding: '14px 20px',  fontWeight: 1000, color: row.balance >= 0 ? '#ef4444' : '#10b981', fontSize: '14px', fontFamily: OUTFIT }}>{Math.abs(row.balance).toLocaleString('en-US')} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot style={{ background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${C.border}` }}>
                                        <tr>
                                            <td colSpan={4} style={{ padding: '20px 24px',  fontSize: '13px', color: C.textPrimary, fontWeight: 900, fontFamily: CAIRO }}>{t('إجمالي كامل الحساب')}</td>
                                            <td style={{ padding: '20px 20px',  color: '#10b981', fontSize: '14px', fontWeight: 900, fontFamily: OUTFIT }}>
                                                {(data.statement.reduce((s: number, l: StatementRow) => s + l.debit, 0) + (data.initialBalance < 0 ? Math.abs(data.initialBalance) : 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span>
                                            </td>
                                            <td style={{ padding: '20px 20px',  color: '#ef4444', fontSize: '14px', fontWeight: 900, fontFamily: OUTFIT }}>
                                                {(data.statement.reduce((s: number, l: StatementRow) => s + l.credit, 0) + (data.initialBalance > 0 ? data.initialBalance : 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span>
                                            </td>
                                            <td style={{ padding: '20px 24px',  color: data.finalBalance >= 0 ? '#ef4444' : '#10b981', fontSize: '14px', fontWeight: 900, fontFamily: OUTFIT, background: 'rgba(255,255,255,0.02)' }}>
                                                {Math.abs(data.finalBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textMuted, marginInlineStart: '2px' }}>{sym}</span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
            
        </DashboardLayout>
    );
}


