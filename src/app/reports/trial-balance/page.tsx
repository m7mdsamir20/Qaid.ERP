'use client';
import { formatNumber } from '@/lib/currency';
import { Currency } from '@/components/Currency';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import ReportHeader from '@/components/ReportHeader';
import CustomSelect from '@/components/CustomSelect';
import { useSession } from 'next-auth/react';
import { FileBarChart2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { C, CAIRO, PAGE_BASE, OUTFIT } from '@/constants/theme';

const getCurrencyName = (code: string) => {
    const map: Record<string, string> = { 'EGP': 'ج.م', 'SAR': 'ر.س', 'AED': 'د.إ', 'USD': '$', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب', 'OMR': 'ر.ع', 'JOD': 'د.أ' };
    return map[code] || code;
};

const fmt = (n: number) => formatNumber(n);

interface TrialBalanceLine {
    code: string;
    name: string;
    totalDebit: number;
    totalCredit: number;
    balanceDebit: number;
    balanceCredit: number;
}

export default function TrialBalancePage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session } = useSession();
    const currency = session?.user?.currency || 'EGP';

    const [report, setReport] = useState<TrialBalanceLine[]>([]);
    const [loading, setLoading] = useState(true);
    const [branchId, setBranchId] = useState('all');
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        fetch('/api/branches').then(r => r.json()).then(d => {
            if (Array.isArray(d)) setBranches(d);
        }).catch(() => {});
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (branchId && branchId !== 'all') params.set('branchId', branchId);
            const res = await fetch(`/api/reports/trial-balance?${params}`);
            if (res.ok) {
                setReport(await res.json());
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [branchId]);

    const grandTotalDebit = report.reduce((s, l) => s + l.totalDebit, 0);
    const grandTotalCredit = report.reduce((s, l) => s + l.totalCredit, 0);
    const grandBalanceDebit = report.reduce((s, l) => s + l.balanceDebit, 0);
    const grandBalanceCredit = report.reduce((s, l) => s + l.balanceCredit, 0);

    const isBalanced = Math.abs(grandBalanceDebit - grandBalanceCredit) < 0.001;
    const sym = getCurrencyName(currency);

    const exportToPDF = () => window.print();

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <ReportHeader
                    title={t("ميزان المراجعة")}
                    subtitle={t("تقرير إجمالي حركة الحسابات وأرصدتها للسنة المالية النشطة للتأكد من اتزان القيود المزدوجة.")}
                    backTab="financial"
                    
                    printTitle={t("ميزان المراجعة (بالمجاميع والأرصدة)")}
                />

                {branches.length > 1 && (session?.user as any)?.role === 'admin' && (
                    <div className="no-print" style={{ display: 'flex', gap: '14px', marginBottom: '24px', alignItems: 'center' }}>
                        <div style={{ minWidth: '220px' }}>
                            <CustomSelect
                                value={branchId}
                                onChange={(v: string) => setBranchId(v)}
                                placeholder={t('كل الفروع')}
                                hideSearch
                                style={{ background: C.card, border: `1px solid ${C.border}` }}
                                options={[
                                    { value: 'all', label: t('كل الفروع') },
                                    ...branches.map((b) => ({ value: b.id, label: b.name }))
                                ]}
                            />
                        </div>
                    </div>
                )}

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontWeight: 600, fontFamily: CAIRO, color: C.textSecondary }}>{t('جاري توليد التقرير...')}</span>
                    </div>
                ) : report.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', flexDirection: 'column', gap: '20px', textAlign: 'center'}}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileBarChart2 size={40} style={{ opacity: 0.3, color: C.textSecondary }} />
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد بيانات متاحة')}</h3>
                        <p style={{ fontSize: '13px', color: C.textSecondary, maxWidth: '400px', lineHeight: 1.6, fontFamily: CAIRO }}>{t('يجب ترحيل قيود يومية لظهور الحركات المحاسبية في الميزان المحاسبي')}</p>
                    </div>
                ) : (
                    <>

                        {/* Balance Status Card */}
                        <div className="no-print" style={{ 
                            padding: '16px 24px', 
                            background: C.card, 
                            border: `1px solid ${C.border}`, 
                            borderRadius: '12px', 
                            marginBottom: '24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                             <div style={{
                                padding: '8px 16px',
                                background: isBalanced ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                borderRadius: '10px',
                                border: `1px solid ${isBalanced ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                {isBalanced ? <CheckCircle2 size={18} color={C.success} /> : <AlertCircle size={18} color={C.danger} />}
                                <span style={{ fontSize: '13px', color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{t('حالة اتزان الميزان:')}</span>
                                <span style={{ color: isBalanced ? C.success : C.danger, fontWeight: 600, fontSize: '13px', fontFamily: CAIRO }}>
                                    {isBalanced ? t('متزن محـاسبياً (المجاميع متطابقة)') : t('غير متزن (يوجد خلل في الترحيل)')}
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 600, fontFamily: CAIRO }}>
                                {t('إجمالي الحسابات المسجلة:')} <span style={{ color: C.textPrimary, fontWeight: 600, fontFamily: OUTFIT }}>{report.length}</span>
                            </div>
                        </div>

                        <div className="print-table-container" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}` }}>
                                        <th rowSpan={2} style={{ padding: '16px',  fontSize: '12px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{t('رمز الحساب')}</th>
                                        <th rowSpan={2} style={{ padding: '16px',  fontSize: '12px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{t('اسم الحساب')}</th>
                                        <th colSpan={2} style={{ padding: '10px',  fontSize: '12px', fontWeight: 600, background: 'rgba(37, 106, 244, 0.05)', color: '#60a5fa', fontFamily: CAIRO, borderBottom: `1px solid ${C.border}`, borderInlineStart: `1px solid ${C.border}` }}>{t('بالمجاميع (المعاملات)')}</th>
                                        <th colSpan={2} style={{ padding: '10px',  fontSize: '12px', fontWeight: 600, background: 'rgba(139, 92, 246, 0.05)', color: '#a78bfa', fontFamily: CAIRO, borderBottom: `1px solid ${C.border}` }}>{t('بالأرصدة (النهائي)')}</th>
                                    </tr>
                                    <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${C.border}` }}>
                                        <th style={{ padding: '10px',  fontSize: '12px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{t('مدين')}</th>
                                        <th style={{ padding: '10px',  fontSize: '12px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{t('دائن')}</th>
                                        <th style={{ padding: '10px',  fontSize: '12px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{t('مدين')}</th>
                                        <th style={{ padding: '10px',  fontSize: '12px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{t('دائن')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.map((line) => (
                                        <tr key={line.code} style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '14px 16px', fontSize: '13px', color: C.textSecondary, fontFamily: OUTFIT, borderInlineStart: `1px solid ${C.border}` }}>
                                                <span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: `1px solid ${C.border}` }}>{line.code}</span>
                                            </td>
                                            <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{line.name}</td>
                                            <td style={{ padding: '14px 16px',  fontSize: '13px', color: line.totalDebit > 0 ? C.textPrimary : C.textMuted, fontFamily: OUTFIT, borderInlineStart: `1px solid ${C.border}` }}>{line.totalDebit > 0 ? fmt(line.totalDebit) : '0.00'} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{sym}</span></td>
                                            <td style={{ padding: '14px 16px',  fontSize: '13px', color: line.totalCredit > 0 ? C.textPrimary : C.textMuted, fontFamily: OUTFIT, borderInlineStart: `1px solid ${C.border}` }}>{line.totalCredit > 0 ? fmt(line.totalCredit) : '0.00'} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{sym}</span></td>
                                            <td style={{ padding: '14px 16px',  fontSize: '13px', fontWeight: 600, color: line.balanceDebit > 0 ? C.success : C.textMuted, background: 'rgba(16, 185, 129, 0.01)', fontFamily: OUTFIT, borderInlineStart: `1px solid ${C.border}` }}>{line.balanceDebit > 0 ? fmt(line.balanceDebit) : '0.00'} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{sym}</span></td>
                                            <td style={{ padding: '14px 16px',  fontSize: '13px', fontWeight: 600, color: line.balanceCredit > 0 ? C.danger : C.textMuted, background: 'rgba(239, 68, 68, 0.01)', fontFamily: OUTFIT }}>{line.balanceCredit > 0 ? fmt(line.balanceCredit) : '0.00'} <span style={{ fontFamily: CAIRO, fontSize: '11px', color: C.textSecondary, marginInlineStart: '2px' }}>{sym}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot style={{ background: 'rgba(37, 106, 244, 0.05)', borderTop: `2px solid ${C.primary}44` }}>
                                    <tr>
                                        <td colSpan={2} style={{ padding: '18px 24px', fontWeight: 950,  fontSize: '13px', color: C.textPrimary, fontFamily: CAIRO, borderInlineStart: `1px solid ${C.border}` }}>{t('الإجماليات الكلية للميزان')}</td>
                                        <td style={{ padding: '18px 16px',  fontWeight: 600, color: C.textPrimary, fontSize: '13px', fontFamily: OUTFIT, borderInlineStart: `1px solid ${C.border}` }}><Currency amount={grandTotalDebit} /></td>
                                        <td style={{ padding: '18px 16px',  fontWeight: 600, color: C.textPrimary, fontSize: '13px', fontFamily: OUTFIT, borderInlineStart: `1px solid ${C.border}` }}><Currency amount={grandTotalCredit} /></td>
                                        <td style={{ padding: '18px 16px',  fontWeight: 950, color: C.success, fontSize: '13px', background: 'rgba(16, 185, 129, 0.05)', fontFamily: OUTFIT, borderInlineStart: `1px solid ${C.border}` }}><Currency amount={grandBalanceDebit} /></td>
                                        <td style={{ padding: '18px 16px',  fontWeight: 950, color: C.danger, fontSize: '13px', background: 'rgba(239, 68, 68, 0.05)', fontFamily: OUTFIT }}><Currency amount={grandBalanceCredit} /></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                .print-only { display: none; }
                @keyframes spin { to { transform: rotate(360deg) } }
                @media print {
                    .print-only { display: block !important; }
                    .no-print { display: none !important; }
                    .print-table-container { 
                        background: white !important; 
                        border: 1px solid #e2e8f0 !important; 
                        border-radius: 0 !important; 
                    }
                    th, td { 
                        border: 1px solid #e2e8f0 !important; 
                        color: #000 !important;
                        background: #fff !important;
                    }
                    th { background: #f8fafc !important; font-size: 11px !important; }
                    td { font-size: 11px !important; padding: 6px 8px !important; }
                    tfoot td { background: #f1f5f9 !important; font-weight: 900 !important; }
                }
            `}</style>
        </DashboardLayout>
    );
}

